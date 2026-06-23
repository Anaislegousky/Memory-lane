import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { X, MapPin, Locate, Search } from "lucide-react";
import { updateEvent, geocodeSearch, geocodeReverse } from "@/lib/events.functions";

type Ev = {
  id: string;
  name: string;
  event_date: string | null;
  end_date: string | null;
  location_label: string | null;
  lat: number | null;
  lng: number | null;
};

type Loc = { label: string; lat: number | null; lng: number | null };

export function EventEditSheet({ ev, onClose, onSaved }: { ev: Ev; onClose: () => void; onSaved: () => void }) {
  const updateFn = useServerFn(updateEvent);
  const searchFn = useServerFn(geocodeSearch);
  const reverseFn = useServerFn(geocodeReverse);

  const [name, setName] = useState(ev.name);
  const [startDate, setStartDate] = useState(ev.event_date ?? "");
  const [multiDay, setMultiDay] = useState(!!ev.end_date && ev.end_date !== ev.event_date);
  const [endDate, setEndDate] = useState(ev.end_date ?? ev.event_date ?? "");
  const [loc, setLoc] = useState<Loc>({
    label: ev.location_label ?? "",
    lat: ev.lat,
    lng: ev.lng,
  });
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<{ display_name: string; lat: number; lng: number }[]>([]);
  const [searching, setSearching] = useState(false);
  const [busy, setBusy] = useState(false);

  async function useMyLocation() {
    if (!("geolocation" in navigator)) return toast.error("Géolocalisation non disponible");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          const { display_name } = await reverseFn({ data: { lat: latitude, lng: longitude } });
          setLoc({ label: display_name, lat: latitude, lng: longitude });
        } catch {
          setLoc({ label: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`, lat: latitude, lng: longitude });
        }
      },
      () => toast.error("Impossible d'obtenir votre position"),
      { enableHighAccuracy: false, timeout: 8000 },
    );
  }

  async function doSearch() {
    if (!search.trim()) return;
    setSearching(true);
    try {
      setResults(await searchFn({ data: { q: search.trim() } }));
    } catch (e: any) {
      toast.error(e?.message || "Recherche indisponible");
    } finally {
      setSearching(false);
    }
  }

  async function save() {
    setBusy(true);
    try {
      await updateFn({
        data: {
          id: ev.id,
          name: name.trim(),
          event_date: startDate || null,
          end_date: multiDay && endDate ? endDate : null,
          location_label: loc.label || null,
          lat: loc.lat,
          lng: loc.lng,
        },
      });
      toast.success("Événement mis à jour");
      onSaved();
      onClose();
    } catch (e: any) {
      toast.error(e?.message || "Mise à jour impossible");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50" onClick={onClose}>
      <div
        className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-background p-5 pb-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Modifier l'événement</h2>
          <button
            onClick={onClose}
            aria-label="Fermer"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-accent"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">Nom</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-input bg-card px-4 py-3 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </label>

          <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium">{multiDay ? "Date de début" : "Date"}</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  if (!multiDay || endDate < e.target.value) setEndDate(e.target.value);
                }}
                className="w-full rounded-xl border border-input bg-background px-4 py-3 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={multiDay}
                onChange={(e) => {
                  setMultiDay(e.target.checked);
                  if (e.target.checked && endDate < startDate) setEndDate(startDate);
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
                  value={endDate}
                  min={startDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full rounded-xl border border-input bg-background px-4 py-3 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </label>
            )}
          </div>

          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="text-sm font-medium">Lieu</p>
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
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    doSearch();
                  }
                }}
              />
              <button
                type="button"
                onClick={doSearch}
                disabled={searching}
                className="rounded-xl border border-border bg-background px-3 text-sm"
              >
                <Search className="h-4 w-4" />
              </button>
            </div>
            {results.length > 0 && (
              <ul className="mt-2 max-h-48 overflow-auto rounded-xl border border-border bg-background text-sm">
                {results.map((r, i) => (
                  <li key={i}>
                    <button
                      type="button"
                      onClick={() => {
                        setLoc({ label: r.display_name, lat: r.lat, lng: r.lng });
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

            {loc.label && (
              <p className="mt-3 inline-flex items-center gap-1 rounded-full bg-accent px-3 py-1 text-xs">
                <MapPin className="h-3 w-3" /> {loc.label}
                <button
                  type="button"
                  onClick={() => setLoc({ label: "", lat: null, lng: null })}
                  className="ml-1 text-muted-foreground"
                >
                  ×
                </button>
              </p>
            )}
          </div>

          <button
            onClick={save}
            disabled={busy || name.trim().length < 2}
            className="w-full rounded-full bg-primary px-5 py-3.5 font-medium text-primary-foreground disabled:opacity-60"
          >
            {busy ? "Enregistrement…" : "Enregistrer"}
          </button>
        </div>
      </div>
    </div>
  );
}
