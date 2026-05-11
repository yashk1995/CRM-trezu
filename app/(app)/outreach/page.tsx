"use client";

import { useCallback, useEffect, useState } from "react";
import { Pencil, Trash2, ArrowRight, Plus } from "lucide-react";
import ContactFormModal from "@/components/outreach/ContactFormModal";
import Badge from "@/components/ui/Badge";
import { STATUS_LABELS, STATUS_COLORS } from "@/lib/constants";

interface Tag { id: string; name: string; color: string }
interface Tier { id: string; label: string }
interface Contact {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  telegramUsername: string | null;
  twitterHandle: string | null;
  companyName: string | null;
  status: string;
  tier: Tier | null;
  contactTags: { tag: Tag }[];
  _count: { deals: number };
}

const STATUS_OPTIONS = [
  { value: "", label: "All Statuses" },
  { value: "not_contacted", label: "Not Contacted" },
  { value: "dm_sent", label: "DM Sent" },
  { value: "rejected", label: "Rejected" },
  { value: "in_pipeline", label: "In Pipeline" },
];

export default function OutreachPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterTier, setFilterTier] = useState("");
  const [filterTag, setFilterTag] = useState("");
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<(Partial<{name:string;email:string;phone:string;telegramUsername:string;twitterHandle:string;companyName:string;status:string;tierId:string;tagIds:string[];notes:string}> & { id?: string }) | null>(null);

  const fetchContacts = useCallback(async () => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (filterStatus) params.set("status", filterStatus);
    if (filterTier) params.set("tierId", filterTier);
    if (filterTag) params.set("tagId", filterTag);
    const res = await fetch(`/api/contacts?${params}`);
    setContacts(await res.json());
    setLoading(false);
  }, [search, filterStatus, filterTier, filterTag]);

  useEffect(() => { fetchContacts(); }, [fetchContacts]);

  useEffect(() => {
    fetch("/api/tiers").then((r) => r.json()).then(setTiers);
    fetch("/api/tags").then((r) => r.json()).then(setTags);
  }, []);

  const deleteContact = async (id: string) => {
    if (!confirm("Delete this contact?")) return;
    await fetch(`/api/contacts/${id}`, { method: "DELETE" });
    fetchContacts();
  };

  const moveToPipeline = async (contact: Contact) => {
    await fetch(`/api/contacts/${contact.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "in_pipeline" }),
    });
    fetchContacts();
  };

  const updateStatus = async (id: string, status: string) => {
    await fetch(`/api/contacts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    fetchContacts();
  };

  const openEdit = (c: Contact) => {
    setEditing({
      ...c,
      email: c.email ?? "",
      phone: c.phone ?? "",
      telegramUsername: c.telegramUsername ?? "",
      twitterHandle: c.twitterHandle ?? "",
      companyName: c.companyName ?? "",
      tagIds: c.contactTags.map((ct) => ct.tag.id),
      tierId: c.tier?.id ?? "",
    });
    setModalOpen(true);
  };

  const selectCls = "rounded-md border border-zinc-200 bg-white px-2.5 py-1.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500";

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Outreach</h1>
          <p className="mt-0.5 text-sm text-zinc-500">{contacts.length} contact{contacts.length !== 1 ? "s" : ""} total</p>
        </div>
        <button
          onClick={() => { setEditing(null); setModalOpen(true); }}
          className="inline-flex items-center gap-1.5 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          <Plus size={15} /> Add Contact
        </button>
      </div>

      {/* Filters */}
      <div className="mt-4 flex flex-wrap gap-2">
        <input
          type="text"
          placeholder="Search name, company, handle..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="min-w-[220px] flex-1 rounded-md border border-zinc-200 px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <select className={selectCls} value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select className={selectCls} value={filterTier} onChange={(e) => setFilterTier(e.target.value)}>
          <option value="">All Tiers</option>
          {tiers.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
        </select>
        <select className={selectCls} value={filterTag} onChange={(e) => setFilterTag(e.target.value)}>
          <option value="">All Tags</option>
          {tags.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="mt-4 overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-100 bg-zinc-50 text-left">
              <th className="px-4 py-3 font-medium text-zinc-500">Name</th>
              <th className="px-4 py-3 font-medium text-zinc-500">Company</th>
              <th className="px-4 py-3 font-medium text-zinc-500">Telegram</th>
              <th className="px-4 py-3 font-medium text-zinc-500">Twitter</th>
              <th className="px-4 py-3 font-medium text-zinc-500">Tier</th>
              <th className="px-4 py-3 font-medium text-zinc-500">Tags</th>
              <th className="px-4 py-3 font-medium text-zinc-500">Status</th>
              <th className="px-4 py-3 font-medium text-zinc-500"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="px-4 py-10 text-center text-zinc-400">Loading...</td></tr>
            ) : contacts.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-10 text-center text-zinc-400">No contacts. Add your first one.</td></tr>
            ) : (
              contacts.map((c) => (
                <tr key={c.id} className="border-b border-zinc-50 hover:bg-zinc-50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-zinc-900">{c.name}</div>
                    {c.email && <div className="text-xs text-zinc-400">{c.email}</div>}
                  </td>
                  <td className="px-4 py-3 text-zinc-600">{c.companyName || <span className="text-zinc-300">—</span>}</td>
                  <td className="px-4 py-3 text-zinc-600">{c.telegramUsername || <span className="text-zinc-300">—</span>}</td>
                  <td className="px-4 py-3 text-zinc-600">{c.twitterHandle || <span className="text-zinc-300">—</span>}</td>
                  <td className="px-4 py-3">
                    {c.tier ? (
                      <Badge label={c.tier.label} className="bg-violet-100 text-violet-700" />
                    ) : <span className="text-zinc-300">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {c.contactTags.length === 0 ? <span className="text-zinc-300">—</span> : c.contactTags.map(({ tag }) => (
                        <Badge key={tag.id} label={tag.name} className="bg-zinc-100 text-zinc-600" />
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {c.status === "in_pipeline" ? (
                      <Badge label="In Pipeline" className={STATUS_COLORS["in_pipeline"]} />
                    ) : (
                      <select
                        value={c.status}
                        onChange={(e) => updateStatus(c.id, e.target.value)}
                        className={`rounded-full border-0 px-2.5 py-0.5 text-xs font-medium outline-none cursor-pointer ${STATUS_COLORS[c.status] ?? "bg-zinc-100 text-zinc-600"}`}
                      >
                        <option value="not_contacted">Not Contacted</option>
                        <option value="dm_sent">DM Sent</option>
                        <option value="rejected">Rejected</option>
                      </select>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEdit(c)}
                        title="Edit"
                        className="rounded p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600"
                      >
                        <Pencil size={14} />
                      </button>
                      {c.status !== "in_pipeline" && (
                        <button
                          onClick={() => moveToPipeline(c)}
                          title="Move to Pipeline"
                          className="rounded p-1.5 text-zinc-400 hover:bg-indigo-50 hover:text-indigo-600"
                        >
                          <ArrowRight size={14} />
                        </button>
                      )}
                      <button
                        onClick={() => deleteContact(c.id)}
                        title="Delete"
                        className="rounded p-1.5 text-zinc-400 hover:bg-red-50 hover:text-red-500"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <ContactFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={fetchContacts}
        initial={editing ?? undefined}
      />
    </div>
  );
}
