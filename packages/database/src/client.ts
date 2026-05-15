import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";

function loadDatabaseEnv() {
  if (process.env.DATABASE_URL) return;
  const candidates = [
    resolve(process.cwd(), ".env"),
    resolve(process.cwd(), "../../.env"),
    resolve(__dirname, "../../../.env"),
    resolve(__dirname, "../../.env"),
  ];
  for (const path of candidates) {
    if (existsSync(path)) {
      config({ path });
      if (process.env.DATABASE_URL) return;
    }
  }
}

loadDatabaseEnv();

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
