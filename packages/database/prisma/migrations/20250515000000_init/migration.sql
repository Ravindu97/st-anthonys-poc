-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('DRIVER', 'ADMIN');
CREATE TYPE "ChargePointStatus" AS ENUM ('Available', 'Charging', 'Faulted', 'Offline', 'Unavailable');
CREATE TYPE "ConnectorStatus" AS ENUM ('Available', 'Occupied', 'Faulted', 'Unavailable');
CREATE TYPE "SessionStatus" AS ENUM ('pending', 'active', 'completed', 'failed');

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Hub" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "maxHubKw" DOUBLE PRECISION NOT NULL,
    "siteId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Hub_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Site" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Site_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ChargePoint" (
    "id" TEXT NOT NULL,
    "ocppId" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "maxKw" DOUBLE PRECISION NOT NULL,
    "status" "ChargePointStatus" NOT NULL DEFAULT 'Offline',
    "lastHeartbeat" TIMESTAMP(3),
    "siteId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ChargePoint_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Connector" (
    "id" TEXT NOT NULL,
    "connectorNum" INTEGER NOT NULL,
    "status" "ConnectorStatus" NOT NULL DEFAULT 'Available',
    "chargePointId" TEXT NOT NULL,
    CONSTRAINT "Connector_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'DRIVER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "status" "SessionStatus" NOT NULL DEFAULT 'pending',
    "userId" TEXT NOT NULL,
    "connectorId" TEXT NOT NULL,
    "ocppTransactionId" INTEGER,
    "idTag" TEXT,
    "startedAt" TIMESTAMP(3),
    "stoppedAt" TIMESTAMP(3),
    "energyKwh" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "costLkr" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "allocatedKw" DOUBLE PRECISION,
    "syncedFromOffline" BOOLEAN NOT NULL DEFAULT false,
    "offlineSessionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MeterValue" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "powerKw" DOUBLE PRECISION NOT NULL,
    "energyKwh" DOUBLE PRECISION NOT NULL,
    "socPercent" DOUBLE PRECISION,
    "batteryTempC" DOUBLE PRECISION,
    CONSTRAINT "MeterValue_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "amountLkr" DOUBLE PRECISION NOT NULL,
    "tariff" DOUBLE PRECISION NOT NULL,
    "receipt" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OfflineQueue" (
    "id" TEXT NOT NULL,
    "offlineSessionId" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "synced" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OfflineQueue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Hub_siteId_key" ON "Hub"("siteId");
CREATE UNIQUE INDEX "ChargePoint_ocppId_key" ON "ChargePoint"("ocppId");
CREATE UNIQUE INDEX "Connector_chargePointId_connectorNum_key" ON "Connector"("chargePointId", "connectorNum");
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "Session_offlineSessionId_key" ON "Session"("offlineSessionId");
CREATE UNIQUE INDEX "Transaction_sessionId_key" ON "Transaction"("sessionId");
CREATE UNIQUE INDEX "OfflineQueue_offlineSessionId_key" ON "OfflineQueue"("offlineSessionId");

-- AddForeignKey
ALTER TABLE "Hub" ADD CONSTRAINT "Hub_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Site" ADD CONSTRAINT "Site_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ChargePoint" ADD CONSTRAINT "ChargePoint_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Connector" ADD CONSTRAINT "Connector_chargePointId_fkey" FOREIGN KEY ("chargePointId") REFERENCES "ChargePoint"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Session" ADD CONSTRAINT "Session_connectorId_fkey" FOREIGN KEY ("connectorId") REFERENCES "Connector"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MeterValue" ADD CONSTRAINT "MeterValue_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
