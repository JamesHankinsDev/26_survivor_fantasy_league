"use client";

import { useEffect, useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  pointerWithin,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import type { TribeMember } from "@/types/league";
import type { Castaway } from "@/types/castaway";
import { isNetRosterChangeAllowed, getLatestLockedRoster } from "@/utils/scoring";
import { castawayEventBreakdown } from "@/utils/castawayEvents";
import TradingCard from "./TradingCard";
import EmptyCardSlot from "./EmptyCardSlot";
import CardDetail from "./CardDetail";

const MAX_ROSTER = 5;
const RESET_SENTINEL = "__RESET_TO_PRIOR_WEEK__";

export interface AddDropDraftProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (dropId: string | null, addId: string | null) => Promise<void>;
  tribeMember: TribeMember;
  allCastaways: Castaway[];
  eliminatedCastawayIds: string[];
  seasonStartDate: Date;
  castawaySeasonScores?: Record<string, number>;
  addDropRestrictionEnabled: boolean;
  /** Season number driving the flip-side stat breakdown. */
  seasonNumber?: number;
}

type Zone = "roster" | "available" | "drop";

function nextWednesday8pmET(): Date {
  const nowET = new Date(new Date().toLocaleString("en-US", { timeZone: "America/New_York" }));
  const daysUntilWed = (3 - nowET.getDay() + 7) % 7 || 7;
  const next = new Date(nowET);
  next.setDate(next.getDate() + daysUntilWed);
  next.setHours(20, 0, 0, 0);
  if (nowET.getDay() === 3 && nowET.getHours() >= 20) next.setDate(next.getDate() + 7);
  return next;
}

function DraggableCard({
  castaway,
  zone,
  score,
  picked,
  dropping,
  actionTag,
  disabled,
  onTap,
  size = "mini",
}: {
  castaway: Castaway;
  zone: Zone;
  score: number;
  picked?: boolean;
  dropping?: boolean;
  actionTag?: string;
  disabled?: boolean;
  onTap: () => void;
  size?: "mini" | "sm";
}) {
  const { listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: castaway.id,
    data: { zone },
    disabled,
  });
  const card: Castaway = { ...castaway, totalPoints: score };
  return (
    <div
      ref={setNodeRef}
      className={`sfl-pack-cardwrap${isDragging ? " dragging" : ""}${disabled ? " is-disabled" : ""}`}
      style={{ transform: CSS.Translate.toString(transform), touchAction: "none" }}
      {...(disabled ? {} : listeners)}
    >
      <TradingCard
        castaway={card}
        size={size}
        picked={picked}
        dropping={dropping}
        actionTag={actionTag}
        onClick={onTap}
      />
    </div>
  );
}

function DropZone({ id, className, children }: { id: Zone; className: string; children: React.ReactNode }) {
  const { isOver, setNodeRef } = useDroppable({ id });
  return (
    <div ref={setNodeRef} className={`${className}${isOver ? " over" : ""}`}>
      {children}
    </div>
  );
}

/**
 * AddDropDraft — the weekly add/drop as a card drag-drop, matching the season
 * pack: drag (or flick, or tap) a tribe card into the **Drop** pile, and drag a
 * castaway up from **Available** into your tribe to draw a replacement. Drag
 * cards back out to undo. Confirm before the Wednesday lock.
 *
 * Preserves the existing rules: one net change per week when restricted (only
 * the newly-added castaway is droppable), no dropping eliminated castaways, a
 * max tribe of five, and reset-to-last-week.
 */
