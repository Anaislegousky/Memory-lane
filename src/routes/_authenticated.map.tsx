import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { signedUrlsFor } from "@/lib/photo-urls";
import { BottomNav } from "@/components/BottomNav";
import { lazy, Suspense, useEffect, useState } from "react";

const EventMap = lazy(() => import("@/components/EventMap"));

export const Route = createFileRoute("/_authenticated/map")({
  head: () => ({ meta: [{ title: "Carte — Memories" }] }),
  component: MapPage,
});

function MapPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["events-map"],
    refetchOnMount: "always",
    queryFn: async () => {
      const { data: events, error } = await supabase
        .from("events")
        .select("id, name, lat, lng")
        .not("lat", "is", null)
        .not("lng", "is", null);
      if (error) throw error;
      const evs = (events ?? []).filter((e) => e.lat != null && e.lng != null) as {
        id: string; name: string; lat: number; lng: number;
      }[];
      if (!evs.length) return [];

      // Latest photo per event (best-effort: one fetch per event in parallel)
      const photoRows = await Promise.all(
        evs.map((e) =>
          supabase
            .from("photos")
            .select("storage_path")
            .eq("event_id", e.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle()
            .then((r) => ({ id: e.id, path: r.data?.storage_path ?? null })),
        ),
      );
      const paths = photoRows.map((r) => r.path).filter((p): p is string => !!p);
      const urls = await signedUrlsFor(paths).catch(() => new Map<string, string>());
      const thumbByEvent = new Map(
        photoRows.map((r) => [r.id, r.path ? urls.get(r.path) ?? null : null]),
      );

      return evs.map((e) => ({ ...e, thumb: thumbByEvent.get(e.id) ?? null }));
    },
  });

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 mx-auto flex max-w-md items-center justify-between border-b border-border/60 bg-background/90 px-4 py-3 backdrop-blur">
        <h1 className="font-display text-2xl tracking-tight">Carte</h1>
        <span className="text-xs text-muted-foreground">
          {data?.length ?? 0} lieu{(data?.length ?? 0) > 1 ? "x" : ""}
        </span>
      </header>
      <div className="relative h-[calc(100vh-160px)] w-full overflow-hidden">
        {mounted && !isLoading ? (
          <Suspense fallback={<div className="grid h-full place-items-center text-sm text-muted-foreground">Chargement de la carte…</div>}>
            <EventMap pins={data ?? []} />
          </Suspense>
        ) : (
          <div className="grid h-full place-items-center text-sm text-muted-foreground">Chargement de la carte…</div>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
