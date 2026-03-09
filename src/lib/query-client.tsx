"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { type ReactNode } from "react";

/**
 * React Query Configuration
 * Provides intelligent caching, background refetching, and optimistic updates
 */

// Create query client with optimized defaults
function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Cache data for 5 minutes
        staleTime: 5 * 60 * 1000,
        // Keep unused data in cache for 10 minutes
        gcTime: 10 * 60 * 1000,
        // Don't refetch on window focus (can be enabled per query)
        refetchOnWindowFocus: false,
        // Retry failed queries 1 time
        retry: 1,
        // Don't refetch on mount if data is fresh
        refetchOnMount: false,
      },
      mutations: {
        // Retry failed mutations once
        retry: 1,
      },
    },
  });
}

// Browser-side query client
let browserQueryClient: QueryClient | undefined = undefined;

function getQueryClient() {
  if (typeof window === "undefined") {
    // Server: always make a new query client
    return makeQueryClient();
  } else {
    // Browser: make a new query client if we don't already have one
    if (!browserQueryClient) browserQueryClient = makeQueryClient();
    return browserQueryClient;
  }
}

/**
 * React Query Provider Component
 * Wrap your app with this to enable React Query
 */
export function QueryProvider({ children }: { children: ReactNode }) {
  // NOTE: Avoid useState when initializing the query client if you don't
  // have a suspense boundary between this and the code that may
  // suspend because React will throw away the client on the initial
  // render if it suspends and there is no boundary
  const queryClient = getQueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* React Query Devtools - only in development */}
      {process.env.NODE_ENV === "development" && (
        <ReactQueryDevtools initialIsOpen={false} position="bottom" />
      )}
    </QueryClientProvider>
  );
}

/**
 * Query Keys
 * Centralized query keys for consistency and type safety
 */
export const queryKeys = {
  // Leagues
  leagues: {
    all: ["leagues"] as const,
    user: (userId: string) => ["leagues", "user", userId] as const,
    detail: (id: string) => ["leagues", id] as const,
    members: (id: string) => ["leagues", id, "members"] as const,
  },
  // Castaways (global season data — source of truth for scores, events, eliminations)
  castaways: {
    detail: (id: string) => ["castaways", id] as const,
    season: (seasonNumber: number) => ["castaways", "season", seasonNumber] as const,
  },
  // Messages
  messages: {
    league: (leagueId: string) => ["messages", "league", leagueId] as const,
  },
  // Notifications
  notifications: {
    user: (userId: string) => ["notifications", userId] as const,
    unread: (userId: string) => ["notifications", userId, "unread"] as const,
  },
} as const;

/**
 * Usage Examples:
 *
 * // In a component:
 * const { data: leagues, isLoading } = useQuery({
 *   queryKey: queryKeys.leagues.user(userId),
 *   queryFn: () => LeagueService.getUserLeagues(userId),
 * });
 *
 * // Mutations:
 * const mutation = useMutation({
 *   mutationFn: (data) => LeagueService.createLeague(data),
 *   onSuccess: () => {
 *     queryClient.invalidateQueries({ queryKey: queryKeys.leagues.all });
 *   },
 * });
 */
