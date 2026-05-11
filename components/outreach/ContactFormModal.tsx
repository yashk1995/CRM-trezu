"use client";

import { useEffect, useState } from "react";
import Modal from "@/components/ui/Modal";
import { cn } from "@/lib/utils";

interface Tier { id: string; label: string }
interface Tag { id: string; name: string; color: string }

interface ContactFormData {
  name: string;
  email: string;
  phone: string;
  telegramUsername: string;
  twitterHandle: string;
  companyName: string;
  status: string;
  tierId: string;
  tagIds: string[];
  notes: string;
}

const EMPTY: ContactFormData = {
  name: "", email: "", phone: "", telegramUsername: "",
  twitterHandle: "", companyName: "", status: "not_contacted",
  tierId: "", tagIds: [], notes: "",
};

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  initial?: Partial<ContactFormData> & { id?: string };
}

export default function ContactFormModal({ open, onClose, onSaved, initial }: Props) {
  const [form, setForm] = useState<ContactFormData>(EMPTY);
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [newTag, setNewTag] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/tiers").then((r) => r.json()).then(setTiers);
    fetch("/api/tags").then((r) => r.json()).then(setTags);
  }, []);

  useEffect(() => {
    if (open) setForm(initial ? { ...EMPTY, ...initial } : EMPTY);
  }, [open, initial]);

  const set = (key: keyof ContactFormData, value: string | string[]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const toggleTag = (id: string) =>
    set("tagIds", form.tagIds.includes(id)
      ? form.tagIds.filter((t) => t !== id)
      : [...form.tagIds, id]);

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

  const inputCls = "w-full rounded-md border border-zinc-200 px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500";

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={initial?.id ? "Edit Contact" : "Add Contact"}
      className="max-w-xl"
    >
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="mb-1 block text-xs font-medium text-zinc-600">Name *</label>
            <input required className={inputCls} value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Full name" />
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
            <input className={inputCls} value={form.telegramUsername} onChange={(e) => set("telegramUsername", e.target.value)} placeholder="@username" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-600">Twitter / X</label>
            <input className={inputCls} value={form.twitterHandle} onChange={(e) => set("twitterHandle", e.target.value)} placeholder="@handle" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-600">Company</label>
            <input className={inputCls} value={form.companyName} onChange={(e) => set("companyName", e.target.value)} placeholder="Company name" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-600">Status</label>
            <select className={inputCls} value={form.status} onChange={(e) => set("status", e.target.value)}>
              <option value="not_contacted">Not Contacted</option>
              <option value="dm_sent">DM Sent</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-600">Tier</label>
            <select className={inputCls} value={form.tierId} onChange={(e) => set("tierId", e.target.value)}>
              <option value="">No tier</option>
              {tiers.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-600">Company Type Tags</label>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {tags.map((tag) => (
              <button
                key={tag.id}
                type="button"
                onClick={() => toggleTag(tag.id)}
                className={cn(
                  "rounded-full px-2.5 py-0.5 text-xs font-medium border transition-colors",
                  form.tagIds.includes(tag.id)
                    ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                    : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300"
                )}
              >
                {tag.name}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              className={cn(inputCls, "flex-1")}
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              placeholder="Add new tag..."
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
            />
            <button type="button" onClick={addTag} className="rounded-md bg-zinc-100 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-200">
              Add
            </button>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-600">Notes</label>
          <textarea
            className={cn(inputCls, "resize-none")}
            rows={2}
            value={form.notes}
            onChange={(e) => set("notes", e.target.value)}
            placeholder="Any notes..."
          />
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className="rounded-md px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-100">
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            {saving ? "Saving..." : initial?.id ? "Save Changes" : "Add Contact"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
