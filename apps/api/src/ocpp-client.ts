const OCPP_GATEWAY_URL = process.env.OCPP_GATEWAY_URL ?? "http://localhost:3002";

export type RemoteStartResult = { success: boolean; reason?: string };

export async function remoteStart(
  chargePointOcppId: string,
  connectorId: number,
  idTag: string
): Promise<RemoteStartResult> {
  const url = `${OCPP_GATEWAY_URL}/internal/remote-start`;
  const body = { chargePointOcppId, connectorId, idTag };

  console.log(`[api→ocpp] remoteStart POST ${url}`, body);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(20_000),
    });

    const text = await res.text();
    let data: RemoteStartResult = { success: false, reason: "invalid response" };
    try {
      data = JSON.parse(text) as RemoteStartResult;
    } catch {
      data = { success: false, reason: `non-JSON response: ${text.slice(0, 200)}` };
    }

    if (!res.ok) {
      console.warn(`[api→ocpp] remoteStart HTTP ${res.status}:`, data);
      return { success: false, reason: data.reason ?? `HTTP ${res.status}` };
    }

    console.log(`[api→ocpp] remoteStart result:`, data);
    return data;
  } catch (err) {
    const msg = (err as Error).message;
    console.error(`[api→ocpp] remoteStart failed to reach gateway at ${url}:`, msg);
    return {
      success: false,
      reason: `cannot reach OCPP gateway (${OCPP_GATEWAY_URL}): ${msg}`,
    };
  }
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

/** Debug: which charge points are connected to the OCPP gateway right now */
export async function listConnectedChargePoints(): Promise<string[]> {
  try {
    const res = await fetch(`${OCPP_GATEWAY_URL}/internal/connections`);
    const data = (await res.json()) as { connected: string[] };
    return data.connected ?? [];
  } catch {
    return [];
  }
}
