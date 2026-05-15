import { createHash } from "crypto";
import { SignJWT, jwtVerify } from "jose";
import type { FastifyRequest } from "fastify";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? "change-me-in-production-poc-only"
);

export function hashPassword(password: string): string {
  return createHash("sha256").update(password + "st-anthonys-poc-salt").digest("hex");
}

export async function signToken(payload: { userId: string; email: string; role: string }) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(JWT_SECRET);
}

export async function verifyToken(token: string) {
  const { payload } = await jwtVerify(token, JWT_SECRET);
  return payload as { userId: string; email: string; role: string };
}

export async function getUserFromRequest(req: FastifyRequest) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) return null;
  try {
    return await verifyToken(auth.slice(7));
  } catch {
    return null;
  }
}

export async function requireAuth(req: FastifyRequest) {
  const user = await getUserFromRequest(req);
  if (!user) throw { statusCode: 401, message: "Unauthorized" };
  return user;
}

export async function requireAdmin(req: FastifyRequest) {
  const user = await requireAuth(req);
  if (user.role !== "ADMIN") throw { statusCode: 403, message: "Admin only" };
  return user;
}
