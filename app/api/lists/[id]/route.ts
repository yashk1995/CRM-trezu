import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, UNAUTH } from "@/lib/api-auth";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireAuth();
  if (!session) return UNAUTH();
  const list = await prisma.list.findUnique({
    where: { id: params.id },
    include: {
      _count: { select: { contacts: true } },
    },
  });
  if (!list) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(list);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireAuth();
  if (!session) return UNAUTH();
  const body = await req.json();
  const list = await prisma.list.update({
    where: { id: params.id },
    data: { name: body.name },
  });
  return NextResponse.json(list);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireAuth();
  if (!session) return UNAUTH();
  await prisma.list.delete({ where: { id: params.id } });
  return new NextResponse(null, { status: 204 });
}
