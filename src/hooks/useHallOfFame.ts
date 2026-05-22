import { useQuery } from "@tanstack/react-query";
import { collectionGroup, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Castaway } from "@/types/castaway";
import { getRarity } from "@/utils/cardRarity";
import { useAuth } from "@/lib/auth-context";
import { DEMO_CASTAWAYS } from "@/data/demo-data";

export interface HallOfFameEntry extends Castaway {
  /** Season the castaway competed in (denormalized for cross-season queries). */
  seasonNumber: number;
}

/**
 * Cross-season Hall of Fame: every legendary or mythic castaway across all
 * seasons, sorted by total points DESC.
 *
 * Reads via collection group on `castaways` (already indexed). Each doc must
 * carry `seasonNumber` — see scripts/backfill-season-number.ts.
 */
export function useHallOfFame() {
  const { isDemoMode } = useAuth();

  return useQuery({
    queryKey: isDemoMode ? ["demo", "hallOfFame"] : ["hallOfFame"],
    queryFn: async (): Promise<HallOfFameEntry[]> => {
      if (isDemoMode) {
        return DEMO_CASTAWAYS
          .map((c) => ({ ...c, seasonNumber: 50 }))
          .filter((c) => {
            const r = getRarity(c.totalPoints);
            return r === "legendary" || r === "mythic";
          })
          .sort((a, b) => b.totalPoints - a.totalPoints);
      }

      const snap = await getDocs(collectionGroup(db, "castaways"));
      const entries: HallOfFameEntry[] = [];

      snap.forEach((d) => {
        const data = d.data() as Partial<Castaway> & { seasonNumber?: number };
        const totalPoints = data.totalPoints ?? 0;
        const rarity = getRarity(totalPoints);
        if (rarity !== "legendary" && rarity !== "mythic") return;

        // Fall back to parent path if seasonNumber field is missing (pre-backfill data).
        const seasonNumber =
          typeof data.seasonNumber === "number"
            ? data.seasonNumber
            : parseInt(d.ref.parent.parent?.id ?? "0", 10);

        entries.push({
          id: d.id,
          totalPoints,
          eliminated: data.eliminated ?? false,
          weeklyEvents: data.weeklyEvents ?? {},
          ...data,
          seasonNumber,
        } as HallOfFameEntry);
      });

      entries.sort((a, b) => b.totalPoints - a.totalPoints);
      return entries;
    },
    staleTime: isDemoMode ? Infinity : 5 * 60 * 1000,
  });
}
