import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-client";
import { db } from "@/lib/firebase";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import { Castaway } from "@/types/castaway";
import { loadEliminatedCastaways } from "@/utils/scoring";

/**
 * Fetch all castaways
 * Cached for 10 minutes (static data changes rarely)
 */
export function useCastaways() {
  return useQuery({
    queryKey: queryKeys.castaways.all,
    queryFn: async () => {
      const snapshot = await getDocs(collection(db, "castaways"));
      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Castaway[];
    },
    staleTime: 10 * 60 * 1000, // 10 minutes (static data)
  });
}

/**
 * Fetch castaways for a specific season
 * Cached for 10 minutes
 */
export function useSeasonCastaways(seasonNumber: number) {
  return useQuery({
    queryKey: queryKeys.castaways.season(seasonNumber),
    queryFn: async () => {
      const snapshot = await getDocs(collection(db, "castaways"));
      const all = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Castaway[];

      return all.filter((c) => c.seasonNumber === seasonNumber);
    },
    staleTime: 10 * 60 * 1000,
  });
}

/**
 * Fetch a single castaway by ID
 * Cached for 10 minutes
 */
export function useCastaway(castawayId: string | null) {
  return useQuery({
    queryKey: queryKeys.castaways.detail(castawayId || ""),
    queryFn: async () => {
      if (!castawayId) return null;

      const snap = await getDoc(doc(db, "castaways", castawayId));
      if (!snap.exists()) {
        throw new Error("Castaway not found");
      }

      return {
        id: snap.id,
        ...snap.data(),
      } as Castaway;
    },
    enabled: !!castawayId,
    staleTime: 10 * 60 * 1000,
  });
}

/**
 * Fetch eliminated castaways for a league
 * Cached for 2 minutes (updates more frequently during episodes)
 */
export function useEliminatedCastaways(
  leagueId: string | null,
  seasonNumber: number
) {
  return useQuery({
    queryKey: queryKeys.castaways.eliminated(leagueId || "", seasonNumber),
    queryFn: async () => {
      if (!leagueId) return [];
      return loadEliminatedCastaways(leagueId, seasonNumber);
    },
    enabled: !!leagueId,
    staleTime: 2 * 60 * 1000, // 2 minutes (more dynamic data)
  });
}

/**
 * Usage Examples:
 *
 * // Fetch all castaways
 * const { data: castaways, isLoading } = useCastaways();
 *
 * // Fetch season-specific castaways
 * const { data: season50 } = useSeasonCastaways(50);
 *
 * // Fetch eliminated castaways
 * const { data: eliminated } = useEliminatedCastaways(leagueId, 50);
 *
 * // All queries automatically:
 * // - Cache results
 * // - Refetch in background when stale
 * // - Deduplicate identical requests
 * // - Share data across components
 */
