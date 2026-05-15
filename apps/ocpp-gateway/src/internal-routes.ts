import type { FastifyInstance } from "fastify";
import { getAllConnections } from "./connections.js";
import { sendRemoteStart, sendRemoteStop, sendSetChargingProfile, sendReset } from "./ocpp-server.js";

export async function internalRoutes(app: FastifyInstance) {
  app.get("/internal/connections", async () => ({
    connected: getAllConnections(),
  }));

  app.post<{
    Body: { chargePointOcppId: string; connectorId: number; idTag: string };
  }>("/internal/remote-start", async (req) => {
    const { chargePointOcppId, connectorId, idTag } = req.body;
    console.log(
      `[ocpp-gateway] POST /internal/remote-start cp=${chargePointOcppId} gun=${connectorId} idTag=${idTag}`
    );
    const result = await sendRemoteStart(chargePointOcppId, connectorId, idTag);
    console.log(`[ocpp-gateway] remote-start result:`, result);
    return result;
  });

  app.post<{
    Body: { chargePointOcppId: string; transactionId: number };
  }>("/internal/remote-stop", async (req) => {
    const { chargePointOcppId, transactionId } = req.body;
    const ok = await sendRemoteStop(chargePointOcppId, transactionId);
    return { success: ok };
  });

  app.post<{
    Body: { chargePointOcppId: string; connectorId: number; limitKw: number };
  }>("/internal/set-charging-profile", async (req) => {
    const { chargePointOcppId, connectorId, limitKw } = req.body;
    const ok = await sendSetChargingProfile(chargePointOcppId, connectorId, limitKw);
    return { success: ok };
  });

  app.post<{
    Body: { chargePointOcppId: string; type?: "Hard" | "Soft" };
  }>("/internal/reset", async (req) => {
    const { chargePointOcppId, type = "Soft" } = req.body;
    const ok = await sendReset(chargePointOcppId, type);
    return { success: ok };
  });

  app.get("/health", async () => ({ status: "ok", service: "ocpp-gateway" }));
}
