"use client";

import { useCallback, useEffect, useState } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { dbLogger } from "@/lib/logger";
import { shouldPersistSeenFlags } from "@/utils/persistEnvironment";

/**
 * Bump this to re-offer the walkthrough to **everyone**, including people who
 * already finished an earlier version.
 *
 * Version 1 is the first "how to play" walkthrough. It deliberately does not
 * reuse the old `tutorialCompleted` boolean: every existing player already has
 * that set to `true`, so reusing it would show the new walkthrough to nobody.
 *
 * Note that bumping this does nothing locally — outside production the
 * walkthrough is always offered anyway (see below).
 */
export const WALKTHROUGH_VERSION = 1;

/** `?walkthrough=1` forces it open anywhere, production included. */
const FORCE_PARAM = "walkthrough";

export interface WalkthroughState {
  /** Should this user be offered the walkthrough? `null` = still deciding. */
  seen: boolean | null;
  /** True for someone who has never completed any tutorial (a first-ever login). */
  isFirstEver: boolean;
  /** Mark the current version as seen. Only persists in production. */
  markSeen: () => Promise<void>;
  /** Whether `markSeen` will actually persist — surfaced so dev builds can say so. */
  persists: boolean;
}

interface Resolved {
  /** Which user this result describes — guards against a stale response. */
  key: string;
  seen: boolean;
  isFirstEver: boolean;
}

function forcedByUrl(): boolean {
  if (typeof window === "undefined") return false;
  const value = new URLSearchParams(window.location.search).get(FORCE_PARAM);
  return value === "1" || value === "true";
}

/**
 * Tracks whether the user has seen the current how-to-play walkthrough.
 *
 * Two environment rules, which are deliberately mirror images of each other:
 *
 * - **Production:** the flag lives on `users/{uid}.walkthroughVersion`, so it
 *   follows a player across devices and fires exactly once per person.
 * - **Everywhere else** (localhost, LAN, Vercel previews): the walkthrough is
 *   *always* offered on load and `markSeen` never writes to Firestore. That's
 *   the point — you can reload repeatedly while tuning how it feels, and your
 *   real account never gets marked as having seen it.
 *
 * Dismissing always works for the rest of the session in both cases, so it
 * doesn't get in your way while you're working.
 *
 * `?walkthrough=1` forces it open anywhere, production included.
 */
export function useWalkthrough(
  userId: string | null,
  options: {
    /**
     * Set false for accounts that must never be written to — demo mode uses a
     * synthetic uid that Firestore rules would reject anyway. The walkthrough
     * still *shows*; it just can't be recorded.
     */
    canPersist?: boolean;
  } = {},
): WalkthroughState {
  const { canPersist = true } = options;

  const [resolved, setResolved] = useState<Resolved | null>(null);
  /** Dismissed in this browser session — independent of what's stored. */
  const [dismissed, setDismissed] = useState(false);

  const isProd = shouldPersistSeenFlags();
  const persists = isProd && canPersist && Boolean(userId);
  const forced = forcedByUrl();

  // Only production reads the stored flag; everywhere else the answer is
  // already "show it", so there's no reason to spend a Firestore read.
  const key = isProd && userId ? userId : null;

  useEffect(() => {
    if (!key) return;
    let cancelled = false;

    (async () => {
      try {
        const snapshot = await getDoc(doc(db, "users", key));
        if (cancelled) return;
        const data = snapshot.data();
        const version =
          typeof data?.walkthroughVersion === "number" ? data.walkthroughVersion : 0;
        setResolved({
          key,
          seen: version >= WALKTHROUGH_VERSION,
          isFirstEver: !data?.tutorialCompleted,
        });
      } catch (err) {
        dbLogger.error("Failed to read walkthrough state:", err);
        // Fail closed: a read error shouldn't spring a tour on someone.
        if (!cancelled) setResolved({ key, seen: true, isFirstEver: false });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [key]);

  const stored = resolved?.key === key ? resolved : null;

  let seen: boolean | null;
  if (dismissed) {
    seen = true; // Dismissing sticks for the session, in every environment.
  } else if (forced) {
    seen = false;
  } else if (!isProd) {
    seen = false; // Dev / preview: always offer, so it can be re-checked freely.
  } else if (!userId) {
    seen = null; // Signed out — nothing to decide yet.
  } else {
    seen = stored?.seen ?? null; // Production: wait for the stored answer.
  }

  const markSeen = useCallback(async () => {
    setDismissed(true);

    if (!persists || !userId) {
      dbLogger.info(
        "Walkthrough dismissed but not persisted — not production, or no writable account.",
      );
      return;
    }

    try {
      await setDoc(
        doc(db, "users", userId),
        {
          walkthroughVersion: WALKTHROUGH_VERSION,
          walkthroughSeenAt: new Date(),
          // Keep the legacy flag truthful for anyone still reading it.
          tutorialCompleted: true,
        },
        { merge: true },
      );
    } catch (err) {
      dbLogger.error("Failed to persist walkthrough state:", err);
    }
  }, [userId, persists]);

  return {
    seen,
    isFirstEver: stored?.isFirstEver ?? false,
    markSeen,
    persists,
  };
}
