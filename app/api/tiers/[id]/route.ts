import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { label } = await req.json();
  const tier = await prisma.tier.update({ where: { id: params.id }, data: { label } });
  return NextResponse.json(tier);
}
