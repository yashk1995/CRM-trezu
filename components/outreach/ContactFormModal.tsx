"use client";

import { useEffect, useRef, useState } from "react";
import Modal from "@/components/ui/Modal";
import ContactAvatar from "@/components/ui/ContactAvatar";
import { cn } from "@/lib/utils";
import { Camera, X, Plus } from "lucide-react";

interface Tier { id: string; label: string }
interface Tag { id: string; name: string; color: string }
interface CustomFieldDef { id: string; name: string; fieldType: string; options: string[] }

interface ContactFormData {
  name: string;
  companyName: string;
  pocUsername: string;
  groupLink: string;
  logoUrl: string;
  email: string;
  phone: string;
  telegramUsername: string;
  twitterHandle: string;
  status: string;
  tierId: string;
  tagIds: string[];
  notes: string;
  customFields: Record<string, string>;
  pocs: { name: string; username: string }[];
}

const EMPTY: ContactFormData = {
  name: "", companyName: "", pocUsername: "", groupLink: "", logoUrl: "",
  email: "", phone: "", telegramUsername: "", twitterHandle: "",
  status: "not_contacted", tierId: "", tagIds: [], notes: "", customFields: {}, pocs: [],
};

type ContactFormInitial = { [K in keyof ContactFormData]?: ContactFormData[K] | null } & { id?: string };

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  initial?: ContactFormInitial;
}

