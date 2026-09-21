import type { Castaway } from "@/types/castaway";
import { getTribe } from "@/data/tribes";
import { getInventory } from "@/types/castaway";
import PortraitPhoto from "./PortraitPhoto";

export type RowActionKind = "swap" | "add" | "undo";

export interface CastawayRowProps {
  castaway: Castaway;
  /** Season points to show. Pass the computed score, not `castaway.totalPoints`. */
  points: number;
  /** Tint the row to mark it as the incoming castaway. */
  highlight?: "in";
  /** Replaces the derived status line (e.g. "Locked this week"). */
  note?: string;
  actionLabel: string;
  actionKind: RowActionKind;
  actionDisabled?: boolean;
  onAction: () => void;
  /** Tapping the row body (not the action button) opens the full card. */
  onOpenCard: () => void;
}

/**
 * CastawayRow — one castaway as a thumb-sized list row.
 *
 * The mobile counterpart to `TradingCard`: a 44px portrait, the name, a status
 * line, the season score, and one action button. Five of these fit above the
 * fold on a phone, where five trading cards across a 390px viewport left each
 * card ~65px wide.
 *
 * The row body is its own button so the card art stays one tap away without
 * standing between the player and the action.
 */
export default function CastawayRow({
  castaway,
  points,
  highlight,
  note,
  actionLabel,
  actionKind,
  actionDisabled = false,
  onAction,
  onOpenCard,
}: CastawayRowProps) {
  const tribe = getTribe(castaway.tribe);
  const idols = getInventory(castaway).immunity_idol;
  const madeJury = Object.values(castaway.weeklyEvents ?? {}).some((events) =>
    events.some((e) => e.eventType === "made_jury"),
  );
  const status = castaway.eliminated ? "out" : madeJury ? "jury" : "active";
  const statusText =
    note ?? (status === "out" ? "Voted out" : status === "jury" ? "On the jury" : "Still in");

  return (
    <li className={`sfl-row${highlight ? ` is-${highlight}` : ""}`}>
      <button
        type="button"
        className="sfl-row-main"
        onClick={onOpenCard}
        aria-label={`${castaway.name}, ${points} points, ${statusText}. View card.`}
      >
        <span className={`sfl-row-thumb${castaway.eliminated ? " is-out" : ""}`}>
          <PortraitPhoto castaway={castaway} eliminated={castaway.eliminated} />
        </span>
        <span className="sfl-row-body">
          <span className="sfl-row-name">
            {castaway.name}
            {idols > 0 && (
              <i className="sfl-row-idol" title={idols > 1 ? `${idols} idols` : "Immunity idol"}>
                ◆
              </i>
            )}
          </span>
          <span className="sfl-row-note">
            <i className={`sfl-row-dot ${status}`} aria-hidden />
            {statusText}
            {tribe && <span className="sfl-row-tribe"> · {tribe.name}</span>}
          </span>
        </span>
        <span className="sfl-row-pts">
          <b>{points}</b>
          <i>pts</i>
        </span>
      </button>
      <button
        type="button"
        className={`sfl-row-action ${actionKind}`}
        onClick={onAction}
        disabled={actionDisabled}
      >
        {actionLabel}
      </button>
    </li>
  );
}
