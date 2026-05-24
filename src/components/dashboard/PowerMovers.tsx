import PowerMover, { type PowerMoverData } from "./PowerMover";

interface PowerMoversProps {
  movers: PowerMoverData[];
  /** Highlight this user's row with the "YOU" tag + flame border. */
  selfUserId?: string;
  /** Show up to N rows (default 4). */
  limit?: number;
}

export default function PowerMovers({
  movers,
  selfUserId,
  limit = 4,
}: PowerMoversProps) {
  const top = [...movers]
    .sort((a, b) => b.weekDelta - a.weekDelta)
    .slice(0, limit);

  if (top.length === 0) {
    return (
      <div
        className="sfl-card"
        style={{
          padding: "18px",
          textAlign: "center",
          color: "var(--ink-mute)",
          fontSize: 13,
        }}
      >
        No movers yet — once the first episode airs, this week&apos;s leaders
        show up here.
      </div>
    );
  }

  const maxDelta = top[0].weekDelta;
  return (
    <div className="sfl-movers">
      {top.map((m) => (
        <PowerMover
          key={m.userId}
          mover={m}
          maxDelta={maxDelta}
          self={m.userId === selfUserId}
        />
      ))}
    </div>
  );
}
