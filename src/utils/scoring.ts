/**
 * Scoring utilities for Survivor Fantasy League
 *
 * New model:
 * - Events are stored on each castaway doc (weeklyEvents keyed by episode number)
 * - WeeklyRoster snapshots include weekScore (points earned that week)
 * - TribeMember.totalPoints = sum of all weeklyRoster weekScores
 * - Eliminated status is a boolean on the castaway doc
 */

import { WeeklyRoster, TribeMember, ScoringEvent } from "@/types/league";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc, collection, getDocs, writeBatch } from "firebase/firestore";
import { dbLogger } from "@/lib/logger";
import { calculatePointsFromEvents } from "@/utils/eventScoringConfig";

/**
 * Get the current week based on Wednesday 8pm ET locks.
 * Week 1 = premiere week (scouting), Week 2+ = scoring weeks.
 */
export const getCurrentWeek = (seasonStartDate: Date): number => {
  const now = new Date();

  if (now < seasonStartDate) {
    return 0; // Before season
  }

  const wednesdayEightPm = new Date(seasonStartDate);
  wednesdayEightPm.setHours(20, 0, 0, 0);

  let weekOffset = 0;
  let currentWeekDeadline = new Date(wednesdayEightPm);

  while (now > currentWeekDeadline) {
    weekOffset++;
    currentWeekDeadline = new Date(wednesdayEightPm);
    currentWeekDeadline.setDate(wednesdayEightPm.getDate() + 7 * weekOffset);
  }

  return weekOffset;
};

/**
 * Get available castaways for add/drop (not on current roster, not eliminated)
 */
export const getAvailableCastaways = (
  allCastaways: Array<{ id: string; name: string }>,
  currentRoster: string[],
  eliminatedCastawayIds: string[],
): Array<{ id: string; name: string }> => {
  const rosterSet = new Set(currentRoster);
  const eliminatedSet = new Set(eliminatedCastawayIds);

  return allCastaways.filter(
    (c) => !rosterSet.has(c.id) && !eliminatedSet.has(c.id),
  );
};

/**
 * Check if net roster change is allowed (max 1 change from previous week).
 * Returns true if at least 4 out of 5 castaways are the same as last week.
 */
export const isNetRosterChangeAllowed = (
  previousRoster: string[],
  proposedRoster: string[],
): boolean => {
  const sameCount = previousRoster.filter((id) => proposedRoster.includes(id)).length;
  return sameCount >= 4;
};

/**
 * Get the most recent locked roster for a team member.
 * Returns the weeklyRoster with the highest week number.
 */
export const getLatestLockedRoster = (
  weeklyRosters: WeeklyRoster[],
): string[] => {
  if (weeklyRosters.length === 0) return [];
  const sorted = [...weeklyRosters].sort((a, b) => b.week - a.week);
  return sorted[0].castawayIds || [];
};

/**
 * @deprecated Use getLatestLockedRoster instead.
 * Get the previous week's locked roster for a team member.
 */
export const getPreviousWeekRoster = (
  weeklyRosters: WeeklyRoster[],
  _currentWeek: number,
): string[] => {
  return getLatestLockedRoster(weeklyRosters);
};

/**
 * Lock rosters for a league — snapshot each member's current working roster
 * into their weeklyRosters array for the given week number.
 * weekScore is set to 0 initially (updated when episode is scored).
 */
export const lockRostersForLeague = async (
  leagueId: string,
  weekNumber: number,
): Promise<number> => {
  const leagueRef = doc(db, "leagues", leagueId);
  const leagueDoc = await getDoc(leagueRef);

  if (!leagueDoc.exists()) {
    throw new Error("League not found");
  }

  const league = leagueDoc.data();
  const memberDetails: TribeMember[] = league.memberDetails || [];

  const updatedMembers = memberDetails.map((member) => {
    const weeklyRosters = member.weeklyRosters || [];

    // Normalize roster from old RosterEntry[] format if needed
    let roster: string[] = member.roster || [];
    if (roster.length > 0 && typeof roster[0] === "object" && (roster[0] as any).castawayId) {
      roster = (roster as any[])
        .filter((r) => r.status === "active")
        .map((r) => r.castawayId);
    }

    const existingIndex = weeklyRosters.findIndex((w) => w.week === weekNumber);

    const newSnapshot: WeeklyRoster = {
      week: weekNumber,
      castawayIds: roster,
      weekScore: 0,
      lockedAt: new Date(),
    };

    if (existingIndex !== -1) {
      weeklyRosters[existingIndex] = newSnapshot;
    } else {
      weeklyRosters.push(newSnapshot);
    }

    return {
      ...member,
      weeklyRosters,
    };
  });

  await updateDoc(leagueRef, {
    memberDetails: updatedMembers,
    updatedAt: new Date(),
  });

  return updatedMembers.length;
};

