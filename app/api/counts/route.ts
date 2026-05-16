import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const [contacts, deals, pendingTasks] = await Promise.all([
    prisma.contact.count(),
    prisma.deal.count(),
    prisma.task.count({ where: { completed: false } }),
  ]);
  return NextResponse.json({ contacts, deals, pendingTasks });
}
