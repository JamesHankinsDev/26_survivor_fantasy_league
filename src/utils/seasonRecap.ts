/**
 * Season recap math — pure functions.
 *
 * Builds three highlights from a league's locked weekly rosters + the season's
 * castaway scores:
 *   - Podium: top 3 by final total points
 *   - Big Week: largest single-week score across (member, week) pairs
 *   - Big Climber: largest positive rank improvement from merge week to final week
 *
 * Trusts live castaway episode scores rather than stored `weekScore` snapshots,
 * matching the leaderboard's recomputation behavior in useComputedScores.
 */

import { TribeMember, assignRanks } from "@/types/league";

export interface PodiumEntry {
  member: TribeMember;
  rank: 1 | 2 | 3;
  totalPoints: number;
  isTied: boolean;
}

export interface BigWeekEntry {
  member: TribeMember;
  week: number;
  weekScore: number;
  /** Castaway IDs rostered for that week — useful for showing the lineup that delivered. */
  castawayIds: string[];
}

export interface BigClimberEntry {
  member: TribeMember;
  rankAtMerge: number;
  rankAtFinal: number;
  /** Positive number of positions climbed (final rank lower = climbed). */
  climb: number;
}

export interface SeasonRecap {
  podium: PodiumEntry[];
  bigWeek: BigWeekEntry | null;
  bigClimber: BigClimberEntry | null;
  /** Final week number reflected in the data. Useful for the climber panel copy. */
  finalWeek: number | null;
}

/**
 * Compute the score a member earned in a given week from their locked roster's
 * castaway IDs and the per-episode score map.
 */
function computeWeekScore(
  castawayIds: string[],
  episodeScores: Record<string, number>,
): number {
  let total = 0;
  for (const id of castawayIds) total += episodeScores[id] || 0;
  return total;
}

/**
 * Cumulative score for a member through a given week (inclusive).
 * Sums each week's roster × that week's episode scores.
 */
function cumulativeThroughWeek(
  member: TribeMember,
  throughWeek: number,
  episodeScoresMap: Record<number, Record<string, number>>,
): number {
  let total = 0;
  for (const wr of member.weeklyRosters || []) {
    if (wr.week > throughWeek) continue;
    total += computeWeekScore(wr.castawayIds || [], episodeScoresMap[wr.week] || {});
  }
  return total;
}

/**
 * Rank each member by their cumulative score through a given week.
 * Returns a map of userId -> rank (1 = leader, ties share rank).
 */
function ranksAtWeek(
  members: TribeMember[],
  throughWeek: number,
  episodeScoresMap: Record<number, Record<string, number>>,
): Map<string, number> {
  const snapshots: TribeMember[] = members.map((m) => ({
    ...m,
    totalPoints: cumulativeThroughWeek(m, throughWeek, episodeScoresMap),
  }));
  const ranked = assignRanks(snapshots);
  const map = new Map<string, number>();
  for (const r of ranked) map.set(r.userId, r.rank);
  return map;
}

export function computeSeasonRecap(
  members: TribeMember[],
  episodeScoresMap: Record<number, Record<string, number>>,
  mergeWeek: number,
): SeasonRecap {
  // Determine the final week reflected in the data (largest week with locked rosters).
  let finalWeek = 0;
  for (const m of members) {
    for (const wr of m.weeklyRosters || []) {
      if (wr.week > finalWeek) finalWeek = wr.week;
    }
  }
  if (finalWeek === 0) {
    return { podium: [], bigWeek: null, bigClimber: null, finalWeek: null };
  }

  // --- Podium ---
  // Use live totals through the final week so we don't rely on potentially stale
  // member.totalPoints.
  const liveTotals = members.map((m) => ({
    ...m,
    totalPoints: cumulativeThroughWeek(m, finalWeek, episodeScoresMap),
  }));
  const ranked = assignRanks(liveTotals);
  const podium: PodiumEntry[] = ranked
    .filter((r) => r.rank <= 3)
    .slice(0, 3)
    .map((r) => ({
      member: r,
      rank: r.rank as 1 | 2 | 3,
      totalPoints: r.totalPoints,
      isTied: r.isTied,
    }));

  // --- Big Week ---
  let bigWeek: BigWeekEntry | null = null;
  for (const m of members) {
    for (const wr of m.weeklyRosters || []) {
      const score = computeWeekScore(
        wr.castawayIds || [],
        episodeScoresMap[wr.week] || {},
      );
      // Tie-break: keep the most recent week (later week wins on equal score).
      if (!bigWeek || score > bigWeek.weekScore || (score === bigWeek.weekScore && wr.week > bigWeek.week)) {
        bigWeek = {
          member: m,
          week: wr.week,
          weekScore: score,
          castawayIds: wr.castawayIds || [],
        };
      }
    }
  }
  // If the best week was 0 pts, suppress — celebrating "nobody earned anything" is odd.
  if (bigWeek && bigWeek.weekScore <= 0) bigWeek = null;

  // --- Big Climber (post-merge only) ---
  let bigClimber: BigClimberEntry | null = null;
  if (finalWeek > mergeWeek) {
    const mergeRanks = ranksAtWeek(members, mergeWeek, episodeScoresMap);
    const finalRanks = ranksAtWeek(members, finalWeek, episodeScoresMap);

    for (const m of members) {
      const rankAtMerge = mergeRanks.get(m.userId);
      const rankAtFinal = finalRanks.get(m.userId);
      if (rankAtMerge == null || rankAtFinal == null) continue;
      const climb = rankAtMerge - rankAtFinal;
      if (climb <= 0) continue; // not a climber
      if (!bigClimber || climb > bigClimber.climb) {
        bigClimber = { member: m, rankAtMerge, rankAtFinal, climb };
      }
    }
  }

  return { podium, bigWeek, bigClimber, finalWeek };
}
