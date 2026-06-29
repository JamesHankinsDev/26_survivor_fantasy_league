import type { CSSProperties } from "react";
import type { TradingCardSize } from "./TradingCard";
import TorchMark from "./TorchMark";

export interface CardBackProps {
  size?: TradingCardSize;
  /** Season label shown under the wordmark (e.g. "Season 51"). */
  season?: string;
  className?: string;
}

/**
 * CardBack — the branded reverse of a TradingCard: the torch mark over a
 * chevron weave with the league wordmark. Use for face-down cards, pack
 * reveals, and flip animations. Reuses the TradingCard frame so a flip reads
 * as one object.
 */
export default function CardBack({ size = "md", season = "Season 51", className }: CardBackProps) {
  return (
    <div
      className={`sfl-tcg sfl-tcg-back size-${size}${className ? ` ${className}` : ""}`}
      style={{ ["--border-gradient" as string]: "linear-gradient(135deg, var(--flame), var(--flame-deep))" } as CSSProperties}
      aria-label="Card back"
      role="img"
    >
      <div className="sfl-tcg-border">
        <div className="sfl-tcg-inner">
          <TorchMark width="38%" className="sfl-tcg-back-mark" />
          <div className="sfl-tcg-back-word">
            Survivor
            <br />
            Fantasy League
          </div>
          <div className="sfl-tcg-back-sub">{season}</div>
        </div>
      </div>
    </div>
  );
}
