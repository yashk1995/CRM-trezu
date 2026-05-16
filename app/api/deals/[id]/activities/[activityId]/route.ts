import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest, { params }: { params: { activityId: string } }) {
  const { body, attachments } = await req.json();
  const activity = await prisma.activity.update({
    where: { id: params.activityId },
    data: {
      ...(body       !== undefined && { body }),
      ...(attachments !== undefined && { attachments }),
    },
  });
  return NextResponse.json(activity);
}

export async function DELETE(_req: NextRequest, { params }: { params: { activityId: string } }) {
  await prisma.activity.delete({ where: { id: params.activityId } });
  return new NextResponse(null, { status: 204 });
}
