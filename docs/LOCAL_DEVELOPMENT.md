# Local Development Guide

Complete instructions for running the St. Anthony's EV Charging POC on your machine.

## Prerequisites

| Tool | Version | Notes |
|------|---------|-------|
| **Docker Desktop** | Recent | Runs the **entire** stack (recommended) |
| **Node.js** | 20+ | Optional — only if developing apps outside Docker |
| **pnpm** | 9.x | Optional — host installs / IDE tooling |
| **Git** | Any | Clone the repository |

Optional but useful:

- **curl** — smoke-test API endpoints
- A modern browser — Chrome, Firefox, or Safari

## Repository structure

```
St-Anthonys-POC/
├── apps/
│   ├── driver-web/       # Driver portal (Next.js) — port 3000
│   ├── admin-web/        # Admin dashboard (Next.js) — port 3003
│   ├── api/              # CMS REST API (Fastify) — port 3001
│   └── ocpp-gateway/     # OCPP 1.6J central system — port 3002
├── packages/
│   ├── database/         # Prisma schema, migrations, seed
│   ├── shared/           # Shared types and constants
│   └── ocpp-messages/    # OCPP message helpers
├── tools/
│   └── charge-point-simulator/   # Virtual charge points (OCPP clients)
├── scripts/
│   ├── start-dev.sh      # Alias for docker compose up --build
│   └── docker-migrate.sh # Migrations + seed (run inside compose)
├── docker-compose.yml    # Full stack: DB, API, OCPP, simulators, web UIs
└── .env                  # Optional on host (compose sets service URLs)
```

## First-time setup (Docker Compose)

**Docker Desktop must be running** (whale icon in the menu bar on Mac).

```bash
cd /path/to/St-Anthonys-POC
docker compose up --build
```

This single command:

1. Starts **PostgreSQL** and **Redis**
2. Runs **migrations** and **seed** (one-shot `migrate` service)
3. Starts **CMS API**, **OCPP gateway**, **charge point simulators**
4. Starts **Driver** (3000) and **Admin** (3003) web apps

First build can take several minutes. When logs show Next.js **Ready**, open:

| App | URL |
|-----|-----|
| Driver | http://localhost:3000 |
| Admin | http://localhost:3003 |
| API health | http://localhost:3001/health |

Stop everything:

```bash
docker compose down
```

Reset database:

```bash
docker compose down -v
docker compose up --build
```

> **Why port 5433?** Postgres maps host **5433** → container 5432 so it does not clash with a local PostgreSQL on 5432. Inside Docker, apps use `postgres:5432`.

### Optional: host-only development

If you prefer running Node apps on the host (faster hot reload) with only DB in Docker:

```bash
pnpm install
cp .env.example .env && cp .env packages/database/.env
./scripts/ensure-db.sh
pnpm --filter @st-anthonys/api dev
# … start other apps in separate terminals
```

### Configure environment (host dev only)

```bash
cp .env.example .env
cp .env packages/database/.env
```

Prisma CLI reads `.env` from `packages/database/` when running migrations and seed. The root `.env` is used by the API, OCPP gateway, and Next.js apps.

### 4. Initialize the database

```bash
pnpm db:generate    # Generate Prisma client
pnpm db:migrate     # Apply migrations
pnpm db:seed        # Seed sites, charge points, demo users
```

**One-liner** (install + DB setup):

```bash
pnpm setup
```

Note: `pnpm setup` copies `.env.example` → `.env` only if `.env` does not exist. You still need Docker running first.

### 5. Build shared packages (if seed fails)

If seed reports a missing `@st-anthonys/shared` module:

```bash
pnpm --filter @st-anthonys/shared build
pnpm --filter @st-anthonys/ocpp-messages build
pnpm db:seed
```

## Environment variables

