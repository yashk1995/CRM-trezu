"use client";

import { useEffect, useRef, useState } from "react";
import SlideOver from "@/components/ui/SlideOver";
import Badge from "@/components/ui/Badge";
import { Send, Phone, Link2, CalendarDays, MessageSquare, FileText, Activity } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface Tag { id: string; name: string; color: string }
interface Tier { id: string; label: string }
interface Stage { id: string; name: string; color: string }
interface ActivityItem {
  id: string; type: string; body: string | null; createdAt: string;
}
interface Deal {
  id: string;
  notes: string | null;
  description: string | null;
  latestStatus: string | null;
  callDate: string | null;
  meetLink: string | null;
  stage: Stage | null;
  contact: {
    id: string; name: string; email: string | null;
    telegramUsername: string | null; twitterHandle: string | null;
    tier: Tier | null; contactTags: { tag: Tag }[];
  };
  activities: ActivityItem[];
}

const ACTIVITY_TYPES = [
  { value: "note", label: "Note", icon: FileText },
  { value: "call", label: "Call", icon: Phone },
  { value: "update", label: "Update", icon: Activity },
];

const TYPE_COLORS: Record<string, string> = {
  note: "bg-zinc-100 text-zinc-600",
  call: "bg-green-100 text-green-700",
  update: "bg-blue-100 text-blue-700",
  telegram: "bg-sky-100 text-sky-700",
  twitter: "bg-indigo-100 text-indigo-700",
  email: "bg-amber-100 text-amber-700",
  meeting: "bg-violet-100 text-violet-700",
};

const inputCls = "w-full rounded-md border border-zinc-200 px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500";

interface Props {
  dealId: string | null;
  open: boolean;
  onClose: () => void;
  onUpdated: () => void;
}

