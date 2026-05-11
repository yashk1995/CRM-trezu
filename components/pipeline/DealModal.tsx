"use client";

import { useEffect, useState } from "react";
import Modal from "@/components/ui/Modal";
import { cn } from "@/lib/utils";

interface Stage { id: string; name: string }

interface Deal {
  id: string;
  notes: string | null;
  callDate: string | null;
  meetLink: string | null;
  stageId: string | null;
  contact: { id: string; name: string; telegramUsername: string | null; twitterHandle: string | null; email: string | null };
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  deal: Deal | null;
  stages: Stage[];
  defaultStageId?: string;
  defaultContactId?: string;
  contacts?: { id: string; name: string }[];
}

export default function DealModal({ open, onClose, onSaved, deal, stages, defaultStageId, defaultContactId, contacts }: Props) {
  const [notes, setNotes] = useState("");
  const [callDate, setCallDate] = useState("");
  const [meetLink, setMeetLink] = useState("");
  const [stageId, setStageId] = useState("");
  const [contactId, setContactId] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setNotes(deal?.notes ?? "");
      setCallDate(deal?.callDate ? deal.callDate.slice(0, 10) : "");
      setMeetLink(deal?.meetLink ?? "");
      setStageId(deal?.stageId ?? defaultStageId ?? stages[0]?.id ?? "");
      setContactId(deal?.contact?.id ?? defaultContactId ?? "");
    }
  }, [open, deal, defaultStageId, defaultContactId, stages]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    if (deal) {
      await fetch(`/api/deals/${deal.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes, callDate: callDate || null, meetLink, stageId }),
      });
    } else {
      await fetch("/api/deals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactId, notes, callDate: callDate || null, meetLink, stageId }),
      });
    }

    setSaving(false);
    onSaved();
    onClose();
  };

  const inputCls = "w-full rounded-md border border-zinc-200 px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500";

  return (
    <Modal open={open} onClose={onClose} title={deal ? `Deal — ${deal.contact.name}` : "Add Deal"}>
      <form onSubmit={submit} className="space-y-4">
        {!deal && contacts && (
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-600">Contact *</label>
            <select required className={inputCls} value={contactId} onChange={(e) => setContactId(e.target.value)}>
              <option value="">Select contact…</option>
              {contacts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        )}

        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-600">Stage</label>
          <select className={inputCls} value={stageId} onChange={(e) => setStageId(e.target.value)}>
            {stages.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-600">Notes / Conversation</label>
          <textarea
            className={cn(inputCls, "resize-none")}
            rows={4}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="What did you discuss?"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-600">Call Date</label>
            <input type="date" className={inputCls} value={callDate} onChange={(e) => setCallDate(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-600">Meeting Link</label>
            <input type="url" className={inputCls} value={meetLink} onChange={(e) => setMeetLink(e.target.value)} placeholder="https://meet.google.com/..." />
          </div>
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
            {saving ? "Saving..." : deal ? "Save Changes" : "Add Deal"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
