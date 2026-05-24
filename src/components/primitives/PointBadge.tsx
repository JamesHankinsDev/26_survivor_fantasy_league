export type PointTrend = "up" | "down" | "same";

export interface PointBadgeProps {
  value: number;
  /** 18px variant for hero stats. */
  big?: boolean;
  /** Optional trend arrow (jungle ↑, danger ↓, muted for `same`). */
  trend?: PointTrend;
  className?: string;
}

export default function PointBadge({
  value,
  big = false,
  trend,
  className,
}: PointBadgeProps) {
  const tone = value > 0 ? "pos" : value < 0 ? "neg" : "neu";
  const sign = value > 0 ? "+" : value < 0 ? "−" : "";
  return (
    <span
      className={`sfl-pts ${tone}${big ? " big" : ""}${className ? ` ${className}` : ""}`}
    >
      {sign}
      {Math.abs(value)}
      {trend === "up" && <i className="sfl-pts-arrow">↑</i>}
      {trend === "down" && <i className="sfl-pts-arrow">↓</i>}
    </span>
  );
}
