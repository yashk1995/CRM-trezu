"use client";

import { useEffect, useRef, useState } from "react";
import { Check, X, Trash2, Pencil, GripVertical, Plus, List, Layers, Tag, Sliders, Users, Globe, Bell, Settings2, Copy, LogIn, Lock, ShieldCheck } from "lucide-react";

interface Stage { id: string; name: string; color: string; order: number }
interface Tier  { id: string; label: string; order: number }
interface Tag   { id: string; name: string; color: string }
interface CustomFieldDef { id: string; name: string; fieldType: string; appliesTo: string; options: string[]; order: number }
interface Member { id: string; name: string; email: string; role: string }

const PRESET_COLORS = [
  "#0953FF","#6D52F5","#EC4899","#EF4444","#F97316",
  "#EAB308","#22C55E","#10B981","#14B8A6","#06B6D4","#3B82F6","#64748B",
];

const FIELD_TYPES = [
  { value: "text",   label: "Text" },
  { value: "number", label: "Number" },
  { value: "date",   label: "Date" },
  { value: "url",    label: "URL" },
  { value: "select", label: "Select" },
];

const NAV = [
  { key: "stages",   label: "Pipeline stages", icon: Layers },
  { key: "tiers",    label: "Tiers",            icon: Sliders },
  { key: "tags",     label: "Tags",             icon: Tag },
  { key: "custom",   label: "Custom fields",    icon: List },
  { key: "members",  label: "Members & roles",  icon: Users },
  { key: "password", label: "Change password",  icon: Lock },
  { key: "audit",    label: "Audit log",        icon: ShieldCheck },
  { key: "integrations", label: "Integrations", icon: Globe,   soon: true },
  { key: "notifications", label: "Notifications", icon: Bell,  soon: true },
  { key: "workspace", label: "Workspace",       icon: Settings2, soon: true },
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
        style={{ width: 24, height: 24, borderRadius: 6, background: color, border: "2px solid white", boxShadow: "0 0 0 1px var(--mist)", cursor: "pointer", flexShrink: 0 }} />
      {open && (
        <div className="animate-scale-in" style={{ position: "absolute", left: 0, top: 30, zIndex: 20, display: "flex", flexWrap: "wrap", gap: 6, background: "var(--paper)", border: "1px solid var(--mist)", borderRadius: 10, padding: 10, boxShadow: "0 4px 16px rgba(10,11,16,0.10)", width: 172 }}>
          {PRESET_COLORS.map((c) => (
            <button key={c} type="button" onClick={() => { onChange(c); setOpen(false); }}
              style={{ width: 22, height: 22, borderRadius: 5, background: c, border: color === c ? "2px solid var(--ink)" : "2px solid transparent", boxShadow: "0 0 0 1px var(--mist)", cursor: "pointer", transform: color === c ? "scale(1.1)" : "scale(1)", transition: "transform 0.1s" }} />
          ))}
        </div>
      )}
    </div>
  );
}

