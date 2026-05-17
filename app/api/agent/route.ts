import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";
import { requireAuth, UNAUTH } from "@/lib/api-auth";
import { checkRateLimit } from "@/lib/rate-limit";

const AGENT_MAX_QUERIES = 5;
const AGENT_WINDOW_MS   = 3 * 60 * 60 * 1000; // 3 hours

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ── Tool definitions ──────────────────────────────────────────────────────────

const tools: Anthropic.Tool[] = [
  {
    name: "get_summary",
    description: "Get high-level CRM stats: total contacts by status, pipeline stage counts, pending/overdue tasks.",
    input_schema: { type: "object" as const, properties: {}, required: [] },
  },
  {
    name: "search_contacts",
    description: "Search contacts by name, company name, or telegram username. Optionally filter by status or tier label.",
    input_schema: {
      type: "object" as const,
      properties: {
        query:  { type: "string", description: "Search term (name, company, telegram handle)" },
        status: { type: "string", enum: ["not_contacted", "dm_sent", "rejected", "in_pipeline"], description: "Filter by status" },
        tier:   { type: "string", description: "Filter by tier label e.g. T1, T2" },
        limit:  { type: "number", description: "Max results (default 15)" },
      },
    },
  },
  {
    name: "get_deals",
    description: "Get pipeline deals with their contact, stage, owner, and latest status.",
    input_schema: {
      type: "object" as const,
      properties: {
        stage_name: { type: "string", description: "Filter by stage name (partial match)" },
        owner_name: { type: "string", description: "Filter by owner name" },
        limit:      { type: "number", description: "Max results (default 20)" },
      },
    },
  },
  {
    name: "get_tasks",
    description: "Get tasks. Can filter by completion status or only return overdue tasks.",
    input_schema: {
      type: "object" as const,
      properties: {
        completed:   { type: "boolean", description: "true for completed tasks, false for pending (default false)" },
        overdue_only:{ type: "boolean", description: "Return only overdue pending tasks" },
        limit:       { type: "number", description: "Max results (default 20)" },
      },
    },
  },
  {
    name: "get_recent_activity",
    description: "Get the most recent activity log entries across all deals.",
    input_schema: {
      type: "object" as const,
      properties: {
        limit: { type: "number", description: "Number of entries (default 15)" },
      },
    },
  },
];

// ── Tool execution ────────────────────────────────────────────────────────────

