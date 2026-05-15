import { randomUUID } from "crypto";
import type { WebSocketServer, WebSocket } from "ws";
import { prisma } from "@st-anthonys/database";
import {
  OCPP_ACTIONS,
  createCall,
  createCallResult,
  isCall,
  isCallResult,
  parseOcppMessage,
} from "@st-anthonys/ocpp-messages";
import { DEFAULT_SOC_STOP_PERCENT, HEARTBEAT_TIMEOUT_MS, REDIS_CHANNELS } from "@st-anthonys/shared";
import {
  type ChargePointConnection,
  getConnection,
  registerConnection,
  removeConnection,
} from "./connections.js";
import { publishChargePointUpdate, publishSessionUpdate } from "./redis.js";

const activeTransactions = new Map<number, { sessionId: string; ocppId: string; connectorId: number }>();

export function setupOcppWebSocket(wss: WebSocketServer) {
  wss.on("connection", (ws, req) => {
    const url = req.url ?? "";
    if (!url.startsWith("/ocpp/")) {
      ws.close(1008, "Invalid OCPP path");
      return;
    }
    const match = url.match(/\/ocpp\/([^/?]+)/);
    const ocppId = match?.[1] ? decodeURIComponent(match[1]) : null;
    if (!ocppId) {
      ws.close(1008, "Missing charge point ID in path");
      return;
    }

    const conn: ChargePointConnection = {
      ws,
      ocppId,
      pendingCalls: new Map(),
    };
    registerConnection(ocppId, conn);

    void prisma.chargePoint
      .updateMany({
        where: { ocppId },
        data: { status: "Available", lastHeartbeat: new Date() },
      })
      .then(() => publishChargePointUpdate({ ocppId, status: "Available" }))
      .catch((err: Error) => console.error(`[ocpp] ${ocppId} connect DB:`, err.message));

    ws.on("message", (data) => void handleMessage(conn, data.toString()));
    ws.on("close", () => {
      removeConnection(ocppId);
      void prisma.chargePoint
        .updateMany({ where: { ocppId }, data: { status: "Offline" } })
        .then(() => publishChargePointUpdate({ ocppId, status: "Offline" }))
        .catch((err: Error) => console.error(`[ocpp] ${ocppId} disconnect DB:`, err.message));
    });
  });

  setInterval(() => {
    void checkHeartbeats().catch((err: Error) =>
      console.error("[ocpp] heartbeat check:", err.message)
    );
  }, 30_000);
}

async function checkHeartbeats() {
  const cutoff = new Date(Date.now() - HEARTBEAT_TIMEOUT_MS);
  const stale = await prisma.chargePoint.findMany({
    where: { lastHeartbeat: { lt: cutoff }, status: { not: "Offline" } },
  });
  for (const cp of stale) {
    await prisma.chargePoint.update({
      where: { id: cp.id },
      data: { status: "Offline" },
    });
    void publishChargePointUpdate({ ocppId: cp.ocppId, status: "Offline" });
  }
}

async function handleMessage(conn: ChargePointConnection, raw: string) {
  const msg = parseOcppMessage(raw);
  if (!msg) return;

  if (isCall(msg)) {
    const [, uniqueId, action, payload] = msg;
    try {
      const response = await handleCall(conn, action, payload);
      conn.ws.send(JSON.stringify(createCallResult(uniqueId, response)));
    } catch (err) {
      console.error(`[ocpp] ${conn.ocppId} ${action}:`, (err as Error).message);
      conn.ws.send(JSON.stringify(createCallResult(uniqueId, {})));
    }
    return;
  }

  if (isCallResult(msg)) {
    const [, uniqueId, payload] = msg;
    const pending = conn.pendingCalls.get(uniqueId);
    if (pending) {
      pending.resolve(payload);
      conn.pendingCalls.delete(uniqueId);
    }
  }
}