function InlineEdit({ value, onSave, placeholder }: { value: string; onSave: (v: string) => void; placeholder?: string }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const ref = useRef<HTMLInputElement>(null);
  const start = () => { setDraft(value); setEditing(true); setTimeout(() => ref.current?.focus(), 0); };
  const save  = () => { setEditing(false); if (draft.trim() && draft.trim() !== value) onSave(draft.trim()); else setDraft(value); };
  const cancel = () => { setEditing(false); setDraft(value); };
  if (editing) return (
    <div className="flex items-center gap-1.5 flex-1">
      <input ref={ref} value={draft} onChange={(e) => setDraft(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => { if (e.key === "Enter") save(); if (e.key === "Escape") cancel(); }}
        style={{ flex: 1, border: "1px solid var(--brand)", borderRadius: 6, padding: "4px 8px", fontSize: 13, color: "var(--ink)", outline: "none", background: "var(--paper)", boxShadow: "0 0 0 3px var(--brand-wash)" }} />
      <button type="button" onClick={save}   className="btn primary icon xs"><Check size={11} /></button>
      <button type="button" onClick={cancel} className="btn secondary icon xs"><X size={11} /></button>
    </div>
  );
  return (
    <button type="button" onClick={start} className="group flex items-center gap-1.5 flex-1 text-left">
      <span style={{ fontSize: 13, color: "var(--graphite)", fontWeight: 500 }}>{value || <span style={{ color: "var(--fog)" }}>{placeholder}</span>}</span>
      <Pencil size={11} style={{ color: "var(--fog)" }} className="opacity-0 group-hover:opacity-100 transition-opacity" />
    </button>
  );
}

// ── Stages ────────────────────────────────────────────────────────────────

function StagesSection() {
  const [stages, setStages] = useState<Stage[]>([]);
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);

  useEffect(() => { fetch("/api/pipeline-stages").then((r) => r.json()).then(setStages); }, []);

  async function patchStage(id: string, data: Record<string, unknown>) {
    await fetch(`/api/pipeline-stages/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
  }

  const rename  = async (id: string, name: string) => { await patchStage(id, { name }); setStages((s) => s.map((x) => x.id === id ? { ...x, name } : x)); };
  const recolor = async (id: string, color: string) => { await patchStage(id, { color }); setStages((s) => s.map((x) => x.id === id ? { ...x, color } : x)); };

  async function reorder(id: string, dir: "up" | "down") {
    const idx = stages.findIndex((s) => s.id === id);
    const swap = dir === "up" ? idx - 1 : idx + 1;
    if (swap < 0 || swap >= stages.length) return;
    const next = [...stages]; [next[idx], next[swap]] = [next[swap], next[idx]];
    setStages(next);
    await patchStage(next[idx].id, { order: idx + 1 });
    await patchStage(next[swap].id, { order: swap + 1 });
  }

  const add = async () => {
    const name = newName.trim(); if (!name) return;
    const res = await fetch("/api/pipeline-stages", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) });
    const stage = await res.json();
    setStages((s) => [...s, stage]); setNewName(""); setAdding(false);
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this stage? Deals in it will lose their stage.")) return;
    await fetch(`/api/pipeline-stages/${id}`, { method: "DELETE" });
    setStages((s) => s.filter((x) => x.id !== id));
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ fontFamily: "'Inter Tight', sans-serif", fontSize: 26, fontWeight: 600, letterSpacing: "-0.02em", color: "var(--ink)", margin: 0 }}>Pipeline stages</h1>
          <p style={{ fontSize: 13, color: "var(--stone)", marginTop: 6 }}>Rename, recolour, or reorder. Changes apply to all deals immediately.</p>
        </div>
        <button onClick={() => setAdding(true)} className="btn primary sm">
          <Plus size={13} /> Add stage
        </button>
      </div>

      <div style={{ background: "var(--paper)", border: "1px solid var(--mist)", borderRadius: 12, overflow: "hidden" }}>
        <div style={{ padding: "13px 18px", borderBottom: "1px solid var(--cloud-2)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h3 style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>
            Stages <span style={{ fontSize: 12, fontFamily: "var(--font-mono)", color: "var(--fog)", fontWeight: 400, marginLeft: 6 }}>{stages.length}</span>
          </h3>
        </div>

        {stages.map((stage, i) => (
          <div key={stage.id} className="group flex items-center gap-3" style={{ padding: "12px 18px", borderBottom: "1px solid var(--cloud-2)" }}>
            <div className="flex flex-col" style={{ gap: 1 }}>
              <button onClick={() => reorder(stage.id, "up")}   disabled={i === 0}               style={{ fontSize: 8, lineHeight: 1, background: "transparent", border: 0, cursor: i === 0 ? "default" : "pointer", color: "var(--fog)", padding: 1 }}>▲</button>
              <button onClick={() => reorder(stage.id, "down")} disabled={i === stages.length-1} style={{ fontSize: 8, lineHeight: 1, background: "transparent", border: 0, cursor: i === stages.length-1 ? "default" : "pointer", color: "var(--fog)", padding: 1 }}>▼</button>
            </div>
            <ColorDot color={stage.color} onChange={(c) => recolor(stage.id, c)} />
            <InlineEdit value={stage.name} onSave={(name) => rename(stage.id, name)} placeholder="Stage name" />
            <button onClick={() => remove(stage.id)} className="btn ghost icon sm opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: "var(--rose)" }}>
              <Trash2 size={13} />
            </button>
          </div>
        ))}

        {adding && (
          <div className="flex items-center gap-2 animate-slide-down" style={{ padding: "12px 18px", borderTop: stages.length ? "0" : "1px solid var(--cloud-2)" }}>
            <input autoFocus value={newName} onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") add(); if (e.key === "Escape") setAdding(false); }}
              placeholder="Stage name…"
              style={{ flex: 1, border: "1px solid var(--brand)", borderRadius: 6, padding: "7px 10px", fontSize: 13, color: "var(--ink)", outline: "none", boxShadow: "0 0 0 3px var(--brand-wash)" }} />
            <button onClick={add}            className="btn primary sm">Add</button>
            <button onClick={() => setAdding(false)} className="btn secondary sm">Cancel</button>
          </div>
        )}

        {stages.length === 0 && !adding && (
          <p style={{ padding: "24px 18px", fontSize: 13, color: "var(--stone)" }}>No stages yet.</p>
        )}
      </div>
    </div>
  );
}

// ── Tiers ─────────────────────────────────────────────────────────────────

function TiersSection() {
  const [tiers, setTiers] = useState<Tier[]>([]);
  useEffect(() => { fetch("/api/tiers").then((r) => r.json()).then(setTiers); }, []);

  const rename = async (id: string, label: string) => {
    await fetch(`/api/tiers/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ label }) });
    setTiers((t) => t.map((x) => x.id === id ? { ...x, label } : x));
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <h1 style={{ fontFamily: "'Inter Tight', sans-serif", fontSize: 26, fontWeight: 600, letterSpacing: "-0.02em", color: "var(--ink)", margin: 0 }}>Tiers</h1>
        <p style={{ fontSize: 13, color: "var(--stone)", marginTop: 6 }}>Tier labels affect tag display everywhere. Click a label to rename.</p>
      </div>

      <div style={{ background: "var(--paper)", border: "1px solid var(--mist)", borderRadius: 12, overflow: "hidden" }}>
        <div style={{ padding: "13px 18px", borderBottom: "1px solid var(--cloud-2)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h3 style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>Tiers</h3>
          <span className="chip violet" style={{ fontSize: 10 }}>used everywhere</span>
        </div>
        <div style={{ padding: "16px 18px", display: "flex", gap: 10, flexWrap: "wrap" }}>
          {tiers.map((tier) => (
            <div key={tier.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", border: "1px solid var(--mist)", borderRadius: 999, background: "var(--paper)" }}>
              <span className="chip violet">T{tier.order}</span>
              <InlineEdit value={tier.label} onSave={(label) => rename(tier.id, label)} placeholder="Tier label" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Tags ──────────────────────────────────────────────────────────────────

function TagsSection() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState("#6366f1");
  const [adding, setAdding] = useState(false);
  useEffect(() => { fetch("/api/tags").then((r) => r.json()).then(setTags); }, []);

  async function patchTag(id: string, data: Record<string, unknown>) {
    await fetch(`/api/tags/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
  }

  const rename  = async (id: string, name: string) => { await patchTag(id, { name }); setTags((t) => t.map((x) => x.id === id ? { ...x, name } : x)); };
  const recolor = async (id: string, color: string) => { await patchTag(id, { color }); setTags((t) => t.map((x) => x.id === id ? { ...x, color } : x)); };

  const add = async () => {
    const name = newName.trim(); if (!name) return;
    const res = await fetch("/api/tags", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, color: newColor }) });
    const tag = await res.json();
    setTags((t) => [...t, tag]); setNewName(""); setAdding(false);
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this tag?")) return;
    await fetch(`/api/tags/${id}`, { method: "DELETE" });
    setTags((t) => t.filter((x) => x.id !== id));
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ fontFamily: "'Inter Tight', sans-serif", fontSize: 26, fontWeight: 600, letterSpacing: "-0.02em", color: "var(--ink)", margin: 0 }}>Tags</h1>
          <p style={{ fontSize: 13, color: "var(--stone)", marginTop: 6 }}>Colour-coded labels you can attach to any contact.</p>
        </div>
        <button onClick={() => setAdding(true)} className="btn primary sm">
          <Plus size={13} /> Add tag
        </button>
      </div>

      <div style={{ background: "var(--paper)", border: "1px solid var(--mist)", borderRadius: 12, overflow: "hidden" }}>
        <div style={{ padding: "13px 18px", borderBottom: "1px solid var(--cloud-2)" }}>
          <h3 style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>
            Tags <span style={{ fontSize: 12, fontFamily: "var(--font-mono)", color: "var(--fog)", fontWeight: 400, marginLeft: 6 }}>{tags.length}</span>
          </h3>
        </div>

        {/* Tag pills grid */}
        <div style={{ padding: "16px 18px", display: "flex", flexWrap: "wrap", gap: 8 }}>
          {tags.map((tag) => (
            <div key={tag.id} className="group" style={{ display: "inline-flex", alignItems: "center", gap: 6, height: 28, padding: "0 10px 0 8px", borderRadius: 999, border: "1px solid var(--mist)", background: "var(--paper)" }}>
              <ColorDot color={tag.color} onChange={(c) => recolor(tag.id, c)} />
              <InlineEdit value={tag.name} onSave={(name) => rename(tag.id, name)} placeholder="Tag name" />
              <button onClick={() => remove(tag.id)} className="opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ background: "transparent", border: 0, cursor: "pointer", color: "var(--fog)", display: "inline-flex", padding: 0, lineHeight: 1 }}>
                <X size={12} />
              </button>
            </div>
          ))}

          {adding && (
            <div className="flex items-center gap-2 animate-scale-in">
              <input autoFocus value={newName} onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") add(); if (e.key === "Escape") setAdding(false); }}
                placeholder="Tag name…"
                style={{ border: "1px solid var(--brand)", borderRadius: 6, padding: "5px 10px", fontSize: 13, color: "var(--ink)", outline: "none", width: 140, boxShadow: "0 0 0 3px var(--brand-wash)" }} />
              <button onClick={add}             className="btn primary xs">Add</button>
              <button onClick={() => { setAdding(false); setNewName(""); }} className="btn secondary xs">Cancel</button>
            </div>
          )}
        </div>

        {tags.length === 0 && !adding && (
          <p style={{ padding: "0 18px 18px", fontSize: 13, color: "var(--stone)" }}>No tags yet.</p>
        )}
      </div>
    </div>
  );
}

// ── Custom Fields ─────────────────────────────────────────────────────────

function CustomFieldsSection() {
  const [tab, setTab] = useState<"contact" | "deal">("contact");
  const [defs, setDefs] = useState<CustomFieldDef[]>([]);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState("text");
  const [newOptions, setNewOptions] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");

  const filtered = defs.filter((d) => d.appliesTo === tab);

  useEffect(() => { fetch("/api/custom-field-definitions").then((r) => r.json()).then(setDefs); }, []);

  const add = async () => {
    const name = newName.trim(); if (!name) return;
    const options = newType === "select" ? newOptions.split(",").map((o) => o.trim()).filter(Boolean) : [];
    const res = await fetch("/api/custom-field-definitions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, fieldType: newType, appliesTo: tab, options }) });
    const def = await res.json();
    setDefs((d) => [...d, def]); setNewName(""); setNewType("text"); setNewOptions(""); setAdding(false);
  };

  const rename = async (id: string) => {
    const name = editDraft.trim(); if (!name) return;
    await fetch(`/api/custom-field-definitions/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) });
    setDefs((d) => d.map((x) => x.id === id ? { ...x, name } : x)); setEditingId(null);
  };

  const reorder = async (id: string, dir: "up" | "down") => {
    const list = [...filtered];
    const idx = list.findIndex((d) => d.id === id);
    const swap = dir === "up" ? idx - 1 : idx + 1;
    if (swap < 0 || swap >= list.length) return;
    const next = [...list]; [next[idx], next[swap]] = [next[swap], next[idx]];
    setDefs((d) => d.filter((x) => x.appliesTo !== tab).concat(next));
    await fetch(`/api/custom-field-definitions/${next[idx].id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ order: idx + 1 }) });
    await fetch(`/api/custom-field-definitions/${next[swap].id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ order: swap + 1 }) });
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this field? Existing values remain stored but won't display.")) return;
    await fetch(`/api/custom-field-definitions/${id}`, { method: "DELETE" });
    setDefs((d) => d.filter((x) => x.id !== id));
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ fontFamily: "'Inter Tight', sans-serif", fontSize: 26, fontWeight: 600, letterSpacing: "-0.02em", color: "var(--ink)", margin: 0 }}>Custom fields</h1>
          <p style={{ fontSize: 13, color: "var(--stone)", marginTop: 6 }}>Add extra data fields to contacts and deals.</p>
        </div>
        <button onClick={() => setAdding(true)} className="btn primary sm">
          <Plus size={13} /> Add field
        </button>
      </div>

      <div style={{ background: "var(--paper)", border: "1px solid var(--mist)", borderRadius: 12, overflow: "hidden" }}>
        <div style={{ padding: "13px 18px", borderBottom: "1px solid var(--cloud-2)", display: "flex", alignItems: "center", gap: 6 }}>
          {(["contact", "deal"] as const).map((v) => (
            <button key={v} onClick={() => { setTab(v); setAdding(false); }}
              style={{ height: 26, padding: "0 12px", borderRadius: 999, fontSize: 12, fontWeight: 600, cursor: "pointer", border: "none", background: tab === v ? "var(--brand)" : "transparent", color: tab === v ? "white" : "var(--stone)", transition: "all 0.15s" }}>
              {v === "contact" ? "Contact" : "Deal"}
            </button>
          ))}
        </div>

        {filtered.map((def, i) => (
          <div key={def.id} className="group flex items-center gap-3" style={{ padding: "12px 18px", borderBottom: "1px solid var(--cloud-2)" }}>
            <div className="flex flex-col" style={{ gap: 1 }}>
              <button onClick={() => reorder(def.id, "up")} disabled={i === 0} style={{ fontSize: 8, lineHeight: 1, background: "transparent", border: 0, cursor: i === 0 ? "default" : "pointer", color: "var(--fog)", padding: 1 }}>▲</button>
              <button onClick={() => reorder(def.id, "down")} disabled={i === filtered.length - 1} style={{ fontSize: 8, lineHeight: 1, background: "transparent", border: 0, cursor: i === filtered.length - 1 ? "default" : "pointer", color: "var(--fog)", padding: 1 }}>▼</button>
            </div>
            <span style={{ fontSize: 10, fontWeight: 600, color: "var(--stone)", background: "var(--cloud-2)", borderRadius: 4, padding: "2px 6px", textTransform: "uppercase", flexShrink: 0 }}>{def.fieldType}</span>

            {editingId === def.id ? (
              <div className="flex items-center gap-1.5 flex-1">
                <input autoFocus value={editDraft} onChange={(e) => setEditDraft(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") rename(def.id); if (e.key === "Escape") setEditingId(null); }}
                  style={{ flex: 1, border: "1px solid var(--brand)", borderRadius: 6, padding: "4px 8px", fontSize: 13, outline: "none", background: "var(--paper)", boxShadow: "0 0 0 3px var(--brand-wash)" }} />
                <button type="button" onClick={() => rename(def.id)} className="btn primary icon xs"><Check size={11} /></button>
                <button type="button" onClick={() => setEditingId(null)} className="btn secondary icon xs"><X size={11} /></button>
              </div>
            ) : (
              <button type="button" onClick={() => { setEditingId(def.id); setEditDraft(def.name); }}
                className="group/name flex items-center gap-1.5 flex-1 text-left">
                <span style={{ fontSize: 13, color: "var(--graphite)", fontWeight: 500 }}>{def.name}</span>
                {def.fieldType === "select" && def.options.length > 0 && (
                  <span style={{ fontSize: 11, color: "var(--stone)" }}>({def.options.join(", ")})</span>
                )}
                <Pencil size={11} style={{ color: "var(--fog)" }} className="opacity-0 group-hover/name:opacity-100 transition-opacity" />
              </button>
            )}

            <button onClick={() => remove(def.id)} className="btn ghost icon sm opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: "var(--rose)" }}>
              <Trash2 size={13} />
            </button>
          </div>
        ))}

        {filtered.length === 0 && !adding && (
          <p style={{ padding: "20px 18px", fontSize: 13, color: "var(--stone)" }}>
            No custom fields for {tab === "contact" ? "contacts" : "deals"} yet.
          </p>
        )}

        {adding && (
          <div className="animate-slide-down" style={{ padding: "14px 18px", borderTop: "1px solid var(--cloud-2)", display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", gap: 8 }}>
              <input autoFocus value={newName} onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && newType !== "select") add(); if (e.key === "Escape") setAdding(false); }}
                placeholder="Field name…"
                style={{ flex: 1, border: "1px solid var(--brand)", borderRadius: 6, padding: "7px 10px", fontSize: 13, color: "var(--ink)", outline: "none", background: "var(--paper)", boxShadow: "0 0 0 3px var(--brand-wash)" }} />
              <select value={newType} onChange={(e) => setNewType(e.target.value)}
                style={{ border: "1px solid var(--mist)", borderRadius: 6, padding: "7px 10px", fontSize: 13, color: "var(--ink)", outline: "none", background: "var(--paper)", cursor: "pointer" }}>
                {FIELD_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            {newType === "select" && (
              <input value={newOptions} onChange={(e) => setNewOptions(e.target.value)}
                placeholder="Options (comma-separated, e.g. Hot, Warm, Cold)"
                style={{ border: "1px solid var(--mist)", borderRadius: 6, padding: "7px 10px", fontSize: 13, color: "var(--ink)", outline: "none", background: "var(--paper)" }} />
            )}
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={add}                                   className="btn primary sm">Add field</button>
              <button onClick={() => { setAdding(false); setNewName(""); setNewType("text"); setNewOptions(""); }} className="btn secondary sm">Cancel</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Members & Roles ───────────────────────────────────────────────────────

function MembersSection() {
  const [members,   setMembers]  = useState<Member[]>([]);
  const [me,        setMe]       = useState<Member | null>(null);
  const [adding,    setAdding]   = useState(false);
  const [newName,   setNewName]  = useState("");
  const [newEmail,  setNewEmail] = useState("");
  const [newRole,   setNewRole]  = useState("member");
  const [saving,    setSaving]   = useState(false);
  const [tempCred,  setTempCred] = useState<{ name: string; email: string; password: string } | null>(null);
  const [copied,    setCopied]   = useState(false);

  useEffect(() => {
    fetch("/api/users").then((r) => r.ok ? r.json() : []).then(setMembers);
    fetch("/api/auth/me").then((r) => r.ok ? r.json() : null).then((d) => {
      if (d?.user) setMe({ id: d.user.userId, name: d.user.name, email: d.user.email, role: d.user.role });
    });
  }, []);

  const isAdmin = me?.role === "admin";

  const addMember = async () => {
    if (!newName.trim() || !newEmail.trim()) return;
    setSaving(true);
    const res  = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim(), email: newEmail.trim(), role: newRole }),
    });
    const data = await res.json();
    setSaving(false);
    if (res.ok) {
      setMembers((m) => [...m, { id: data.id, name: data.name, email: data.email, role: data.role }]);
      setTempCred({ name: data.name, email: data.email, password: data.tempPassword });
      setAdding(false); setNewName(""); setNewEmail(""); setNewRole("member");
    }
  };

  const changeRole = async (id: string, role: string) => {
    await fetch(`/api/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    setMembers((m) => m.map((u) => u.id === id ? { ...u, role } : u));
  };

  const removeMember = async (id: string, name: string) => {
    if (!confirm(`Remove ${name} from the workspace?`)) return;
    await fetch(`/api/users/${id}`, { method: "DELETE" });
    setMembers((m) => m.filter((u) => u.id !== id));
  };

  const loginAs = async (id: string) => {
    await fetch(`/api/auth/impersonate/${id}`, { method: "POST" });
    window.location.href = "/dashboard";
  };

  const copyTempCreds = () => {
    if (!tempCred) return;
    navigator.clipboard.writeText(`Email: ${tempCred.email}\nPassword: ${tempCred.password}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ fontFamily: "'Inter Tight', sans-serif", fontSize: 26, fontWeight: 600, letterSpacing: "-0.02em", color: "var(--ink)", margin: 0 }}>Members & roles</h1>
          <p style={{ fontSize: 13, color: "var(--stone)", marginTop: 6 }}>Manage who has access to the workspace.</p>
        </div>
        {isAdmin && (
          <button onClick={() => setAdding(true)} className="btn primary sm"><Plus size={13} /> Add member</button>
        )}
      </div>

      {/* Temp credentials card */}
      {tempCred && (
        <div style={{ background: "var(--amber-wash)", border: "1px solid #F2DFA8", borderRadius: 12, padding: 18 }} className="animate-fade-up">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: "#6E4D00", margin: 0 }}>
              Temporary credentials for <b>{tempCred.name}</b> — share these once
            </p>
            <button onClick={() => setTempCred(null)} style={{ background: "transparent", border: 0, cursor: "pointer", color: "#B07A00" }}><X size={14} /></button>
          </div>
          <div style={{ background: "white", borderRadius: 8, padding: "12px 14px", fontFamily: "var(--font-mono, monospace)", fontSize: 13, color: "#0A0B10", lineHeight: 1.7, border: "1px solid #F2DFA8" }}>
            <div>Email: <b>{tempCred.email}</b></div>
            <div>Password: <b>{tempCred.password}</b></div>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <button onClick={copyTempCreds} className="btn sm" style={{ background: "var(--amber)", color: "white", borderColor: "transparent" }}>
              <Copy size={12} /> {copied ? "Copied!" : "Copy credentials"}
            </button>
            <span style={{ fontSize: 12, color: "#B07A00", alignSelf: "center" }}>This password won't be shown again</span>
          </div>
        </div>
      )}

      {/* Members list */}
      <div style={{ background: "var(--paper)", border: "1px solid var(--mist)", borderRadius: 12, overflow: "hidden" }}>
        <div style={{ padding: "13px 18px", borderBottom: "1px solid var(--cloud-2)" }}>
          <h3 style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>
            Members <span style={{ fontSize: 12, fontFamily: "var(--font-mono)", color: "var(--fog)", fontWeight: 400, marginLeft: 6 }}>{members.length}</span>
          </h3>
        </div>

        {members.map((member, i) => (
          <div key={member.id} className="group flex items-center gap-3" style={{ padding: "12px 18px", borderBottom: i < members.length - 1 ? "1px solid var(--cloud-2)" : "none" }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: "var(--brand-wash)", color: "var(--brand-deep)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
              {member.name[0].toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>
                {member.name}
                {member.id === me?.id && <span style={{ fontSize: 11, color: "var(--stone)", fontWeight: 400, marginLeft: 6 }}>(you)</span>}
              </div>
              <div style={{ fontSize: 11, color: "var(--stone)", fontFamily: "var(--font-mono)", marginTop: 2 }}>{member.email}</div>
            </div>

            {/* Role selector (admin only, can't change own role) */}
            {isAdmin && member.id !== me?.id ? (
              <select value={member.role} onChange={(e) => changeRole(member.id, e.target.value)}
                style={{ height: 26, padding: "0 8px", border: "1px solid var(--mist)", borderRadius: 6, fontSize: 11, fontWeight: 600, color: "var(--graphite)", background: "var(--paper)", cursor: "pointer", outline: "none" }}>
                <option value="admin">Admin</option>
                <option value="member">Member</option>
              </select>
            ) : (
              <span className={member.role === "admin" ? "chip violet" : "chip"} style={{ fontSize: 10 }}>
                {member.role === "admin" ? "Admin" : "Member"}
              </span>
            )}

            {/* Admin-only actions */}
            {isAdmin && member.id !== me?.id && (
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => loginAs(member.id)} className="btn ghost xs" title="Login as this user" style={{ gap: 4 }}>
                  <LogIn size={11} /> Login as
                </button>
                <button onClick={() => removeMember(member.id, member.name)} className="btn ghost icon xs" style={{ color: "var(--rose)" }}>
                  <Trash2 size={11} />
                </button>
              </div>
            )}
          </div>
        ))}

        {members.length === 0 && (
          <p style={{ padding: "24px 18px", fontSize: 13, color: "var(--stone)" }}>No members yet.</p>
        )}

        {adding && (
          <div className="animate-slide-down" style={{ padding: "14px 18px", borderTop: "1px solid var(--cloud-2)", display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <input autoFocus value={newName} onChange={(e) => setNewName(e.target.value)}
                placeholder="Full name"
                style={{ border: "1px solid var(--brand)", borderRadius: 6, padding: "7px 10px", fontSize: 13, outline: "none", boxShadow: "0 0 0 3px var(--brand-wash)" }} />
              <input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)}
                placeholder="Email address"
                style={{ border: "1px solid var(--mist)", borderRadius: 6, padding: "7px 10px", fontSize: 13, outline: "none" }}
                onFocus={(e) => { e.target.style.borderColor = "var(--brand)"; e.target.style.boxShadow = "0 0 0 3px var(--brand-wash)"; }}
                onBlur={(e) =>  { e.target.style.borderColor = "var(--mist)";  e.target.style.boxShadow = "none"; }} />
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <select value={newRole} onChange={(e) => setNewRole(e.target.value)}
                style={{ height: 34, padding: "0 10px", border: "1px solid var(--mist)", borderRadius: 6, fontSize: 13, color: "var(--ink)", background: "var(--paper)", outline: "none", cursor: "pointer" }}>
                <option value="member">Member</option>
                <option value="admin">Admin</option>
              </select>
              <button onClick={addMember} disabled={saving} className="btn primary sm">{saving ? "Adding…" : "Add member"}</button>
              <button onClick={() => { setAdding(false); setNewName(""); setNewEmail(""); }} className="btn secondary sm">Cancel</button>
              <span style={{ fontSize: 12, color: "var(--stone)" }}>A temporary password will be generated</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Change Password ────────────────────────────────────────────────────────

function ChangePasswordSection() {
  const [current,  setCurrent]  = useState("");
  const [next,     setNext]     = useState("");
  const [confirm,  setConfirm]  = useState("");
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState("");
  const [success,  setSuccess]  = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setSuccess(false);
    if (next.length < 8) { setError("New password must be at least 8 characters"); return; }
    if (next !== confirm) { setError("Passwords do not match"); return; }
    setSaving(true);
    const res  = await fetch("/api/auth/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword: current, newPassword: next }),
    });
    setSaving(false);
    if (res.ok) {
      setSuccess(true); setCurrent(""); setNext(""); setConfirm("");
    } else {
      const data = await res.json();
      setError(data.error ?? "Something went wrong");
    }
  };

  const inp = {
    border: "1px solid var(--mist)", borderRadius: 8, padding: "8px 12px",
    fontSize: 13, color: "var(--ink)", outline: "none", width: "100%", background: "var(--paper)",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <h1 style={{ fontFamily: "'Inter Tight', sans-serif", fontSize: 26, fontWeight: 600, letterSpacing: "-0.02em", color: "var(--ink)", margin: 0 }}>Change password</h1>
        <p style={{ fontSize: 13, color: "var(--stone)", marginTop: 6 }}>Update your login password.</p>
      </div>

      <div style={{ background: "var(--paper)", border: "1px solid var(--mist)", borderRadius: 12, padding: 24, maxWidth: 420 }}>
        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--slate)", marginBottom: 6 }}>Current password</label>
            <input type="password" required value={current} onChange={(e) => setCurrent(e.target.value)} style={inp}
              onFocus={(e) => { e.target.style.borderColor = "var(--brand)"; e.target.style.boxShadow = "0 0 0 3px var(--brand-wash)"; }}
              onBlur={(e)  => { e.target.style.borderColor = "var(--mist)";  e.target.style.boxShadow = "none"; }} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--slate)", marginBottom: 6 }}>New password <span style={{ color: "var(--fog)", fontWeight: 400 }}>(min 8 chars)</span></label>
            <input type="password" required value={next} onChange={(e) => setNext(e.target.value)} style={inp}
              onFocus={(e) => { e.target.style.borderColor = "var(--brand)"; e.target.style.boxShadow = "0 0 0 3px var(--brand-wash)"; }}
              onBlur={(e)  => { e.target.style.borderColor = "var(--mist)";  e.target.style.boxShadow = "none"; }} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--slate)", marginBottom: 6 }}>Confirm new password</label>
            <input type="password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} style={inp}
              onFocus={(e) => { e.target.style.borderColor = "var(--brand)"; e.target.style.boxShadow = "0 0 0 3px var(--brand-wash)"; }}
              onBlur={(e)  => { e.target.style.borderColor = "var(--mist)";  e.target.style.boxShadow = "none"; }} />
          </div>

          {error && (
            <div style={{ background: "var(--rose-wash)", border: "1px solid rgba(214,58,75,0.2)", borderRadius: 8, padding: "10px 12px", fontSize: 12, color: "#962633", fontWeight: 500 }}>
              {error}
            </div>
          )}
          {success && (
            <div style={{ background: "var(--emerald-wash)", border: "1px solid rgba(0,166,110,0.2)", borderRadius: 8, padding: "10px 12px", fontSize: 12, color: "#006A47", fontWeight: 500 }}>
              Password changed successfully.
            </div>
          )}

          <button type="submit" disabled={saving} className="btn primary">
            {saving ? "Saving…" : "Update password"}
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Audit Log ─────────────────────────────────────────────────────────────

