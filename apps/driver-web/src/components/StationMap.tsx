"use client";

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

const saIcon = L.divIcon({
  className: "sa-map-pin",
  html: `<div style="
    width:36px;height:36px;
    background:#006767;
    border-radius:8px;
    display:flex;align-items:center;justify-content:center;
    box-shadow:0 4px 12px rgba(0,103,103,0.35);
  "><svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M13 2L4 14h7l-1 8 10-14h-7l0-6z" fill="#FFC400"/></svg></div>`,
  iconSize: [36, 36],
  iconAnchor: [18, 36],
  popupAnchor: [0, -36],
});

type Site = {
  id: string;
  name: string;
  city: string;
  latitude: number;
  longitude: number;
  chargePoints: Array<{
    connectors: Array<{ id: string; connectorNum: number; status: string }>;
  }>;
};

export default function StationMap({ sites }: { sites: Site[] }) {
  const center: [number, number] =
    sites.length > 0 ? [sites[0].latitude, sites[0].longitude] : [7.5, 80.2];

  return (
    <MapContainer
      center={center}
      zoom={sites.length === 1 ? 12 : 8}
      style={{ height: "100%", width: "100%", minHeight: 480 }}
      className="z-0"
    >
      <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      {sites.map((site) => (
        <Marker key={site.id} position={[site.latitude, site.longitude]} icon={saIcon}>
          <Popup>
            <strong>{site.name}</strong>
            <br />
            {site.city}
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
