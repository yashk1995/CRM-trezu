import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const stages = await prisma.pipelineStage.findMany({ orderBy: { order: "asc" } });
  return NextResponse.json(stages);
}
