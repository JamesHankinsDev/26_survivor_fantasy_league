import { useCallback, useEffect, useMemo, useState } from "react";
import { doc, getDoc, updateDoc, arrayUnion } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { League } from "@/types/league";
import { useEpisodeScoresPerEpisode } from "./useEpisodes";
import { CURRENT_SEASON, isSeasonActive } from "@/data/seasons";
import { computeSeasonRecap, SeasonRecap } from "@/utils/seasonRecap";
import { dbLogger } from "@/lib/logger";

const recapKey = (leagueId: string, seasonNumber: number) =>
  `${leagueId}__${seasonNumber}`;

/**
 * Returns the computed recap for a concluded league plus helpers to track
 * whether the current user has seen it.
 *
 * `shouldAutoOpen` becomes true once we've confirmed the season is concluded
 * AND the user hasn't yet dismissed this league's recap. Call `markSeen()` when
 * the modal is dismissed.
 */
export function useSeasonRecap(league: League | null | undefined) {
  const { user, isDemoMode } = useAuth();

  const seasonNumber = CURRENT_SEASON.number;
  const mergeWeek = CURRENT_SEASON.mergeWeek ?? 0;
  const seasonConcluded = !isSeasonActive();

  const { data: episodeScoresMap = {}, isLoading: scoresLoading } =
    useEpisodeScoresPerEpisode(seasonNumber);

  const recap: SeasonRecap = useMemo(() => {
    if (!league || !seasonConcluded) {
      return { podium: [], bigWeek: null, bigClimber: null, finalWeek: null };
    }
    return computeSeasonRecap(
      league.memberDetails || [],
      episodeScoresMap,
      mergeWeek,
    );
  }, [league, episodeScoresMap, mergeWeek, seasonConcluded]);

  // Track whether the user has dismissed the recap for this league/season.
  // Local state mirrors the Firestore array; we load it once per user/league.
  const [seenLoaded, setSeenLoaded] = useState(false);
  const [hasSeen, setHasSeen] = useState(true); // Default to true → don't auto-open until we've confirmed otherwise.

  useEffect(() => {
    if (!user || !league || !seasonConcluded) return;
    let cancelled = false;

    const key = recapKey(league.id, seasonNumber);

    // Demo mode: cheap session-only tracking via sessionStorage so the modal
    // doesn't keep re-opening on every nav within a demo session.
    if (isDemoMode) {
      const seen =
        typeof window !== "undefined" &&
        window.sessionStorage.getItem(`demoRecapSeen:${key}`) === "1";
      setHasSeen(seen);
      setSeenLoaded(true);
      return;
    }

    (async () => {
      try {
        const snap = await getDoc(doc(db, "users", user.uid));
        if (cancelled) return;
        const data = snap.data() as { recapsSeen?: string[] } | undefined;
        const seen = (data?.recapsSeen || []).includes(key);
        setHasSeen(seen);
      } catch (err) {
        dbLogger.error("Failed to load recapsSeen flag:", err);
        // Fail safe: if we can't read the flag, don't auto-open (avoids spam).
        setHasSeen(true);
      } finally {
        if (!cancelled) setSeenLoaded(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user, league?.id, seasonNumber, seasonConcluded, isDemoMode]);

  const markSeen = useCallback(async () => {
    if (!user || !league) return;
    const key = recapKey(league.id, seasonNumber);
    setHasSeen(true);

    if (isDemoMode) {
      if (typeof window !== "undefined") {
        window.sessionStorage.setItem(`demoRecapSeen:${key}`, "1");
      }
      return;
    }

    try {
      await updateDoc(doc(db, "users", user.uid), {
        recapsSeen: arrayUnion(key),
      });
    } catch (err) {
      dbLogger.error("Failed to persist recapsSeen flag:", err);
    }
  }, [user, league?.id, seasonNumber, isDemoMode]);

  const hasContent = recap.podium.length > 0;

  return {
    recap,
    isLoading: scoresLoading || !seenLoaded,
    hasContent,
    seasonConcluded,
    /** Auto-open the modal only after we've confirmed the user hasn't seen it. */
    shouldAutoOpen:
      seasonConcluded && seenLoaded && !hasSeen && hasContent,
    markSeen,
  };
}
