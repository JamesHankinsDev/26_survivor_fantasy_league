/**
 * Backtest: re-score a concluded league's weekly rosters under a different
 * season's rules and compare to the baseline.
 *
 * Both the source (baseline) and target totals are recomputed from the same
 * weekly-event data so the only difference between them is the rule set —
 * never a stale `totalPoints` field.
 */

import { ScoringEventType, TribeMember } from "@/types/league";
import {
  applyWeeklyFloor,
  getScoringConfig,
} from "@/utils/seasonScoringConfig";

export interface CastawayWeeklyEvent {
  eventType: ScoringEventType;
  count: number;
}

/** castawayId -> week -> events for that week */
export type CastawayWeeklyEvents = Map<string, Map<number, CastawayWeeklyEvent[]>>;

export interface BacktestWeekImpact {
  eventType: ScoringEventType;
  /** Total occurrences of this event across the team's rostered castaways this week. */
  eventCount: number;
  /** Points the event contributed under source rules. */
  sourcePoints: number;
  /** Points the event would contribute under target rules. */
  targetPoints: number;
  /** target - source. Positive = the rule change helped this team this week. */
  impact: number;
}

export interface BacktestWeek {
  week: number;
  sourceScore: number;
  targetScore: number;
  difference: number;
  /**
   * Per-event-type contributions to the difference, sorted by absolute impact
   * descending. Only event types whose rule actually changed appear.
   */
  impacts: BacktestWeekImpact[];
  /**
   * Net adjustment from the target season's weekly floor. Positive = floor
   * lifted a negative raw score up to the floor. 0 = floor didn't apply.
   */
  floorImpact: number;
}

export interface BacktestTeam {
  userId: string;
  teamName: string;
  sourceTotal: number;
  targetTotal: number;
  difference: number;
  percentChange: number;
  sourceRank: number;
  targetRank: number;
  /** Positive = climbed, negative = fell. */
  rankChange: number;
  weekly: BacktestWeek[];
}

export interface BacktestSummary {
  sourceSeasonNumber: number;
  targetSeasonNumber: number;
  teams: BacktestTeam[];
  averageSource: number;
  averageTarget: number;
  averageChange: number;
  biggestWinner: BacktestTeam | null;
  biggestLoser: BacktestTeam | null;
  rankShifts: Array<{ teamName: string; from: number; to: number; delta: number }>;
}

interface RecalculatedMember {
  sourceTotal: number;
  targetTotal: number;
  weekly: BacktestWeek[];
}

/**
 * Walk a member's locked weekly rosters and compute, for each week:
 *   - Source / target raw scores (and post-floor scores).
 *   - Per-event-type impact breakdown — the contribution of each rule whose
 *     point value differs between the two seasons.
 *   - Floor adjustment under the target ruleset, if any.
 *
 * Aggregates per-castaway events across the week's roster up front so the
 * breakdown reflects the team-level swing, not individual castaway noise.
 */
function recalculateMember(
  member: TribeMember,
  events: CastawayWeeklyEvents,
  sourceSeasonNumber: number,
  targetSeasonNumber: number,
): RecalculatedMember {
  const sourceConfig = getScoringConfig(sourceSeasonNumber);
  const targetConfig = getScoringConfig(targetSeasonNumber);

  const weekly: BacktestWeek[] = [];
  let sourceTotal = 0;
  let targetTotal = 0;

  for (const roster of member.weeklyRosters || []) {
    // Aggregate event counts across this week's rostered castaways.
    const eventCounts = new Map<ScoringEventType, number>();
    for (const castawayId of roster.castawayIds || []) {
      const wevents = events.get(castawayId)?.get(roster.week) ?? [];
      for (const e of wevents) {
        eventCounts.set(e.eventType, (eventCounts.get(e.eventType) ?? 0) + e.count);
      }
    }

    let sourceRaw = 0;
    let targetRaw = 0;
    const impacts: BacktestWeekImpact[] = [];

    for (const [eventType, count] of eventCounts) {
      const srcUnit = sourceConfig[eventType] ?? 0;
      const tgtUnit = targetConfig[eventType] ?? 0;
      const sourcePoints = srcUnit * count;
      const targetPoints = tgtUnit * count;
      sourceRaw += sourcePoints;
      targetRaw += targetPoints;
      // Only surface event types whose rule changed — unchanged rules contribute
      // 0 to the difference and would just be noise in the breakdown.
      if (srcUnit !== tgtUnit) {
        impacts.push({
          eventType,
          eventCount: count,
          sourcePoints,
          targetPoints,
          impact: targetPoints - sourcePoints,
        });
      }
    }

    const sourceScore = applyWeeklyFloor(sourceRaw, sourceSeasonNumber);
    const targetScore = applyWeeklyFloor(targetRaw, targetSeasonNumber);
    // Positive when the target's floor lifted a negative raw score up to 0.
    const floorImpact = targetScore - targetRaw;

    sourceTotal += sourceScore;
    targetTotal += targetScore;

    impacts.sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact));

    weekly.push({
      week: roster.week,
      sourceScore,
      targetScore,
      difference: targetScore - sourceScore,
      impacts,
      floorImpact,
    });
  }

  weekly.sort((a, b) => a.week - b.week);
  return { sourceTotal, targetTotal, weekly };
}

