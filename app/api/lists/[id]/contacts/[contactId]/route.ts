import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string; contactId: string } }
) {
  await prisma.listContact.delete({
    where: {
      listId_contactId: { listId: params.id, contactId: params.contactId },
    },
  });
  return new NextResponse(null, { status: 204 });
}
