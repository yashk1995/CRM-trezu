"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Trash2, Plus, Columns, Check, ChevronDown, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Tag { id: string; name: string; color: string }
interface Tier { id: string; label: string }
interface Stage { id: string; name: string; color: string }
interface Deal {
  stage: Stage | null;
  latestStatus: string | null;
  callDate: string | null;
  owner: { id: string; name: string } | null;
}
interface Contact {
  id: string; name: string; email: string | null; phone: string | null;
  telegramUsername: string | null; twitterHandle: string | null;
  companyName: string | null; status: string;
  tier: Tier | null; contactTags: { tag: Tag }[]; deals: Deal[];
}
interface PickerContact {
  id: string; name: string; email: string | null;
  telegramUsername: string | null; twitterHandle: string | null;
  status: string;
}
interface ListContact {
  addedAt: string; source: "outreach" | "pipeline"; stageLabel: string; contact: Contact;
}
interface CrmList { id: string; name: string }

// ─── Column definitions ───────────────────────────────────────────────────────

const ALL_COLUMNS = [
  { key: "stage",            label: "Stage" },
  { key: "telegramUsername", label: "Telegram" },
  { key: "twitterHandle",    label: "Twitter" },
  { key: "email",            label: "Email" },
  { key: "phone",            label: "Phone" },
  { key: "companyName",      label: "Company" },
  { key: "tier",             label: "Tier" },
  { key: "tags",             label: "Tags" },
  { key: "dealOwner",        label: "Deal Owner" },
  { key: "latestStatus",     label: "Latest Status" },
  { key: "callDate",         label: "Call Date" },
] as const;
type ColumnKey = (typeof ALL_COLUMNS)[number]["key"];
const DEFAULT_COLUMNS: ColumnKey[] = ["stage", "telegramUsername", "dealOwner"];

const OUTREACH_STATUSES = ["not_contacted", "dm_sent", "rejected"];
const OUTREACH_LABELS: Record<string, string> = {
  not_contacted: "Not Contacted",
  dm_sent: "DM Sent",
  rejected: "Rejected",
};

function loadColumns(listId: string): ColumnKey[] {
  try {
    const raw = localStorage.getItem(`list-columns-${listId}`);
    if (raw) return JSON.parse(raw) as ColumnKey[];
  } catch {}
  return DEFAULT_COLUMNS;
}
function saveColumns(listId: string, cols: ColumnKey[]) {
  localStorage.setItem(`list-columns-${listId}`, JSON.stringify(cols));
}

// ─── Column Manager ───────────────────────────────────────────────────────────

