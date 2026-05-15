#!/usr/bin/env bash
# Ensure Postgres, Redis, migrations, and seed (via Docker Compose).
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if ! docker info >/dev/null 2>&1; then
  echo "ERROR: Docker daemon is not running."
  echo "  Open Docker Desktop, then: docker compose up --build"
  exit 1
fi

docker compose up -d postgres redis

echo "Waiting for Postgres and Redis..."
for i in $(seq 1 60); do
  pg_ok=0
  redis_ok=0
  docker compose exec -T postgres pg_isready -U stanthonys >/dev/null 2>&1 && pg_ok=1
  docker compose exec -T redis redis-cli ping 2>/dev/null | grep -q PONG && redis_ok=1
  if [ "$pg_ok" = 1 ] && [ "$redis_ok" = 1 ]; then
    break
  fi
  sleep 1
done

docker compose run --rm migrate

echo ""
echo "Database ready."
echo "  Postgres: postgresql://stanthonys:stanthonys@127.0.0.1:5433/stanthonys"
echo "  Start full stack: docker compose up --build"