| Variable | Default | Used by |
|----------|---------|---------|
| `DATABASE_URL` | `postgresql://stanthonys:stanthonys@localhost:5433/stanthonys` | API, OCPP gateway, Prisma |
| `REDIS_URL` | `redis://localhost:6379` | API, OCPP gateway (SSE pub/sub) |
| `JWT_SECRET` | (change in prod) | API auth tokens |
| `OCPP_GATEWAY_URL` | `http://localhost:3002` | API → OCPP internal HTTP |
| `OCPP_GATEWAY_WS` | `ws://localhost:3002` | Charge point simulator |
| `API_URL` | `http://localhost:3001` | Simulator offline sync |
| `NEXT_PUBLIC_API_URL` | `http://localhost:3001` | Driver + Admin frontends |
| `DRIVER_WEB_URL` | `http://localhost:3000` | QR code links in API |
| `ADMIN_WEB_URL` | `http://localhost:3003` | Reference only |

Optional overrides:

| Variable | Default | Description |
|----------|---------|-------------|
| `API_PORT` | `3001` | CMS API listen port |
| `OCPP_GATEWAY_PORT` | `3002` | OCPP gateway listen port |
| `SIM_CHARGE_POINTS` | `SA-PAN-01,SA-CMB-01,SA-CMB-02,SA-KUR-01` | Comma-separated OCPP IDs for simulator |

## Running the POC

### Option A — All services (recommended)

```bash
./scripts/start-dev.sh
```

This starts, in order:

1. OCPP gateway (port 3002)
2. CMS API (port 3001)
3. Charge point simulators (4 virtual stations)
4. Driver web (port 3000)
5. Admin web (port 3003)

Press **Ctrl+C** in that terminal to stop all processes.

### Option B — Separate terminals

Use this when debugging a single service. **Start in this order** — later services depend on earlier ones.

**Terminal 1 — OCPP gateway**

```bash
export $(grep -v '^#' .env | xargs)
pnpm --filter @st-anthonys/ocpp-gateway dev
```

**Terminal 2 — CMS API**

```bash
export $(grep -v '^#' .env | xargs)
pnpm --filter @st-anthonys/api dev
```

**Terminal 3 — Charge point simulators**

```bash
export $(grep -v '^#' .env | xargs)
pnpm simulator:start
```

Wait until you see `[SA-XXX-XX] Connected` for each station.

**Terminal 4 — Driver portal**

```bash
pnpm --filter @st-anthonys/driver-web dev
```

**Terminal 5 — Admin dashboard**

```bash
pnpm --filter @st-anthonys/admin-web dev
```

### Option C — Turbo (parallel dev)

```bash
export $(grep -v '^#' .env | xargs)
pnpm dev
```

Then start simulators in another terminal:

```bash
pnpm simulator:start
```

> Turbo runs all `dev` scripts in parallel. You must still start the simulator separately — it is not part of `turbo dev`.

## URLs and health checks

| Service | URL | Health / smoke test |
|---------|-----|---------------------|
| Driver portal | http://localhost:3000 | Open in browser |
| CMS API | http://localhost:3001 | `curl http://localhost:3001/health` |
| OCPP gateway | http://localhost:3002 | `curl http://localhost:3002/health` |
| Admin dashboard | http://localhost:3003 | Open in browser |
| PostgreSQL | `localhost:5433` | `docker compose exec postgres pg_isready -U stanthonys` |
| Redis | `localhost:6379` | `docker compose exec redis redis-cli ping` |

Example API checks:

```bash
# List seeded sites and connectors
curl -s http://localhost:3001/sites | python3 -m json.tool

# Driver login
curl -s -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"driver@demo.lk","password":"demo1234"}'
```

## Demo accounts

| Role | Email | Password | App |
|------|-------|----------|-----|
| Driver | `driver@demo.lk` | `demo1234` | http://localhost:3000 |
| Admin | `admin@stanthonys.lk` | `admin1234` | http://localhost:3003 |

## Typical local workflow

