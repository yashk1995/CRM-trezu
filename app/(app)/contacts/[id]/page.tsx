"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ExternalLink, Circle, CheckCircle2, ArrowUpRight } from "lucide-react";
import ContactAvatar from "@/components/ui/ContactAvatar";
import { format } from "date-fns";

interface Tag     { id: string; name: string; color: string }
interface Tier    { id: string; label: string }
interface Stage   { id: string; name: string; color: string }
interface Activity{ id: string; type: string; body: string | null; createdAt: string }
interface Task    { id: string; title: string; completed: boolean }
interface Deal    { id: string; description: string | null; latestStatus: string | null; callDate: string | null; meetLink: string | null; notes: string | null; stage: Stage | null; activities: Activity[]; tasks: Task[] }
interface CustomFieldDef { id: string; name: string; fieldType: string; options: string[] }
interface Contact {
  id: string; name: string; companyName: string | null; pocUsername: string | null;
  groupLink: string | null; logoUrl: string | null; email: string | null;
  phone: string | null; telegramUsername: string | null; twitterHandle: string | null;
  status: string; tier: Tier | null; contactTags: { tag: Tag }[]; deals: Deal[];
  customFields: Record<string, string>;
}

const ACT_STYLE: Record<string, { bg: string; color: string }> = {
  note:     { bg: "var(--cloud-2)",     color: "var(--slate)" },
  call:     { bg: "var(--emerald-wash)",color: "#006A47" },
  update:   { bg: "var(--brand-wash)",  color: "var(--brand-deep)" },
  telegram: { bg: "var(--brand-wash)",  color: "var(--brand-deep)" },
  twitter:  { bg: "var(--violet-wash)", color: "#3D2DB0" },
  email:    { bg: "var(--amber-wash)",  color: "#6E4D00" },
};

const STATUS_CHIP: Record<string, string> = {
  not_contacted: "chip",
  dm_sent:       "chip brand dot",
  rejected:      "chip rose dot",
  in_pipeline:   "chip emerald dot",
};
const STATUS_LABELS: Record<string, string> = {
  not_contacted: "Not contacted", dm_sent: "DM sent",
  rejected: "Rejected", in_pipeline: "In pipeline",
};

function InfoRow({ label, value, link }: { label: string; value: string | null; link?: boolean }) {
  return (
    <div>
      <dt style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--fog)", marginBottom: 5 }}>{label}</dt>
      <dd style={{ margin: 0 }}>
        {value ? (
          link ? (
            <a href={value} target="_blank" rel="noopener noreferrer"
              style={{ fontSize: 13, fontWeight: 600, color: "var(--brand)", display: "inline-flex", alignItems: "center", gap: 4, textDecoration: "none" }}>
              Open link <ExternalLink size={12} />
            </a>
          ) : (
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--graphite)" }}>{value}</span>
          )
        ) : <span style={{ color: "var(--mist)", fontSize: 13 }}>—</span>}
      </dd>
    </div>
  );
}

