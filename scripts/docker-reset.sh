#!/usr/bin/env bash
# Full reset: POC apps → compose down → fix lingering Docker → start Docker → start POC
# Usage: ./scripts/docker-reset.sh [docker-pid-from-dialog]

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DOCKER_PID="${1:-}"

echo "=== St. Anthony's — full Docker + POC reset ==="
echo ""

# Step 1: Clean up lingering Docker + POC ports
if [ -n "$DOCKER_PID" ]; then
  "$ROOT/scripts/fix-docker.sh" "$DOCKER_PID"
else
  "$ROOT/scripts/fix-docker.sh"
fi

echo ""
echo "Opening Docker Desktop..."
open -a Docker 2>/dev/null || open -a "Docker Desktop" 2>/dev/null || true

echo "Waiting for Docker daemon (up to 2 minutes)..."
ready=0
for i in $(seq 1 120); do
  if docker info >/dev/null 2>&1; then
    ready=1
    break
  fi
  printf "."
  sleep 1
done
echo ""

if [ "$ready" != 1 ]; then
  echo ""
  echo "ERROR: Docker daemon did not start in time."
  echo "  - Click 'Stop processes' in the Docker dialog if it appears (PID shown there)"
  echo "  - Then run:  ./scripts/fix-docker.sh <that-pid>"
  echo "  - Open Docker Desktop manually and wait until fully running"
  echo "  - Run:  ./scripts/docker-reset.sh"
  exit 1
fi

echo "Docker is running."
echo ""
echo "Starting database containers..."
docker compose -f "$ROOT/docker-compose.yml" up -d

echo "Waiting for Postgres and Redis..."
for i in $(seq 1 60); do
  if docker compose -f "$ROOT/docker-compose.yml" exec -T postgres pg_isready -U stanthonys >/dev/null 2>&1 \
    && docker compose -f "$ROOT/docker-compose.yml" exec -T redis redis-cli ping 2>/dev/null | grep -q PONG; then
    break
  fi
  sleep 1
done

echo ""
echo "Starting POC..."
cd "$ROOT" && ./scripts/start-dev.sh
