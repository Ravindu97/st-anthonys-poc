import type { FastifyInstance } from "fastify";
import { prisma } from "@st-anthonys/database";
import { DEFAULT_TARIFF_LKR_PER_KWH, StartSessionRequestSchema } from "@st-anthonys/shared";
import { requireAuth } from "../auth.js";
import { listConnectedChargePoints, remoteStart, remoteStop } from "../ocpp-client.js";
import { remoteStartWithRetry } from "../remote-start-retry.js";
import { rebalanceHub } from "../load-balancer.js";

const PENDING_TIMEOUT_MS = 90_000;

async function expireStalePendingSessions(userId: string) {
  await prisma.session.updateMany({
    where: {
      userId,
      status: "pending",
      createdAt: { lt: new Date(Date.now() - PENDING_TIMEOUT_MS) },
    },
    data: { status: "failed" },
  });
}

export async function sessionRoutes(app: FastifyInstance) {
  app.post("/sessions/start", async (req, reply) => {
    const user = await requireAuth(req);
    const { connectorId } = StartSessionRequestSchema.parse(req.body);
    await expireStalePendingSessions(user.userId);

    const connector = await prisma.connector.findUnique({
      where: { id: connectorId },
      include: {
        chargePoint: { include: { site: true } },
        sessions: { where: { status: { in: ["pending", "active"] } } },
      },
    });

    if (!connector) return reply.status(404).send({ error: "Connector not found" });
    if (connector.status !== "Available" && connector.status !== "Occupied") {
      return reply.status(400).send({ error: `Connector is ${connector.status}` });
    }
    if (connector.chargePoint.status === "Offline") {
      return reply.status(400).send({ error: "Charge point is offline" });
    }
    const existingPending = connector.sessions.find((s) => s.status === "pending");
    const existingActive = connector.sessions.find((s) => s.status === "active");
    if (existingActive) {
      return reply.status(400).send({ error: "Connector already has an active session" });
    }

    if (existingPending) {
      console.log(`[sessions] retry pending ${existingPending.id} on ${connector.chargePoint.ocppId}`);
      const retried = await remoteStartWithRetry(
        connector.chargePoint.ocppId,
        connector.connectorNum,
        existingPending.idTag ?? `TAG-${user.email}`
      );
      if (!retried.success) {
        const online = await listConnectedChargePoints();
        console.warn(`[sessions] retry failed:`, retried.reason, `online=[${online.join(", ")}]`);
        await prisma.session.update({
          where: { id: existingPending.id },
          data: { status: "failed" },
        });
        return reply.status(503).send({
          error: `Charge point did not respond: ${retried.reason}. Connected: ${online.join(", ") || "none"}`,
        });
      }
      return { sessionId: existingPending.id, status: "pending" };
    }

    const session = await prisma.session.create({
      data: {
        userId: user.userId,
        connectorId,
        status: "pending",
        idTag: `TAG-${user.email}`,
      },
    });

    console.log(
      `[sessions] start sessionId=${session.id} cp=${connector.chargePoint.ocppId} gun=${connector.connectorNum} cpStatus=${connector.chargePoint.status}`
    );

    // Return immediately — remote start runs in background (avoids 15s+ UI hang on "Starting...")
    void (async () => {
      const started = await remoteStartWithRetry(
        connector.chargePoint.ocppId,
        connector.connectorNum,
        `TAG-${user.email}`
      );
      if (!started.success) {
        console.warn(`[sessions] background start failed for ${session.id}:`, started.reason);
        await prisma.session.update({ where: { id: session.id }, data: { status: "failed" } });
        return;
      }
      await prisma.connector.update({ where: { id: connectorId }, data: { status: "Occupied" } });
      await rebalanceHub(connector.chargePoint.siteId);
      console.log(`[sessions] background remoteStart ok for ${session.id}`);
    })();

    return { sessionId: session.id, status: "pending" };
  });

  app.post("/sessions/:id/stop", async (req, reply) => {
    const user = await requireAuth(req);
    const { id } = req.params as { id: string };

    const session = await prisma.session.findUnique({
      where: { id },
      include: { connector: { include: { chargePoint: { include: { site: true } } } } },
    });

    if (!session) return reply.status(404).send({ error: "Session not found" });
    if (session.userId !== user.userId && user.role !== "ADMIN") {
      return reply.status(403).send({ error: "Forbidden" });
    }

    if (session.ocppTransactionId) {
      await remoteStop(session.connector.chargePoint.ocppId, session.ocppTransactionId);
    }

    const energyKwh = session.energyKwh;
    const costLkr = energyKwh * DEFAULT_TARIFF_LKR_PER_KWH;

    const updated = await prisma.session.update({
      where: { id },
      data: { status: "completed", stoppedAt: new Date(), costLkr },
    });

    await prisma.transaction.upsert({
      where: { sessionId: id },
      create: {
        sessionId: id,
        amountLkr: costLkr,
        tariff: DEFAULT_TARIFF_LKR_PER_KWH,
        receipt: {
          sessionId: id,
          energyKwh,
          costLkr,
          tariff: DEFAULT_TARIFF_LKR_PER_KWH,
          paidAt: new Date().toISOString(),
          paymentMethod: "Mock Visa •••• 4242",
          status: "paid",
        },
      },
      update: {
        amountLkr: costLkr,
        receipt: {
          sessionId: id,
          energyKwh,
          costLkr,
          tariff: DEFAULT_TARIFF_LKR_PER_KWH,
          paidAt: new Date().toISOString(),
          paymentMethod: "Mock Visa •••• 4242",
          status: "paid",
        },
      },
    });

    await prisma.connector.update({
      where: { id: session.connectorId },
      data: { status: "Available" },
    });

    await rebalanceHub(session.connector.chargePoint.siteId);

    return updated;
  });

  app.post("/sessions/:id/cancel", async (req, reply) => {
    const user = await requireAuth(req);
    const { id } = req.params as { id: string };
    const session = await prisma.session.findUnique({
      where: { id },
      include: { connector: true },
    });
    if (!session) return reply.status(404).send({ error: "Session not found" });
    if (session.userId !== user.userId) return reply.status(403).send({ error: "Forbidden" });
    if (session.status !== "pending") {
      return reply.status(400).send({ error: "Only pending sessions can be cancelled" });
    }
    await prisma.session.update({ where: { id }, data: { status: "failed" } });
    await prisma.connector.update({
      where: { id: session.connectorId },
      data: { status: "Available" },
    });
    return { ok: true };
  });

  app.post("/sessions/:id/retry", async (req, reply) => {
    const user = await requireAuth(req);
    const { id } = req.params as { id: string };
    const session = await prisma.session.findUnique({
      where: { id },
      include: { connector: { include: { chargePoint: true } } },
    });
    if (!session) return reply.status(404).send({ error: "Session not found" });
    if (session.userId !== user.userId) return reply.status(403).send({ error: "Forbidden" });
    if (session.status !== "pending") {
      return reply.status(400).send({ error: "Only pending sessions can be retried" });
    }
    const result = await remoteStartWithRetry(
      session.connector.chargePoint.ocppId,
      session.connector.connectorNum,
      session.idTag ?? `TAG-${user.email}`
    );
    console.log(`[sessions] POST /sessions/${id}/retry:`, result);
    if (!result.success) {
      const online = await listConnectedChargePoints();
      return reply.status(503).send({
        error: `${result.reason}. Connected: ${online.join(", ") || "none"}`,
      });
    }
    return { sessionId: id, status: "pending" };
  });

  app.get("/sessions/mine/active", async (req) => {
    const user = await requireAuth(req);
    await expireStalePendingSessions(user.userId);

    const sessions = await prisma.session.findMany({
      where: {
        userId: user.userId,
        status: { in: ["pending", "active"] },
      },
      include: {
        connector: { include: { chargePoint: { include: { site: true } } } },
      },
      orderBy: { createdAt: "desc" },
    });

    return sessions.map((s) => ({
      sessionId: s.id,
      connectorId: s.connectorId,
      status: s.status,
      connectorNum: s.connector.connectorNum,
      siteId: s.connector.chargePoint.siteId,
      siteName: s.connector.chargePoint.site.name,
      energyKwh: s.energyKwh,
      allocatedKw: s.allocatedKw,
    }));
  });

  app.get("/sessions/active", async (req) => {
    const user = await requireAuth(req);
    await expireStalePendingSessions(user.userId);
    const { connectorId } = req.query as { connectorId?: string };

    const include = {
      connector: { include: { chargePoint: { include: { site: true } } } },
      meterValues: { orderBy: { timestamp: "desc" as const }, take: 60 },
      transaction: true,
    };

    let session = await prisma.session.findFirst({
      where: {
        userId: user.userId,
        status: { in: ["pending", "active"] },
        ...(connectorId ? { connectorId } : {}),
      },
      include,
      orderBy: { createdAt: "desc" },
    });

    // Nudge stuck pending sessions (charge point may have missed the first remote start)
    if (session?.status === "pending") {
      const ageMs = Date.now() - session.createdAt.getTime();
      if (ageMs > 3_000) {
        const result = await remoteStartWithRetry(
          session.connector.chargePoint.ocppId,
          session.connector.connectorNum,
          session.idTag ?? `TAG-${user.email}`
        );
        console.log(`[sessions] auto-retry pending ${session.id}:`, result);
        if (result.success) {
          await new Promise((r) => setTimeout(r, 800));
          session = await prisma.session.findFirst({
            where: { id: session.id },
            include,
          });
        } else if (ageMs > 30_000) {
          await prisma.session.update({
            where: { id: session.id },
            data: { status: "failed" },
          });
          return null;
        }
      }
    }

    return session;
  });

  app.get("/sessions/history", async (req) => {
    const user = await requireAuth(req);
    const sessions = await prisma.session.findMany({
      where: { userId: user.userId, status: "completed" },
      include: {
        connector: { include: { chargePoint: { include: { site: true } } } },
        transaction: true,
      },
      orderBy: { stoppedAt: "desc" },
      take: 50,
    });
    return sessions;
  });

  app.get("/sessions/:id", async (req, reply) => {
    const user = await requireAuth(req);
    const { id } = req.params as { id: string };
    const session = await prisma.session.findUnique({
      where: { id },
      include: {
        connector: { include: { chargePoint: { include: { site: true } } } },
        meterValues: { orderBy: { timestamp: "asc" } },
        transaction: true,
      },
    });
    if (!session) return reply.status(404).send({ error: "Not found" });
    if (session.userId !== user.userId && user.role !== "ADMIN") {
      return reply.status(403).send({ error: "Forbidden" });
    }
    return session;
  });
}
