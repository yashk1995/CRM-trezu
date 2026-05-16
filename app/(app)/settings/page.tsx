"use client";

import { useEffect, useRef, useState } from "react";
import { Plus, Pencil, Trash2, Check, X } from "lucide-react";

interface Stage { id: string; name: string; color: string; order: number }
interface Tier  { id: string; label: string; order: number }
interface Tag   { id: string; name: string; color: string }

const PRESET_COLORS = [
  "#0953FF","#6D52F5","#EC4899","#EF4444","#F97316",
  "#EAB308","#22C55E","#10B981","#14B8A6","#06B6D4","#3B82F6","#64748B",
];

function ColorDot({ color, onChange }: { color: string; onChange: (c: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button type="button" onClick={() => setOpen((v) => !v)}
        style={{ width: 20, height: 20, borderRadius: 999, background: color, border: "2px solid white", boxShadow: "0 0 0 1px var(--mist)", cursor: "pointer", flexShrink: 0 }} />
      {open && (
        <div className="animate-scale-in" style={{ position: "absolute", left: 0, top: 28, zIndex: 20, display: "flex", flexWrap: "wrap", gap: 6, background: "var(--paper)", border: "1px solid var(--mist)", borderRadius: 10, padding: 10, boxShadow: "0 4px 16px rgba(10,11,16,0.08)", width: 172 }}>
          {PRESET_COLORS.map((c) => (
            <button key={c} type="button" onClick={() => { onChange(c); setOpen(false); }}
              style={{ width: 20, height: 20, borderRadius: 999, background: c, border: color === c ? "2px solid var(--ink)" : "2px solid white", boxShadow: "0 0 0 1px var(--mist)", cursor: "pointer", transform: color === c ? "scale(1.15)" : "scale(1)", transition: "transform 0.1s" }} />
          ))}
        </div>
      )}
    </div>
  );
}

function InlineEdit({ value, onSave, placeholder }: { value: string; onSave: (v: string) => void; placeholder?: string }) {
  const [editing, setEditing] = useState(false);
  const [draft,   setDraft]   = useState(value);
  const ref = useRef<HTMLInputElement>(null);
  const start = () => { setDraft(value); setEditing(true); setTimeout(() => ref.current?.focus(), 0); };
  const save  = () => { setEditing(false); if (draft.trim() && draft.trim() !== value) onSave(draft.trim()); else setDraft(value); };
  const cancel= () => { setEditing(false); setDraft(value); };
  if (editing) return (
    <div className="flex items-center gap-1.5 flex-1">
      <input ref={ref} value={draft} onChange={(e) => setDraft(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => { if (e.key === "Enter") save(); if (e.key === "Escape") cancel(); }}
        style={{ flex: 1, border: "1px solid var(--brand)", borderRadius: 6, padding: "3px 8px", fontSize: 13, color: "var(--ink)", outline: "none", background: "var(--paper)" }} />
      <button type="button" onClick={save}   style={{ width: 22, height: 22, borderRadius: 4, background: "var(--brand)", border: 0, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" }}><Check size={11} color="white" /></button>
      <button type="button" onClick={cancel} style={{ width: 22, height: 22, borderRadius: 4, background: "transparent", border: "1px solid var(--mist)", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" }}><X size={11} color="var(--stone)" /></button>
    </div>
  );
  return (
    <button type="button" onClick={start} className="group flex items-center gap-1.5 flex-1 text-left">
      <span style={{ fontSize: 13, color: "var(--graphite)", fontWeight: 500 }}>{value || <span style={{ color: "var(--fog)" }}>{placeholder}</span>}</span>
      <Pencil size={11} style={{ color: "var(--fog)" }} className="opacity-0 group-hover:opacity-100 transition-opacity" />
    </button>
  );
}

function SectionCard({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{ background: "var(--paper)", border: "1px solid var(--mist)", borderRadius: 12, overflow: "hidden" }} className="animate-fade-up">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderBottom: "1px solid var(--cloud-2)" }}>
        <h3 style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>{title}</h3>
        {action}
      </div>
      {children}
    </div>
  );
}

function AddButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button onClick={onClick}
      style={{ height: 28, padding: "0 12px", background: "var(--brand)", color: "white", borderRadius: 999, border: "none", fontSize: 11, fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4 }}>
      <Plus size={11} /> {label}
    </button>
  );
}

// ── Stages ────────────────────────────────────────────────────────────────

function StagesSection() {
  const [stages,  setStages]  = useState<Stage[]>([]);
  const [newName, setNewName] = useState("");
  const [adding,  setAdding]  = useState(false);

  useEffect(() => { fetch("/api/pipeline-stages").then((r) => r.json()).then(setStages); }, []);

  async function patchStage(id: string, data: Record<string, unknown>) {
    await fetch(`/api/pipeline-stages/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  }

  async function rename(id: string, name: string) {
    await patchStage(id, { name });
    setStages((s) => s.map((x) => (x.id === id ? { ...x, name } : x)));
  }

  async function recolor(id: string, color: string) {
    await patchStage(id, { color });
    setStages((s) => s.map((x) => (x.id === id ? { ...x, color } : x)));
  }

  async function reorder(id: string, dir: "up" | "down") {
    const idx  = stages.findIndex((s) => s.id === id);
    const swap = dir === "up" ? idx - 1 : idx + 1;
    if (swap < 0 || swap >= stages.length) return;
    const next = [...stages];
    const tmp  = next[idx];
    next[idx]  = next[swap];
    next[swap] = tmp;
    setStages(next);
    await patchStage(next[idx].id,  { order: idx + 1 });
    await patchStage(next[swap].id, { order: swap + 1 });
  }

  const add = async () => {
    const name = newName.trim();
    if (!name) return;
    const res   = await fetch("/api/pipeline-stages", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) });
    const stage = await res.json();
    setStages((s) => [...s, stage]);
    setNewName("");
    setAdding(false);
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this stage? Deals in it will lose their stage.")) return;
    await fetch(`/api/pipeline-stages/${id}`, { method: "DELETE" });
    setStages((s) => s.filter((x) => x.id !== id));
  };

  return (
    <SectionCard title="Pipeline Stages" action={<AddButton label="Add Stage" onClick={() => setAdding(true)} />}>
      {stages.map((stage, i) => (
        <div key={stage.id} className="group flex items-center gap-3" style={{ padding: "10px 18px", borderBottom: "1px solid var(--cloud-2)" }}>
          <div className="flex flex-col" style={{ gap: 1 }}>
            <button onClick={() => reorder(stage.id, "up")}   disabled={i === 0}               style={{ fontSize: 9, lineHeight: 1, background: "transparent", border: 0, cursor: i === 0 ? "not-allowed" : "pointer", color: "var(--fog)", padding: 1 }}>▲</button>
            <button onClick={() => reorder(stage.id, "down")} disabled={i === stages.length-1} style={{ fontSize: 9, lineHeight: 1, background: "transparent", border: 0, cursor: i === stages.length-1 ? "not-allowed" : "pointer", color: "var(--fog)", padding: 1 }}>▼</button>
          </div>
          <ColorDot color={stage.color} onChange={(c) => recolor(stage.id, c)} />
          <InlineEdit value={stage.name} onSave={(name) => rename(stage.id, name)} placeholder="Stage name" />
          <button onClick={() => remove(stage.id)} style={{ width: 26, height: 26, borderRadius: 6, background: "transparent", border: 0, cursor: "pointer", color: "var(--fog)", display: "inline-flex", alignItems: "center", justifyContent: "center" }}
            className="opacity-0 group-hover:opacity-100 hover:bg-rose-50 hover:text-rose transition-all">
            <Trash2 size={13} />
          </button>
        </div>
      ))}
      {adding && (
        <div className="flex items-center gap-2 animate-slide-down" style={{ padding: "10px 18px", borderTop: "1px solid var(--cloud-2)" }}>
          <input autoFocus value={newName} onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") add(); if (e.key === "Escape") setAdding(false); }}
            placeholder="Stage name…"
            style={{ flex: 1, border: "1px solid var(--brand)", borderRadius: 6, padding: "6px 10px", fontSize: 13, color: "var(--ink)", outline: "none" }} />
          <button onClick={add}             style={{ width: 28, height: 28, borderRadius: 6, background: "var(--brand)", border: 0, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" }}><Check size={13} color="white" /></button>
          <button onClick={() => setAdding(false)} style={{ width: 28, height: 28, borderRadius: 6, background: "transparent", border: "1px solid var(--mist)", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" }}><X size={13} color="var(--stone)" /></button>
        </div>
      )}
      {stages.length === 0 && !adding && (
        <p style={{ padding: "20px 18px", fontSize: 13, color: "var(--stone)" }}>No stages yet.</p>
      )}
    </SectionCard>
  );
}

// ── Tiers ─────────────────────────────────────────────────────────────────

function TiersSection() {
  const [tiers, setTiers] = useState<Tier[]>([]);
  useEffect(() => { fetch("/api/tiers").then((r) => r.json()).then(setTiers); }, []);

  const rename = async (id: string, label: string) => {
    await fetch(`/api/tiers/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ label }) });
    setTiers((t) => t.map((x) => (x.id === id ? { ...x, label } : x)));
  };
  return (
    <SectionCard title="Tiers">
      <p style={{ padding: "10px 18px 0", fontSize: 12, color: "var(--stone)" }}>Rename tier labels — changes apply everywhere instantly.</p>
      {tiers.map((tier) => (
        <div key={tier.id} className="flex items-center gap-3" style={{ padding: "10px 18px", borderBottom: "1px solid var(--cloud-2)" }}>
          <span className="chip violet">T{tier.order}</span>
          <InlineEdit value={tier.label} onSave={(label) => rename(tier.id, label)} placeholder="Tier label" />
        </div>
      ))}
    </SectionCard>
  );
}

