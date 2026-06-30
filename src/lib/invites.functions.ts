import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const previewInput = z.object({
  token: z.string().min(8).max(64),
  code: z.string().trim().toUpperCase().length(6).optional(),
});

export const getInvitePreview = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => previewInput.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: invite } = await supabaseAdmin
      .from("invites")
      .select("scope, event_id, inviter_id, expires_at, max_uses, used_count, secret_code")
      .eq("token", data.token)
      .maybeSingle();
    if (!invite) return { valid: false as const, reason: "not_found" as const };
    const expired = invite.expires_at ? new Date(invite.expires_at) < new Date() : false;
    const exhausted = invite.max_uses ? invite.used_count >= invite.max_uses : false;
    if (expired) return { valid: false as const, reason: "expired" as const };
    if (exhausted) return { valid: false as const, reason: "exhausted" as const };
    const codeOk = !data.code ? false : data.code === invite.secret_code;

    let event_name: string | null = null;
    if (invite.scope === "event" && invite.event_id) {
      const { data: ev } = await supabaseAdmin
        .from("events")
        .select("name")
        .eq("id", invite.event_id)
        .maybeSingle();
      event_name = ev?.name ?? null;
    }
    const { data: prof } = await supabaseAdmin
      .from("profiles")
      .select("display_name")
      .eq("id", invite.inviter_id)
      .maybeSingle();
    return {
      valid: true as const,
      scope: invite.scope as "network" | "event",
      event_name,
      inviter_name: prof?.display_name ?? null,
      code_required: !codeOk,
    };
  });

const redeemInput = z.object({
  token: z.string().min(8).max(64),
  code: z.string().trim().toUpperCase().length(6),
});

export const redeemInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => redeemInput.parse(d))
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
    if (invite.secret_code !== data.code) {
      throw new Error("Code secret invalide");
    }
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

/**
 * Creates an invite server-side so we control the secret_code, expiry, and
 * uniqueness. Returns the full link payload the client should share.
 */
const createInviteInput = z.object({
  scope: z.enum(["network", "event"]),
  event_id: z.string().uuid().optional().nullable(),
});

function genToken() {
  const a = new Uint8Array(16);
  crypto.getRandomValues(a);
  return Array.from(a, (b) => b.toString(36).padStart(2, "0")).join("").slice(0, 22);
}

function genSecretCode() {
  // 6 chars, uppercase, no ambiguous chars (no 0/O/1/I/L)
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  const a = new Uint8Array(6);
  crypto.getRandomValues(a);
  return Array.from(a, (b) => alphabet[b % alphabet.length]).join("");
}

export const createInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => createInviteInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (data.scope === "event" && !data.event_id) {
      throw new Error("event_id is required for event-scoped invites");
    }
    const token = genToken();
    const secret_code = genSecretCode();
    const expires_at = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
    const { error } = await supabaseAdmin.from("invites").insert({
      token,
      secret_code,
      inviter_id: context.userId,
      scope: data.scope,
      event_id: data.scope === "event" ? data.event_id! : null,
      expires_at,
    });
    if (error) throw new Error(error.message);
    return { token, secret_code, expires_at };
  });
