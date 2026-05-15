export type OcppRemoteStartPayload = {
  chargePointOcppId: string;
  connectorId: number;
  idTag: string;
  sessionId: string;
};

export type OcppRemoteStopPayload = {
  chargePointOcppId: string;
  transactionId: number;
};

export type OcppSetChargingProfilePayload = {
  chargePointOcppId: string;
  connectorId: number;
  limitKw: number;
};

export type OfflineSyncPayload = {
  offlineSessionId: string;
  chargePointOcppId: string;
  connectorId: number;
  idTag: string;
  startedAt: string;
  stoppedAt: string;
  meterValues: Array<{
    timestamp: string;
    powerKw: number;
    energyKwh: number;
    socPercent: number;
    batteryTempC: number;
  }>;
};
