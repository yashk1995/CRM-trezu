import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, UNAUTH } from "@/lib/api-auth";
import { z } from "zod";

const contactSchema = z.object({
  name:            z.string().trim().min(1, "Name is required").max(200),
  companyName:     z.string().trim().max(200).nullish(),
  email:           z.union([z.string().trim().email(), z.literal(""), z.null()]).optional().transform(v => v || null),
  phone:           z.string().trim().max(50).nullish(),
  telegramUsername:z.string().trim().max(100).nullish(),
  twitterHandle:   z.string().trim().max(100).nullish(),
  pocUsername:     z.string().trim().max(100).nullish(),
  groupLink:       z.union([z.string().trim().url(), z.literal(""), z.null()]).optional().transform(v => v || null),
  status:          z.enum(["not_contacted","dm_sent","rejected","in_pipeline"]).optional(),
  tierId:          z.string().nullish(),
  tagIds:          z.array(z.string()).optional(),
  notes:           z.string().max(10000).nullish(),
  customFields:    z.record(z.string(), z.string()).optional(),
  logoUrl:         z.string().nullish(),
});

export async function GET(req: NextRequest) {
  const session = await requireAuth();
  if (!session) return UNAUTH();

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
  const session = await requireAuth();
  if (!session) return UNAUTH();

  const raw  = await req.json();
  const parsed = contactSchema.safeParse(raw);
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  const body = parsed.data;

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
      customFields: (body.customFields ?? {}) as object,
      ...(body.tierId ? { tier: { connect: { id: body.tierId } } } : {}),
      ...(body.tagIds?.length
        ? { contactTags: { create: body.tagIds.map((id: string) => ({ tagId: id })) } }
        : {}),
    },
    include: { tier: true, contactTags: { include: { tag: true } } },
  });

  return NextResponse.json(contact, { status: 201 });
}
