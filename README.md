# St. Anthony's EV Charging Network — POC

Demo-ready proof of concept for a countrywide fast-charging network with OCPP 1.6J, driver portal, CMS API, and admin dashboard.

## Run locally

**Full guide:** [docs/LOCAL_DEVELOPMENT.md](docs/LOCAL_DEVELOPMENT.md)

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (runs the entire stack)

Optional for local-only development without Docker apps:

- Node.js 20+ and pnpm 9.x

### Quick start (Docker Compose)

```bash
# One command — Postgres, Redis, migrations, API, OCPP, simulators, Driver + Admin UIs
docker compose up --build
```

Or:

```bash
pnpm dev
```

First build takes a few minutes. When you see **driver-web** and **admin-web** ready, open the URLs below.

Stop the stack:

```bash
docker compose down
# or
pnpm dev:stop
```

Wipe the database and start fresh:

```bash
docker compose down -v
docker compose up --build
```

### URLs

| App | URL |
|-----|-----|
| Driver portal | http://localhost:3000 |
| CMS API | http://localhost:3001 |
| OCPP gateway | http://localhost:3002 |
| Admin dashboard | http://localhost:3003 |

Health: `curl http://localhost:3001/health` → `"database":"connected"`

Postgres (optional host access): `127.0.0.1:5433`

## Demo accounts

| Role | Email | Password |
|------|-------|----------|
| Driver | driver@demo.lk | demo1234 |
| Admin | admin@stanthonys.lk | admin1234 |

## Architecture

| Service | Port | Description |
|---------|------|-------------|
| Driver web | 3000 | EV driver portal (map, QR charge, live session) |
| CMS API | 3001 | REST API, auth, sessions, billing stub |
| OCPP gateway | 3002 | OCPP 1.6J central system (WebSocket) |
| Admin web | 3003 | Operations dashboard |
| PostgreSQL | 5433 | Primary datastore (Docker) |
| Redis | 6379 | Pub/sub for live UI updates |

Inside Docker, services talk over the compose network (`postgres`, `redis`, `api`, `ocpp-gateway`). Your browser uses `localhost` ports above.

## 5-minute demo script

1. Open **Admin** (http://localhost:3003) → sign in → verify 4 charge points are **Available** after simulators connect.
2. Open **Driver** (http://localhost:3000) → sign in → pick a connector at Colombo Fort.
3. Start charging → watch live kW, SoC %, and temperature update.
4. Open Admin **Sessions** and **Hub Load** in parallel to show the same session.
5. Start a second session on another Colombo gun → hub load bar shows power capped (fair-share).
6. Stop simulator briefly during a session → restart → session syncs with **Offline sync** badge.
7. Stop charge → view receipt.

## Seeded locations

- **Panadura** — SA-PAN-01 (200 kW hub)
- **Colombo Fort** — SA-CMB-01, SA-CMB-02 (300 kW shared hub)
- **Kurunegala** — SA-KUR-01 (150 kW hub)

## Documentation

- [docs/WHAT_WAS_BUILT.md](docs/WHAT_WAS_BUILT.md) — **full deliverables overview** (components, features, demo flow)
- [docs/LOCAL_DEVELOPMENT.md](docs/LOCAL_DEVELOPMENT.md) — **how to run locally** (setup, env, troubleshooting)
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — system design
- [docs/USER_JOURNEY.md](docs/USER_JOURNEY.md) — charging flow
- [docs/OCPP_2_MIGRATION.md](docs/OCPP_2_MIGRATION.md) — path to OCPP 2.0.1

## Future enhancements

- Native mobile apps
- OCPP 2.0.1 + ISO 15118 plug-and-charge
- PayHere / Stripe payments
- RFID fleet cards
- Dynamic pricing, SMS alerts, ERP integration
