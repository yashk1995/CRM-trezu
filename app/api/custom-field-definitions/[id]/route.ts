import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, UNAUTH } from "@/lib/api-auth";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireAuth();
  if (!session) return UNAUTH();
  const body = await req.json();
  const def = await prisma.customFieldDefinition.update({
    where: { id: params.id },
    data: {
      ...(body.name !== undefined && { name: body.name }),
      ...(body.order !== undefined && { order: body.order }),
      ...(body.options !== undefined && { options: body.options }),
    },
  });
  return NextResponse.json(def);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireAuth();
  if (!session) return UNAUTH();
  await prisma.customFieldDefinition.delete({ where: { id: params.id } });
  return new NextResponse(null, { status: 204 });
}
