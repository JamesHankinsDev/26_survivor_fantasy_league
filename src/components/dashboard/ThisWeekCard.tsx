"use client";

import type { Castaway } from "@/types/castaway";
import { getNextRosterLockDate, getLockRemaining } from "@/utils/lockCountdown";
import { useNow } from "@/hooks/useNow";
import PortraitPhoto from "@/components/cards/PortraitPhoto";

export interface ThisWeekCardProps {
  /** The player's rank in the league, or null before any scoring. */
  rank: number | null;
  totalMembers: number;
  totalPoints: number;
  /** Points earned in the most recently scored week. */
  weekDelta: number;
  /** The player's current roster, in order. */
  roster: Castaway[];
  eliminatedIds: Set<string>;
  /**
   * Swaps remaining this week, or `null` when the league doesn't restrict them.
   * 2 pre-merge / 1 post-merge from S51 — see `utils/rosterRules.ts`.
   */
  swapsLeft: number | null;
  /** Opens the swap sheet. */
  onSwap: () => void;
  /** Season hasn't started — show the draft CTA instead of the swap CTA. */
  needsDraft?: boolean;
  onDraft?: () => void;
}

function formatRemaining(totalMs: number): string {
  const { days, hours, minutes } = getLockRemaining(new Date(Date.now() + totalMs));
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

/**
 * ThisWeekCard — the one thing a player opens the app to do, at the top of Home.
 *
 * Before this, the weekly move was four screens deep: Home → "Set lineup" →
 * league detail → find your own TribeCard → Add/Drop. The action now happens
 * right here; the swap sheet opens over the dashboard and Home never unmounts.
 *
 * Everything above the fold answers the three questions a family player
 * actually has: where am I, how long have I got, and what do I press.
 */
export default function ThisWeekCard({
  rank,
  totalMembers,
  totalPoints,
  weekDelta,
  roster,
  eliminatedIds,
  swapsLeft,
  onSwap,
  needsDraft = false,
  onDraft,
}: ThisWeekCardProps) {
  const now = useNow();
  const clockReady = now !== 0;
  const lockMs = clockReady
    ? getNextRosterLockDate(new Date(now)).getTime() - now
    : Number.POSITIVE_INFINITY;
  const urgent = lockMs < 24 * 3.6e6;

  const activeCount = roster.filter((c) => !eliminatedIds.has(c.id)).length;

  return (
    <section className="sfl-thisweek" aria-label="This week">
      <header className="sfl-thisweek-head">
        <div className={`sfl-thisweek-lock${urgent ? " urgent" : ""}`}>
          <span className="sfl-thisweek-lockdot" aria-hidden />
          {clockReady
            ? `Roster locks in ${formatRemaining(lockMs)}`
            : "Roster locks Wednesday 8pm ET"}
        </div>
      </header>

      <div className="sfl-thisweek-stats">
        <div className="sfl-thisweek-stat">
          <span className="sfl-thisweek-num sfl-mono">
            {rank != null ? `#${rank}` : "—"}
          </span>
          <span className="sfl-thisweek-lbl">
            of {totalMembers} {totalMembers === 1 ? "tribe" : "tribes"}
          </span>
        </div>
        <div className="sfl-thisweek-stat">
          <span className="sfl-thisweek-num sfl-mono">{totalPoints}</span>
          <span className="sfl-thisweek-lbl">
            total{weekDelta !== 0 && (
              <b className={weekDelta > 0 ? "up" : "down"}>
                {weekDelta > 0 ? "+" : ""}
                {weekDelta} this week
              </b>
            )}
          </span>
        </div>
        <div className="sfl-thisweek-stat">
          <span className="sfl-thisweek-num sfl-mono">
            {activeCount}/{roster.length || 5}
          </span>
          <span className="sfl-thisweek-lbl">still in</span>
        </div>
      </div>

      {needsDraft ? (
        <>
          <p className="sfl-thisweek-say">
            Your starter pack is waiting. Rip it open and cut down to a tribe of five.
          </p>
          <button className="sfl-btn block lg" onClick={onDraft}>
            <span className="sfl-btn-glyph" aria-hidden>
              🔥
            </span>
            Open my pack
          </button>
        </>
      ) : (
        <>
          <ul className="sfl-thisweek-tribe" aria-label="Your tribe">
            {roster.map((c) => (
              <li
                key={c.id}
                className={`sfl-thisweek-face${eliminatedIds.has(c.id) ? " is-out" : ""}`}
                title={c.name}
              >
                <PortraitPhoto castaway={c} eliminated={eliminatedIds.has(c.id)} />
                <span className="sfl-thisweek-facename">{c.name.split(" ")[0]}</span>
              </li>
            ))}
            {Array.from({ length: Math.max(0, 5 - roster.length) }).map((_, i) => (
              <li key={`gap-${i}`} className="sfl-thisweek-face is-gap" aria-hidden>
                <span>＋</span>
                <span className="sfl-thisweek-facename">Open</span>
              </li>
            ))}
          </ul>
          <button className="sfl-btn block lg" onClick={onSwap}>
            <span className="sfl-btn-glyph" aria-hidden>
              ⇄
            </span>
            {swapsLeft === 0
              ? "Review my move"
              : swapsLeft === null || swapsLeft === 1
                ? "Make my weekly swap"
                : `Make my swaps · ${swapsLeft} left`}
          </button>
          {swapsLeft === 0 && (
            <p className="sfl-thisweek-note">
              No swaps left this week. Tap to review or swap back.
            </p>
          )}
        </>
      )}
    </section>
  );
}
