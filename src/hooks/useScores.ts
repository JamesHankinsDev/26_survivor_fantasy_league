import { useMemo } from "react";
import { TribeMember } from "@/types/league";
import { useEpisodeScores, useEpisodeScoresPerEpisode } from "./useEpisodes";
import { computeLiveTotal } from "@/utils/liveScores";

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

      // Recomputed live from weekly roster snapshots + episode scores, so the
      // leaderboard reflects the latest castaway scores even before the admin
      // re-runs score propagation.
      const totalPoints = computeLiveTotal(member, episodeScoresMap, seasonNumber);

      return {
        ...member,
        totalPoints,
        castawayPoints,
      };
    });
  }, [members, castawaySeasonScores, episodeScoresMap, seasonNumber]);

  return {
    computedMembers,
    castawaySeasonScores,
    isLoading: episodeQuery.isLoading,
  };
}
