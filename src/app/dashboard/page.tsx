"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Box,
  CircularProgress,
  Container,
  Typography,
} from "@mui/material";
import { useAuth } from "@/lib/auth-context";
import { useUserLeagues } from "@/hooks/useLeagues";
import { useWalkthrough } from "@/hooks/useWalkthrough";
import { useSeasonsWithOverrides } from "@/hooks/useSeasonsWithOverrides";
import { pickActiveLeague } from "@/utils/activeLeague";
import HowToPlayWalkthrough from "@/components/HowToPlayWalkthrough";
import WelcomeBackBanner from "@/components/WelcomeBackBanner";
import ActiveDashboardView from "@/components/dashboard/ActiveDashboardView";
import SeasonHubView from "@/components/dashboard/SeasonHubView";
import PriorSeasonTools from "@/components/dashboard/PriorSeasonTools";

/**
 * Dashboard home — hybrid layout.
 *
 * When the user has a league in a currently-playing or upcoming season,
 * render the Phase 02 single-league dashboard pointed at it. Otherwise (no
 * leagues, or every league's season has concluded) fall back to the
 * multi-season hub so users can still navigate to their archive and see
 * upcoming "Notify me" cards.
 *
 * Cross-cutting state (auth redirect, how-to-play walkthrough) lives here so
 * both views inherit it.
 */
export default function DashboardHome() {
  const { user, isDemoMode } = useAuth();
  const router = useRouter();
  // `null` = nobody has opened or closed it yet, so the auto-open rule decides.
  const [walkthroughOverride, setWalkthroughOverride] = useState<boolean | null>(null);

  const { data: leagues = [], isLoading: loadingLeagues } = useUserLeagues(
    user?.uid || null,
  );
  const { seasons } = useSeasonsWithOverrides();

  // Resolve which league the new dashboard should focus on. `null` means
  // none qualifies — fall through to the multi-season hub.
  const activeLeague = useMemo(
    () => pickActiveLeague(leagues, seasons),
    [leagues, seasons],
  );

  // Auth gate — bounce unauthenticated users back to the landing page.
  useEffect(() => {
    if (!user) router.push("/");
  }, [user, router]);

  // How-to-play walkthrough. Everyone who hasn't seen the current version is
  // offered it — the flag is separate from the legacy `tutorialCompleted`
  // boolean, which every existing player already has set.
  //
  // Demo mode still *sees* it (that's a useful place to preview it); it just
  // can't be recorded, since the demo uid isn't a real account.
  const walkthrough = useWalkthrough(user?.uid ?? null, {
    canPersist: !isDemoMode,
  });
  const offerWalkthrough = walkthrough.seen === false;

  // A first-ever login has no context to work from, so it opens for them. A
  // returning player gets the banner instead and decides for themselves.
  // Derived rather than set from an effect, so there's no render cascade.
  const walkthroughOpen =
    walkthroughOverride ?? (offerWalkthrough && walkthrough.isFirstEver);

  const finishWalkthrough = () => {
    setWalkthroughOverride(false);
    void walkthrough.markSeen();
  };

  if (!user) return null;

  if (loadingLeagues) {
    return (
      <Box
        aria-busy="true"
        sx={{ flex: 1, bgcolor: "background.default", p: { xs: 2, md: 4 } }}
      >
        <Container maxWidth="lg">
          <Box sx={{ textAlign: "center", py: 8 }}>
            <CircularProgress
              sx={{ color: "var(--flame)" }}
              aria-label="Loading leagues"
            />
            <Typography variant="body2" sx={{ mt: 2, color: "text.secondary" }}>
              Loading your leagues...
            </Typography>
          </Box>
        </Container>
      </Box>
    );
  }

  return (
    <Box sx={{ flex: 1, bgcolor: "background.default", p: { xs: 2, md: 4 } }}>
      <Container maxWidth="lg">
        {/* Greeting + prior-season tools */}
        <Box
          sx={{
            mb: 4,
            display: "flex",
            alignItems: { xs: "flex-start", md: "flex-end" },
            // With the greeting stood down, the tools are the only child —
            // keep them right-aligned instead of sliding to the start.
            justifyContent: offerWalkthrough ? "flex-end" : "space-between",
            flexDirection: { xs: "column", md: "row" },
            gap: 2,
          }}
        >
          {/* The banner carries its own "welcome back", so the plain greeting
           * stands down while it's up rather than stacking two of them. */}
          {!offerWalkthrough && (
            <Box sx={{ minWidth: 0 }}>
              <Typography
                variant="h4"
                sx={{ fontWeight: 700, color: "text.primary", mb: 0.5 }}
              >
                Welcome back, {user.displayName || user.email}
              </Typography>
              <Typography variant="body1" sx={{ color: "text.secondary" }}>
                Your Survivor Fantasy League home.
              </Typography>
            </Box>
          )}
          <PriorSeasonTools leagues={leagues} />
        </Box>

        {offerWalkthrough && (
          <Box sx={{ mb: 4 }}>
            <WelcomeBackBanner
              displayName={user.displayName || user.email || "there"}
              onStart={() => setWalkthroughOverride(true)}
              onDismiss={finishWalkthrough}
            />
          </Box>
        )}

        {/* Hybrid routing */}
        {activeLeague ? (
          <ActiveDashboardView league={activeLeague} />
        ) : (
          <SeasonHubView leagues={leagues} />
        )}
      </Container>

      <HowToPlayWalkthrough
        open={walkthroughOpen}
        onClose={finishWalkthrough}
        persists={walkthrough.persists}
      />

    </Box>
  );
}
