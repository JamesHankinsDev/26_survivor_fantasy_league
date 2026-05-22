/**
 * Per-season scoring configuration.
 *
 * Each season carries its own point values for the event catalog plus optional
 * rules like a weekly score floor. New seasons should be added here rather than
 * mutating SCORING_CONFIG, which is the legacy / S50 baseline.
 *
 * Source of truth for the Season 51 rule proposal — backtest + modal both read
 * from here.
 */

import { ScoringEventType } from "@/types/league";

export type ScoringConfig = Record<ScoringEventType, number>;

export const SEASON_SCORING: Record<number, ScoringConfig> = {
  50: {
    immunity_win: 5,
    team_challenge_win: 3,
    found_idol: 5,
    found_advantage: 0, // not tracked in S50 — events of this type score nothing
    used_idol_successfully: 3,
    used_advantage_successfully: 0, // not tracked in S50
    voted_at_tribal: 3,
    survived_episode: 1,
    fire_making_win: 5,
    made_final_three: 5,
    season_winner: 10,
    made_jury: 3,
    voted_out: -10,
  },
  51: {
    immunity_win: 5,
    team_challenge_win: 3,
    found_idol: 5,
    found_advantage: 2, // NEW — separates advantages from idols
    used_idol_successfully: 3,
    used_advantage_successfully: 1, // NEW
    voted_at_tribal: 3,
    survived_episode: 0, // REMOVED — was +1 in S50
    fire_making_win: 5,
    made_final_three: 10, // bumped from +5
    season_winner: 25, // bumped from +10
    made_jury: 3,
    voted_out: -5, // softened from -10
  },
};

/**
 * Optional rules other than per-event points. Empty for S50.
 * S51 introduces a weekly score floor of 0 — no team finishes a week negative.
 */
export interface SeasonRuleExtras {
  /** Floor applied to each weekly roster score AFTER summing rostered castaways. */
  weeklyScoreFloor?: number;
}

export const SEASON_RULES: Record<number, SeasonRuleExtras> = {
  50: {},
  51: { weeklyScoreFloor: 0 },
};

/** Returns the scoring config for a given season; defaults to S51 if unknown. */
export const getScoringConfig = (seasonNumber: number): ScoringConfig =>
  SEASON_SCORING[seasonNumber] ?? SEASON_SCORING[51];

/** Returns the rule extras for a given season; defaults to empty if unknown. */
export const getSeasonRuleExtras = (seasonNumber: number): SeasonRuleExtras =>
  SEASON_RULES[seasonNumber] ?? {};

/**
 * Apply the per-season weekly floor (if any) to a raw weekly score.
 * Used by the backtest and by S51+ scoring paths.
 */
export const applyWeeklyFloor = (
  weekScore: number,
  seasonNumber: number,
): number => {
  const extras = getSeasonRuleExtras(seasonNumber);
  if (typeof extras.weeklyScoreFloor !== "number") return weekScore;
  return Math.max(extras.weeklyScoreFloor, weekScore);
};

/** Calculate total points for a list of events under a specific season's rules. */
export const calculatePointsFromEventsForSeason = (
  events: Array<{ eventType: ScoringEventType; count: number }>,
  seasonNumber: number,
): number => {
  const config = getScoringConfig(seasonNumber);
  return events.reduce(
    (sum, e) => sum + (config[e.eventType] ?? 0) * e.count,
    0,
  );
};