export default function ContactDetailPage() {
  const { id }  = useParams<{ id: string }>();
  const router  = useRouter();
  const [contact, setContact] = useState<Contact | null>(null);
  const [customFieldDefs, setCustomFieldDefs] = useState<CustomFieldDef[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/contacts/${id}`).then((r) => r.json()).then((d) => { setContact(d); setLoading(false); });
    fetch("/api/custom-field-definitions?appliesTo=contact").then((r) => r.json()).then(setCustomFieldDefs);
  }, [id]);

  const toggleTask = async (dealId: string, taskId: string, completed: boolean) => {
    await fetch(`/api/tasks/${taskId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ completed }) });
    setContact((c) => c ? {
      ...c, deals: c.deals.map((d) => d.id === dealId
        ? { ...d, tasks: d.tasks.map((t) => t.id === taskId ? { ...t, completed } : t) } : d),
    } : c);
  };

  if (loading) return <div style={{ padding: "48px 0", textAlign: "center", fontSize: 13, color: "var(--stone)" }}>Loading…</div>;
  if (!contact) return <div style={{ padding: "48px 0", textAlign: "center", fontSize: 13, color: "var(--stone)" }}>Contact not found.</div>;

  const primary = contact.companyName || contact.name;
  const allActivities = contact.deals
    .flatMap((d) => d.activities.map((a) => ({ ...a, deal: d })))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const allTasks = contact.deals.flatMap((d) => d.tasks.map((t) => ({ ...t, deal: d })));

  return (
    <div style={{ maxWidth: 800, margin: "0 auto" }} className="space-y-5 animate-fade-up">
      {/* Back */}
      <Link href="/outreach" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 500, color: "var(--stone)", textDecoration: "none" }}
        className="hover:text-ink transition-colors">
        <ArrowLeft size={14} /> Back to Outreach
      </Link>

      {/* Header card */}
      <div style={{ background: "var(--paper)", border: "1px solid var(--mist)", borderRadius: 12, padding: 24 }}>
        <div className="flex items-start gap-4">
          <ContactAvatar logoUrl={contact.logoUrl} name={primary} size="lg" />
          <div className="flex-1 min-w-0">
            <h1 style={{ fontFamily: "'Inter Tight', sans-serif", fontSize: 24, fontWeight: 700, letterSpacing: "-0.015em", color: "var(--ink)", margin: 0 }}>{primary}</h1>
            {contact.companyName && <p style={{ fontSize: 14, color: "var(--stone)", marginTop: 3 }}>POC · {contact.name}</p>}
          </div>
          <div className="flex items-center gap-2">
            <span className={STATUS_CHIP[contact.status] ?? "chip"}>{STATUS_LABELS[contact.status] ?? contact.status}</span>
          </div>
        </div>

        {/* Chips */}
        {(contact.tier || contact.contactTags.length > 0) && (
          <div className="flex flex-wrap gap-1.5 mt-4">
            {contact.tier && <span className="chip violet">{contact.tier.label}</span>}
            {contact.contactTags.map(({ tag }) => <span key={tag.id} className="chip">{tag.name}</span>)}
          </div>
        )}

        {/* Info grid — all fields, priority order */}
        <dl className="mt-5 grid grid-cols-2 gap-x-8 gap-y-5 sm:grid-cols-3">
          <InfoRow label="POC Username"  value={contact.pocUsername} />
          <InfoRow label="Group Link"    value={contact.groupLink} link={!!contact.groupLink} />
          <InfoRow label="Telegram"      value={contact.telegramUsername} />
          <InfoRow label="Twitter / X"   value={contact.twitterHandle} />
          <InfoRow label="Email"         value={contact.email} />
          <InfoRow label="Phone"         value={contact.phone} />
          {/* Tags span full width */}
          <div className="col-span-2 sm:col-span-3">
            <dt style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--fog)", marginBottom: 5 }}>Tags</dt>
            <dd style={{ margin: 0, display: "flex", flexWrap: "wrap", gap: 6 }}>
              {contact.contactTags.length > 0
                ? contact.contactTags.map(({ tag }) => <span key={tag.id} className="chip">{tag.name}</span>)
                : <span style={{ color: "var(--mist)", fontSize: 13 }}>—</span>}
            </dd>
          </div>
          {/* Custom fields */}
          {customFieldDefs.filter((d) => contact.customFields?.[d.id]).map((def) => (
            <InfoRow
              key={def.id}
              label={def.name}
              value={contact.customFields[def.id] ?? null}
              link={def.fieldType === "url"}
            />
          ))}
        </dl>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Deals */}
        <div style={{ background: "var(--paper)", border: "1px solid var(--mist)", borderRadius: 12, overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderBottom: "1px solid var(--cloud-2)" }}>
            <h2 style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>Deals</h2>
            <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--fog)" }}>{contact.deals.length}</span>
          </div>
          {contact.deals.length === 0 ? (
            <p style={{ padding: "24px 18px", fontSize: 13, color: "var(--stone)" }}>No deals yet.</p>
          ) : contact.deals.map((deal) => (
            <div key={deal.id} style={{ padding: "12px 18px", borderBottom: "1px solid var(--cloud-2)", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
              <div className="min-w-0">
                {deal.stage && (
                  <div className="flex items-center gap-1.5 mb-1">
                    <span style={{ width: 6, height: 6, borderRadius: 999, background: deal.stage.color, flexShrink: 0 }} />
                    <span style={{ fontSize: 11, fontWeight: 600, color: deal.stage.color }}>{deal.stage.name}</span>
                  </div>
                )}
                {deal.latestStatus && <p style={{ fontSize: 13, fontWeight: 500, color: "var(--graphite)", margin: 0 }}>{deal.latestStatus}</p>}
                {deal.callDate && (
                  <p style={{ fontSize: 11, color: "var(--fog)", fontFamily: "var(--font-mono)", marginTop: 3 }}>
                    {new Date(deal.callDate).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </p>
                )}
              </div>
              <button onClick={() => router.push(`/pipeline?openDeal=${deal.id}`)}
                style={{ height: 26, padding: "0 10px", fontSize: 11, fontWeight: 500, color: "var(--graphite)", background: "var(--paper)", border: "1px solid var(--mist)", borderRadius: 999, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4, flexShrink: 0 }}
                className="hover:border-brand hover:text-brand transition-colors">
                Pipeline <ArrowUpRight size={11} />
              </button>
            </div>
          ))}
        </div>

        {/* Tasks */}
        <div style={{ background: "var(--paper)", border: "1px solid var(--mist)", borderRadius: 12, overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderBottom: "1px solid var(--cloud-2)" }}>
            <h2 style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>Tasks</h2>
            <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--fog)" }}>{allTasks.filter((t) => !t.completed).length} pending</span>
          </div>
          {allTasks.length === 0 ? (
            <p style={{ padding: "24px 18px", fontSize: 13, color: "var(--stone)" }}>No tasks yet.</p>
          ) : allTasks.map((task, i) => (
            <div key={task.id} className="flex items-center gap-3 group" style={{ padding: "10px 18px", borderBottom: i < allTasks.length - 1 ? "1px solid var(--cloud-2)" : "none" }}>
              <button onClick={() => toggleTask(task.deal.id, task.id, !task.completed)}
                style={{ flexShrink: 0, background: "transparent", border: 0, cursor: "pointer", color: task.completed ? "var(--brand)" : "var(--mist)", transition: "all 0.2s" }}>
                {task.completed ? <CheckCircle2 size={16} /> : <Circle size={16} />}
              </button>
              <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: task.completed ? "var(--fog)" : "var(--graphite)", textDecoration: task.completed ? "line-through" : "none", transition: "all 0.2s" }}>
                {task.title}
              </span>
              {task.deal.stage && (
                <span style={{ fontSize: 10, color: task.deal.stage.color, fontWeight: 600 }}>{task.deal.stage.name}</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Activity feed */}
      <div style={{ background: "var(--paper)", border: "1px solid var(--mist)", borderRadius: 12, overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderBottom: "1px solid var(--cloud-2)" }}>
          <h2 style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>Activity</h2>
          <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--fog)" }}>{allActivities.length}</span>
        </div>
        {allActivities.length === 0 ? (
          <p style={{ padding: "24px 18px", fontSize: 13, color: "var(--stone)" }}>No activity yet.</p>
        ) : allActivities.map((a, i) => {
          const s = ACT_STYLE[a.type] ?? ACT_STYLE.note;
          return (
            <div key={a.id} className="flex items-start gap-3" style={{ padding: "12px 18px", borderBottom: i < allActivities.length - 1 ? "1px solid var(--cloud-2)" : "none" }}>
              <div style={{ width: 28, height: 28, borderRadius: 6, flexShrink: 0, background: s.bg, color: s.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 600, marginTop: 1 }}>
                {a.type.slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p style={{ fontSize: 13, color: "var(--graphite)", lineHeight: 1.5, margin: 0, whiteSpace: "pre-wrap" }}>{a.body}</p>
                <p style={{ fontSize: 11, color: "var(--fog)", marginTop: 3, fontFamily: "var(--font-mono)" }}>
                  {format(new Date(a.createdAt), "MMM d, yyyy · h:mm a")}
                  {a.deal.stage && <span style={{ marginLeft: 8 }}>· {a.deal.stage.name}</span>}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
