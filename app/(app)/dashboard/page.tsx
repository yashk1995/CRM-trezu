"use client";

import { useEffect, useState } from "react";
import { Zap, ArrowUpRight } from "lucide-react";
import ContactAvatar from "@/components/ui/ContactAvatar";
import { format } from "date-fns";
import { cacheGet, cacheSet } from "@/lib/cache";

interface Stage    { id: string; name: string; color: string; order: number; dealCount: number }
interface Activity {
  id: string; type: string; body: string | null; createdAt: string;
  deal: { id: string; contact: { id: string; name: string; companyName: string | null; logoUrl: string | null } } | null;
}
interface DashData {
  totalContacts: number;
  statusMap: Record<string, number>;
  pipeline: Stage[];
  pendingTasks: number;
  completedTasks: number;
  recentActivities: Activity[];
  period: {
    range: number;
    newContacts: number;
    newDeals: number;
    completedTasks: number;
    activities: number;
  };
}

type Range = 0 | 7 | 15 | 30;

const RANGES: { value: Range; label: string }[] = [
  { value: 7,  label: "7D"  },
  { value: 15, label: "15D" },
  { value: 30, label: "1M"  },
  { value: 0,  label: "All" },
];

const ACTIVITY_ICONS: Record<string, { bg: string; color: string; icon: string }> = {
  note:     { bg: "var(--cloud-2)",    color: "var(--slate)",      icon: "📝" },
  call:     { bg: "var(--emerald-wash)",color: "#006A47",          icon: "📞" },
  update:   { bg: "var(--brand-wash)", color: "var(--brand-deep)", icon: "⚡" },
  telegram: { bg: "var(--brand-wash)", color: "var(--brand-deep)", icon: "✈" },
  twitter:  { bg: "var(--violet-wash)",color: "#3D2DB0",           icon: "✗" },
  email:    { bg: "var(--amber-wash)", color: "#6E4D00",            icon: "✉" },
  meeting:  { bg: "var(--violet-wash)",color: "#3D2DB0",           icon: "🗓" },
};

function StatCard({ label, value, sub, dark }: { label: string; value: string | number; sub?: string; dark?: boolean }) {
  return (
    <div style={{
      background: dark ? "var(--ink)" : "var(--paper)",
      border: dark ? "none" : "1px solid var(--mist)",
      borderRadius: 12, padding: 18,
      display: "flex", flexDirection: "column", gap: 6,
      position: "relative", overflow: "hidden",
    }}>
      {dark && (
        <div style={{
          position: "absolute", right: -40, top: -40, width: 160, height: 160,
          background: "var(--brand)", transform: "skewX(-30deg)", opacity: 0.06, pointerEvents: "none",
        }} />
      )}
      <div style={{ fontSize: 12, fontWeight: 500, color: dark ? "#A6AAB4" : "var(--stone)", display: "flex", alignItems: "center", gap: 6 }}>
        {dark && <Zap size={12} color="var(--brand)" />}
        {label}
      </div>
      <div style={{ fontFamily: "'Inter Tight', var(--font-sans)", fontWeight: 600, fontSize: 30, letterSpacing: "-0.02em", color: dark ? "white" : "var(--ink)" }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 12, color: dark ? "#6E7280" : "var(--stone)", fontWeight: 500 }}>{sub}</div>}
    </div>
  );
}

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background: "var(--paper)", border: "1px solid var(--mist)", borderRadius: 12, ...style }}>
      {children}
    </div>
  );
}

function PanelH({ title, sub, right }: { title: string; sub?: string; right?: React.ReactNode }) {
  return (
    <div className="panel-h">
      <div className="flex items-center gap-2">
        <h3>{title}</h3>
        {sub && <span style={{ fontSize: 12, color: "var(--fog)", fontWeight: 500, fontFamily: "var(--font-mono, monospace)" }}>{sub}</span>}
      </div>
      {right}
    </div>
  );
}

function RangeToggle({ range, setRange }: { range: Range; setRange: (r: Range) => void }) {
  return (
    <div style={{
      display: "inline-flex",
      background: "var(--cloud-2)",
      borderRadius: 999,
      padding: 3,
      gap: 2,
    }}>
      {RANGES.map((r) => (
        <button
          key={r.value}
          onClick={() => setRange(r.value)}
          style={{
            padding: "4px 14px",
            borderRadius: 999,
            border: "none",
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
            background: range === r.value ? "var(--paper)" : "transparent",
            color: range === r.value ? "var(--ink)" : "var(--stone)",
            boxShadow: range === r.value ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
            transition: "all 0.15s",
            lineHeight: 1,
          }}
        >
          {r.label}
        </button>
      ))}
    </div>
  );
}

