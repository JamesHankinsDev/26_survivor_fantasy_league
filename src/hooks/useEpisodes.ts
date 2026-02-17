import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-client";
import { db } from "@/lib/firebase";
import { collection, getDocs } from "firebase/firestore";
import { EpisodeEvents } from "@/types/league";
import { calculatePointsFromEvents } from "@/utils/eventScoringConfig";

/**
 * Fetch episode scores for a league season
 * Returns accumulated points per castaway across all episodes
 * Cached for 2 minutes (updates during episodes)
 */
export function useEpisodeScores(
  leagueId: string | null,
  seasonNumber: number
) {
  return useQuery({
    queryKey: queryKeys.episodes.scores(leagueId || "", seasonNumber),
    queryFn: async () => {
      if (!leagueId) return {};

      const episodesRef = collection(
        db,
        "leagues",
        leagueId,
        "seasons",
        seasonNumber.toString(),
        "episodes"
      );

      const snapshot = await getDocs(episodesRef);
      const scores: Record<string, number> = {};

      snapshot.forEach((doc) => {
        const episode = doc.data() as EpisodeEvents;
        Object.entries(episode.events).forEach(([castawayId, events]) => {
          const points = calculatePointsFromEvents(events);
          scores[castawayId] = (scores[castawayId] || 0) + points;
        });
      });

      return scores;
    },
    enabled: !!leagueId,
    staleTime: 2 * 60 * 1000, // 2 minutes (more dynamic during episodes)
  });
}

/**
 * Usage Example:
 *
 * const { data: scores = {} } = useEpisodeScores(leagueId, seasonNumber);
 * // scores is Record<string, number> mapping castawayId to total points
 */
