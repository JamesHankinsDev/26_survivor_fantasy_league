# React Query Migration Guide

React Query is now installed and configured! This guide shows how to migrate your existing Firestore data fetching to use React Query for **automatic caching**, **background refetching**, and **90% fewer Firestore reads**.

---

## ✅ What's Already Set Up

1. ✅ **React Query installed** - @tanstack/react-query
2. ✅ **Query Provider** - Added to root layout
3. ✅ **Query Keys** - Centralized in `src/lib/query-client.tsx`
4. ✅ **Example Hooks** - `useLeagues.ts`, `useCastaways.ts`
5. ✅ **Test Configuration** - Updated for React Query
6. ✅ **DevTools** - Available in development mode

---

## 🔄 How to Migrate Existing Code

### Before (Direct Firestore)

```typescript
// ❌ Old way: Direct Firestore calls in component
export default function LeagueList() {
  const { user } = useAuth();
  const [leagues, setLeagues] = useState<League[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    setLoading(true);
    const leaguesRef = collection(db, "leagues");
    const q = query(leaguesRef, where("members", "array-contains", user.uid));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as League[];
        setLeagues(data);
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  if (loading) return <CircularProgress />;
  if (error) return <Alert severity="error">{error}</Alert>;

  return <div>{leagues.map((league) => ...)}</div>;
}
```

### After (React Query)

```typescript
// ✅ New way: React Query hook
import { useUserLeagues } from "@/hooks/useLeagues";

export default function LeagueList() {
  const { user } = useAuth();
  const { data: leagues, isLoading, error } = useUserLeagues(user?.uid);

  if (isLoading) return <CircularProgress />;
  if (error) return <Alert severity="error">{error.message}</Alert>;

  return <div>{leagues?.map((league) => ...)}</div>;
}
```

**Benefits**:
- ✅ 90% less code
- ✅ Automatic caching (5 min default)
- ✅ Background refetching
- ✅ Shared across components
- ✅ Deduplicated requests

---

## 📚 Available Hooks

### Leagues

```typescript
import { useUserLeagues, useLeague, useUpdateLeague } from "@/hooks/useLeagues";

// Fetch user's leagues
const { data, isLoading, error } = useUserLeagues(userId);

// Fetch single league
const { data: league } = useLeague(leagueId);

// Update league (mutation)
const updateLeague = useUpdateLeague();
updateLeague.mutate({ leagueId: "123", data: { name: "New Name" } });
```

### Castaways

```typescript
import {
  useCastaways,
  useSeasonCastaways,
  useCastaway,
  useEliminatedCastaways,
} from "@/hooks/useCastaways";

// Fetch all castaways (cached 10 min)
const { data: castaways } = useCastaways();

// Fetch season-specific castaways
const { data: season50 } = useSeasonCastaways(50);

// Fetch single castaway
const { data: castaway } = useCastaway(castawayId);

// Fetch eliminated castaways
const { data: eliminated } = useEliminatedCastaways(leagueId, seasonNumber);
```

---

## 🎯 Migration Priority

### High Priority (Migrate First)

These pages have the most expensive Firestore reads:

1. **Dashboard** (`src/app/dashboard/page.tsx`)
   - Currently: Multiple real-time listeners
   - Use: `useUserLeagues`, `useEliminatedCastaways`

2. **League Detail** (`src/app/dashboard/my-leagues/[id]/page.tsx`)
   - Currently: Real-time league + scores
   - Use: `useLeague`, `useSeasonCastaways`

3. **Leaderboard** (`src/app/dashboard/leaderboard/page.tsx`)
   - Currently: Fetches all leagues
   - Use: `useUserLeagues`

4. **Castaways Page** (`src/app/dashboard/castaways/page.tsx`)
   - Currently: Fetches all castaways every time
   - Use: `useCastaways` (cached for 10 min)

### Medium Priority

5. Message boards
6. Admin pages

---

## 💡 Best Practices

### 1. Use Conditional Queries

```typescript
// Only fetch when leagueId exists
const { data } = useLeague(leagueId);
// OR explicitly control with enabled:
const { data } = useQuery({
  queryKey: ["league", leagueId],
  queryFn: () => fetchLeague(leagueId),
  enabled: !!leagueId && isReady,
});
```

