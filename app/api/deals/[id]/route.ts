import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, UNAUTH } from "@/lib/api-auth";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireAuth();
  if (!session) return UNAUTH();
  const deal = await prisma.deal.findUniqueOrThrow({
    where: { id: params.id },
    include: {
      contact: {
        include: {
          tier: true,
          contactTags: { include: { tag: true } },
          deals: {
            include: { stage: true },
            orderBy: { updatedAt: "desc" },
            take: 5,
          },
        },
      },
      stage: true,
      activities: { orderBy: { createdAt: "asc" } },
      tasks: { orderBy: { createdAt: "asc" } },
    },
  });
  return NextResponse.json(deal);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireAuth();
  if (!session) return UNAUTH();
  const body = await req.json();

  const deal = await prisma.deal.update({
    where: { id: params.id },
    data: {
      ...(body.notes !== undefined && { notes: body.notes || null }),
      ...(body.description !== undefined && { description: body.description || null }),
      ...(body.latestStatus !== undefined && { latestStatus: body.latestStatus || null }),
      ...(body.callDate !== undefined && { callDate: body.callDate ? new Date(body.callDate) : null }),
      ...(body.meetLink !== undefined && { meetLink: body.meetLink || null }),
      ...(body.customFields !== undefined && { customFields: body.customFields }),
      ...(body.stageId !== undefined && (
        body.stageId
          ? { stage: { connect: { id: body.stageId } } }
          : { stage: { disconnect: true } }
      )),
    },
    include: {
      contact: { include: { tier: true, contactTags: { include: { tag: true } } } },
      stage: true,
      activities: { orderBy: { createdAt: "asc" } },
    },
  });

  return NextResponse.json(deal);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireAuth();
  if (!session) return UNAUTH();
  const deal = await prisma.deal.findUniqueOrThrow({ where: { id: params.id }, select: { contactId: true } });
  await prisma.deal.delete({ where: { id: params.id } });
  const remaining = await prisma.deal.count({ where: { contactId: deal.contactId } });
  if (remaining === 0) {
    await prisma.contact.update({ where: { id: deal.contactId }, data: { status: "not_contacted" } });
  }
  return new NextResponse(null, { status: 204 });
}
