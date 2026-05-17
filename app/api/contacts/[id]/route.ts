import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, UNAUTH } from "@/lib/api-auth";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireAuth();
  if (!session) return UNAUTH();
  const contact = await prisma.contact.findUniqueOrThrow({
    where: { id: params.id },
    include: {
      tier: true,
      contactTags: { include: { tag: true } },
      deals: {
        include: {
          stage: true,
          activities: { orderBy: { createdAt: "desc" } },
          tasks: { orderBy: { createdAt: "asc" } },
        },
        orderBy: { updatedAt: "desc" },
      },
    },
  });
  return NextResponse.json(contact);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireAuth();
  if (!session) return UNAUTH();
  const body = await req.json();

  const contact = await prisma.contact.update({
    where: { id: params.id },
    data: {
      ...(body.name !== undefined && { name: body.name }),
      ...(body.email !== undefined && { email: body.email || null }),
      ...(body.phone !== undefined && { phone: body.phone || null }),
      ...(body.telegramUsername !== undefined && { telegramUsername: body.telegramUsername || null }),
      ...(body.twitterHandle !== undefined && { twitterHandle: body.twitterHandle || null }),
      ...(body.companyName !== undefined && { companyName: body.companyName || null }),
      ...(body.pocUsername !== undefined && { pocUsername: body.pocUsername || null }),
      ...(body.groupLink !== undefined && { groupLink: body.groupLink || null }),
      ...(body.logoUrl !== undefined && { logoUrl: body.logoUrl || null }),
      ...(body.status !== undefined && { status: body.status }),
      ...(body.notes !== undefined && { notes: body.notes || null }),
      ...(body.customFields !== undefined && { customFields: body.customFields }),
      ...(body.pocs !== undefined && { pocs: body.pocs }),
      ...(body.tierId !== undefined && (
        body.tierId
          ? { tier: { connect: { id: body.tierId } } }
          : { tier: { disconnect: true } }
      )),
      ...(body.tagIds !== undefined && {
        contactTags: {
          deleteMany: {},
          create: body.tagIds.map((id: string) => ({ tagId: id })),
        },
      }),
    },
    include: { tier: true, contactTags: { include: { tag: true } } },
  });

  return NextResponse.json(contact);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireAuth();
  if (!session) return UNAUTH();
  await prisma.contact.delete({ where: { id: params.id } });
  return new NextResponse(null, { status: 204 });
}
