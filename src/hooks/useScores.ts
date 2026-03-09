import { useMemo } from "react";
import { TribeMember } from "@/types/league";
import { useEpisodeScores, useEpisodeScoresPerEpisode } from "./useEpisodes";

export interface ComputedMember extends TribeMember {
  castawayPoints: Record<string, number>;
}

/**
 * Compute display data for league members.
 *
 * totalPoints is recomputed live from weekly roster snapshots + episode scores:
 *   For each locked weekly roster, sum the episode scores of rostered castaways.
 *   This ensures the leaderboard reflects the latest castaway scores even if
 *   the admin hasn't re-run score propagation.
 *
 * castawayPoints maps each rostered castaway to their season total (for display).
 */
export function useComputedScores(
  seasonNumber: number,
  members: TribeMember[],
) {
  const { data: castawaySeasonScores = {}, ...episodeQuery } = useEpisodeScores(seasonNumber);
  const { data: episodeScoresMap = {} } = useEpisodeScoresPerEpisode(seasonNumber);

  const computedMembers: ComputedMember[] = useMemo(() => {
    return members.map((member) => {
      // Build per-castaway points from their current roster's season scores
      const castawayPoints: Record<string, number> = {};
      for (const castawayId of member.roster || []) {
        castawayPoints[castawayId] = castawaySeasonScores[castawayId] || 0;
      }

      // Recompute totalPoints from weekly roster snapshots + live episode scores.
      // Each weekly roster maps to an episode; sum each rostered castaway's
      // episode score for that week.
      const weeklyRosters = member.weeklyRosters || [];
      let liveTotal = 0;

      if (weeklyRosters.length > 0) {
        for (const roster of weeklyRosters) {
          const epScores = episodeScoresMap[roster.week] || {};
          let weekScore = 0;
          for (const castawayId of roster.castawayIds || []) {
            weekScore += epScores[castawayId] || 0;
          }
          liveTotal += weekScore;
        }
      }

      // Use the live-computed total if we have weekly rosters, otherwise
      // fall back to the stored value (covers pre-roster-lock / draft phase).
      const totalPoints = weeklyRosters.length > 0 ? liveTotal : (member.totalPoints || 0);

      return {
        ...member,
        totalPoints,
        castawayPoints,
      };
    });
  }, [members, castawaySeasonScores, episodeScoresMap]);

  return {
    computedMembers,
    castawaySeasonScores,
    isLoading: episodeQuery.isLoading,
  };
}
