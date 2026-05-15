import type { FastifyInstance } from "fastify";
import { sendRemoteStart, sendRemoteStop, sendSetChargingProfile, sendReset } from "./ocpp-server.js";

export async function internalRoutes(app: FastifyInstance) {
  app.post<{
    Body: { chargePointOcppId: string; connectorId: number; idTag: string };
  }>("/internal/remote-start", async (req) => {
    const { chargePointOcppId, connectorId, idTag } = req.body;
    const ok = await sendRemoteStart(chargePointOcppId, connectorId, idTag);
    return { success: ok };
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
