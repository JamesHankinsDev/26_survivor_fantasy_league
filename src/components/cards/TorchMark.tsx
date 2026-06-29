/**
 * TorchMark — the SFL brand torch as a standalone SVG (the same glyph the
 * sidebar `AppLogo` draws). Used on the card back and starter pack where a
 * larger, free-standing mark is needed. `width` is a CSS length so callers can
 * size it relative to their container (e.g. "42%").
 */
export interface TorchMarkProps {
  width?: string | number;
  className?: string;
  /** Animate the flame flicker (gated behind prefers-reduced-motion in CSS). */
  flicker?: boolean;
}

export default function TorchMark({ width = "40%", className, flicker = true }: TorchMarkProps) {
  return (
    <svg
      viewBox="0 0 20 24"
      aria-hidden="true"
      className={className}
      style={{ width, height: "auto" }}
    >
      <rect x="8" y="11" width="4" height="11" rx="1" fill="currentColor" opacity="0.55" />
      <path
        className={flicker ? "sfl-torch-flame" : undefined}
        d="M10 0 C 6 5, 4 8, 5 12 Q 5 15, 10 14 Q 15 15, 15 12 C 16 8, 14 5, 10 0 Z"
        fill="var(--flame, #E76F3C)"
      />
      <circle cx="10" cy="10" r="2" fill="#FFD66A" />
    </svg>
  );
}
