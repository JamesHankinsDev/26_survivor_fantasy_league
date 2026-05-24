import PointBadge from "@/components/primitives/PointBadge";

export interface PowerMoverData {
  userId: string;
  displayName: string;
  ownerName?: string;
  color: string;
  initials: string;
  weekDelta: number;
  totalPoints: number;
  rank: number;
}

interface PowerMoverProps {
  mover: PowerMoverData;
  /** Used to scale the bar width — defaults to the mover's own delta. */
  maxDelta: number;
  /** Highlight as the signed-in user. */
  self?: boolean;
}

export default function PowerMover({
  mover,
  maxDelta,
  self = false,
}: PowerMoverProps) {
  const pct =
    maxDelta > 0
      ? Math.max(8, (Math.max(0, mover.weekDelta) / maxDelta) * 100)
      : 8;
  return (
    <div
      className={`sfl-mover${self ? " self" : ""}`}
      aria-label={`${mover.displayName}, ${mover.weekDelta} points this week, rank ${mover.rank}`}
    >
      <div className="sfl-mover-head">
        <span className="sfl-avatar sm" style={{ background: mover.color }}>
          {mover.initials}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="sfl-mover-name">
            {mover.displayName}
            {self && <span className="sfl-tag">YOU</span>}
          </div>
          {mover.ownerName && (
            <div className="sfl-mover-owner">{mover.ownerName}</div>
          )}
        </div>
        <PointBadge value={mover.weekDelta} />
      </div>
      <div className="sfl-mover-bar">
        <div
          className="sfl-mover-bar-fill"
          style={{ width: `${pct}%`, background: mover.color }}
        />
      </div>
      <div className="sfl-mover-foot">
        <span>
          Total <b>{mover.totalPoints}</b>
        </span>
        <span>Rank #{mover.rank}</span>
      </div>
    </div>
  );
}
