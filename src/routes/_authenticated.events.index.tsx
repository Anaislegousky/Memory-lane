import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { CreateMenu } from "@/components/CreateMenu";
import { GuestGate } from "@/components/GuestGate";
import { Plus, MapPin, Calendar, AlertTriangle } from "lucide-react";
import { format, formatDistanceToNowStrict } from "date-fns";
import { fr } from "date-fns/locale";
import { shortAddress } from "@/lib/format-address";
import { useExpiringPhotos, useNotifyExpiring } from "@/lib/use-expiring-photos";

export const Route = createFileRoute("/_authenticated/events/")({
  head: () => ({ meta: [{ title: "Vos événements — Memories" }] }),
  component: EventsPage,
});

function EventsPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { data: events, isLoading } = useQuery({
    queryKey: ["events"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("id, name, event_date, end_date, location_label, lat, lng, created_at")
        .order("event_date", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const expiringQ = useExpiringPhotos();
  useNotifyExpiring(expiringQ.data);

  return (
    <AppShell
      title="Événements"
      action={
        <button
          onClick={() => setMenuOpen(true)}
          aria-label="Ajouter"
          className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground"
        >
          <Plus className="h-5 w-5" />
        </button>
      }
    >
      {!!expiringQ.data?.length && (
        <div className="mb-3 space-y-2">
          {expiringQ.data.map((ev) => (
            <Link
              key={ev.event_id}
              to="/events/$id"
              params={{ id: ev.event_id }}
              className="flex items-start gap-2 rounded-2xl border border-destructive/30 bg-destructive/5 p-3 text-sm"
            >
              <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-destructive" />
              <div>
                <p className="font-medium">
                  {ev.photo_count} photo{ev.photo_count > 1 ? "s" : ""} de « {ev.event_name} »
                </p>
                <p className="text-xs text-muted-foreground">
                  Suppression dans{" "}
                  {formatDistanceToNowStrict(new Date(ev.earliest_expiry), { locale: fr })}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}

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
                      {e.end_date && e.end_date !== e.event_date
                        ? `${format(new Date(e.event_date), "d MMM", { locale: fr })} – ${format(new Date(e.end_date), "d MMM yyyy", { locale: fr })}`
                        : format(new Date(e.event_date), "d MMM yyyy", { locale: fr })}
                    </span>
                  )}
                  {e.location_label && (
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />
                      {shortAddress(e.location_label)}
                    </span>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <GuestGate action="create_event" onAllowed={() => setMenuOpen(true)}>
        {(trigger) => (
          <button
            onClick={trigger}
            aria-label="Ajouter"
            className="fixed bottom-24 right-4 z-20 inline-flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg active:scale-95"
          >
            <Plus className="h-6 w-6" />
          </button>
        )}
      </GuestGate>

      <CreateMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
    </AppShell>
  );
}

function EmptyState() {
  return (
    <div className="mt-16 text-center">
      <p className="font-display text-2xl">Aucun événement pour l'instant</p>
      <p className="mt-2 text-sm text-muted-foreground">
        Créez votre premier événement pour commencer à rassembler des photos avec vos amis.
      </p>
      <Link
        to="/events/new"
        className="mt-6 inline-flex items-center gap-1.5 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground"
      >
        <Plus className="h-4 w-4" /> Créer un événement
      </Link>
    </div>
  );
}
