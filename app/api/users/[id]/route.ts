import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { z } from "zod";

const patchSchema = z.object({
  role: z.enum(["admin", "member"]).optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session || session.role !== "admin")
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });

  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });

  const user = await prisma.user.update({
    where: { id: params.id },
    data: parsed.data,
    select: { id: true, name: true, email: true, role: true },
  });

  if (parsed.data.role) {
    await audit("user_role_change", { userId: session.userId, targetId: params.id, meta: { newRole: parsed.data.role ?? null } });
  }
  return NextResponse.json(user);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session || session.role !== "admin")
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });

  if (params.id === session.userId)
    return NextResponse.json({ error: "Cannot delete your own account" }, { status: 400 });

  const target = await prisma.user.findUnique({ where: { id: params.id }, select: { email: true } });
  await prisma.user.delete({ where: { id: params.id } });
  await audit("user_delete", { userId: session.userId, targetId: params.id, meta: { email: target?.email ?? null } });
  return new NextResponse(null, { status: 204 });
}
