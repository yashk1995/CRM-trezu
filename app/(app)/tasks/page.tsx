"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRight, Circle, CheckCircle2, Trash2, ChevronDown } from "lucide-react";

interface Stage { id: string; name: string; color: string }
interface Task {
  id: string; title: string; completed: boolean; dueAt: string | null; createdAt: string;
  deal: { id: string; stage: Stage | null; contact: { id: string; name: string; companyName: string | null } };
}

function formatDue(dueAt: string): string {
  const d    = new Date(dueAt);
  const now  = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const ms   = d.getTime() - today.getTime();
  const days = Math.floor(ms / 86400000);
  if (days < 0)  return "Overdue";
  if (days === 0) return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  if (days === 1) return "Tomorrow";
  if (days < 7)  return d.toLocaleDateString(undefined, { weekday: "short" });
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function isOverdue(dueAt: string) { return new Date(dueAt) < new Date(); }
function isToday(dueAt: string) {
  const d = new Date(dueAt); const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
}
function isThisWeek(dueAt: string) {
  const d = new Date(dueAt); const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const ms = d.getTime() - today.getTime();
  return ms > 0 && ms < 7 * 86400000;
}

interface TaskGroupProps {
  title: string;
  tone?: "rose" | "brand" | "default";
  tasks: Task[];
  onToggle: (t: Task) => void;
  onDelete: (id: string) => void;
  onOpen: (dealId: string) => void;
}

function TaskGroup({ title, tone = "default", tasks, onToggle, onDelete, onOpen }: TaskGroupProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div style={{ background: "var(--paper)", border: "1px solid var(--mist)", borderRadius: 12, overflow: "hidden" }}>
      <div className="panel-h" style={{ cursor: "pointer" }} onClick={() => setCollapsed((v) => !v)}>
        <div className="flex items-center gap-2">
          <ChevronDown size={12} color="var(--stone)"
            style={{ transform: collapsed ? "rotate(-90deg)" : "none", transition: "transform 0.15s" }} />
          <h3 style={{ color: tone === "rose" ? "var(--rose)" : "var(--ink)" }}>{title}</h3>
          <span className={`chip ${tone === "rose" ? "rose" : tone === "brand" ? "brand" : "default"}`} style={{ height: 18, padding: "0 6px", fontSize: 10 }}>
            {tasks.length}
          </span>
        </div>
      </div>
      {!collapsed && tasks.map((task, i) => {
        const contact = task.deal.contact;
        const name    = contact.companyName || contact.name;
        const due     = task.dueAt ? formatDue(task.dueAt) : null;
        const overdue = task.dueAt && isOverdue(task.dueAt) && !task.completed;
        const today   = task.dueAt && isToday(task.dueAt);
        return (
          <div key={task.id} className="group flex items-center gap-3"
            style={{ padding: "12px 18px", borderBottom: i < tasks.length - 1 ? "1px solid var(--cloud-2)" : "none" }}>
            <button onClick={() => onToggle(task)}
              style={{ width: 18, height: 18, borderRadius: 999, flexShrink: 0, border: `1.5px solid ${today ? "var(--brand)" : "var(--mist)"}`, background: task.completed ? "var(--brand)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "all 0.2s" }}>
              {task.completed && <span style={{ width: 6, height: 6, borderRadius: 999, background: "white", display: "block" }} />}
            </button>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: task.completed ? "var(--fog)" : "var(--ink)", textDecoration: task.completed ? "line-through" : "none" }}>
                {task.title}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span style={{ fontSize: 11, color: "var(--stone)", fontWeight: 500 }}>{name}</span>
                {task.deal.stage && (
                  <>
                    <span style={{ color: "var(--fog)", fontSize: 10 }}>·</span>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                      <span style={{ width: 5, height: 5, borderRadius: 999, background: task.deal.stage.color, display: "inline-block" }} />
                      <span style={{ fontSize: 11, color: "var(--graphite)" }}>{task.deal.stage.name}</span>
                    </span>
                  </>
                )}
              </div>
            </div>

            {due && (
              <div style={{ textAlign: "right", flexShrink: 0, marginRight: 4 }}>
                <div style={{ fontSize: 11, fontWeight: 600, fontFamily: "var(--font-mono)", color: overdue ? "var(--rose)" : today ? "var(--brand)" : "var(--graphite)" }}>
                  {due}
                </div>
                <div style={{ fontSize: 10, color: "var(--fog)", marginTop: 2 }}>{overdue ? "overdue" : "due"}</div>
              </div>
            )}

            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => onOpen(task.deal.id)} className="btn secondary xs">
                Open deal <ArrowUpRight size={11} />
              </button>
              <button onClick={() => onDelete(task.id)} className="btn ghost icon xs" style={{ color: "var(--rose)" }}>
                <Trash2 size={13} />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function TasksPage() {
  const router = useRouter();
  const [tab,     setTab]     = useState<"pending" | "completed">("pending");
  const [tasks,   setTasks]   = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTasks = async (completed: boolean) => {
    setLoading(true);
    const res = await fetch(`/api/tasks?completed=${completed}`);
    if (res.ok) setTasks(await res.json());
    setLoading(false);
  };

  useEffect(() => { fetchTasks(tab === "completed"); }, [tab]);

  const toggle = async (task: Task) => {
    setTasks((prev) => prev.filter((t) => t.id !== task.id));
    await fetch(`/api/tasks/${task.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed: !task.completed }),
    });
  };

  const del = async (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    await fetch(`/api/tasks/${id}`, { method: "DELETE" });
  };

  // Group tasks
  const overdue   = tasks.filter((t) => t.dueAt && isOverdue(t.dueAt));
  const dueToday  = tasks.filter((t) => t.dueAt && isToday(t.dueAt));
  const thisWeek  = tasks.filter((t) => t.dueAt && !isOverdue(t.dueAt) && !isToday(t.dueAt) && isThisWeek(t.dueAt));
  const later     = tasks.filter((t) => !t.dueAt || (!isOverdue(t.dueAt) && !isToday(t.dueAt) && !isThisWeek(t.dueAt)));

  const groups = tab === "completed"
    ? [{ title: "Completed", tone: "default" as const, tasks }]
    : [
        ...(overdue.length  ? [{ title: "Overdue",   tone: "rose"    as const, tasks: overdue  }] : []),
        ...(dueToday.length ? [{ title: "Today",     tone: "brand"   as const, tasks: dueToday }] : []),
        ...(thisWeek.length ? [{ title: "This week", tone: "default" as const, tasks: thisWeek }] : []),
        ...(later.length    ? [{ title: "Later",     tone: "default" as const, tasks: later    }] : []),
      ];

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h1 style={{ fontFamily: "'Inter Tight', sans-serif", fontSize: 28, fontWeight: 600, letterSpacing: "-0.02em", color: "var(--ink)", margin: 0 }}>Tasks</h1>
          <p style={{ fontSize: 14, color: "var(--stone)", marginTop: 6, fontWeight: 500 }}>
            {loading ? "Loading…" : (
              <>
                <b style={{ color: "var(--ink)" }}>{tasks.length} {tab}</b>
                {tab === "pending" && overdue.length > 0 && <> · <span style={{ color: "var(--rose)", fontWeight: 600 }}>{overdue.length} overdue</span></>}
                {tab === "pending" && dueToday.length > 0 && <> · <span style={{ color: "var(--brand)", fontWeight: 600 }}>{dueToday.length} due today</span></>}
              </>
            )}
          </p>
        </div>
        <div style={{ display: "flex", gap: 2, padding: 3, background: "var(--paper)", border: "1px solid var(--mist)", borderRadius: 999 }}>
          {(["pending", "completed"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)} style={{
              height: 28, padding: "0 14px", fontSize: 12, fontWeight: 500,
              borderRadius: 999, border: 0, cursor: "pointer",
              background: tab === t ? "var(--ink)" : "transparent",
              color: tab === t ? "white" : "var(--stone)",
              transition: "all 0.15s", textTransform: "capitalize",
            }}>{t}</button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ padding: "48px 0", textAlign: "center", fontSize: 13, color: "var(--stone)" }}>Loading…</div>
      ) : tasks.length === 0 ? (
        <div style={{ background: "var(--paper)", border: "1px solid var(--mist)", borderRadius: 12, padding: "48px 0", textAlign: "center", fontSize: 13, color: "var(--stone)" }}>
          No {tab} tasks.
        </div>
      ) : (
        <div className="space-y-3">
          {groups.map((g) => (
            <TaskGroup key={g.title} title={g.title} tone={g.tone} tasks={g.tasks}
              onToggle={toggle} onDelete={del}
              onOpen={(dealId) => router.push(`/pipeline?openDeal=${dealId}`)} />
          ))}
        </div>
      )}
    </div>
  );
}