1. Ensure Docker is running: `docker compose up -d`
2. Start the stack: `./scripts/start-dev.sh`
3. Open **Admin** → sign in → confirm charge points show **Available** (not Offline)
4. Open **Driver** → sign in → select a connector → **Start charging**
5. Watch live kW / SoC on the driver screen; open Admin **Sessions** or **Hub Load** in parallel
6. **Stop charging** → view receipt

### QR / deep-link flow

Each connector has a URL like:

```
http://localhost:3000/charge/{connectorId}
```

The API exposes the same link as `qrUrl` on each connector in `GET /sites`. In the driver UI, click **Gun 1** / **Gun 2** on a station card to open the charge page.

### Load-balancing demo

1. Start a session on **SA-CMB-01** Gun 1 (Colombo)
2. Start another session on **SA-CMB-02** Gun 1 (same 300 kW hub)
3. Open Admin → **Hub Load** — both sessions share hub capacity; driver UI shows reduced **allocated kW**

### Offline sync demo

1. Start a charging session
2. Stop only the simulator process (`Ctrl+C` in simulator terminal) while a session is active
3. Simulator buffers meter data locally (`tools/charge-point-simulator/offline-queue.json`)
4. Restart: `pnpm simulator:start`
5. On reconnect, data syncs to the API; Admin **Sessions** shows **Offline sync** = Yes

## Seeded network data

| Site | OCPP ID(s) | Hub max kW |
|------|------------|------------|
| Panadura Highway Hub | SA-PAN-01 | 200 |
| Colombo Fort Depot | SA-CMB-01, SA-CMB-02 | 300 (shared) |
| Kurunegala Transit Stop | SA-KUR-01 | 150 |

Tariff: **LKR 85/kWh** (mock billing).

## Stopping services

| Method | Command |
|--------|---------|
| **Recommended** | `./scripts/stop-dev.sh` or `pnpm dev:stop` |
| `start-dev.sh` | `Ctrl+C` in the script terminal (also runs stop on exit) |
| Individual processes | `Ctrl+C` per terminal |
| Docker only | `docker compose down` |

### Docker Desktop — "Lingering processes detected"

**Cause:** A previous Docker Desktop session did not shut down cleanly. The old process (e.g. `pid 27795: Docker Desktop`) blocks the daemon — `docker compose` then fails with `Cannot connect to the Docker daemon`.

**Important:** `./scripts/stop-dev.sh` only stops the **Node/Next apps** on ports 3000–3003. It does **not** quit Docker Desktop. That is intentional.

#### Permanent fix (recommended)

Use the PID from the Docker dialog (e.g. `27795`):

```bash
./scripts/docker-reset.sh 27795
```

This script will:

1. Stop POC apps and free ports  
2. Run `docker compose down` (if possible)  
3. Quit Docker Desktop and kill lingering processes  
4. Re-open Docker Desktop and wait for the daemon  
5. Start Postgres/Redis and run `./scripts/start-dev.sh`

#### Manual steps (same result)

```bash
# Option A — dialog button
# Click "Stop processes" in the Docker dialog, then:
open -a Docker
./scripts/start-dev.sh

# Option B — helper script
./scripts/fix-docker.sh 27795    # use your PID
open -a Docker
# wait for whale icon = running
./scripts/start-dev.sh
```

#### Stop compose containers without killing Docker Desktop

```bash
./scripts/stop-dev.sh --compose
```

**Prevent it:** Avoid force-quitting Docker while containers run. Use `./scripts/stop-dev.sh` before closing the laptop; use `./scripts/docker-reset.sh` when Docker gets stuck.

Wait until the whale icon shows **Docker Desktop is running**, then:

```bash
cd /Users/ravindufernando/Documents/St-Anthonys-POC
docker compose up -d
./scripts/start-dev.sh
```

### `curl /health` shows `"database":"unavailable"` (degraded)

