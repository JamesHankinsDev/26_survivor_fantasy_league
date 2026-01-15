/**
 * Scoring utilities for Survivor Fantasy League
 * Handles point calculation, roster management, and weekly scoring
 */

import { RosterEntry, TribeMember } from "@/types/league";
import { db } from "@/lib/firebase";
import {
  collection,
  query,
  getDocs,
  setDoc,
  deleteDoc,
  doc,
} from "firebase/firestore";

/**
 * Calculate total points for a tribe member based on current roster and episode scores
 * Only counts points from castaways on the team at the time the score was earned
 */
export const calculateTribeTotalPoints = (
  tribeMember: TribeMember,
  episodeScoresMap: Record<number, Record<string, number>> // { episodeNum: { castawayId: points } }
): number => {
  let total = 0;

  // For each roster entry, accumulate points from episodes where they were active
  tribeMember.roster.forEach((entry) => {
    const droppedWeek = entry.droppedWeek || Infinity; // If never dropped, consider as Infinity

    // Sum points from all episodes where castaway was on this team
    Object.entries(episodeScoresMap).forEach(([episodeNumStr, scores]) => {
      const episodeNum = parseInt(episodeNumStr);

      // Count points only if castaway was added before or during this episode
      // AND not dropped before this episode (or never dropped)
      if (episodeNum >= entry.addedWeek && episodeNum < droppedWeek) {
        total += scores[entry.castawayId] || 0;
      }
    });
  });

  return total;
};

/**
 * Get the current week based on Wednesday 8pm locks
 * Week 0 = draft week, Week 1+ = post-episode weeks
 */
export const getCurrentWeek = (
  seasonStartDate: Date,
  seasonPremierDate: Date
): number => {
  const now = new Date();

  // If before season premiere, no weeks have started
  if (now < seasonPremierDate) {
    return 0; // Draft week
  }

  // Calculate weeks since premiere (each week is Wed 8pm to Wed 8pm)
  const wednesdayEightPm = new Date(seasonPremierDate);
  wednesdayEightPm.setHours(20, 0, 0, 0); // 8pm

  let weekOffset = 0;
  let currentWeekDeadline = new Date(wednesdayEightPm);

  while (now > currentWeekDeadline) {
    weekOffset++;
    currentWeekDeadline = new Date(wednesdayEightPm);
    currentWeekDeadline.setDate(currentWeekDeadline.getDate() + 7 * weekOffset);
  }

  return weekOffset;
};

/**
 * Get the next roster lock time (Wednesday 8pm)
 */
export const getNextRosterLockTime = (): Date => {
  const now = new Date();

  // Find the next Wednesday
  const daysUntilWednesday = (3 - now.getDay() + 7) % 7 || 7;
  const nextWednesday = new Date(now);
  nextWednesday.setDate(nextWednesday.getDate() + daysUntilWednesday);
  nextWednesday.setHours(20, 0, 0, 0); // 8pm

  // If we're already past 8pm on Wednesday, get next week's Wednesday
  if (now.getDay() === 3 && now.getHours() >= 20) {
    nextWednesday.setDate(nextWednesday.getDate() + 7);
  }

  return nextWednesday;
};

/**
 * Check if add/drop is allowed for a castaway
 */
export const canAddDropCastaway = (
  castaway: RosterEntry,
  currentWeek: number
): boolean => {
  // Cannot add/drop if eliminated
  if (castaway.status === "eliminated") {
    return false;
  }

  // If dropped, can't drop again
  if (castaway.status === "dropped") {
    return false;
  }

  return true;
};

/**
 * Get available castaways for add/drop (not on roster, not eliminated this week)
 */
export const getAvailableCastaways = (
  allCastaways: Array<{ id: string; name: string }>,
  currentRoster: RosterEntry[],
  eliminatedCastawayIds: string[]
): Array<{ id: string; name: string }> => {
  // Only filter out ACTIVE roster members and eliminated castaways
  // Dropped castaways should be available to re-add
  const activeRosterIds = new Set(
    currentRoster.filter((r) => r.status === "active").map((r) => r.castawayId)
  );
  const eliminatedSet = new Set(eliminatedCastawayIds);

  return allCastaways.filter(
    (c) => !activeRosterIds.has(c.id) && !eliminatedSet.has(c.id)
  );
};

/**
 * Apply an add/drop transaction to a roster
 */
export const applyAddDropTransaction = (
  roster: RosterEntry[],
  dropCastawayId: string | null,
  addCastawayId: string | null,
  currentWeek: number
): RosterEntry[] => {
  const newRoster = [...roster];

  // Handle drop
  if (dropCastawayId) {
    const dropIndex = newRoster.findIndex(
      (r) => r.castawayId === dropCastawayId
    );
    if (dropIndex !== -1) {
      newRoster[dropIndex].status = "dropped";
      newRoster[dropIndex].droppedWeek = currentWeek;
    }
  }

  // Handle add
  if (addCastawayId) {
    newRoster.push({
      castawayId: addCastawayId,
      status: "active",
      addedWeek: currentWeek,
      accumulatedPoints: 0,
    });
  }

  return newRoster;
};

/**
 * Format points for display with breakdown
 */
export const formatPointsBreakdown = (
  breakdown: Record<string, number>
): string => {
  return Object.entries(breakdown)
    .filter(([_, value]) => value > 0)
    .map(([key, value]) => `${key}: ${value}`)
    .join(" + ");
};

/**
 * Load eliminated castaways for a specific league from Firestore
 */
export const loadEliminatedCastaways = async (
  leagueId: string,
  seasonNumber: number
): Promise<string[]> => {
  try {
    const collectionRef = collection(
      db,
      `leagues/${leagueId}/seasons/${seasonNumber}/eliminated`
    );
    const q = query(collectionRef);
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => doc.id);
  } catch (err) {
    console.error("Error loading eliminated castaways:", err);
    return [];
  }
};

/**
 * Save a castaway as eliminated for a specific league
 */
export const saveEliminatedCastaway = async (
  leagueId: string,
  seasonNumber: number,
  castawayId: string
): Promise<void> => {
  try {
    const docRef = doc(
      db,
      `leagues/${leagueId}/seasons/${seasonNumber}/eliminated/${castawayId}`
    );
    await setDoc(docRef, {
      castawayId,
      eliminatedAt: new Date(),
    });
  } catch (err) {
    console.error("Error saving eliminated castaway:", err);
    throw err;
  }
};

/**
 * Remove a castaway from eliminated list for a specific league
 */
export const removeEliminatedCastaway = async (
  leagueId: string,
  seasonNumber: number,
  castawayId: string
): Promise<void> => {
  try {
    const docRef = doc(
      db,
      `leagues/${leagueId}/seasons/${seasonNumber}/eliminated/${castawayId}`
    );
    await deleteDoc(docRef);
  } catch (err) {
    console.error("Error removing eliminated castaway:", err);
    throw err;
  }
};
