import exifr from "exifr";

export type PhotoMeta = {
  file: File;
  takenAt: Date;
  lat: number | null;
  lng: number | null;
  dayKey: string; // YYYY-MM-DD
};

export type EventGroup = {
  id: string;
  name: string;
  event_date: string; // YYYY-MM-DD (start)
  end_date: string | null; // YYYY-MM-DD (end, null if single day)
  location_label: string;
  lat: number | null;
  lng: number | null;
  photos: PhotoMeta[];
};

const isoDay = (d: Date) => {
  const tz = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tz).toISOString().slice(0, 10);
};

export async function readPhotoMeta(file: File): Promise<PhotoMeta> {
  let takenAt: Date | null = null;
  let lat: number | null = null;
  let lng: number | null = null;
  try {
    const exif = await exifr.parse(file, { gps: true, pick: ["DateTimeOriginal", "CreateDate", "latitude", "longitude"] });
    if (exif?.DateTimeOriginal instanceof Date) takenAt = exif.DateTimeOriginal;
    else if (exif?.CreateDate instanceof Date) takenAt = exif.CreateDate;
    if (typeof exif?.latitude === "number") lat = exif.latitude;
    if (typeof exif?.longitude === "number") lng = exif.longitude;
  } catch {
    /* ignore */
  }
  if (!takenAt) takenAt = new Date(file.lastModified || Date.now());
  return { file, takenAt, lat, lng, dayKey: isoDay(takenAt) };
}

const geocodeCache = new Map<string, { label: string; city: string; country: string }>();

export async function reverseGeocode(lat: number, lng: number) {
  const key = `${lat.toFixed(3)},${lng.toFixed(3)}`;
  const hit = geocodeCache.get(key);
  if (hit) return hit;
  try {
    const r = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=12&accept-language=fr`,
      { headers: { Accept: "application/json" } },
    );
    const j = await r.json();
    const a = j.address ?? {};
    const city = a.city || a.town || a.village || a.municipality || a.county || "";
    const country = a.country || "";
    const label = j.display_name || [city, country].filter(Boolean).join(", ");
    const value = { label, city, country };
    geocodeCache.set(key, value);
    return value;
  } catch {
    return { label: "", city: "", country: "" };
  }
}

const MONTHS_FR_SHORT = [
  "janv.", "févr.", "mars", "avr.", "mai", "juin",
  "juil.", "août", "sept.", "oct.", "nov.", "déc.",
];

function fmtDayMonth(d: Date) {
  return `${d.getDate()} ${MONTHS_FR_SHORT[d.getMonth()]}`;
}

export function buildShortTitle(opts: {
  city: string;
  startISO: string;
  endISO: string | null;
}) {
  const start = new Date(opts.startISO + "T00:00:00");
  const end = opts.endISO ? new Date(opts.endISO + "T00:00:00") : start;
  const sameDay = start.getTime() === end.getTime();
  const sameYear = start.getFullYear() === end.getFullYear();
  const now = new Date();
  const includeYear = !sameYear || start.getFullYear() !== now.getFullYear();

  let datePart: string;
  if (sameDay) {
    datePart = fmtDayMonth(start) + (includeYear ? ` ${start.getFullYear()}` : "");
  } else if (sameYear && start.getMonth() === end.getMonth()) {
    datePart = `${start.getDate()}–${end.getDate()} ${MONTHS_FR_SHORT[end.getMonth()]}` +
      (includeYear ? ` ${end.getFullYear()}` : "");
  } else if (sameYear) {
    datePart = `${fmtDayMonth(start)} – ${fmtDayMonth(end)}` +
      (includeYear ? ` ${end.getFullYear()}` : "");
  } else {
    datePart = `${fmtDayMonth(start)} ${start.getFullYear()} – ${fmtDayMonth(end)} ${end.getFullYear()}`;
  }

  const prefix = opts.city.trim() || "Souvenirs";
  return `${prefix} · ${datePart}`;
}

/**
 * Build a single multi-day event from all selected photos.
 * - event_date = earliest day, end_date = latest day (null if same day)
 * - lat/lng = centroid of geotagged photos (if any)
 */
export async function groupPhotosIntoEvents(metas: PhotoMeta[]): Promise<EventGroup[]> {
  if (!metas.length) return [];

  const sorted = [...metas].sort((a, b) => a.takenAt.getTime() - b.takenAt.getTime());
  const startISO = sorted[0].dayKey;
  const endISO = sorted[sorted.length - 1].dayKey;

  const geoPhotos = metas.filter((p) => p.lat != null && p.lng != null);
  let lat: number | null = null;
  let lng: number | null = null;
  let label = "";
  let city = "";
  if (geoPhotos.length) {
    lat = geoPhotos.reduce((s, p) => s + (p.lat as number), 0) / geoPhotos.length;
    lng = geoPhotos.reduce((s, p) => s + (p.lng as number), 0) / geoPhotos.length;
    const geo = await reverseGeocode(lat, lng);
    label = geo.label;
    city = geo.city;
  }

  const name = buildShortTitle({ city, startISO, endISO: endISO === startISO ? null : endISO });

  return [{
    id: crypto.randomUUID(),
    name,
    event_date: startISO,
    end_date: endISO === startISO ? null : endISO,
    location_label: label,
    lat,
    lng,
    photos: metas,
  }];
}
