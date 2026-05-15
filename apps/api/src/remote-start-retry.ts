import { listConnectedChargePoints, remoteStart, type RemoteStartResult } from "./ocpp-client.js";

const RETRY_ATTEMPTS = 10;
const RETRY_DELAY_MS = 2_000;

/** Retry while simulators are still connecting to the OCPP gateway (common on cold start). */
export async function remoteStartWithRetry(
  chargePointOcppId: string,
  connectorId: number,
  idTag: string
): Promise<RemoteStartResult> {
  let last: RemoteStartResult = { success: false, reason: "not attempted" };

  for (let attempt = 1; attempt <= RETRY_ATTEMPTS; attempt++) {
    last = await remoteStart(chargePointOcppId, connectorId, idTag);
    if (last.success) return last;

    const retryable =
      last.reason?.includes("not connected") ||
      last.reason?.includes("cannot reach OCPP gateway");

    if (!retryable || attempt === RETRY_ATTEMPTS) {
      const online = await listConnectedChargePoints();
      console.warn(
        `[sessions] remoteStart gave up after ${attempt} attempt(s):`,
        last.reason,
        `online=[${online.join(", ")}]`
      );
      return last;
    }

    console.log(
      `[sessions] remoteStart attempt ${attempt}/${RETRY_ATTEMPTS} failed (${last.reason}) — retry in ${RETRY_DELAY_MS}ms`
    );
    await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
  }

  return last;
}
