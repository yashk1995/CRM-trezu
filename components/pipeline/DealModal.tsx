"use client";

import { useEffect, useState } from "react";
import Modal from "@/components/ui/Modal";
import ContactAvatar from "@/components/ui/ContactAvatar";
import { cn } from "@/lib/utils";

interface Stage { id: string; name: string }

interface Deal {
  id: string;
  notes: string | null;
  callDate: string | null;
  meetLink: string | null;
  stageId: string | null;
  contact: { id: string; name: string; companyName: string | null; logoUrl: string | null };
}

interface ContactOption {
  id: string;
  name: string;
  companyName: string | null;
  logoUrl: string | null;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  deal: Deal | null;
  stages: Stage[];
  defaultStageId?: string;
  defaultContactId?: string;
  contacts?: ContactOption[];
}

function displayName(c: { name: string; companyName: string | null }) {
  return c.companyName || c.name;
}

export default function DealModal({ open, onClose, onSaved, deal, stages, defaultStageId, defaultContactId, contacts }: Props) {
  const [notes, setNotes] = useState("");
  const [callDate, setCallDate] = useState("");
  const [callTime, setCallTime] = useState("");
  const [meetLink, setMeetLink] = useState("");
  const [stageId, setStageId] = useState("");
  const [contactId, setContactId] = useState("");
  const [saving, setSaving] = useState(false);
  const [contactSearch, setContactSearch] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    if (open) {
      setNotes(deal?.notes ?? "");
      if (deal?.callDate) {
        const dt = new Date(deal.callDate);
        setCallDate(`${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`);
        setCallTime(`${String(dt.getHours()).padStart(2,'0')}:${String(dt.getMinutes()).padStart(2,'0')}`);
      } else if (!deal) {
        // New deal — default to current date/time
        const now = new Date();
        setCallDate(`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`);
        setCallTime(`${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`);
      } else {
        setCallDate("");
        setCallTime("");
      }
      setMeetLink(deal?.meetLink ?? "");
      setStageId(deal?.stageId ?? defaultStageId ?? stages[0]?.id ?? "");
      const ec = deal?.contact;
      setContactId(ec?.id ?? defaultContactId ?? "");
      setContactSearch(ec ? displayName(ec) : "");
      setShowDropdown(false);
    }
  }, [open, deal, defaultStageId, defaultContactId, stages]);

  const filteredContacts = (contacts ?? []).filter((c) => {
    const q = contactSearch.toLowerCase();
    return (
      displayName(c).toLowerCase().includes(q) ||
      c.name.toLowerCase().includes(q)
    );
  });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const callDateTime = callDate ? new Date(`${callDate}T${callTime || "00:00"}`).toISOString() : null;
    if (deal) {
      await fetch(`/api/deals/${deal.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes, callDate: callDateTime, meetLink, stageId }),
      });
    } else {
      await fetch("/api/deals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactId, notes, callDate: callDateTime, meetLink, stageId }),
      });
    }
    setSaving(false);
    onSaved();
    onClose();
  };

  const inputCls = "w-full rounded-md border border-zinc-200 px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500";
  const modalTitle = deal
    ? `Deal — ${displayName(deal.contact)}`
    : "Add Deal";

  return (
    <Modal open={open} onClose={onClose} title={modalTitle}>
      <form onSubmit={submit} className="space-y-4">
        {!deal && contacts && (
          <div className="relative">
            <label className="mb-1 block text-xs font-medium text-zinc-600">Contact *</label>
            <input
              className={inputCls}
              placeholder="Search contacts…"
              value={contactSearch}
              onChange={(e) => { setContactSearch(e.target.value); setContactId(""); setShowDropdown(true); }}
              onFocus={() => setShowDropdown(true)}
              onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
              autoComplete="off"
            />
            {showDropdown && (
              <div className="absolute z-20 mt-1 max-h-48 w-full overflow-auto rounded-md border border-zinc-200 bg-white shadow-lg">
                {filteredContacts.length === 0 ? (
                  <p className="px-3 py-2 text-xs text-zinc-400">No contacts found</p>
                ) : (
                  filteredContacts.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onMouseDown={() => { setContactId(c.id); setContactSearch(displayName(c)); setShowDropdown(false); }}
                      className="flex w-full items-center gap-2.5 px-3 py-2 text-left hover:bg-zinc-50"
                    >
                      <ContactAvatar logoUrl={c.logoUrl} name={displayName(c)} size="xs" />
                      <div className="min-w-0">
                        <p className="truncate text-sm text-zinc-900">{displayName(c)}</p>
                        {c.companyName && <p className="truncate text-xs text-zinc-400">{c.name}</p>}
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}
            <input type="hidden" required value={contactId} onChange={() => {}} />
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
          <textarea className={cn(inputCls, "resize-none")} rows={4} value={notes}
            onChange={(e) => setNotes(e.target.value)} placeholder="What did you discuss?" />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-600">
            Call Date &amp; Time
            <span className="ml-1 font-normal text-zinc-400">({Intl.DateTimeFormat().resolvedOptions().timeZone})</span>
          </label>
          <div style={{ display: "flex", gap: 8 }}>
            <input type="date" value={callDate} onChange={(e) => setCallDate(e.target.value)}
              className={inputCls} style={{ flex: 1, minWidth: 0 }} />
            <input type="time" value={callTime} onChange={(e) => setCallTime(e.target.value)}
              className={inputCls} style={{ width: 110, flexShrink: 0 }} />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-600">Meeting Link</label>
          <input type="url" className={inputCls} value={meetLink} onChange={(e) => setMeetLink(e.target.value)} placeholder="https://meet.google.com/..." />
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className="rounded-md px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-100">Cancel</button>
          <button type="submit" disabled={saving}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60">
            {saving ? "Saving..." : deal ? "Save Changes" : "Add Deal"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
