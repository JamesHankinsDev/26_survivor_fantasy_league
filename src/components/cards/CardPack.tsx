"use client";

import { useState } from "react";
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
import type { Castaway } from "@/types/castaway";
import { castawayEventBreakdown } from "@/utils/castawayEvents";
import TradingCard from "./TradingCard";
import TorchMark from "./TorchMark";
import CardDetail from "./CardDetail";

export interface CardPackProps {
  open: boolean;
  /** The dealt hand (already resolved + persisted upstream so it never rerolls). */
  hand: Castaway[];
  /** How many cards the player keeps; the rest must be discarded. */
  keepCount?: number;
  /** Season label for the pack face (e.g. "Season 51"). */
  season?: string;
  /** Season number driving the flip-side stat breakdown. */
  seasonNumber?: number;
  /** Dismiss the draft without locking. */
  onClose?: () => void;
  /** Lock the kept castaways. Receives the kept castaway ids. May be async. */
  onLock: (keptIds: string[]) => void | Promise<void>;
}

type Phase = "sealed" | "opening" | "open";
type Zone = "draw" | "discard";

/** A draggable card. Tap toggles discard (keyboard-accessible fallback); drag
 *  or flick moves it between the draw grid and the discard tray. */
function DraggableCard({
  castaway,
  zone,
  onTap,
  size = "mini",
}: {
  castaway: Castaway;
  zone: Zone;
  onTap: () => void;
  size?: "mini" | "sm";
}) {
  const { listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: castaway.id,
    data: { zone },
  });
  return (
    <div
      ref={setNodeRef}
      className={`sfl-pack-cardwrap${isDragging ? " dragging" : ""}`}
      style={{ transform: CSS.Translate.toString(transform), touchAction: "none" }}
      {...listeners}
    >
      <TradingCard
        castaway={castaway}
        size={size}
        dropping={zone === "discard"}
        actionTag={zone === "discard" ? "DISCARD" : undefined}
        onClick={onTap}
      />
    </div>
  );
}

function DropZone({
  id,
  className,
  children,
}: {
  id: Zone;
  className: string;
  children: React.ReactNode;
}) {
  const { isOver, setNodeRef } = useDroppable({ id });
  return (
    <div ref={setNodeRef} className={`${className}${isOver ? " over" : ""}`}>
      {children}
    </div>
  );
}

/**
 * CardPack — the season-start draft. Rip open a sealed Starter Pack to reveal
 * your dealt hand, then cut it down to your starting tribe: drag (or flick) the
 * extras into the discard pile — drag them back out to undo. Tapping a card
 * toggles it too. "Lock My Tribe" enables once exactly the right number are cut.
 *
 * Presentational: the hand is dealt + persisted by the caller so a refresh can
 * never reroll it.
 */
