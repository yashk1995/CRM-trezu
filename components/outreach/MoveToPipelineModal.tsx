"use client";

import { useEffect, useState } from "react";
import Modal from "@/components/ui/Modal";
import ContactAvatar from "@/components/ui/ContactAvatar";
import { cn } from "@/lib/utils";

interface Stage { id: string; name: string; color: string; order: number }

interface Contact {
  id: string;
  name: string;
  companyName: string | null;
  logoUrl: string | null;
}

interface Props {
  open: boolean;
  onClose: () => void;
  contact: Contact | null;
  onMoved: () => void;
}

function nowDateStr()  { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; }
function nowTimeStr()  { const d = new Date(); return `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`; }

const inp = "w-full rounded-[6px] border border-[var(--mist)] bg-[var(--paper)] px-3 py-1.5 text-[13px] text-[var(--ink)] outline-none focus:border-[var(--brand)] focus:shadow-[0_0_0_3px_var(--brand-wash)]";

export default function MoveToPipelineModal({ open, onClose, contact, onMoved }: Props) {
  const [stages,  setStages]  = useState<Stage[]>([]);
  const [stageId, setStageId] = useState("");
  const [notes,   setNotes]   = useState("");
  const [callDate,setCallDate]= useState("");
  const [callTime,setCallTime]= useState("");
  const [meetLink,setMeetLink]= useState("");
  const [saving,  setSaving]  = useState(false);

  useEffect(() => {
    if (!open) return;
    setNotes("");
    setMeetLink("");
    setCallDate(nowDateStr());
    setCallTime(nowTimeStr());
    fetch("/api/pipeline-stages")
      .then((r) => r.json())
      .then((data: Stage[]) => {
        setStages(data);
        setStageId(data[0]?.id ?? "");
      });
  }, [open]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contact || !stageId) return;
    setSaving(true);
    const callDateTime = callDate
      ? new Date(`${callDate}T${callTime || "00:00"}`).toISOString()
      : null;
    await Promise.all([
      fetch("/api/deals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactId: contact.id,
          stageId,
          notes: notes || null,
          callDate: callDateTime,
          meetLink: meetLink || null,
        }),
      }),
      fetch(`/api/contacts/${contact.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "in_pipeline" }),
      }),
    ]);
    setSaving(false);
    onMoved();
    onClose();
  };

  if (!contact) return null;

  const primary = contact.companyName || contact.name;
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;

  return (
    <Modal open={open} onClose={onClose} title="Move to Pipeline" className="max-w-lg">
      <form onSubmit={submit} className="space-y-5">
        {/* Contact identity */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", background: "var(--cloud)", borderRadius: 8, border: "1px solid var(--mist)" }}>
          <ContactAvatar logoUrl={contact.logoUrl} name={primary} size="md" />
          <div>
            <p style={{ fontSize: 14, fontWeight: 700, color: "var(--ink)", margin: 0 }}>{primary}</p>
            {contact.companyName && <p style={{ fontSize: 12, color: "var(--stone)", marginTop: 2 }}>{contact.name}</p>}
          </div>
        </div>

        {/* Stage selection */}
        <div>
          <label style={{ display: "block", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--fog)", marginBottom: 10 }}>
            Select Pipeline Stage *
          </label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {stages.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setStageId(s.id)}
                style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "10px 12px", borderRadius: 8, cursor: "pointer",
                  border: stageId === s.id ? `2px solid ${s.color}` : "2px solid var(--mist)",
                  background: stageId === s.id ? `${s.color}14` : "var(--paper)",
                  transition: "all 0.15s",
                }}
              >
                <span style={{ width: 8, height: 8, borderRadius: 999, background: s.color, flexShrink: 0 }} />
                <span style={{ fontSize: 13, fontWeight: stageId === s.id ? 600 : 500, color: stageId === s.id ? s.color : "var(--graphite)" }}>
                  {s.name}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Notes */}
        <div>
          <label style={{ display: "block", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--fog)", marginBottom: 6 }}>
            Notes
          </label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3}
            placeholder="What's the context for this deal?"
            className={cn(inp, "resize-none")} />
        </div>

        {/* Call date + time */}
        <div>
          <label style={{ display: "block", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--fog)", marginBottom: 6 }}>
            Call Date &amp; Time <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>({tz})</span>
          </label>
          <div style={{ display: "flex", gap: 8 }}>
            <input type="date" value={callDate} onChange={(e) => setCallDate(e.target.value)}
              className={inp} style={{ flex: 1, minWidth: 0 }} />
            <input type="time" value={callTime} onChange={(e) => setCallTime(e.target.value)}
              className={inp} style={{ width: 110, flexShrink: 0 }} />
          </div>
        </div>

        {/* Meet link */}
        <div>
          <label style={{ display: "block", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--fog)", marginBottom: 6 }}>
            Meet Link
          </label>
          <input type="url" value={meetLink} onChange={(e) => setMeetLink(e.target.value)}
            placeholder="https://meet.google.com/…"
            className={inp} />
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose}
            style={{ height: 36, padding: "0 16px", background: "transparent", border: "1px solid var(--mist)", borderRadius: 999, fontSize: 13, fontWeight: 500, color: "var(--stone)", cursor: "pointer" }}>
            Cancel
          </button>
          <button type="submit" disabled={saving || !stageId}
            style={{ height: 36, padding: "0 20px", background: "var(--ink)", color: "white", borderRadius: 999, border: "none", fontSize: 13, fontWeight: 500, cursor: "pointer", opacity: (saving || !stageId) ? 0.5 : 1 }}>
            {saving ? "Moving…" : "Move to Pipeline"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
