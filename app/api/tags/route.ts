import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const tags = await prisma.tag.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json(tags);
}

export async function POST(req: NextRequest) {
  const { name, color } = await req.json();
  const tag = await prisma.tag.create({ data: { name, color: color ?? "#6366f1" } });
  return NextResponse.json(tag, { status: 201 });
}
