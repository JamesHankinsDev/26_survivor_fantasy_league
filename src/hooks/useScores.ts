import { useMemo } from "react";
import { TribeMember } from "@/types/league";
import { useEpisodeScores } from "./useEpisodes";

export interface ComputedMember extends TribeMember {
  castawayPoints: Record<string, number>;
}

/**
 * Compute display data for league members.
 * totalPoints is now stored directly on each member (sum of weekScores).
 * castawayPoints maps each rostered castaway to their season total (for display).
 */
export function useComputedScores(
  seasonNumber: number,
  members: TribeMember[],
) {
  const { data: castawaySeasonScores = {}, ...episodeQuery } = useEpisodeScores(seasonNumber);

  const computedMembers: ComputedMember[] = useMemo(() => {
    return members.map((member) => {
      // Build per-castaway points from their current roster's season scores
      const castawayPoints: Record<string, number> = {};
      for (const castawayId of member.roster || []) {
        castawayPoints[castawayId] = castawaySeasonScores[castawayId] || 0;
      }

      return {
        ...member,
        castawayPoints,
      };
    });
  }, [members, castawaySeasonScores]);

  return {
    computedMembers,
    castawaySeasonScores,
    isLoading: episodeQuery.isLoading,
  };
}
