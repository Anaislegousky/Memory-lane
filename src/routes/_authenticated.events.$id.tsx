import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import { PhotoUploader } from "@/components/PhotoUploader";
import { PhotoGallery } from "@/components/PhotoGallery";
import { InviteShareSheet } from "@/components/InviteShareSheet";
import { BottomNav } from "@/components/BottomNav";
import { Share2, MapPin, Calendar, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/events/$id")({
  head: () => ({ meta: [{ title: "Événement — Memories" }] }),
  component: EventDetail,
});

function EventDetail() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [shareOpen, setShareOpen] = useState(false);

  const eventQ = useQuery({
    queryKey: ["event", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("id, owner_id, name, event_date, end_date, location_label, lat, lng")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const membersQ = useQuery({
    queryKey: ["event-members", id],
    queryFn: async () => {
      const { data: rows, error } = await supabase
        .from("event_members")
        .select("user_id, role")
        .eq("event_id", id);
      if (error) throw error;
      const ids = (rows ?? []).map((r) => r.user_id);
      if (!ids.length) return [];
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, display_name")
        .in("id", ids);
      const byId = new Map((profs ?? []).map((p) => [p.id, p.display_name]));
      return (rows ?? []).map((r) => ({
        user_id: r.user_id,
        role: r.role,
        display_name: byId.get(r.user_id) ?? "Quelqu'un",
      }));
    },
  });

  const photosQ = useQuery({
    queryKey: ["photos", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("photos")
        .select("id, storage_path, uploader_id, created_at")
        .eq("event_id", id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const tagsQ = useQuery({
    queryKey: ["tags", id],
    queryFn: async () => {
      const photoIds = (photosQ.data ?? []).map((p) => p.id);
      if (!photoIds.length) return [];
      const { data, error } = await supabase
        .from("photo_tags")
        .select("id, photo_id, tagged_user_id")
        .in("photo_id", photoIds);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!photosQ.data,
  });

  const ev = eventQ.data;
  const isOwner = !!user && !!ev && ev.owner_id === user.id;

  async function deleteEvent() {
    if (!ev) return;
    if (!confirm(`Supprimer « ${ev.name} » et toutes ses photos ?`)) return;
    const paths = (photosQ.data ?? []).map((p) => p.storage_path);
    if (paths.length) await supabase.storage.from("event-photos").remove(paths);
    const { error } = await supabase.from("events").delete().eq("id", ev.id);
    if (error) return toast.error(error.message);
    toast.success("Événement supprimé");
    navigate({ to: "/events" });
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="mx-auto max-w-md px-4 py-4">
        <Link to="/events" className="text-sm text-muted-foreground">← Événements</Link>

        {ev && (
          <>
            <h1 className="mt-3 font-display text-3xl tracking-tight">{ev.name}</h1>
            <div className="mt-2 flex flex-wrap items-start gap-x-4 gap-y-1 text-sm text-muted-foreground">
              {ev.event_date && (
                <span className="inline-flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  {ev.end_date && ev.end_date !== ev.event_date
                    ? `${format(new Date(ev.event_date), "d MMM", { locale: fr })} – ${format(new Date(ev.end_date), "d MMM yyyy", { locale: fr })}`
                    : format(new Date(ev.event_date), "d MMM yyyy", { locale: fr })}
                </span>
              )}
              {ev.location_label && <AddressLabel label={ev.location_label} />}
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <PhotoUploader eventId={ev.id} onUploaded={() => photosQ.refetch()} />
              <button
                onClick={() => setShareOpen(true)}
                className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-3 py-2 text-sm"
              >
                <Share2 className="h-4 w-4" /> Inviter
              </button>
              {isOwner && (
                <button
                  onClick={deleteEvent}
                  className="ml-auto inline-flex items-center gap-1 rounded-full border border-border bg-card px-3 py-2 text-sm text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>

            {!!membersQ.data?.length && (
              <div className="mt-4 flex flex-wrap gap-1.5">
                {membersQ.data.map((m) => (
                  <span key={m.user_id} className="rounded-full bg-accent px-2.5 py-0.5 text-xs">
                    {m.display_name}
                    {m.role === "owner" ? " · organisateur" : ""}
                  </span>
                ))}
              </div>
            )}

            <div className="mt-6">
              <PhotoGallery
                photos={photosQ.data ?? []}
                members={(membersQ.data ?? []).map((m) => ({ user_id: m.user_id, display_name: m.display_name }))}
                tags={tagsQ.data ?? []}
                onChange={() => { photosQ.refetch(); tagsQ.refetch(); }}
                isOwner={isOwner}
              />
            </div>
            <p className="mt-6 text-center text-xs text-muted-foreground">
              Les photos sont privées aux membres de l'événement et sont automatiquement supprimées au bout de 90 jours.
            </p>
          </>
        )}
      </div>

      {shareOpen && ev && (
        <InviteShareSheet scope="event" eventId={ev.id} onClose={() => setShareOpen(false)} />
      )}
      <BottomNav />
    </div>
  );
}
