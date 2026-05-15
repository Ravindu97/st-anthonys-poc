export type OcppCallMessage = [2, string, string, Record<string, unknown>];
export type OcppCallResultMessage = [3, string, Record<string, unknown>];
export type OcppCallErrorMessage = [4, string, string, string, Record<string, unknown>?];

export type OcppMessage = OcppCallMessage | OcppCallResultMessage | OcppCallErrorMessage;

export const OCPP_ACTIONS = {
  BOOT_NOTIFICATION: "BootNotification",
  HEARTBEAT: "Heartbeat",
  STATUS_NOTIFICATION: "StatusNotification",
  AUTHORIZE: "Authorize",
  START_TRANSACTION: "StartTransaction",
  STOP_TRANSACTION: "StopTransaction",
  METER_VALUES: "MeterValues",
  REMOTE_START_TRANSACTION: "RemoteStartTransaction",
  REMOTE_STOP_TRANSACTION: "RemoteStopTransaction",
  SET_CHARGING_PROFILE: "SetChargingProfile",
  RESET: "Reset",
} as const;

export function createCall(uniqueId: string, action: string, payload: Record<string, unknown>): OcppCallMessage {
  return [2, uniqueId, action, payload];
}

export function createCallResult(uniqueId: string, payload: Record<string, unknown>): OcppCallResultMessage {
  return [3, uniqueId, payload];
}

export function createCallError(
  uniqueId: string,
  errorCode: string,
  errorDescription: string,
  details?: Record<string, unknown>
): OcppCallErrorMessage {
  return [4, uniqueId, errorCode, errorDescription, details];
}

export function parseOcppMessage(raw: string): OcppMessage | null {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed) || parsed.length < 3) return null;
    return parsed as OcppMessage;
  } catch {
    return null;
  }
}

export function isCall(msg: OcppMessage): msg is OcppCallMessage {
  return msg[0] === 2;
}

export function isCallResult(msg: OcppMessage): msg is OcppCallResultMessage {
  return msg[0] === 3;
}