export default function ContactFormModal({ open, onClose, onSaved, initial }: Props) {
  const [form, setForm] = useState<ContactFormData>(EMPTY);
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [customFieldDefs, setCustomFieldDefs] = useState<CustomFieldDef[]>([]);
  const [newTag, setNewTag] = useState("");
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/tiers").then((r) => r.json()).then(setTiers);
    fetch("/api/tags").then((r) => r.json()).then(setTags);
    fetch("/api/custom-field-definitions?appliesTo=contact").then((r) => r.json()).then(setCustomFieldDefs);
  }, []);

  useEffect(() => {
    if (open) {
      if (initial) {
        const clean = Object.fromEntries(
          Object.entries(initial).filter(([, v]) => v !== null)
        ) as Partial<ContactFormData>;
        setForm({ ...EMPTY, ...clean });
      } else {
        setForm(EMPTY);
      }
    }
  }, [open, initial]);

  const set = (key: keyof ContactFormData, value: string | string[] | Record<string, string>) =>
    setForm((f) => ({ ...f, [key]: value }));

  const setCustomField = (defId: string, value: string) =>
    setForm((f) => ({ ...f, customFields: { ...f.customFields, [defId]: value } }));

  const toggleTag = (id: string) =>
    set("tagIds", form.tagIds.includes(id) ? form.tagIds.filter((t) => t !== id) : [...form.tagIds, id]);

  const addPoc    = () => setForm((f) => ({ ...f, pocs: [...f.pocs, { name: "", username: "" }] }));
  const removePoc = (i: number) => setForm((f) => ({ ...f, pocs: f.pocs.filter((_, j) => j !== i) }));
  const updatePoc = (i: number, field: "name" | "username", value: string) =>
    setForm((f) => ({ ...f, pocs: f.pocs.map((p, j) => j === i ? { ...p, [field]: value } : p) }));

  const addTag = async () => {
    if (!newTag.trim()) return;
    const res = await fetch("/api/tags", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newTag.trim() }),
    });
    const tag = await res.json();
    setTags((t) => [...t, tag]);
    setNewTag("");
    set("tagIds", [...form.tagIds, tag.id]);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const src = ev.target?.result as string;
      const img = new Image();
      img.onload = () => {
        const SIZE = 128;
        const canvas = document.createElement("canvas");
        canvas.width = SIZE;
        canvas.height = SIZE;
        const ctx = canvas.getContext("2d")!;
        const min = Math.min(img.width, img.height);
        const sx = (img.width - min) / 2;
        const sy = (img.height - min) / 2;
        ctx.drawImage(img, sx, sy, min, min, 0, 0, SIZE, SIZE);
        set("logoUrl", canvas.toDataURL("image/jpeg", 0.85));
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const url = initial?.id ? `/api/contacts/${initial.id}` : "/api/contacts";
    const method = initial?.id ? "PATCH" : "POST";
    await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, tierId: form.tierId || null }),
    });
    setSaving(false);
    onSaved();
    onClose();
  };

  const inputCls = "w-full rounded-[6px] border border-[var(--mist)] bg-[var(--paper)] px-3 py-1.5 text-[13px] text-[var(--ink)] outline-none focus:border-[var(--brand)] focus:shadow-[0_0_0_3px_var(--brand-wash)]";
  const displayName = form.companyName || form.name || "?";

  return (
    <Modal open={open} onClose={onClose} title={initial?.id ? "Edit Contact" : "Add Contact"} className="max-w-xl">
      <form onSubmit={submit} className="space-y-5">

        {/* ── Company / Logo ──────────────────────────────────────────────── */}
        <div className="flex items-start gap-4">
          {/* Logo upload */}
          <div className="shrink-0 flex flex-col items-center gap-1">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="relative group block"
              title="Upload logo"
            >
              <ContactAvatar logoUrl={form.logoUrl} name={displayName} size="lg" />
              <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera size={16} className="text-white" />
              </div>
            </button>
            {form.logoUrl && (
              <button type="button" onClick={() => set("logoUrl", "")} className="flex items-center gap-0.5 text-xs text-red-500 hover:underline">
                <X size={10} /> Remove
              </button>
            )}
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
          </div>

          {/* Company + Group Link */}
          <div className="flex-1 space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-600">Company / Entity Name</label>
              <input className={inputCls} value={form.companyName} onChange={(e) => set("companyName", e.target.value)} placeholder="e.g. Acme Corp, DeFi Protocol…" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-600">Group Link</label>
              <input className={inputCls} type="url" value={form.groupLink} onChange={(e) => set("groupLink", e.target.value)} placeholder="https://t.me/groupname" />
            </div>
          </div>
        </div>

        {/* ── Point of Contact ─────────────────────────────────────────────── */}
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">Points of Contact</p>

          {/* Primary POC */}
          <div className="mb-2 rounded-lg border border-zinc-200 bg-zinc-50 p-3">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-400">Primary</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 sm:col-span-1">
                <label className="mb-1 block text-xs font-medium text-zinc-600">Name *</label>
                <input required className={inputCls} value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Contact person's name" />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label className="mb-1 block text-xs font-medium text-zinc-600">Username</label>
                <input className={inputCls} value={form.pocUsername} onChange={(e) => set("pocUsername", e.target.value)} placeholder="@username" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-600">Email</label>
                <input className={inputCls} type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="email@example.com" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-600">Phone</label>
                <input className={inputCls} value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+1 234 567 8900" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-600">Telegram</label>
                <input className={inputCls} value={form.telegramUsername} onChange={(e) => set("telegramUsername", e.target.value)} placeholder="@telegram" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-600">Twitter / X</label>
                <input className={inputCls} value={form.twitterHandle} onChange={(e) => set("twitterHandle", e.target.value)} placeholder="@handle" />
              </div>
            </div>
          </div>

          {/* Additional POCs */}
          {form.pocs.map((poc, i) => (
            <div key={i} className="mb-2 rounded-lg border border-zinc-200 bg-zinc-50 p-3">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">POC {i + 2}</p>
                <button type="button" onClick={() => removePoc(i)} className="text-zinc-400 hover:text-red-500 transition-colors">
                  <X size={13} />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 sm:col-span-1">
                  <label className="mb-1 block text-xs font-medium text-zinc-600">Name *</label>
                  <input required className={inputCls} value={poc.name} onChange={(e) => updatePoc(i, "name", e.target.value)} placeholder="Contact person's name" />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="mb-1 block text-xs font-medium text-zinc-600">Username</label>
                  <input className={inputCls} value={poc.username} onChange={(e) => updatePoc(i, "username", e.target.value)} placeholder="@username" />
                </div>
              </div>
            </div>
          ))}

          <button type="button" onClick={addPoc}
            className="flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-700 transition-colors">
            <Plus size={12} /> Add another POC
          </button>
        </div>

        {/* ── Classification ───────────────────────────────────────────────── */}
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">Classification</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-600">Status</label>
              {form.status === "in_pipeline" ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <span className="chip emerald dot" style={{ width: "fit-content" }}>In pipeline</span>
                  <button
                    type="button"
                    onClick={() => set("status", "not_contacted")}
                    style={{ fontSize: 12, fontWeight: 500, color: "var(--rose)", background: "transparent", border: "1px solid var(--rose-wash)", borderRadius: 999, padding: "3px 10px", cursor: "pointer", width: "fit-content" }}>
                    Remove from pipeline
                  </button>
                </div>
              ) : (
                <select className={inputCls} value={form.status} onChange={(e) => set("status", e.target.value)}>
                  <option value="not_contacted">Not Contacted</option>
                  <option value="dm_sent">DM Sent</option>
                  <option value="rejected">Rejected</option>
                </select>
              )}
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-600">Tier</label>
              <select className={inputCls} value={form.tierId} onChange={(e) => set("tierId", e.target.value)}>
                <option value="">No tier</option>
                {tiers.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* ── Tags ─────────────────────────────────────────────────────────── */}
        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-600">Tags</label>
          <div className="mb-2 flex flex-wrap gap-1.5">
            {tags.map((tag) => (
              <button key={tag.id} type="button" onClick={() => toggleTag(tag.id)}
                className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium border transition-colors",
                  form.tagIds.includes(tag.id)
                    ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                    : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300"
                )}>
                {tag.name}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <input className={cn(inputCls, "flex-1")} value={newTag} onChange={(e) => setNewTag(e.target.value)}
              placeholder="New tag…" onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())} />
            <button type="button" onClick={addTag} className="rounded-md bg-zinc-100 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-200">Add</button>
          </div>
        </div>

        {/* ── Notes ────────────────────────────────────────────────────────── */}
        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-600">Notes</label>
          <textarea className={cn(inputCls, "resize-none")} rows={2} value={form.notes}
            onChange={(e) => set("notes", e.target.value)} placeholder="Any notes…" />
        </div>

        {/* ── Custom Fields ─────────────────────────────────────────────────── */}
        {customFieldDefs.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">Custom Fields</p>
            <div className="space-y-3">
              {customFieldDefs.map((def) => (
                <div key={def.id}>
                  <label className="mb-1 block text-xs font-medium text-zinc-600">{def.name}</label>
                  {def.fieldType === "select" ? (
                    <select className={inputCls} value={form.customFields[def.id] ?? ""}
                      onChange={(e) => setCustomField(def.id, e.target.value)}>
                      <option value="">— select —</option>
                      {def.options.map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                  ) : (
                    <input
                      className={inputCls}
                      type={def.fieldType === "number" ? "number" : def.fieldType === "date" ? "date" : def.fieldType === "url" ? "url" : "text"}
                      value={form.customFields[def.id] ?? ""}
                      onChange={(e) => setCustomField(def.id, e.target.value)}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className="btn secondary">Cancel</button>
          <button type="submit" disabled={saving} className="btn primary">
            {saving ? "Saving…" : initial?.id ? "Save Changes" : "Add Contact"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
