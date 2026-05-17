import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, UNAUTH } from "@/lib/api-auth";

export async function GET() {
  const session = await requireAuth();
  if (!session) return UNAUTH();

  const [contacts, deals, pendingTasks] = await Promise.all([
    prisma.contact.count(),
    prisma.deal.count(),
    prisma.task.count({ where: { completed: false } }),
  ]);
  return NextResponse.json({ contacts, deals, pendingTasks });
}
