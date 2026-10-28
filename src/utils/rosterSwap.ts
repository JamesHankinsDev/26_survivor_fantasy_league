/**
 * Pure roster-swap rules — no Firebase imports, so both the client (SwapSheet,
 * `useRosterSwap`) and server routes (the AI chat's swap endpoint) can use them.
 *
 * `scoring.ts` re-exports the two locked-roster helpers for existing callers;
 * it pulls in the client Firestore SDK and must not be imported from server code.
 */
import type { WeeklyRoster } from "@/types/league";
import type { RosterRules } from "@/utils/rosterRules";

export const MAX_ROSTER = 5;

/**
 * Is this week's net roster change within the allowance?
 *
 * `maxChanges` is how many castaways may be swapped out relative to last
 * week's locked roster — 1 historically, and from S51 it's 2 pre-merge and 1
 * post-merge (see `utils/rosterRules.ts`). Measured against the *previous*
 * roster's size rather than a hardcoded five, so a short roster (someone who
 * drafted fewer than five) isn't accidentally handed extra moves.
 */
export const isNetRosterChangeAllowed = (
  previousRoster: string[],
  proposedRoster: string[],
  maxChanges = 1,
): boolean => {
  const sameCount = previousRoster.filter((id) => proposedRoster.includes(id)).length;
  return sameCount >= previousRoster.length - maxChanges;
};

/**
 * Get the most recent locked roster for a team member.
 * Returns the weeklyRoster with the highest week number.
 */
export const getLatestLockedRoster = (
  weeklyRosters: WeeklyRoster[],
): string[] => {
  if (weeklyRosters.length === 0) return [];
  const sorted = [...weeklyRosters].sort((a, b) => b.week - a.week);
  return sorted[0].castawayIds || [];
};

/** Swaps left this week, or null when the league doesn't restrict add/drop. */
export const getSwapsLeft = (
  roster: string[],
  weeklyRosters: WeeklyRoster[],
  rules: RosterRules,
  restrictionEnabled: boolean,
): number | null => {
  if (!restrictionEnabled) return null;
  const locked = getLatestLockedRoster(weeklyRosters);
  if (locked.length === 0) return rules.swapsPerWeek;
  const used = roster.filter((id) => !locked.includes(id)).length;
  return Math.max(0, rules.swapsPerWeek - used);
};

/**
 * A batch of add/drops made in one go from the swap sheet — several swaps can
 * be staged before Confirm — or a roll back to last week's locked roster.
 */
export type RosterChange = { drops: string[]; adds: string[] } | { reset: true };

/**
 * Apply drops then adds to a roster. Fails if the roster no longer matches what
 * the change was staged against (a drop that's gone, an add that's already
 * there) — the sign of a stale client copy, which must never be written back.
 */
export const applyRosterChange = (
  roster: string[],
  drops: string[],
  adds: string[],
): RosterSwapResult => {
  if (drops.length === 0 && adds.length === 0) return { ok: false, error: "Nothing to change." };
  if (drops.some((id) => !roster.includes(id)) || adds.some((id) => roster.includes(id)))
    return {
      ok: false,
      error: "Your tribe changed since you opened this. Close it and try again.",
    };
  if (new Set(adds).size !== adds.length || new Set(drops).size !== drops.length)
    return { ok: false, error: "The same castaway is in this change twice." };
  return { ok: true, roster: [...roster.filter((id) => !drops.includes(id)), ...adds] };
};

export interface RosterSwapContext {
  roster: string[];
  weeklyRosters: WeeklyRoster[];
  rules: RosterRules;
  /** `League.addDropRestrictionEnabled`. */
  restrictionEnabled: boolean;
  /** Before the premiere the net-change rule doesn't apply (matches SwapSheet). */
  seasonStarted: boolean;
  /** Every castaway ID in the league's season. */
  seasonCastawayIds: ReadonlySet<string>;
  eliminatedIds: ReadonlySet<string>;
}

export type RosterSwapResult =
  | { ok: true; roster: string[] }
  | { ok: false; error: string };

/**
 * Validate a single drop and/or add against every rule the swap sheet enforces,
 * returning the new working roster. Server routes must call this rather than
 * trusting a client-supplied roster — admin-SDK writes bypass Firestore rules.
 */
export const validateRosterSwap = (
  dropId: string | null,
  addId: string | null,
  ctx: RosterSwapContext,
): RosterSwapResult => {
  const { roster, rules } = ctx;

  if (!dropId && !addId) return { ok: false, error: "Nothing to change." };
  if (roster.length === 0)
    return { ok: false, error: "Draft your tribe in the app before making swaps." };

  if (dropId) {
    if (!roster.includes(dropId))
      return { ok: false, error: "That castaway isn't on your tribe." };
    if (!rules.canDropEliminated && ctx.eliminatedIds.has(dropId))
      return {
        ok: false,
        error: "Voted-out castaways stay on your tribe after the merge.",
      };
  }

  if (addId) {
    if (!ctx.seasonCastawayIds.has(addId))
      return { ok: false, error: "That castaway isn't in this season." };
    if (roster.includes(addId))
      return { ok: false, error: "That castaway is already on your tribe." };
    if (ctx.eliminatedIds.has(addId))
      return { ok: false, error: "That castaway has been voted out." };
  }

  let next = [...roster];
  if (dropId) next = next.filter((id) => id !== dropId);
  if (addId) next.push(addId);

  if (next.length > MAX_ROSTER)
    return {
      ok: false,
      error: `Your tribe is full — drop someone to bring someone in (max ${MAX_ROSTER}).`,
    };

  if (ctx.restrictionEnabled && ctx.seasonStarted) {
    const locked = getLatestLockedRoster(ctx.weeklyRosters);
    if (
      locked.length > 0 &&
      !isNetRosterChangeAllowed(locked, next, rules.swapsPerWeek)
    ) {
      return {
        ok: false,
        error:
          rules.swapsPerWeek === 1
            ? "One swap a week after the merge — you can only swap back the castaway you added."
            : `That's more than ${rules.swapsPerWeek} swaps this week. Swap one back to free a move.`,
      };
    }
  }

  return { ok: true, roster: next };
};
