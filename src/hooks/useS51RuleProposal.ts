import { useCallback, useEffect, useMemo, useState } from "react";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { League } from "@/types/league";
import { useSeasonCastaways } from "./useCastaways";
import { useSeasonsWithOverrides } from "./useSeasonsWithOverrides";
import { backtestLeague, BacktestSummary, CastawayWeeklyEvents } from "@/lib/backtest";
import { getSeasonStatus } from "@/data/seasons";
import { dbLogger } from "@/lib/logger";

const PROPOSAL_SLUG = "s51_rules";

/**
 * Drives the S50 → S51 rule-change pitch modal:
 *   - Loads the user's most-recent concluded league's data + castaway events
 *   - Builds the backtest comparing S50 totals to S51 totals
 *   - Tracks per-user dismissal via users/{uid}.proposalsSeen[s51_rules]
 *   - Becomes "should auto-open" only once S51 is still future and the user
 *     hasn't seen the pitch
 */
export function useS51RuleProposal(league: League | null | undefined) {
  const { user, isDemoMode } = useAuth();
  const { seasons } = useSeasonsWithOverrides();

  // S51 must still be upcoming for the proposal to make sense; once admin
  // launches S51 (or marks it concluded), the pitch is no longer relevant.
  const s51 = seasons.find((s) => s.number === 51);
  const proposalRelevant = s51 ? getSeasonStatus(s51) === "future" : false;

  // We backtest against the league's own season (typically 50). If the user
  // doesn't have an applicable league, skip everything.
  const sourceSeasonNumber = league?.seasonNumber ?? null;
  const targetSeasonNumber = 51;

  const { data: castaways = [], isLoading: castawaysLoading } = useSeasonCastaways(
    sourceSeasonNumber ?? 0,
  );

  // Massage castaway docs into the (castawayId -> week -> events[]) map the
  // backtest expects.
  const events: CastawayWeeklyEvents = useMemo(() => {
    const map: CastawayWeeklyEvents = new Map();
    for (const c of castaways) {
      const byWeek = new Map<number, ReturnType<typeof Array.from>>();
      for (const [epStr, list] of Object.entries(c.weeklyEvents || {})) {
        const week = parseInt(epStr, 10);
        if (Number.isNaN(week)) continue;
        byWeek.set(week, list);
      }
      map.set(c.id, byWeek as unknown as Map<number, never>);
    }
    return map as CastawayWeeklyEvents;
  }, [castaways]);

  const backtest: BacktestSummary | null = useMemo(() => {
    if (!league || sourceSeasonNumber == null) return null;
    if (castaways.length === 0) return null;
    if ((league.memberDetails || []).length === 0) return null;
    return backtestLeague(
      league.memberDetails,
      events,
      sourceSeasonNumber,
      targetSeasonNumber,
    );
  }, [league, events, castaways.length, sourceSeasonNumber]);

  // Track dismissal — auth-mode in Firestore, demo-mode in sessionStorage so
  // it doesn't keep re-popping within a demo session.
  const [seenLoaded, setSeenLoaded] = useState(false);
  const [hasSeen, setHasSeen] = useState(true);

  useEffect(() => {
    if (!user) return;
    if (!proposalRelevant) {
      // No need to fetch the flag if we'd never show it anyway.
      setHasSeen(true);
      setSeenLoaded(true);
      return;
    }
    let cancelled = false;

    if (isDemoMode) {
      const seen =
        typeof window !== "undefined" &&
        window.sessionStorage.getItem(`demoProposalSeen:${PROPOSAL_SLUG}`) === "1";
      setHasSeen(seen);
      setSeenLoaded(true);
      return;
    }

    (async () => {
      try {
        const snap = await getDoc(doc(db, "users", user.uid));
        if (cancelled) return;
        const data = snap.data() as { proposalsSeen?: Record<string, boolean> } | undefined;
        setHasSeen(Boolean(data?.proposalsSeen?.[PROPOSAL_SLUG]));
      } catch (err) {
        dbLogger.error("Failed to load proposalsSeen flag:", err);
        setHasSeen(true); // fail-safe: don't spam
      } finally {
        if (!cancelled) setSeenLoaded(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user, isDemoMode, proposalRelevant]);

  const markSeen = useCallback(async () => {
    if (!user) return;
    setHasSeen(true);

    if (isDemoMode) {
      if (typeof window !== "undefined") {
        window.sessionStorage.setItem(`demoProposalSeen:${PROPOSAL_SLUG}`, "1");
      }
      return;
    }

    try {
      await updateDoc(doc(db, "users", user.uid), {
        [`proposalsSeen.${PROPOSAL_SLUG}`]: true,
      });
    } catch (err) {
      dbLogger.error("Failed to persist proposalsSeen flag:", err);
    }
  }, [user, isDemoMode]);

  const hasContent = backtest != null && backtest.teams.length > 0;

  return {
    backtest,
    sourceSeasonNumber,
    targetSeasonNumber,
    isLoading: castawaysLoading || !seenLoaded,
    hasContent,
    proposalRelevant,
    shouldAutoOpen: proposalRelevant && seenLoaded && !hasSeen && hasContent,
    markSeen,
  };
}
