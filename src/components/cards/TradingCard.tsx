import type { CSSProperties, KeyboardEvent, MouseEvent } from "react";
import { rarityFor } from "@/utils/rarityTier";
import { getTribe } from "@/data/tribes";
import { getInventory } from "@/types/castaway";
import type { Castaway } from "@/types/castaway";
import PortraitPhoto from "./PortraitPhoto";

export type TradingCardSize = "mini" | "sm" | "md" | "lg" | "xl";
export type CardStatus = "active" | "jury" | "out";

interface BaseProps {
  size?: TradingCardSize;
  /** Picked-up green ring + lift (draft "this card is on my team"). */
  picked?: boolean;
  /** Dropping red ring + grayscale (draft "about to drop"). */
  dropping?: boolean;
  /** Apply tilt + lift CSS vars used by the hand-fan layout. */
  hand?: boolean;
  /** Per-card tilt in degrees (only meaningful in `hand` mode). */
  tilt?: number;
  /** Per-card lift in px (only meaningful in `hand` mode). */
  lift?: number;
  className?: string;
}

interface GhostProps extends BaseProps {
  ghost: true;
  castaway?: undefined;
  onClick?: undefined;
  vibe?: undefined;
}

interface CardProps extends BaseProps {
  castaway: Castaway;
  ghost?: false;
  /** Click handler — when present, the card renders as a button. */
  onClick?: (castaway: Castaway) => void;
  /**
   * Footer subtitle after the rarity label. Defaults to "CASTAWAY".
   * (No `vibe` field on Castaway yet; this prop is the seam for later wiring.)
   */
  vibe?: string;
}

export type TradingCardProps = CardProps | GhostProps;

/** Derive a status from existing data — no schema change needed. */
function deriveStatus(castaway: Castaway): CardStatus {
  if (castaway.eliminated) return "out";
  const madeJury = Object.values(castaway.weeklyEvents ?? {}).some((events) =>
    events.some((e) => e.eventType === "made_jury"),
  );
  return madeJury ? "jury" : "active";
}

function statusDotColor(status: CardStatus): string {
  if (status === "active") return "var(--jungle)";
  if (status === "jury") return "var(--ocean)";
  return "var(--danger)";
}

export default function TradingCard(props: TradingCardProps) {
  const { size = "md", hand = false, tilt, lift, className } = props;
  const handVars: CSSProperties = hand
    ? {
        ["--tilt" as string]: `${tilt ?? 0}deg`,
        ["--lift" as string]: `${lift ?? 0}px`,
      }
    : {};

  if (props.ghost) {
    return (
      <div
        className={`sfl-tcg-ghost size-${size}${hand ? " in-hand" : ""}${className ? ` ${className}` : ""}`}
        style={handVars}
        aria-label="Empty roster slot"
      >
        <div className="sfl-tcg-ghost-inner">
          ＋<div>Empty slot</div>
        </div>
      </div>
    );
  }

  const { castaway, onClick, picked = false, dropping = false, vibe = "Castaway" } = props;
  const rarity = rarityFor(castaway);
  const status = deriveStatus(castaway);
  const tribe = getTribe(castaway.tribe);
  const inventory = getInventory(castaway);
  const idolCount = inventory.immunity_idol;
  const isOut = status === "out";
  const isMythic = rarity.id === "mythic";

  const classes = [
    "sfl-tcg",
    `size-${size}`,
    `rarity-${rarity.id}`,
    picked && "picked",
    dropping && "dropping",
    isOut && "is-out",
    hand && "in-hand",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const style: CSSProperties = {
    ["--border-gradient" as string]: rarity.border,
    ["--rarity-chip" as string]: rarity.chip,
    ...handVars,
  };

  const ariaLabel = `${castaway.name}, ${rarity.label}, ${castaway.totalPoints} points${
    isOut ? ", voted out" : status === "jury" ? ", on jury" : ""
  }`;

  const inner = (
    <div className="sfl-tcg-border">
      <div className="sfl-tcg-inner">
        {/* HEADER BAND */}
        <div className="sfl-tcg-head">
          <span
            className="sfl-tcg-status"
            style={{ background: statusDotColor(status), color: statusDotColor(status) }}
            aria-hidden
          />
          <span className="sfl-tcg-name">{castaway.name.toUpperCase()}</span>
          <span className="sfl-tcg-pts">
            <b>{castaway.totalPoints ?? 0}</b>
            <i>PTS</i>
          </span>
        </div>

        {/* PHOTO */}
        <div className="sfl-tcg-photo-wrap">
          <PortraitPhoto castaway={castaway} eliminated={isOut} />
          {isMythic && <div className="sfl-tcg-holo" aria-hidden />}
          <div className="sfl-tcg-photo-frame" aria-hidden />

          {/* CORNER BADGES */}
          <div className="sfl-tcg-badges">
            {idolCount > 0 && (
              <span
                className="sfl-tcg-badge idol"
                title={idolCount > 1 ? `${idolCount} idols` : "Immunity idol"}
                aria-label={idolCount > 1 ? `${idolCount} idols` : "Immunity idol"}
              >
                ◆
              </span>
            )}
            {status === "jury" && (
              <span className="sfl-tcg-badge jury" title="On jury" aria-label="On jury">
                J
              </span>
            )}
          </div>

          {/* TRIBE GLYPH */}
          {tribe && (
            <span
              className="sfl-tcg-tribe-mark"
              style={{ background: tribe.color }}
              title={tribe.name}
              aria-label={`Tribe: ${tribe.name}`}
            >
              {tribe.glyph}
            </span>
          )}

          {/* VOTED OUT STAMP */}
          {isOut && <div className="sfl-tcg-voted-stamp">VOTED OUT</div>}
        </div>

        {/* FOOTER BAND */}
        <div className="sfl-tcg-foot">
          <span className="sfl-tcg-rarity">{rarity.label.toUpperCase()}</span>
          <span className="sfl-tcg-dot">·</span>
          <span className="sfl-tcg-vibe">{vibe.toUpperCase()}</span>
        </div>
      </div>
    </div>
  );

  const actionTag =
    picked || dropping ? (
      <div className={`sfl-tcg-action-tag${dropping ? " dropping" : ""}`}>
        {dropping ? "× DROPPING" : "✓ PICKED"}
      </div>
    ) : null;

  // Render a button when clickable, a div otherwise. Keeps semantics honest
  // for read-only contexts (e.g., the Recap event log) and avoids forcing a
  // pointer cursor / focus ring on non-interactive cards.
  if (onClick) {
    const handleClick = (e: MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      onClick(castaway);
    };
    const handleKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onClick(castaway);
      }
    };
    return (
      <button
        type="button"
        className={classes}
        style={style}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        aria-label={ariaLabel}
      >
        {inner}
        {actionTag}
      </button>
    );
  }

  return (
    <div
      className={classes}
      style={{ ...style, cursor: "default" }}
      role="img"
      aria-label={ariaLabel}
    >
      {inner}
      {actionTag}
    </div>
  );
}
