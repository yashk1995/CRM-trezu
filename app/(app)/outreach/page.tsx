"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { cacheGet, cacheSet, cacheClearPrefix } from "@/lib/cache";
import Link from "next/link";
import { Plus, Search, ArrowRight, Pencil, Trash2, ExternalLink, ChevronDown, Download, X } from "lucide-react";
import ContactFormModal          from "@/components/outreach/ContactFormModal";
import MoveToPipelineModal       from "@/components/outreach/MoveToPipelineModal";
import BulkMoveToPipelineModal   from "@/components/outreach/BulkMoveToPipelineModal";
import ContactAvatar    from "@/components/ui/ContactAvatar";
import Badge            from "@/components/ui/Badge";

interface Tag    { id: string; name: string; color: string }
interface Tier   { id: string; label: string }
interface POC { name: string; username?: string }
interface Contact {
  id: string; name: string; companyName: string | null;
  pocUsername: string | null; groupLink: string | null; logoUrl: string | null;
  email: string | null; phone: string | null;
  telegramUsername: string | null; twitterHandle: string | null;
  status: string; tier: Tier | null;
  contactTags: { tag: Tag }[];
  _count: { deals: number };
  pocs: POC[];
}

const VIEWS = [
  { label: "All",            status: "",              count: null },
  { label: "To message",     status: "not_contacted", count: null },
  { label: "Waiting reply",  status: "dm_sent",       count: null },
  { label: "In pipeline",    status: "in_pipeline",   count: null },
];

const STATUS_CHIP: Record<string, { cls: string; label: string }> = {
  not_contacted: { cls: "chip",         label: "Not contacted" },
  dm_sent:       { cls: "chip brand",   label: "DM sent"       },
  rejected:      { cls: "chip rose",    label: "Rejected"      },
  in_pipeline:   { cls: "chip emerald", label: "In pipeline"   },
};

