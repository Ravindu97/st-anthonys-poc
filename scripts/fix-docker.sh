#!/usr/bin/env bash
# Clears lingering Docker Desktop processes on macOS so the daemon can start cleanly.
# Usage: ./scripts/fix-docker.sh [pid ...]
# Example: ./scripts/fix-docker.sh 27795

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "=== Fix Docker Desktop (lingering processes) ==="
echo ""

# 1. Stop POC app processes only (not Docker Desktop itself)
"$ROOT/scripts/stop-dev.sh"
echo ""

# 2. Stop compose containers if daemon is still reachable
if docker info >/dev/null 2>&1; then
  echo "Stopping Docker Compose containers (postgres, redis)..."
  docker compose -f "$ROOT/docker-compose.yml" down 2>/dev/null || true
  echo ""
fi

# 3. Gracefully quit Docker Desktop (macOS)
echo "Quitting Docker Desktop..."
osascript -e 'quit app "Docker"' 2>/dev/null || true
sleep 2

# 4. Kill PIDs from the dialog (e.g. pid 27795: Docker Desktop)
if [ $# -gt 0 ]; then
  for pid in "$@"; do
    echo "  Stopping PID $pid"
    kill "$pid" 2>/dev/null || kill -9 "$pid" 2>/dev/null || true
  done
fi

# 5. Kill common stuck Docker processes
for pattern in "Docker Desktop" "com.docker.backend" "com.docker.virtualization" "vpnkit"; do
  pkill -if "$pattern" 2>/dev/null || true
done

sleep 2

if docker info >/dev/null 2>&1; then
  echo "Docker daemon is already running."
  docker compose -f "$ROOT/docker-compose.yml" ps 2>/dev/null || true
  exit 0
fi

echo "Docker daemon is stopped (expected)."
echo ""
echo "Next steps:"
echo "  1. Open Docker Desktop from Applications (or run: open -a Docker)"
echo "  2. Wait until the menu bar whale shows Docker is running (not 'Starting...')"
echo "  3. Run:  cd $ROOT && ./scripts/start-dev.sh"
echo ""
echo "Or use the all-in-one reset:  ./scripts/docker-reset.sh"
