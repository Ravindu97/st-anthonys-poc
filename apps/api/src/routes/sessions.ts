import type { FastifyInstance } from "fastify";
import { prisma } from "@st-anthonys/database";
import { DEFAULT_TARIFF_LKR_PER_KWH, StartSessionRequestSchema } from "@st-anthonys/shared";
import { requireAuth } from "../auth.js";
import { remoteStart, remoteStop } from "../ocpp-client.js";
import { rebalanceHub } from "../load-balancer.js";

export async function sessionRoutes(app: FastifyInstance) {
  app.post("/sessions/start", async (req, reply) => {
    const user = await requireAuth(req);
    const { connectorId } = StartSessionRequestSchema.parse(req.body);

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
    if (connector.sessions.length > 0) {
      return reply.status(400).send({ error: "Connector already has an active session" });
    }

    const session = await prisma.session.create({
      data: {
        userId: user.userId,
        connectorId,
        status: "pending",
        idTag: `TAG-${user.email}`,
      },
    });

    let started = false;
    try {
      started = await remoteStart(
        connector.chargePoint.ocppId,
        connector.connectorNum,
        `TAG-${user.email}`
      );
    } catch {
      started = false;
    }

    if (!started) {
      await prisma.session.update({ where: { id: session.id }, data: { status: "failed" } });
      return reply.status(503).send({ error: "Could not reach charge point — ensure OCPP gateway and simulator are running" });
    }

    await prisma.connector.update({ where: { id: connectorId }, data: { status: "Occupied" } });
    await rebalanceHub(connector.chargePoint.siteId);

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

  app.get("/sessions/active", async (req) => {
    const user = await requireAuth(req);
    const session = await prisma.session.findFirst({
      where: { userId: user.userId, status: { in: ["pending", "active"] } },
      include: {
        connector: { include: { chargePoint: { include: { site: true } } } },
        meterValues: { orderBy: { timestamp: "desc" }, take: 60 },
        transaction: true,
      },
      orderBy: { createdAt: "desc" },
    });
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
