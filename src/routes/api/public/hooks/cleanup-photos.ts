import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/hooks/cleanup-photos")({
  server: {
    handlers: {
      POST: async () => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: expired, error } = await supabaseAdmin
          .from("photos")
          .select("id, storage_path")
          .lt("expires_at", new Date().toISOString())
          .limit(1000);
        if (error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { "content-type": "application/json" },
          });
        }
        const paths = (expired ?? []).map((p) => p.storage_path);
        const ids = (expired ?? []).map((p) => p.id);
        if (paths.length) {
          for (let i = 0; i < paths.length; i += 100) {
            await supabaseAdmin.storage.from("event-photos").remove(paths.slice(i, i + 100));
          }
        }
        if (ids.length) {
          await supabaseAdmin.from("photos").delete().in("id", ids);
        }
        return new Response(JSON.stringify({ deleted: ids.length }), {
          headers: { "content-type": "application/json" },
        });
      },
    },
  },
});
