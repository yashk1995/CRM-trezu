"use client";

import { useCallback, useEffect, useState } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Trash2, Plus, CalendarDays, Link2 } from "lucide-react";
import Badge from "@/components/ui/Badge";
import DealModal from "@/components/pipeline/DealModal";
import DealDetailPanel from "@/components/pipeline/DealDetailPanel";

interface Tag { id: string; name: string; color: string }
interface Tier { id: string; label: string }
interface Stage { id: string; name: string; color: string; order: number }
interface Contact {
  id: string; name: string; telegramUsername: string | null;
  twitterHandle: string | null; email: string | null;
  tier: Tier | null; contactTags: { tag: Tag }[];
}
interface Deal {
  id: string; notes: string | null; description: string | null;
  latestStatus: string | null; callDate: string | null;
  meetLink: string | null; stageId: string | null;
  contact: Contact; stage: Stage | null;
}

function DealCard({ deal, onDelete, onOpen, isDragging }: {
  deal: Deal; onDelete: (id: string) => void;
  onOpen: (id: string) => void; isDragging?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: deal.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => onOpen(deal.id)}
      className="rounded-lg border border-zinc-200 bg-white p-3 shadow-sm cursor-pointer select-none hover:border-indigo-300 hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-zinc-900">{deal.contact.name}</p>
          {deal.contact.telegramUsername && (
            <p className="truncate text-xs text-zinc-400">{deal.contact.telegramUsername}</p>
          )}
        </div>
        <button
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); onDelete(deal.id); }}
          className="shrink-0 rounded p-1 text-zinc-400 hover:bg-red-50 hover:text-red-500"
        >
          <Trash2 size={12} />
        </button>
      </div>

      <div className="mt-1.5 flex flex-wrap gap-1">
        {deal.contact.tier && (
          <Badge label={deal.contact.tier.label} className="bg-violet-100 text-violet-700" />
        )}
        {deal.contact.contactTags.map(({ tag }) => (
          <Badge key={tag.id} label={tag.name} className="bg-zinc-100 text-zinc-500" />
        ))}
      </div>

      {deal.latestStatus && (
        <div className="mt-2 rounded-md bg-indigo-50 px-2 py-1">
          <p className="text-xs font-medium text-indigo-700">{deal.latestStatus}</p>
        </div>
      )}

      {deal.description && (
        <p className="mt-2 line-clamp-2 text-xs text-zinc-500">{deal.description}</p>
      )}

      <div className="mt-2 flex flex-wrap gap-2">
        {deal.callDate && (
          <span className="flex items-center gap-1 text-xs text-indigo-600">
            <CalendarDays size={11} />
            {new Date(deal.callDate).toLocaleDateString()}
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

function KanbanColumn({ stage, deals, onDelete, onOpen, onAddDeal, activeDealId }: {
  stage: Stage; deals: Deal[]; onDelete: (id: string) => void;
  onOpen: (id: string) => void; onAddDeal: (stageId: string) => void;
  activeDealId: string | null;
}) {
  return (
    <div className="flex min-w-[280px] max-w-[280px] flex-col rounded-lg border border-zinc-200 bg-zinc-50">
      <div className="flex items-center justify-between px-3 py-2.5">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: stage.color }} />
          <span className="text-sm font-medium text-zinc-700">{stage.name}</span>
          <span className="rounded-full bg-zinc-200 px-1.5 py-0.5 text-xs text-zinc-500">{deals.length}</span>
        </div>
        <button
          onClick={() => onAddDeal(stage.id)}
          className="rounded p-1 text-zinc-400 hover:bg-zinc-200 hover:text-zinc-600"
        >
          <Plus size={14} />
        </button>
      </div>

      <SortableContext items={deals.map((d) => d.id)} strategy={verticalListSortingStrategy}>
        <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-2" style={{ minHeight: 80 }}>
          {deals.map((deal) => (
            <DealCard
              key={deal.id}
              deal={deal}
              onDelete={onDelete}
              onOpen={onOpen}
              isDragging={activeDealId === deal.id}
            />
          ))}
          {deals.length === 0 && (
            <div className="flex flex-1 items-center justify-center rounded-md border border-dashed border-zinc-300 py-6 text-xs text-zinc-400">
              Drop here
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  );
}

export default function PipelinePage() {
  const [stages, setStages] = useState<Stage[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [pipelineContacts, setPipelineContacts] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeDeal, setActiveDeal] = useState<Deal | null>(null);

  // Add deal modal
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [defaultStageId, setDefaultStageId] = useState<string | undefined>();

  // Detail panel
  const [detailDealId, setDetailDealId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // Click-and-hold: 200ms delay before drag activates
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  );

  const fetchAll = useCallback(async () => {
    const [stagesRes, dealsRes, contactsRes] = await Promise.all([
      fetch("/api/pipeline-stages").then((r) => r.json()),
      fetch("/api/deals").then((r) => r.json()),
      fetch("/api/contacts?section=pipeline").then((r) => r.json()),
    ]);
    setStages(stagesRes);
    setDeals(dealsRes);
    setPipelineContacts(contactsRes.map((c: any) => ({ id: c.id, name: c.name })));
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const openDetail = (id: string) => {
    setDetailDealId(id);
    setDetailOpen(true);
  };

  const openAddDeal = (stageId: string) => {
    setDefaultStageId(stageId);
    setAddModalOpen(true);
  };

  const deleteDeal = async (id: string) => {
    if (!confirm("Delete this deal?")) return;
    await fetch(`/api/deals/${id}`, { method: "DELETE" });
    fetchAll();
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDeal(null);
    if (!over || active.id === over.id) return;

    const draggedDeal = deals.find((d) => d.id === active.id);
    if (!draggedDeal) return;

    const overId = String(over.id);
    let targetStageId: string | null = null;

    if (overId.startsWith("column-")) {
      targetStageId = overId.replace("column-", "");
    } else {
      const overDeal = deals.find((d) => d.id === overId);
      targetStageId = overDeal?.stageId ?? null;
    }

    if (!targetStageId || targetStageId === draggedDeal.stageId) return;

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

  const dealsByStage = (stageId: string) => deals.filter((d) => d.stageId === stageId);

  if (loading) {
    return <div className="flex h-64 items-center justify-center text-sm text-zinc-400">Loading pipeline…</div>;
  }

  return (
    <div className="flex h-full flex-col">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Pipeline</h1>
          <p className="mt-0.5 text-sm text-zinc-500">{deals.length} deal{deals.length !== 1 ? "s" : ""} · click card to open · hold to drag</p>
        </div>
        <button
          onClick={() => { setDefaultStageId(stages[0]?.id); setAddModalOpen(true); }}
          className="inline-flex items-center gap-1.5 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          <Plus size={15} /> Add Deal
        </button>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
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
            />
          ))}
        </div>

        <DragOverlay>
          {activeDeal && (
            <div className="rotate-1 rounded-lg border border-zinc-200 bg-white p-3 shadow-xl opacity-90 w-[280px]">
              <p className="text-sm font-medium text-zinc-900">{activeDeal.contact.name}</p>
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
        onSaved={fetchAll}
        deal={null}
        stages={stages}
        defaultStageId={defaultStageId}
        contacts={pipelineContacts}
      />

      <DealDetailPanel
        dealId={detailDealId}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        onUpdated={fetchAll}
      />
    </div>
  );
}
