import type {
  ArchivedSeason,
  League,
  TribeMember,
} from "@/types/league";

/**
 * Pure transformation: returns the league shape after a season carry-over.
 *
 * - Snapshots the current season's `memberDetails` into
 *   `seasonArchive[currentSeasonNumber]` so final standings stay viewable.
 * - Resets every member's per-season state: roster, weeklyRosters,
 *   totalPoints, draftedAt.
 * - Bumps `seasonNumber` to the target.
 * - Preserves identity-level fields (members, joinCode, ownerId, tribeColor,
 *   displayName, ownerName, avatar) so the league feels continuous.
 *
 * No Firestore I/O — callers do the `updateDoc` themselves.
 *
 * Throws on illegal moves:
 *  - target === current season (no-op carry-over)
 *  - league already has an archive entry for the current season
 *    (idempotency guard — prevents double-archiving)
 */
export function adoptNewSeason(
  league: League,
  targetSeasonNumber: number,
  archivedAt: Date = new Date(),
): League {
  if (targetSeasonNumber === league.seasonNumber) {
    throw new Error(
      `League is already on season ${league.seasonNumber}; nothing to adopt.`,
    );
  }
  const archiveKey = String(league.seasonNumber);
  if (league.seasonArchive?.[archiveKey]) {
    throw new Error(
      `League already has an archive entry for season ${league.seasonNumber}.`,
    );
  }

  const snapshot: ArchivedSeason = {
    seasonNumber: league.seasonNumber,
    archivedAt,
    // Deep-clone + strip undefined fields so the frozen snapshot is safe to
    // write to Firestore (which rejects undefined values by default).
    memberDetails: (league.memberDetails ?? []).map(cloneMember),
  };

  const resetMembers: TribeMember[] = (league.memberDetails ?? []).map(
    (m): TribeMember => {
      // Pull `draftedAt` out so it's omitted (not `undefined`) on the reset
      // member — Firestore throws on undefined-valued fields, which manifested
      // as the "click does nothing" bug since the write rejected silently.
      const { draftedAt: _draftedAt, ...rest } = m;
      void _draftedAt;
      return stripUndefined({
        ...rest,
        totalPoints: 0,
        roster: [],
        weeklyRosters: [],
      }) as TribeMember;
    },
  );

  return {
    ...league,
    seasonNumber: targetSeasonNumber,
    memberDetails: resetMembers,
    seasonArchive: {
      ...(league.seasonArchive ?? {}),
      [archiveKey]: snapshot,
    },
    updatedAt: archivedAt,
  };
}

function cloneMember(m: TribeMember): TribeMember {
  return stripUndefined({
    ...m,
    roster: [...(m.roster ?? [])],
    weeklyRosters: (m.weeklyRosters ?? []).map((wr) =>
      stripUndefined({
        ...wr,
        castawayIds: [...(wr.castawayIds ?? [])],
      }),
    ),
  }) as TribeMember;
}

/** Drop top-level keys whose value is `undefined`. Firestore rejects them. */
function stripUndefined<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Partial<T> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) out[k as keyof T] = v as T[keyof T];
  }
  return out;
}
