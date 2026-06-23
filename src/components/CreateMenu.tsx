import { useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import imageCompression from "browser-image-compression";
import { ImagePlus, Camera, CalendarPlus, X, Loader2, MapPin, Calendar } from "lucide-react";
import { toast } from "sonner";
import { createEvent } from "@/lib/events.functions";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import {
  readPhotoMeta,
  groupPhotosIntoEvents,
  type EventGroup,
} from "@/lib/exif-import";
import { shortAddress } from "@/lib/format-address";

type Phase = "menu" | "reading" | "preview" | "uploading";

export function CreateMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const qc = useQueryClient();
  const createEventFn = useServerFn(createEvent);
  const galleryRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<Phase>("menu");
  const [groups, setGroups] = useState<EventGroup[]>([]);
  const [progress, setProgress] = useState({ done: 0, total: 0 });

  function reset() {
    setPhase("menu");
    setGroups([]);
    setProgress({ done: 0, total: 0 });
  }

  function close() {
    reset();
    onClose();
  }

  async function onFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (galleryRef.current) galleryRef.current.value = "";
    if (cameraRef.current) cameraRef.current.value = "";
    if (!files.length) return;
    setPhase("reading");
    try {
      const metas = await Promise.all(files.map(readPhotoMeta));
      const grouped = await groupPhotosIntoEvents(metas);
      setGroups(grouped);
      setPhase("preview");
    } catch (err: any) {
      toast.error(err?.message || "Impossible de lire les photos");
      setPhase("menu");
    }
  }

  function updateGroup(id: string, patch: Partial<EventGroup>) {
    setGroups((gs) => gs.map((g) => (g.id === id ? { ...g, ...patch } : g)));
  }

  async function createAll() {
    if (!user || !groups.length) return;
    const total = groups.reduce((s, g) => s + g.photos.length, 0);
    setProgress({ done: 0, total });
    setPhase("uploading");
    let lastEventId: string | null = null;
    let done = 0;
    try {
      for (const g of groups) {
        const ev = await createEventFn({
          data: {
            name: g.name.trim() || "Souvenirs",
            event_date: g.event_date,
            end_date: null,
            location_label: g.location_label || null,
            lat: g.lat,
            lng: g.lng,
          },
        });
        lastEventId = ev.id;
        for (const photo of g.photos) {
          try {
            const compressed = await imageCompression(photo.file, {
              maxSizeMB: 1.5,
              maxWidthOrHeight: 2000,
              useWebWorker: true,
            });
            const ext = (photo.file.name.split(".").pop() || "jpg").toLowerCase();
            const id = crypto.randomUUID();
            const path = `${ev.id}/${id}.${ext}`;
            const { error: upErr } = await supabase.storage
              .from("event-photos")
              .upload(path, compressed, { contentType: compressed.type || photo.file.type });
            if (upErr) throw upErr;
            const { error: dbErr } = await supabase.from("photos").insert({
              id,
              event_id: ev.id,
              uploader_id: user.id,
              storage_path: path,
            });
            if (dbErr) throw dbErr;
          } catch (err: any) {
            console.error(err);
            toast.error(`Échec : ${photo.file.name}`);
          } finally {
            done++;
            setProgress({ done, total });
          }
        }
      }
      await qc.invalidateQueries({ queryKey: ["events"] });
      toast.success(
        `${groups.length} événement${groups.length > 1 ? "s" : ""} créé${groups.length > 1 ? "s" : ""}`,
      );
      close();
      if (groups.length === 1 && lastEventId) {
        navigate({ to: "/events/$id", params: { id: lastEventId } });
      }
    } catch (err: any) {
      toast.error(err?.message || "Erreur lors de la création");
      setPhase("preview");
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50" onClick={close}>
      <div
        className="w-full max-w-md rounded-t-3xl bg-card p-5 pb-8 shadow-xl animate-in slide-in-from-bottom"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-xl">
            {phase === "menu" && "Ajouter"}
            {phase === "reading" && "Lecture des photos…"}
            {phase === "preview" && "Vos souvenirs"}
            {phase === "uploading" && "Création en cours…"}
          </h2>
          <button onClick={close} aria-label="Fermer" className="rounded-full p-1 text-muted-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        {phase === "menu" && (
          <div className="space-y-2">
            <button
              onClick={() => galleryRef.current?.click()}
              className="flex w-full items-center gap-3 rounded-2xl bg-primary p-4 text-left text-primary-foreground"
            >
              <ImagePlus className="h-5 w-5" />
              <div>
                <p className="font-medium">Importer depuis la galerie</p>
                <p className="text-xs opacity-80">L'événement est créé automatiquement</p>
              </div>
            </button>
            <button
              onClick={() => cameraRef.current?.click()}
              className="flex w-full items-center gap-3 rounded-2xl border border-border bg-background p-4 text-left"
            >
              <Camera className="h-5 w-5" />
              <div>
                <p className="font-medium">Prendre une photo</p>
                <p className="text-xs text-muted-foreground">Date et lieu d'aujourd'hui</p>
              </div>
            </button>
            <button
              onClick={() => {
                close();
                navigate({ to: "/events/new" });
              }}
              className="flex w-full items-center gap-3 rounded-2xl border border-border bg-background p-4 text-left"
            >
              <CalendarPlus className="h-5 w-5" />
              <div>
                <p className="font-medium">Créer un événement vide</p>
                <p className="text-xs text-muted-foreground">Vous ajouterez les photos plus tard</p>
              </div>
            </button>
          </div>
        )}

        {phase === "reading" && (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Analyse des photos…
          </div>
        )}

        {phase === "preview" && (
          <div className="max-h-[70vh] space-y-3 overflow-y-auto">
            <p className="text-xs text-muted-foreground">
              {groups.length} événement{groups.length > 1 ? "s" : ""} détecté
              {groups.length > 1 ? "s" : ""} d'après vos photos.
            </p>
            {groups.map((g) => (
              <div key={g.id} className="space-y-2 rounded-2xl border border-border bg-background p-3">
                <input
                  value={g.name}
                  onChange={(e) => updateGroup(g.id, { name: e.target.value })}
                  className="w-full rounded-lg border border-input bg-card px-3 py-2 font-display text-lg"
                />
                <div className="flex flex-wrap gap-2 text-xs">
                  <label className="inline-flex items-center gap-1 rounded-full border border-input bg-card px-2 py-1">
                    <Calendar className="h-3 w-3" />
                    <input
                      type="date"
                      value={g.event_date}
                      onChange={(e) => updateGroup(g.id, { event_date: e.target.value })}
                      className="bg-transparent outline-none"
                    />
                  </label>
                  <label className="inline-flex flex-1 items-center gap-1 rounded-full border border-input bg-card px-2 py-1">
                    <MapPin className="h-3 w-3" />
                    <input
                      placeholder="Lieu (optionnel)"
                      value={shortAddress(g.location_label)}
                      onChange={(e) => updateGroup(g.id, { location_label: e.target.value })}
                      className="w-full bg-transparent outline-none"
                    />
                  </label>
                </div>
                <div className="flex gap-1.5 overflow-x-auto">
                  {g.photos.slice(0, 8).map((p, i) => (
                    <PhotoThumb key={i} file={p.file} />
                  ))}
                  {g.photos.length > 8 && (
                    <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-lg bg-accent text-xs text-muted-foreground">
                      +{g.photos.length - 8}
                    </div>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {g.photos.length} photo{g.photos.length > 1 ? "s" : ""}
                </p>
              </div>
            ))}
            <button
              onClick={createAll}
              className="w-full rounded-full bg-primary px-5 py-3.5 font-medium text-primary-foreground"
            >
              Créer {groups.length} événement{groups.length > 1 ? "s" : ""}
            </button>
          </div>
        )}

        {phase === "uploading" && (
          <div className="space-y-3 py-4">
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              {progress.done} / {progress.total} photo{progress.total > 1 ? "s" : ""}
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-accent">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%` }}
              />
            </div>
          </div>
        )}

        <input
          ref={galleryRef}
          type="file"
          accept="image/*"
          multiple
          onChange={onFiles}
          className="hidden"
        />
        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={onFiles}
          className="hidden"
        />
      </div>
    </div>
  );
}

function PhotoThumb({ file }: { file: File }) {
  const [url, setUrl] = useState<string | null>(null);
  if (url === null) {
    const u = URL.createObjectURL(file);
    setUrl(u);
  }
  return (
    <img
      src={url ?? undefined}
      alt=""
      className="h-14 w-14 flex-shrink-0 rounded-lg object-cover"
    />
  );
}