The web stack (ports 3000–3003) is up but **Postgres is not reachable on `127.0.0.1:5433`**. The API and OCPP gateway connect via that host port; if Docker Desktop stops or Postgres never bound the port, health stays degraded even though `start-dev.sh` finished.

**Check:**

```bash
docker info                    # must succeed
nc -z 127.0.0.1 5433 && echo ok || echo closed
curl -s http://localhost:3001/health
```

**Fix:** keep Docker Desktop running, then:

```bash
./scripts/ensure-db.sh
./scripts/stop-dev.sh
./scripts/start-dev.sh
```

`start-dev.sh` now verifies host port **5433** before starting apps and prints a warning if `/health` is still degraded.

### Login shows "Database unavailable"

The API is running but **PostgreSQL is not**. Usually Docker is stopped or containers were never started.

```bash
# If Docker is stuck:
./scripts/docker-reset.sh

# If Docker is running:
./scripts/ensure-db.sh
./scripts/stop-dev.sh
./scripts/start-dev.sh
```

Verify:

```bash
curl http://localhost:3001/health
# expect: "database":"connected"
```

### `[ioredis] ECONNREFUSED` or `Can't reach database server at localhost:5433`

**Cause:** Apps started before Docker containers were fully ready (`health: starting`), or Docker was not running.

**Fix:**

1. Stop everything: `./scripts/stop-dev.sh`
2. Open **Docker Desktop** and wait until it is fully started.
3. Run **only**:
   ```bash
   ./scripts/start-dev.sh
   ```
   The script waits for Postgres + Redis before launching apps.

4. Confirm health:
   ```bash
   docker compose ps    # both should show "(healthy)"
   docker compose exec redis redis-cli ping   # PONG
   ```

### `ERROR: OCPP gateway did not start on port 3002`

Check the log file printed by the script (usually `/tmp/st-anthonys-poc/ocpp-gateway.log`):

```bash
tail -30 /tmp/st-anthonys-poc/ocpp-gateway.log
```

Common causes: Docker not fully ready, or a stale process on port 3002. Fix:

```bash
./scripts/stop-dev.sh
docker compose ps   # postgres + redis must be healthy
./scripts/start-dev.sh
```

### `EADDRINUSE` (port already in use)

This means a previous dev session is still running. Fix:

```bash
./scripts/stop-dev.sh
./scripts/start-dev.sh
```

`start-dev.sh` now runs `stop-dev.sh` automatically before starting.

## Resetting the database

To wipe data and re-seed:

```bash
docker compose down -v          # removes postgres volume
docker compose up -d
pnpm db:migrate
pnpm db:seed
```

Or re-run seed only (clears and re-inserts demo data):

```bash
export $(grep -v '^#' .env | xargs)
cd packages/database && pnpm seed
```

## Admin dashboard API

All routes require `Authorization: Bearer <admin_jwt>` from `POST /auth/login` (role `ADMIN`).

### List endpoints (pagination, filters, sort)

| Route | Query params |
|-------|----------------|
| `GET /admin/sessions` | `page`, `pageSize` (max 100), `status`, `siteId`, `city`, `search`, `from`, `to`, `offlineOnly`, `sortBy`, `sortOrder` |
| `GET /admin/charge-points` | `page`, `pageSize`, `status`, `siteId`, `city`, `search`, `staleOnly`, `sortBy`, `sortOrder` |
| `GET /admin/hubs` | `city`, `minUtilization`, `sortBy`, `sortOrder` |
| `GET /admin/sites` | _(none)_ — filter dropdown options |

Paginated responses: `{ items, total, page, pageSize }`.

### Export & analytics

| Route | Description |
|-------|-------------|
| `GET /admin/sessions/export` | CSV with same filters as sessions list (no pagination) |
| `GET /admin/overview?from=&to=` | KPIs for date range (defaults to today) |
| `GET /admin/analytics/trends?from=&to=` | Daily kWh, revenue, session counts |
| `GET /admin/analytics/fleet?from=&to=` | Fleet snapshot by city, connector counts, offline/failed sessions |

