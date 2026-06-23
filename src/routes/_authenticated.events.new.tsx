import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { z } from "zod";
import { createEvent } from "@/lib/events.functions";
import { toast } from "sonner";
import { MapPin, Locate, Search } from "lucide-react";

export const Route = createFileRoute("/_authenticated/events/new")({
  head: () => ({ meta: [{ title: "Nouvel événement — Memories" }] }),
  component: NewEventPage,
});

type Loc = { label: string; lat: number | null; lng: number | null };

const schema = z.object({
  name: z.string().trim().min(2).max(80),
  event_date: z.string().optional(),
  end_date: z.string().optional(),
  location_label: z.string().trim().max(200).optional().or(z.literal("")),
});

const todayISO = () => {
  const d = new Date();
  const tz = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tz).toISOString().slice(0, 10);
};

function NewEventPage() {
  const navigate = useNavigate();
  const createEventFn = useServerFn(createEvent);
  const [loc, setLoc] = useState<Loc>({ label: "", lat: null, lng: null });
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<{ display_name: string; lat: string; lon: string }[]>([]);
  const [searching, setSearching] = useState(false);
  const [multiDay, setMultiDay] = useState(false);
  const [startDate, setStartDate] = useState(todayISO());
  const [endDate, setEndDate] = useState(todayISO());

  async function useMyLocation() {
    if (!("geolocation" in navigator)) {
      toast.error("Géolocalisation non disponible");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          const r = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=14&accept-language=fr`,
            { headers: { Accept: "application/json" } },
          );
          const j = await r.json();
          const label = j.display_name || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
          setLoc({ label, lat: latitude, lng: longitude });
        } catch {
          setLoc({ label: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`, lat: latitude, lng: longitude });
        }
      },
      () => toast.error("Impossible d'obtenir votre position"),
      { enableHighAccuracy: false, timeout: 8000 },
    );
  }

  async function searchPlace() {
    if (!search.trim()) return;
    setSearching(true);
    try {
      const r = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=5&accept-language=fr&q=${encodeURIComponent(search)}`,
      );
      setResults(await r.json());
    } finally {
      setSearching(false);
    }
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setBusy(true);
    try {
      const v = schema.parse({
        name: fd.get("name"),
        event_date: startDate || undefined,
        end_date: multiDay && endDate ? endDate : undefined,
        location_label: loc.label || (fd.get("location_label") as string) || "",
      });

      const data = await createEventFn({
        data: {
          name: v.name,
          event_date: v.event_date || null,
          end_date: v.end_date || null,
          location_label: v.location_label || null,
          lat: loc.lat,
          lng: loc.lng,
        },
      });

      toast.success("Événement créé");
      navigate({ to: "/events/$id", params: { id: data.id } });
    } catch (err: any) {
      if (/unauthorized|authorization|token/i.test(err?.message ?? "")) {
        toast.error("Reconnectez-vous pour continuer");
        navigate({ to: "/auth", search: { mode: "signin", redirect: "/events/new" } });
      } else {
        toast.error(err?.message || "Impossible de créer l'événement");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-md px-4 py-6 pb-20">
        <Link to="/events" className="text-sm text-muted-foreground">← Retour</Link>
        <h1 className="mt-3 font-display text-3xl">Nouvel événement</h1>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">Nom</span>
            <input
              name="name"
              required
              placeholder="Été à Lisbonne"
              className="w-full rounded-xl border border-input bg-card px-4 py-3 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">Date</span>
            <input
              type="date"
              name="event_date"
              className="w-full rounded-xl border border-input bg-card px-4 py-3 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </label>

          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="text-sm font-medium">Lieu</p>
            <p className="mt-1 text-xs text-muted-foreground">Optionnel. Utilisez votre position actuelle ou recherchez un lieu.</p>

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
                    searchPlace();
                  }
                }}
              />
              <button
                type="button"
                onClick={searchPlace}
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
                        setLoc({ label: r.display_name, lat: parseFloat(r.lat), lng: parseFloat(r.lon) });
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

            {!loc.label && (
              <input
                name="location_label"
                placeholder="Ou saisissez un libellé (ex. chez Anna)"
                className="mt-3 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
              />
            )}
          </div>

          <button
            disabled={busy}
            className="w-full rounded-full bg-primary px-5 py-3.5 font-medium text-primary-foreground disabled:opacity-60"
          >
            {busy ? "Création…" : "Créer l'événement"}
          </button>
        </form>
      </div>
    </div>
  );
}
