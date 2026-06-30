import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import imageCompression from "browser-image-compression";
import { ImagePlus, Camera, CalendarPlus, X, Loader2, MapPin, Locate, Search } from "lucide-react";
import { toast } from "sonner";
import { createEvent, geocodeSearch, geocodeReverse } from "@/lib/events.functions";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import { useIsGuest, GuestUpgradeDialog } from "@/components/GuestGate";
import {
  readPhotoMeta,
  groupPhotosIntoEvents,
  type EventGroup,
} from "@/lib/exif-import";

type Phase = "menu" | "reading" | "preview" | "uploading";

export function CreateMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isGuest = useIsGuest();
  const qc = useQueryClient();
  const createEventFn = useServerFn(createEvent);
  const galleryRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<Phase>("menu");
  const [groups, setGroups] = useState<EventGroup[]>([]);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [gateOpen, setGateOpen] = useState(false);

  function guard(fn: () => void) {
    if (isGuest) {
      setGateOpen(true);
      return;
    }
    fn();
  }

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
            end_date: g.end_date,
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
      if (lastEventId) {
        navigate({ to: "/events/$id", params: { id: lastEventId } });
      }
    } catch (err: any) {
      toast.error(err?.message || "Erreur lors de la création");
      setPhase("preview");
    }
  }

  if (!open) {
    return <GuestUpgradeDialog action="create_event" open={gateOpen} onOpenChange={setGateOpen} />;
  }

  return (
    <>
    <GuestUpgradeDialog action="create_event" open={gateOpen} onOpenChange={setGateOpen} />
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
              onClick={() => guard(() => galleryRef.current?.click())}
              className="flex w-full items-center gap-3 rounded-2xl bg-primary p-4 text-left text-primary-foreground"
            >
              <ImagePlus className="h-5 w-5" />
              <div>
                <p className="font-medium">Importer depuis la galerie</p>
                <p className="text-xs opacity-80">L'événement est créé automatiquement</p>
              </div>
            </button>
            <button
              onClick={() => guard(() => cameraRef.current?.click())}
              className="flex w-full items-center gap-3 rounded-2xl border border-border bg-background p-4 text-left"
            >
              <Camera className="h-5 w-5" />
              <div>
                <p className="font-medium">Prendre une photo</p>
                <p className="text-xs text-muted-foreground">Date et lieu d'aujourd'hui</p>
              </div>
            </button>
            <button
              onClick={() =>
                guard(() => {
                  close();
                  navigate({ to: "/events/new" });
                })
              }
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
            {groups.map((g) => (
              <div key={g.id} className="space-y-3 rounded-2xl border border-border bg-background p-3">
                <input
                  value={g.name}
                  onChange={(e) => updateGroup(g.id, { name: e.target.value })}
                  className="w-full rounded-lg border border-input bg-card px-3 py-2 font-display text-lg"
                />

                {/* Date card — same shape as /events/new */}
                <DateCard group={g} onChange={(patch) => updateGroup(g.id, patch)} />

                {/* Location card — same shape as /events/new */}
                <LocationCard group={g} onChange={(patch) => updateGroup(g.id, patch)} />

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
              Créer l'événement
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
    </>
  );
}

function PhotoThumb({ file }: { file: File }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    const u = URL.createObjectURL(file);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);
  return (
    <img
      src={url ?? undefined}
      alt=""
      className="h-14 w-14 flex-shrink-0 rounded-lg object-cover bg-accent"
    />
  );
}

function DateCard({
  group,
  onChange,
}: {
  group: EventGroup;
  onChange: (patch: Partial<EventGroup>) => void;
}) {
  const multiDay = !!group.end_date && group.end_date !== group.event_date;
  return (
    <div className="space-y-3 rounded-2xl border border-border bg-card p-4">
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium">
          {multiDay ? "Date de début" : "Date"}
        </span>
        <input
          type="date"
          value={group.event_date}
          onChange={(e) => {
            const v = e.target.value;
            const patch: Partial<EventGroup> = { event_date: v };
            if (group.end_date && group.end_date < v) patch.end_date = v;
            onChange(patch);
          }}
          className="w-full rounded-xl border border-input bg-background px-4 py-3 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={multiDay}
          onChange={(e) => {
            if (e.target.checked) onChange({ end_date: group.event_date });
            else onChange({ end_date: null });
          }}
          className="h-4 w-4 rounded border-input"
        />
        Plusieurs jours
      </label>
      {multiDay && (
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">Date de fin</span>
          <input
            type="date"
            value={group.end_date ?? group.event_date}
            min={group.event_date}
            onChange={(e) => onChange({ end_date: e.target.value })}
            className="w-full rounded-xl border border-input bg-background px-4 py-3 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </label>
      )}
    </div>
  );
}

function LocationCard({
  group,
  onChange,
}: {
  group: EventGroup;
  onChange: (patch: Partial<EventGroup>) => void;
}) {
  const searchFn = useServerFn(geocodeSearch);
  const reverseFn = useServerFn(geocodeReverse);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<{ display_name: string; lat: number; lng: number }[]>([]);
  const [searching, setSearching] = useState(false);

  // Debounced autocomplete as the user types
  useEffect(() => {
    const q = search.trim();
    if (q.length < 3) {
      setResults([]);
      return;
    }
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await searchFn({ data: { q } });
        setResults(res);
      } catch {
        /* silent */
      } finally {
        setSearching(false);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [search, searchFn]);

  async function useMyLocation() {
    if (!("geolocation" in navigator)) {
      toast.error("Géolocalisation non disponible");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          const { display_name } = await reverseFn({ data: { lat: latitude, lng: longitude } });
          onChange({ location_label: display_name, lat: latitude, lng: longitude });
        } catch {
          onChange({
            location_label: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
            lat: latitude,
            lng: longitude,
          });
        }
      },
      () => toast.error("Impossible d'obtenir votre position"),
      { enableHighAccuracy: false, timeout: 8000 },
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="text-sm font-medium">Lieu</p>
      <p className="mt-1 text-xs text-muted-foreground">
        Détecté depuis vos photos si possible. Modifiable.
      </p>

      <button
        type="button"
        onClick={useMyLocation}
        className="mt-3 inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1.5 text-sm"
      >
        <Locate className="h-4 w-4" /> Utiliser ma position
      </button>

      <div className="mt-3 flex gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Ville ou adresse"
          className="flex-1 rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary"
        />
        <span className="grid place-items-center px-1 text-muted-foreground">
          {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
        </span>
      </div>
      {results.length > 0 && (
        <ul className="mt-2 max-h-48 overflow-auto rounded-xl border border-border bg-background text-sm">
          {results.map((r, i) => (
            <li key={i}>
              <button
                type="button"
                onClick={() => {
                  onChange({ location_label: r.display_name, lat: r.lat, lng: r.lng });
                  setResults([]);
                  setSearch("");
                }}
                className="block w-full px-3 py-2 text-left hover:bg-accent"
              >
                {r.display_name}
              </button>
            </li>
          ))}
        </ul>
      )}

      {group.location_label && (
        <p className="mt-3 inline-flex max-w-full items-center gap-1 rounded-full bg-accent px-3 py-1 text-xs">
          <MapPin className="h-3 w-3 flex-shrink-0" />
          <span className="truncate">{group.location_label}</span>
          <button
            type="button"
            onClick={() => onChange({ location_label: "", lat: null, lng: null })}
            className="ml-1 text-muted-foreground"
            aria-label="Effacer le lieu"
          >
            ×
          </button>
        </p>
      )}

      {!group.location_label && (
        <input
          placeholder="Ou saisissez un libellé (ex. chez Anna)"
          onChange={(e) => onChange({ location_label: e.target.value })}
          className="mt-3 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
        />
      )}
    </div>
  );
}