export default function DashboardPage() {
  const [data, setData]       = useState<DashData | null>(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange]     = useState<Range>(7);

  useEffect(() => {
    const cacheKey = `dashboard:${range}`;
    const cached = cacheGet<DashData>(cacheKey);
    if (cached) {
      setData(cached);
      setLoading(false);
    } else {
      setLoading(true);
    }
    fetch(`/api/dashboard?range=${range}`)
      .then((r) => r.json())
      .then((d) => {
        cacheSet(cacheKey, d);
        setData(d);
        setLoading(false);
      });
  }, [range]);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  if (loading || !data) {
    return (
      <div className="space-y-5">
        <div>
          <p style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--fog)", marginBottom: 8 }}>
            {format(new Date(), "EEEE · d MMMM yyyy")}
          </p>
          <h1 style={{ fontFamily: "'Inter Tight', sans-serif", fontSize: 28, fontWeight: 600, letterSpacing: "-0.02em", color: "var(--ink)" }}>
            {greeting}
          </h1>
        </div>
        <div className="flex items-center justify-between">
          <span style={{ fontSize: 12, color: "var(--fog)", fontWeight: 500 }}>Period overview</span>
          <RangeToggle range={range} setRange={setRange} />
        </div>
        <div className="grid grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-lg" style={{ background: "var(--cloud-2)" }} />
          ))}
        </div>
      </div>
    );
  }

  const { totalContacts, statusMap, pipeline, pendingTasks, completedTasks, recentActivities, period } = data;
  const inPipeline = statusMap["in_pipeline"] ?? 0;
  const totalDeals = pipeline.reduce((s, p) => s + p.dealCount, 0);
  const maxDeals   = Math.max(...pipeline.map((s) => s.dealCount), 1);
  const rangeLabel   = range === 0 ? "all time" : range === 30 ? "1 month" : `${range} days`;
  const periodPrefix = range === 0 ? "" : "last ";

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--fog)", marginBottom: 8 }}>
            {format(new Date(), "EEEE · d MMMM yyyy")}
          </p>
          <h1 style={{ fontFamily: "'Inter Tight', sans-serif", fontSize: 28, fontWeight: 600, letterSpacing: "-0.02em", color: "var(--ink)", margin: 0 }}>
            {greeting}, Yash
          </h1>
          <p style={{ fontSize: 14, color: "var(--stone)", marginTop: 8, fontWeight: 500 }}>
            <b style={{ color: "var(--ink)" }}>{pendingTasks} pending tasks</b> ·{" "}
            <b style={{ color: "var(--brand)" }}>{totalDeals} active deals</b> ·{" "}
            <b style={{ color: "var(--ink)" }}>{statusMap["not_contacted"] ?? 0} contacts</b> waiting on a first DM
          </p>
        </div>
      </div>

      {/* Period selector row — right-aligned, just above KPI cards */}
      <div className="flex items-center justify-between">
        <span style={{ fontSize: 12, color: "var(--fog)", fontWeight: 500 }}>
          Period overview · {periodPrefix}{rangeLabel}
        </span>
        <RangeToggle range={range} setRange={setRange} />
      </div>

      {/* KPI strip — period-aware */}
      <div className="grid gap-3" style={{ gridTemplateColumns: "1.2fr 1fr 1fr 1fr" }}>
        <StatCard
          dark
          label="New deals"
          value={period.newDeals}
          sub={`${periodPrefix}${rangeLabel} · ${totalDeals} in pipeline`}
        />
        <StatCard
          label="New contacts"
          value={period.newContacts}
          sub={`${periodPrefix}${rangeLabel} · ${totalContacts} total`}
        />
        <StatCard
          label="Tasks completed"
          value={period.completedTasks}
          sub={`${periodPrefix}${rangeLabel} · ${pendingTasks} pending`}
        />
        <StatCard
          label="Activities"
          value={period.activities}
          sub={`${periodPrefix}${rangeLabel}`}
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-2 gap-4">
        {/* Pipeline */}
        <Card>
          <PanelH title="Pipeline" sub={`${totalDeals} deals`} right={
            <a href="/pipeline" style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, color: "var(--brand)", fontWeight: 500, textDecoration: "none" }}>
              Open <ArrowUpRight size={12} />
            </a>
          } />
          <div style={{ padding: 18 }}>
            <div style={{ display: "flex", height: 10, borderRadius: 999, overflow: "hidden", background: "var(--cloud-2)", marginBottom: 18 }}>
              {pipeline.map((s) => (
                <div key={s.id} style={{ width: `${(s.dealCount / Math.max(totalDeals, 1)) * 100}%`, background: s.color }} />
              ))}
            </div>
            <div className="space-y-2.5">
              {pipeline.map((s) => (
                <div key={s.id} className="flex items-center gap-2.5">
                  <span style={{ width: 8, height: 8, borderRadius: 999, background: s.color, flexShrink: 0 }} />
                  <span style={{ fontSize: 13, color: "var(--graphite)", fontWeight: 500, flex: 1 }}>{s.name}</span>
                  <span style={{ fontSize: 12, color: "var(--ink)", fontWeight: 600, fontFamily: "var(--font-mono)", width: 24, textAlign: "right" }}>
                    {s.dealCount}
                  </span>
                  <div style={{ width: 80 }}>
                    <div style={{ height: 6, background: "var(--cloud-2)", borderRadius: 999, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${(s.dealCount / maxDeals) * 100}%`, background: s.color, borderRadius: 999 }} />
                    </div>
                  </div>
                </div>
              ))}
              {pipeline.length === 0 && <p style={{ fontSize: 13, color: "var(--stone)" }}>No stages yet.</p>}
            </div>
          </div>
        </Card>

        {/* Contacts by status */}
        <Card>
          <PanelH title="Outreach funnel" sub="contacts" />
          <div style={{ padding: 18 }}>
            <div className="space-y-3">
              {[
                { key: "not_contacted", label: "Not contacted", color: "#A6AAB4" },
                { key: "dm_sent",       label: "DM sent",       color: "var(--brand)" },
                { key: "rejected",      label: "Rejected",      color: "var(--rose)" },
                { key: "in_pipeline",   label: "In pipeline",   color: "var(--emerald)" },
              ].map(({ key, label, color }) => {
                const count = statusMap[key] ?? 0;
                const pct   = totalContacts ? Math.round((count / totalContacts) * 100) : 0;
                return (
                  <div key={key}>
                    <div className="flex items-center justify-between mb-1.5" style={{ fontSize: 12 }}>
                      <span style={{ color: "var(--graphite)", fontWeight: 500 }}>{label}</span>
                      <span style={{ fontFamily: "var(--font-mono)", fontWeight: 600, color: "var(--ink)" }}>
                        {count} <span style={{ color: "var(--fog)", fontWeight: 400 }}>({pct}%)</span>
                      </span>
                    </div>
                    <div style={{ height: 6, background: "var(--cloud-2)", borderRadius: 999, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 999 }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>
      </div>

      {/* Recent activity — filtered to selected period */}
      <Card>
        <PanelH title="Recent activity" sub={`${periodPrefix}${rangeLabel}`} />
        {recentActivities.length === 0 ? (
          <p style={{ padding: "24px 18px", fontSize: 13, color: "var(--stone)" }}>No activity in this period.</p>
        ) : (
          <div>
            {recentActivities.map((a, i) => {
              const contact = a.deal?.contact;
              const name    = contact ? (contact.companyName || contact.name) : "Unknown";
              const style   = ACTIVITY_ICONS[a.type] ?? ACTIVITY_ICONS.note;
              return (
                <div key={a.id} className="flex items-start gap-3 group" style={{
                  padding: "12px 18px",
                  borderBottom: i < recentActivities.length - 1 ? "1px solid var(--cloud-2)" : "none",
                }}>
                  {contact && <ContactAvatar logoUrl={contact.logoUrl} name={name} size="sm" className="mt-0.5 shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>{name}</span>
                      <span className="chip" style={{ background: style.bg, color: style.color, border: "none" }}>{a.type}</span>
                    </div>
                    {a.body && <p style={{ fontSize: 12, color: "var(--slate)", marginTop: 3, lineHeight: 1.5 }} className="line-clamp-1">{a.body}</p>}
                    <p style={{ fontSize: 11, color: "var(--fog)", marginTop: 2, fontFamily: "var(--font-mono)" }}>
                      {format(new Date(a.createdAt), "MMM d, yyyy · h:mm a")}
                    </p>
                  </div>
                  {a.deal && (
                    <a
                      href={`/pipeline?openDeal=${a.deal.id}`}
                      style={{ flexShrink: 0, display: "inline-flex", alignItems: "center", gap: 4, height: 26, padding: "0 10px", fontSize: 11, fontWeight: 500, color: "var(--brand)", background: "var(--brand-wash)", borderRadius: 999, textDecoration: "none", border: "none", transition: "background 0.15s" }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      Open deal <ArrowUpRight size={11} />
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
