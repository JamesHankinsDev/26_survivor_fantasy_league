/**
 * Per-season roster rules — how many swaps a week, and whether a voted-out
 * castaway can be dropped.
 *
 * Season 51 splits the season at the merge (`Season.mergeWeek`):
 *
 * | | pre-merge | post-merge |
 * |---|---|---|
 * | swaps per week | 2 | 1 |
 * | drop a voted-out castaway | yes | **no** — they're dead weight |
 *
 * The intent is a flexible early game and an unforgiving late one: by the finale
 * you may be down to one or two surviving castaways carrying the whole tribe.
 *
 * **A season with no `mergeWeek` set is treated as pre-merge all the way
 * through.** That's deliberate — an unset merge week must never silently apply
 * the stricter half of the rule and lock everyone's roster from week 1. Set the
 * real week from Admin → Seasons once it's known.
 */

/** Seasons before this one had one flat rule: 1 swap, no dropping the eliminated. */
const MERGE_RULES_FROM_SEASON = 51;

export interface RosterRules {
  /** Net roster changes allowed this week. */
  swapsPerWeek: number;
  /** May a voted-out castaway be dropped to free their slot? */
  canDropEliminated: boolean;
  /** Whether the merge has happened, for UI copy. */
  isPostMerge: boolean;
}

/** Legacy behaviour: one swap a week, voted-out castaways stuck forever. */
const LEGACY_RULES: RosterRules = {
  swapsPerWeek: 1,
  canDropEliminated: false,
  isPostMerge: false,
};

/**
 * Has the merge aired as of `week`?
 *
 * `mergeWeek` is the week the merge episode aired, so that week itself counts
 * as post-merge. An undefined merge week is never post-merge.
 */
export function isPostMerge(
  week: number | null | undefined,
  mergeWeek: number | null | undefined,
): boolean {
  if (typeof mergeWeek !== "number") return false;
  if (typeof week !== "number") return false;
  return week >= mergeWeek;
}

/**
 * Resolve the roster rules in force for a given season and week.
 *
 * `week` may be null when the caller doesn't know it yet (pre-season); that
 * reads as pre-merge, which is the permissive side.
 */
export function getRosterRules(
  seasonNumber: number,
  week: number | null | undefined,
  mergeWeek: number | null | undefined,
): RosterRules {
  if (seasonNumber < MERGE_RULES_FROM_SEASON) return LEGACY_RULES;

  const postMerge = isPostMerge(week, mergeWeek);
  return {
    swapsPerWeek: postMerge ? 1 : 2,
    canDropEliminated: !postMerge,
    isPostMerge: postMerge,
  };
}
