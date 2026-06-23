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
  event_date: string; // YYYY-MM-DD
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

function formatDateFr(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/** Group photos by day; if multiple photos in a day share GPS, take the centroid. */
export async function groupPhotosIntoEvents(metas: PhotoMeta[]): Promise<EventGroup[]> {
  const byDay = new Map<string, PhotoMeta[]>();
  for (const m of metas) {
    const arr = byDay.get(m.dayKey) ?? [];
    arr.push(m);
    byDay.set(m.dayKey, arr);
  }

  const groups: EventGroup[] = [];
  for (const [day, photos] of byDay) {
    const geoPhotos = photos.filter((p) => p.lat != null && p.lng != null);
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
    const name = city
      ? `${city} — ${formatDateFr(day)}`
      : `Souvenirs du ${formatDateFr(day)}`;
    groups.push({
      id: crypto.randomUUID(),
      name,
      event_date: day,
      location_label: label,
      lat,
      lng,
      photos,
    });
  }
  return groups.sort((a, b) => b.event_date.localeCompare(a.event_date));
}