async function handleCall(
  conn: ChargePointConnection,
  action: string,
  payload: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const { ocppId } = conn;

  switch (action) {
    case OCPP_ACTIONS.BOOT_NOTIFICATION: {
      const cp = await prisma.chargePoint.findUnique({ where: { ocppId } });
      if (!cp) return { status: "Rejected", interval: 60, currentTime: new Date().toISOString() };
      await prisma.chargePoint.update({
        where: { id: cp.id },
        data: { status: "Available", lastHeartbeat: new Date() },
      });
      publishChargePointUpdate({ ocppId, status: "Available" });
      return { status: "Accepted", interval: 30, currentTime: new Date().toISOString() };
    }

    case OCPP_ACTIONS.HEARTBEAT: {
      await prisma.chargePoint.updateMany({
        where: { ocppId },
        data: { lastHeartbeat: new Date() },
      });
      return { currentTime: new Date().toISOString() };
    }

    case OCPP_ACTIONS.STATUS_NOTIFICATION: {
      const connectorId = payload.connectorId as number;
      const status = mapConnectorStatus(payload.status as string);
      const cp = await prisma.chargePoint.findUnique({
        where: { ocppId },
        include: { connectors: true },
      });
      if (cp) {
        const connector = cp.connectors.find((c) => c.connectorNum === connectorId);
        if (connector) {
          await prisma.connector.update({
            where: { id: connector.id },
            data: { status },
          });
        }
        const cpStatus = status === "Occupied" ? "Charging" : status === "Faulted" ? "Faulted" : "Available";
        await prisma.chargePoint.update({
          where: { id: cp.id },
          data: { status: cpStatus, lastHeartbeat: new Date() },
        });
        publishChargePointUpdate({ ocppId, status: cpStatus, connectorId, connectorStatus: status });
      }
      return {};
    }

    case OCPP_ACTIONS.AUTHORIZE: {
      const idTag = payload.idTag as string;
      const user = await prisma.user.findFirst({ where: { email: idTag.replace("TAG-", "") } });
      return { idTagInfo: { status: user ? "Accepted" : "Accepted" } };
    }

    case OCPP_ACTIONS.START_TRANSACTION: {
      const connectorId = payload.connectorId as number;
      const idTag = payload.idTag as string;
      const transactionId = Math.floor(Math.random() * 1_000_000);

      const cp = await prisma.chargePoint.findUnique({
        where: { ocppId },
        include: { connectors: true },
      });
      const connector = cp?.connectors.find((c) => c.connectorNum === connectorId);

      const session = connector
        ? await prisma.session.findFirst({
            where: { connectorId: connector.id, status: { in: ["pending", "active"] } },
            orderBy: { createdAt: "desc" },
          })
        : null;

      if (session) {
        activeTransactions.set(transactionId, {
          sessionId: session.id,
          ocppId,
          connectorId,
        });
        await prisma.session.update({
          where: { id: session.id },
          data: {
            status: "active",
            ocppTransactionId: transactionId,
            idTag,
            startedAt: new Date(),
          },
        });
        publishSessionUpdate({ sessionId: session.id, status: "active" });
      }

      return { transactionId, idTagInfo: { status: "Accepted" } };
    }

    case OCPP_ACTIONS.STOP_TRANSACTION: {
      const transactionId = payload.transactionId as number;
      const tx = activeTransactions.get(transactionId);
      if (tx) {
        activeTransactions.delete(transactionId);
        const meterStop = (payload.meterStop as number) ?? 0;
        await completeSession(tx.sessionId, meterStop / 1000);
      }
      return { idTagInfo: { status: "Accepted" } };
    }

    case OCPP_ACTIONS.METER_VALUES: {
      const connectorId = payload.connectorId as number;
      const meterValue = payload.meterValue as Array<{
        timestamp: string;
        sampledValue: Array<{ value: string; measurand?: string; unit?: string }>;
      }>;

      const cp = await prisma.chargePoint.findUnique({
        where: { ocppId },
        include: { connectors: true },
      });
      const connector = cp?.connectors.find((c) => c.connectorNum === connectorId);
      if (!connector) return {};

      const session = await prisma.session.findFirst({
        where: { connectorId: connector.id, status: "active" },
        orderBy: { createdAt: "desc" },
      });
      if (!session) return {};

      const parsed = parseMeterSamples(meterValue);
      await prisma.meterValue.create({
        data: {
          sessionId: session.id,
          timestamp: new Date(),
          powerKw: parsed.powerKw,
          energyKwh: parsed.energyKwh,
          socPercent: parsed.socPercent,
          batteryTempC: parsed.batteryTempC,
        },
      });

      await prisma.session.update({
        where: { id: session.id },
        data: { energyKwh: parsed.energyKwh },
      });

      publishSessionUpdate({
        sessionId: session.id,
        status: "active",
        powerKw: parsed.powerKw,
        energyKwh: parsed.energyKwh,
        socPercent: parsed.socPercent,
        batteryTempC: parsed.batteryTempC,
        allocatedKw: session.allocatedKw ?? undefined,
      });

      if (parsed.socPercent && parsed.socPercent >= DEFAULT_SOC_STOP_PERCENT) {
        const txEntry = [...activeTransactions.entries()].find(([, v]) => v.sessionId === session.id);
        if (txEntry) {
          await sendRemoteStop(conn, txEntry[0]);
        }
      }

      return {};
    }

    default:
      return {};
  }
}

