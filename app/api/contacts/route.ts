import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const section = searchParams.get("section");
  const search = searchParams.get("search") || "";
  const tierId = searchParams.get("tierId");
  const tagId = searchParams.get("tagId");
  const status = searchParams.get("status");

  const OUTREACH = ["not_contacted", "dm_sent", "rejected"];

  const contacts = await prisma.contact.findMany({
    where: {
      ...(section === "outreach" && { status: { in: OUTREACH } }),
      ...(section === "pipeline" && { status: { notIn: OUTREACH } }),
      ...(status && { status }),
      ...(tierId && { tierId }),
      ...(tagId && { contactTags: { some: { tagId } } }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { companyName: { contains: search, mode: "insensitive" } },
          { telegramUsername: { contains: search, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } },
        ],
      }),
    },
    include: {
      tier: true,
      contactTags: { include: { tag: true } },
      _count: { select: { deals: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(contacts);
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  const contact = await prisma.contact.create({
    data: {
      name: body.name,
      email: body.email || null,
      phone: body.phone || null,
      telegramUsername: body.telegramUsername || null,
      twitterHandle: body.twitterHandle || null,
      companyName: body.companyName || null,
      pocUsername: body.pocUsername || null,
      groupLink: body.groupLink || null,
      logoUrl: body.logoUrl || null,
      status: body.status ?? "not_contacted",
      notes: body.notes || null,
      ...(body.tierId ? { tier: { connect: { id: body.tierId } } } : {}),
      ...(body.tagIds?.length
        ? { contactTags: { create: body.tagIds.map((id: string) => ({ tagId: id })) } }
        : {}),
    },
    include: { tier: true, contactTags: { include: { tag: true } } },
  });

  return NextResponse.json(contact, { status: 201 });
}
