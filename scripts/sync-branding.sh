#!/bin/sh
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$ROOT/assets/branding/sa-logo.png"
if [ ! -f "$SRC" ]; then
  echo "sync-branding: missing $SRC" >&2
  exit 1
fi
mkdir -p "$ROOT/apps/driver-web/public/branding" "$ROOT/apps/admin-web/public/branding"
cp "$SRC" "$ROOT/apps/driver-web/public/branding/sa-logo.png"
cp "$SRC" "$ROOT/apps/admin-web/public/branding/sa-logo.png"
echo "sync-branding: copied logo to driver-web and admin-web public folders"
