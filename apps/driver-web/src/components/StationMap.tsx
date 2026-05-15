"use client";

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import Link from "next/link";

const saIcon = L.divIcon({
  className: "sa-map-pin",
  html: `<div style="
    width:36px;height:36px;
    background:#006767;
    border-radius:8px;
    display:flex;align-items:center;justify-content:center;
    box-shadow:0 4px 12px rgba(0,103,103,0.35);
    cursor:pointer;
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
    ocppId: string;
    connectors: Array<{ id: string; connectorNum: number; status: string }>;
  }>;
};

export default function StationMap({
  sites,
  selectedSiteId,
  onSelectSite,
}: {
  sites: Site[];
  selectedSiteId?: string | null;
  onSelectSite?: (siteId: string) => void;
}) {
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
      {sites.map((site) => {
        const available = site.chargePoints.flatMap((cp) =>
          cp.connectors.filter((c) => c.status.toLowerCase() === "available")
        );
        return (
          <Marker
            key={site.id}
            position={[site.latitude, site.longitude]}
            icon={saIcon}
            eventHandlers={{
              click: () => onSelectSite?.(site.id),
            }}
          >
            <Popup>
              <div className="min-w-[180px]">
                <strong className="text-sm">{site.name}</strong>
                <p className="text-xs text-gray-600">{site.city}</p>
                {available.length > 0 ? (
                  <div className="mt-2 space-y-1">
                    <p className="text-[10px] font-semibold uppercase text-gray-500">Start charging</p>
                    {available.map((c) => (
                      <Link
                        key={c.id}
                        href={`/charge/${c.id}`}
                        className="block rounded bg-[#006767] px-2 py-1.5 text-center text-xs font-semibold text-white hover:bg-[#005555]"
                      >
                        Gun {c.connectorNum} — Start charge
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="mt-2 text-xs text-gray-500">No guns available</p>
                )}
                <button
                  type="button"
                  onClick={() => onSelectSite?.(site.id)}
                  className="mt-2 w-full text-xs text-[#006767] underline"
                >
                  View in list →
                </button>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
