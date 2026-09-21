import { useMemo } from "react";
import { ScoringEventType } from "@/types/league";
import { getScoringConfig } from "@/utils/seasonScoringConfig";
import { useSeasonCastaways } from "./useCastaways";

export interface CastawayEventSummary {
  eventType: ScoringEventType;
  count: number;
  points: number;
}

/**
 * Derive per-castaway total scores from castaway docs (which now store weeklyEvents).
 * Returns Record<castawayId, totalPoints>
 */
export function useEpisodeScores(seasonNumber: number) {
  const { data: castaways = [], ...rest } = useSeasonCastaways(seasonNumber);

  const scores = useMemo(() => {
    const map: Record<string, number> = {};
    for (const c of castaways) {
      map[c.id] = c.totalPoints;
    }
    return map;
  }, [castaways]);

  return { data: scores, ...rest };
}

/**
 * Derive per-episode score breakdowns from castaway weeklyEvents.
 * Returns { episodeNumber: { castawayId: points } }
 */
export function useEpisodeScoresPerEpisode(seasonNumber: number) {
  const { data: castaways = [], ...rest } = useSeasonCastaways(seasonNumber);

  const scoresMap = useMemo(() => {
    const config = getScoringConfig(seasonNumber);
    const map: Record<number, Record<string, number>> = {};

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
  }, [castaways, seasonNumber]);

  return { data: scoresMap, ...rest };
}

/**
 * Derive aggregated scoring events per castaway across all episodes.
 * Returns { castawayId: CastawayEventSummary[] }
 */
export function useEpisodeEventsByCastaway(seasonNumber: number) {
  const { data: castaways = [], ...rest } = useSeasonCastaways(seasonNumber);

  const eventsMap = useMemo(() => {
    const config = getScoringConfig(seasonNumber);
    const result: Record<string, CastawayEventSummary[]> = {};

    for (const castaway of castaways) {
      const totals: Record<ScoringEventType, number> = {} as Record<ScoringEventType, number>;

      for (const events of Object.values(castaway.weeklyEvents || {})) {
        for (const event of events) {
          totals[event.eventType] = (totals[event.eventType] || 0) + event.count;
        }
      }

      const summaries = Object.entries(totals)
        .filter(([, count]) => count > 0)
        .map(([eventType, count]) => ({
          eventType: eventType as ScoringEventType,
          count,
          points: count * (config[eventType as ScoringEventType] ?? 0),
        }));

      if (summaries.length > 0) {
        result[castaway.id] = summaries;
      }
    }

    return result;
  }, [castaways, seasonNumber]);

  return { data: eventsMap, ...rest };
}
