"use client";

import { useState, type ReactNode } from "react";
import type { Castaway } from "@/types/castaway";
import { getTribe } from "@/data/tribes";
import StatusPill, { type CastawayStatus } from "@/components/primitives/StatusPill";
import TribeChip from "@/components/primitives/TribeChip";
import PointBadge from "@/components/primitives/PointBadge";
import TradingCard from "./TradingCard";

export interface CardDetailEvent {
  label: string;
  points: number;
}

export interface CardDetailProps {
  castaway: Castaway;
  /** Season-event breakdown rows shown on the flipped (back) face of the card. */
  events?: CardDetailEvent[];
  /** Eyebrow text above the name (e.g. a vibe/archetype). Defaults to "Castaway". */
  vibe?: string;
  /** Optional secondary eyebrow note (e.g. "Played S45"). */
  prev?: string;
  /** Close handler — renders the dismiss button when provided. */
  onClose?: () => void;
  /** Footer action buttons (e.g. Discard / Add / Close). */
  actions?: ReactNode;
  className?: string;
}

/** Mirror of TradingCard's status derivation (kept local; the same rules). */
function deriveStatus(castaway: Castaway): CastawayStatus {
  if (castaway.eliminated) return "out";
  const madeJury = Object.values(castaway.weeklyEvents ?? {}).some((events) =>
    events.some((e) => e.eventType === "made_jury"),
  );
  return madeJury ? "jury" : "active";
}

/**
 * CardDetail — a full-screen sheet that a tapped card expands into. A big,
 * **flippable** TradingCard up top (tap the card to flip it over and read the
 * season-stat breakdown on the back), a dossier, and an actions row below.
 * Designed to fill its positioned ancestor — give that ancestor
 * `position: relative` (the dashboard/phone shells already do).
 */
export default function CardDetail({
  castaway,
  events = [],
  vibe = "Castaway",
  prev,
  onClose,
  actions,
  className,
}: CardDetailProps) {
  const [flipped, setFlipped] = useState(false);
  const status = deriveStatus(castaway);
  const tribe = getTribe(castaway.tribe);
  const points = castaway.totalPoints ?? 0;

  return (
    <div
      className={`sfl-cardsheet${className ? ` ${className}` : ""}`}
      role="dialog"
      aria-label={`${castaway.name} card`}
    >
      {onClose && (
        <button className="sfl-cardsheet-close" onClick={onClose} aria-label="Close">
          ✕
        </button>
      )}

      <div className="sfl-cardsheet-card">
        <button
          type="button"
          className="sfl-cardflip"
          onClick={() => setFlipped((f) => !f)}
          aria-label={flipped ? "Show card front" : "Flip card to see season stats"}
          aria-pressed={flipped}
        >
          <div className={`sfl-cardflip-inner${flipped ? " flipped" : ""}`}>
            <div className="sfl-cardflip-front">
              <TradingCard castaway={castaway} vibe={vibe} size="lg" />
            </div>
            <div className="sfl-cardflip-back" aria-hidden={!flipped}>
              <div className="sfl-cardflip-back-head">
                <span className="sfl-cardflip-back-name">{castaway.name}</span>
                <span className="sfl-cardflip-back-eyebrow">Season Stats</span>
              </div>
              <div className="sfl-cardflip-back-events">
                {events.length > 0 ? (
                  events.map((e, i) => (
                    <div className="sfl-cardflip-back-row" key={i}>
                      <span>{e.label}</span>
                      <PointBadge value={e.points} />
                    </div>
                  ))
                ) : (
                  <div className="sfl-cardflip-back-empty">No season events yet.</div>
                )}
              </div>
              <div className="sfl-cardflip-back-total">
                <span>Total</span>
                <PointBadge value={points} big />
              </div>
            </div>
          </div>
        </button>
        <div className="sfl-cardflip-hint" aria-hidden>
          {flipped ? "Tap card for the front" : "Tap card to flip for season stats"}
        </div>
      </div>

      <div className="sfl-cardsheet-body">
        <div className="sfl-eyebrow flame">
          {vibe}
          {prev ? ` · ${prev}` : ""}
        </div>
        <h2 className="sfl-cardsheet-name">{castaway.name}</h2>
        <div className="sfl-cardsheet-meta">
          {tribe && <TribeChip tribe={tribe.id} tribeMeta={tribe} />}
          <StatusPill status={status} />
          <PointBadge value={points} big className="sfl-cardsheet-pts" />
        </div>

        {actions && <div className="sfl-cardsheet-actions">{actions}</div>}
      </div>
    </div>
  );
}
