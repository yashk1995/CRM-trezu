import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.tier.upsert({ where: { label: "T1" }, update: {}, create: { label: "T1", order: 1 } });
  await prisma.tier.upsert({ where: { label: "T2" }, update: {}, create: { label: "T2", order: 2 } });
  await prisma.tier.upsert({ where: { label: "T3" }, update: {}, create: { label: "T3", order: 3 } });

  await prisma.pipelineStage.upsert({ where: { name: "Replied" }, update: {}, create: { name: "Replied", order: 1, color: "#6366f1" } });
  await prisma.pipelineStage.upsert({ where: { name: "Call Scheduled" }, update: {}, create: { name: "Call Scheduled", order: 2, color: "#f59e0b" } });
  await prisma.pipelineStage.upsert({ where: { name: "Closed Won" }, update: {}, create: { name: "Closed Won", order: 3, color: "#10b981" } });
  await prisma.pipelineStage.upsert({ where: { name: "Closed Lost" }, update: {}, create: { name: "Closed Lost", order: 4, color: "#ef4444" } });

  console.log("Seeded tiers and pipeline stages.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
