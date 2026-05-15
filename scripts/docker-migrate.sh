#!/bin/sh
set -e
cd /app

echo "Running database migrations..."
pnpm --filter @st-anthonys/database exec prisma migrate deploy

echo "Checking seed data..."
if pnpm --filter @st-anthonys/database exec node -e "
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.user.count()
  .then((n) => { p.\$disconnect(); process.exit(n > 0 ? 0 : 1); })
  .catch(() => process.exit(1));
"; then
  echo "Database already seeded."
else
  echo "Seeding database..."
  pnpm --filter @st-anthonys/database exec tsx prisma/seed.ts
fi

echo "Database ready."