/**
 * Run the backtest for a single league.
 *
 * @param members  The league's tribe members with their locked weekly rosters.
 * @param events   Per-castaway, per-week event lists.
 * @param sourceSeasonNumber  Baseline rules (S50).
 * @param targetSeasonNumber  Proposed rules (S51).
 */
export function backtestLeague(
  members: TribeMember[],
  events: CastawayWeeklyEvents,
  sourceSeasonNumber: number,
  targetSeasonNumber: number,
): BacktestSummary {
  const teams: BacktestTeam[] = members.map((m) => {
    const r = recalculateMember(m, events, sourceSeasonNumber, targetSeasonNumber);
    const difference = r.targetTotal - r.sourceTotal;
    const percentChange =
      r.sourceTotal !== 0 ? (difference / Math.abs(r.sourceTotal)) * 100 : 0;

    return {
      userId: m.userId,
      teamName: m.displayName,
      sourceTotal: r.sourceTotal,
      targetTotal: r.targetTotal,
      difference,
      percentChange,
      sourceRank: 0, // filled below
      targetRank: 0, // filled below
      rankChange: 0, // filled below
      weekly: r.weekly,
    };
  });

  // Assign ranks under each ruleset.
  // Tie-break on team name to keep ordering deterministic for the recap UI.
  const sortBySource = [...teams].sort(
    (a, b) => b.sourceTotal - a.sourceTotal || a.teamName.localeCompare(b.teamName),
  );
  const sortByTarget = [...teams].sort(
    (a, b) => b.targetTotal - a.targetTotal || a.teamName.localeCompare(b.teamName),
  );
  const sourceRankByUser = new Map<string, number>();
  const targetRankByUser = new Map<string, number>();
  sortBySource.forEach((t, i) => sourceRankByUser.set(t.userId, i + 1));
  sortByTarget.forEach((t, i) => targetRankByUser.set(t.userId, i + 1));

  for (const t of teams) {
    t.sourceRank = sourceRankByUser.get(t.userId) ?? 0;
    t.targetRank = targetRankByUser.get(t.userId) ?? 0;
    // Positive rankChange = climbed (e.g. source rank 5 → target rank 2 = +3).
    t.rankChange = t.sourceRank - t.targetRank;
  }

  const totalTeams = teams.length;
  const averageSource =
    totalTeams === 0 ? 0 : teams.reduce((s, t) => s + t.sourceTotal, 0) / totalTeams;
  const averageTarget =
    totalTeams === 0 ? 0 : teams.reduce((s, t) => s + t.targetTotal, 0) / totalTeams;

  const sortedByDiff = [...teams].sort((a, b) => b.difference - a.difference);
  const biggestWinner = sortedByDiff[0] ?? null;
  const biggestLoser = sortedByDiff[sortedByDiff.length - 1] ?? null;

  const rankShifts = teams
    .filter((t) => t.rankChange !== 0)
    .map((t) => ({
      teamName: t.teamName,
      from: t.sourceRank,
      to: t.targetRank,
      delta: t.rankChange,
    }))
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));

  // Return teams ordered by source rank — matches how members saw the league
  // playing out under the original rules.
  teams.sort((a, b) => a.sourceRank - b.sourceRank);

  return {
    sourceSeasonNumber,
    targetSeasonNumber,
    teams,
    averageSource,
    averageTarget,
    averageChange: averageTarget - averageSource,
    biggestWinner,
    biggestLoser,
    rankShifts,
  };
}
