import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, UNAUTH } from "@/lib/api-auth";

export async function GET(req: NextRequest) {
  const session = await requireAuth();
  if (!session) return UNAUTH();

  const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json({ results: [] });

  const mode = "insensitive" as const;

  const [contacts, deals, tasks, activities] = await Promise.all([
    prisma.contact.findMany({
      where: {
        OR: [
          { name:             { contains: q, mode } },
          { companyName:      { contains: q, mode } },
          { email:            { contains: q, mode } },
          { telegramUsername: { contains: q, mode } },
          { twitterHandle:    { contains: q, mode } },
          { pocUsername:      { contains: q, mode } },
        ],
      },
      take: 5,
      select: { id: true, name: true, companyName: true, logoUrl: true, status: true },
    }),

    prisma.deal.findMany({
      where: {
        OR: [
          { latestStatus: { contains: q, mode } },
          { description:  { contains: q, mode } },
          { notes:        { contains: q, mode } },
          { contact: { name:        { contains: q, mode } } },
          { contact: { companyName: { contains: q, mode } } },
        ],
      },
      take: 5,
      select: {
        id: true,
        latestStatus: true,
        contact: { select: { name: true, companyName: true, logoUrl: true } },
        stage:   { select: { name: true, color: true } },
      },
    }),

    prisma.task.findMany({
      where: { title: { contains: q, mode } },
      take: 5,
      select: {
        id: true, title: true, completed: true,
        deal: { select: { id: true, contact: { select: { name: true, companyName: true } } } },
      },
    }),

    prisma.activity.findMany({
      where: {
        body:   { contains: q, mode },
        dealId: { not: null },
      },
      take: 5,
      orderBy: { createdAt: "desc" },
      select: {
        id: true, type: true, body: true,
        deal: { select: { id: true, contact: { select: { name: true, companyName: true } } } },
      },
    }),
  ]);

  const results = [
    ...contacts.map((c) => ({
      type: "contact" as const,
      id:    c.id,
      title: c.companyName || c.name,
      sub:   c.companyName ? `POC · ${c.name}` : c.status.replace(/_/g, " "),
      href:  `/contacts/${c.id}`,
      logoUrl: c.logoUrl ?? undefined,
    })),

    ...deals.map((d) => ({
      type:  "deal" as const,
      id:    d.id,
      title: d.contact.companyName || d.contact.name,
      sub:   [d.stage?.name, d.latestStatus].filter(Boolean).join(" · ") || "Pipeline deal",
      href:  `/pipeline?openDeal=${d.id}`,
      logoUrl: d.contact.logoUrl ?? undefined,
      stageColor: d.stage?.color,
    })),

    ...tasks.map((t) => ({
      type:  "task" as const,
      id:    t.id,
      title: t.title,
      sub:   t.deal ? (t.deal.contact.companyName || t.deal.contact.name) : "",
      href:  t.deal ? `/pipeline?openDeal=${t.deal.id}` : "/tasks",
    })),

    ...activities.map((a) => ({
      type:  a.type as string,
      id:    a.id,
      title: (a.body ?? "").slice(0, 80) || `${a.type} activity`,
      sub:   a.deal ? (a.deal.contact.companyName || a.deal.contact.name) : "",
      href:  a.deal ? `/pipeline?openDeal=${a.deal.id}` : "/pipeline",
    })),
  ];

  return NextResponse.json({ results });
}
