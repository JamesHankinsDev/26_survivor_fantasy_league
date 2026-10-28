"use client";

import { useMemo, useState } from "react";
import type { TribeMember } from "@/types/league";
import type { Castaway } from "@/types/castaway";
import {
  MAX_ROSTER,
  getLatestLockedRoster,
  isNetRosterChangeAllowed,
  type RosterChange,
} from "@/utils/rosterSwap";
import type { RosterRules } from "@/utils/rosterRules";
import { castawayEventBreakdown } from "@/utils/castawayEvents";
import { getNextRosterLockDate, getLockRemaining } from "@/utils/lockCountdown";
import { useNow } from "@/hooks/useNow";
import CastawayRow from "./CastawayRow";
import CardDetail from "./CardDetail";

/** One staged move: who goes out (null = filling an open spot) and who comes in. */
interface StagedSwap {
  drop: string | null;
  add: string;
}

export interface SwapSheetProps {
  open: boolean;
  onClose: () => void;
  /** Every staged swap at once, or a roll back to last week's locked roster. */
  onSubmit: (change: RosterChange) => Promise<void>;
  tribeMember: TribeMember;
  allCastaways: Castaway[];
  eliminatedCastawayIds: string[];
  seasonStartDate: Date;
  castawaySeasonScores?: Record<string, number>;
  addDropRestrictionEnabled: boolean;
  /** Season number driving the flip-side stat breakdown. */
  seasonNumber?: number;
  /**
   * Swaps allowed this week and whether voted-out castaways can be dropped.
   * From S51 these differ either side of the merge — see `utils/rosterRules.ts`.
   */
  rules: RosterRules;
}

