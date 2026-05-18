"use client";

import { useEffect, useRef, useState } from "react";
import SlideOver from "@/components/ui/SlideOver";
import ContactAvatar from "@/components/ui/ContactAvatar";
import { Send, Phone, FileText, Activity, Trash2, Pencil, Check, X, Circle, CheckCircle2, Calendar, Link2, ChevronLeft, MoreHorizontal, ExternalLink, User, Paperclip, File } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { cacheGet, cacheSet, cacheInvalidate } from "@/lib/cache";

interface Tag  { id: string; name: string; color: string }
interface Tier { id: string; label: string }
interface Stage{ id: string; name: string; color: string }
interface CustomFieldDef { id: string; name: string; fieldType: string; options: string[] }
interface Attachment   { name: string; type: string; size: number; data: string }
interface ActivityItem { id: string; type: string; body: string | null; createdAt: string; attachments?: Attachment[] }
interface TaskItem     { id: string; title: string; completed: boolean; dueAt?: string | null }

interface Deal {
  id: string; notes: string | null; description: string | null;
  latestStatus: string | null; callDate: string | null; meetLink: string | null;
  stage: Stage | null;
  owner: { id: string; name: string } | null;
  contact: {
    id: string; name: string; companyName: string | null;
    pocUsername: string | null; groupLink: string | null; logoUrl: string | null;
    email: string | null; phone: string | null;
    telegramUsername: string | null; twitterHandle: string | null;
    status: string; tier: Tier | null; contactTags: { tag: Tag }[];
    deals?: { id: string; stage: Stage | null }[];
    pocs?: { name: string; username?: string }[];
  };
  activities: ActivityItem[];
  tasks: TaskItem[];
}

const ACT_STYLE: Record<string, { bg: string; color: string }> = {
  note:     { bg: "var(--cloud-2)",     color: "var(--slate)"      },
  call:     { bg: "var(--emerald-wash)",color: "#006A47"           },
  update:   { bg: "var(--brand-wash)",  color: "var(--brand-deep)" },
  telegram: { bg: "var(--brand-wash)",  color: "var(--brand-deep)" },
  twitter:  { bg: "var(--violet-wash)", color: "#3D2DB0"           },
  email:    { bg: "var(--amber-wash)",  color: "#6E4D00"           },
  meeting:  { bg: "var(--violet-wash)", color: "#3D2DB0"           },
};

const inp = {
  base: "w-full rounded-[6px] border px-3 py-1.5 text-[13px] outline-none transition-all",
  style: { borderColor: "var(--mist)", background: "var(--paper)", color: "var(--ink)" },
  focus: "focus:border-brand focus:shadow-[0_0_0_3px_var(--brand-wash)]",
};

const inputCls = `${inp.base} ${inp.focus}`;

// Subset of Deal already in the pipeline board's state — used for instant header render
interface PreviewDeal {
  id: string;
  notes: string | null; description: string | null;
  latestStatus: string | null; callDate: string | null; meetLink: string | null;
  stage: Stage | null;
  owner: { id: string; name: string } | null;
  contact: {
    id: string; name: string; companyName: string | null;
    pocUsername: string | null; logoUrl: string | null;
    email: string | null; telegramUsername: string | null; twitterHandle: string | null;
    tier: Tier | null; contactTags: { tag: Tag }[];
    pocs?: { name: string; username?: string }[];
  };
}

interface Props {
  dealId: string | null; open: boolean;
  previewDeal?: PreviewDeal;
  onClose: () => void; onUpdated: () => void; onRemoved?: () => void;
  onOpenLightbox?: (att: Attachment) => void;
}

type Tab  = "updates" | "tasks" | "details";
type View = "deal" | "contact";