// ── Tags ──────────────────────────────────────────────────────────────────

function TagsSection() {
  const [tags,    setTags]    = useState<Tag[]>([]);
  const [newName, setNewName] = useState("");
  const [adding,  setAdding]  = useState(false);
  useEffect(() => { fetch("/api/tags").then((r) => r.json()).then(setTags); }, []);

  async function patchTag(id: string, data: Record<string, unknown>) {
    await fetch(`/api/tags/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  }

  async function rename(id: string, name: string) {
    await patchTag(id, { name });
    setTags((t) => t.map((x) => (x.id === id ? { ...x, name } : x)));
  }

  async function recolor(id: string, color: string) {
    await patchTag(id, { color });
    setTags((t) => t.map((x) => (x.id === id ? { ...x, color } : x)));
  }

  const add = async () => {
    const name = newName.trim();
    if (!name) return;
    const res = await fetch("/api/tags", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) });
    const tag = await res.json();
    setTags((t) => [...t, tag]);
    setNewName("");
    setAdding(false);
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this tag?")) return;
    await fetch(`/api/tags/${id}`, { method: "DELETE" });
    setTags((t) => t.filter((x) => x.id !== id));
  };
  return (
    <SectionCard title="Tags" action={<AddButton label="Add Tag" onClick={() => setAdding(true)} />}>
      {tags.map((tag) => (
        <div key={tag.id} className="group flex items-center gap-3" style={{ padding: "10px 18px", borderBottom: "1px solid var(--cloud-2)" }}>
          <ColorDot color={tag.color} onChange={(c) => recolor(tag.id, c)} />
          <InlineEdit value={tag.name} onSave={(name) => rename(tag.id, name)} placeholder="Tag name" />
          <button onClick={() => remove(tag.id)} style={{ width: 26, height: 26, borderRadius: 6, background: "transparent", border: 0, cursor: "pointer", color: "var(--fog)", display: "inline-flex", alignItems: "center", justifyContent: "center" }}
            className="opacity-0 group-hover:opacity-100 hover:bg-rose-50 hover:text-rose transition-all">
            <Trash2 size={13} />
          </button>
        </div>
      ))}
      {adding && (
        <div className="flex items-center gap-2 animate-slide-down" style={{ padding: "10px 18px", borderTop: "1px solid var(--cloud-2)" }}>
          <input autoFocus value={newName} onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") add(); if (e.key === "Escape") setAdding(false); }}
            placeholder="Tag name…"
            style={{ flex: 1, border: "1px solid var(--brand)", borderRadius: 6, padding: "6px 10px", fontSize: 13, outline: "none" }} />
          <button onClick={add}             style={{ width: 28, height: 28, borderRadius: 6, background: "var(--brand)", border: 0, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" }}><Check size={13} color="white" /></button>
          <button onClick={() => setAdding(false)} style={{ width: 28, height: 28, borderRadius: 6, background: "transparent", border: "1px solid var(--mist)", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" }}><X size={13} color="var(--stone)" /></button>
        </div>
      )}
      {tags.length === 0 && !adding && (
        <p style={{ padding: "20px 18px", fontSize: 13, color: "var(--stone)" }}>No tags yet.</p>
      )}
    </SectionCard>
  );
}

export default function SettingsPage() {
  return (
    <div style={{ maxWidth: 560 }} className="space-y-5">
      <div>
        <h1 style={{ fontFamily: "'Inter Tight', sans-serif", fontSize: 28, fontWeight: 600, letterSpacing: "-0.02em", color: "var(--ink)", margin: 0 }}>
          Settings
        </h1>
        <p style={{ fontSize: 14, color: "var(--stone)", marginTop: 6 }}>Manage your pipeline stages, tiers, and tags.</p>
      </div>
      <StagesSection />
      <TiersSection />
      <TagsSection />
    </div>
  );
}