### Admin web routes

| Path | Features |
|------|----------|
| `/` | Date-range KPIs, trend charts, fleet snapshot, hub utilization chart |
| `/sessions` | Search, filters, sort, pagination, CSV export, row → detail |
| `/sessions/[id]` | Session summary, meter-value charts, stop active session |
| `/charge-points` | Filters, stale heartbeat, pagination, connector summary, reset |
| `/hubs` | Card/table view, city & min-utilization filters, sortable utilization |

Filter state is stored in URL query params (bookmarkable).

## Building for verification

```bash
pnpm --filter @st-anthonys/shared build
pnpm --filter @st-anthonys/ocpp-messages build
pnpm --filter @st-anthonys/driver-web build
pnpm --filter @st-anthonys/admin-web build
```

Backend services run via `tsx` in dev and do not require a separate build step.

## Troubleshooting

### `pnpm: command not found`

```bash
npm install -g pnpm@9.15.0
```

### `Environment variable not found: DATABASE_URL` (Prisma)

```bash
cp .env packages/database/.env
pnpm db:migrate
```

Or run seed with env exported:

```bash
export $(grep -v '^#' .env | xargs)
cd packages/database && pnpm seed
```

### `User was denied access` / `role "stanthonys" does not exist` on migrate

Your machine likely has PostgreSQL on port **5432** while this project uses **5433**. Confirm `.env` has:

```
DATABASE_URL="postgresql://stanthonys:stanthonys@localhost:5433/stanthonys"
```

### `EADDRINUSE` on ports 3001 or 3002

A previous dev process is still running:

```bash
lsof -i :3001 -i :3002 -i :3000 -i :3003
pkill -f "ocpp-gateway|apps/api|charge-point-simulator"
```

Then start again.

### Charge points show **Offline** in Admin

1. Confirm OCPP gateway is up: `curl http://localhost:3002/health`
2. Start simulators: `pnpm simulator:start`
3. Check logs for `[SA-CMB-01] Connected`

Start order matters: **OCPP gateway → API → simulators**.

### `Could not reach charge point` when starting a session

- Simulators must be connected to the gateway (see above)
- OCPP gateway must be running before the API sends `RemoteStartTransaction`
- Retry after all four simulators log `Connected`

### `tsx watch` causes constant restarts

Dev scripts use plain `tsx` (no watch) to avoid restarts when `node_modules` changes. If you see repeated restarts, ensure you are not running an old `tsx watch` command.

### Docker Postgres not ready

Wait a few seconds after `docker compose up -d`, then:

```bash
docker compose exec postgres pg_isready -U stanthonys
```

### Frontends cannot reach API

Confirm `NEXT_PUBLIC_API_URL=http://localhost:3001` in `.env` and restart Next.js dev servers after changing `.env`.

## npm scripts reference

| Command | Description |
|---------|-------------|
| `pnpm setup` | Copy `.env`, install, generate Prisma client, migrate, seed |
| `pnpm install` | Install all workspace dependencies |
| `pnpm db:generate` | `prisma generate` |
| `pnpm db:migrate` | `prisma migrate deploy` |
| `pnpm db:seed` | Seed demo data |
| `pnpm simulator:start` | Start 4 virtual charge points |
| `pnpm dev` | Turbo: run all app `dev` scripts (simulator separate) |
| `pnpm build` | Turbo: build all packages |
| `./scripts/start-dev.sh` | Start gateway, API, simulator, both web apps |

## Related documentation

- [ARCHITECTURE.md](ARCHITECTURE.md) — system design and data flow
- [USER_JOURNEY.md](USER_JOURNEY.md) — charging lifecycle
- [OCPP_2_MIGRATION.md](OCPP_2_MIGRATION.md) — upgrade path to OCPP 2.0.1
