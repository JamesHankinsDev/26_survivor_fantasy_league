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
import { League, TribeMember } from "@/types/league";

/**
 * Normalize a TribeMember's roster from old RosterEntry[] format to string[].
 * Old format: roster was an array of objects with { castawayId, status, ... }
 * New format: roster is a plain string[] of castaway IDs.
 * Also ensures weeklyRosters defaults to [].
 */
export function normalizeMember(member: any): TribeMember {
  let roster = member.roster || [];
  // Detect old RosterEntry[] format (array of objects with castawayId)
  if (roster.length > 0 && typeof roster[0] === "object" && roster[0].castawayId) {
    roster = roster
      .filter((r: any) => r.status === "active")
      .map((r: any) => r.castawayId);
  }

  const weeklyRosters = member.weeklyRosters || [];

  // Migrate old "points" field → "totalPoints", then recompute from weekScores if available
  let totalPoints = member.totalPoints ?? member.points ?? 0;
  const weekScoreSum = weeklyRosters.reduce(
    (sum: number, r: any) => sum + (r.weekScore || 0),
    0,
  );
  if (weekScoreSum > 0) {
    totalPoints = weekScoreSum;
  }

  return {
    ...member,
    roster,
    weeklyRosters,
    totalPoints,
  };
}

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
    createdAt: raw.createdAt?.toDate?.() || raw.createdAt || new Date(),
    updatedAt: raw.updatedAt?.toDate?.() || raw.updatedAt || new Date(),
  } as League;
}

/**
 * Fetch leagues for a specific user
 * Cached for 5 minutes, refetches in background
 */
export function useUserLeagues(userId: string | null) {
  return useQuery({
    queryKey: queryKeys.leagues.user(userId || ""),
    queryFn: async () => {
      if (!userId) return [];

      const q = query(
        collection(db, "leagues"),
        where("members", "array-contains", userId)
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(normalizeLeague);
    },
    enabled: !!userId, // Only run if userId exists
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Fetch a single league by ID
 * Cached for 5 minutes, refetches in background
 */
export function useLeague(leagueId: string | null) {
  return useQuery({
    queryKey: queryKeys.leagues.detail(leagueId || ""),
    queryFn: async () => {
      if (!leagueId) return null;

      const snap = await getDoc(doc(db, "leagues", leagueId));
      if (!snap.exists()) {
        throw new Error("League not found");
      }

      return normalizeLeague(snap);
    },
    enabled: !!leagueId,
    staleTime: 5 * 60 * 1000,
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
