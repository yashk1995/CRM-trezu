import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, UNAUTH } from "@/lib/api-auth";

export async function GET() {
  const session = await requireAuth();
  if (!session) return UNAUTH();

  const lists = await prisma.list.findMany({
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    include: {
      _count: { select: { contacts: true } },
    },
  });
  return NextResponse.json(lists);
}

export async function POST(req: NextRequest) {
  const session = await requireAuth();
  if (!session) return UNAUTH();

  const body = await req.json();
  const maxOrder = await prisma.list.aggregate({ _max: { order: true } });
  const list = await prisma.list.create({
    data: { name: body.name, order: (maxOrder._max.order ?? -1) + 1 },
  });
  return NextResponse.json(list, { status: 201 });
}
