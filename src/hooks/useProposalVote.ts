import { useCallback, useMemo, useState } from "react";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { queryKeys } from "@/lib/query-client";
import { League, ProposalOutcome, ProposalVote } from "@/types/league";
import { dbLogger } from "@/lib/logger";

interface UseProposalVoteResult {
  /** Map of userId -> 'yay' | 'nay' for this proposal. */
  votes: Record<string, ProposalVote>;
  /** Current user's vote (null if not yet cast). */
  myVote: ProposalVote | null;
  /** Tally counts. notVoted = members - (yay + nay). */
  tally: { yay: number; nay: number; notVoted: number; total: number };
  /** True once every league member has cast a vote. */
  allVoted: boolean;
  /** Whether the current user is the league owner. */
  isOwner: boolean;
  /** Finalized outcome (null while voting is open). */
  outcome:
    | {
        outcome: ProposalOutcome;
        decidedAt: Date | null;
        decidedBy: string;
      }
    | null;
  /** Whether voting is locked because the outcome is decided. */
  isLocked: boolean;
  submitVote: (vote: ProposalVote) => Promise<void>;
  /** Owner-only: set the final outcome and lock voting. */
  submitOutcome: (outcome: ProposalOutcome) => Promise<void>;
  /** Owner-only: clear the outcome and reopen voting. */
  reopenVoting: () => Promise<void>;
  isSubmitting: boolean;
}

/**
 * Drives the proposal voting UX. Voting is open until the league owner sets
 * an outcome; members can change their vote in the meantime.
 *
 * Demo mode is local-only (vote shows but doesn't persist).
 */
export function useProposalVote(
  league: League | null | undefined,
  proposalSlug: string,
): UseProposalVoteResult {
  const { user, isDemoMode } = useAuth();
  const queryClient = useQueryClient();

  // Local optimistic state for demo mode and immediate UI feedback.
  const [demoVotes, setDemoVotes] = useState<Record<string, ProposalVote>>({});
  const [demoOutcome, setDemoOutcome] = useState<ProposalOutcome | null>(null);

  const persistedVotes = league?.proposalVotes?.[proposalSlug] ?? {};
  const persistedOutcome = league?.proposalOutcomes?.[proposalSlug] ?? null;

  const votes = isDemoMode ? demoVotes : persistedVotes;
  const outcomeRaw = isDemoMode
    ? demoOutcome
      ? {
          outcome: demoOutcome,
          decidedAt: new Date(),
          decidedBy: user?.uid ?? "demo",
        }
      : null
    : persistedOutcome;

  const outcome = useMemo(() => {
    if (!outcomeRaw) return null;
    const decidedAt =
      outcomeRaw.decidedAt instanceof Date
        ? outcomeRaw.decidedAt
        : (outcomeRaw.decidedAt as { toDate?: () => Date })?.toDate?.() ?? null;
    return { ...outcomeRaw, decidedAt };
  }, [outcomeRaw]);

  const memberIds = useMemo(
    () => (league?.memberDetails || []).map((m) => m.userId),
    [league],
  );

  const tally = useMemo(() => {
    let yay = 0;
    let nay = 0;
    for (const uid of memberIds) {
      const v = votes[uid];
      if (v === "yay") yay++;
      else if (v === "nay") nay++;
    }
    const total = memberIds.length;
    return { yay, nay, notVoted: total - yay - nay, total };
  }, [memberIds, votes]);

  const myVote = user ? (votes[user.uid] ?? null) : null;
  const isOwner = !!user && !!league && user.uid === league.ownerId;
  const allVoted = tally.total > 0 && tally.notVoted === 0;
  const isLocked = !!outcome;

  const writeVoteMutation = useMutation({
    mutationFn: async (vote: ProposalVote) => {
      if (!league || !user) throw new Error("Missing league or user");
      await updateDoc(doc(db, "leagues", league.id), {
        [`proposalVotes.${proposalSlug}.${user.uid}`]: vote,
        updatedAt: new Date(),
      });
    },
    onSuccess: () => {
      if (league) {
        queryClient.invalidateQueries({ queryKey: queryKeys.leagues.detail(league.id) });
        queryClient.invalidateQueries({ queryKey: queryKeys.leagues.all });
      }
    },
  });

  const writeOutcomeMutation = useMutation({
    mutationFn: async (next: ProposalOutcome | null) => {
      if (!league || !user) throw new Error("Missing league or user");
      const update = next
        ? {
            [`proposalOutcomes.${proposalSlug}`]: {
              outcome: next,
              decidedAt: serverTimestamp(),
              decidedBy: user.uid,
            },
            updatedAt: new Date(),
          }
        : {
            // Setting to null clears the outcome; using FieldValue.delete is
            // ideal but updateDoc doesn't support deeply nested deletes here
            // — writing null is enough since the hook treats falsy as open.
            [`proposalOutcomes.${proposalSlug}`]: null,
            updatedAt: new Date(),
          };
      await updateDoc(doc(db, "leagues", league.id), update);
    },
    onSuccess: () => {
      if (league) {
        queryClient.invalidateQueries({ queryKey: queryKeys.leagues.detail(league.id) });
        queryClient.invalidateQueries({ queryKey: queryKeys.leagues.all });
      }
    },
  });

  const submitVote = useCallback(
    async (vote: ProposalVote) => {
      if (!user || isLocked) return;
      if (isDemoMode) {
        setDemoVotes((prev) => ({ ...prev, [user.uid]: vote }));
        return;
      }
      try {
        await writeVoteMutation.mutateAsync(vote);
      } catch (err) {
        dbLogger.error("Failed to submit proposal vote:", err);
        throw err;
      }
    },
    [user, isLocked, isDemoMode, writeVoteMutation],
  );

  const submitOutcome = useCallback(
    async (next: ProposalOutcome) => {
      if (!isOwner) return;
      if (isDemoMode) {
        setDemoOutcome(next);
        return;
      }
      try {
        await writeOutcomeMutation.mutateAsync(next);
      } catch (err) {
        dbLogger.error("Failed to set proposal outcome:", err);
        throw err;
      }
    },
    [isOwner, isDemoMode, writeOutcomeMutation],
  );

  const reopenVoting = useCallback(async () => {
    if (!isOwner) return;
    if (isDemoMode) {
      setDemoOutcome(null);
      return;
    }
    try {
      await writeOutcomeMutation.mutateAsync(null);
    } catch (err) {
      dbLogger.error("Failed to reopen voting:", err);
      throw err;
    }
  }, [isOwner, isDemoMode, writeOutcomeMutation]);

  return {
    votes,
    myVote,
    tally,
    allVoted,
    isOwner,
    outcome,
    isLocked,
    submitVote,
    submitOutcome,
    reopenVoting,
    isSubmitting: writeVoteMutation.isPending || writeOutcomeMutation.isPending,
  };
}
