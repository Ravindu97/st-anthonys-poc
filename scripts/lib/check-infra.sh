#!/usr/bin/env bash
# Shared checks: Docker daemon, Postgres/Redis reachable on host ports (what Node apps use).

check_docker() {
  docker info >/dev/null 2>&1
}

check_postgres_host() {
  local max="${1:-30}"
  local i=1
  while [ "$i" -le "$max" ]; do
    if nc -z 127.0.0.1 5433 2>/dev/null; then
      return 0
    fi
    sleep 1
    i=$((i + 1))
  done
  return 1
}

check_redis_host() {
  local max="${1:-30}"
  local i=1
  while [ "$i" -le "$max" ]; do
    if nc -z 127.0.0.1 6379 2>/dev/null; then
      return 0
    fi
    sleep 1
    i=$((i + 1))
  done
  return 1
}

# Ensure compose services are up and host ports are open (required before starting API/OCPP).
ensure_infra_host() {
  local root="${1:?root dir required}"
  if ! check_docker; then
    echo "ERROR: Docker is not running."
    echo "  Open Docker Desktop, then: ./scripts/docker-reset.sh"
    return 1
  fi
  cd "$root"
  docker compose up -d postgres redis
  if ! check_postgres_host 60; then
    echo "ERROR: Postgres is not reachable at 127.0.0.1:5433 (host port)."
    echo "  Containers:"
    docker compose ps
    echo "  Try: ./scripts/docker-reset.sh"
    return 1
  fi
  if ! check_redis_host 30; then
    echo "WARNING: Redis is not reachable at 127.0.0.1:6379 yet."
  fi
  return 0
}
