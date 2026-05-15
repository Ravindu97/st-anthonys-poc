#!/usr/bin/env bash
# Start the full POC via Docker Compose (replaces the old shell-orchestrated flow).
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [ ! -f .env ]; then
  cp .env.example .env
  cp .env packages/database/.env 2>/dev/null || true
fi

if ! docker info >/dev/null 2>&1; then
  echo "ERROR: Docker is not running. Open Docker Desktop, then run:"
  echo "  docker compose up --build"
  exit 1
fi

# Host next/tsx on 3000–3003 blocks compose port bindings
# shellcheck source=lib/free-ports.sh
source "$ROOT/scripts/lib/free-ports.sh"

exec docker compose up --build "$@"
