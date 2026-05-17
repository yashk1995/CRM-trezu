import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, UNAUTH } from "@/lib/api-auth";

export async function GET() {
  const session = await requireAuth();
  if (!session) return UNAUTH();

  const deals = await prisma.deal.findMany({
    select: {
      id: true, notes: true, description: true, latestStatus: true,
      callDate: true, meetLink: true, stageId: true, customFields: true,
      createdAt: true, updatedAt: true,
      contact: {
        select: {
          id: true, name: true, companyName: true, pocUsername: true,
          logoUrl: true, telegramUsername: true, twitterHandle: true, email: true,
          tier: { select: { id: true, label: true } },
          contactTags: { select: { tag: { select: { id: true, name: true, color: true } } } },
        },
      },
      stage: true,
      owner: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(deals);
}

export async function POST(req: NextRequest) {
  const session = await requireAuth();
  if (!session) return UNAUTH();

  const body = await req.json();

  const deal = await prisma.deal.create({
    data: {
      contact: { connect: { id: body.contactId } },
      notes:    body.notes || null,
      callDate: body.callDate ? new Date(body.callDate) : null,
      meetLink: body.meetLink || null,
      owner: { connect: { id: body.ownerId ?? session.userId } },
      ...(body.stageId ? { stage: { connect: { id: body.stageId } } } : {}),
    },
    select: {
      id: true, notes: true, description: true, latestStatus: true,
      callDate: true, meetLink: true, stageId: true, customFields: true,
      createdAt: true, updatedAt: true,
      contact: {
        select: {
          id: true, name: true, companyName: true, pocUsername: true,
          logoUrl: true, telegramUsername: true, twitterHandle: true, email: true,
          tier: { select: { id: true, label: true } },
          contactTags: { select: { tag: { select: { id: true, name: true, color: true } } } },
        },
      },
      stage: true,
      owner: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json(deal, { status: 201 });
}
