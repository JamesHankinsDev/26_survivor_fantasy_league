import { useQuery } from "@tanstack/react-query";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { ScoringEventType } from "@/types/league";
import { useAuth } from "@/lib/auth-context";

export type DraftConfidence = "high" | "medium" | "low";

export interface PendingDraftEvent {
  eventType: ScoringEventType;
  count: number;
  confidence: DraftConfidence;
  evidence: string;
}

export interface PendingDraftCastaway {
  castawayId: string;
  castawayName: string;
  events: PendingDraftEvent[];
}

export interface PendingEpisodeDraft {
  seasonNumber: number;
  episodeNumber: number;
  /** "ready" when a recap was found and parsed; "not_found" when none existed yet. */
  status: "ready" | "not_found";
  episodeTitle?: string | null;
  airDate?: string | null;
  summary: string;
  sources: { url: string; title: string }[];
  castaways: PendingDraftCastaway[];
  /** Things the drafter could not settle — the admin's to-do list. */
  unresolved: string[];
  generatedAt?: { toDate?: () => Date } | null;
  model?: string;
}

/**
 * The AI-drafted scoring awaiting review for one episode, if any.
 *
 * Drafts are proposals, never applied automatically — `saveEpisodeScores`
 * cascades across every league with no undo, so a human applies the draft to
 * the form and saves it. Admin-only by Firestore rules; a non-admin read
 * throws, so this returns null rather than surfacing a permission error in the
 * UI for pages that speculatively mount.
 */
export function usePendingEpisodeScores(
  seasonNumber: number,
  episodeNumber: number | null,
) {
  const { isDemoMode } = useAuth();

  return useQuery({
    queryKey: ["pendingEpisodeScores", seasonNumber, episodeNumber],
    enabled: !isDemoMode && episodeNumber !== null,
    queryFn: async (): Promise<PendingEpisodeDraft | null> => {
      if (episodeNumber === null) return null;
      try {
        const ref = doc(
          db,
          "seasons",
          String(seasonNumber),
          "pendingScores",
          String(episodeNumber),
        );
        const snap = await getDoc(ref);
        return snap.exists() ? (snap.data() as PendingEpisodeDraft) : null;
      } catch {
        // Non-admin, or rules not deployed yet — treat as "no draft".
        return null;
      }
    },
    staleTime: 60 * 1000,
  });
}
