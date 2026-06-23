import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import { PhotoUploader } from "@/components/PhotoUploader";
import { PhotoGallery } from "@/components/PhotoGallery";
import { InviteShareSheet } from "@/components/InviteShareSheet";
import { BottomNav } from "@/components/BottomNav";
import {
  ChevronLeft,
  MapPin,
  Calendar,
  Trash2,
  UserPlus,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useState } from "react";
import { toast } from "sonner";
import { shortAddress } from "@/lib/format-address";

export const Route = createFileRoute("/_authenticated/events/$id")({
  head: () => ({ meta: [{ title: "Événement — Memories" }] }),
  component: EventDetail,
});

function initials(name: string) {
  return name
    .split(/\s+/)
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

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

  const members = membersQ.data ?? [];
  const photoCount = photosQ.data?.length ?? 0;

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="mx-auto max-w-md">
        {/* Top nav */}
        <div className="flex items-center justify-between px-4 pt-3">
          <Link
            to="/events"
            aria-label="Retour"
            className="-ml-2 inline-flex h-10 w-10 items-center justify-center rounded-full text-foreground hover:bg-accent/60"
          >
            <ChevronLeft className="h-6 w-6" />
          </Link>
          {isOwner && (
            <button
              onClick={deleteEvent}
              aria-label="Supprimer l'événement"
              className="-mr-2 inline-flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="h-5 w-5" />
            </button>
          )}
        </div>

        {ev && (
          <>
            {/* Title + meta */}
            <div className="px-5 pt-2">
              <h1 className="font-display text-3xl leading-tight tracking-tight">{ev.name}</h1>
              <div className="mt-3 space-y-1.5 text-base text-muted-foreground">
                {ev.event_date && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 flex-shrink-0" />
                    <span>
                      {ev.end_date && ev.end_date !== ev.event_date
                        ? `${format(new Date(ev.event_date), "d MMM", { locale: fr })} – ${format(new Date(ev.end_date), "d MMM yyyy", { locale: fr })}`
                        : format(new Date(ev.event_date), "d MMMM yyyy", { locale: fr })}
                    </span>
                  </div>
                )}
                {ev.location_label && <AddressLabel label={ev.location_label} />}
              </div>
            </div>

            {/* Actions */}
            <div className="mt-6 flex items-center gap-2.5 px-5">
              <PhotoUploader eventId={ev.id} onUploaded={() => photosQ.refetch()} />
              <button
                onClick={() => setShareOpen(true)}
                aria-label="Inviter des amis"
                title="Inviter"
                className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-accent text-accent-foreground transition active:scale-[0.98]"
              >
                <UserPlus className="h-5 w-5" />
              </button>
            </div>

            {/* Members */}
            {!!members.length && (
              <div className="mt-5 flex items-center gap-3 px-5">
                <div className="flex -space-x-2">
                  {members.slice(0, 4).map((m) => (
                    <div
                      key={m.user_id}
                      title={m.display_name}
                      className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-background bg-secondary text-xs font-semibold text-secondary-foreground"
                    >
                      {initials(m.display_name)}
                    </div>
                  ))}
                  {members.length > 4 && (
                    <div className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-background bg-muted text-[11px] font-semibold text-muted-foreground">
                      +{members.length - 4}
                    </div>
                  )}
                </div>
                <span className="text-sm text-muted-foreground">
                  {members.length} participant{members.length > 1 ? "s" : ""}
                </span>
              </div>
            )}

            {/* Gallery section */}
            <div className="mt-8 rounded-t-[2rem] bg-accent/40 pb-8 pt-6">
              <PhotoGallery
                photos={photosQ.data ?? []}
                members={members.map((m) => ({ user_id: m.user_id, display_name: m.display_name }))}
                tags={tagsQ.data ?? []}
                onChange={() => { photosQ.refetch(); tagsQ.refetch(); }}
                isOwner={isOwner}
                count={photoCount}
              />
              <p className="mt-6 px-5 text-center text-xs text-muted-foreground">
                Les photos sont privées et sont supprimées automatiquement après 90 jours.
              </p>
            </div>
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

function AddressLabel({ label }: { label: string }) {
  const [expanded, setExpanded] = useState(false);
  const short = shortAddress(label);
  const hasMore = short.length < label.length;
  return (
    <button
      type="button"
      onClick={() => hasMore && setExpanded((v) => !v)}
      className="flex items-center gap-2 text-left"
    >
      <MapPin className="h-4 w-4 flex-shrink-0" />
      <span>
        {expanded ? label : short}
        {hasMore && (
          <span className="ml-1 inline-flex items-center align-middle text-muted-foreground/70">
            {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </span>
        )}
      </span>
    </button>
  );
}