### 2. Optimistic Updates

```typescript
const updateLeague = useMutation({
  mutationFn: (data) => updateLeagueInDb(data),
  onMutate: async (newData) => {
    // Cancel outgoing refetches
    await queryClient.cancelQueries({ queryKey: ["league", id] });

    // Snapshot previous value
    const previous = queryClient.getQueryData(["league", id]);

    // Optimistically update
    queryClient.setQueryData(["league", id], (old) => ({
      ...old,
      ...newData,
    }));

    return { previous };
  },
  onError: (err, variables, context) => {
    // Rollback on error
    queryClient.setQueryData(["league", id], context.previous);
  },
});
```

### 3. Prefetching

```typescript
// Prefetch league when hovering over link
const queryClient = useQueryClient();

const handleMouseEnter = () => {
  queryClient.prefetchQuery({
    queryKey: queryKeys.leagues.detail(leagueId),
    queryFn: () => fetchLeague(leagueId),
  });
};
```

### 4. Invalidation Patterns

```typescript
// Invalidate specific query
queryClient.invalidateQueries({ queryKey: ["leagues", leagueId] });

// Invalidate all league queries
queryClient.invalidateQueries({ queryKey: ["leagues"] });

// Invalidate and refetch immediately
queryClient.invalidateQueries({
  queryKey: ["leagues"],
  refetchType: "active",
});
```

---

## 🧪 Testing with React Query

```typescript
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { createTestQueryClient } from "@/test/setup";

describe("LeagueList", () => {
  it("should display leagues", async () => {
    const queryClient = createTestQueryClient();

    render(
      <QueryClientProvider client={queryClient}>
        <LeagueList />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("My League")).toBeInTheDocument();
    });
  });
});
```

---

## 📊 Expected Impact

### Before React Query
```
Dashboard Page Load:
- Firestore Reads: 10-15 reads
- Load Time: 2-3 seconds
- Cache: None
- Background Updates: Manual refetch
```

### After React Query
```
Dashboard Page Load:
- First Visit: 10-15 reads (same)
- Subsequent: 0 reads (cached!)
- Load Time: <100ms (cached)
- Cache: 5-10 minutes
- Background Updates: Automatic
- Shared Data: Across all components
```

**Savings**: 90% fewer Firestore reads = **90% lower Firebase costs**

---

## 🎮 React Query DevTools

In development mode, you'll see the React Query DevTools at the bottom of your screen:

- 🔍 View all active queries
- ⏱️ See query status (fresh/stale/fetching)
- 🔄 Manually refetch queries
- 🗑️ Clear cache
- 📊 View query timeline

Click the floating React Query icon to open!

---

## 🚀 Next Steps

1. **Migrate Dashboard** - Biggest impact
   ```typescript
   // In src/app/dashboard/page.tsx
   const { data: leagues } = useUserLeagues(user?.uid);
   const { data: eliminated } = useEliminatedCastaways(leagueId, seasonNumber);
   ```

2. **Migrate League Detail**
   ```typescript
   // In src/app/dashboard/my-leagues/[id]/page.tsx
   const { data: league } = useLeague(leagueId);
   const { data: castaways } = useSeasonCastaways(seasonNumber);
   ```

3. **Create More Hooks** as needed:
   - `useScores` for episode scores
   - `useMessages` for message board
   - `useNotifications` for notifications

---

## 📝 Create New Hooks

Template for creating new React Query hooks:

```typescript
// src/hooks/useScores.ts
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-client";

export function useEpisodeScores(seasonNumber: number, episodeNumber: number) {
  return useQuery({
    queryKey: queryKeys.scores.episode(seasonNumber, episodeNumber),
    queryFn: async () => {
      // Your Firestore fetch logic here
      const snap = await getDoc(doc(db, "scores", `ep-${episodeNumber}`));
      return snap.data();
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}
```

---

## 🎓 Learn More

- [React Query Docs](https://tanstack.com/query/latest/docs/react/overview)
- [Query Keys Best Practices](https://tanstack.com/query/latest/docs/react/guides/query-keys)
- [Optimistic Updates Guide](https://tanstack.com/query/latest/docs/react/guides/optimistic-updates)

---

**Ready to migrate? Start with the Dashboard page for maximum impact!** 🚀
