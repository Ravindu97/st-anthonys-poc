# St. Anthony's EV Charging Network — What Was Built

This document describes the complete proof-of-concept (POC) delivered for St. Anthony's countrywide fast-charging network. It is intended for stakeholder presentations, technical handover, and as a baseline for future production development.

---

## Executive summary

The POC demonstrates all four layers of a commercial EV charging platform:

1. **EV driver interface** — web portal for finding stations, starting sessions, and viewing live charge data
2. **Hardware integration** — OCPP 1.6J protocol bridge to charge points (simulated for demo)
3. **Central management system (CMS)** — backend API for sessions, billing stub, and load balancing
4. **Admin dashboard** — operations view for fleet health, revenue, and hub utilization

The system is runnable entirely on a developer laptop using Docker, with virtual charge points standing in for physical hardware at Panadura, Colombo, and Kurunegala.

---

## System components

| Component | Location | Port | Description |
|-----------|----------|------|-------------|
| **Driver portal** | `apps/driver-web` | **3000** | Next.js web app — station map, QR/deep-link charge flow, live kW/SoC/temperature chart, session history, receipts |
| **CMS API** | `apps/api` | **3001** | Fastify REST API — authentication, session lifecycle, billing stub, hub load balancer, SSE events, offline sync |
| **OCPP 1.6J gateway** | `apps/ocpp-gateway` | **3002** | WebSocket central system — speaks OCPP 1.6J to charge points; internal HTTP for remote start/stop and charging profiles |
| **Admin dashboard** | `apps/admin-web` | **3003** | Next.js ops console — network overview, charge point fleet, session log, hub load view, remote reset |
| **Charge point simulator** | `tools/charge-point-simulator` | — | Four virtual OCPP clients (`SA-PAN-01`, `SA-CMB-01`, `SA-CMB-02`, `SA-KUR-01`) with realistic SoC curves |
| **Database** | PostgreSQL (Docker) | **5433** | Persistent storage for users, sites, sessions, meter values, transactions |
| **Redis** | Docker | **6379** | Pub/sub for real-time session and fleet updates to frontends |

### Supporting packages

| Package | Location | Purpose |
|---------|----------|---------|
| Database / Prisma | `packages/database` | Schema, migrations, seed data |
| Shared types | `packages/shared` | Zod schemas, constants, Sri Lanka site definitions |
| OCPP messages | `packages/ocpp-messages` | OCPP 1.6J wire format helpers; OCPP 2.0.1 adapter stub |

---

## Architecture overview

```
┌─────────────────────┐     ┌─────────────────────┐
│   Driver Portal     │     │   Admin Dashboard   │
│   Next.js :3000     │     │   Next.js :3003     │
└──────────┬──────────┘     └──────────┬──────────┘
           │ REST + SSE                │ REST + SSE
           ▼                           ▼
┌──────────────────────────────────────────────────────┐
│              CMS API (Fastify) :3001                 │
│  Auth · Sessions · Billing · Load balancer · SSE     │
└──────────┬─────────────────────────┬─────────────────┘
           │ HTTP (internal)          │
           ▼                          ▼
┌─────────────────────┐     ┌─────────────────────────┐
│ OCPP Gateway :3002  │     │ PostgreSQL :5433        │
│ WebSocket OCPP 1.6J │     │ Redis :6379             │
└──────────┬──────────┘     └─────────────────────────┘
           │ ws://host/ocpp/{chargePointId}
           ▼
┌─────────────────────┐
│ Charge Points       │
│ (Simulator / future │
│  physical hardware) │
└─────────────────────┘
```

---

## Features delivered

### OCPP 1.6J protocol (charge point ↔ central system)

| OCPP message | Purpose in POC |
|--------------|----------------|
| `BootNotification` | Register charge point on connect; set fleet status |
| `Heartbeat` | Liveness; mark offline after timeout |
| `StatusNotification` | Connector Available / Occupied / Faulted |
| `Authorize` | idTag validation stub |
| `StartTransaction` / `StopTransaction` | Session boundaries tied to CMS sessions |
| `MeterValues` | Real-time power (kW), energy (kWh), SoC (%), battery temperature (°C) |
| `RemoteStartTransaction` / `RemoteStopTransaction` | Driver-initiated control from CMS API |
| `SetChargingProfile` | Hub load balancing — dynamic kW cap per connector |
| `Reset` | Admin remote reset (Soft/Hard) for troubleshooting demo |

**Future path:** OCPP 2.0.1 mapping documented in [OCPP_2_MIGRATION.md](OCPP_2_MIGRATION.md); adapter interface in `packages/ocpp-messages/src/v2-stub.ts`.

### End-to-end user journey

