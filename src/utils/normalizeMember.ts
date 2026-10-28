import type { TribeMember } from "@/types/league";

/**
 * Normalize a TribeMember's roster from old RosterEntry[] format to string[].
 * Old format: roster was an array of objects with { castawayId, status, ... }
 * New format: roster is a plain string[] of castaway IDs.
 * Also ensures weeklyRosters defaults to [].
 */
export function normalizeMember(member: any): TribeMember {
  let roster = member.roster || [];
  // Detect old RosterEntry[] format (array of objects with castawayId)
  if (roster.length > 0 && typeof roster[0] === "object" && roster[0].castawayId) {
    roster = roster
      .filter((r: any) => r.status === "active")
      .map((r: any) => r.castawayId);
  }

  const weeklyRosters = member.weeklyRosters || [];

  // Preserve the stored totalPoints as-is; live recomputation is handled
  // exclusively by useComputedScores so every view uses the same number.
  const totalPoints = member.totalPoints ?? member.points ?? 0;

  // For existing data that predates ownerName, fall back to displayName
  const ownerName = member.ownerName || member.displayName || "";

  return {
    ...member,
    roster,
    weeklyRosters,
    totalPoints,
    ownerName,
  };
}
