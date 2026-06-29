import type { CSSProperties } from "react";
import type { TradingCardSize } from "./TradingCard";

export interface EmptyCardSlotProps {
  size?: TradingCardSize;
  /** Caption under the glyph (e.g. "Add", "No cards left"). */
  label?: string;
  /** Big centered glyph (defaults to a plus). */
  glyph?: string;
  /** When provided, the slot renders as a button. */
  onClick?: () => void;
  className?: string;
}

/**
 * EmptyCardSlot — a dashed ghost placeholder for an open roster spot, sized to
 * match TradingCard via the shared `.sfl-tcg-ghost` styles. Renders as a button
 * when `onClick` is provided, a plain div otherwise.
 */
export default function EmptyCardSlot({
  size = "md",
  label = "Add",
  glyph = "＋",
  onClick,
  className,
}: EmptyCardSlotProps) {
  const classes = `sfl-tcg-ghost size-${size}${className ? ` ${className}` : ""}`;
  const inner = (
    <div className="sfl-tcg-ghost-inner">
      {glyph}
      <div>{label}</div>
    </div>
  );

  if (onClick) {
    return (
      <button
        type="button"
        className={classes}
        style={{ cursor: "pointer" } as CSSProperties}
        onClick={onClick}
        aria-label={label}
      >
        {inner}
      </button>
    );
  }

  return (
    <div className={classes} role="img" aria-label={label}>
      {inner}
    </div>
  );
}
