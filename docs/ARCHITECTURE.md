# System Architecture

## Four nodes

```
┌─────────────────┐     ┌─────────────────┐
│  Driver Web     │     │  Admin Web      │
│  (Next.js)      │     │  (Next.js)      │
└────────┬────────┘     └────────┬────────┘
         │ REST + SSE            │ REST + SSE
         ▼                       ▼
┌────────────────────────────────────────────┐
│              CMS API (Fastify)              │
│  Auth · Sessions · Billing stub · Load bal  │
└────────┬───────────────────────┬─────────┘
         │ HTTP internal           │
         ▼                       ▼
┌─────────────────┐     ┌─────────────────┐
│ OCPP Gateway    │     │ PostgreSQL       │
│ (WebSocket)     │     │ Redis pub/sub    │
└────────┬────────┘     └─────────────────┘
         │ OCPP 1.6J
         ▼
┌─────────────────┐
│ Charge Points   │
│ (Simulator / HW)│
└─────────────────┘
```

## Data flow — active session

1. Driver scans QR → `POST /sessions/start`
2. API creates session → `POST /internal/remote-start` on OCPP gateway
3. Gateway sends `RemoteStartTransaction` to charge point
4. Charge point responds with `StartTransaction`, begins `MeterValues`
5. Gateway persists meter data, publishes to Redis
6. Driver UI receives SSE `session:update` events
7. On stop or SoC limit → `StopTransaction` → settlement stub

## Load balancing

Sites have a **Hub** with `maxHubKw`. When multiple sessions are active at one site, the API fair-shares hub capacity and sends `SetChargingProfile` to each charge point.

## Offline sync

If the WebSocket drops during charging, the simulator buffers meter readings locally. On reconnect, it POSTs to `/internal/offline-sync` for idempotent session upsert.

## Tech stack

- **Monorepo:** pnpm + Turborepo
- **OCPP:** 1.6J (JSON over WebSocket)
- **API:** Fastify + Prisma + PostgreSQL
- **Realtime:** Redis pub/sub + SSE
- **Frontends:** Next.js 15
