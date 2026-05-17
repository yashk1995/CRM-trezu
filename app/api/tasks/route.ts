import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, UNAUTH } from "@/lib/api-auth";

export async function GET(req: NextRequest) {
  const session = await requireAuth();
  if (!session) return UNAUTH();

  const completed = req.nextUrl.searchParams.get("completed") === "true";
  const tasks = await prisma.task.findMany({
    where: { completed },
    include: {
      deal: {
        include: {
          contact: { select: { id: true, name: true, telegramUsername: true } },
          stage: { select: { id: true, name: true, color: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(tasks);
}

export async function POST(req: NextRequest) {
  const session = await requireAuth();
  if (!session) return UNAUTH();

  const { title, dealId, dueAt } = await req.json();
  const task = await prisma.task.create({
    data: { title, dealId, dueAt: dueAt ? new Date(dueAt) : null },
    include: {
      deal: {
        include: {
          contact: { select: { id: true, name: true, telegramUsername: true } },
          stage: { select: { id: true, name: true, color: true } },
        },
      },
    },
  });
  return NextResponse.json(task, { status: 201 });
}
