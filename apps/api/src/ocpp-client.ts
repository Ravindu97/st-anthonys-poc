const OCPP_GATEWAY_URL = process.env.OCPP_GATEWAY_URL ?? "http://localhost:3002";

export async function remoteStart(
  chargePointOcppId: string,
  connectorId: number,
  idTag: string
): Promise<boolean> {
  const res = await fetch(`${OCPP_GATEWAY_URL}/internal/remote-start`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chargePointOcppId, connectorId, idTag }),
  });
  const data = (await res.json()) as { success: boolean };
  return data.success;
}

export async function remoteStop(chargePointOcppId: string, transactionId: number): Promise<boolean> {
  const res = await fetch(`${OCPP_GATEWAY_URL}/internal/remote-stop`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chargePointOcppId, transactionId }),
  });
  const data = (await res.json()) as { success: boolean };
  return data.success;
}

export async function setChargingProfile(
  chargePointOcppId: string,
  connectorId: number,
  limitKw: number
): Promise<boolean> {
  const res = await fetch(`${OCPP_GATEWAY_URL}/internal/set-charging-profile`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chargePointOcppId, connectorId, limitKw }),
  });
  const data = (await res.json()) as { success: boolean };
  return data.success;
}

export async function resetChargePoint(
  chargePointOcppId: string,
  type: "Hard" | "Soft" = "Soft"
): Promise<boolean> {
  const res = await fetch(`${OCPP_GATEWAY_URL}/internal/reset`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chargePointOcppId, type }),
  });
  const data = (await res.json()) as { success: boolean };
  return data.success;
}
