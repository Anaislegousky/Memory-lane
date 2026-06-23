import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { Plus, MapPin, Calendar } from "lucide-react";
import { format } from "date-fns";

export const Route = createFileRoute("/_authenticated/events")({
  head: () => ({ meta: [{ title: "Your events — Memories" }] }),
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
    <AppShell
      title="Events"
      action={
        <Link
          to="/events/new"
          className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground"
        >
          <Plus className="h-4 w-4" /> New
        </Link>
      }
    >
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
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
                      {format(new Date(e.event_date), "MMM d, yyyy")}
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
      <p className="font-display text-2xl">No events yet</p>
      <p className="mt-2 text-sm text-muted-foreground">Create your first event to start collecting photos with your friends.</p>
      <Link
        to="/events/new"
        className="mt-6 inline-flex rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground"
      >
        Create an event
      </Link>
    </div>
  );
}
