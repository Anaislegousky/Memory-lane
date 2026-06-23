import { useEffect } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Link } from "@tanstack/react-router";

// Fallback pin icon (no thumbnail)
const fallbackIcon = L.icon({
  iconUrl: "https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

function thumbIcon(url: string) {
  return L.divIcon({
    className: "memories-thumb-pin",
    html: `<div style="
      width:54px;height:54px;border-radius:9999px;overflow:hidden;
      border:3px solid #fff;box-shadow:0 4px 12px rgba(0,0,0,.25);
      background:#eee;
    "><img src="${url}" style="width:100%;height:100%;object-fit:cover;display:block" alt=""/></div>`,
    iconSize: [54, 54],
    iconAnchor: [27, 27],
    popupAnchor: [0, -28],
  });
}

type Pin = { id: string; name: string; lat: number; lng: number; thumb?: string | null };

function Fit({ pins }: { pins: Pin[] }) {
  const map = useMap();
  useEffect(() => {
    if (!pins.length) return;
    const bounds = L.latLngBounds(pins.map((p) => [p.lat, p.lng] as [number, number]));
    map.fitBounds(bounds.pad(0.3), { maxZoom: 13 });
  }, [pins, map]);
  return null;
}

export default function EventMap({ pins }: { pins: Pin[] }) {
  const center: [number, number] = pins[0] ? [pins[0].lat, pins[0].lng] : [48.8566, 2.3522];
  return (
    <MapContainer center={center} zoom={5} className="h-full w-full" scrollWheelZoom>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {pins.map((p) => (
        <Marker
          key={p.id}
          position={[p.lat, p.lng]}
          icon={p.thumb ? thumbIcon(p.thumb) : fallbackIcon}
        >
          <Popup>
            <Link to="/events/$id" params={{ id: p.id }} className="font-medium">
              {p.name}
            </Link>
          </Popup>
        </Marker>
      ))}
      <Fit pins={pins} />
    </MapContainer>
  );
}