async function runTool(name: string, input: Record<string, unknown>): Promise<unknown> {
  switch (name) {
    case "get_summary": {
      const [statusGroups, stages, pendingTasks, overdueTasks, totalDeals] = await Promise.all([
        prisma.contact.groupBy({ by: ["status"], _count: { _all: true } }),
        prisma.pipelineStage.findMany({
          include: { _count: { select: { deals: true } } },
          orderBy: { order: "asc" },
        }),
        prisma.task.count({ where: { completed: false } }),
        prisma.task.count({ where: { completed: false, dueAt: { lt: new Date() } } }),
        prisma.deal.count(),
      ]);
      return {
        contacts: Object.fromEntries(statusGroups.map((g) => [g.status, g._count._all])),
        pipeline: stages.map((s) => ({ stage: s.name, deals: s._count.deals })),
        totalDeals,
        pendingTasks,
        overdueTasks,
      };
    }

    case "search_contacts": {
      const { query, status, tier, limit = 15 } = input as {
        query?: string; status?: string; tier?: string; limit?: number;
      };
      const contacts = await prisma.contact.findMany({
        where: {
          ...(status && { status }),
          ...(tier && { tier: { label: { contains: tier, mode: "insensitive" } } }),
          ...(query && {
            OR: [
              { name:             { contains: query, mode: "insensitive" } },
              { companyName:      { contains: query, mode: "insensitive" } },
              { telegramUsername: { contains: query, mode: "insensitive" } },
              { email:            { contains: query, mode: "insensitive" } },
            ],
          }),
        },
        include: { tier: true, contactTags: { include: { tag: true } } },
        take: Math.min(limit, 30),
        orderBy: { createdAt: "desc" },
      });
      return contacts.map((c) => ({
        id: c.id,
        name: c.name,
        company: c.companyName,
        status: c.status,
        tier: c.tier?.label,
        tags: c.contactTags.map((ct) => ct.tag.name),
        telegram: c.telegramUsername,
        email: c.email,
      }));
    }

    case "get_deals": {
      const { stage_name, owner_name, limit = 20 } = input as {
        stage_name?: string; owner_name?: string; limit?: number;
      };
      const deals = await prisma.deal.findMany({
        where: {
          ...(stage_name && { stage: { name: { contains: stage_name, mode: "insensitive" } } }),
          ...(owner_name && { owner: { name: { contains: owner_name, mode: "insensitive" } } }),
        },
        include: {
          contact: { select: { name: true, companyName: true } },
          stage: true,
          owner: { select: { name: true } },
        },
        take: Math.min(limit, 50),
        orderBy: { updatedAt: "desc" },
      });
      return deals.map((d) => ({
        contact: d.contact.companyName || d.contact.name,
        stage: d.stage?.name ?? "No stage",
        latestStatus: d.latestStatus,
        owner: d.owner?.name ?? "Unassigned",
        callDate: d.callDate,
        notes: d.notes,
      }));
    }

    case "get_tasks": {
      const { completed = false, overdue_only = false, limit = 20 } = input as {
        completed?: boolean; overdue_only?: boolean; limit?: number;
      };
      const now = new Date();
      const tasks = await prisma.task.findMany({
        where: {
          completed: overdue_only ? false : completed,
          ...(overdue_only && { dueAt: { lt: now } }),
        },
        include: {
          deal: { include: { contact: { select: { name: true, companyName: true } } } },
        },
        take: Math.min(limit, 50),
        orderBy: overdue_only ? { dueAt: "asc" } : { createdAt: "desc" },
      });
      return tasks.map((t) => ({
        title: t.title,
        contact: t.deal.contact.companyName || t.deal.contact.name,
        dueAt: t.dueAt,
        overdue: t.dueAt ? t.dueAt < now : false,
        completed: t.completed,
      }));
    }

    case "get_recent_activity": {
      const { limit = 15 } = input as { limit?: number };
      const activities = await prisma.activity.findMany({
        include: {
          deal: { include: { contact: { select: { name: true, companyName: true } } } },
          user: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
        take: Math.min(limit, 50),
      });
      return activities.map((a) => ({
        type: a.type,
        body: a.body,
        contact: a.deal?.contact.companyName || a.deal?.contact.name,
        by: a.user?.name,
        at: a.createdAt,
      }));
    }

    default:
      return { error: `Unknown tool: ${name}` };
  }
}

// ── Handlers ──────────────────────────────────────────────────────────────────

// GET — return remaining queries without consuming one
export async function GET() {
  const session = await requireAuth();
  if (!session) return UNAUTH();

  const key = `ai-agent:${session.userId}`;
  const windowStart = new Date(Date.now() - AGENT_WINDOW_MS);
  const entry = await prisma.rateLimitEntry.findUnique({ where: { key } });

  const remaining =
    !entry || entry.windowStart < windowStart
      ? AGENT_MAX_QUERIES
      : Math.max(0, AGENT_MAX_QUERIES - entry.count);

  return NextResponse.json({ remaining, total: AGENT_MAX_QUERIES });
}

// POST — run the agent
export async function POST(req: NextRequest) {
  const session = await requireAuth();
  if (!session) return UNAUTH();

  const { allowed, remaining } = await checkRateLimit(
    `ai-agent:${session.userId}`,
    AGENT_MAX_QUERIES,
    AGENT_WINDOW_MS,
  );
  if (!allowed) {
    return NextResponse.json(
      { error: "You have used all 5 queries for this 3-hour window. Please try again later." },
      { status: 429 },
    );
  }

  const body = await req.json();
  const userMessage = (body.message ?? "").trim();
  if (!userMessage) return NextResponse.json({ error: "Message is required." }, { status: 400 });

  const systemPrompt = `You are an AI assistant embedded in a CRM called trezu. Today is ${new Date().toDateString()}.
You have access to tools to query live CRM data: contacts, pipeline deals, tasks, and activity logs.
Always use the tools to answer data questions — never guess numbers or names.
Be concise and factual. Use bullet points for lists. Format numbers clearly.`;

  const messages: Anthropic.MessageParam[] = [{ role: "user", content: userMessage }];

  let response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    system: systemPrompt,
    tools,
    messages,
  });

  // Agentic loop — up to 5 tool-call rounds
  let rounds = 0;
  while (response.stop_reason === "tool_use" && rounds < 5) {
    rounds++;
    const toolUseBlocks = response.content.filter(
      (b): b is Anthropic.ToolUseBlock => b.type === "tool_use",
    );
    messages.push({ role: "assistant", content: response.content });

    const results: Anthropic.ToolResultBlockParam[] = await Promise.all(
      toolUseBlocks.map(async (block) => ({
        type: "tool_result" as const,
        tool_use_id: block.id,
        content: JSON.stringify(
          await runTool(block.name, block.input as Record<string, unknown>),
        ),
      })),
    );
    messages.push({ role: "user", content: results });

    response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: systemPrompt,
      tools,
      messages,
    });
  }

  const text = response.content.find((b): b is Anthropic.TextBlock => b.type === "text");
  return NextResponse.json({
    reply: text?.text ?? "I could not generate a response.",
    remaining,
  });
}
