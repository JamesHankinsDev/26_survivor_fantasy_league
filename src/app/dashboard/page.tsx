"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  Typography,
} from "@mui/material";
import CompareArrowsIcon from "@mui/icons-material/CompareArrows";
import { doc, getDoc } from "firebase/firestore";
import { useAuth } from "@/lib/auth-context";
import { db } from "@/lib/firebase";
import { dbLogger } from "@/lib/logger";
import { useUserLeagues } from "@/hooks/useLeagues";
import { useSeasonsWithOverrides } from "@/hooks/useSeasonsWithOverrides";
import { useS51RuleProposal } from "@/hooks/useS51RuleProposal";
import { pickActiveLeague } from "@/utils/activeLeague";
import AppTutorial from "@/components/AppTutorial";
import SeasonRuleProposalModal from "@/components/SeasonRuleProposalModal";
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
 * Cross-cutting state (auth redirect, tutorial trigger, S51 rule-proposal
 * alert + replay modal) lives here so both views inherit it.
 */
export default function DashboardHome() {
  const { user, isDemoMode } = useAuth();
  const router = useRouter();
  const [showTutorial, setShowTutorial] = useState(false);

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

  const proposal = useS51RuleProposal(activeLeague ?? leagues[0] ?? null);
  const [proposalReplayOpen, setProposalReplayOpen] = useState(false);

  // Auth gate — bounce unauthenticated users back to the landing page.
  useEffect(() => {
    if (!user) router.push("/");
  }, [user, router]);

  // First-run tutorial trigger.
  useEffect(() => {
    const checkTutorialStatus = async () => {
      if (!user || isDemoMode) return;
      try {
        const userRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userRef);
        const userData = userDoc.data();
        if (!userData?.tutorialCompleted) setShowTutorial(true);
      } catch (err) {
        dbLogger.error("Error checking tutorial status:", err);
      }
    };
    checkTutorialStatus();
  }, [user, isDemoMode]);

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
            justifyContent: "space-between",
            flexDirection: { xs: "column", md: "row" },
            gap: 2,
          }}
        >
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
          <PriorSeasonTools leagues={leagues} />
        </Box>

        {/* S51 rule-proposal info alert — kept on both views for discoverability */}
        {proposal.proposalRelevant && proposal.hasContent && (
          <Alert
            severity="info"
            icon={<CompareArrowsIcon />}
            sx={{ mb: 4, alignItems: "center" }}
            action={
              <Button
                size="small"
                onClick={() => setProposalReplayOpen(true)}
                sx={{ fontWeight: 700 }}
              >
                View Comparison
              </Button>
            }
          >
            <strong>Survivor 51 rule proposal.</strong> See how the new scoring
            rules would have shaped Season {proposal.sourceSeasonNumber}.
          </Alert>
        )}

        {/* Hybrid routing */}
        {activeLeague ? (
          <ActiveDashboardView league={activeLeague} />
        ) : (
          <SeasonHubView leagues={leagues} />
        )}
      </Container>

      {user && (
        <AppTutorial
          userId={user.uid}
          open={showTutorial}
          onClose={() => setShowTutorial(false)}
        />
      )}

      {proposal.proposalRelevant && (activeLeague ?? leagues[0]) && (
        <SeasonRuleProposalModal
          open={proposalReplayOpen}
          league={(activeLeague ?? leagues[0])!}
          backtest={proposal.backtest}
          sourceSeasonNumber={proposal.sourceSeasonNumber ?? 50}
          targetSeasonNumber={proposal.targetSeasonNumber}
          onClose={() => setProposalReplayOpen(false)}
        />
      )}
    </Box>
  );
}
