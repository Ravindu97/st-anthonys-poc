"use client";

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

const icon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
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
  const center: [number, number] = [7.5, 80.2];

  return (
    <div className="card" style={{ height: 280, marginBottom: "1rem", padding: 0, overflow: "hidden" }}>
      <MapContainer center={center} zoom={8} style={{ height: "100%", width: "100%" }}>
        <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        {sites.map((site) => (
          <Marker key={site.id} position={[site.latitude, site.longitude]} icon={icon}>
            <Popup>
              <strong>{site.name}</strong>
              <br />
              {site.city}
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
