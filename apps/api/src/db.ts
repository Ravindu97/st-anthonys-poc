import { prisma } from "@st-anthonys/database";

export async function waitForDatabase(maxAttempts = 60): Promise<void> {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      await prisma.$queryRaw`SELECT 1`;
      console.log("[db] Connected to PostgreSQL");
      return;
    } catch (err) {
      const msg = (err as Error).message;
      if (i === 0 || i === maxAttempts - 1) {
        console.warn(`[db] Waiting for PostgreSQL (${i + 1}/${maxAttempts})...`);
      }
      if (i === maxAttempts - 1) {
        throw new Error(
          `Cannot reach PostgreSQL. Run: ./scripts/ensure-db.sh\nOriginal: ${msg}`
        );
      }
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
}