function parseMeterSamples(
  meterValue: Array<{
    timestamp: string;
    sampledValue: Array<{ value: string; measurand?: string; unit?: string }>;
  }>
) {
  let powerKw = 0;
  let energyKwh = 0;
  let socPercent: number | undefined;
  let batteryTempC: number | undefined;

  for (const mv of meterValue) {
    for (const sv of mv.sampledValue) {
      const val = parseFloat(sv.value);
      const measurand = sv.measurand ?? "Energy.Active.Import.Register";
      if (measurand.includes("Power.Active.Import") || measurand === "Power") {
        powerKw = sv.unit === "W" ? val / 1000 : val;
      } else if (measurand.includes("Energy.Active.Import.Register") || measurand === "Energy") {
        energyKwh = sv.unit === "Wh" ? val / 1000 : val;
      } else if (measurand === "SoC") {
        socPercent = val;
      } else if (measurand === "Temperature") {
        batteryTempC = val;
      }
    }
  }

  return { powerKw, energyKwh, socPercent, batteryTempC };
}

function mapConnectorStatus(status: string): "Available" | "Occupied" | "Faulted" | "Unavailable" {
  switch (status) {
    case "Charging":
    case "Preparing":
    case "Finishing":
    case "SuspendedEV":
    case "SuspendedEVSE":
      return "Occupied";
    case "Faulted":
      return "Faulted";
    case "Unavailable":
      return "Unavailable";
    default:
      return "Available";
  }
}

async function completeSession(sessionId: string, energyKwh: number) {
  const session = await prisma.session.update({
    where: { id: sessionId },
    data: { status: "completed", stoppedAt: new Date(), energyKwh },
  });
  publishSessionUpdate({ sessionId, status: "completed", energyKwh });
  return session;
}

export async function sendRemoteStart(
  ocppId: string,
  connectorId: number,
  idTag: string
): Promise<boolean> {
  const conn = getConnection(ocppId);
  if (!conn) return false;
  const uniqueId = randomUUID();
  const call = createCall(uniqueId, OCPP_ACTIONS.REMOTE_START_TRANSACTION, {
    connectorId,
    idTag,
  });
  conn.ws.send(JSON.stringify(call));
  return true;
}

export async function sendRemoteStop(ocppIdOrConn: string | ChargePointConnection, transactionId: number) {
  const conn =
    typeof ocppIdOrConn === "string" ? getConnection(ocppIdOrConn) : ocppIdOrConn;
  if (!conn) return false;
  const uniqueId = randomUUID();
  const call = createCall(uniqueId, OCPP_ACTIONS.REMOTE_STOP_TRANSACTION, { transactionId });
  conn.ws.send(JSON.stringify(call));
  return true;
}

export async function sendSetChargingProfile(
  ocppId: string,
  connectorId: number,
  limitKw: number
): Promise<boolean> {
  const conn = getConnection(ocppId);
  if (!conn) return false;
  const uniqueId = randomUUID();
  const call = createCall(uniqueId, OCPP_ACTIONS.SET_CHARGING_PROFILE, {
    connectorId,
    csChargingProfiles: {
      chargingProfileId: 1,
      stackLevel: 0,
      chargingProfilePurpose: "TxDefaultProfile",
      chargingProfileKind: "Absolute",
      chargingSchedule: {
        chargingRateUnit: "W",
        chargingSchedulePeriod: [{ startPeriod: 0, limit: limitKw * 1000 }],
      },
    },
  });
  conn.ws.send(JSON.stringify(call));
  return true;
}

export async function sendReset(ocppId: string, type: "Hard" | "Soft" = "Soft"): Promise<boolean> {
  const conn = getConnection(ocppId);
  if (!conn) return false;
  const uniqueId = randomUUID();
  const call = createCall(uniqueId, OCPP_ACTIONS.RESET, { type });
  conn.ws.send(JSON.stringify(call));
  return true;
}

export { activeTransactions };
