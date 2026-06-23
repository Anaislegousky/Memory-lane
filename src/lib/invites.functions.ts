import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const input = z.object({ token: z.string().min(8).max(64) });

export const redeemInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => input.parse(d))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: invite, error } = await supabaseAdmin
      .from("invites")
      .select("*")
      .eq("token", data.token)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!invite) throw new Error("Invite not found");
    if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
      throw new Error("This invite has expired");
    }
    if (invite.max_uses && invite.used_count >= invite.max_uses) {
      throw new Error("This invite has reached its maximum uses");
    }

    // Record redemption (unique constraint prevents double-count)
    const { error: rErr } = await supabaseAdmin
      .from("invite_redemptions")
      .insert({ invite_id: invite.id, user_id: userId });
    const alreadyRedeemed = rErr?.code === "23505";
    if (rErr && !alreadyRedeemed) throw new Error(rErr.message);

    if (!alreadyRedeemed) {
      await supabaseAdmin
        .from("invites")
        .update({ used_count: invite.used_count + 1 })
        .eq("id", invite.id);
    }

    // Friendship with inviter
    if (invite.inviter_id !== userId) {
      const [a, b] = [invite.inviter_id, userId].sort();
      await supabaseAdmin
        .from("friendships")
        .upsert({ user_a: a, user_b: b }, { onConflict: "user_a,user_b" });
    }

    // Event membership (if event scope)
    if (invite.scope === "event" && invite.event_id) {
      await supabaseAdmin
        .from("event_members")
        .upsert(
          { event_id: invite.event_id, user_id: userId, role: "member" },
          { onConflict: "event_id,user_id" },
        );
    }

    return { ok: true, scope: invite.scope, event_id: invite.event_id ?? null };
  });