export default function DealDetailPanel({ dealId, open, previewDeal, onClose, onUpdated, onRemoved, onOpenLightbox }: Props) {
  const [deal, setDeal] = useState<Deal | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchingActivities, setFetchingActivities] = useState(false);
  const [tab,  setTab]  = useState<Tab>("updates");
  const [view, setView] = useState<View>("deal");
  const [removing, setRemoving] = useState(false);

  // Deal fields
  const [description,  setDescription]  = useState("");
  const [latestStatus, setLatestStatus] = useState("");
  const [callDate,     setCallDate]     = useState("");
  const [callTime,     setCallTime]     = useState("");
  const [meetLink,     setMeetLink]     = useState("");
  const [saving,       setSaving]       = useState(false);

  // Activity
  const [activityType, setActivityType] = useState("note");
  const [activityBody, setActivityBody] = useState("");
  const [posting,      setPosting]      = useState(false);
  const [editingId,    setEditingId]    = useState<string | null>(null);
  const [editingBody,  setEditingBody]  = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  // Contact inline edit
  const [editingField, setEditingField] = useState<"company" | "poc" | null>(null);
  const [companyDraft, setCompanyDraft] = useState("");
  const [pocDraft,     setPocDraft]     = useState("");

  // Tasks
  const [newTask,    setNewTask]    = useState("");
  const [newTaskDue, setNewTaskDue] = useState("");

  // Owner
  const [ownerId,  setOwnerId]  = useState<string>("");
  const [members,  setMembers]  = useState<{ id: string; name: string }[]>([]);

  // Custom fields
  const [customFieldDefs, setCustomFieldDefs] = useState<CustomFieldDef[]>([]);
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, string>>({});

  // Attachments (composer)
  const [pendingFiles, setPendingFiles] = useState<Attachment[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Three-dots menu
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  useEffect(() => {
    fetch("/api/custom-field-definitions?appliesTo=deal").then((r) => r.json()).then(setCustomFieldDefs);
    fetch("/api/users").then((r) => r.ok ? r.json() : []).then((users) =>
      setMembers(users.map((u: { id: string; name: string }) => ({ id: u.id, name: u.name })))
    );
  }, []);

  useEffect(() => {
    if (!dealId || !open) return;
    setTab("updates"); setView("deal");

    const applyDeal = (d: Deal & { customFields?: Record<string, string> }) => {
      setDeal({ ...d, tasks: d.tasks ?? [] });
      setCompanyDraft(d.contact.companyName ?? "");
      setPocDraft(d.contact.name ?? "");
      setDescription(d.description ?? "");
      setLatestStatus(d.latestStatus ?? "");
      if (d.callDate) {
        const dt = new Date(d.callDate);
        setCallDate(`${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,"0")}-${String(dt.getDate()).padStart(2,"0")}`);
        setCallTime(`${String(dt.getHours()).padStart(2,"0")}:${String(dt.getMinutes()).padStart(2,"0")}`);
      } else { setCallDate(""); setCallTime(""); }
      setMeetLink(d.meetLink ?? "");
      setOwnerId(d.owner?.id ?? "");
      setCustomFieldValues((d.customFields as Record<string, string>) ?? {});
    };

    if (previewDeal) {
      // Render header immediately from pipeline's in-memory data
      applyDeal({ ...previewDeal, contact: { ...previewDeal.contact, phone: null, groupLink: null, status: "", deals: [] }, activities: [], tasks: [] });
      setFetchingActivities(true);
      setLoading(false);
    } else {
      const cached = cacheGet<Deal>(`deal-${dealId}`);
      if (cached) {
        applyDeal(cached as Deal & { customFields?: Record<string, string> });
        setFetchingActivities(false);
        setLoading(false);
      } else {
        setDeal(null);
        setLoading(true);
      }
    }

    fetch(`/api/deals/${dealId}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d: Deal & { customFields?: Record<string, string> }) => {
        cacheSet(`deal-${dealId}`, d);
        applyDeal(d);
        setFetchingActivities(false);
        setLoading(false);
      });
  }, [dealId, open]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [deal?.activities.length]);

  const saveInfo = async () => {
    if (!dealId) return; setSaving(true);
    const updated = await fetch(`/api/deals/${dealId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ description, latestStatus, meetLink, callDate: callDate ? new Date(`${callDate}T${callTime || "00:00"}`).toISOString() : null, customFields: customFieldValues, ownerId: ownerId || null }),
    }).then((r) => r.json());
    cacheInvalidate(`deal-${dealId}`, "pipeline-deals", "dashboard");
    setDeal((d) => d ? { ...d, ...updated } : d); setSaving(false); onUpdated();
  };

  const removeFromPipeline = async () => {
    if (!dealId || !deal) return;
    if (!confirm(`Remove ${deal.contact.companyName || deal.contact.name} from pipeline?`)) return;
    setRemoving(true);
    await fetch(`/api/deals/${dealId}`, { method: "DELETE" });
    cacheInvalidate(`deal-${dealId}`, "pipeline-deals", "dashboard");
    onClose(); onUpdated(); onRemoved?.();
  };

  const saveContactField = async (field: "company" | "poc") => {
    if (!deal) return; setEditingField(null);
    const payload = field === "company" ? { companyName: companyDraft.trim() || null } : { name: pocDraft.trim() || deal.contact.name };
    const updated = await fetch(`/api/contacts/${deal.contact.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }).then((r) => r.json());
    setDeal((d) => d ? { ...d, contact: { ...d.contact, ...updated } } : d); onUpdated();
  };

  const postActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activityBody.trim() && pendingFiles.length === 0) return;
    if (!dealId) return;
    setPosting(true);
    const activity = await fetch(`/api/deals/${dealId}/activities`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: activityType, body: activityBody, attachments: pendingFiles }),
    }).then((r) => r.json());
    setDeal((d) => d ? { ...d, activities: [...d.activities, activity] } : d);
    setActivityBody(""); setPendingFiles([]); setPosting(false);
  };

  const saveEdit = async (id: string) => {
    if (!dealId) return;
    const updated = await fetch(`/api/deals/${dealId}/activities/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ body: editingBody }) }).then((r) => r.json());
    setDeal((d) => d ? { ...d, activities: d.activities.map((a) => a.id === id ? updated : a) } : d);
    setEditingId(null); setEditingBody("");
  };

  const deleteActivity = async (id: string) => {
    if (!dealId || !confirm("Delete this update?")) return;
    await fetch(`/api/deals/${dealId}/activities/${id}`, { method: "DELETE" });
    setDeal((d) => d ? { ...d, activities: d.activities.filter((a) => a.id !== id) } : d);
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const imageItems = Array.from(e.clipboardData.items).filter((i) => i.type.startsWith("image/"));
    if (imageItems.length === 0) return;
    e.preventDefault();
    imageItems.forEach((item) => {
      const blob = item.getAsFile();
      if (!blob) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const data = ev.target?.result as string;
        const img = new Image();
        img.onload = () => {
          const MAX = 1200;
          const scale = Math.min(1, MAX / Math.max(img.width, img.height));
          const canvas = document.createElement("canvas");
          canvas.width = img.width * scale; canvas.height = img.height * scale;
          canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
          setPendingFiles((p) => [...p, { name: `screenshot-${Date.now()}.jpg`, type: "image/jpeg", size: blob.size, data: canvas.toDataURL("image/jpeg", 0.82) }]);
        };
        img.src = data;
      };
      reader.readAsDataURL(blob);
    });
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    files.forEach((file) => {
      if (file.size > 8 * 1024 * 1024) { alert(`${file.name} is over 8 MB — skipped.`); return; }
      const reader = new FileReader();
      reader.onload = (ev) => {
        const data = ev.target?.result as string;
        if (file.type.startsWith("image/")) {
          const img = new Image();
          img.onload = () => {
            const MAX = 1200;
            const scale = Math.min(1, MAX / Math.max(img.width, img.height));
            const canvas = document.createElement("canvas");
            canvas.width  = img.width  * scale;
            canvas.height = img.height * scale;
            canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
            setPendingFiles((p) => [...p, { name: file.name, type: file.type, size: file.size, data: canvas.toDataURL("image/jpeg", 0.82) }]);
          };
          img.src = data;
        } else {
          setPendingFiles((p) => [...p, { name: file.name, type: file.type, size: file.size, data }]);
        }
      };
      reader.readAsDataURL(file);
    });
    e.target.value = "";
  };

  const addTask = async (e: React.FormEvent) => {
    e.preventDefault(); if (!newTask.trim() || !dealId) return;
    const task = await fetch("/api/tasks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: newTask.trim(), dealId, dueAt: newTaskDue || null }) }).then((r) => r.json());
    setDeal((d) => d ? { ...d, tasks: [...d.tasks, task] } : d); setNewTask(""); setNewTaskDue("");
  };

  const toggleTask = async (taskId: string, completed: boolean) => {
    const updated = await fetch(`/api/tasks/${taskId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ completed }) }).then((r) => r.json());
    setDeal((d) => d ? { ...d, tasks: d.tasks.map((t) => t.id === taskId ? updated : t) } : d);
  };

  const deleteTask = async (taskId: string) => {
    await fetch(`/api/tasks/${taskId}`, { method: "DELETE" });
    setDeal((d) => d ? { ...d, tasks: d.tasks.filter((t) => t.id !== taskId) } : d);
  };

  if (!open) return null;

  return (
    <>
    <SlideOver open={open} onClose={onClose} title="">
      {loading || !deal ? (
        <div className="flex h-40 items-center justify-center text-sm" style={{ color: "var(--stone)" }}>Loading…</div>
      ) : (
        <div className="flex flex-col h-full" style={{ position: "relative" }}>

          {/* ── Contact sub-view (slides over deal view) ───────────── */}
          {view === "contact" && (
            <div className="animate-fade-up flex flex-col h-full" style={{ position: "absolute", inset: 0, background: "var(--paper)", zIndex: 10 }}>
              {/* Back header */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 20px", borderBottom: "1px solid var(--cloud-2)", flexShrink: 0 }}>
                <button onClick={() => setView("deal")}
                  style={{ width: 28, height: 28, borderRadius: 6, background: "transparent", border: "1px solid var(--mist)", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", color: "var(--stone)" }}>
                  <ChevronLeft size={14} />
                </button>
                <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--stone)", fontWeight: 500 }}>Contact info</span>
                <div style={{ flex: 1 }} />
                <a href={`/contacts/${deal.contact.id}`} target="_blank" rel="noopener noreferrer"
                  style={{ height: 26, padding: "0 10px", fontSize: 11, fontWeight: 600, color: "var(--brand)", background: "var(--brand-wash)", border: "none", borderRadius: 999, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4, textDecoration: "none" }}>
                  <ExternalLink size={11} /> Open full page
                </a>
              </div>

              {/* Contact info */}
              <div className="flex-1 overflow-y-auto scrollbar-thin" style={{ padding: 20 }}>
                {/* Identity */}
                <div className="flex items-center gap-3 mb-5">
                  <ContactAvatar logoUrl={deal.contact.logoUrl} name={deal.contact.companyName || deal.contact.name} size="lg" />
                  <div>
                    <p style={{ fontFamily: "'Inter Tight', sans-serif", fontSize: 18, fontWeight: 700, color: "var(--ink)", margin: 0 }}>
                      {deal.contact.companyName || deal.contact.name}
                    </p>
                    {deal.contact.companyName && (
                      <p style={{ fontSize: 13, color: "var(--stone)", marginTop: 3 }}>POC · {deal.contact.name}</p>
                    )}
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {deal.contact.tier && <span className="chip violet">{deal.contact.tier.label}</span>}
                      {deal.contact.contactTags.map(({ tag }) => <span key={tag.id} className="chip">{tag.name}</span>)}
                    </div>
                  </div>
                </div>

                {/* All fields */}
                <dl className="space-y-4">
                  {[
                    { label: "POC Username",  value: deal.contact.pocUsername },
                    ...(deal.contact.pocs ?? []).map((p, i) => ({ label: `POC ${i + 2}`, value: p.username ? `${p.name} · ${p.username}` : p.name })),
                    { label: "Group Link",    value: deal.contact.groupLink,    link: true },
                    { label: "Telegram",      value: deal.contact.telegramUsername },
                    { label: "Twitter / X",   value: deal.contact.twitterHandle },
                    { label: "Email",         value: deal.contact.email },
                    { label: "Phone",         value: deal.contact.phone },
                  ].map(({ label, value, link }) => (
                    <div key={label}>
                      <dt style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--fog)", marginBottom: 4 }}>{label}</dt>
                      <dd style={{ margin: 0 }}>
                        {value ? (
                          link ? (
                            <a href={value} target="_blank" rel="noopener noreferrer"
                              style={{ fontSize: 13, fontWeight: 600, color: "var(--brand)", display: "inline-flex", alignItems: "center", gap: 4, textDecoration: "none" }}>
                              Open link <ExternalLink size={11} />
                            </a>
                          ) : (
                            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--graphite)" }}>{value}</span>
                          )
                        ) : <span style={{ fontSize: 13, color: "var(--mist)" }}>—</span>}
                      </dd>
                    </div>
                  ))}
                </dl>

                {/* Other deals */}
                {deal.contact.deals && deal.contact.deals.length > 1 && (
                  <div style={{ marginTop: 24, borderTop: "1px solid var(--cloud-2)", paddingTop: 18 }}>
                    <p style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--fog)", marginBottom: 10 }}>Other deals</p>
                    {deal.contact.deals.filter((d) => d.id !== dealId).map((d) => (
                      <div key={d.id} className="flex items-center gap-2 mb-2">
                        {d.stage && <span style={{ width: 6, height: 6, borderRadius: 999, background: d.stage.color, flexShrink: 0 }} />}
                        <span style={{ fontSize: 13, color: "var(--graphite)" }}>{d.stage?.name ?? "No stage"}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Panel top nav ──────────────────────────────────────── */}
          <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--cloud-2)", flexShrink: 0 }}>
            <div className="flex items-center gap-2 mb-4">
              <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 6, background: "transparent", border: "1px solid var(--mist)", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", color: "var(--stone)" }}>
                <ChevronLeft size={14} />
              </button>
              <span style={{ fontSize: 11, fontWeight: 500, color: "var(--stone)", fontFamily: "var(--font-mono)" }}>
                Pipeline{deal.stage ? ` · ${deal.stage.name}` : ""}
              </span>
              <div style={{ flex: 1 }} />
              <div ref={menuRef} style={{ position: "relative" }}>
                <button
                  onClick={() => setMenuOpen((v) => !v)}
                  style={{ width: 28, height: 28, borderRadius: 6, background: menuOpen ? "var(--cloud-2)" : "transparent", border: "1px solid var(--mist)", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", color: "var(--stone)" }}
                >
                  <MoreHorizontal size={14} />
                </button>
                {menuOpen && (
                  <div style={{ position: "absolute", top: "calc(100% + 6px)", right: 0, zIndex: 50, background: "var(--paper)", border: "1px solid var(--cloud-2)", borderRadius: 8, boxShadow: "0 4px 16px rgba(0,0,0,0.12)", minWidth: 180, padding: "4px 0" }}>
                    <button
                      onClick={() => { setMenuOpen(false); removeFromPipeline(); }}
                      disabled={removing}
                      style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "var(--rose)", textAlign: "left" }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--rose-wash)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
                    >
                      <Trash2 size={13} />
                      {removing ? "Removing…" : "Remove from pipeline"}
                    </button>
                  </div>
                )}
              </div>
              <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 6, background: "transparent", border: "1px solid var(--mist)", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", color: "var(--stone)" }}>
                <X size={14} />
              </button>
            </div>

            {/* Contact identity */}
            <div className="flex items-start gap-3">
              <ContactAvatar logoUrl={deal.contact.logoUrl} name={deal.contact.companyName || deal.contact.name} size="lg" />
              <div className="flex-1 min-w-0">
                {/* Company — inline editable */}
                {editingField === "company" ? (
                  <input autoFocus value={companyDraft} onChange={(e) => setCompanyDraft(e.target.value)}
                    onBlur={() => saveContactField("company")}
                    onKeyDown={(e) => { if (e.key === "Enter") saveContactField("company"); if (e.key === "Escape") { setEditingField(null); setCompanyDraft(deal.contact.companyName ?? ""); } }}
                    style={{ ...inp.style, border: "1px solid var(--brand)", borderRadius: 6, padding: "2px 8px", fontSize: 18, fontWeight: 700, outline: "none", width: "100%" }} />
                ) : (
                  <div className="group flex items-center gap-1.5 cursor-pointer"
                    onClick={() => { setEditingField("company"); setCompanyDraft(deal.contact.companyName ?? ""); }}>
                    <span style={{ fontFamily: "'Inter Tight', sans-serif", fontSize: 20, fontWeight: 700, color: "var(--ink)", letterSpacing: "-0.01em" }}>
                      {deal.contact.companyName || <span style={{ color: "var(--fog)", fontWeight: 400, fontSize: 16 }}>Add company…</span>}
                    </span>
                    <Pencil size={12} style={{ color: "var(--fog)", flexShrink: 0 }} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                )}

                {/* POC — inline editable */}
                {editingField === "poc" ? (
                  <input autoFocus value={pocDraft} onChange={(e) => setPocDraft(e.target.value)}
                    onBlur={() => saveContactField("poc")}
                    onKeyDown={(e) => { if (e.key === "Enter") saveContactField("poc"); if (e.key === "Escape") { setEditingField(null); setPocDraft(deal.contact.name); } }}
                    style={{ ...inp.style, border: "1px solid var(--brand)", borderRadius: 6, padding: "1px 6px", fontSize: 13, outline: "none", width: "100%", marginTop: 2 }} />
                ) : (
                  <div className="group flex items-center gap-1 cursor-pointer mt-0.5"
                    onClick={() => { setEditingField("poc"); setPocDraft(deal.contact.name); }}>
                    <span style={{ fontSize: 13, color: "var(--stone)", fontWeight: 500 }}>POC · {deal.contact.name}</span>
                    <Pencil size={10} style={{ color: "var(--fog)" }} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                )}

                {/* Chips row */}
                <div className="flex flex-wrap gap-1.5 mt-2.5">
                  {deal.contact.tier && <span className="chip violet">{deal.contact.tier.label}</span>}
                  {deal.stage && <span className="chip brand dot">{deal.stage.name}</span>}
                  {deal.contact.contactTags.map(({ tag }) => <span key={tag.id} className="chip">{tag.name}</span>)}
                </div>

                {/* Contact links */}
                <div className="flex flex-wrap gap-3 mt-2.5">
                  {[
                    { v: deal.contact.pocUsername,      icon: "✈" },
                    ...(deal.contact.pocs ?? []).map((p) => ({ v: p.username || p.name, icon: "✈" })),
                    { v: deal.contact.telegramUsername, icon: "TG" },
                    { v: deal.contact.twitterHandle,    icon: "𝕏" },
                    { v: deal.contact.email,            icon: "✉" },
                  ].filter(({ v }) => v).map(({ v, icon }, i) => (
                    <span key={i} style={{ fontSize: 11, color: "var(--stone)", fontFamily: "var(--font-mono)", display: "inline-flex", alignItems: "center", gap: 4 }}>
                      <span style={{ color: "var(--brand)" }}>{icon}</span> {v}
                    </span>
                  ))}
                  {deal.contact.groupLink && (
                    <a href={deal.contact.groupLink} target="_blank" rel="noopener noreferrer"
                      style={{ fontSize: 11, color: "var(--brand)", fontFamily: "var(--font-mono)", display: "inline-flex", alignItems: "center", gap: 4, textDecoration: "none" }}>
                      <ExternalLink size={11} /> Group link
                    </a>
                  )}
                </div>

                {/* View Contact button */}
                <button onClick={() => setView("contact")} className="btn xs" style={{ marginTop: 10, background: "var(--brand-wash)", color: "var(--brand-deep)", borderColor: "transparent" }}>
                  <User size={11} /> View full contact
                </button>
              </div>
            </div>
          </div>

          {/* ── Tab strip ─────────────────────────────────────────── */}
          <div style={{ display: "flex", gap: 2, padding: "0 16px", borderBottom: "1px solid var(--cloud-2)", flexShrink: 0 }}>
            {(["updates", "tasks", "details"] as Tab[]).map((t) => (
              <button key={t} onClick={() => setTab(t)} style={{
                background: "transparent", border: 0, cursor: "pointer",
                padding: "12px 12px", fontSize: 12, fontWeight: 500,
                color: tab === t ? "var(--ink)" : "var(--stone)",
                borderBottom: tab === t ? "2px solid var(--brand)" : "2px solid transparent",
                marginBottom: -1, textTransform: "capitalize",
                display: "inline-flex", alignItems: "center", gap: 6,
                transition: "color 0.15s",
              }}>
                {t}
                {t === "updates" && deal.activities.length > 0 && (
                  <span style={{ fontSize: 10, fontFamily: "var(--font-mono)", background: tab === t ? "var(--brand-wash)" : "var(--cloud-2)", color: tab === t ? "var(--brand-deep)" : "var(--stone)", padding: "2px 5px", borderRadius: 999 }}>
                    {deal.activities.length}
                  </span>
                )}
                {t === "tasks" && deal.tasks.length > 0 && (
                  <span style={{ fontSize: 10, fontFamily: "var(--font-mono)", background: "var(--cloud-2)", color: "var(--stone)", padding: "2px 5px", borderRadius: 999 }}>
                    {deal.tasks.filter((x) => !x.completed).length}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* ── Latest status strip (always visible) ──────────────── */}
          <div style={{ padding: "12px 20px", background: "var(--cloud)", borderBottom: "1px solid var(--cloud-2)", flexShrink: 0 }}>
            <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--fog)", marginBottom: 6 }}>Latest status</div>
            <input value={latestStatus} onChange={(e) => setLatestStatus(e.target.value)}
              onBlur={saveInfo}
              onKeyDown={(e) => { if (e.key === "Enter") saveInfo(); }}
              placeholder="What's the current status of this deal?"
              style={{ ...inp.style, border: "1px solid var(--mist)", borderRadius: 6, padding: "6px 10px", fontSize: 13, fontWeight: 500, outline: "none", width: "100%", background: "var(--paper)" }} />
            {(callDate || meetLink) && (
              <div className="flex gap-2 mt-2">
                {callDate && (
                  <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, background: "var(--paper)", borderRadius: 999, padding: "5px 10px", border: "1px solid var(--mist)" }}>
                    <Calendar size={13} color="var(--brand)" />
                    <span style={{ fontSize: 12, fontFamily: "var(--font-mono)", fontWeight: 600, color: "var(--ink)" }}>
                      {new Date(`${callDate}T${callTime || "00:00"}`).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </span>
                    <span style={{ fontSize: 11, color: "var(--stone)" }}>call</span>
                  </div>
                )}
                {meetLink && (
                  <a href={meetLink} target="_blank" rel="noopener noreferrer"
                    style={{ height: 32, padding: "0 14px", background: "var(--brand)", color: "white", borderRadius: 999, border: "none", fontSize: 12, fontWeight: 500, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6, textDecoration: "none" }}>
                    <Link2 size={12} /> Meet link
                  </a>
                )}
              </div>
            )}
          </div>

          {/* ── Tab content ───────────────────────────────────────── */}
          <div className="flex-1 overflow-y-auto scrollbar-thin">

            {/* UPDATES tab */}
            {tab === "updates" && (
              <div className="flex flex-col">
                {deal.activities.length === 0 && (
                  <p style={{ padding: "24px 20px", fontSize: 13, color: "var(--stone)" }}>
                    {fetchingActivities ? "Loading updates…" : "No updates yet."}
                  </p>
                )}
                {deal.activities.map((a, idx) => {
                  const s = ACT_STYLE[a.type] ?? ACT_STYLE.note;
                  return (
                    <div key={a.id} className="group animate-fade-in flex gap-3"
                      style={{ padding: "12px 20px", borderBottom: "1px solid var(--cloud-2)" }}>
                      <div style={{ width: 28, height: 28, borderRadius: 6, flexShrink: 0, background: s.bg, color: s.color, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <span style={{ fontSize: 11, fontWeight: 600 }}>{a.type.slice(0, 2).toUpperCase()}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        {editingId === a.id ? (
                          <div className="flex flex-col gap-2">
                            <textarea value={editingBody} onChange={(e) => setEditingBody(e.target.value)} autoFocus rows={3}
                              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); saveEdit(a.id); } if (e.key === "Escape") { setEditingId(null); setEditingBody(""); } }}
                              style={{ ...inp.style, border: "1px solid var(--brand)", borderRadius: 6, padding: "8px 10px", fontSize: 13, resize: "none", outline: "none", width: "100%" }} />
                            <div className="flex gap-2">
                              <button onClick={() => saveEdit(a.id)} className="btn brand xs"><Check size={11} /> Save</button>
                              <button onClick={() => { setEditingId(null); setEditingBody(""); }} className="btn secondary xs">Cancel</button>
                            </div>
                          </div>
                        ) : (
                          <>
                            {a.body && <p style={{ fontSize: 13, lineHeight: 1.5, color: "var(--graphite)", whiteSpace: "pre-wrap" }}>{a.body}</p>}
                            {/* Attachment previews */}
                            {(a.attachments ?? []).length > 0 && (
                              <div className="flex flex-wrap gap-2 mt-2">
                                {(a.attachments ?? []).map((att, ai) => (
                                  <button key={ai} onClick={() => onOpenLightbox?.(att)}
                                    style={{ background: "var(--cloud)", border: "1px solid var(--mist)", borderRadius: 6, padding: 0, cursor: "pointer", overflow: "hidden", width: 72, height: 72, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                                    {att.type.startsWith("image/") ? (
                                      <img src={att.data} alt={att.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                    ) : (
                                      <div style={{ textAlign: "center", padding: 4 }}>
                                        <File size={20} color="var(--brand)" />
                                        <p style={{ fontSize: 9, color: "var(--stone)", marginTop: 3, lineHeight: 1.2, wordBreak: "break-all" }}>{att.name.slice(0, 12)}</p>
                                      </div>
                                    )}
                                  </button>
                                ))}
                              </div>
                            )}
                            <div className="flex items-center gap-2 mt-1">
                              <span style={{ fontSize: 11, color: "var(--fog)", fontFamily: "var(--font-mono)" }}>
                                {format(new Date(a.createdAt), "MMM d, yyyy · h:mm a")}
                              </span>
                              <div className="hidden group-hover:flex items-center gap-0.5">
                                <button onClick={() => { setEditingId(a.id); setEditingBody(a.body ?? ""); }}
                                  style={{ width: 22, height: 22, borderRadius: 4, background: "transparent", border: 0, cursor: "pointer", color: "var(--fog)", display: "inline-flex", alignItems: "center", justifyContent: "center" }}
                                  className="hover:bg-cloud-2 hover:text-slate transition-colors">
                                  <Pencil size={12} />
                                </button>
                                <button onClick={() => deleteActivity(a.id)}
                                  style={{ width: 22, height: 22, borderRadius: 4, background: "transparent", border: 0, cursor: "pointer", color: "var(--fog)", display: "inline-flex", alignItems: "center", justifyContent: "center" }}
                                  className="hover:bg-rose-50 hover:text-rose transition-colors">
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
                <div ref={bottomRef} />
              </div>
            )}

            {/* TASKS tab */}
            {tab === "tasks" && (
              <div>
                {deal.tasks.length === 0 && (
                  <p style={{ padding: "24px 20px", fontSize: 13, color: "var(--stone)" }}>
                    {fetchingActivities ? "Loading tasks…" : "No tasks yet."}
                  </p>
                )}
                {deal.tasks.map((t) => (
                  <div key={t.id} className="group animate-fade-in flex items-center gap-3"
                    style={{ padding: "10px 20px", borderBottom: "1px solid var(--cloud-2)" }}>
                    <button onClick={() => toggleTask(t.id, !t.completed)}
                      style={{ flexShrink: 0, background: "transparent", border: 0, cursor: "pointer", color: t.completed ? "var(--brand)" : "var(--mist)", transition: "all 0.15s" }}>
                      {t.completed ? <CheckCircle2 size={18} /> : <Circle size={18} />}
                    </button>
                    <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: t.completed ? "var(--fog)" : "var(--graphite)", textDecoration: t.completed ? "line-through" : "none", transition: "all 0.2s" }}>
                      {t.title}
                    </span>
                    {t.dueAt && (
                      <span style={{ fontSize: 10, fontFamily: "var(--font-mono)", fontWeight: 600, color: new Date(t.dueAt) < new Date() && !t.completed ? "var(--rose)" : "var(--stone)", flexShrink: 0 }}>
                        {new Date(t.dueAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                      </span>
                    )}
                    <button onClick={() => deleteTask(t.id)}
                      style={{ width: 22, height: 22, background: "transparent", border: 0, cursor: "pointer", color: "var(--mist)", display: "inline-flex", alignItems: "center", justifyContent: "center", borderRadius: 4 }}
                      className="hidden group-hover:flex hover:text-rose transition-colors">
                      <X size={13} />
                    </button>
                  </div>
                ))}
                <form onSubmit={addTask} style={{ padding: "12px 20px", borderTop: deal.tasks.length > 0 ? "1px solid var(--cloud-2)" : "none" }}>
                  <input value={newTask} onChange={(e) => setNewTask(e.target.value)} placeholder="Add a task… (Enter to save)"
                    style={{ ...inp.style, border: "1px solid var(--mist)", borderRadius: 6, padding: "8px 12px", fontSize: 13, outline: "none", width: "100%", marginBottom: 6 }} />
                  <div className="flex items-center gap-2">
                    <span style={{ fontSize: 11, color: "var(--fog)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>Due</span>
                    <input type="datetime-local" value={newTaskDue} onChange={(e) => setNewTaskDue(e.target.value)}
                      style={{ ...inp.style, border: "1px solid var(--mist)", borderRadius: 6, padding: "4px 8px", fontSize: 12, outline: "none", flex: 1 }} />
                    {newTaskDue && (
                      <button type="button" onClick={() => setNewTaskDue("")}
                        style={{ background: "transparent", border: 0, cursor: "pointer", color: "var(--fog)", display: "inline-flex" }}>
                        <X size={12} />
                      </button>
                    )}
                  </div>
                </form>
              </div>
            )}

            {/* DETAILS tab */}
            {tab === "details" && (
              <div style={{ padding: "20px" }} className="space-y-4 animate-fade-up">

                {/* Owner selector */}
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--fog)", marginBottom: 8 }}>Deal owner</label>
                  <select value={ownerId} onChange={(e) => setOwnerId(e.target.value)}
                    style={{ ...inp.style, border: "1px solid var(--mist)", borderRadius: 6, padding: "6px 10px", fontSize: 13, outline: "none", width: "100%", cursor: "pointer" }}>
                    <option value="">— unassigned —</option>
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </div>

                {[
                  { label: "Description", render: (
                    <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} placeholder="Context about this deal…"
                      style={{ ...inp.style, border: "1px solid var(--mist)", borderRadius: 6, padding: "8px 12px", fontSize: 13, resize: "none", outline: "none", width: "100%" }} />
                  )},
                  { label: `Call Date & Time (${Intl.DateTimeFormat().resolvedOptions().timeZone})`, render: (
                    <div style={{ display: "flex", gap: 8 }}>
                      <input type="date" value={callDate} onChange={(e) => setCallDate(e.target.value)}
                        style={{ ...inp.style, border: "1px solid var(--mist)", borderRadius: 6, padding: "6px 10px", fontSize: 13, outline: "none", flex: 1, minWidth: 0 }} />
                      <input type="time" value={callTime} onChange={(e) => setCallTime(e.target.value)}
                        style={{ ...inp.style, border: "1px solid var(--mist)", borderRadius: 6, padding: "6px 10px", fontSize: 13, outline: "none", width: 105, flexShrink: 0 }} />
                    </div>
                  )},
                  { label: "Meet Link", render: (
                    <input type="url" value={meetLink} onChange={(e) => setMeetLink(e.target.value)} placeholder="https://…"
                      style={{ ...inp.style, border: "1px solid var(--mist)", borderRadius: 6, padding: "6px 12px", fontSize: 13, outline: "none", width: "100%" }} />
                  )},
                ].map(({ label, render }) => (
                  <div key={label}>
                    <label style={{ display: "block", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--fog)", marginBottom: 8 }}>{label}</label>
                    {render}
                  </div>
                ))}
                {/* Custom Fields */}
                {customFieldDefs.length > 0 && (
                  <div style={{ borderTop: "1px solid var(--cloud-2)", paddingTop: 16 }}>
                    <p style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--fog)", marginBottom: 12 }}>Custom Fields</p>
                    <div className="space-y-4">
                      {customFieldDefs.map((def) => (
                        <div key={def.id}>
                          <label style={{ display: "block", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--fog)", marginBottom: 8 }}>{def.name}</label>
                          {def.fieldType === "select" ? (
                            <select value={customFieldValues[def.id] ?? ""}
                              onChange={(e) => setCustomFieldValues((v) => ({ ...v, [def.id]: e.target.value }))}
                              style={{ ...inp.style, border: "1px solid var(--mist)", borderRadius: 6, padding: "6px 10px", fontSize: 13, outline: "none", width: "100%", cursor: "pointer" }}>
                              <option value="">— select —</option>
                              {def.options.map((o) => <option key={o} value={o}>{o}</option>)}
                            </select>
                          ) : (
                            <input
                              type={def.fieldType === "number" ? "number" : def.fieldType === "date" ? "date" : def.fieldType === "url" ? "url" : "text"}
                              value={customFieldValues[def.id] ?? ""}
                              onChange={(e) => setCustomFieldValues((v) => ({ ...v, [def.id]: e.target.value }))}
                              style={{ ...inp.style, border: "1px solid var(--mist)", borderRadius: 6, padding: "6px 10px", fontSize: 13, outline: "none", width: "100%" }}
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between pt-2">
                  <button onClick={removeFromPipeline} disabled={removing} className="btn danger sm">
                    <Trash2 size={12} /> {removing ? "Removing…" : "Remove from Pipeline"}
                  </button>
                  <button onClick={saveInfo} disabled={saving} className="btn primary sm">
                    {saving ? "Saving…" : "Save"}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ── Composer (only on updates tab) ────────────────────── */}
          {tab === "updates" && (
            <div style={{ padding: 14, borderTop: "1px solid var(--cloud-2)", background: "var(--paper)", flexShrink: 0 }}>
              <div className="flex gap-1.5 mb-2">
                {["note", "call", "update"].map((v) => (
                  <button key={v} type="button" onClick={() => setActivityType(v)}
                    className={activityType === v ? "btn xs" : "btn ghost xs"}
                    style={activityType === v ? { background: "var(--brand-wash)", color: "var(--brand-deep)", borderColor: "var(--brand)", textTransform: "capitalize" } : { textTransform: "capitalize" }}>
                    {v}
                  </button>
                ))}
              </div>
              <input ref={fileInputRef} type="file" multiple accept="image/*,.pdf,.doc,.docx,.txt,.csv" className="hidden" onChange={handleFileSelect} />
              <form onSubmit={postActivity}>
                <div style={{ border: "1px solid var(--mist)", borderRadius: 10, overflow: "hidden", background: "var(--paper)" }}>
                  <textarea value={activityBody} onChange={(e) => setActivityBody(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); postActivity(e); } }}
                    onPaste={handlePaste}
                    rows={3} placeholder="Add a note, log a call… Enter to post  ·  Ctrl+V to paste screenshot"
                    style={{ display: "block", width: "100%", border: 0, outline: "none", resize: "none", padding: "10px 12px", fontSize: 13, color: "var(--ink)", background: "transparent", fontFamily: "var(--font-sans)" }} />
                  {/* Pending file previews */}
                  {pendingFiles.length > 0 && (
                    <div className="flex flex-wrap gap-2" style={{ padding: "8px 12px", borderTop: "1px solid var(--cloud-2)" }}>
                      {pendingFiles.map((f, i) => (
                        <div key={i} style={{ position: "relative", width: 56, height: 56, borderRadius: 6, overflow: "hidden", border: "1px solid var(--mist)", background: "var(--cloud)", flexShrink: 0 }}>
                          {f.type.startsWith("image/") ? (
                            <img src={f.data} alt={f.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          ) : (
                            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 2 }}>
                              <File size={18} color="var(--brand)" />
                              <span style={{ fontSize: 8, color: "var(--stone)", textAlign: "center", padding: "0 2px", lineHeight: 1.2, wordBreak: "break-all" }}>{f.name.slice(0, 10)}</span>
                            </div>
                          )}
                          <button type="button" onClick={() => setPendingFiles((p) => p.filter((_, j) => j !== i))}
                            style={{ position: "absolute", top: 1, right: 1, width: 14, height: 14, borderRadius: 999, background: "rgba(10,11,16,0.7)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <X size={8} color="white" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 10px", borderTop: "1px solid var(--cloud-2)" }}>
                    <button type="button" onClick={() => fileInputRef.current?.click()}
                      style={{ width: 28, height: 28, borderRadius: 6, background: "transparent", border: "1px solid var(--mist)", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", color: pendingFiles.length > 0 ? "var(--brand)" : "var(--stone)" }}>
                      <Paperclip size={13} />
                    </button>
                    {pendingFiles.length > 0 && (
                      <span style={{ fontSize: 11, color: "var(--brand)", fontWeight: 500 }}>{pendingFiles.length} file{pendingFiles.length > 1 ? "s" : ""}</span>
                    )}
                    <div style={{ flex: 1 }} />
                    <button type="submit" disabled={posting || (!activityBody.trim() && pendingFiles.length === 0)} className="btn primary sm">
                      <Send size={12} /> Post
                    </button>
                  </div>
                </div>
              </form>
            </div>
          )}
        </div>
      )}
    </SlideOver>
    </>
  );
}