export default function CardPack({
  open,
  hand,
  keepCount = 5,
  season = "Season 51",
  seasonNumber = 0,
  onClose,
  onLock,
}: CardPackProps) {
  const [phase, setPhase] = useState<Phase>("sealed");
  const [cut, setCut] = useState<Set<string>>(() => new Set());
  const [activeId, setActiveId] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 120, tolerance: 8 } }),
  );

  if (!open) return null;

  const discardCount = Math.max(0, hand.length - keepCount);
  const remaining = discardCount - cut.size;
  const ready = cut.size === discardCount;
  const drawCards = hand.filter((c) => !cut.has(c.id));
  const discardCards = hand.filter((c) => cut.has(c.id));
  const activeCard = activeId ? hand.find((c) => c.id === activeId) ?? null : null;
  const detailCard = detailId ? hand.find((c) => c.id === detailId) ?? null : null;

  const rip = () => {
    setPhase("opening");
    setTimeout(() => setPhase("open"), 460);
  };

  const addCut = (id: string) =>
    setCut((prev) => {
      if (prev.has(id) || prev.size >= discardCount) return prev;
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  const removeCut = (id: string) =>
    setCut((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });

  const onDragStart = (e: DragStartEvent) => setActiveId(String(e.active.id));
  const onDragEnd = (e: DragEndEvent) => {
    setActiveId(null);
    const zone = e.active.data.current?.zone as Zone | undefined;
    const id = String(e.active.id);
    const dy = e.delta.y;
    if (zone === "draw") {
      // Dropped on the discard tray, or flicked downward → discard.
      if (e.over?.id === "discard" || dy > 90) addCut(id);
    } else if (zone === "discard") {
      // Dropped back on the draw grid, or flicked upward → restore.
      if (e.over?.id === "draw" || dy < -70) removeCut(id);
    }
  };

  const confirm = async () => {
    if (!ready || submitting) return;
    setSubmitting(true);
    try {
      await onLock(drawCards.map((c) => c.id));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="sfl-pack-overlay" role="dialog" aria-modal="true" aria-label="Season draft">
      {onClose && (
        <button className="sfl-pack-overlay-close" onClick={onClose} aria-label="Close" disabled={submitting}>
          ✕
        </button>
      )}

      {phase !== "open" ? (
        <div className="sfl-pack-sealed">
          <button className={`sfl-pack${phase === "opening" ? " opening" : ""}`} onClick={rip}>
            <TorchMark width="42%" className="sfl-pack-mark" />
            <div className="sfl-pack-title">
              {season}
              <br />
              Starter Pack
            </div>
            <div className="sfl-pack-sub">{hand.length} Castaways Inside</div>
            <div className="sfl-pack-hint">Tap to rip open ▸</div>
          </button>
          <p className="sfl-pack-sealed-sub">
            Your tribe of {keepCount} is hidden inside. Rip it open, then drag the{" "}
            {discardCount === 1 ? "extra" : `${discardCount} extras`} into the discard pile.
          </p>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={pointerWithin}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
        >
          <div className="sfl-pack-head">
            <div className="sfl-eyebrow flame">Your Draw · {season}</div>
            <div className="sfl-pack-title-sm">
              {remaining > 0
                ? `Drag ${remaining} card${remaining === 1 ? "" : "s"} to the discard pile`
                : `Tribe set — ${keepCount} castaways locked`}
            </div>
          </div>

          <DropZone id="draw" className="sfl-pack-draw">
            <div className="sfl-pack-drawgrid">
              {drawCards.map((c) => (
                <DraggableCard key={c.id} castaway={c} zone="draw" onTap={() => setDetailId(c.id)} />
              ))}
            </div>
          </DropZone>

          <div className="sfl-pack-dock">
            <DropZone id="discard" className="sfl-pack-discard">
              <span className="sfl-pack-discard-label">
                Discard {cut.size}/{discardCount}
              </span>
              {discardCards.length === 0 ? (
                <div className="sfl-pack-discard-empty">
                  Drag cards here to discard{" "}
                  <span aria-hidden>↓</span>
                </div>
              ) : (
                <div className="sfl-pack-discard-stack">
                  {discardCards.map((c) => (
                    <DraggableCard key={c.id} castaway={c} zone="discard" onTap={() => setDetailId(c.id)} />
                  ))}
                </div>
              )}
            </DropZone>

            <div className="sfl-pack-confirm">
              <div className="sfl-pack-confirm-status">
                {ready
                  ? `These ${keepCount} are your tribe.`
                  : `${remaining} more to discard.`}
              </div>
              <button className="sfl-btn" disabled={!ready || submitting} onClick={confirm}>
                <span className="sfl-btn-glyph" aria-hidden>
                  🔥
                </span>
                {submitting ? "Locking…" : "Lock My Tribe"}
              </button>
            </div>
          </div>

          <DragOverlay dropAnimation={null}>
            {activeCard ? (
              <div className="sfl-pack-dragoverlay">
                <TradingCard castaway={activeCard} size="mini" />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      {detailCard && (
        <div className="sfl-cardsheet-portal" style={{ zIndex: 1600 }}>
          <CardDetail
            castaway={detailCard}
            events={castawayEventBreakdown(detailCard, detailCard.seasonNumber ?? seasonNumber)}
            onClose={() => setDetailId(null)}
            actions={
              cut.has(detailCard.id) ? (
                <button
                  className="sfl-btn block"
                  onClick={() => {
                    removeCut(detailCard.id);
                    setDetailId(null);
                  }}
                >
                  <span className="sfl-btn-glyph" aria-hidden>↩</span> Keep in tribe
                </button>
              ) : cut.size < discardCount ? (
                <button
                  className="sfl-btn danger block"
                  onClick={() => {
                    addCut(detailCard.id);
                    setDetailId(null);
                  }}
                >
                  <span className="sfl-btn-glyph" aria-hidden>✕</span> Discard this card
                </button>
              ) : (
                <button className="sfl-btn ghost block" disabled>
                  Tribe already cut to {keepCount}
                </button>
              )
            }
          />
        </div>
      )}
    </div>
  );
}
