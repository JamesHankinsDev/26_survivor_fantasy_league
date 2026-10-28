/**
 * Pure live-score math shared by the leaderboard hooks and server routes.
 *
 * Points only count while a castaway is on a locked weekly roster: each
 * `weeklyRosters[i]` is paired with the episode of the same week number, and
 * only the castaways in that snapshot score for it.
 */
import type { ScoringEvent, TribeMember } from "@/types/league";
import { applyWeeklyFloor, getScoringConfig } from "@/utils/seasonScoringConfig";

/** `{ episodeNumber: { castawayId: points } }` */
export type EpisodeScoresMap = Record<number, Record<string, number>>;

/** Derive per-episode castaway points from castaway docs' `weeklyEvents`. */
export const buildEpisodeScoresMap = (
  castaways: Array<{ id: string; weeklyEvents?: Record<string, ScoringEvent[]> }>,
  seasonNumber: number,
): EpisodeScoresMap => {
  const config = getScoringConfig(seasonNumber);
  const map: EpisodeScoresMap = {};

  for (const castaway of castaways) {
    for (const [epStr, events] of Object.entries(castaway.weeklyEvents || {})) {
      const epNum = parseInt(epStr);
      if (!map[epNum]) map[epNum] = {};
      let total = 0;
      for (const event of events) {
        total += event.count * (config[event.eventType] || 0);
      }
      map[epNum][castaway.id] = total;
    }
  }

  return map;
};

/**
 * Recompute a member's total from weekly roster snapshots + live episode
 * scores, falling back to the stored total before any roster has locked.
 */
export const computeLiveTotal = (
  member: Pick<TribeMember, "weeklyRosters" | "totalPoints">,
  episodeScoresMap: EpisodeScoresMap,
  seasonNumber: number,
): number => {
  const weeklyRosters = member.weeklyRosters || [];
  if (weeklyRosters.length === 0) return member.totalPoints || 0;

  let liveTotal = 0;
  for (const roster of weeklyRosters) {
    const epScores = episodeScoresMap[roster.week] || {};
    let weekScore = 0;
    for (const castawayId of roster.castawayIds || []) {
      weekScore += epScores[castawayId] || 0;
    }
    // Same weekly floor the engine applies on write (S51+: no negative weeks).
    liveTotal += applyWeeklyFloor(weekScore, seasonNumber);
  }
  return liveTotal;
};
