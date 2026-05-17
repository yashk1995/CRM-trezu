import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, UNAUTH } from "@/lib/api-auth";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string; contactId: string } }
) {
  const session = await requireAuth();
  if (!session) return UNAUTH();
  await prisma.listContact.delete({
    where: {
      listId_contactId: { listId: params.id, contactId: params.contactId },
    },
  });
  return new NextResponse(null, { status: 204 });
}
