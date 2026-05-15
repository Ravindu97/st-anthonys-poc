#!/usr/bin/env bash
# Free POC ports on the host (leftover next dev / tsx from non-Docker runs).
PORTS=(3000 3001 3002 3003)
freed=0

for port in "${PORTS[@]}"; do
  pids=$(lsof -ti :"$port" 2>/dev/null || true)
  if [ -n "$pids" ]; then
    echo "  Port $port → stopping host PID(s): $pids"
    kill -9 $pids 2>/dev/null || true
    freed=1
  fi
done

if [ "$freed" = 1 ]; then
  sleep 1
fi
