import type { League } from "@/types/league";
import { getSeasonStatus, type Season } from "@/data/seasons";

const STORAGE_KEY = "survivor:lastViewedLeagueId";

/**
 * Pick the league the dashboard should focus on, or `null` if none qualifies.
 *
 * "Active" here means: the league's season is currently in play *or* upcoming
 * (i.e., not concluded). Concluded-only league rosters fall back to the
 * multi-season hub so users can still review archived final standings.
 *
 * Preference order:
 *   1. localStorage `survivor:lastViewedLeagueId` — set by `<LeagueSwitcher />`
 *      whenever the user visits `/dashboard/my-leagues/{id}`. Wins so the
 *      dashboard tracks the league the user just looked at.
 *   2. First non-concluded league in `leagues`.
 *
 * `storage` is an explicit param so this function is testable. Pass `null`
 * server-side / when localStorage is unavailable.
 */
export function pickActiveLeague(
  leagues: League[],
  seasons: Season[],
  storage: Storage | null = typeof window !== "undefined"
    ? window.localStorage
    : null,
): League | null {
  const seasonById = new Map<number, Season>();
  for (const s of seasons) seasonById.set(s.number, s);
  const notConcluded = (l: League): boolean => {
    const s = seasonById.get(l.seasonNumber);
    if (!s) return false;
    const status = getSeasonStatus(s);
    return status !== "past";
  };

  const eligible = leagues.filter(notConcluded);
  if (eligible.length === 0) return null;

  const stored = storage?.getItem(STORAGE_KEY);
  if (stored) {
    const match = eligible.find((l) => l.id === stored);
    if (match) return match;
  }
  return eligible[0];
}
