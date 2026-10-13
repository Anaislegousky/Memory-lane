import { createFileRoute } from "@tanstack/react-router";

// Supprime les photos expirées (fichiers + lignes en base).
//
// Protégé par un secret : l'appel doit porter l'en-tête
//   Authorization: Bearer <CRON_SECRET>
// Il est déclenché chaque jour par la tâche planifiée Vercel (qui ajoute cet en-tête
// toute seule quand la variable CRON_SECRET existe) et chaque semaine par GitHub
// Actions (.github/workflows/maintenance.yml). Chaque appel interroge la base, ce qui
// évite aussi que le projet Supabase gratuit se mette en pause.

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

// Comparaison en temps constant, pour ne rien révéler du secret via le temps de réponse.
function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function isAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  // Sans secret configuré, on refuse tout plutôt que de laisser la route ouverte.
  if (!secret || secret.length < 32) return false;
  const header = request.headers.get("authorization") ?? "";
  return safeEqual(header, `Bearer ${secret}`);
}

async function cleanup({ request }: { request: Request }) {
  if (!isAuthorized(request)) return json({ error: "Unauthorized" }, 401);

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: expired, error } = await supabaseAdmin
    .from("photos")
    .select("id, storage_path")
    .lt("expires_at", new Date().toISOString())
    .limit(1000);
  if (error) return json({ error: error.message }, 500);

  const paths = (expired ?? []).map((p) => p.storage_path);
  const ids = (expired ?? []).map((p) => p.id);
  for (let i = 0; i < paths.length; i += 100) {
    const { error: storageError } = await supabaseAdmin.storage
      .from("event-photos")
      .remove(paths.slice(i, i + 100));
    if (storageError) return json({ error: storageError.message }, 500);
  }
  if (ids.length) {
    const { error: deleteError } = await supabaseAdmin.from("photos").delete().in("id", ids);
    if (deleteError) return json({ error: deleteError.message }, 500);
  }
  return json({ deleted: ids.length });
}

export const Route = createFileRoute("/api/public/hooks/cleanup-photos")({
  server: {
    handlers: {
      // Vercel Cron appelle en GET, GitHub Actions en POST.
      GET: cleanup,
      POST: cleanup,
    },
  },
});