/** "2d 4h" / "4h 12m" / "12m" — coarse by design; the row refreshes every 30s. */
function formatLockIn(totalMs: number): string {
  const { days, hours, minutes } = getLockRemaining(new Date(Date.now() + totalMs));
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

/**
 * SwapSheet — the weekly add/drop, built thumb-first.
 *
 * The whole move is three taps: **Swap** on a roster row, tap a replacement,
 * **Confirm**. Pre-merge, when two swaps are allowed, both can be staged before
 * a single Confirm. No dragging, no precision targets — the old drag surface put a
 * 65px card inside a 3-across scroller on a phone, which is the single biggest
 * reason the weekly move didn't happen.
 *
 * Card art is still here, it's just no longer load-bearing: every row carries
 * the castaway's portrait, and tapping the row (rather than its Swap button)
 * opens the full flippable `CardDetail`.
 *
 * Roster rules come in via `rules` (see `utils/rosterRules.ts`): how many swaps
 * are left this week, and whether a voted-out castaway may be dropped — which
 * from S51 depends on whether the merge has aired. A tribe still holds at most
 * five, and reset-to-last-week rolls back to the locked roster.
 */
export default function SwapSheet({
  open,
  onClose,
  onSubmit,
  tribeMember,
  allCastaways,
  eliminatedCastawayIds,
  seasonStartDate,
  castawaySeasonScores = {},
  addDropRestrictionEnabled,
  seasonNumber = 0,
  rules,
}: SwapSheetProps) {
  const [staged, setStaged] = useState<StagedSwap[]>([]);
  /**
   * Non-null while the replacement picker is open: who's going out (null =
   * filling an empty slot) and, when re-picking a staged swap, its index.
   */
  const [picking, setPicking] = useState<{ drop: string | null; index: number | null } | null>(
    null,
  );
  const [query, setQuery] = useState("");
  const [detailId, setDetailId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Reset on close via the "adjust state when a prop changes" pattern rather
  // than an effect — an effect leaves the stale selection on screen for a frame
  // when the sheet is reopened quickly.
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (!open) {
      setStaged([]);
      setPicking(null);
      setQuery("");
      setDetailId(null);
      setError("");
      setLoading(false);
    }
  }

  const byId = useMemo(() => {
    const m = new Map<string, Castaway>();
    for (const c of allCastaways) m.set(c.id, c);
    return m;
  }, [allCastaways]);
  const scoreOf = (id: string) =>
    castawaySeasonScores[id] ?? byId.get(id)?.totalPoints ?? 0;

  // `?? []` would mint a new array identity every render for a member with no
  // roster, invalidating every downstream useMemo.
  const currentRoster = useMemo(() => tribeMember.roster ?? [], [tribeMember.roster]);
  const latestLockedRoster = getLatestLockedRoster(tribeMember.weeklyRosters || []);
  const eliminatedSet = useMemo(
    () => new Set(eliminatedCastawayIds),
    [eliminatedCastawayIds],
  );

  const stagedDrops = staged.flatMap((s) => (s.drop ? [s.drop] : []));
  const stagedAdds = staged.map((s) => s.add);
  const proposed = [
    ...currentRoster.filter((id) => !stagedDrops.includes(id)),
    ...stagedAdds,
  ];

  // ── Weekly swap allowance ──
  // `rules.swapsPerWeek` is 2 pre-merge and 1 post-merge from S51 (1 always,
  // before that). Castaways in the proposed tribe who weren't on last week's
  // locked roster are the swaps spent this week — saved ones plus staged ones,
  // so staging a swap counts against the allowance straight away.
  //
  // Gating is done on the rows, not just on Confirm: the old drag UI let you
  // stage an illegal move and only discover it when Confirm stayed dead.
  const swapsUsed =
    latestLockedRoster.length > 0
      ? proposed.filter((id) => !latestLockedRoster.includes(id)).length
      : 0;
  const swapsLeft = Math.max(0, rules.swapsPerWeek - swapsUsed);
  const changeSpent = addDropRestrictionEnabled && swapsLeft === 0;

  // Post-merge a voted-out castaway is locked to the roster; pre-merge (S51+)
  // dropping them frees the slot. With the allowance spent, only castaways
  // added since the lock can still be swapped (it's like-for-like).
  const droppableSet = new Set(
    currentRoster.filter(
      (id) =>
        !stagedDrops.includes(id) &&
        (rules.canDropEliminated || !eliminatedSet.has(id)) &&
        (!changeSpent || !latestLockedRoster.includes(id)),
    ),
  );
  const canAdd = proposed.length < MAX_ROSTER && !changeSpent;

  // A subscribed clock, not a bare Date.now(): render stays pure and the
  // countdown actually advances. `0` = subscription not live yet (SSR/first paint).
  const now = useNow();
  const clockReady = now !== 0;
  // Before the clock is ready, assume the season HAS started so a first-frame
  // flicker can never loosen the add/drop restriction.
  const seasonStarted = clockReady ? now >= seasonStartDate.getTime() : true;

  // ── Validation ──
  let warning: string | null = null;
  let submitDisabled = false;
  if (proposed.length > MAX_ROSTER) {
    warning = `Your tribe can hold at most ${MAX_ROSTER} castaways.`;
    submitDisabled = true;
  } else if (
    addDropRestrictionEnabled &&
    seasonStarted &&
    latestLockedRoster.length > 0 &&
    !isNetRosterChangeAllowed(latestLockedRoster, proposed, rules.swapsPerWeek)
  ) {
    warning =
      rules.swapsPerWeek === 1
        ? "One swap a week after the merge — you can only swap back the castaway you added."
        : `That's ${rules.swapsPerWeek + 1} swaps — you get ${rules.swapsPerWeek} a week. Swap one back to free a move.`;
    submitDisabled = true;
  } else if (staged.length === 0) {
    submitDisabled = true;
  }

  const lockMs = clockReady
    ? getNextRosterLockDate(new Date(now)).getTime() - now
    : Number.POSITIVE_INFINITY;
  const lockSoon = lockMs < 3.6e6;

  // ── Row data ──
  const tribeCards = proposed
    .map((id) => byId.get(id))
    .filter((c): c is Castaway => Boolean(c));

  const availableCards = useMemo(() => {
    const pool = allCastaways.filter(
      (c) =>
        !currentRoster.includes(c.id) && !eliminatedSet.has(c.id) && !stagedAdds.includes(c.id),
    );
    const q = query.trim().toLowerCase();
    const matched = q ? pool.filter((c) => c.name.toLowerCase().includes(q)) : pool;
    // Highest scorers first — the useful default when you're shopping for points.
    return [...matched].sort((a, b) => scoreOf(b.id) - scoreOf(a.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allCastaways, currentRoster, eliminatedSet, staged, query, castawaySeasonScores]);

  const detailCard = detailId ? byId.get(detailId) ?? null : null;
  const pickingForCard = picking?.drop ? byId.get(picking.drop) ?? null : null;

  const canResetToPrior =
    latestLockedRoster.length > 0 &&
    JSON.stringify([...currentRoster].sort()) !==
      JSON.stringify([...latestLockedRoster].sort());

  const emptySlots = Math.max(0, MAX_ROSTER - tribeCards.length);
  const isStaged = staged.length > 0;
  const ready = !submitDisabled && isStaged;

  if (!open) return null;

  // ── Actions ──
  const startSwap = (id: string) => {
    setPicking({ drop: id, index: null });
    setQuery("");
  };
  const startAdd = () => {
    setPicking({ drop: null, index: null });
    setQuery("");
  };
  /** Re-pick who comes in for an already staged swap. */
  const changeStaged = (addId: string) => {
    const index = staged.findIndex((s) => s.add === addId);
    if (index === -1) return;
    setPicking({ drop: staged[index].drop, index });
    setQuery("");
  };
  const choose = (id: string) => {
    if (!picking) return;
    const { drop, index } = picking;
    setStaged((prev) =>
      index === null
        ? [...prev, { drop, add: id }]
        : prev.map((s, i) => (i === index ? { drop, add: id } : s)),
    );
    setPicking(null);
    setQuery("");
    setDetailId(null);
  };
  const undoStaged = (addId: string) => {
    setStaged((prev) => prev.filter((s) => s.add !== addId));
  };

  const submit = async () => {
    if (submitDisabled || loading) return;
    setError("");
    setLoading(true);
    try {
      await onSubmit({ drops: stagedDrops, adds: stagedAdds });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save your swap");
      setLoading(false);
    }
  };

  const resetToPrior = async () => {
    setError("");
    setLoading(true);
    try {
      await onSubmit({ reset: true });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reset roster");
      setLoading(false);
    }
  };

  // ── Replacement picker ──
  if (picking !== null) {
    return (
      <div
        className="sfl-swapsheet"
        role="dialog"
        aria-modal="true"
        aria-label="Choose a replacement"
      >
        <header className="sfl-swapsheet-head">
          <button
            className="sfl-swapsheet-back"
            onClick={() => setPicking(null)}
            aria-label="Back to your tribe"
          >
            ←
          </button>
          <div className="sfl-swapsheet-headtext">
            <div className="sfl-swapsheet-kicker">
              {pickingForCard ? `Swapping out ${pickingForCard.name}` : "Filling an open spot"}
            </div>
            <h2 className="sfl-swapsheet-title">Pick who comes in</h2>
          </div>
        </header>

        <div className="sfl-swapsheet-search">
          <input
            type="search"
            className="sfl-swapsheet-input"
            placeholder="Search castaways"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search castaways"
          />
        </div>

        <div className="sfl-swapsheet-scroll">
          {availableCards.length === 0 ? (
            <p className="sfl-swapsheet-empty">
              {query ? `No castaway matches “${query}”.` : "Nobody left to add."}
            </p>
          ) : (
            <ul className="sfl-rowlist">
              {availableCards.map((c) => (
                <CastawayRow
                  key={c.id}
                  castaway={c}
                  points={scoreOf(c.id)}
                  actionLabel="Add"
                  actionKind="add"
                  onAction={() => choose(c.id)}
                  onOpenCard={() => setDetailId(c.id)}
                />
              ))}
            </ul>
          )}
        </div>

        {detailCard && (
          <div className="sfl-cardsheet-portal" style={{ zIndex: 1600 }}>
            <CardDetail
              castaway={{ ...detailCard, totalPoints: scoreOf(detailCard.id) }}
              events={castawayEventBreakdown(
                detailCard,
                detailCard.seasonNumber ?? seasonNumber,
              )}
              onClose={() => setDetailId(null)}
              actions={
                <button className="sfl-btn block" onClick={() => choose(detailCard.id)}>
                  <span className="sfl-btn-glyph" aria-hidden>
                    ＋
                  </span>
                  Add to tribe
                </button>
              }
            />
          </div>
        )}
      </div>
    );
  }

  // ── Tribe view ──
  return (
    <div
      className="sfl-swapsheet"
      role="dialog"
      aria-modal="true"
      aria-label="Weekly add and drop"
    >
      <header className="sfl-swapsheet-head">
        <button
          className="sfl-swapsheet-back"
          onClick={onClose}
          aria-label="Close"
          disabled={loading}
        >
          ✕
        </button>
        <div className="sfl-swapsheet-headtext">
          <div className={`sfl-swapsheet-kicker${lockSoon ? " urgent" : ""}`}>
            {clockReady
              ? lockSoon
                ? `Locks in ${formatLockIn(lockMs)}`
                : `Locks Wednesday 8pm ET · ${formatLockIn(lockMs)} left`
              : "Locks Wednesday 8pm ET"}
          </div>
          <h2 className="sfl-swapsheet-title">
            {addDropRestrictionEnabled
              ? swapsLeft === 0
                ? "No swaps left this week"
                : `${swapsLeft} swap${swapsLeft === 1 ? "" : "s"} left this week`
              : "Make your weekly move"}
          </h2>
        </div>
      </header>

      <div className="sfl-swapsheet-scroll">
        {staged.map((s) => {
          const dropCard = s.drop ? byId.get(s.drop) : undefined;
          const addCard = byId.get(s.add);
          return (
            <div key={s.add} className="sfl-swapsheet-staged">
              <div className="sfl-swapsheet-staged-text">
                {dropCard && (
                  <span>
                    <b className="out">Out</b> {dropCard.name}
                  </span>
                )}
                {addCard && (
                  <span>
                    <b className="in">In</b> {addCard.name}
                  </span>
                )}
              </div>
              <button
                className="sfl-swapsheet-undo"
                onClick={() => undoStaged(s.add)}
                disabled={loading}
              >
                Undo
              </button>
            </div>
          );
        })}

        <p className="sfl-swapsheet-label">
          Your tribe · tap a name to see their card
        </p>

        <ul className="sfl-rowlist">
          {tribeCards.map((c) => {
            const isIncoming = stagedAdds.includes(c.id);
            const eliminated = eliminatedSet.has(c.id);
            const canSwap = isIncoming || droppableSet.has(c.id);
            return (
              <CastawayRow
                key={c.id}
                castaway={c}
                points={scoreOf(c.id)}
                highlight={isIncoming ? "in" : undefined}
                note={
                  eliminated && !rules.canDropEliminated
                    ? "Voted out — can’t be replaced after the merge"
                    : eliminated
                      ? "Voted out — drop to free the slot"
                      : !canSwap
                        ? "No swaps left this week"
                        : undefined
                }
                actionLabel={isIncoming ? "Change" : "Swap"}
                actionKind={isIncoming ? "undo" : "swap"}
                actionDisabled={!canSwap || loading}
                // The staged banner owns Undo; the incoming row offers the
                // other thing you'd want here — picking someone else instead.
                onAction={() => (isIncoming ? changeStaged(c.id) : startSwap(c.id))}
                onOpenCard={() => setDetailId(c.id)}
              />
            );
          })}

          {Array.from({ length: emptySlots }).map((_, i) => (
            <li key={`slot-${i}`} className="sfl-row is-empty">
              <div className="sfl-row-thumb empty" aria-hidden>
                ＋
              </div>
              <div className="sfl-row-body">
                <span className="sfl-row-name">Open spot</span>
                <span className="sfl-row-note">Add a castaway to fill your tribe</span>
              </div>
              <button
                className="sfl-row-action add"
                onClick={startAdd}
                disabled={!canAdd || loading}
              >
                Add
              </button>
            </li>
          ))}
        </ul>
      </div>

      <footer className="sfl-swapsheet-foot">
        {(error || warning) && (
          <p className="sfl-swapsheet-warn" role="status">
            {error || warning}
          </p>
        )}
        <div className="sfl-swapsheet-actions">
          {canResetToPrior && (
            <button
              className="sfl-btn ghost sm"
              onClick={resetToPrior}
              disabled={loading}
            >
              Reset to last week
            </button>
          )}
          <button className="sfl-btn block" disabled={!ready || loading} onClick={submit}>
            {loading
              ? "Saving…"
              : staged.length > 1
                ? `Confirm ${staged.length} swaps`
                : isStaged
                  ? "Confirm swap"
                  : "Pick a swap above"}
          </button>
        </div>
      </footer>

      {detailCard && (
        <div className="sfl-cardsheet-portal" style={{ zIndex: 1600 }}>
          <CardDetail
            castaway={{ ...detailCard, totalPoints: scoreOf(detailCard.id) }}
            events={castawayEventBreakdown(
              detailCard,
              detailCard.seasonNumber ?? seasonNumber,
            )}
            onClose={() => setDetailId(null)}
            actions={(() => {
              const id = detailCard.id;
              if (stagedAdds.includes(id))
                return (
                  <button
                    className="sfl-btn ghost block"
                    onClick={() => {
                      undoStaged(id);
                      setDetailId(null);
                    }}
                  >
                    Undo this swap
                  </button>
                );
              if (droppableSet.has(id))
                return (
                  <button
                    className="sfl-btn block"
                    onClick={() => {
                      startSwap(id);
                      setDetailId(null);
                    }}
                  >
                    <span className="sfl-btn-glyph" aria-hidden>
                      ⇄
                    </span>
                    Swap this castaway out
                  </button>
                );
              return (
                <button className="sfl-btn ghost block" disabled>
                  {eliminatedSet.has(id) && !rules.canDropEliminated
                    ? "Voted out — can’t be replaced after the merge"
                    : "No swaps left this week"}
                </button>
              );
            })()}
          />
        </div>
      )}
    </div>
  );
}
