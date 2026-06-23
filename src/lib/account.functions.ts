import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const deleteMyAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // 1. Collect storage paths to remove
    const { data: ownedEvents } = await supabaseAdmin
      .from("events")
      .select("id")
      .eq("owner_id", userId);
    const ownedIds = (ownedEvents ?? []).map((e) => e.id);

    const { data: uploadedPhotos } = await supabaseAdmin
      .from("photos")
      .select("storage_path")
      .eq("uploader_id", userId);

    let paths = (uploadedPhotos ?? []).map((p) => p.storage_path);

    if (ownedIds.length) {
      const { data: eventPhotos } = await supabaseAdmin
        .from("photos")
        .select("storage_path")
        .in("event_id", ownedIds);
      paths = paths.concat((eventPhotos ?? []).map((p) => p.storage_path));
    }
    paths = Array.from(new Set(paths));

    if (paths.length) {
      // Chunk removes to avoid request limits
      for (let i = 0; i < paths.length; i += 100) {
        await supabaseAdmin.storage.from("event-photos").remove(paths.slice(i, i + 100));
      }
    }

    // 2. Delete owned events (cascades to photos, members, invites)
    if (ownedIds.length) {
      await supabaseAdmin.from("events").delete().in("id", ownedIds);
    }

    // 3. Delete remaining rows tied to user (cascade handles most via auth.users delete, but be explicit)
    await supabaseAdmin.from("photo_tags").delete().or(`tagger_id.eq.${userId},tagged_user_id.eq.${userId}`);
    await supabaseAdmin.from("photos").delete().eq("uploader_id", userId);
    await supabaseAdmin.from("event_members").delete().eq("user_id", userId);
    await supabaseAdmin.from("invites").delete().eq("inviter_id", userId);
    await supabaseAdmin.from("profiles").delete().eq("id", userId);

    // 4. Delete auth user (cascades remaining FKs)
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (error) throw new Error(error.message);

    return { ok: true };
  });
