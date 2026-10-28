"use client";

import { useCallback } from "react";
import { doc, runTransaction } from "firebase/firestore";
import { useQueryClient } from "@tanstack/react-query";
import { db } from "@/lib/firebase";
import { queryKeys } from "@/lib/query-client";
import type { League, TribeMember } from "@/types/league";
import { normalizeMember } from "@/utils/normalizeMember";
import {
  MAX_ROSTER,
  applyRosterChange,
  getLatestLockedRoster,
  isNetRosterChangeAllowed,
  type RosterChange,
} from "@/utils/rosterSwap";
import type { RosterRules } from "@/utils/rosterRules";

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
 *
 * The write runs in a transaction against the stored league, never the cached
 * copy: `memberDetails` is one array holding every member's roster, lock
 * snapshots and points, and writing back a cached copy (up to minutes old)
 * would silently revert anything written since — a second swap made before the
 * first had refetched, another player's move, or the Wednesday lock itself.
 */
export function useRosterSwap(
  league: League | null | undefined,
  member: TribeMember | null | undefined,
  options: {
    /**
     * Enforce the league's net-change-per-week rule. League owners fixing
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
    async (change: RosterChange) => {
      if (!league || !member) throw new Error("Missing league or member info");

      const leagueRef = doc(db, "leagues", league.id);
      await runTransaction(db, async (tx) => {
        const snap = await tx.get(leagueRef);
        if (!snap.exists()) throw new Error("League not found.");
        const raw = snap.data();
        const rawMembers: unknown[] = Array.isArray(raw.memberDetails) ? raw.memberDetails : [];
        const fresh = rawMembers
          .map(normalizeMember)
          .find((m) => m.userId === member.userId);
        if (!fresh) throw new Error("That tribe is no longer in this league.");
        const previousRoster = getLatestLockedRoster(fresh.weeklyRosters || []);

        let newRoster: string[];
        if ("reset" in change) {
          if (previousRoster.length === 0)
            throw new Error("No prior week roster to reset to.");
          newRoster = previousRoster;
        } else {
          const applied = applyRosterChange(fresh.roster || [], change.drops, change.adds);
          if (!applied.ok) throw new Error(applied.error);
          newRoster = applied.roster;

          if (newRoster.length > MAX_ROSTER)
            throw new Error(`Your tribe can hold at most ${MAX_ROSTER} castaways.`);
          if (
            enforceRestriction &&
            raw.addDropRestrictionEnabled &&
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

        // Replace only this member's `roster`; every other stored field is
        // written back exactly as read.
        const updatedMembers = rawMembers.map((m) =>
          normalizeMember(m).userId === member.userId
            ? { ...(m as object), roster: newRoster }
            : m,
        );
        tx.update(leagueRef, { memberDetails: updatedMembers, updatedAt: new Date() });
      });

      // Wait for the refetch so the sheet's next open (or the next swap) starts
      // from the saved tribe rather than the pre-swap cache.
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.leagues.detail(league.id) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.leagues.all }),
      ]);
    },
    [league, member, queryClient, enforceRestriction, swapsPerWeek],
  );
}
