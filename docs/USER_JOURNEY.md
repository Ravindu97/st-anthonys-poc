# User Journey — Charging Process

## 1. Authentication

- Driver registers or signs in at `/login`
- QR code on charger links to `/charge/{connectorId}`
- JWT stored in browser localStorage

## 2. Handshake

- Driver taps **Start charging**
- API verifies connector is available and charge point is online
- Payment method confirmed (mock Visa stub in POC)
- API sends `RemoteStartTransaction` via OCPP gateway
- Session status: `pending` → `active`

## 3. Active session

- Charge point sends `MeterValues` every 5 seconds:
  - Power (kW)
  - Energy (kWh)
  - State of Charge (%)
  - Battery temperature (°C)
- Driver UI shows live stats and chart
- Hub load balancer may cap `allocatedKw` when multiple vehicles charge

## 4. Termination

Session ends when:

- Driver taps **Stop charging**
- SoC reaches 95% (configurable)
- Charging curve taper completes (simulator)
- Admin sends remote reset

## 5. Settlement

- Total kWh × tariff (LKR 85/kWh in POC)
- Mock payment processed
- Receipt available at `/receipt/{sessionId}`

## Admin parallel journey

- Monitor fleet online/offline status
- View active sessions and hub utilization
- Export session CSV
- Remote reset faulted charge points
