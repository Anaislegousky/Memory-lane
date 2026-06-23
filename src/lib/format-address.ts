// Returns a short, friendly label from a Nominatim-style address string.
// Defaults to "City, Country" using the first and last comma-separated parts.
export function shortAddress(label: string | null | undefined): string {
  if (!label) return "";
  const parts = label
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0];
  const city = parts[0];
  const country = parts[parts.length - 1];
  if (city === country) return city;
  return `${city}, ${country}`;
}
