import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { collection, doc, getDocs, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { queryKeys } from "@/lib/query-client";
import {
  ALL_SEASONS,
  Season,
  SeasonOverride,
  applySeasonOverrides,
  mergeSeasonOverride,
  pickCurrentSeason,
} from "@/data/seasons";
import { useAuth } from "@/lib/auth-context";

/**
 * Loads every season override doc in one query and returns a number→override map.
 * Cached for 5 minutes; invalidated by useSaveSeasonOverride below.
 *
 * Demo mode returns empty overrides — demo seasons display from static values.
 */
function useSeasonOverridesMap() {
  const { isDemoMode } = useAuth();

  return useQuery({
    queryKey: isDemoMode ? ["demo", "seasonOverrides"] : queryKeys.seasons.overrides(),
    queryFn: async (): Promise<Record<number, SeasonOverride>> => {
      if (isDemoMode) return {};

      const snap = await getDocs(collection(db, "seasonOverrides"));
      const map: Record<number, SeasonOverride> = {};
      snap.forEach((d) => {
        const n = parseInt(d.id, 10);
        if (Number.isNaN(n)) return;
        map[n] = d.data() as SeasonOverride;
      });
      return map;
    },
    staleTime: isDemoMode ? Infinity : 5 * 60 * 1000,
  });
}

/**
 * Static seasons merged with Firestore overrides.
 *
 * Use this hook anywhere reactivity matters (Home page categorization,
 * leaderboard filtering, "launch season" toggles, etc.). For places that
 * genuinely don't need live updates (cron handler, scripts), the static
 * CURRENT_SEASON / ALL_SEASONS exports remain available.
 */
export function useSeasonsWithOverrides() {
  const { data: overrides = {}, isLoading } = useSeasonOverridesMap();

  const seasons = useMemo(() => applySeasonOverrides(overrides), [overrides]);
  const currentSeason = useMemo(() => pickCurrentSeason(seasons), [seasons]);
  const byNumber = useMemo(() => {
    const m = new Map<number, Season>();
    for (const s of seasons) m.set(s.number, s);
    return m;
  }, [seasons]);

  return {
    seasons,
    currentSeason,
    /** Look up a single season (merged) by its number. Falls back to static if not found. */
    getSeason: (n: number) =>
      byNumber.get(n) ??
      mergeSeasonOverride(
        ALL_SEASONS.find((s) => s.number === n) ?? ALL_SEASONS[0],
        overrides[n],
      ),
    overrides,
    isLoading,
  };
}

/**
 * Mutation: persist an admin edit to seasonOverrides/{number}. Merges with the
 * existing override doc so partial updates don't clobber unrelated fields.
 */
export function useSaveSeasonOverride() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      seasonNumber,
      override,
    }: {
      seasonNumber: number;
      override: SeasonOverride;
    }) => {
      await setDoc(doc(db, "seasonOverrides", String(seasonNumber)), override, {
        merge: true,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.seasons.overrides() });
    },
  });
}
