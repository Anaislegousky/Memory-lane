import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import { PhotoUploader } from "@/components/PhotoUploader";
import { PhotoGallery } from "@/components/PhotoGallery";
import { InviteShareSheet } from "@/components/InviteShareSheet";
import { BottomNav } from "@/components/BottomNav";
import { ChevronLeft, MapPin, Calendar, Trash2, UserPlus, X } from "lucide-react";
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
  const [membersOpen, setMembersOpen] = useState(false);

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

  const dateLabel =
    ev?.event_date
      ? ev.end_date && ev.end_date !== ev.event_date
        ? `${format(new Date(ev.event_date), "d MMM", { locale: fr })} – ${format(new Date(ev.end_date), "d MMM yyyy", { locale: fr })}`
        : format(new Date(ev.event_date), "d MMM yyyy", { locale: fr })
      : null;

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="mx-auto max-w-md">
        {/* Top nav */}
        <div className="flex items-center justify-between px-3 pt-2">
          <Link
            to="/events"
            aria-label="Retour aux événements"
            className="-ml-1 inline-flex items-center gap-1 rounded-full py-2 pl-1 pr-3 text-sm font-medium text-muted-foreground hover:bg-accent/60"
          >
            <ChevronLeft className="h-5 w-5" />
            <span>Retour</span>
          </Link>
          {isOwner && (
            <button
              onClick={deleteEvent}
              aria-label="Supprimer l'événement"
              className="-mr-1 inline-flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="h-5 w-5" />
            </button>
          )}
        </div>

        {ev && (
          <>
            {/* Title + meta */}
            <div className="px-5 pt-1">
              <h1 className="line-clamp-2 font-display text-3xl leading-tight tracking-tight">
                {ev.name}
              </h1>
              {(dateLabel || ev.location_label) && (
                <div className="mt-1.5 flex min-w-0 items-center gap-1.5 text-sm text-muted-foreground">
                  {dateLabel && (
                    <span className="flex shrink-0 items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5" />
                      {dateLabel}
                    </span>
                  )}
                  {dateLabel && ev.location_label && (
                    <span className="text-muted-foreground/50">·</span>
                  )}
                  {ev.location_label && (
                    <span className="flex min-w-0 items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{shortAddress(ev.location_label)}</span>
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="mt-3 flex items-center gap-2 px-5">
              <PhotoUploader eventId={ev.id} onUploaded={() => photosQ.refetch()} />
              <button
                onClick={() => setShareOpen(true)}
                aria-label="Inviter des amis"
                title="Inviter"
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-accent text-accent-foreground transition active:scale-[0.98]"
              >
                <UserPlus className="h-5 w-5" />
              </button>
            </div>

            {/* Participants */}
            {!!members.length && (
              <button
                onClick={() => setMembersOpen(true)}
                className="mt-2 flex items-center gap-2 px-5 text-sm text-muted-foreground transition hover:text-foreground"
              >
                <span className="font-medium">
                  {members.length} participant{members.length > 1 ? "s" : ""}
                </span>
                <span className="flex items-center -space-x-2">
                  {members.slice(0, 3).map((m) => (
                    <span
                      key={m.user_id}
                      className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-background bg-secondary text-[10px] font-semibold text-secondary-foreground"
                    >
                      {initials(m.display_name)}
                    </span>
                  ))}
                  {members.length > 3 && (
                    <span className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-background bg-muted text-[10px] font-semibold text-muted-foreground">
                      +{members.length - 3}
                    </span>
                  )}
                </span>
              </button>
            )}

            {/* Gallery section */}
            <div className="mt-2 rounded-t-[2rem] bg-accent/40 pb-8 pt-3">
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

      {membersOpen && (
        <MembersSheet
          members={members}
          onClose={() => setMembersOpen(false)}
          onInvite={() => {
            setMembersOpen(false);
            setShareOpen(true);
          }}
        />
      )}

      {shareOpen && ev && (
        <InviteShareSheet scope="event" eventId={ev.id} onClose={() => setShareOpen(false)} />
      )}
      <BottomNav />
    </div>
  );
}

function MembersSheet({
  members,
  onClose,
  onInvite,
}: {
  members: { user_id: string; display_name: string; role: string }[];
  onClose: () => void;
  onInvite: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-t-3xl bg-background p-5 pb-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            {members.length} participant{members.length > 1 ? "s" : ""}
          </h2>
          <button
            onClick={onClose}
            aria-label="Fermer"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-accent"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <ul className="max-h-[50vh] space-y-1 overflow-auto">
          {members.map((m) => (
            <li key={m.user_id} className="flex items-center gap-3 rounded-xl px-2 py-2">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-semibold text-secondary-foreground">
                {initials(m.display_name)}
              </span>
              <span className="min-w-0 flex-1 truncate text-sm font-medium">{m.display_name}</span>
              {m.role === "owner" && (
                <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent-foreground">
                  Organisateur
                </span>
              )}
            </li>
          ))}
        </ul>
        <button
          onClick={onInvite}
          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3 text-sm font-medium text-primary-foreground"
        >
          <UserPlus className="h-4 w-4" /> Inviter des amis
        </button>
      </div>
    </div>
  );
}
