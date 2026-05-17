import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, UNAUTH } from "@/lib/api-auth";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireAuth();
  if (!session) return UNAUTH();
  const body = await req.json();
  const task = await prisma.task.update({
    where: { id: params.id },
    data: {
      ...(body.title     !== undefined && { title:     body.title }),
      ...(body.completed !== undefined && { completed: body.completed }),
      ...(body.dueAt     !== undefined && { dueAt: body.dueAt ? new Date(body.dueAt) : null }),
    },
    include: {
      deal: {
        include: {
          contact: { select: { id: true, name: true, telegramUsername: true } },
          stage: { select: { id: true, name: true, color: true } },
        },
      },
    },
  });
  return NextResponse.json(task);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireAuth();
  if (!session) return UNAUTH();
  await prisma.task.delete({ where: { id: params.id } });
  return new NextResponse(null, { status: 204 });
}
