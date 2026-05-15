import { randomUUID } from "crypto";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import WebSocket from "ws";
import {
  OCPP_ACTIONS,
  createCall,
  createCallResult,
  isCall,
  parseOcppMessage,
} from "@st-anthonys/ocpp-messages";
import { METER_VALUE_INTERVAL_MS } from "@st-anthonys/shared";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OFFLINE_QUEUE_PATH = join(__dirname, "..", "offline-queue.json");

type OfflineSession = {
  offlineSessionId: string;
  chargePointOcppId: string;
  connectorId: number;
  idTag: string;
  startedAt: string;
  stoppedAt?: string;
  meterValues: Array<{
    timestamp: string;
    powerKw: number;
    energyKwh: number;
    socPercent: number;
    batteryTempC: number;
  }>;
};

export class ChargePointSimulator {
  private ws: WebSocket | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private meterTimer: ReturnType<typeof setInterval> | null = null;
  private transactionId: number | null = null;
  private connectorId = 1;
  private idTag = "";
  private soc = 20;
  private energyKwh = 0;
  private powerKw = 0;
  private maxKw = 150;
  private allocatedKw = 150;
  private batteryTempC = 28;
  private isCharging = false;
  private offlineMode = false;
  private offlineSession: OfflineSession | null = null;
  private pendingResponses = new Map<string, (payload: Record<string, unknown>) => void>();

  constructor(
    public readonly ocppId: string,
    private readonly gatewayUrl: string
  ) {}

  connect() {
    const url = `${this.gatewayUrl}/ocpp/${encodeURIComponent(this.ocppId)}`;
    this.ws = new WebSocket(url);

    this.ws.on("open", () => {
      console.log(`[${this.ocppId}] Connected`);
      this.offlineMode = false;
      void this.boot()
        .then(() => this.syncOfflineQueue())
        .catch((e: Error) => console.error(`[${this.ocppId}] Boot failed:`, e.message));
      this.heartbeatTimer = setInterval(() => void this.heartbeat(), 30_000);
    });

    this.ws.on("message", (data) => void this.handleMessage(data.toString()));
    this.ws.on("close", () => {
      console.log(`[${this.ocppId}] Disconnected — offline mode if charging`);
      this.clearTimers();
      if (this.isCharging) {
        this.offlineMode = true;
        this.startOfflineMetering();
      }
      setTimeout(() => this.connect(), 5_000);
    });
    this.ws.on("error", () => {});
  }

  disconnect() {
    this.clearTimers();
    this.ws?.close();
  }

  private clearTimers() {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    if (this.meterTimer) clearInterval(this.meterTimer);
    this.heartbeatTimer = null;
    this.meterTimer = null;
  }

  private async boot() {
    await this.call(OCPP_ACTIONS.BOOT_NOTIFICATION, {
      chargePointVendor: "StAnthonys",
      chargePointModel: "POC-Simulator",
      firmwareVersion: "1.0.0",
    });
    await this.sendStatus(1, "Available");
    await this.sendStatus(2, "Available");
  }

