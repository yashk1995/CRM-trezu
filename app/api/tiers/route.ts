import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const tiers = await prisma.tier.findMany({ orderBy: { order: "asc" } });
  return NextResponse.json(tiers);
}
