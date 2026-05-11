import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const deals = await prisma.deal.findMany({
    include: {
      contact: { include: { tier: true, contactTags: { include: { tag: true } } } },
      stage: true,
    },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(deals);
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  const deal = await prisma.deal.create({
    data: {
      contact: { connect: { id: body.contactId } },
      notes: body.notes || null,
      callDate: body.callDate ? new Date(body.callDate) : null,
      meetLink: body.meetLink || null,
      ...(body.stageId ? { stage: { connect: { id: body.stageId } } } : {}),
    },
    include: {
      contact: { include: { tier: true, contactTags: { include: { tag: true } } } },
      stage: true,
    },
  });

  return NextResponse.json(deal, { status: 201 });
}
