"use client";

import { useState } from "react";
import type { Castaway } from "@/types/castaway";
import type { TradingCardSize } from "./TradingCard";
import TradingCard from "./TradingCard";
import CardDetail from "./CardDetail";
import { castawayEventBreakdown } from "@/utils/castawayEvents";

export interface CastawayDetailGridProps {
  castaways: Castaway[];
  /**
   * Fallback season whose scoring config drives the detail event breakdown.
   * A castaway's own `seasonNumber` (e.g. Hall-of-Fame entries) takes priority.
   */
  seasonNumber: number;
  /** Card size in the grid (defaults to the compact `mini`). */
  size?: TradingCardSize;
  /** Optional per-castaway vibe/eyebrow resolver. */
  vibeFor?: (castaway: Castaway) => string | undefined;
  /**
   * Stamp each card with its own season (e.g. "S50"). Only useful in
   * cross-season grids like the Hall of Fame; within one season's cast the
   * season is already implied by the page. Cards whose castaway has no
   * `seasonNumber` are left unstamped.
   */
  showSeasonBadge?: boolean;
  /** Optional footer actions in the detail sheet, given the open castaway. */
  renderActions?: (castaway: Castaway, close: () => void) => React.ReactNode;
  className?: string;
}

/**
 * CastawayDetailGrid — a compact `.sfl-mini-grid` of castaway cards where
 * tapping any card expands it into the full-screen `CardDetail` sheet (mounted
 * in a fixed portal). The detail event breakdown is derived from real scoring
 * data via `castawayEventBreakdown`. This is the mobile-first roster/cast
 * pattern, but it works at any width.
 */
export default function CastawayDetailGrid({
  castaways,
  seasonNumber,
  size = "mini",
  vibeFor,
  showSeasonBadge = false,
  renderActions,
  className,
}: CastawayDetailGridProps) {
  const [openId, setOpenId] = useState<string | null>(null);
  const open = castaways.find((c) => c.id === openId) ?? null;
  const close = () => setOpenId(null);
  const gridClass = size === "mini" ? "sfl-mini-grid" : "sfl-card-grid";
  const seasonBadgeFor = (c: Castaway): string | undefined =>
    showSeasonBadge && typeof c.seasonNumber === "number" ? `S${c.seasonNumber}` : undefined;

  return (
    <>
      <div className={`${gridClass}${className ? ` ${className}` : ""}`}>
        {castaways.map((c) => (
          <TradingCard
            key={c.id}
            castaway={c}
            size={size}
            vibe={vibeFor?.(c)}
            seasonBadge={seasonBadgeFor(c)}
            onClick={() => setOpenId(c.id)}
          />
        ))}
      </div>

      {open && (
        <div className="sfl-cardsheet-portal">
          <CardDetail
            castaway={open}
            vibe={vibeFor?.(open)}
            seasonBadge={seasonBadgeFor(open)}
            events={castawayEventBreakdown(open, open.seasonNumber ?? seasonNumber)}
            onClose={close}
            actions={renderActions?.(open, close)}
          />
        </div>
      )}
    </>
  );
}
