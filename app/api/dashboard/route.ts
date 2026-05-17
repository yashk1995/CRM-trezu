import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, UNAUTH } from "@/lib/api-auth";

export async function GET() {
  const session = await requireAuth();
  if (!session) return UNAUTH();

  const [
    totalContacts,
    contactsByStatus,
    stages,
    dealsByStage,
    pendingTasks,
    completedTasks,
    recentActivities,
  ] = await Promise.all([
    prisma.contact.count(),
    prisma.contact.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.pipelineStage.findMany({ orderBy: { order: "asc" } }),
    prisma.deal.groupBy({ by: ["stageId"], _count: { _all: true } }),
    prisma.task.count({ where: { completed: false } }),
    prisma.task.count({ where: { completed: true } }),
    prisma.activity.findMany({
      take: 12,
      orderBy: { createdAt: "desc" },
      include: {
        deal: {
          include: {
            contact: { select: { id: true, name: true, companyName: true, logoUrl: true } },
          },
        },
      },
    }),
  ]);

  const stageMap = Object.fromEntries(stages.map((s) => [s.id, s]));
  const pipeline = stages.map((s) => ({
    ...s,
    dealCount: dealsByStage.find((d) => d.stageId === s.id)?._count._all ?? 0,
  }));

  const statusMap: Record<string, number> = {};
  for (const row of contactsByStatus) statusMap[row.status] = row._count._all;

  return NextResponse.json({
    totalContacts,
    statusMap,
    pipeline,
    pendingTasks,
    completedTasks,
    recentActivities,
  });
}
