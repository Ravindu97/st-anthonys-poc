/**
 * OCPP 2.0.1 adapter interface — documented migration path.
 * Full implementation deferred; gateway uses 1.6J handlers today.
 */
export interface OcppAdapter {
  bootNotification(chargePointId: string): Promise<{ status: string; interval: number }>;
  requestStartTransaction(
    chargePointId: string,
    evseId: number,
    idToken: string
  ): Promise<{ status: string }>;
  requestStopTransaction(chargePointId: string, transactionId: string): Promise<{ status: string }>;
  transactionEvent(event: TransactionEventPayload): Promise<void>;
}

export type TransactionEventPayload = {
  eventType: "Started" | "Updated" | "Ended";
  transactionId: string;
  timestamp: string;
  triggerReason: string;
  seqNo: number;
  meterValue?: Array<{
    timestamp: string;
    sampledValue: Array<{ value: string; measurand?: string; unit?: string }>;
  }>;
};

/** Maps OCPP 1.6J action names to 2.0.1 equivalents for documentation */
export const OCPP_MIGRATION_MAP: Record<string, string> = {
  BootNotification: "BootNotification (extended fields)",
  StartTransaction: "TransactionEvent (Started)",
  StopTransaction: "TransactionEvent (Ended)",
  MeterValues: "TransactionEvent (Updated) + MeterValue",
  RemoteStartTransaction: "RequestStartTransaction",
  RemoteStopTransaction: "RequestStopTransaction",
  SetChargingProfile: "SetChargingProfile (2.0.1 enhanced)",
  Reset: "Reset",
};
