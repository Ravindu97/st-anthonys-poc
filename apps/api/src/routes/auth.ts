import type { FastifyInstance } from "fastify";
import { prisma } from "@st-anthonys/database";
import { LoginRequestSchema, RegisterRequestSchema } from "@st-anthonys/shared";
import { hashPassword, signToken } from "../auth.js";

export async function authRoutes(app: FastifyInstance) {
  app.post("/auth/register", async (req, reply) => {
    const body = RegisterRequestSchema.parse(req.body);
    const existing = await prisma.user.findUnique({ where: { email: body.email } });
    if (existing) return reply.status(409).send({ error: "Email already registered" });

    const user = await prisma.user.create({
      data: {
        email: body.email,
        passwordHash: hashPassword(body.password),
        name: body.name,
        role: "DRIVER",
      },
    });

    const token = await signToken({ userId: user.id, email: user.email, role: user.role });
    return { token, user: { id: user.id, email: user.email, name: user.name, role: user.role } };
  });

  app.post("/auth/login", async (req, reply) => {
    const body = LoginRequestSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email: body.email } });
    if (!user || user.passwordHash !== hashPassword(body.password)) {
      return reply.status(401).send({ error: "Invalid credentials" });
    }

    const token = await signToken({ userId: user.id, email: user.email, role: user.role });
    return { token, user: { id: user.id, email: user.email, name: user.name, role: user.role } };
  });
}
