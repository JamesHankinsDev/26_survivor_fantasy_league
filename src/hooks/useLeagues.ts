import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-client";
import { db } from "@/lib/firebase";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  Timestamp,
} from "firebase/firestore";
import { League } from "@/types/league";
import { useAuth } from "@/lib/auth-context";
import { DEMO_LEAGUE, DEMO_LEAGUE_ID } from "@/data/demo-data";
import { normalizeMember } from "@/utils/normalizeMember";

// Moved to a Firebase-free util so server routes can share it.
export { normalizeMember };

/**
 * Normalize Firestore data to League type
 */
function normalizeLeague(snap: any): League {
  const raw = snap.data();
  const memberDetails = (raw.memberDetails || []).map(normalizeMember);
  return {
    id: snap.id,
    ...raw,
    memberDetails,
    // Legacy leagues created before seasonNumber existed all belong to S50.
    seasonNumber: typeof raw.seasonNumber === "number" ? raw.seasonNumber : 50,
    createdAt: raw.createdAt?.toDate?.() || raw.createdAt || new Date(),
    updatedAt: raw.updatedAt?.toDate?.() || raw.updatedAt || new Date(),
  } as League;
}

/**
 * Fetch leagues for a specific user
 * Cached for 5 minutes, refetches in background
 */
export function useUserLeagues(userId: string | null) {
  const { isDemoMode } = useAuth();

  return useQuery({
    queryKey: isDemoMode
      ? ["demo", "leagues", "user"]
      : queryKeys.leagues.user(userId || ""),
    queryFn: async () => {
      if (isDemoMode) return [DEMO_LEAGUE];

      if (!userId) return [];

      const q = query(
        collection(db, "leagues"),
        where("members", "array-contains", userId)
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(normalizeLeague);
    },
    enabled: isDemoMode || !!userId,
    staleTime: isDemoMode ? Infinity : 5 * 60 * 1000,
  });
}

/**
 * Fetch a single league by ID
 * Cached for 5 minutes, refetches in background
 */
export function useLeague(leagueId: string | null) {
  const { isDemoMode } = useAuth();

  return useQuery({
    queryKey: isDemoMode
      ? ["demo", "league", leagueId]
      : queryKeys.leagues.detail(leagueId || ""),
    queryFn: async () => {
      if (isDemoMode) return leagueId === DEMO_LEAGUE_ID ? DEMO_LEAGUE : null;

      if (!leagueId) return null;

      const snap = await getDoc(doc(db, "leagues", leagueId));
      if (!snap.exists()) {
        throw new Error("League not found");
      }

      return normalizeLeague(snap);
    },
    enabled: !!leagueId,
    staleTime: isDemoMode ? Infinity : 5 * 60 * 1000,
  });
}

/**
 * Update league mutation
 * Automatically invalidates relevant queries on success
 */
export function useUpdateLeague() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      leagueId,
      data,
    }: {
      leagueId: string;
      data: Partial<League>;
    }) => {
      const docRef = doc(db, "leagues", leagueId);
      await updateDoc(docRef, {
        ...data,
        updatedAt: Timestamp.now(),
      });
    },
    onSuccess: (_, variables) => {
      // Invalidate and refetch
      queryClient.invalidateQueries({
        queryKey: queryKeys.leagues.detail(variables.leagueId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.leagues.all,
      });
    },
  });
}

/**
 * Fetch leagues owned by a specific user
 * Cached for 5 minutes, used by admin pages
 */
export function useOwnedLeagues(userId: string | null) {
  const { isDemoMode } = useAuth();

  return useQuery({
    queryKey: isDemoMode
      ? ["demo", "leagues", "owned"]
      : queryKeys.leagues.owned(userId || ""),
    queryFn: async () => {
      if (isDemoMode) return [DEMO_LEAGUE];

      if (!userId) return [];

      const q = query(
        collection(db, "leagues"),
        where("ownerId", "==", userId)
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(normalizeLeague);
    },
    enabled: isDemoMode || !!userId,
    staleTime: isDemoMode ? Infinity : 5 * 60 * 1000,
  });
}

/**
 * Usage Examples:
 *
 * // In a component:
 * const { data: leagues, isLoading, error } = useUserLeagues(user?.uid);
 *
 * if (isLoading) return <LoadingSpinner />;
 * if (error) return <ErrorMessage error={error} />;
 *
 * return <LeagueList leagues={leagues} />;
 *
 * // Mutations:
 * const updateLeague = useUpdateLeague();
 *
 * const handleUpdate = () => {
 *   updateLeague.mutate({
 *     leagueId: "league-123",
 *     data: { name: "New Name" },
 *   });
 * };
 */