function ColumnManager({ activeColumns, onChange }: { activeColumns: ColumnKey[]; onChange: (c: ColumnKey[]) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const toggle = (key: ColumnKey) => {
    const next = activeColumns.includes(key) ? activeColumns.filter((k) => k !== key) : [...activeColumns, key];
    onChange(next);
  };

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen((v) => !v)} className="inline-flex items-center gap-1.5 rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50">
        <Columns size={14} /> Columns <ChevronDown size={12} />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-30 mt-1 w-48 rounded-lg border border-zinc-200 bg-white py-1 shadow-lg">
          {ALL_COLUMNS.map(({ key, label }) => (
            <label key={key} className="flex cursor-pointer items-center gap-2 px-3 py-1.5 text-sm hover:bg-zinc-50">
              <input type="checkbox" checked={activeColumns.includes(key)} onChange={() => toggle(key)} className="h-3.5 w-3.5 rounded accent-indigo-600" />
              {label}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Add Contact Modal ────────────────────────────────────────────────────────

function AddContactModal({
  open, onClose, listId, serverInListIds, onListChanged,
}: {
  open: boolean;
  onClose: () => void;
  listId: string;
  serverInListIds: Set<string>;
  onListChanged: () => void;
}) {
  const [contacts, setContacts] = useState<PickerContact[]>([]);
  const [inListIds, setInListIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const hasFetched = useRef(false);

  // Fetch contacts once (they rarely change)
  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;
    fetch("/api/contacts")
      .then((r) => r.json())
      .then(setContacts)
      .catch(() => {});
  }, []);

  // Sync server state into local when modal opens
  useEffect(() => {
    if (open) {
      setSearch("");
      setInListIds(new Set(serverInListIds));
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = !search
    ? contacts
    : contacts.filter((c) => {
        const q = search.toLowerCase();
        return (
          c.name.toLowerCase().includes(q) ||
          (c.telegramUsername ?? "").toLowerCase().includes(q) ||
          (c.twitterHandle ?? "").toLowerCase().includes(q) ||
          (c.email ?? "").toLowerCase().includes(q)
        );
      });

  const toggle = async (c: PickerContact) => {
    const inList = inListIds.has(c.id);
    // Instant optimistic update
    setInListIds((prev) => {
      const next = new Set(prev);
      if (inList) next.delete(c.id); else next.add(c.id);
      return next;
    });
    if (inList) {
      await fetch(`/api/lists/${listId}/contacts/${c.id}`, { method: "DELETE" });
    } else {
      await fetch(`/api/lists/${listId}/contacts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactId: c.id }),
      });
    }
    onListChanged();
  };

  return (
    <Modal open={open} onClose={onClose} title="Add Contacts to List">
      <input
        type="text"
        placeholder="Search by name, telegram, email…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        autoFocus
        className="mb-3 w-full rounded-md border border-zinc-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
      />
      <div className="max-h-80 overflow-y-auto divide-y divide-zinc-50">
        {contacts.length === 0 ? (
          <p className="py-8 text-center text-sm text-zinc-400">Loading…</p>
        ) : filtered.length === 0 ? (
          <p className="py-8 text-center text-sm text-zinc-400">No contacts match "{search}"</p>
        ) : (
          filtered.map((c) => {
            const isOutreach = OUTREACH_STATUSES.includes(c.status);
            const stageLabel = isOutreach ? (OUTREACH_LABELS[c.status] ?? c.status) : "In Pipeline";
            const inList = inListIds.has(c.id);
            return (
              <button
                key={c.id}
                onClick={() => toggle(c)}
                className={cn(
                  "flex w-full items-center justify-between gap-3 px-2 py-2.5 text-left transition-colors",
                  inList ? "bg-indigo-50 hover:bg-indigo-100" : "hover:bg-zinc-50"
                )}
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-zinc-900">{c.name}</p>
                  {c.telegramUsername && <p className="truncate text-xs text-zinc-400">{c.telegramUsername}</p>}
                  {!c.telegramUsername && c.email && <p className="truncate text-xs text-zinc-400">{c.email}</p>}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="text-xs text-zinc-400">{stageLabel}</span>
                  <Badge
                    label={isOutreach ? "Outreach" : "Pipeline"}
                    className={isOutreach ? "bg-zinc-100 text-zinc-600" : "bg-indigo-100 text-indigo-700"}
                  />
                  <div className={cn("flex h-5 w-5 items-center justify-center rounded-full", inList ? "bg-indigo-600" : "border border-zinc-200")}>
                    {inList && <Check size={11} className="text-white" />}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
      <p className="mt-3 text-right text-xs text-zinc-400">{inListIds.size} contact{inListIds.size !== 1 ? "s" : ""} in list</p>
    </Modal>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ListDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [list, setList] = useState<CrmList | null>(null);
  const [listContacts, setListContacts] = useState<ListContact[]>([]);
  const [loading, setLoading] = useState(true);

  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState("");
  const nameRef = useRef<HTMLInputElement>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [activeColumns, setActiveColumns] = useState<ColumnKey[]>(DEFAULT_COLUMNS);

  const [search, setSearch] = useState("");
  const [filterStage, setFilterStage] = useState("");
  const [filterTier, setFilterTier] = useState("");

  useEffect(() => { if (id) setActiveColumns(loadColumns(id)); }, [id]);

  const handleColumnsChange = (cols: ColumnKey[]) => {
    setActiveColumns(cols);
    if (id) saveColumns(id, cols);
  };

  // Fetch list info + list contacts in parallel
  const loadPage = async () => {
    if (!id) return;
    setLoading(true);
    const [listRes, contactsRes] = await Promise.all([
      fetch(`/api/lists/${id}`),
      fetch(`/api/lists/${id}/contacts`),
    ]);
    if (listRes.ok) {
      const data = await listRes.json();
      setList(data);
      setNameValue(data.name);
    }
    if (contactsRes.ok) setListContacts(await contactsRes.json());
    setLoading(false);
  };

  const refreshContacts = async () => {
    if (!id) return;
    const res = await fetch(`/api/lists/${id}/contacts`);
    if (res.ok) setListContacts(await res.json());
  };

  useEffect(() => { loadPage(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Inline rename ─────────────────────────────────────────────────────────
  const startEdit = () => { setEditingName(true); setTimeout(() => nameRef.current?.focus(), 0); };

  const saveName = async () => {
    const trimmed = nameValue.trim();
    if (!trimmed || trimmed === list?.name) { setEditingName(false); setNameValue(list?.name ?? ""); return; }
    setList((l) => l ? { ...l, name: trimmed } : l);
    setEditingName(false);
    await fetch(`/api/lists/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: trimmed }),
    });
  };

  // ── Delete list ───────────────────────────────────────────────────────────
  const exportCSV = () => {
    const headers = ["Company", "POC Name", "Stage", "Telegram", "POC Username", "Email", "Tier", "Tags"];
    const rows = listContacts.map((lc) => {
      const c = lc.contact;
      return [
        c.companyName ?? "", c.name, lc.stageLabel,
        c.telegramUsername ?? "", c.pocUsername ?? "",
        c.email ?? "", c.tier?.label ?? "",
        c.contactTags.map(({ tag }) => tag.name).join("; "),
      ];
    });
    const csv = [headers, ...rows]
      .map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url;
    a.download = `${list?.name ?? "list"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const deleteList = async () => {
    if (!confirm(`Delete "${list?.name}"? This cannot be undone.`)) return;
    await fetch(`/api/lists/${id}`, { method: "DELETE" });
    router.push("/lists");
  };

  // ── Derived ───────────────────────────────────────────────────────────────
  const serverInListIds = new Set(listContacts.map((lc) => lc.contact.id));
  const stageOptions = Array.from(new Set(listContacts.map((lc) => lc.stageLabel)));
  const tierOptions = Array.from(
    new Map(listContacts.filter((lc) => lc.contact.tier).map((lc) => [lc.contact.tier!.id, lc.contact.tier!])).values()
  );

  const filtered = listContacts.filter((lc) => {
    const c = lc.contact;
    const q = search.toLowerCase();
    return (
      (!q || c.name.toLowerCase().includes(q) || (c.telegramUsername ?? "").toLowerCase().includes(q) || (c.email ?? "").toLowerCase().includes(q)) &&
      (!filterStage || lc.stageLabel === filterStage) &&
      (!filterTier || c.tier?.id === filterTier)
    );
  });

  const colLabel = (key: ColumnKey) => ALL_COLUMNS.find((c) => c.key === key)?.label ?? key;

  const renderCell = (lc: ListContact, key: ColumnKey) => {
    const c = lc.contact;
    const em = <span className="text-zinc-300">—</span>;
    switch (key) {
      case "stage":
        return <Badge label={lc.stageLabel} className={lc.source === "outreach" ? "bg-zinc-100 text-zinc-600" : "bg-indigo-100 text-indigo-700"} />;
      case "telegramUsername": return c.telegramUsername ? <span className="text-zinc-600">{c.telegramUsername}</span> : em;
      case "twitterHandle":    return c.twitterHandle    ? <span className="text-zinc-600">{c.twitterHandle}</span>    : em;
      case "email":            return c.email            ? <span className="text-zinc-600">{c.email}</span>            : em;
      case "phone":            return c.phone            ? <span className="text-zinc-600">{c.phone}</span>            : em;
      case "companyName":      return c.companyName      ? <span className="text-zinc-600">{c.companyName}</span>      : em;
      case "tier":             return c.tier ? <Badge label={c.tier.label} className="bg-violet-100 text-violet-700" /> : em;
      case "tags":
        return c.contactTags.length > 0
          ? <div className="flex flex-wrap gap-1">{c.contactTags.map(({ tag }) => <Badge key={tag.id} label={tag.name} className="bg-zinc-100 text-zinc-600" />)}</div>
          : em;
      case "dealOwner":    return <span className="text-zinc-600">Admin</span>;
      case "latestStatus": return c.deals[0]?.latestStatus ? <span className="text-zinc-600">{c.deals[0].latestStatus}</span> : em;
      case "callDate": {
        const cd = c.deals[0]?.callDate;
        return cd ? <span className="text-zinc-600">{new Date(cd).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span> : em;
      }
      default: return em;
    }
  };

  const selectCls = "rounded-md border border-zinc-200 bg-white px-2.5 py-1.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500";

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between gap-4">
        <div className="min-w-0 flex items-center gap-3">
          {editingName ? (
            <input
              ref={nameRef}
              value={nameValue}
              onChange={(e) => setNameValue(e.target.value)}
              onBlur={saveName}
              onKeyDown={(e) => { if (e.key === "Enter") saveName(); if (e.key === "Escape") { setEditingName(false); setNameValue(list?.name ?? ""); } }}
              className="rounded-md border border-indigo-300 px-2 py-1 text-2xl font-semibold text-zinc-900 outline-none focus:ring-2 focus:ring-indigo-500"
            />
          ) : (
            <h1 onClick={startEdit} title="Click to rename" className="cursor-pointer truncate text-2xl font-semibold text-zinc-900 hover:text-indigo-600">
              {list?.name ?? "…"}
            </h1>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button onClick={exportCSV} title="Export CSV"
            style={{ height: 36, padding: "0 12px", background: "transparent", border: "1px solid var(--mist)", borderRadius: 999, fontSize: 12, fontWeight: 500, color: "var(--stone)", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}>
            <Download size={13} /> Export
          </button>
          <button onClick={deleteList} title="Delete list" className="rounded-md border border-red-200 p-2 text-red-500 hover:bg-red-50">
            <Trash2 size={15} />
          </button>
          <ColumnManager activeColumns={activeColumns} onChange={handleColumnsChange} />
          <button
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            <Plus size={15} /> Add Contact
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap gap-2">
        <input
          type="text"
          placeholder="Search name, telegram, email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="min-w-[220px] flex-1 rounded-md border border-zinc-200 px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <select className={selectCls} value={filterStage} onChange={(e) => setFilterStage(e.target.value)}>
          <option value="">All Stages</option>
          {stageOptions.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select className={selectCls} value={filterTier} onChange={(e) => setFilterTier(e.target.value)}>
          <option value="">All Tiers</option>
          {tierOptions.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto rounded-lg border border-zinc-200 bg-white shadow-sm">
        {loading ? (
          <div className="flex h-40 items-center justify-center text-sm text-zinc-400">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="flex h-40 items-center justify-center text-sm text-zinc-400">
            {listContacts.length === 0 ? "No contacts in this list yet — click Add Contact to get started." : "No contacts match your filters."}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50 text-left">
                <th className="px-4 py-3 font-medium text-zinc-500">Name</th>
                {activeColumns.map((key) => <th key={key} className="px-4 py-3 font-medium text-zinc-500">{colLabel(key)}</th>)}
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((lc) => (
                <tr key={lc.contact.id} className="border-b border-zinc-50 hover:bg-zinc-50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-zinc-900">{lc.contact.name}</div>
                    {lc.contact.email && <div className="text-xs text-zinc-400">{lc.contact.email}</div>}
                  </td>
                  {activeColumns.map((key) => <td key={key} className="px-4 py-3">{renderCell(lc, key)}</td>)}
                  <td className="px-4 py-3">
                    <button
                      onClick={() => fetch(`/api/lists/${id}/contacts/${lc.contact.id}`, { method: "DELETE" }).then(refreshContacts)}
                      title="Remove from list"
                      className="rounded p-1.5 text-zinc-400 hover:bg-red-50 hover:text-red-500"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <AddContactModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        listId={id}
        serverInListIds={serverInListIds}
        onListChanged={refreshContacts}
      />
    </div>
  );
}
