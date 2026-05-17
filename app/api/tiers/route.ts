import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, UNAUTH } from "@/lib/api-auth";

export async function GET() {
  const session = await requireAuth();
  if (!session) return UNAUTH();

  const tiers = await prisma.tier.findMany({ orderBy: { order: "asc" } });
  return NextResponse.json(tiers);
}
