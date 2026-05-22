"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Container,
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Chip,
  CircularProgress,
  Alert,
  Card,
  CardContent,
} from "@mui/material";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { assignRanks, withRankTrends } from "@/types/league";
import { useUserLeagues } from "@/hooks/useLeagues";
import { getSeasonLabel, getSeasonStatus } from "@/data/seasons";
import { useSeasonsWithOverrides } from "@/hooks/useSeasonsWithOverrides";
import { useEliminatedCastaways } from "@/hooks/useCastaways";
import { useComputedScores } from "@/hooks/useScores";
import RankTrendIndicator from "@/components/RankTrendIndicator";

// Prevent static generation for this page
export const dynamic = "force-dynamic";

export default function LeaderboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [selectedLeagueId, setSelectedLeagueId] = useState<string | null>(null);

  // Use the same React Query hook as Home page — single cache for league data
  const {
    data: leagues = [],
    isLoading: loading,
  } = useUserLeagues(user?.uid || null);
  const { seasons } = useSeasonsWithOverrides();

  // The leaderboard only deals with leagues from currently-active seasons.
  // Concluded-season leagues live on the home page archive + their detail
  // page; future-season leagues don't have any data yet.
  const activeSeasonNumbers = useMemo(() => {
    const set = new Set<number>();
    for (const s of seasons) if (getSeasonStatus(s) === "current") set.add(s.number);
    return set;
  }, [seasons]);

  const visibleLeagues = useMemo(
    () => leagues.filter((l) => activeSeasonNumbers.has(l.seasonNumber)),
    [leagues, activeSeasonNumbers],
  );

  useEffect(() => {
    if (!user) {
      router.push("/");
    }
  }, [user, router]);

  // Auto-select the first visible league, and clear the selection if the
  // currently selected league dropped out of the active set (e.g. its season
  // just concluded).
  useEffect(() => {
    if (visibleLeagues.length === 0) {
      if (selectedLeagueId !== null) setSelectedLeagueId(null);
      return;
    }
    if (!selectedLeagueId || !visibleLeagues.some((l) => l.id === selectedLeagueId)) {
      setSelectedLeagueId(visibleLeagues[0].id);
    }
  }, [visibleLeagues, selectedLeagueId]);

  const selectedLeague = visibleLeagues.find((l) => l.id === selectedLeagueId);
  // Score against whichever season this specific league is playing — supports
  // multiple concurrent active seasons cleanly.
  const seasonForScoring = selectedLeague?.seasonNumber ?? 0;

  const { data: eliminatedCastawayIds = [] } = useEliminatedCastaways(seasonForScoring);
  const eliminatedIds = new Set(eliminatedCastawayIds);

  // Recompute team scores from episode data via shared React Query cache.
  const { computedMembers } = useComputedScores(
    seasonForScoring,
    selectedLeague?.memberDetails || [],
  );

  // Sort members by points (descending) and assign ranks
  // Sort members by points and assign tie-aware ranks with trends
  const rankedMembers = withRankTrends(assignRanks(computedMembers));

  /** Resolve player name: use auth user name for current user, ownerName for others */
  const getPlayerName = (member: { userId: string; ownerName?: string; displayName: string }) =>
    user && member.userId === user.uid
      ? user.displayName || user.email || member.displayName
      : member.ownerName || member.displayName;

  // Early returns AFTER all hooks to satisfy Rules of Hooks
  if (!user) {
    return null;
  }

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4, textAlign: "center" }} aria-busy="true">
        <CircularProgress aria-label="Loading leaderboard" />
        <Typography variant="body2" sx={{ mt: 2, color: "text.secondary" }}>
          Loading leaderboard...
        </Typography>
      </Container>
    );
  }

  if (leagues.length === 0) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="info">
          You haven&apos;t joined any leagues yet. Create or join a league to see
          leaderboards.
        </Alert>
      </Container>
    );
  }

  if (visibleLeagues.length === 0) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="info">
          No leaderboards to show right now. Leaderboards appear here once a
          season is active. Your archived league standings stay available from
          the Home page or the league&apos;s detail page.
        </Alert>
      </Container>
    );
  }

  if (!selectedLeague) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error">League not found</Alert>
      </Container>
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
        <Typography
          component="h1"
          variant="h4"
          sx={{ mb: 3, fontWeight: "bold", color: "text.primary" }}
        >
          Leaderboards
        </Typography>

        {/* League Selector — current-season leagues only */}
        <Box sx={{ mb: 4, display: "flex", gap: 1, flexWrap: "wrap" }}>
          {visibleLeagues.map((league) => (
            <Chip
              key={league.id}
              label={league.name}
              onClick={() => setSelectedLeagueId(league.id)}
              color={selectedLeagueId === league.id ? "primary" : "default"}
              variant={selectedLeagueId === league.id ? "filled" : "outlined"}
              sx={{
                fontSize: { xs: "0.875rem", sm: "1rem" },
                py: { xs: 2, md: 3 },
                px: { xs: 1.5, md: 2 },
                fontWeight: selectedLeagueId === league.id ? "bold" : "normal",
              }}
            />
          ))}
        </Box>

        {/* League Info */}
        <Paper sx={{ p: 3, mb: 4 }}>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                sm: "repeat(2, 1fr)",
                md: "repeat(4, 1fr)",
              },
              gap: 2,
            }}
          >
            <Box>
              <Typography variant="body2" sx={{ color: "text.secondary" }}>
                League Name
              </Typography>
              <Typography
                variant="h6"
                sx={{ fontWeight: "bold", color: "text.primary" }}
              >
                {selectedLeague.name}
              </Typography>
            </Box>
            <Box>
              <Typography variant="body2" sx={{ color: "text.secondary" }}>
                Members
              </Typography>
              <Typography
                variant="h6"
                sx={{ fontWeight: "bold", color: "text.primary" }}
              >
                {selectedLeague.memberDetails?.length || 0}/
                {selectedLeague.maxPlayers}
              </Typography>
            </Box>
            <Box>
              <Typography variant="body2" sx={{ color: "text.secondary" }}>
                Season
              </Typography>
              <Typography
                variant="h6"
                sx={{ fontWeight: "bold", color: "text.primary" }}
              >
                {getSeasonLabel(selectedLeague.seasonNumber)}
              </Typography>
            </Box>
            <Box>
              <Typography variant="body2" sx={{ color: "text.secondary" }}>
                Status
              </Typography>
              <Chip
                label={selectedLeague.status || "active"}
                size="small"
                color={
                  selectedLeague.status === "archived" ? "error" : "primary"
                }
              />
            </Box>
          </Box>
        </Paper>

        {/* Leaderboard Table - Desktop */}
        <TableContainer component={Paper} sx={{ display: { xs: "none", md: "block" } }}>
          <Table aria-label={`${selectedLeague.name} leaderboard standings`}>
            <TableHead
              sx={{
                backgroundColor: (theme) =>
                  theme.palette.mode === "dark"
                    ? "rgba(255, 255, 255, 0.05)"
                    : "#f5f5f5",
              }}
            >
              <TableRow>
                <TableCell sx={{ fontWeight: "bold" }}>Rank</TableCell>
                <TableCell sx={{ fontWeight: "bold" }}>Tribe Owner</TableCell>
                <TableCell sx={{ fontWeight: "bold" }}>Tribe Name</TableCell>
                <TableCell sx={{ fontWeight: "bold" }} align="right">
                  Points
                </TableCell>
                <TableCell sx={{ fontWeight: "bold" }} align="center">
                  Active Castaways
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rankedMembers.map((member) => {
                const activeCastaways =
                  member.roster?.filter(
                    (id) => !eliminatedIds.has(id)
                  ).length || 0;

                const isCurrentUser = member.userId === user.uid;

                return (
                  <TableRow
                    key={member.userId}
                    sx={{
                      backgroundColor: isCurrentUser
                        ? "rgba(232, 93, 42, 0.08)"
                        : "transparent",
                      borderLeft: isCurrentUser
                        ? "4px solid #E85D2A"
                        : "4px solid transparent",
                      "&:hover": {
                        backgroundColor: isCurrentUser
                          ? "rgba(232, 93, 42, 0.12)"
                          : "action.hover",
                      },
                    }}
                  >
                    <TableCell
                      sx={{
                        fontWeight: "bold",
                        fontSize: "1.1rem",
                        color:
                          member.rank === 1
                            ? "#E85D2A"
                            : member.rank === 2
                            ? "#C0C0C0"
                            : member.rank === 3
                            ? "#CD7F32"
                            : "inherit",
                      }}
                    >
                      {member.rank === 1 && <span role="img" aria-label="1st place trophy">🏆</span>} {member.isTied ? "T-" : ""}{member.rank}
                      <RankTrendIndicator trend={member.trend} delta={member.trendDelta} />
                    </TableCell>
                    <TableCell>
                      {getPlayerName(member)}
                      {isCurrentUser && (
                        <Chip
                          label="You"
                          size="small"
                          sx={{ ml: 1 }}
                          color="primary"
                        />
                      )}
                    </TableCell>
                    <TableCell sx={{ fontWeight: "600" }}>
                      {member.tribeColor && (
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 1,
                          }}
                        >
                          <Box
                            sx={{
                              width: 16,
                              height: 16,
                              borderRadius: "50%",
                              backgroundColor: member.tribeColor,
                            }}
                          />
                          {member.displayName || "Unnamed Tribe"}
                        </Box>
                      )}
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: "bold" }}>
                      <Typography
                        variant="h6"
                        sx={{
                          color: member.rank === 1 ? "#E85D2A" : "inherit",
                        }}
                      >
                        {member.totalPoints || 0}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        label={`${activeCastaways}/5`}
                        size="small"
                        variant="outlined"
                        color={activeCastaways === 5 ? "success" : "default"}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Leaderboard Mobile Cards */}
        <Box sx={{ display: { xs: "block", md: "none" } }}>
          {rankedMembers.map((member) => {
            const activeCastaways =
              member.roster?.filter(
                (id) => !eliminatedIds.has(id)
              ).length || 0;
            const isCurrentUser = member.userId === user.uid;

            return (
              <Card
                key={member.userId}
                sx={{
                  mb: 2,
                  borderLeft: isCurrentUser ? "4px solid #E85D2A" : "none",
                  backgroundColor: isCurrentUser
                    ? "rgba(232, 93, 42, 0.08)"
                    : "background.paper",
                }}
              >
                <CardContent>
                  {/* Rank and Trophy */}
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
                    <Typography
                      variant="h4"
                      sx={{
                        fontWeight: "bold",
                        color:
                          member.rank === 1
                            ? "#E85D2A"
                            : member.rank === 2
                            ? "#C0C0C0"
                            : member.rank === 3
                            ? "#CD7F32"
                            : "text.primary",
                      }}
                    >
                      {member.rank === 1 && <><span role="img" aria-label="1st place trophy">🏆</span>{" "}</>}
                      {member.isTied ? "T-" : "#"}{member.rank}
                      <RankTrendIndicator trend={member.trend} delta={member.trendDelta} size="medium" />
                    </Typography>
                    <Chip
                      label={`${activeCastaways}/5 Active`}
                      size="small"
                      variant="outlined"
                      color={activeCastaways === 5 ? "success" : "default"}
                    />
                  </Box>

                  {/* Tribe Owner */}
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
                    {getPlayerName(member)}
                    {isCurrentUser && (
                      <Chip
                        label="You"
                        size="small"
                        sx={{ ml: 1 }}
                        color="primary"
                      />
                    )}
                  </Typography>

                  {/* Tribe Name with Color */}
                  {member.tribeColor && (
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
                      <Box
                        sx={{
                          width: 20,
                          height: 20,
                          borderRadius: "50%",
                          backgroundColor: member.tribeColor,
                        }}
                      />
                      <Typography variant="body2" sx={{ color: "text.secondary" }}>
                        {member.displayName || "Unnamed Tribe"}
                      </Typography>
                    </Box>
                  )}

                  {/* Points */}
                  <Typography
                    variant="h5"
                    sx={{
                      fontWeight: "bold",
                      color: member.rank === 1 ? "#E85D2A" : "text.primary",
                    }}
                  >
                    {member.totalPoints || 0} points
                  </Typography>
                </CardContent>
              </Card>
            );
          })}
        </Box>

        {/* Top Performers Card */}
        {rankedMembers.length > 0 && (
          <Box
            sx={{
              mt: 4,
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                sm: "1fr 1fr 1fr",
              },
              gap: 2,
            }}
          >
            {rankedMembers.slice(0, 3).map((member) => (
              <Card key={member.userId}>
                <CardContent sx={{ textAlign: "center", py: 3 }}>
                  <Typography
                    variant="h3"
                    sx={{
                      color:
                        member.rank === 1
                          ? "#E85D2A"
                          : member.rank === 2
                          ? "#C0C0C0"
                          : "#CD7F32",
                      mb: 1,
                    }}
                  >
                    {member.rank === 1 && <span role="img" aria-label="1st place">🏆</span>}
                    {member.rank === 2 && <span role="img" aria-label="2nd place">🥈</span>}
                    {member.rank === 3 && <span role="img" aria-label="3rd place">🥉</span>}
                  </Typography>
                  <Typography
                    variant="h6"
                    sx={{ fontWeight: "bold", mb: 1, color: "text.primary" }}
                  >
                    {getPlayerName(member)}
                  </Typography>
                  <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 0.5, mb: 2 }}>
                    <Typography
                      variant="body2"
                      sx={{ color: "text.secondary" }}
                    >
                      {member.isTied ? "T-" : "#"}{member.rank}
                    </Typography>
                    <RankTrendIndicator trend={member.trend} delta={member.trendDelta} />
                  </Box>
                  <Typography
                    variant="h5"
                    sx={{
                      color: "#E85D2A",
                      fontWeight: "bold",
                    }}
                  >
                    {member.totalPoints || 0} points
                  </Typography>
                </CardContent>
              </Card>
            ))}
          </Box>
        )}
      </Container>
    </Box>
  );
}
