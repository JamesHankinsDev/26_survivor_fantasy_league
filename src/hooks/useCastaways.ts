import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-client";
import { db } from "@/lib/firebase";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import { Castaway } from "@/types/castaway";
import { useAuth } from "@/lib/auth-context";
import { DEMO_CASTAWAYS } from "@/data/demo-data";

/**
 * Fetch castaways for a specific season from global seasons collection
 * Path: seasons/{seasonNumber}/castaways
 * Each castaway doc now includes: totalPoints, eliminated, weeklyEvents
 * Cached for 2 minutes (updates during episodes)
 */
export function useSeasonCastaways(seasonNumber: number) {
  const { isDemoMode } = useAuth();

  return useQuery({
    queryKey: isDemoMode
      ? ["demo", "castaways", seasonNumber]
      : queryKeys.castaways.season(seasonNumber),
    queryFn: async () => {
      if (isDemoMode) return DEMO_CASTAWAYS;

      const snapshot = await getDocs(
        collection(db, "seasons", seasonNumber.toString(), "castaways")
      );
      return snapshot.docs.map((d) => ({
        id: d.id,
        totalPoints: 0,
        eliminated: false,
        weeklyEvents: {},
        ...d.data(),
      })) as Castaway[];
    },
    staleTime: isDemoMode ? Infinity : 2 * 60 * 1000,
  });
}

/**
 * Fetch a single castaway by ID from a season
 * Cached for 2 minutes
 */
export function useCastaway(seasonNumber: number, castawayId: string | null) {
  return useQuery({
    queryKey: queryKeys.castaways.detail(castawayId || ""),
    queryFn: async () => {
      if (!castawayId) return null;

      const snap = await getDoc(
        doc(db, "seasons", seasonNumber.toString(), "castaways", castawayId)
      );
      if (!snap.exists()) {
        throw new Error("Castaway not found");
      }

      return {
        id: snap.id,
        totalPoints: 0,
        eliminated: false,
        weeklyEvents: {},
        ...snap.data(),
      } as Castaway;
    },
    enabled: !!castawayId,
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Derive eliminated castaway IDs from season castaways data.
 * No separate query needed — uses the castaway docs directly.
 */
export function useEliminatedCastaways(seasonNumber: number) {
  const { data: castaways = [], ...rest } = useSeasonCastaways(seasonNumber);

  const eliminatedIds = useMemo(
    () => castaways.filter((c) => c.eliminated).map((c) => c.id),
    [castaways]
  );

  return { data: eliminatedIds, ...rest };
}

/**
 * Derive a castawayId -> totalPoints map from season castaways data.
 */
export function useCastawayScores(seasonNumber: number) {
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
