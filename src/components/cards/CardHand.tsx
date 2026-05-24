import type { Castaway } from "@/types/castaway";
import TradingCard, { type TradingCardSize } from "./TradingCard";

interface CardHandProps {
  castaways: Castaway[];
  /** Total slot count; empty slots render as ghost cards. Default 5. */
  slots?: number;
  /** Card size passed through to every slot. Default `md`. */
  size?: TradingCardSize;
  onCardClick?: (castaway: Castaway) => void;
  className?: string;
}

/**
 * Fanned roster layout. Five (or `slots`) cards arc with per-index tilt; the
 * center card sits highest, ends sit lowest. Hovering any slot lifts that card
 * and pushes the siblings apart (CSS-only — see `.sfl-hand-slot:hover` rules
 * in globals.css).
 */
export default function CardHand({
  castaways,
  slots = 5,
  size = "md",
  onCardClick,
  className,
}: CardHandProps) {
  const filled = castaways.slice(0, slots);
  const emptyCount = Math.max(0, slots - filled.length);
  const total = filled.length + emptyCount;
  const center = (total - 1) / 2;

  return (
    <div
      className={`sfl-hand${className ? ` ${className}` : ""}`}
      data-count={total}
    >
      {filled.map((c, i) => {
        const offset = i - center;
        return (
          <div
            key={c.id}
            className="sfl-hand-slot"
            style={{ ["--lift" as string]: `${Math.abs(offset) * 4}px` }}
          >
            <TradingCard
              castaway={c}
              size={size}
              hand
              tilt={offset * 5}
              lift={Math.abs(offset) * 4}
              onClick={onCardClick}
            />
          </div>
        );
      })}
      {Array.from({ length: emptyCount }).map((_, i) => {
        const idx = filled.length + i;
        const offset = idx - center;
        return (
          <div
            key={`empty-${i}`}
            className="sfl-hand-slot empty"
            style={{ ["--lift" as string]: `${Math.abs(offset) * 4}px` }}
          >
            <TradingCard
              ghost
              size={size}
              hand
              tilt={offset * 5}
              lift={Math.abs(offset) * 4}
            />
          </div>
        );
      })}
    </div>
  );
}
