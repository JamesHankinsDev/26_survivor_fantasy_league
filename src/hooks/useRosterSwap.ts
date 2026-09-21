"use client";

import { useCallback } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { useQueryClient } from "@tanstack/react-query";
import { db } from "@/lib/firebase";
import { queryKeys } from "@/lib/query-client";
import type { League, TribeMember } from "@/types/league";
import { isNetRosterChangeAllowed, getLatestLockedRoster } from "@/utils/scoring";
import type { RosterRules } from "@/utils/rosterRules";

/** Sentinel `dropId` meaning "roll back to the last locked roster". */
export const RESET_SENTINEL = "__RESET_TO_PRIOR_WEEK__";

/**
 * Applies a weekly add/drop to one member's working roster.
 *
 * Lifted out of `/dashboard/my-leagues/[id]` so the swap can be performed from
 * anywhere the player already is — Home mounts the same sheet rather than
 * routing to the league page. The league page's own copy is gone; both callers
 * share this one, which keeps the net-change enforcement in a single place.
 *
 * Writes the *working* roster only. The Wednesday 8pm snapshot (`weeklyRosters`)
 * is written by the lock-rosters cron, and scoring reads that — so a swap made
 * before the deadline never retroactively changes a scored week.
 */
export function useRosterSwap(
  league: League | null | undefined,
  member: TribeMember | null | undefined,
  options: {
    /**
     * Enforce the league's one-net-change-per-week rule. League owners fixing
     * another member's roster bypass it, which is how the admin path has always
     * behaved.
     */
    enforceRestriction?: boolean;
    /**
     * Roster rules in force. Drives how many net changes are allowed — 2
     * pre-merge and 1 post-merge from S51. Defaults to the legacy single swap.
     */
    rules?: RosterRules;
  } = {},
) {
  const { enforceRestriction = true, rules } = options;
  const swapsPerWeek = rules?.swapsPerWeek ?? 1;
  const queryClient = useQueryClient();

  return useCallback(
    async (dropId: string | null, addId: string | null) => {
      if (!league || !member) throw new Error("Missing league or member info");

      const leagueRef = doc(db, "leagues", league.id);
      const writeRoster = async (roster: string[]) => {
        const updatedMembers = league.memberDetails.map((m) =>
          m.userId === member.userId ? { ...m, roster } : m,
        );
        await updateDoc(leagueRef, {
          memberDetails: updatedMembers,
          updatedAt: new Date(),
        });
        queryClient.invalidateQueries({
          queryKey: queryKeys.leagues.detail(league.id),
        });
        queryClient.invalidateQueries({ queryKey: queryKeys.leagues.all });
      };

      if (dropId === RESET_SENTINEL) {
        const previousRoster = getLatestLockedRoster(member.weeklyRosters || []);
        if (previousRoster.length === 0)
          throw new Error("No prior week roster to reset to.");
        await writeRoster(previousRoster);
        return;
      }

      let newRoster = [...(member.roster || [])];
      if (dropId) newRoster = newRoster.filter((id) => id !== dropId);
      if (addId) newRoster.push(addId);

      if (enforceRestriction && league.addDropRestrictionEnabled) {
        const previousRoster = getLatestLockedRoster(member.weeklyRosters || []);
        if (
          previousRoster.length > 0 &&
          !isNetRosterChangeAllowed(previousRoster, newRoster, swapsPerWeek)
        ) {
          throw new Error(
            swapsPerWeek === 1
              ? "One roster change per week after the merge. At least 4 of your 5 castaways must match last week."
              : `You get ${swapsPerWeek} roster changes per week before the merge. At least ${Math.max(0, previousRoster.length - swapsPerWeek)} of last week's castaways must stay.`,
          );
        }
      }

      await writeRoster(newRoster);
    },
    [league, member, queryClient, enforceRestriction, swapsPerWeek],
  );
}
