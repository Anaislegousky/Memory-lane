import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

const WARN_DAYS = 7;
const NOTIFIED_KEY = "memories:notified-expiring";

export type ExpiringEvent = {
  event_id: string;
  event_name: string;
  photo_count: number;
  earliest_expiry: string;
};

export function useExpiringPhotos() {
  return useQuery({
    queryKey: ["expiring-photos"],
    queryFn: async (): Promise<ExpiringEvent[]> => {
      const horizon = new Date(Date.now() + WARN_DAYS * 24 * 60 * 60 * 1000).toISOString();
      const now = new Date().toISOString();
      const { data: photos, error } = await supabase
        .from("photos")
        .select("event_id, expires_at")
        .lte("expires_at", horizon)
        .gte("expires_at", now);
      if (error) throw error;
      if (!photos?.length) return [];

      const eventIds = Array.from(new Set(photos.map((p) => p.event_id)));
      const { data: events } = await supabase
        .from("events")
        .select("id, name")
        .in("id", eventIds);
      const nameById = new Map((events ?? []).map((e) => [e.id, e.name]));

      const grouped = new Map<string, ExpiringEvent>();
      for (const p of photos) {
        const cur = grouped.get(p.event_id);
        if (!cur) {
          grouped.set(p.event_id, {
            event_id: p.event_id,
            event_name: nameById.get(p.event_id) ?? "Événement",
            photo_count: 1,
            earliest_expiry: p.expires_at,
          });
        } else {
          cur.photo_count++;
          if (p.expires_at < cur.earliest_expiry) cur.earliest_expiry = p.expires_at;
        }
      }
      return Array.from(grouped.values()).sort((a, b) =>
        a.earliest_expiry.localeCompare(b.earliest_expiry),
      );
    },
  });
}

/** Fire a browser notification once per event per day when expiry is near. */
export function useNotifyExpiring(events: ExpiringEvent[] | undefined) {
  useEffect(() => {
    if (!events?.length) return;
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission !== "granted") return;

    let map: Record<string, string> = {};
    try {
      map = JSON.parse(localStorage.getItem(NOTIFIED_KEY) || "{}");
    } catch {
      map = {};
    }
    const today = new Date().toISOString().slice(0, 10);
    let changed = false;

    for (const ev of events) {
      if (map[ev.event_id] === today) continue;
      const days = Math.max(
        1,
        Math.ceil((new Date(ev.earliest_expiry).getTime() - Date.now()) / (24 * 60 * 60 * 1000)),
      );
      try {
        new Notification("Vos photos vont bientôt disparaître", {
          body: `« ${ev.event_name} » — ${ev.photo_count} photo${ev.photo_count > 1 ? "s" : ""} sera${ev.photo_count > 1 ? "ont" : ""} supprimée${ev.photo_count > 1 ? "s" : ""} dans ${days} jour${days > 1 ? "s" : ""}.`,
          tag: `expiring-${ev.event_id}`,
        });
        map[ev.event_id] = today;
        changed = true;
      } catch {
        /* ignore */
      }
    }
    if (changed) {
      try {
        localStorage.setItem(NOTIFIED_KEY, JSON.stringify(map));
      } catch {
        /* ignore */
      }
    }
  }, [events]);
}