  private async heartbeat() {
    if (this.offlineMode || !this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    await this.call(OCPP_ACTIONS.HEARTBEAT, {});
  }

  private async handleMessage(raw: string) {
    const msg = parseOcppMessage(raw);
    if (!msg || !isCall(msg)) return;

    const [, uniqueId, action, payload] = msg;

    switch (action) {
      case OCPP_ACTIONS.REMOTE_START_TRANSACTION: {
        this.connectorId = (payload.connectorId as number) ?? 1;
        this.idTag = (payload.idTag as string) ?? "TAG-demo";
        await this.sendStatus(this.connectorId, "Preparing");
        await this.sendStatus(this.connectorId, "Charging");
        const result = await this.call(OCPP_ACTIONS.START_TRANSACTION, {
          connectorId: this.connectorId,
          idTag: this.idTag,
          meterStart: 0,
          timestamp: new Date().toISOString(),
        });
        this.transactionId = (result.transactionId as number) ?? null;
        this.isCharging = true;
        this.soc = 20;
        this.energyKwh = 0;
        this.startMetering();
        this.ws?.send(JSON.stringify(createCallResult(uniqueId, { status: "Accepted" })));
        break;
      }

      case OCPP_ACTIONS.REMOTE_STOP_TRANSACTION: {
        await this.stopCharging();
        this.ws?.send(JSON.stringify(createCallResult(uniqueId, { status: "Accepted" })));
        break;
      }

      case OCPP_ACTIONS.SET_CHARGING_PROFILE: {
        const profile = payload.csChargingProfiles as {
          chargingSchedule?: { chargingSchedulePeriod?: Array<{ limit: number }> };
        };
        const limitW = profile?.chargingSchedule?.chargingSchedulePeriod?.[0]?.limit ?? this.maxKw * 1000;
        this.allocatedKw = limitW / 1000;
        console.log(`[${this.ocppId}] Charging profile set: ${this.allocatedKw} kW`);
        this.ws?.send(JSON.stringify(createCallResult(uniqueId, { status: "Accepted" })));
        break;
      }

      case OCPP_ACTIONS.RESET: {
        await this.stopCharging();
        await this.sendStatus(1, "Available");
        await this.sendStatus(2, "Available");
        this.ws?.send(JSON.stringify(createCallResult(uniqueId, { status: "Accepted" })));
        break;
      }

      default:
        this.ws?.send(JSON.stringify(createCallResult(uniqueId, {})));
    }
  }

  private startMetering() {
    if (this.meterTimer) clearInterval(this.meterTimer);
    this.meterTimer = setInterval(() => void this.sendMeterValues(), METER_VALUE_INTERVAL_MS);
  }

  private startOfflineMetering() {
    if (!this.offlineSession) {
      this.offlineSession = {
        offlineSessionId: randomUUID(),
        chargePointOcppId: this.ocppId,
        connectorId: this.connectorId,
        idTag: this.idTag,
        startedAt: new Date().toISOString(),
        meterValues: [],
      };
    }
    if (this.meterTimer) clearInterval(this.meterTimer);
    this.meterTimer = setInterval(() => {
      this.tickCharge();
      this.offlineSession!.meterValues.push({
        timestamp: new Date().toISOString(),
        powerKw: this.powerKw,
        energyKwh: this.energyKwh,
        socPercent: this.soc,
        batteryTempC: this.batteryTempC,
      });
      this.saveOfflineQueue();
    }, METER_VALUE_INTERVAL_MS);
  }

  private tickCharge() {
    const targetKw = Math.min(this.allocatedKw, this.maxKw);
    if (this.soc < 80) {
      this.powerKw = targetKw;
    } else {
      this.powerKw = targetKw * Math.max(0.1, (95 - this.soc) / 15);
    }
    const intervalHours = METER_VALUE_INTERVAL_MS / 3_600_000;
    this.energyKwh += this.powerKw * intervalHours;
    this.soc = Math.min(100, this.soc + this.powerKw * intervalHours * 0.15);
    this.batteryTempC = Math.min(45, 28 + this.soc * 0.12);
  }

  private async sendMeterValues() {
    this.tickCharge();

    if (this.offlineMode) return;

    await this.call(OCPP_ACTIONS.METER_VALUES, {
      connectorId: this.connectorId,
      transactionId: this.transactionId,
      meterValue: [
        {
          timestamp: new Date().toISOString(),
          sampledValue: [
            { value: String(this.powerKw * 1000), measurand: "Power.Active.Import", unit: "W" },
            { value: String(this.energyKwh * 1000), measurand: "Energy.Active.Import.Register", unit: "Wh" },
            { value: String(this.soc), measurand: "SoC", unit: "Percent" },
            { value: String(this.batteryTempC), measurand: "Temperature", unit: "Celsius" },
          ],
        },
      ],
    });

    if (this.soc >= 95) {
      await this.stopCharging();
    }
  }

  private async stopCharging() {
    if (this.meterTimer) clearInterval(this.meterTimer);
    this.meterTimer = null;
    this.isCharging = false;

    if (this.offlineMode && this.offlineSession) {
      this.offlineSession.stoppedAt = new Date().toISOString();
      this.saveOfflineQueue();
      return;
    }

    if (this.transactionId !== null) {
      await this.call(OCPP_ACTIONS.STOP_TRANSACTION, {
        transactionId: this.transactionId,
        meterStop: Math.round(this.energyKwh * 1000),
        timestamp: new Date().toISOString(),
        idTag: this.idTag,
      });
    }
    await this.sendStatus(this.connectorId, "Finishing");
    await this.sendStatus(this.connectorId, "Available");
    this.transactionId = null;
    this.powerKw = 0;
  }

  private async sendStatus(connectorId: number, status: string) {
    if (this.offlineMode) return;
    await this.call(OCPP_ACTIONS.STATUS_NOTIFICATION, { connectorId, status, errorCode: "NoError" });
  }

  private call(action: string, payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    return new Promise((resolve, reject) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        reject(new Error("Not connected"));
        return;
      }
      const uniqueId = randomUUID();
      this.pendingResponses.set(uniqueId, resolve);
      this.ws.send(JSON.stringify(createCall(uniqueId, action, payload)));

      setTimeout(() => {
        if (this.pendingResponses.has(uniqueId)) {
          this.pendingResponses.delete(uniqueId);
          resolve({});
        }
      }, 10_000);

      const handler = (data: WebSocket.RawData) => {
        const msg = parseOcppMessage(data.toString());
        if (msg && msg[0] === 3 && msg[1] === uniqueId) {
          this.ws?.off("message", handler);
          this.pendingResponses.delete(uniqueId);
          resolve(msg[2]);
        }
      };
      this.ws.on("message", handler);
    });
  }

  private saveOfflineQueue() {
    const queue = loadOfflineQueue();
    const idx = queue.findIndex((s) => s.offlineSessionId === this.offlineSession?.offlineSessionId);
    if (this.offlineSession) {
      if (idx >= 0) queue[idx] = this.offlineSession;
      else queue.push(this.offlineSession);
    }
    writeFileSync(OFFLINE_QUEUE_PATH, JSON.stringify(queue, null, 2));
  }

  private async syncOfflineQueue() {
    const queue = loadOfflineQueue().filter((s) => s.chargePointOcppId === this.ocppId && s.stoppedAt);
    if (queue.length === 0) return;

    const apiUrl = process.env.API_URL ?? "http://localhost:3001";
    for (const session of queue) {
      try {
        const res = await fetch(`${apiUrl}/internal/offline-sync`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(session),
        });
        if (res.ok) {
          console.log(`[${this.ocppId}] Synced offline session ${session.offlineSessionId}`);
          const remaining = loadOfflineQueue().filter(
            (s) => s.offlineSessionId !== session.offlineSessionId
          );
          writeFileSync(OFFLINE_QUEUE_PATH, JSON.stringify(remaining, null, 2));
        }
      } catch (e) {
        console.error(`[${this.ocppId}] Offline sync failed:`, e);
      }
    }
    this.offlineSession = null;
  }
}

function loadOfflineQueue(): OfflineSession[] {
  if (!existsSync(OFFLINE_QUEUE_PATH)) return [];
  try {
    return JSON.parse(readFileSync(OFFLINE_QUEUE_PATH, "utf-8")) as OfflineSession[];
  } catch {
    return [];
  }
}
