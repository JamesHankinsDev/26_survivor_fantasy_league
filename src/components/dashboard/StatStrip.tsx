import type { ReactNode } from "react";

export interface StatCell {
  /** Big number (or composite node — accepts a `<PointBadge />` alongside). */
  value: ReactNode;
  /** Uppercase eyebrow under the number. */
  label: string;
  /** Smaller helper text beneath the label. */
  sub?: string;
}

interface StatStripProps {
  /** Up to 4 cells; lays out as 4-col → 2-col at &lt;980px. */
  cells: StatCell[];
}

export default function StatStrip({ cells }: StatStripProps) {
  return (
    <section className="sfl-statstrip" aria-label="Tribe stats">
      {cells.map((cell, i) => (
        <div key={i} className="sfl-stat">
          <div className="sfl-stat-num">{cell.value}</div>
          <div className="sfl-stat-label">{cell.label}</div>
          {cell.sub && <div className="sfl-stat-sub">{cell.sub}</div>}
        </div>
      ))}
    </section>
  );
}