| Step | Driver experience | Backend behavior |
|------|-------------------|------------------|
| 1. **Authentication** | Register / sign in; QR opens `/charge/{connectorId}` | JWT issued; user linked to connector |
| 2. **Handshake** | Tap **Start charging**; mock payment confirmed | `RemoteStartTransaction` sent; session `pending` → `active` |
| 3. **Active session** | Live kW, SoC %, temperature, cost estimate, chart | `MeterValues` every 5s; SSE pushes updates to UI |
| 4. **Termination** | Tap **Stop** or auto-stop at 95% SoC | `RemoteStopTransaction` / `StopTransaction` |
| 5. **Settlement** | Receipt with kWh, LKR total, mock payment | `energyKwh × LKR 85/kWh`; receipt JSON stored |

Full flow detail: [USER_JOURNEY.md](USER_JOURNEY.md).

### Load balancing

- Each site has a **Hub** with a shared `maxHubKw` budget.
- **Colombo Fort** hub: **300 kW** shared across `SA-CMB-01` and `SA-CMB-02`.
- When multiple vehicles charge simultaneously, the API **fair-shares** hub capacity and sends **`SetChargingProfile`** to each charge point.
- Driver UI shows **allocated kW**; Admin **Hub Load** page shows utilization bar per site.

### Offline functionality

- If the WebSocket to the OCPP gateway drops mid-session, the **simulator buffers** meter readings locally (`tools/charge-point-simulator/offline-queue.json`).
- On reconnect, buffered data is posted to **`POST /internal/offline-sync`** (idempotent by `offlineSessionId`).
- Admin **Sessions** table and driver receipts show an **Offline sync** badge.

### Driver portal (`apps/driver-web`)

- Interactive **map** of seeded sites (Leaflet + OpenStreetMap)
- Station list with connector status and tariff (LKR/kWh)
- **Charge page** per connector with start/stop controls
- **Live session card** — kW, SoC, battery temp, energy, allocated power
- **Recharts** line chart for power and SoC over time
- **History** and **receipt** pages
- St. Anthony's branding (navy + green palette)

### Admin dashboard (`apps/admin-web`)

- **Network overview** — online/offline counts, active sessions, today's kWh and revenue (stub)
- **Charge points** — fleet table with heartbeat, status, **Remote Reset**
- **Sessions** — log with CSV export; offline-sync indicator
- **Hub load** — per-site utilization bars and active session count

### CMS API (`apps/api`) — key endpoints

| Area | Endpoints |
|------|-----------|
| Auth | `POST /auth/register`, `POST /auth/login` |
| Sites | `GET /sites`, `GET /connectors/:id` |
| Sessions | `POST /sessions/start`, `POST /sessions/:id/stop`, `GET /sessions/active`, `GET /sessions/history`, `GET /sessions/:id` |
| Admin | `GET /admin/overview`, `GET /admin/charge-points`, `GET /admin/sessions`, `GET /admin/hubs`, `POST /admin/charge-points/:ocppId/reset` |
| Realtime | `GET /events` (SSE) |
| Internal | `POST /internal/offline-sync` |

### Seeded network (Sri Lanka)

| Site | City | OCPP ID(s) | Hardware model | Hub max kW | Connectors |
|------|------|------------|----------------|------------|------------|
| Panadura Highway Hub | Panadura | SA-PAN-01 | ABB Terra 184 (150 kW) | 200 | 2 |
| Colombo Fort Depot | Colombo | SA-CMB-01, SA-CMB-02 | Delta HPC350 (175 kW each) | **300 shared** | 4 (2 per unit) |
| Kurunegala Transit Stop | Kurunegala | SA-KUR-01 | Tritium PK350 (150 kW) | 150 | 2 |

**Totals:** 3 sites · 4 charge points · 6 connectors · **LKR 85/kWh** tariff

Organization name in seed data: **St. Anthony's Energy**

---

## Demo accounts

| Role | Email | Password | Application |
|------|-------|----------|-------------|
| **Driver** | `driver@demo.lk` | `demo1234` | http://localhost:3000 |
| **Admin** | `admin@stanthonys.lk` | `admin1234` | http://localhost:3003 |

---

## How to run locally

### Prerequisites

- Node.js **20+**
- **pnpm** 9.x
- **Docker** (for PostgreSQL and Redis)

### Setup and start

```bash
cd /Users/ravindufernando/Documents/St-Anthonys-POC

# 1. Start infrastructure
docker compose up -d

# 2. Install dependencies
pnpm install

# 3. Environment and database
cp .env.example .env && cp .env packages/database/.env
pnpm db:generate && pnpm db:migrate && pnpm db:seed

# 4. Start all services (recommended)
./scripts/start-dev.sh
```

### Application URLs

| Application | URL |
|-------------|-----|
| **Driver portal** | http://localhost:3000 |
| **Admin dashboard** | http://localhost:3003 |
| CMS API | http://localhost:3001 |
| OCPP gateway | http://localhost:3002 |

Health checks:

