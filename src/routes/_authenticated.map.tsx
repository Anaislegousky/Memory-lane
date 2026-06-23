import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("id, name, lat, lng")
        .not("lat", "is", null)
        .not("lng", "is", null);
      if (error) throw error;
      return (data ?? []).filter((e) => e.lat != null && e.lng != null) as {
        id: string; name: string; lat: number; lng: number;
      }[];
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
