import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const deal = await prisma.deal.findUniqueOrThrow({
    where: { id: params.id },
    include: {
      contact: { include: { tier: true, contactTags: { include: { tag: true } } } },
      stage: true,
      activities: { orderBy: { createdAt: "asc" } },
    },
  });
  return NextResponse.json(deal);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();

  const deal = await prisma.deal.update({
    where: { id: params.id },
    data: {
      ...(body.notes !== undefined && { notes: body.notes || null }),
      ...(body.description !== undefined && { description: body.description || null }),
      ...(body.latestStatus !== undefined && { latestStatus: body.latestStatus || null }),
      ...(body.callDate !== undefined && { callDate: body.callDate ? new Date(body.callDate) : null }),
      ...(body.meetLink !== undefined && { meetLink: body.meetLink || null }),
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
  await prisma.deal.delete({ where: { id: params.id } });
  return new NextResponse(null, { status: 204 });
}
