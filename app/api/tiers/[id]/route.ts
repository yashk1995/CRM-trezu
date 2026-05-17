import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, UNAUTH } from "@/lib/api-auth";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireAuth();
  if (!session) return UNAUTH();
  const { label } = await req.json();
  const tier = await prisma.tier.update({ where: { id: params.id }, data: { label } });
  return NextResponse.json(tier);
}
