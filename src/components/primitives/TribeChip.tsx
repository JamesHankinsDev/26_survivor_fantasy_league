import type { CSSProperties } from "react";
import { getTribe, type TribeMeta } from "@/data/tribes";

export interface TribeChipProps {
  /** Tribe id (case-insensitive); looked up via `getTribe`. */
  tribe: string;
  /** Optional override if you already have the resolved tribe metadata. */
  tribeMeta?: TribeMeta;
  className?: string;
}

export default function TribeChip({
  tribe,
  tribeMeta,
  className,
}: TribeChipProps) {
  const t = tribeMeta ?? getTribe(tribe);
  if (!t) return null;
  return (
    <span
      className={`sfl-tribechip${className ? ` ${className}` : ""}`}
      style={{ ["--tc" as string]: t.color } as CSSProperties}
    >
      <span className="sfl-tribechip-glyph" aria-hidden>
        {t.glyph}
      </span>
      {t.name}
    </span>
  );
}
