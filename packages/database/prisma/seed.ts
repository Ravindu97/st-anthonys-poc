import { PrismaClient } from "@prisma/client";
import { createHash } from "crypto";
import { DEFAULT_TARIFF_LKR_PER_KWH, ORG_NAME, SEED_SITES } from "@st-anthonys/shared";

const prisma = new PrismaClient();

function hashPassword(password: string): string {
  return createHash("sha256").update(password + "st-anthonys-poc-salt").digest("hex");
}

async function main() {
  await prisma.offlineQueue.deleteMany();
  await prisma.meterValue.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.session.deleteMany();
  await prisma.connector.deleteMany();
  await prisma.chargePoint.deleteMany();
  await prisma.hub.deleteMany();
  await prisma.site.deleteMany();
  await prisma.user.deleteMany();
  await prisma.organization.deleteMany();

  const org = await prisma.organization.create({
    data: { name: ORG_NAME },
  });

  await prisma.user.createMany({
    data: [
      {
        email: "driver@demo.lk",
        passwordHash: hashPassword("demo1234"),
        name: "Demo Driver",
        role: "DRIVER",
      },
      {
        email: "admin@stanthonys.lk",
        passwordHash: hashPassword("admin1234"),
        name: "Network Admin",
        role: "ADMIN",
      },
    ],
  });

  for (const siteData of SEED_SITES) {
    const site = await prisma.site.create({
      data: {
        name: siteData.name,
        city: siteData.city,
        address: siteData.address,
        latitude: siteData.latitude,
        longitude: siteData.longitude,
        organizationId: org.id,
        hub: {
          create: {
            name: `${siteData.city} Hub`,
            maxHubKw: siteData.hubMaxKw,
          },
        },
      },
      include: { hub: true },
    });

    for (const cp of siteData.chargePoints) {
      const chargePoint = await prisma.chargePoint.create({
        data: {
          ocppId: cp.ocppId,
          model: cp.model,
          maxKw: cp.maxKw,
          status: "Offline",
          siteId: site.id,
        },
      });

      for (let i = 1; i <= cp.connectors; i++) {
        await prisma.connector.create({
          data: {
            connectorNum: i,
            status: "Available",
            chargePointId: chargePoint.id,
          },
        });
      }
    }
  }

  console.log("Seed complete:");
  console.log("  Driver: driver@demo.lk / demo1234");
  console.log("  Admin:  admin@stanthonys.lk / admin1234");
  console.log(`  Tariff: LKR ${DEFAULT_TARIFF_LKR_PER_KWH}/kWh`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