export default function OutreachPage() {
  const [contacts,     setContacts]     = useState<Contact[]>([]);
  const [tiers,        setTiers]        = useState<Tier[]>([]);
  const [tags,         setTags]         = useState<Tag[]>([]);
  const [search,       setSearch]       = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterTier,   setFilterTier]   = useState("");
  const [filterTag,    setFilterTag]    = useState("");
  const [activeView,   setActiveView]   = useState(0);
  const [loading,      setLoading]      = useState(true);
  const [modalOpen,       setModalOpen]       = useState(false);
  const [editing,         setEditing]         = useState<(Partial<Contact> & { id?: string; tagIds?: string[]; tierId?: string; pocs?: { name: string; username: string }[] }) | null>(null);
  const [pipelineContact, setPipelineContact] = useState<Contact | null>(null);

  // Bulk selection
  const [selectedIds,       setSelectedIds]       = useState<Set<string>>(new Set());
  const [bulkAction,        setBulkAction]        = useState<"list" | "status" | null>(null);
  const [lists,             setLists]             = useState<{ id: string; name: string }[]>([]);
  const [bulkPipelineOpen,  setBulkPipelineOpen]  = useState(false);
  const bulkRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (bulkAction) {
      fetch("/api/lists").then((r) => r.json()).then(setLists).catch(() => {});
      const h = (e: MouseEvent) => { if (bulkRef.current && !bulkRef.current.contains(e.target as Node)) setBulkAction(null); };
      document.addEventListener("mousedown", h);
      return () => document.removeEventListener("mousedown", h);
    }
  }, [bulkAction]);

  const fetchContacts = useCallback(async (invalidate = false) => {
    const params = new URLSearchParams();
    if (search)       params.set("search",  search);
    if (filterStatus) params.set("status",  filterStatus);
    if (filterTier)   params.set("tierId",  filterTier);
    if (filterTag)    params.set("tagId",   filterTag);
    const cacheKey = `contacts:${params.toString()}`;

    if (invalidate) {
      cacheClearPrefix("contacts:");
    } else {
      const cached = cacheGet<Contact[]>(cacheKey);
      if (cached) { setContacts(cached); setLoading(false); }
    }

    const data = await fetch(`/api/contacts?${params}`).then((r) => r.json());
    cacheSet(cacheKey, data);
    setContacts(data);
    setLoading(false);
  }, [search, filterStatus, filterTier, filterTag]);

  useEffect(() => { fetchContacts(); }, [fetchContacts]);
  useEffect(() => {
    const cachedTiers = cacheGet<Tier[]>("tiers", 300_000);
    const cachedTags  = cacheGet<Tag[]>("tags",   300_000);
    if (cachedTiers) setTiers(cachedTiers);
    if (cachedTags)  setTags(cachedTags);
    if (!cachedTiers) fetch("/api/tiers").then((r) => r.json()).then((d) => { cacheSet("tiers", d); setTiers(d); });
    if (!cachedTags)  fetch("/api/tags").then((r)  => r.json()).then((d) => { cacheSet("tags",  d); setTags(d); });
  }, []);

  const applyView = (idx: number) => {
    setActiveView(idx);
    setFilterStatus(VIEWS[idx].status);
  };

  const deleteContact = async (id: string) => {
    if (!confirm("Delete this contact?")) return;
    await fetch(`/api/contacts/${id}`, { method: "DELETE" });
    fetchContacts(true);
  };

  const openMoveToPipeline = (c: Contact) => {
    setPipelineContact(c);
  };

  const updateStatus = async (id: string, status: string) => {
    await fetch(`/api/contacts/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    fetchContacts(true);
  };

  const openEdit = (c: Contact) => {
    setEditing({
      ...c,
      email:           c.email           ?? "",
      phone:           c.phone           ?? "",
      telegramUsername:c.telegramUsername ?? "",
      twitterHandle:   c.twitterHandle   ?? "",
      companyName:     c.companyName     ?? "",
      pocUsername:     c.pocUsername     ?? "",
      groupLink:       c.groupLink       ?? "",
      logoUrl:         c.logoUrl         ?? "",
      tagIds:          c.contactTags.map((ct) => ct.tag.id),
      tierId:          c.tier?.id        ?? "",
      pocs:            c.pocs.map((p) => ({ name: p.name, username: p.username ?? "" })),
    });
    setModalOpen(true);
  };

  // Selection helpers
  const toggleSelect = (id: string) =>
    setSelectedIds((prev) => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });

  const toggleSelectAll = () =>
    setSelectedIds(selectedIds.size === contacts.length ? new Set() : new Set(contacts.map((c) => c.id)));

  // Bulk: add to list
  const bulkAddToList = async (listId: string) => {
    await Promise.all([...selectedIds].map((id) =>
      fetch(`/api/lists/${listId}/contacts`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contactId: id }) })
    ));
    setBulkAction(null);
    setSelectedIds(new Set());
  };

  // Bulk: set status
  const bulkSetStatus = async (status: string) => {
    await Promise.all([...selectedIds].map((id) =>
      fetch(`/api/contacts/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) })
    ));
    setBulkAction(null);
    setSelectedIds(new Set());
    fetchContacts(true);
  };

  // CSV export
  const exportCSV = (rows: Contact[], filename: string) => {
    const headers = ["Company", "POC Name", "POC Username", "Group Link", "Telegram", "Twitter", "Email", "Phone", "Tier", "Tags", "Status"];
    const data = rows.map((c) => [
      c.companyName ?? "",
      c.name,
      c.pocUsername ?? "",
      c.groupLink ?? "",
      c.telegramUsername ?? "",
      c.twitterHandle ?? "",
      c.email ?? "",
      c.phone ?? "",
      c.tier?.label ?? "",
      c.contactTags.map(({ tag }) => tag.name).join("; "),
      c.status,
    ]);
    const csv = [headers, ...data]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  };

  const colCount = 9; // +1 for checkbox

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 style={{ fontFamily: "'Inter Tight', sans-serif", fontSize: 28, fontWeight: 600, letterSpacing: "-0.02em", color: "var(--ink)", margin: 0 }}>
              Outreach
            </h1>
            <span className="chip chip-lg">{contacts.length} contacts</span>
          </div>
          <p style={{ fontSize: 14, color: "var(--stone)", marginTop: 6, fontWeight: 500 }}>
            {contacts.filter((c) => c.status === "not_contacted").length} not contacted ·{" "}
            {contacts.filter((c) => c.status === "dm_sent").length} DM sent ·{" "}
            {contacts.filter((c) => c.status === "in_pipeline").length} in pipeline
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => exportCSV(contacts, "contacts.csv")} className="btn secondary">
            <Download size={14} /> Export CSV
          </button>
          <button onClick={() => { setEditing(null); setModalOpen(true); }} className="btn primary">
            <Plus size={14} /> New contact
          </button>
        </div>
      </div>

      {/* View tabs */}
      <div style={{ borderBottom: "1px solid var(--mist)", display: "flex", gap: 2, marginBottom: -1 }}>
        {VIEWS.map((v, i) => (
          <button key={i} onClick={() => applyView(i)}
            style={{
              background: "transparent", border: 0, cursor: "pointer",
              padding: "10px 14px",
              fontSize: 13, fontWeight: 500,
              color: activeView === i ? "var(--ink)" : "var(--stone)",
              borderBottom: activeView === i ? "2px solid var(--brand)" : "2px solid transparent",
              marginBottom: -1,
              display: "inline-flex", alignItems: "center", gap: 6,
            }}>
            {v.label}
            <span style={{
              fontSize: 10, fontWeight: 500,
              fontFamily: "var(--font-mono)",
              background: activeView === i ? "var(--brand-wash)" : "var(--cloud-2)",
              color: activeView === i ? "var(--brand-deep)" : "var(--stone)",
              padding: "2px 5px", borderRadius: 999,
            }}>
              {contacts.filter((c) => !v.status || c.status === v.status).length}
            </span>
          </button>
        ))}
      </div>

      {/* Filter bar */}
      <div style={{ background: "var(--paper)", border: "1px solid var(--mist)", borderRadius: 12, padding: 10, display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, background: "var(--cloud)", borderRadius: 999, padding: "0 12px", height: 32 }}>
          <Search size={13} color="var(--stone)" />
          <input
            value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, company, handle…"
            style={{ background: "transparent", border: 0, outline: 0, width: "100%", fontSize: 13, color: "var(--ink)" }}
          />
        </div>
        {/* Tier filter */}
        <div style={{ position: "relative" }}>
          <select value={filterTier} onChange={(e) => setFilterTier(e.target.value)}
            style={{ height: 32, padding: "0 28px 0 12px", background: "var(--paper)", border: "1px solid var(--mist)", borderRadius: 999, fontSize: 12, fontWeight: 500, color: filterTier ? "var(--ink)" : "var(--stone)", cursor: "pointer", appearance: "none", outline: "none" }}>
            <option value="">Tier: All</option>
            {tiers.map((t) => <option key={t.id} value={t.id}>Tier: {t.label}</option>)}
          </select>
          <ChevronDown size={11} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", color: "var(--stone)", pointerEvents: "none" }} />
        </div>
        {/* Tag filter */}
        <div style={{ position: "relative" }}>
          <select value={filterTag} onChange={(e) => setFilterTag(e.target.value)}
            style={{ height: 32, padding: "0 28px 0 12px", background: "var(--paper)", border: "1px solid var(--mist)", borderRadius: 999, fontSize: 12, fontWeight: 500, color: filterTag ? "var(--ink)" : "var(--stone)", cursor: "pointer", appearance: "none", outline: "none" }}>
            <option value="">Tag: Any</option>
            {tags.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <ChevronDown size={11} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", color: "var(--stone)", pointerEvents: "none" }} />
        </div>
      </div>

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div ref={bulkRef} style={{ background: "var(--ink)", borderRadius: 12, padding: "10px 14px", display: "flex", alignItems: "center", gap: 12, position: "relative" }}>
          <span style={{ fontSize: 11, fontWeight: 700, background: "#1F2330", color: "white", borderRadius: 4, padding: "2px 8px" }}>
            {selectedIds.size} selected
          </span>
          <span style={{ fontSize: 12, color: "#A6AAB4" }}>
            {contacts.filter((c) => selectedIds.has(c.id)).map((c) => c.companyName || c.name).slice(0, 3).join(", ")}
            {selectedIds.size > 3 && ` +${selectedIds.size - 3} more`}
          </span>
          <div style={{ flex: 1 }} />

          {/* Add to list */}
          <div style={{ position: "relative" }}>
            <button onClick={() => setBulkAction(bulkAction === "list" ? null : "list")}
              className="btn sm" style={{ background: "#1F2330", color: "white", borderColor: "#2A2D36" }}>
              Add to list
            </button>
            {bulkAction === "list" && (
              <div style={{ position: "absolute", right: 0, bottom: "calc(100% + 6px)", background: "var(--paper)", border: "1px solid var(--mist)", borderRadius: 10, boxShadow: "0 4px 16px rgba(10,11,16,0.12)", minWidth: 180, overflow: "hidden", zIndex: 30 }}>
                {lists.length === 0 ? (
                  <p style={{ padding: "10px 14px", fontSize: 13, color: "var(--stone)" }}>No lists yet</p>
                ) : lists.map((l) => (
                  <button key={l.id} onClick={() => bulkAddToList(l.id)}
                    style={{ display: "block", width: "100%", textAlign: "left", padding: "10px 14px", fontSize: 13, fontWeight: 500, color: "var(--graphite)", background: "transparent", border: 0, cursor: "pointer", borderBottom: "1px solid var(--cloud-2)" }}
                    className="hover:bg-cloud transition-colors">
                    {l.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Set status */}
          <div style={{ position: "relative" }}>
            <button onClick={() => setBulkAction(bulkAction === "status" ? null : "status")}
              className="btn sm" style={{ background: "#1F2330", color: "white", borderColor: "#2A2D36" }}>
              Set status
            </button>
            {bulkAction === "status" && (
              <div style={{ position: "absolute", right: 0, bottom: "calc(100% + 6px)", background: "var(--paper)", border: "1px solid var(--mist)", borderRadius: 10, boxShadow: "0 4px 16px rgba(10,11,16,0.12)", overflow: "hidden", zIndex: 30 }}>
                {[
                  { value: "not_contacted", label: "Not contacted" },
                  { value: "dm_sent",       label: "DM sent" },
                  { value: "rejected",      label: "Rejected" },
                ].map(({ value, label }) => (
                  <button key={value} onClick={() => bulkSetStatus(value)}
                    style={{ display: "block", width: "100%", textAlign: "left", padding: "10px 14px", fontSize: 13, fontWeight: 500, color: "var(--graphite)", background: "transparent", border: 0, cursor: "pointer", borderBottom: "1px solid var(--cloud-2)", whiteSpace: "nowrap" }}
                    className="hover:bg-cloud transition-colors">
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Move to pipeline */}
          <button onClick={() => setBulkPipelineOpen(true)}
            className="btn sm" style={{ background: "#1F2330", color: "white", borderColor: "#2A2D36", display: "inline-flex", alignItems: "center", gap: 6 }}>
            <ArrowRight size={13} /> Move to pipeline
          </button>

          <button onClick={() => setSelectedIds(new Set())}
            style={{ background: "transparent", border: 0, color: "#A6AAB4", cursor: "pointer", fontSize: 12, fontWeight: 500, display: "inline-flex", alignItems: "center", gap: 4 }}>
            <X size={12} /> Clear
          </button>
        </div>
      )}

      {/* Table */}
      <div style={{ background: "var(--paper)", border: "1px solid var(--mist)", borderRadius: 12, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr className="t-head">
              <th style={{ width: 36, paddingLeft: 16 }}>
                <input type="checkbox"
                  checked={contacts.length > 0 && selectedIds.size === contacts.length}
                  ref={(el) => { if (el) el.indeterminate = selectedIds.size > 0 && selectedIds.size < contacts.length; }}
                  onChange={toggleSelectAll}
                  style={{ cursor: "pointer", accentColor: "var(--brand)", width: 14, height: 14 }}
                />
              </th>
              <th>Contact</th>
              <th>POC Username</th>
              <th>Group</th>
              <th>Tier</th>
              <th>Tags</th>
              <th>Status</th>
              <th style={{ width: 80 }} />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={colCount} style={{ textAlign: "center", padding: "40px 0", color: "var(--stone)", fontSize: 13 }}>Loading…</td></tr>
            ) : contacts.length === 0 ? (
              <tr><td colSpan={colCount} style={{ textAlign: "center", padding: "40px 0", color: "var(--stone)", fontSize: 13 }}>No contacts found.</td></tr>
            ) : contacts.map((c) => {
              const primary = c.companyName || c.name;
              const sub     = c.companyName ? c.name : null;
              const sc      = STATUS_CHIP[c.status] ?? STATUS_CHIP.not_contacted;
              return (
                <tr key={c.id} className={`t-row${selectedIds.has(c.id) ? " sel" : ""}`}>
                  <td style={{ paddingLeft: 16, width: 36 }}>
                    <input type="checkbox" checked={selectedIds.has(c.id)} onChange={() => toggleSelect(c.id)}
                      style={{ cursor: "pointer", accentColor: "var(--brand)", width: 14, height: 14 }} />
                  </td>
                  <td>
                    <div className="flex items-center gap-2.5">
                      <ContactAvatar logoUrl={c.logoUrl} name={primary} size="sm" />
                      <div>
                        <Link href={`/contacts/${c.id}`}
                          style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)", textDecoration: "none" }}
                          className="hover:text-indigo-600 transition-colors">
                          {primary}
                        </Link>
                        {sub && <div style={{ fontSize: 11, color: "var(--fog)", marginTop: 2 }}>{sub}</div>}
                      </div>
                    </div>
                  </td>
                  <td>
                    <span style={{ fontSize: 12, color: "var(--slate)", fontFamily: "var(--font-mono)", display: "inline-flex", alignItems: "center", gap: 4 }}>
                      {c.pocUsername || c.telegramUsername || <span style={{ color: "var(--mist)" }}>—</span>}
                    </span>
                  </td>
                  <td>
                    {c.groupLink ? (
                      <a href={c.groupLink} target="_blank" rel="noopener noreferrer"
                        style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, color: "var(--brand)", fontWeight: 500, textDecoration: "none" }}>
                        Open <ExternalLink size={11} />
                      </a>
                    ) : <span style={{ color: "var(--mist)" }}>—</span>}
                  </td>
                  <td>
                    {c.tier
                      ? <span className="chip violet">{c.tier.label}</span>
                      : <span style={{ color: "var(--mist)" }}>—</span>}
                  </td>
                  <td>
                    <div className="flex flex-wrap gap-1">
                      {c.contactTags.length === 0
                        ? <span style={{ color: "var(--mist)" }}>—</span>
                        : c.contactTags.map(({ tag }) => <span key={tag.id} className="chip">{tag.name}</span>)}
                    </div>
                  </td>
                  <td>
                    {c.status === "in_pipeline" ? (
                      <span className={sc.cls + " dot"}>{sc.label}</span>
                    ) : (
                      <select value={c.status} onChange={(e) => updateStatus(c.id, e.target.value)}
                        style={{ background: "transparent", border: 0, outline: 0, cursor: "pointer", fontFamily: "inherit" }}
                        className={sc.cls + " dot"}>
                        <option value="not_contacted">Not contacted</option>
                        <option value="dm_sent">DM sent</option>
                        <option value="rejected">Rejected</option>
                      </select>
                    )}
                  </td>
                  <td>
                    <div className="flex items-center gap-0.5 justify-end">
                      <button onClick={() => openEdit(c)} title="Edit" className="btn ghost icon sm">
                        <Pencil size={13} />
                      </button>
                      {c.status !== "in_pipeline" && (
                        <button onClick={() => openMoveToPipeline(c)} title="Move to Pipeline" className="btn ghost icon sm" style={{ color: "var(--brand)" }}>
                          <ArrowRight size={13} />
                        </button>
                      )}
                      <button onClick={() => deleteContact(c.id)} title="Delete" className="btn ghost icon sm" style={{ color: "var(--rose)" }}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div style={{ padding: "10px 14px", display: "flex", alignItems: "center", borderTop: "1px solid var(--cloud-2)", background: "var(--cloud)" }}>
          <span style={{ fontSize: 12, color: "var(--stone)" }}>Showing {contacts.length} contact{contacts.length !== 1 ? "s" : ""}</span>
        </div>
      </div>

      <ContactFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={() => fetchContacts(true)}
        initial={editing ?? undefined}
      />

      <MoveToPipelineModal
        open={!!pipelineContact}
        onClose={() => setPipelineContact(null)}
        contact={pipelineContact}
        onMoved={() => { fetchContacts(true); setPipelineContact(null); }}
      />

      <BulkMoveToPipelineModal
        open={bulkPipelineOpen}
        onClose={() => setBulkPipelineOpen(false)}
        contacts={contacts.filter((c) => selectedIds.has(c.id))}
        onMoved={() => { fetchContacts(true); setSelectedIds(new Set()); setBulkPipelineOpen(false); }}
      />
    </div>
  );
}
