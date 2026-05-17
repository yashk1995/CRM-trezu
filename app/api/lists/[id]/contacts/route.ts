import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, UNAUTH } from "@/lib/api-auth";

const OUTREACH_STATUSES = ["not_contacted", "dm_sent", "rejected"];

const OUTREACH_STAGE_LABELS: Record<string, string> = {
  not_contacted: "Not Contacted",
  dm_sent: "DM Sent",
  rejected: "Rejected",
};

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireAuth();
  if (!session) return UNAUTH();
  const listContacts = await prisma.listContact.findMany({
    where: { listId: params.id },
    orderBy: { addedAt: "asc" },
    include: {
      contact: {
        include: {
          tier: true,
          contactTags: { include: { tag: true } },
          deals: {
            include: {
              stage: true,
              owner: { select: { id: true, name: true } },
            },
            orderBy: { updatedAt: "desc" },
          },
        },
      },
    },
  });

  const result = listContacts.map(({ contact, addedAt }) => {
    const isOutreach = OUTREACH_STATUSES.includes(contact.status);
    const source = isOutreach ? "outreach" : "pipeline";

    let stageLabel: string;
    if (isOutreach) {
      stageLabel = OUTREACH_STAGE_LABELS[contact.status] ?? contact.status;
    } else {
      const latestDeal = contact.deals[0];
      stageLabel = latestDeal?.stage?.name ?? "In Pipeline";
    }

    return {
      addedAt,
      source,
      stageLabel,
      contact,
    };
  });

  return NextResponse.json(result);
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireAuth();
  if (!session) return UNAUTH();
  const body = await req.json();
  const { contactId } = body;

  // If already exists, return 200 silently
  const existing = await prisma.listContact.findUnique({
    where: { listId_contactId: { listId: params.id, contactId } },
  });
  if (existing) return NextResponse.json(existing);

  const listContact = await prisma.listContact.create({
    data: { listId: params.id, contactId },
  });
  return NextResponse.json(listContact, { status: 201 });
}
