import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { type, body: activityBody } = await req.json();

  const activity = await prisma.activity.create({
    data: {
      type: type ?? "note",
      body: activityBody,
      dealId: params.id,
    },
  });

  return NextResponse.json(activity, { status: 201 });
}
