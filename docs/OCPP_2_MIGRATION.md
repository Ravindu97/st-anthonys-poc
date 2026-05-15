# OCPP 2.0.1 Migration Path

This POC implements **OCPP 1.6J**. The `packages/ocpp-messages/src/v2-stub.ts` file defines an adapter interface for a future 2.0.1 implementation.

## Message mapping

| OCPP 1.6J (POC) | OCPP 2.0.1 (target) |
|-----------------|---------------------|
| BootNotification | BootNotification (extended) |
| StartTransaction | TransactionEvent (Started) |
| StopTransaction | TransactionEvent (Ended) |
| MeterValues | TransactionEvent (Updated) + MeterValue |
| RemoteStartTransaction | RequestStartTransaction |
| RemoteStopTransaction | RequestStopTransaction |
| SetChargingProfile | SetChargingProfile (enhanced) |
| Reset | Reset |

## Recommended migration steps

1. **Dual-stack gateway** — route by protocol version negotiated at WebSocket handshake
2. **Unified session model** — map `transactionId` (1.6) to `transactionInfo.transactionId` (2.0.1)
3. **Security** — add certificate-based authentication required by 2.0.1
4. **ISO 15118** — separate module for plug-and-charge (not in 1.6J)
5. **Certification** — OCTT test tool for 2.0.1 compliance before production hardware

## POC scope boundary

OCPP 2.0.1 is **documented only** in this release. Production rollout should budget 4–8 weeks for gateway refactor and hardware certification per charge point vendor.
