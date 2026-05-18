import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, UNAUTH } from "@/lib/api-auth";

export async function PATCH(req: NextRequest) {
  const session = await requireAuth();
  if (!session) return UNAUTH();

  const { ids }: { ids: string[] } = await req.json();
  if (!Array.isArray(ids)) return NextResponse.json({ error: "ids required" }, { status: 400 });

  await prisma.$transaction(
    ids.map((id, index) => prisma.list.update({ where: { id }, data: { order: index } }))
  );

  return NextResponse.json({ ok: true });
}
