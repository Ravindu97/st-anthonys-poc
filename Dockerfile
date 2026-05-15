# Monorepo image for all St. Anthony's POC services (dev + migrate commands).
FROM node:20-bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

WORKDIR /app

# Install dependencies (layer cache)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/api/package.json apps/api/
COPY apps/ocpp-gateway/package.json apps/ocpp-gateway/
COPY apps/driver-web/package.json apps/driver-web/
COPY apps/admin-web/package.json apps/admin-web/
COPY packages/database/package.json packages/database/
COPY packages/shared/package.json packages/shared/
COPY packages/ui/package.json packages/ui/
COPY packages/ocpp-messages/package.json packages/ocpp-messages/
COPY tools/charge-point-simulator/package.json tools/charge-point-simulator/

# Scripts/assets are not copied yet; sync-branding runs after COPY . .
RUN pnpm install --frozen-lockfile --ignore-scripts

# Application source + Prisma client + compiled workspace packages (main → dist/)
COPY . .
RUN sh scripts/sync-branding.sh
RUN pnpm db:generate \
  && pnpm turbo run build --filter="./packages/*"
