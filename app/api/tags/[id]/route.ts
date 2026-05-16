import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { name, color } = await req.json();
  const tag = await prisma.tag.update({
    where: { id: params.id },
    data: {
      ...(name  !== undefined && { name }),
      ...(color !== undefined && { color }),
    },
  });
  return NextResponse.json(tag);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  await prisma.tag.delete({ where: { id: params.id } });
  return new NextResponse(null, { status: 204 });
}
