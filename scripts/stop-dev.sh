#!/usr/bin/env bash
# Stop the POC stack (Docker Compose) and free host ports 3000–3003.
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
# shellcheck source=lib/free-ports.sh
source "$ROOT/scripts/lib/free-ports.sh"

echo "Stopping Docker Compose stack..."
if [ "${1:-}" = "--volumes" ]; then
  docker compose down -v
  echo "Stopped stack and removed database volume."
else
  docker compose down
  echo "Stopped stack. Data volume kept (use --volumes to wipe Postgres)."
fi

echo "Freeing host ports 3000–3003 (old local dev processes)..."
echo "Done."
