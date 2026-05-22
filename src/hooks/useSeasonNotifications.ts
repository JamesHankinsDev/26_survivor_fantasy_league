import { useCallback, useEffect, useState } from "react";
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { dbLogger } from "@/lib/logger";

/**
 * Tracks which upcoming seasons the user has opted into a launch notification
 * for. State mirrors `users/{uid}.seasonNotifications: number[]`.
 *
 * Demo mode is in-memory only (toggling works, just doesn't persist).
 */
export function useSeasonNotifications() {
  const { user, isDemoMode } = useAuth();
  const [seasons, setSeasons] = useState<number[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!user) return;
    if (isDemoMode) {
      setLoaded(true);
      return;
    }
    let cancelled = false;

    (async () => {
      try {
        const snap = await getDoc(doc(db, "users", user.uid));
        if (cancelled) return;
        const data = snap.data() as { seasonNotifications?: number[] } | undefined;
        setSeasons(data?.seasonNotifications ?? []);
      } catch (err) {
        dbLogger.error("Failed to load seasonNotifications:", err);
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user, isDemoMode]);

  const isSubscribed = useCallback(
    (seasonNumber: number) => seasons.includes(seasonNumber),
    [seasons],
  );

  const toggle = useCallback(
    async (seasonNumber: number) => {
      const next = seasons.includes(seasonNumber)
        ? seasons.filter((n) => n !== seasonNumber)
        : [...seasons, seasonNumber];
      setSeasons(next);

      if (isDemoMode || !user) return;

      try {
        const op = next.includes(seasonNumber) ? arrayUnion : arrayRemove;
        await updateDoc(doc(db, "users", user.uid), {
          seasonNotifications: op(seasonNumber),
        });
      } catch (err) {
        dbLogger.error("Failed to persist seasonNotifications:", err);
      }
    },
    [seasons, isDemoMode, user],
  );

  return { isSubscribed, toggle, loaded };
}
