import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, UNAUTH } from "@/lib/api-auth";

export async function GET(request: Request) {
  const session = await requireAuth();
  if (!session) return UNAUTH();

  const { searchParams } = new URL(request.url);
  const rangeParam = parseInt(searchParams.get("range") ?? "7");
  // 0 = all time; otherwise clamp to 1–90 days
  const range = rangeParam === 0 ? 0 : Math.min(Math.max(rangeParam, 1), 90);
  const since = range > 0 ? new Date(Date.now() - range * 24 * 60 * 60 * 1000) : null;
  const periodWhere = since ? { gte: since } : undefined;

  const [
    totalContacts,
    contactsByStatus,
    stages,
    dealsByStage,
    pendingTasks,
    completedTasks,
    recentActivities,
    newContacts,
    newDeals,
    completedTasksInPeriod,
    activitiesInPeriod,
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
      where: periodWhere ? { createdAt: periodWhere } : undefined,
      include: {
        deal: {
          include: {
            contact: { select: { id: true, name: true, companyName: true, logoUrl: true } },
          },
        },
      },
    }),
    prisma.contact.count({ where: periodWhere ? { createdAt: periodWhere } : undefined }),
    prisma.deal.count({ where: periodWhere ? { createdAt: periodWhere } : undefined }),
    prisma.task.count({ where: { completed: true, ...(periodWhere ? { updatedAt: periodWhere } : {}) } }),
    prisma.activity.count({ where: periodWhere ? { createdAt: periodWhere } : undefined }),
  ]);

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
    period: {
      range,
      newContacts,
      newDeals,
      completedTasks: completedTasksInPeriod,
      activities: activitiesInPeriod,
    },
  });
}