export default function DealDetailPanel({ dealId, open, onClose, onUpdated }: Props) {
  const [deal, setDeal] = useState<Deal | null>(null);
  const [loading, setLoading] = useState(false);

  // Editable fields
  const [description, setDescription] = useState("");
  const [latestStatus, setLatestStatus] = useState("");
  const [callDate, setCallDate] = useState("");
  const [meetLink, setMeetLink] = useState("");
  const [saving, setSaving] = useState(false);

  // Activity post
  const [activityType, setActivityType] = useState("note");
  const [activityBody, setActivityBody] = useState("");
  const [posting, setPosting] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!dealId || !open) return;
    setLoading(true);
    fetch(`/api/deals/${dealId}`)
      .then((r) => r.json())
      .then((d: Deal) => {
        setDeal(d);
        setDescription(d.description ?? "");
        setLatestStatus(d.latestStatus ?? "");
        setCallDate(d.callDate ? d.callDate.slice(0, 10) : "");
        setMeetLink(d.meetLink ?? "");
        setLoading(false);
      });
  }, [dealId, open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [deal?.activities.length]);

  const saveInfo = async () => {
    if (!dealId) return;
    setSaving(true);
    const updated = await fetch(`/api/deals/${dealId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ description, latestStatus, callDate: callDate || null, meetLink }),
    }).then((r) => r.json());
    setDeal((d) => d ? { ...d, ...updated } : d);
    setSaving(false);
    onUpdated();
  };

  const postActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activityBody.trim() || !dealId) return;
    setPosting(true);
    const activity = await fetch(`/api/deals/${dealId}/activities`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: activityType, body: activityBody }),
    }).then((r) => r.json());
    setDeal((d) => d ? { ...d, activities: [...d.activities, activity] } : d);
    setActivityBody("");
    setPosting(false);
  };

  if (!open) return null;

  return (
    <SlideOver open={open} onClose={onClose} title={deal ? deal.contact.name : "Deal"}>
      {loading || !deal ? (
        <div className="flex h-40 items-center justify-center text-sm text-zinc-400">Loading…</div>
      ) : (
        <div className="flex flex-col gap-0">
          {/* Contact header */}
          <div className="border-b border-zinc-100 px-5 py-4">
            <div className="flex items-center gap-2 flex-wrap">
              {deal.contact.tier && (
                <Badge label={deal.contact.tier.label} className="bg-violet-100 text-violet-700" />
              )}
              {deal.stage && (
                <Badge label={deal.stage.name} className="bg-indigo-100 text-indigo-700" />
              )}
              {deal.contact.contactTags.map(({ tag }) => (
                <Badge key={tag.id} label={tag.name} className="bg-zinc-100 text-zinc-500" />
              ))}
            </div>
            <div className="mt-2 flex flex-wrap gap-3 text-xs text-zinc-500">
              {deal.contact.email && <span>{deal.contact.email}</span>}
              {deal.contact.telegramUsername && <span>TG: {deal.contact.telegramUsername}</span>}
              {deal.contact.twitterHandle && <span>TW: {deal.contact.twitterHandle}</span>}
            </div>
          </div>

          {/* Editable info */}
          <div className="border-b border-zinc-100 px-5 py-4 space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-500">Latest Status</label>
              <input
                className={inputCls}
                value={latestStatus}
                onChange={(e) => setLatestStatus(e.target.value)}
                placeholder="e.g. Waiting for reply, Interested, Negotiating…"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-500">Description</label>
              <textarea
                className={cn(inputCls, "resize-none")}
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Context about this deal…"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-500">Call Date</label>
                <input type="date" className={inputCls} value={callDate} onChange={(e) => setCallDate(e.target.value)} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-500">Meet Link</label>
                <input type="url" className={inputCls} value={meetLink} onChange={(e) => setMeetLink(e.target.value)} placeholder="https://…" />
              </div>
            </div>
            <div className="flex justify-end">
              <button
                onClick={saveInfo}
                disabled={saving}
                className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
              >
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>

          {/* Activity feed */}
          <div className="flex flex-1 flex-col px-5 py-4">
            <p className="mb-3 text-xs font-medium text-zinc-500 uppercase tracking-wide">Updates</p>
            <div className="flex flex-col gap-3">
              {deal.activities.length === 0 && (
                <p className="text-xs text-zinc-400">No updates yet. Post the first one below.</p>
              )}
              {deal.activities.map((a) => (
                <div key={a.id} className="flex gap-3">
                  <div className="mt-0.5 shrink-0">
                    <span className={cn("inline-flex rounded-full px-2 py-0.5 text-xs font-medium", TYPE_COLORS[a.type] ?? "bg-zinc-100 text-zinc-600")}>
                      {a.type}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm text-zinc-800 whitespace-pre-wrap">{a.body}</p>
                    <p className="mt-0.5 text-xs text-zinc-400">
                      {format(new Date(a.createdAt), "MMM d, yyyy · h:mm a")}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>

            {/* Post update */}
            <form onSubmit={postActivity} className="mt-4 border-t border-zinc-100 pt-4">
              <div className="flex gap-2 mb-2">
                {ACTIVITY_TYPES.map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setActivityType(value)}
                    className={cn(
                      "rounded-full px-2.5 py-0.5 text-xs font-medium border transition-colors",
                      activityType === value
                        ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                        : "border-zinc-200 text-zinc-500 hover:border-zinc-300"
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <textarea
                  className={cn(inputCls, "flex-1 resize-none")}
                  rows={2}
                  value={activityBody}
                  onChange={(e) => setActivityBody(e.target.value)}
                  placeholder="Write an update, call note, or message…"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); postActivity(e); }
                  }}
                />
                <button
                  type="submit"
                  disabled={posting || !activityBody.trim()}
                  className="self-end rounded-md bg-indigo-600 p-2 text-white hover:bg-indigo-700 disabled:opacity-40"
                >
                  <Send size={14} />
                </button>
              </div>
              <p className="mt-1 text-xs text-zinc-400">Enter to post · Shift+Enter for new line</p>
            </form>
          </div>
        </div>
      )}
    </SlideOver>
  );
}
