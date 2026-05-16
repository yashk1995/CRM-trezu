import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const stages = await prisma.pipelineStage.findMany({ orderBy: { order: "asc" } });
  return NextResponse.json(stages);
}

export async function POST(req: NextRequest) {
  const { name, color } = await req.json();
  const last = await prisma.pipelineStage.findFirst({ orderBy: { order: "desc" } });
  const stage = await prisma.pipelineStage.create({
    data: { name, color: color ?? "#6366f1", order: (last?.order ?? 0) + 1 },
  });
  return NextResponse.json(stage, { status: 201 });
}
