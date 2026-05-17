"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  pointerWithin,
  useDraggable,
  useDroppable,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Trash2, Plus, CalendarDays, Link2, GripVertical, X, File } from "lucide-react";
import Badge from "@/components/ui/Badge";
import ContactAvatar from "@/components/ui/ContactAvatar";
import DealModal from "@/components/pipeline/DealModal";
import DealDetailPanel from "@/components/pipeline/DealDetailPanel";
import { cacheGet, cacheSet, cacheInvalidate } from "@/lib/cache";

interface Attachment { name: string; type: string; size: number; data: string }
interface Tag { id: string; name: string; color: string }
interface Tier { id: string; label: string }
interface Stage { id: string; name: string; color: string; order: number }
interface Contact {
  id: string; name: string; companyName: string | null;
  pocUsername: string | null; logoUrl: string | null;
  telegramUsername: string | null; twitterHandle: string | null;
  email: string | null; tier: Tier | null; contactTags: { tag: Tag }[];
}
interface Deal {
  id: string; notes: string | null; description: string | null;
  latestStatus: string | null; callDate: string | null;
  meetLink: string | null; stageId: string | null;
  contact: Contact; stage: Stage | null;
  owner: { id: string; name: string } | null;
}

function DealCard({ deal, onDelete, onOpen, isActive, isSelected, onSelect }: {
  deal: Deal; onDelete: (id: string) => void;
  onOpen: (id: string) => void; isActive?: boolean;
  isSelected?: boolean; onSelect?: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id: deal.id });

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      onClick={() => onOpen(deal.id)}
      style={{
        transform: transform ? CSS.Translate.toString(transform) : undefined,
        background: isSelected ? "var(--brand-wash)" : "var(--paper)",
        border: isSelected ? "1px solid var(--brand)" : "1px solid var(--mist)",
        borderRadius: 8, padding: "12px 12px 12px 8px",
        display: "flex", flexDirection: "column", gap: 8,
        cursor: "pointer", userSelect: "none", position: "relative",
        transition: "border-color 0.15s, box-shadow 0.15s, background 0.15s",
        opacity: isActive ? 0.4 : 1,
      }}
      className="deal-card-hover group"
    >
      {/* Checkbox — top-right, only visible on hover or when selected */}
      {onSelect && (
        <div style={{ position: "absolute", top: 8, right: 8 }} onClick={(e) => e.stopPropagation()}>
          <input type="checkbox" checked={isSelected} onChange={() => onSelect(deal.id)}
            style={{ cursor: "pointer", accentColor: "var(--brand)", width: 13, height: 13 }}
            className={isSelected ? "" : "opacity-0 group-hover:opacity-100"} />
        </div>
      )}

      {/* Row: grip handle | avatar | name */}
      <div className="flex items-start gap-2">
        {/* Drag grip — left side, always visible on hover */}
        <span
          {...listeners}
          onClick={(e) => e.stopPropagation()}
          style={{ color: "var(--fog)", cursor: "grab", flexShrink: 0, paddingTop: 3, marginLeft: -2 }}
          className="opacity-0 group-hover:opacity-100 active:cursor-grabbing transition-opacity"
        >
          <GripVertical size={14} />
        </span>
        <ContactAvatar
          logoUrl={deal.contact.logoUrl}
          name={deal.contact.companyName || deal.contact.name}
          size="sm"
        />
        <div className="flex-1 min-w-0" style={{ paddingRight: onSelect ? 16 : 0 }}>
          <p className="truncate text-[13px] font-semibold" style={{ color: "var(--ink)" }}>
            {deal.contact.companyName || deal.contact.name}
          </p>
          {deal.contact.companyName && (
            <p className="truncate text-[11px]" style={{ color: "var(--fog)", marginTop: 2 }}>{deal.contact.name}</p>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-1">
        {deal.contact.tier && (
          <span className="chip violet">{deal.contact.tier.label}</span>
        )}
        {deal.contact.contactTags.map(({ tag }) => (
          <span key={tag.id} className="chip">{tag.name}</span>
        ))}
      </div>

      {/* Owner chip */}
      {deal.owner && (
        <div style={{ display: "inline-flex", alignItems: "center", gap: 5, height: 22, padding: "0 8px", borderRadius: 999, background: "var(--amber-wash)", border: "1px solid rgba(176,122,0,0.18)", width: "fit-content" }}>
          <div style={{ width: 14, height: 14, borderRadius: 999, background: "var(--amber)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8, fontWeight: 700, color: "white", flexShrink: 0 }}>
            {deal.owner.name[0].toUpperCase()}
          </div>
          <span style={{ fontSize: 11, fontWeight: 600, color: "#6E4D00" }}>{deal.owner.name}</span>
        </div>
      )}

      {deal.latestStatus && (
        <div style={{ background: "var(--brand-wash)", borderRadius: 6, padding: "6px 8px", fontSize: 12, fontWeight: 500, color: "var(--brand-deep)" }}>
          {deal.latestStatus}
        </div>
      )}

      {deal.description && (
        <p className="line-clamp-2 text-[12px]" style={{ color: "var(--slate)" }}>{deal.description}</p>
      )}

      <div className="mt-2 flex flex-wrap gap-2">
        {deal.callDate && (
          <span className="flex items-center gap-1" style={{ fontSize: 11, color: "var(--brand)", fontFamily: "var(--font-mono)" }}>
            <CalendarDays size={11} />
            {new Date(deal.callDate).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
          </span>
        )}
        {deal.meetLink && (
          <a
            href={deal.meetLink}
            target="_blank"
            rel="noopener noreferrer"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-1 text-xs text-indigo-600 hover:underline"
          >
            <Link2 size={11} /> Meet
          </a>
        )}
      </div>
    </div>
  );
}

function KanbanColumn({ stage, deals, onDelete, onOpen, onAddDeal, activeDealId, selectedIds, onSelect, dealsLoading }: {
  stage: Stage; deals: Deal[]; onDelete: (id: string) => void;
  onOpen: (id: string) => void; onAddDeal: (stageId: string) => void;
  activeDealId: string | null; selectedIds: Set<string>; onSelect: (id: string) => void;
  dealsLoading: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `column-${stage.id}` });

  return (
    <div style={{ width: 280, flexShrink: 0, display: "flex", flexDirection: "column" }}>
      {/* Column header with colored top border */}
      <div style={{
        display: "flex", alignItems: "center", gap: 8,
        padding: "10px 12px",
        background: "var(--paper)",
        border: "1px solid var(--mist)",
        borderTop: `2px solid ${stage.color}`,
        borderRadius: "8px 8px 0 0",
        borderBottom: 0,
      }}>
        <span style={{ width: 8, height: 8, borderRadius: 999, background: stage.color, flexShrink: 0 }} />
        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)", flex: 1 }}>{stage.name}</span>
        <span style={{ fontSize: 11, fontWeight: 600, color: "var(--stone)", background: "var(--cloud)", borderRadius: 4, padding: "2px 6px", fontFamily: "var(--font-mono)" }}>
          {deals.length}
        </span>
        <button onClick={() => onAddDeal(stage.id)}
          style={{ background: "transparent", border: 0, cursor: "pointer", color: "var(--stone)", display: "inline-flex", alignItems: "center", justifyContent: "center", width: 24, height: 24, borderRadius: 6 }}
          className="hover:bg-cloud transition-colors">
          <Plus size={13} />
        </button>
      </div>

      <div
        ref={setNodeRef}
        style={{
          flex: 1, minHeight: 80,
          background: isOver ? "var(--brand-wash)" : "var(--cloud)",
          border: "1px solid var(--mist)", borderTop: 0,
          borderRadius: "0 0 8px 8px",
          padding: 8, display: "flex", flexDirection: "column", gap: 8,
          transition: "background 0.15s",
        }}
      >
        {deals.map((deal) => (
          <DealCard
            key={deal.id}
            deal={deal}
            onDelete={onDelete}
            onOpen={onOpen}
            isActive={activeDealId === deal.id}
            isSelected={selectedIds.has(deal.id)}
            onSelect={onSelect}
          />
        ))}
        {dealsLoading && deals.length === 0 ? (
          <>
            <div className="animate-pulse" style={{ height: 72, borderRadius: 8, background: "var(--cloud-2)" }} />
            <div className="animate-pulse" style={{ height: 52, borderRadius: 8, background: "var(--cloud-2)" }} />
          </>
        ) : deals.length === 0 ? (
          <div style={{
            flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
            border: `1px dashed ${isOver ? "var(--brand)" : "var(--mist)"}`,
            borderRadius: 8, padding: "24px 0",
            fontSize: 11, fontWeight: 500,
            color: isOver ? "var(--brand)" : "var(--fog)",
            background: isOver ? "rgba(9,83,255,0.04)" : "transparent",
            transition: "all 0.15s",
          }}>
            Drop here
          </div>
        ) : null}
      </div>
    </div>
  );
}

function PipelinePage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [stages, setStages] = useState<Stage[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [allContacts, setAllContacts] = useState<{ id: string; name: string; companyName: string | null; logoUrl: string | null }[]>([]);
  const [loading, setLoading] = useState(true);       // gates on stages only
  const [dealsLoading, setDealsLoading] = useState(true);
  const [activeDeal, setActiveDeal] = useState<Deal | null>(null);
  const contactsLoadedRef = useRef(false);

  const [addModalOpen,    setAddModalOpen]    = useState(false);
  const [defaultStageId,  setDefaultStageId]  = useState<string | undefined>();
  const [selectedDealIds, setSelectedDealIds] = useState<Set<string>>(new Set());
  const [bulkStageId,     setBulkStageId]     = useState("");

  const [detailDealId, setDetailDealId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailPreview, setDetailPreview] = useState<Deal | null>(null);
  const [lightboxAtt, setLightboxAtt] = useState<Attachment | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  );

  // Refetch only deals (used after mutations — stages never change on deal ops)
  const refreshDeals = useCallback(async () => {
    cacheInvalidate("pipeline-deals", "dashboard");
    const data: Deal[] = await fetch("/api/deals").then((r) => r.json());
    cacheSet("pipeline-deals", data);
    setDeals(data);
  }, []);

  // Initial load: stages gate the board render; deals load in background
  useEffect(() => {
    const cachedStages = cacheGet<Stage[]>("pipeline-stages", 300_000); // 5 min TTL
    const cachedDeals  = cacheGet<Deal[]>("pipeline-deals");

    if (cachedStages) { setStages(cachedStages); setLoading(false); }
    if (cachedDeals)  { setDeals(cachedDeals);   setDealsLoading(false); }

    // Always refresh stages (tiny payload, fast)
    fetch("/api/pipeline-stages")
      .then((r) => r.json())
      .then((data: Stage[]) => {
        cacheSet("pipeline-stages", data);
        setStages(data);
        setLoading(false);
      });

    // Load deals in parallel — they populate columns in the background
    fetch("/api/deals")
      .then((r) => r.json())
      .then((data: Deal[]) => {
        cacheSet("pipeline-deals", data);
        setDeals(data);
        setDealsLoading(false);
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-open deal panel from URL param (e.g. "View in Pipeline" from Tasks)
  useEffect(() => {
    const openDealId = searchParams.get("openDeal");
    if (!openDealId || dealsLoading) return;
    setDetailDealId(openDealId);
    setDetailOpen(true);
    router.replace("/pipeline", { scroll: false });
  }, [dealsLoading, searchParams]); // eslint-disable-line react-hooks/exhaustive-deps

  const openDetail = (id: string) => {
    setDetailDealId(id);
    setDetailPreview(deals.find((d) => d.id === id) ?? null);
    setDetailOpen(true);
  };

  const openAddDeal = (stageId: string) => {
    setDefaultStageId(stageId);
    setAddModalOpen(true);
    // Lazy-load contacts — only needed for the modal, not for the board
    if (contactsLoadedRef.current) return;
    contactsLoadedRef.current = true;
    const cached = cacheGet<typeof allContacts>("contacts-slim", 120_000);
    if (cached) { setAllContacts(cached); return; }
    fetch("/api/contacts")
      .then((r) => r.json())
      .then((data: any[]) => {
        const slim = data.map((c) => ({ id: c.id, name: c.name, companyName: c.companyName ?? null, logoUrl: c.logoUrl ?? null }));
        cacheSet("contacts-slim", slim);
        setAllContacts(slim);
      });
  };

  const deleteDeal = async (id: string) => {
    if (!confirm("Delete this deal?")) return;
    setDeals((prev) => prev.filter((d) => d.id !== id));
    await fetch(`/api/deals/${id}`, { method: "DELETE" });
    refreshDeals();
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDeal(null);
    if (!over) return;

    const draggedDeal = deals.find((d) => d.id === active.id);
    if (!draggedDeal) return;

    const overId = String(over.id);
    if (!overId.startsWith("column-")) return;

    const targetStageId = overId.replace("column-", "");
    if (targetStageId === draggedDeal.stageId) return;

    setDeals((prev) =>
      prev.map((d) =>
        d.id === draggedDeal.id
          ? { ...d, stageId: targetStageId, stage: stages.find((s) => s.id === targetStageId) ?? null }
          : d
      )
    );

    await fetch(`/api/deals/${draggedDeal.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stageId: targetStageId }),
    });
  };

  const toggleSelectDeal = (id: string) =>
    setSelectedDealIds((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const bulkMoveToStage = async () => {
    if (!bulkStageId || selectedDealIds.size === 0) return;
    setDeals((prev) => prev.map((d) =>
      selectedDealIds.has(d.id) ? { ...d, stageId: bulkStageId, stage: stages.find((s) => s.id === bulkStageId) ?? null } : d
    ));
    await Promise.all([...selectedDealIds].map((id) =>
      fetch(`/api/deals/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ stageId: bulkStageId }) })
    ));
    setSelectedDealIds(new Set());
    setBulkStageId("");
  };

  const dealsByStage = (stageId: string) => deals.filter((d) => d.stageId === stageId);

  if (loading) {
    return <div className="flex h-64 items-center justify-center text-sm text-zinc-400">Loading pipeline…</div>;
  }

  return (
    <div className="flex h-full flex-col">
      <div className="mb-5 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 style={{ fontFamily: "'Inter Tight', sans-serif", fontSize: 28, fontWeight: 600, letterSpacing: "-0.02em", color: "var(--ink)", margin: 0 }}>
              Pipeline
            </h1>
            <span className="chip chip-lg">{deals.length} active</span>
          </div>
          <p style={{ fontSize: 14, color: "var(--stone)", marginTop: 6, fontWeight: 500 }}>
            Click a card to open · drag the grip icon to move between stages
          </p>
        </div>
        <a href="/outreach" className="btn secondary">Add contacts via Outreach →</a>
      </div>

      {/* Bulk action bar */}
      {selectedDealIds.size > 0 && (
        <div style={{ background: "var(--ink)", borderRadius: 12, padding: "10px 16px", display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
          <span style={{ fontSize: 11, fontWeight: 700, background: "#1F2330", color: "white", borderRadius: 4, padding: "2px 8px" }}>
            {selectedDealIds.size} selected
          </span>
          <span style={{ fontSize: 12, color: "#A6AAB4" }}>Move to stage:</span>
          <select value={bulkStageId} onChange={(e) => setBulkStageId(e.target.value)}
            style={{ height: 28, padding: "0 10px", background: "#1F2330", color: "white", border: "1px solid #2A2D36", borderRadius: 999, fontSize: 12, fontWeight: 500, outline: "none", cursor: "pointer" }}>
            <option value="">Select stage…</option>
            {stages.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <button onClick={bulkMoveToStage} disabled={!bulkStageId} className="btn brand sm">Move</button>
          <div style={{ flex: 1 }} />
          <button onClick={() => { setSelectedDealIds(new Set()); setBulkStageId(""); }}
            className="btn ghost sm" style={{ color: "#A6AAB4" }}>✕ Clear</button>
        </div>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={pointerWithin}
        onDragStart={({ active }) => setActiveDeal(deals.find((d) => d.id === active.id) ?? null)}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setActiveDeal(null)}
      >
        <div className="flex gap-4 overflow-x-auto pb-4">
          {stages.map((stage) => (
            <KanbanColumn
              key={stage.id}
              stage={stage}
              deals={dealsByStage(stage.id)}
              onDelete={deleteDeal}
              onOpen={openDetail}
              onAddDeal={openAddDeal}
              activeDealId={activeDeal?.id ?? null}
              selectedIds={selectedDealIds}
              onSelect={toggleSelectDeal}
              dealsLoading={dealsLoading}
            />
          ))}
        </div>

        <DragOverlay>
          {activeDeal && (
            <div className="rotate-1 rounded-lg border border-zinc-200 bg-white p-3 shadow-xl opacity-90 w-[280px]">
              <p className="text-sm font-medium text-zinc-900">{activeDeal.contact.companyName || activeDeal.contact.name}</p>
              {activeDeal.latestStatus && (
                <p className="mt-1 text-xs text-indigo-600">{activeDeal.latestStatus}</p>
              )}
            </div>
          )}
        </DragOverlay>
      </DndContext>

      <DealModal
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onSaved={refreshDeals}
        deal={null}
        stages={stages}
        defaultStageId={defaultStageId}
        contacts={allContacts}
      />

      <DealDetailPanel
        dealId={detailDealId}
        open={detailOpen}
        previewDeal={detailPreview ?? undefined}
        onClose={() => { setDetailOpen(false); setDetailPreview(null); }}
        onUpdated={refreshDeals}
        onRemoved={refreshDeals}
        onOpenLightbox={(att) => { setLightboxAtt(att); setDetailOpen(false); }}
      />

      {/* Lightbox — rendered at page root so it's outside the SlideOver portal */}
      {lightboxAtt && (
        <div
          style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(10,11,16,0.92)", display: "flex", alignItems: "center", justifyContent: "center" }}
          onClick={() => { setLightboxAtt(null); setDetailOpen(true); }}>
          <button
            onClick={(e) => { e.stopPropagation(); setLightboxAtt(null); setDetailOpen(true); }}
            style={{ position: "fixed", top: 20, right: 20, width: 36, height: 36, borderRadius: 999, background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.2)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "white", backdropFilter: "blur(8px)" }}>
            <X size={16} />
          </button>
          <div style={{ position: "relative", maxWidth: "90vw", maxHeight: "90vh" }} onClick={(e) => e.stopPropagation()}>
            {lightboxAtt.type.startsWith("image/") ? (
              <img src={lightboxAtt.data} alt={lightboxAtt.name}
                style={{ maxWidth: "90vw", maxHeight: "90vh", borderRadius: 12, objectFit: "contain", display: "block", boxShadow: "0 24px 80px rgba(0,0,0,0.6)" }} />
            ) : (
              <div style={{ background: "var(--paper)", borderRadius: 16, padding: 40, textAlign: "center", minWidth: 300 }}>
                <File size={48} color="var(--brand)" style={{ margin: "0 auto 16px" }} />
                <p style={{ fontSize: 16, fontWeight: 600, color: "var(--ink)", margin: "0 0 6px" }}>{lightboxAtt.name}</p>
                <p style={{ fontSize: 13, color: "var(--stone)", margin: "0 0 24px" }}>{(lightboxAtt.size / 1024).toFixed(1)} KB</p>
                <a href={lightboxAtt.data} download={lightboxAtt.name} className="btn brand">Download</a>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function PipelinePageWrapper() {
  return (
    <Suspense>
      <PipelinePage />
    </Suspense>
  );
}
