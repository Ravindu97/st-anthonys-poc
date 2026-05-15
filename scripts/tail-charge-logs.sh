#!/usr/bin/env bash
# Follow logs for the charge-start flow (API → OCPP → simulator).
# Usage: ./scripts/tail-charge-logs.sh
docker compose logs -f api ocpp-gateway simulator 2>&1 | grep -E --line-buffered \
  '\[sessions\]|\[api→ocpp\]|\[ocpp-gateway\]|\[ocpp\]|SA-PAN|SA-CMB|SA-KUR|RemoteStart|StartTransaction|remote-start|Connected|Disconnected|not connected'
