import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const stage = await prisma.pipelineStage.update({
    where: { id: params.id },
    data: {
      ...(body.name  !== undefined && { name: body.name }),
      ...(body.color !== undefined && { color: body.color }),
      ...(body.order !== undefined && { order: body.order }),
    },
  });
  return NextResponse.json(stage);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  await prisma.pipelineStage.delete({ where: { id: params.id } });
  return new NextResponse(null, { status: 204 });
}
