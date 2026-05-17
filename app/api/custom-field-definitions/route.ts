import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, UNAUTH } from "@/lib/api-auth";

export async function GET(req: NextRequest) {
  const session = await requireAuth();
  if (!session) return UNAUTH();

  const appliesTo = new URL(req.url).searchParams.get("appliesTo");
  const defs = await prisma.customFieldDefinition.findMany({
    where: appliesTo ? { appliesTo } : undefined,
    orderBy: [{ appliesTo: "asc" }, { order: "asc" }],
  });
  return NextResponse.json(defs);
}

export async function POST(req: NextRequest) {
  const session = await requireAuth();
  if (!session) return UNAUTH();

  const body = await req.json();
  const last = await prisma.customFieldDefinition.findFirst({
    where: { appliesTo: body.appliesTo },
    orderBy: { order: "desc" },
  });
  const def = await prisma.customFieldDefinition.create({
    data: {
      name: body.name,
      fieldType: body.fieldType,
      appliesTo: body.appliesTo,
      options: body.options ?? [],
      order: (last?.order ?? 0) + 1,
    },
  });
  return NextResponse.json(def, { status: 201 });
}