export default function AddDropDraft({
  open,
  onClose,
  onSubmit,
  tribeMember,
  allCastaways,
  eliminatedCastawayIds,
  seasonStartDate,
  castawaySeasonScores = {},
  addDropRestrictionEnabled,
  seasonNumber = 0,
}: AddDropDraftProps) {
  const [dropId, setDropId] = useState<string | null>(null);
  const [addId, setAddId] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 140, tolerance: 8 } }),
  );

  useEffect(() => {
    if (!open) {
      setDropId(null);
      setAddId(null);
      setActiveId(null);
      setDetailId(null);
      setError("");
      setLoading(false);
    }
  }, [open]);

  const byId = useMemo(() => {
    const m = new Map<string, Castaway>();
    for (const c of allCastaways) m.set(c.id, c);
    return m;
  }, [allCastaways]);
  const scoreOf = (id: string) => castawaySeasonScores[id] ?? byId.get(id)?.totalPoints ?? 0;

  const currentRoster = tribeMember.roster || [];
  const latestLockedRoster = getLatestLockedRoster(tribeMember.weeklyRosters || []);
  const eliminatedSet = useMemo(() => new Set(eliminatedCastawayIds), [eliminatedCastawayIds]);

  // ── Net-change restriction (mirrors AddDropModal) ──
  let netChangeExceeded = false;
  let onlyDroppableId: string | null = null;
  if (
    addDropRestrictionEnabled &&
    latestLockedRoster.length > 0 &&
    !isNetRosterChangeAllowed(latestLockedRoster, currentRoster)
  ) {
    netChangeExceeded = true;
    const newIds = currentRoster.filter((id) => !latestLockedRoster.includes(id));
    onlyDroppableId = newIds.length === 1 ? newIds[0] : null;
  }

  let droppable = currentRoster.filter((id) => !eliminatedSet.has(id));
  if (netChangeExceeded && onlyDroppableId) droppable = droppable.filter((id) => id === onlyDroppableId);
  const droppableSet = new Set(droppable);
  const canAdd = !netChangeExceeded && (currentRoster.length < MAX_ROSTER || !!dropId);

  const proposed = useMemo(() => {
    let r = [...currentRoster];
    if (dropId) r = r.filter((id) => id !== dropId);
    if (addId) r.push(addId);
    return r;
  }, [currentRoster, dropId, addId]);

  // ── Validation (mirrors AddDropModal) ──
  const nowET = new Date(new Date().toLocaleString("en-US", { timeZone: "America/New_York" }));
  let warning: string | null = null;
  let submitDisabled = false;
  if (!addDropRestrictionEnabled || seasonStartDate > nowET) {
    submitDisabled = proposed.length > MAX_ROSTER;
    warning = submitDisabled ? `Your tribe can hold at most ${MAX_ROSTER} castaways.` : null;
  } else if (currentRoster.length >= MAX_ROSTER && !dropId) {
    warning = `Your tribe is full — drop a castaway before adding one.`;
    submitDisabled = true;
  } else if (latestLockedRoster.length > 0 && !isNetRosterChangeAllowed(latestLockedRoster, proposed)) {
    warning = "Only one net change per week — you can only drop the castaway you added this week.";
    submitDisabled = true;
  } else if (!dropId && !addId) {
    submitDisabled = true;
  }

  // Lockout warning (< 1h to lock)
  const hoursToLock = (nextWednesday8pmET().getTime() - Date.now()) / 3.6e6;
  const lockSoon = hoursToLock < 1 ? `Roster locks in ${Math.max(0, Math.floor(hoursToLock * 60))} min!` : null;

  // ── Visual sets ──
  const tribeIds = [...currentRoster.filter((id) => id !== dropId), ...(addId ? [addId] : [])];
  const tribeCards = tribeIds.map((id) => byId.get(id)).filter((c): c is Castaway => Boolean(c));
  const availableCards = useMemo(
    () =>
      allCastaways.filter(
        (c) => !currentRoster.includes(c.id) && !eliminatedSet.has(c.id) && c.id !== addId,
      ),
    [allCastaways, currentRoster, eliminatedSet, addId],
  );
  const dropCard = dropId ? byId.get(dropId) ?? null : null;
  const activeCard = activeId ? byId.get(activeId) ?? null : null;
  const detailCard = detailId ? byId.get(detailId) ?? null : null;

  const canResetToPrior =
    latestLockedRoster.length > 0 &&
    JSON.stringify([...currentRoster].sort()) !== JSON.stringify([...latestLockedRoster].sort());

  if (!open) return null;

  // ── Interactions: tap opens the flip detail; drag performs the move. ──
  const closeDetail = () => setDetailId(null);
  const doDrop = (id: string) => {
    if (droppableSet.has(id)) setDropId(id);
    closeDetail();
  };
  const doAdd = (id: string) => {
    if (canAdd && id !== dropId) setAddId(id);
    closeDetail();
  };

  const onDragStart = (e: DragStartEvent) => setActiveId(String(e.active.id));
  const onDragEnd = (e: DragEndEvent) => {
    setActiveId(null);
    const zone = e.active.data.current?.zone as Zone | undefined;
    const id = String(e.active.id);
    const dy = e.delta.y;
    const over = e.over?.id;
    if (zone === "roster") {
      if (id === addId) {
        if (over === "available" || dy > 90) setAddId(null);
      } else if (droppableSet.has(id) && (over === "drop" || dy > 90)) {
        setDropId(id);
      }
    } else if (zone === "drop") {
      if (over === "roster" || over === "available" || dy < -70) setDropId(null);
    } else if (zone === "available") {
      if (canAdd && id !== dropId && (over === "roster" || over === "drop" || dy < -70)) setAddId(id);
    }
  };

  const submit = async () => {
    if (submitDisabled || loading) return;
    setError("");
    setLoading(true);
    try {
      await onSubmit(dropId, addId);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to process add/drop");
      setLoading(false);
    }
  };

  const resetToPrior = async () => {
    setError("");
    setLoading(true);
    try {
      await onSubmit(RESET_SENTINEL, null);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reset roster");
      setLoading(false);
    }
  };

  const ready = !submitDisabled && (dropId || addId);

  return (
    <div className="sfl-pack-overlay" role="dialog" aria-modal="true" aria-label="Weekly add and drop">
      <button className="sfl-pack-overlay-close" onClick={onClose} aria-label="Close" disabled={loading}>
        ✕
      </button>

      <DndContext sensors={sensors} collisionDetection={pointerWithin} onDragStart={onDragStart} onDragEnd={onDragEnd}>
        <div className="sfl-pack-head">
          <div className="sfl-eyebrow flame">{lockSoon ?? "Locks Wednesday 8pm ET"}</div>
          <div className="sfl-pack-title-sm">Make your weekly move</div>
        </div>

        {/* Your tribe */}
        <DropZone id="roster" className="sfl-swap-tribe">
          <div className="sfl-swap-label">Your Tribe · tap a card for stats · drag down to drop</div>
          <div className="sfl-swap-tribegrid">
            {tribeCards.map((c) => (
              <DraggableCard
                key={c.id}
                castaway={c}
                zone="roster"
                score={scoreOf(c.id)}
                picked={c.id === addId}
                actionTag={c.id === addId ? "ADD" : undefined}
                disabled={c.id !== addId && !droppableSet.has(c.id)}
                onTap={() => setDetailId(c.id)}
              />
            ))}
            {Array.from({ length: Math.max(0, MAX_ROSTER - tribeCards.length) }).map((_, i) => (
              <EmptyCardSlot key={`slot-${i}`} size="mini" label="Open" glyph="+" />
            ))}
          </div>
        </DropZone>

        {/* Available */}
        <DropZone id="available" className="sfl-swap-avail">
          <div className="sfl-swap-label">
            Available · tap for stats{canAdd ? " · drag up to add" : dropId ? "" : " · drop a card first"}
          </div>
          <div className="sfl-swap-availgrid">
            {availableCards.map((c) => (
              <DraggableCard
                key={c.id}
                castaway={c}
                zone="available"
                score={scoreOf(c.id)}
                disabled={!canAdd}
                onTap={() => setDetailId(c.id)}
              />
            ))}
            {availableCards.length === 0 && (
              <EmptyCardSlot size="mini" label="No cards left" glyph="∅" />
            )}
          </div>
        </DropZone>

        {/* Dock: drop pile + confirm */}
        <div className="sfl-pack-dock">
          <DropZone id="drop" className="sfl-pack-discard">
            <span className="sfl-pack-discard-label">{dropId ? "Dropping" : "Drop pile"}</span>
            {dropCard ? (
              <div className="sfl-pack-discard-stack">
                <DraggableCard
                  castaway={dropCard}
                  zone="drop"
                  score={scoreOf(dropCard.id)}
                  dropping
                  actionTag="DROP"
                  onTap={() => setDetailId(dropCard.id)}
                />
              </div>
            ) : (
              <div className="sfl-pack-discard-empty">
                Drag a tribe card here to drop <span aria-hidden>↓</span>
              </div>
            )}
          </DropZone>

          {(warning || error) && (
            <div className="sfl-swap-warn">{error || warning}</div>
          )}

          <div className="sfl-pack-confirm">
            <button
              className="sfl-btn ghost sm"
              onClick={resetToPrior}
              disabled={loading || !canResetToPrior}
            >
              Reset to last week
            </button>
            <button className="sfl-btn" disabled={!ready || loading} onClick={submit}>
              <span className="sfl-btn-glyph" aria-hidden>⇄</span>
              {loading ? "Saving…" : "Confirm Move"}
            </button>
          </div>
        </div>

        <DragOverlay dropAnimation={null}>
          {activeCard ? (
            <div className="sfl-pack-dragoverlay">
              <TradingCard castaway={{ ...activeCard, totalPoints: scoreOf(activeCard.id) }} size="mini" />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {detailCard && (
        <div className="sfl-cardsheet-portal" style={{ zIndex: 1600 }}>
          <CardDetail
            castaway={{ ...detailCard, totalPoints: scoreOf(detailCard.id) }}
            events={castawayEventBreakdown(detailCard, detailCard.seasonNumber ?? seasonNumber)}
            onClose={closeDetail}
            actions={(() => {
              const id = detailCard.id;
              if (id === dropId)
                return (
                  <button className="sfl-btn block" onClick={() => { setDropId(null); closeDetail(); }}>
                    <span className="sfl-btn-glyph" aria-hidden>↩</span> Keep in tribe
                  </button>
                );
              if (id === addId)
                return (
                  <button className="sfl-btn ghost block" onClick={() => { setAddId(null); closeDetail(); }}>
                    Remove from tribe
                  </button>
                );
              if (currentRoster.includes(id))
                return droppableSet.has(id) ? (
                  <button className="sfl-btn danger block" onClick={() => doDrop(id)}>
                    <span className="sfl-btn-glyph" aria-hidden>✕</span> Drop this castaway
                  </button>
                ) : (
                  <button className="sfl-btn ghost block" disabled>
                    {eliminatedSet.has(id) ? "Eliminated — can’t be dropped" : "Locked this week"}
                  </button>
                );
              return canAdd ? (
                <button className="sfl-btn block" onClick={() => doAdd(id)}>
                  <span className="sfl-btn-glyph" aria-hidden>＋</span> Add to tribe
                </button>
              ) : (
                <button className="sfl-btn ghost block" disabled>
                  Drop a castaway first
                </button>
              );
            })()}
          />
        </div>
      )}
    </div>
  );
}
