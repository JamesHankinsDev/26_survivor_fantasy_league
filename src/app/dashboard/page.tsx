"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Alert,
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  CircularProgress,
  Container,
  Divider,
  Stack,
  Typography,
} from "@mui/material";
import CompareArrowsIcon from "@mui/icons-material/CompareArrows";
import { doc, getDoc } from "firebase/firestore";
import { useAuth } from "@/lib/auth-context";
import { db } from "@/lib/firebase";
import { dbLogger } from "@/lib/logger";
import { useUserLeagues } from "@/hooks/useLeagues";
import {
  Season,
  getSeasonStatus,
  getSeasonLabel,
} from "@/data/seasons";
import { useSeasonsWithOverrides } from "@/hooks/useSeasonsWithOverrides";
import { League } from "@/types/league";
import AppTutorial from "@/components/AppTutorial";
import FutureSeasonCard from "@/components/FutureSeasonCard";
import SeasonRuleProposalModal from "@/components/SeasonRuleProposalModal";
import { useS51RuleProposal } from "@/hooks/useS51RuleProposal";

/**
 * Home / dashboard landing — now a multi-season hub.
 *
 * Sections:
 *   - Current Season  → the active season + the user's leagues in it
 *   - Past Seasons    → concluded seasons grouped by number, descending
 *   - Future Seasons  → upcoming season teasers with "Notify me"
 */
