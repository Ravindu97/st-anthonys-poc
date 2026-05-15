export const ORG_NAME = "St. Anthony's Energy";

/** Public URL path for the St. Anthony's logo (served from each Next.js app's /public). */
export const BRAND_LOGO_PATH = "/branding/sa-logo.png";

export const DEFAULT_TARIFF_LKR_PER_KWH = 85;

export const DEFAULT_SOC_STOP_PERCENT = 95;

export const HEARTBEAT_TIMEOUT_MS = 120_000;

export const METER_VALUE_INTERVAL_MS = 5_000;

export const REDIS_CHANNELS = {
  SESSION_UPDATE: "session:update",
  CHARGE_POINT_UPDATE: "chargepoint:update",
  HUB_LOAD_UPDATE: "hub:load",
} as const;

export const SEED_SITES = [
  {
    name: "Panadura Highway Hub",
    city: "Panadura",
    address: "Colombo-Galle Road, Panadura",
    latitude: 6.7136,
    longitude: 79.9026,
    hubMaxKw: 200,
    chargePoints: [
      { ocppId: "SA-PAN-01", model: "ABB Terra 184", maxKw: 150, connectors: 2 },
    ],
  },
  {
    name: "Colombo Fort Depot",
    city: "Colombo",
    address: "Fort Railway Station Area, Colombo 01",
    latitude: 6.9344,
    longitude: 79.8428,
    hubMaxKw: 300,
    chargePoints: [
      { ocppId: "SA-CMB-01", model: "Delta HPC350", maxKw: 175, connectors: 2 },
      { ocppId: "SA-CMB-02", model: "Delta HPC350", maxKw: 175, connectors: 2 },
    ],
  },
  {
    name: "Kurunegala Transit Stop",
    city: "Kurunegala",
    address: "Kandy Road, Kurunegala",
    latitude: 7.4863,
    longitude: 80.3621,
    hubMaxKw: 150,
    chargePoints: [
      { ocppId: "SA-KUR-01", model: "Tritium PK350", maxKw: 150, connectors: 2 },
    ],
  },
] as const;