```bash
curl http://localhost:3001/health   # {"status":"ok","service":"cms-api"}
curl http://localhost:3002/health   # {"status":"ok","service":"ocpp-gateway"}
```

> **Important:** PostgreSQL runs on host port **5433** (not 5432) to avoid conflicting with a local PostgreSQL installation.

### Alternative: run services separately

See [LOCAL_DEVELOPMENT.md](LOCAL_DEVELOPMENT.md) for per-terminal startup order, environment variables, and troubleshooting.

---

## Presentation demo flow (5–10 minutes)

Use `./scripts/start-dev.sh` so services start in the correct order without dev-tool restarts interrupting OCPP WebSocket connections.

| # | Action | What stakeholders see |
|---|--------|------------------------|
| 1 | Open **Admin** → sign in | Network overview; after ~10s simulators connect, charge points turn **Available** |
| 2 | Open **Driver** → sign in → pick **Colombo Fort** connector | Station detail, tariff, connector status |
| 3 | Tap **Start charging** | Session goes active; live **kW**, **SoC %**, **temperature** update every 5 seconds; chart builds |
| 4 | Open Admin → **Sessions** (parallel window) | Same session visible in operations log |
| 5 | Start a **second session** on another Colombo gun | Admin → **Hub Load**: utilization bar rises; both drivers see **allocated kW** capped (300 kW shared) |
| 6 | *(Optional)* Stop simulator during active charge, restart | Session completes offline; **Offline sync** badge after reconnect |
| 7 | Driver → **Stop charging** | Receipt: kWh delivered, **LKR** total at 85/kWh, mock Visa payment |
| 8 | Admin → **Sessions** → **Export CSV** | Operational reporting stub |

**Talking points:**

- OCPP 1.6J is the industry standard between chargers and central systems — ready for real ABB/Delta/Tritium hardware.
- Hub load balancing protects grid infrastructure when multiple vehicles charge at one depot.
- Offline sync ensures revenue and session data are not lost at remote sites with unreliable connectivity.
- Same API powers web today; native mobile apps are a documented future enhancement.

---

## Documentation index

| Document | Contents |
|----------|----------|
| [WHAT_WAS_BUILT.md](WHAT_WAS_BUILT.md) | This document — deliverables overview |
| [LOCAL_DEVELOPMENT.md](LOCAL_DEVELOPMENT.md) | Detailed local setup, env vars, troubleshooting |
| [ARCHITECTURE.md](ARCHITECTURE.md) | System design and data flows |
| [USER_JOURNEY.md](USER_JOURNEY.md) | Charging lifecycle step-by-step |
| [OCPP_2_MIGRATION.md](OCPP_2_MIGRATION.md) | Upgrade path to OCPP 2.0.1 |
| [README.md](../README.md) | Quick start and links |

---

## Technology stack

| Layer | Technology |
|-------|------------|
| Monorepo | pnpm workspaces + Turborepo |
| Language | TypeScript |
| Driver / Admin UI | Next.js 15, React 19, Tailwind (CSS variables) |
| API | Fastify 5 |
| OCPP | 1.6J JSON over WebSocket (`ws`) |
| ORM | Prisma 6 + PostgreSQL 16 |
| Realtime | Redis pub/sub + Server-Sent Events |
| Maps | Leaflet + OpenStreetMap |
| Charts | Recharts |
| Auth | JWT (jose) |
| Infrastructure | Docker Compose |

---

## Future enhancements (out of POC scope)

Documented for roadmap discussions — not implemented in this release:

- Native **iOS / Android** apps (same CMS API)
- **OCPP 2.0.1** full implementation + ISO 15118 plug-and-charge
- Real payment gateway (**PayHere** / Stripe)
- **RFID** fleet cards for commercial fleets
- **Dynamic pricing** by time-of-day
- **SMS** alerts and maintenance work orders
- **Multi-tenant** operators / franchise model
- Integration with St. Anthony's existing **distribution / ERP** systems
- Production hosting, monitoring, and OCTT certification

---

## Repository layout

```
St-Anthonys-POC/
├── apps/
│   ├── driver-web/          # Driver portal (3000)
│   ├── admin-web/           # Admin dashboard (3003)
│   ├── api/                 # CMS API (3001)
│   └── ocpp-gateway/        # OCPP 1.6J gateway (3002)
├── packages/
│   ├── database/            # Prisma schema, migrations, seed
│   ├── shared/              # Types, constants, seed site data
│   └── ocpp-messages/       # OCPP 1.6J + 2.0.1 stub
├── tools/
│   └── charge-point-simulator/
├── docs/                    # Architecture, journeys, this document
├── scripts/
│   └── start-dev.sh         # One-command local startup
├── docker-compose.yml
├── .env.example
└── README.md
```

---

*POC built for St. Anthony's Energy — demonstrating a scalable software backbone for a countrywide fast-charging network across key transit routes in Sri Lanka.*