/**
 * Save episode events to castaway docs and update league member scores.
 *
 * 1. Writes events to each castaway's weeklyEvents[episodeNumber]
 * 2. Updates each castaway's totalPoints
 * 3. For each target league, calculates weekScore for the matching weekly roster
 * 4. Updates each member's totalPoints (sum of all weekScores)
 */
export const saveEpisodeScores = async (
  seasonNumber: number,
  episodeNumber: number,
  castawayEvents: Record<string, ScoringEvent[]>, // { castawayId: events[] }
  targetLeagueIds: string[],
): Promise<void> => {
  // 1. Load all castaway docs to get previous state for delta calculation
  const castawaysRef = collection(db, "seasons", seasonNumber.toString(), "castaways");
  const castawaysSnap = await getDocs(castawaysRef);
  const castawayDocs = new Map<string, any>();
  castawaysSnap.forEach((d) => castawayDocs.set(d.id, d.data()));

  // 2. Batch update castaway docs with new events and recalculated totalPoints
  const batch = writeBatch(db);
  const episodeScores: Record<string, number> = {}; // castawayId -> points this episode

  for (const [castawayId, events] of Object.entries(castawayEvents)) {
    const existingData = castawayDocs.get(castawayId);
    if (!existingData) continue;

    const weeklyEvents = { ...(existingData.weeklyEvents || {}) };
    weeklyEvents[episodeNumber.toString()] = events;

    // Recalculate totalPoints from all weekly events
    let totalPoints = 0;
    for (const epEvents of Object.values(weeklyEvents) as ScoringEvent[][]) {
      totalPoints += calculatePointsFromEvents(epEvents);
    }

    const epPoints = calculatePointsFromEvents(events);
    episodeScores[castawayId] = epPoints;

    const castawayRef = doc(db, "seasons", seasonNumber.toString(), "castaways", castawayId);
    batch.update(castawayRef, {
      weeklyEvents,
      totalPoints,
    });
  }

  await batch.commit();

  // 3. Update league member scores
  for (const leagueId of targetLeagueIds) {
    await updateLeagueWeekScores(leagueId, episodeNumber, episodeScores);
  }
};

/**
 * Update weekScore on matching weekly roster and recalculate member totalPoints.
 */
const updateLeagueWeekScores = async (
  leagueId: string,
  episodeNumber: number,
  episodeScores: Record<string, number>,
): Promise<void> => {
  const leagueRef = doc(db, "leagues", leagueId);
  const leagueDoc = await getDoc(leagueRef);

  if (!leagueDoc.exists()) {
    dbLogger.error(`League ${leagueId} not found`);
    return;
  }

  const league = leagueDoc.data();
  const memberDetails: TribeMember[] = league.memberDetails || [];

  const updatedMembers = memberDetails.map((member) => {
    const weeklyRosters = (member.weeklyRosters || []).map((roster) => {
      if (roster.week !== episodeNumber) return roster;

      // Calculate weekScore from rostered castaways' episode scores
      let weekScore = 0;
      for (const castawayId of roster.castawayIds) {
        weekScore += episodeScores[castawayId] || 0;
      }

      return { ...roster, weekScore };
    });

    // Recalculate totalPoints from all weekScores
    const totalPoints = weeklyRosters.reduce((sum, r) => sum + (r.weekScore || 0), 0);

    return { ...member, weeklyRosters, totalPoints };
  });

  await updateDoc(leagueRef, {
    memberDetails: updatedMembers,
    updatedAt: new Date(),
  });
};

/**
 * Toggle a castaway's eliminated status on their global doc.
 */
export const toggleCastawayEliminated = async (
  seasonNumber: number,
  castawayId: string,
  eliminated: boolean,
  eliminatedWeek?: number,
): Promise<void> => {
  const castawayRef = doc(db, "seasons", seasonNumber.toString(), "castaways", castawayId);
  const updateData: Record<string, any> = { eliminated };
  if (eliminated && eliminatedWeek !== undefined) {
    updateData.eliminatedWeek = eliminatedWeek;
  } else if (!eliminated) {
    updateData.eliminatedWeek = null;
  }
  await updateDoc(castawayRef, updateData);
};