const ACTION_META: Record<string, { label: string; color: string }> = {
  login_success:    { label: "Login",            color: "var(--emerald)" },
  login_failed:     { label: "Login failed",     color: "var(--rose)" },
  login_locked:     { label: "Account locked",   color: "var(--rose)" },
  login_ratelimited:{ label: "Rate limited",     color: "var(--amber)" },
  logout:           { label: "Logout",           color: "var(--stone)" },
  impersonate_start:{ label: "Impersonate →",    color: "var(--violet)" },
  impersonate_exit: { label: "← Exit impersonate",color: "var(--violet)" },
  user_create:      { label: "User created",     color: "var(--brand)" },
  user_delete:      { label: "User deleted",     color: "var(--rose)" },
  user_role_change: { label: "Role changed",     color: "var(--amber)" },
  password_change:  { label: "Password changed", color: "var(--graphite)" },
};

interface AuditEntry {
  id: string; action: string; targetId: string | null;
  meta: Record<string, string> | null; ip: string | null; createdAt: string;
  user: { name: string; email: string } | null;
}

function AuditLogSection() {
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/audit-log").then((r) => r.ok ? r.json() : []).then((d) => { setLogs(d); setLoading(false); });
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <h1 style={{ fontFamily: "'Inter Tight', sans-serif", fontSize: 26, fontWeight: 600, letterSpacing: "-0.02em", color: "var(--ink)", margin: 0 }}>Audit log</h1>
        <p style={{ fontSize: 13, color: "var(--stone)", marginTop: 6 }}>Last 100 security events across the workspace.</p>
      </div>

      <div style={{ background: "var(--paper)", border: "1px solid var(--mist)", borderRadius: 12, overflow: "hidden" }}>
        <div style={{ padding: "13px 18px", borderBottom: "1px solid var(--cloud-2)" }}>
          <h3 style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>
            Events <span style={{ fontSize: 12, fontFamily: "var(--font-mono)", color: "var(--fog)", fontWeight: 400, marginLeft: 6 }}>{logs.length}</span>
          </h3>
        </div>

        {loading && <p style={{ padding: "20px 18px", fontSize: 13, color: "var(--stone)" }}>Loading…</p>}
        {!loading && logs.length === 0 && <p style={{ padding: "20px 18px", fontSize: 13, color: "var(--stone)" }}>No events recorded yet.</p>}

        {logs.map((log, i) => {
          const meta = ACTION_META[log.action] ?? { label: log.action, color: "var(--stone)" };
          return (
            <div key={log.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 18px", borderBottom: i < logs.length - 1 ? "1px solid var(--cloud-2)" : "none" }}>
              <span style={{ width: 6, height: 6, borderRadius: 999, background: meta.color, flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>{meta.label}</span>
                  {log.user && <span style={{ fontSize: 12, color: "var(--stone)" }}>by {log.user.name}</span>}
                  {log.meta && Object.keys(log.meta).length > 0 && (
                    <span style={{ fontSize: 11, color: "var(--fog)", fontFamily: "var(--font-mono)" }}>
                      {Object.entries(log.meta).map(([k, v]) => `${k}: ${v}`).join(" · ")}
                    </span>
                  )}
                </div>
                {log.ip && log.ip !== "unknown" && (
                  <span style={{ fontSize: 11, color: "var(--fog)", fontFamily: "var(--font-mono)" }}>{log.ip}</span>
                )}
              </div>
              <span style={{ fontSize: 11, color: "var(--fog)", fontFamily: "var(--font-mono)", flexShrink: 0 }}>
                {new Date(log.createdAt).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Coming soon placeholder ────────────────────────────────────────────────

function ComingSoon({ title }: { title: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <h1 style={{ fontFamily: "'Inter Tight', sans-serif", fontSize: 26, fontWeight: 600, letterSpacing: "-0.02em", color: "var(--ink)", margin: 0 }}>{title}</h1>
      </div>
      <div style={{ background: "var(--paper)", border: "1px solid var(--mist)", borderRadius: 12, padding: "48px 24px", textAlign: "center" }}>
        <p style={{ fontSize: 13, color: "var(--stone)", margin: 0 }}>Coming soon.</p>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const [active, setActive] = useState("stages");

  const content: Record<string, React.ReactNode> = {
    stages: <StagesSection />,
    tiers:  <TiersSection />,
    tags:   <TagsSection />,
    custom: <CustomFieldsSection />,
    members:      <MembersSection />,
    password:     <ChangePasswordSection />,
    audit:        <AuditLogSection />,
    integrations: <ComingSoon title="Integrations" />,
    notifications:<ComingSoon title="Notifications" />,
    workspace:    <ComingSoon title="Workspace" />,
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "200px 1fr", gap: 28, maxWidth: 1040, margin: "0 auto", padding: "24px 0" }}>
      {/* Sidebar nav */}
      <aside style={{ position: "sticky", top: 24, alignSelf: "flex-start", display: "flex", flexDirection: "column", gap: 2 }}>
        <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--fog)", padding: "0 10px 10px" }}>Settings</div>
        {NAV.map(({ key, label, icon: Icon, soon }) => (
          <button key={key} onClick={() => !soon && setActive(key)}
            style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "8px 10px", borderRadius: 6, cursor: soon ? "default" : "pointer",
              background: active === key ? "var(--brand-wash)" : "transparent",
              color: active === key ? "var(--brand-deep)" : soon ? "var(--fog)" : "var(--graphite)",
              font: "500 13px/1 var(--font-sans)", border: "none", width: "100%", textAlign: "left",
              transition: "background 0.15s, color 0.15s",
            }}>
            <Icon size={14} strokeWidth={1.75} color={active === key ? "var(--brand)" : soon ? "var(--fog)" : "var(--stone)"} />
            <span style={{ flex: 1 }}>{label}</span>
            {soon && <span style={{ fontSize: 9, fontWeight: 600, letterSpacing: "0.06em", color: "var(--fog)", background: "var(--cloud-2)", padding: "2px 5px", borderRadius: 4 }}>SOON</span>}
          </button>
        ))}
      </aside>

      {/* Main content */}
      <main>
        {content[active]}
      </main>
    </div>
  );
}
