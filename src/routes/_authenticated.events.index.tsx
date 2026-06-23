import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { Plus, MapPin, Calendar } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export const Route = createFileRoute("/_authenticated/events/")({
  head: () => ({ meta: [{ title: "Vos événements — Memories" }] }),
  component: EventsPage,
});

function EventsPage() {
  const { data: events, isLoading } = useQuery({
    queryKey: ["events"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("id, name, event_date, location_label, lat, lng, created_at")
        .order("event_date", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <AppShell title="Événements">
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Chargement…</p>
      ) : !events?.length ? (
        <EmptyState />
      ) : (
        <ul className="space-y-3">
          {events.map((e) => (
            <li key={e.id}>
              <Link
                to="/events/$id"
                params={{ id: e.id }}
                className="block rounded-2xl border border-border bg-card p-4 transition-shadow active:shadow-sm"
              >
                <p className="font-display text-xl">{e.name}</p>
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                  {e.event_date && (
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      {format(new Date(e.event_date), "d MMM yyyy", { locale: fr })}
                    </span>
                  )}
                  {e.location_label && (
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />
                      {e.location_label}
                    </span>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  );
}

function EmptyState() {
  return (
    <div className="mt-16 text-center">
      <p className="font-display text-2xl">Aucun événement pour l'instant</p>
      <p className="mt-2 text-sm text-muted-foreground">Créez votre premier événement pour commencer à rassembler des photos avec vos amis.</p>
      <Link
        to="/events/new"
        className="mt-6 inline-flex items-center gap-1.5 rounded-full bg-primary px-5 py-2.5 text-muted text-sm font-medium text-primary-foreground"
      >
        <Plus className="h-4 w-4" /> Créer un événement
      </Link>
    </div>
  );
}
