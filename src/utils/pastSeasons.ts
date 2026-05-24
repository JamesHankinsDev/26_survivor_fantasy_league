import type { League, TribeMember } from "@/types/league";
import type { Season } from "@/data/seasons";
import { getSeasonStatus } from "@/data/seasons";

export interface PastSeasonEntry {
  /** League this snapshot belongs to (for display + scoping the modal). */
  leagueId: string;
  leagueName: string;
  /** Season number whose data this entry represents. */
  seasonNumber: number;
  /** Final memberDetails for that season — for the standings table + recap. */
  memberDetails: TribeMember[];
  /** True if drawn from league.seasonArchive (vs live data on a concluded league). */
  fromArchive: boolean;
}

/**
 * Enumerate every past-season payload the user can replay from the home page.
 *
 * Pulls from two places per league:
 *  1. `league.seasonArchive` — explicit snapshots written by the carry-over
 *     flow when the league adopted a new season.
 *  2. The live `league.memberDetails` when the league's *current* season has
 *     already concluded but the league hasn't been carried over yet — so the
 *     user can still see their final standings before/instead of adopting.
 *
 * Entries are deduplicated on (leagueId, seasonNumber), preferring the archive
 * snapshot. Sorted by league name (asc), then season number (desc).
 */
export function listPastSeasons(
  leagues: League[],
  seasons: Season[],
): PastSeasonEntry[] {
  const seasonStatus = new Map<number, ReturnType<typeof getSeasonStatus>>();
  for (const s of seasons) seasonStatus.set(s.number, getSeasonStatus(s));

  const out: PastSeasonEntry[] = [];
  const seen = new Set<string>();
  const key = (leagueId: string, seasonNumber: number) =>
    `${leagueId}::${seasonNumber}`;

  for (const l of leagues) {
    // 1. Archive snapshots written by carry-over.
    for (const [snStr, snap] of Object.entries(l.seasonArchive ?? {})) {
      const sn = Number(snStr);
      if (Number.isNaN(sn)) continue;
      const k = key(l.id, sn);
      if (seen.has(k)) continue;
      seen.add(k);
      out.push({
        leagueId: l.id,
        leagueName: l.name,
        seasonNumber: sn,
        memberDetails: snap.memberDetails,
        fromArchive: true,
      });
    }

    // 2. Live league still pointing at a concluded season — surface its
    //    in-flight memberDetails as a past-season entry too.
    if (seasonStatus.get(l.seasonNumber) === "past") {
      const k = key(l.id, l.seasonNumber);
      if (!seen.has(k)) {
        seen.add(k);
        out.push({
          leagueId: l.id,
          leagueName: l.name,
          seasonNumber: l.seasonNumber,
          memberDetails: l.memberDetails ?? [],
          fromArchive: false,
        });
      }
    }
  }

  out.sort(
    (a, b) =>
      a.leagueName.localeCompare(b.leagueName) ||
      b.seasonNumber - a.seasonNumber,
  );
  return out;
}