export default function DashboardHome() {
  const { user, isDemoMode } = useAuth();
  const router = useRouter();
  const [showTutorial, setShowTutorial] = useState(false);

  const { data: leagues = [], isLoading: loadingLeagues } = useUserLeagues(
    user?.uid || null,
  );
  const { seasons } = useSeasonsWithOverrides();
  const activeLeague = leagues[0] ?? null;
  const proposal = useS51RuleProposal(activeLeague);
  const [proposalReplayOpen, setProposalReplayOpen] = useState(false);

  useEffect(() => {
    if (!user) router.push("/");
  }, [user, router]);

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

  // Group the user's leagues by season number.
  const leaguesBySeason = useMemo(() => {
    const map = new Map<number, League[]>();
    for (const l of leagues) {
      const key = l.seasonNumber ?? 50;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(l);
    }
    return map;
  }, [leagues]);

  // Bucket every known season for rendering. Pulled from the override-merged
  // list so admin lifecycle flips (Launch / Mark Concluded) take effect live.
  const currentSeasons = seasons.filter((s) => getSeasonStatus(s) === "current");
  const pastSeasons = seasons
    .filter((s) => getSeasonStatus(s) === "past")
    .sort((a, b) => b.number - a.number);
  const futureSeasons = seasons
    .filter((s) => getSeasonStatus(s) === "future")
    .sort((a, b) => a.premiereDate.localeCompare(b.premiereDate));

  if (!user) return null;

  if (loadingLeagues) {
    return (
      <Box
        aria-busy="true"
        sx={{
          flex: 1,
          bgcolor: "background.default",
          p: { xs: 2, md: 4 },
        }}
      >
        <Container maxWidth="lg">
          <Box sx={{ textAlign: "center", py: 8 }}>
            <CircularProgress
              sx={{ color: "#E85D2A" }}
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
    <Box
      sx={{
        flex: 1,
        bgcolor: "background.default",
        p: { xs: 2, md: 4 },
        overflow: "auto",
      }}
    >
      <Container maxWidth="lg">
        {/* Greeting */}
        <Box sx={{ mb: 4 }}>
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

        {/* CURRENT SEASON */}
        <SectionHeader title="Current Season" />
        {currentSeasons.length === 0 ? (
          <Alert severity="info" sx={{ mb: 4 }}>
            No season is currently in play.
            {futureSeasons.length > 0
              ? ` Survivor ${futureSeasons[0].number} is on the horizon — see Future Seasons below.`
              : ""}
          </Alert>
        ) : (
          currentSeasons.map((season) => (
            <SeasonBlock
              key={season.number}
              season={season}
              leagues={leaguesBySeason.get(season.number) ?? []}
              emptyMessage="You haven't joined a league for this season yet."
            />
          ))
        )}

        <Divider sx={{ my: 5 }} />

        {/* PAST SEASONS */}
        <SectionHeader title="Past Seasons" />
        {pastSeasons.length === 0 ? (
          <Alert severity="info" sx={{ mb: 4 }}>
            Your archived leagues will appear here once a season ends.
          </Alert>
        ) : (
          pastSeasons.map((season) => {
            const userLeagues = leaguesBySeason.get(season.number) ?? [];
            // Hide past-season blocks the user wasn't part of — keeps the home
            // page focused on their own history.
            if (userLeagues.length === 0) return null;
            return (
              <SeasonBlock
                key={season.number}
                season={season}
                leagues={userLeagues}
                emptyMessage=""
              />
            );
          })
        )}

        {pastSeasons.length > 0 &&
          pastSeasons.every(
            (s) => (leaguesBySeason.get(s.number) ?? []).length === 0,
          ) && (
            <Alert severity="info" sx={{ mb: 4 }}>
              No archived leagues yet.
            </Alert>
          )}

        <Divider sx={{ my: 5 }} />

        {/* FUTURE SEASONS */}
        <SectionHeader title="Future Seasons" />
        {futureSeasons.length === 0 ? (
          <Alert severity="info" sx={{ mb: 4 }}>
            No upcoming seasons announced yet. Check back soon.
          </Alert>
        ) : (
          <Box
            sx={{
              display: "grid",
              gap: 2.5,
              gridTemplateColumns: {
                xs: "1fr",
                sm: "repeat(2, 1fr)",
                md: "repeat(3, 1fr)",
              },
            }}
          >
            {futureSeasons.map((season) => (
              <FutureSeasonCard key={season.number} season={season} />
            ))}
          </Box>
        )}
      </Container>

      {user && (
        <AppTutorial
          userId={user.uid}
          open={showTutorial}
          onClose={() => setShowTutorial(false)}
        />
      )}

      {activeLeague && proposal.proposalRelevant && (
        <SeasonRuleProposalModal
          open={proposalReplayOpen}
          league={activeLeague}
          backtest={proposal.backtest}
          sourceSeasonNumber={proposal.sourceSeasonNumber ?? 50}
          targetSeasonNumber={proposal.targetSeasonNumber}
          onClose={() => setProposalReplayOpen(false)}
        />
      )}
    </Box>
  );
}

const SectionHeader = ({ title }: { title: string }) => (
  <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>
    {title}
  </Typography>
);

const SeasonBlock = ({
  season,
  leagues,
  emptyMessage,
}: {
  season: Season;
  leagues: League[];
  emptyMessage: string;
}) => {
  const status = getSeasonStatus(season);
  const statusChip =
    status === "current" ? (
      <Chip
        label="In Play"
        size="small"
        sx={{ bgcolor: "#20B2AA", color: "white", fontWeight: 700 }}
      />
    ) : (
      <Chip
        label="Archived"
        size="small"
        sx={{ bgcolor: "#888", color: "white", fontWeight: 700 }}
      />
    );

  return (
    <Box sx={{ mb: 4 }}>
      <Stack
        direction="row"
        spacing={1.5}
        alignItems="center"
        sx={{ mb: 1.5 }}
        flexWrap="wrap"
      >
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          {season.name}
        </Typography>
        {statusChip}
        <Typography variant="body2" sx={{ color: "text.secondary" }}>
          {season.theme}
        </Typography>
      </Stack>

      {leagues.length === 0 ? (
        emptyMessage ? <Alert severity="info">{emptyMessage}</Alert> : null
      ) : (
        <Box
          sx={{
            display: "grid",
            gap: 2,
            gridTemplateColumns: {
              xs: "1fr",
              sm: "repeat(2, 1fr)",
              md: "repeat(3, 1fr)",
            },
          }}
        >
          {leagues.map((league) => (
            <LeagueCard key={league.id} league={league} status={status} />
          ))}
        </Box>
      )}
    </Box>
  );
};

const LeagueCard = ({
  league,
  status,
}: {
  league: League;
  status: "current" | "past" | "future";
}) => {
  const isArchived = status === "past";
  return (
    <Card
      sx={{
        borderLeft: `4px solid ${isArchived ? "#888" : "#E85D2A"}`,
        height: "100%",
      }}
    >
      <CardActionArea
        component={Link}
        href={`/dashboard/my-leagues/${league.id}`}
        sx={{ height: "100%" }}
      >
        <CardContent>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
            {league.name}
          </Typography>
          <Typography
            variant="caption"
            sx={{ color: "text.secondary", display: "block", mb: 1.5 }}
          >
            {getSeasonLabel(league.seasonNumber)} ·{" "}
            {isArchived ? "Final Standings" : "In progress"}
          </Typography>
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            <strong>{league.currentPlayers}</strong>/{league.maxPlayers} players
          </Typography>
        </CardContent>
      </CardActionArea>
    </Card>
  );
};
