"use client";

import { useEffect, useState } from "react";
import {
  Box,
  Container,
  Typography,
  Paper,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  CircularProgress,
  Alert,
  Button,
} from "@mui/material";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { assignRanks, withRankTrends } from "@/types/league";
import RankTrendIndicator from "@/components/RankTrendIndicator";
import Link from "next/link";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import { CURRENT_SEASON } from "@/data/seasons";
import AppTutorial from "@/components/AppTutorial";
import { useUserLeagues } from "@/hooks/useLeagues";
import { useEliminatedCastaways } from "@/hooks/useCastaways";
import { useComputedScores } from "@/hooks/useScores";

export default function DashboardHome() {
  const { user } = useAuth();
  const router = useRouter();
  const [selectedLeagueId, setSelectedLeagueId] = useState<string | null>(null);
  const [showTutorial, setShowTutorial] = useState(false);

  // Fetch user's leagues with React Query (cached for 5 minutes)
  const {
    data: leagues = [],
    isLoading: loadingLeagues,
  } = useUserLeagues(user?.uid || null);

  // Fetch eliminated castaways (global, cached for 2 minutes)
  const { data: eliminatedCastawayIds = [] } = useEliminatedCastaways(
    CURRENT_SEASON.number
  );

  const eliminatedIds = new Set(eliminatedCastawayIds);

  // Check if user has completed tutorial
  useEffect(() => {
    const checkTutorialStatus = async () => {
      if (!user) return;

      try {
        const userRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userRef);
        const userData = userDoc.data();

        // Show tutorial if user hasn't completed it
        if (!userData?.tutorialCompleted) {
          setShowTutorial(true);
        }
      } catch (error) {
        console.error("Error checking tutorial status:", error);
      }
    };

    checkTutorialStatus();
  }, [user]);

  // Auto-select first league when leagues load
  useEffect(() => {
    if (leagues.length > 0 && !selectedLeagueId) {
      setSelectedLeagueId(leagues[0].id);
    }
  }, [leagues, selectedLeagueId]);

  // Redirect if not authenticated
  useEffect(() => {
    if (!user) {
      router.push("/");
    }
  }, [user, router]);

  const selectedLeague = leagues.find((l) => l.id === selectedLeagueId);

  // Recompute scores from episode data — single source of truth shared with
  // Leaderboard and League Detail pages via the React Query cache.
  const { computedMembers } = useComputedScores(
    CURRENT_SEASON.number,
    selectedLeague?.memberDetails || [],
  );

  if (!user) {
    return null;
  }

  if (loadingLeagues) {
    return (
      <Box
        aria-busy="true"
        sx={{
          flex: 1,
          bgcolor: "background.default",
          p: { xs: 2, md: 4 },
          overflow: "auto",
        }}
      >
        <Container maxWidth="lg">
          <Box sx={{ textAlign: "center", py: 8 }}>
            <CircularProgress sx={{ color: "#E85D2A" }} aria-label="Loading leagues" />
            <Typography variant="body2" sx={{ mt: 2, color: "text.secondary" }}>
              Loading your leagues...
            </Typography>
          </Box>
        </Container>
      </Box>
    );
  }

  if (leagues.length === 0) {
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
          <Box sx={{ mb: 4 }}>
            <Typography
              variant="h4"
              sx={{
                fontWeight: 700,
                color: "text.primary",
                mb: 1,
              }}
            >
              Welcome to Survivor Fantasy League
            </Typography>
            <Typography variant="body1" sx={{ color: "text.secondary", mb: 2 }}>
              Hello {user?.displayName || user?.email}!
            </Typography>
          </Box>

          <Alert severity="info" sx={{ mb: 3 }}>
            You haven&apos;t joined any leagues yet. Create or join a league to
            get started!
          </Alert>

          <Box
            sx={{
              display: "flex",
              flexDirection: { xs: "column", sm: "row" },
              gap: 2,
            }}
          >
            <Button
              component={Link}
              href="/dashboard/admin"
              variant="contained"
              fullWidth
              sx={{
                maxWidth: { xs: "100%", sm: 200 },
                fontSize: { xs: "0.875rem", sm: "0.9375rem" },
                py: { xs: 1.2, sm: 0.75 },
                background: "linear-gradient(135deg, #D94E23 0%, #E85D2A 100%)",
                "&:hover": {
                  background:
                    "linear-gradient(135deg, #C93F1A 0%, #D94E23 100%)",
                },
              }}
            >
              Create a League
            </Button>
            <Button
              component={Link}
              href="/dashboard/my-leagues"
              variant="outlined"
              fullWidth
              sx={{
                maxWidth: { xs: "100%", sm: 200 },
                fontSize: { xs: "0.875rem", sm: "0.9375rem" },
                py: { xs: 1.2, sm: 0.75 },
              }}
            >
              View My Leagues
            </Button>
          </Box>
        </Container>
      </Box>
    );
  }

  if (!selectedLeague) {
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
          <Alert severity="error">League not found</Alert>
        </Container>
      </Box>
    );
  }

  // Sort members by points (descending) and assign tie-aware ranks with trends
  const rankedMembers = withRankTrends(assignRanks(computedMembers));

  // Calculate user's stats
  const currentUserRanked = rankedMembers.find((m) => m.userId === user.uid);
  const userRank = currentUserRanked?.rank || 0;
  const userPoints = currentUserRanked?.totalPoints || 0;
  const userIsTied = currentUserRanked?.isTied || false;
  const totalLeagues = leagues.length;

  /** Resolve player name: use auth user name for current user, ownerName for others */
  const getPlayerName = (member: { userId: string; ownerName?: string; displayName: string }) =>
    member.userId === user.uid
      ? user.displayName || user.email || member.displayName
      : member.ownerName || member.displayName;

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
        <Box sx={{ mb: { xs: 3, md: 4 }, display: "flex", alignItems: "center", gap: 2 }}>
          <Typography
            component="h1"
            variant="h4"
            sx={{
              fontWeight: 700,
              color: "text.primary",
              mb: 1,
              fontSize: { xs: "1.5rem", sm: "1.75rem", md: "2.125rem" },
            }}
          >
            Welcome Back, {user?.displayName || user?.email?.split("@")[0]}!
          </Typography>
        </Box>

        {/* Quick Stats */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              sm: "1fr 1fr",
              md: "repeat(3, 1fr)",
            },
            gap: 3,
            mb: 4,
          }}
        >
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Active Leagues
              </Typography>
              <Typography
                variant="h5"
                sx={{ color: "#E85D2A", fontWeight: 700 }}
              >
                {totalLeagues}
              </Typography>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Current Rank
              </Typography>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Typography
                  variant="h5"
                  sx={{ color: "#20B2AA", fontWeight: 700 }}
                >
                  {userRank > 0 ? `${userIsTied ? "T-" : "#"}${userRank}` : "—"}
                </Typography>
                {userRank === 1 && (
                  <EmojiEventsIcon sx={{ color: "#FFD700", fontSize: 28 }} />
                )}
              </Box>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Points
              </Typography>
              <Typography
                variant="h5"
                sx={{ color: "#E85D2A", fontWeight: 700 }}
              >
                {userPoints}
              </Typography>
            </CardContent>
          </Card>
        </Box>

        {/* League Selector */}
        {leagues.length > 1 && (
          <Box sx={{ mb: 3 }}>
            <Typography
              variant="subtitle2"
              sx={{
                mb: 1,
                color: "text.secondary",
                fontWeight: 600,
                fontSize: { xs: "0.8rem", sm: "0.875rem" },
              }}
            >
              Select League:
            </Typography>
            <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
              {leagues.map((league) => (
                <Chip
                  key={league.id}
                  label={league.name}
                  onClick={() => setSelectedLeagueId(league.id)}
                  color={selectedLeagueId === league.id ? "primary" : "default"}
                  variant={
                    selectedLeagueId === league.id ? "filled" : "outlined"
                  }
                  sx={{
                    fontSize: { xs: "0.8rem", sm: "0.9rem" },
                    py: { xs: 2, sm: 2.5 },
                    px: { xs: 1.5, sm: 2 },
                    fontWeight:
                      selectedLeagueId === league.id ? "bold" : "normal",
                    bgcolor:
                      selectedLeagueId === league.id
                        ? "#E85D2A"
                        : "transparent",
                    color: selectedLeagueId === league.id ? "white" : "inherit",
                    "&:hover": {
                      bgcolor:
                        selectedLeagueId === league.id
                          ? "#D94E23"
                          : "rgba(0, 0, 0, 0.04)",
                    },
                  }}
                />
              ))}
            </Box>
          </Box>
        )}

        {/* Leaderboard */}
        <Paper sx={{ overflow: "hidden" }}>
          <Box
            sx={{
              p: { xs: 2, sm: 3 },
              bgcolor: (theme) =>
                theme.palette.mode === "dark"
                  ? "rgba(232, 93, 42, 0.15)"
                  : "rgba(232, 93, 42, 0.05)",
              borderBottom: "1px solid",
              borderColor: "divider",
            }}
          >
            <Typography
              component="h2"
              variant="h6"
              sx={{
                fontWeight: 700,
                fontSize: { xs: "1.1rem", sm: "1.25rem" },
              }}
            >
              {selectedLeague.name} Leaderboard
            </Typography>
            <Typography
              variant="body2"
              sx={{
                color: "text.secondary",
                fontSize: { xs: "0.8rem", sm: "0.875rem" },
              }}
            >
              {selectedLeague.memberDetails?.length || 0}/
              {selectedLeague.maxPlayers} Members
            </Typography>
          </Box>

          {/* Desktop Table View */}
          <TableContainer sx={{ display: { xs: "none", md: "block" } }}>
            <Table aria-label={`${selectedLeague.name} league standings`}>
              <TableHead>
                <TableRow
                  sx={{
                    bgcolor: (theme) =>
                      theme.palette.mode === "dark"
                        ? "rgba(255, 255, 255, 0.05)"
                        : "#f5f5f5",
                  }}
                >
                  <TableCell sx={{ fontWeight: 600 }}>Rank</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Tribe</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Player</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>
                    Points
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>
                    Roster
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rankedMembers.map((member) => {
                  const isCurrentUser = member.userId === user.uid;
                  const activeRoster =
                    member.roster?.filter(
                      (id) => !eliminatedIds.has(id),
                    ).length || 0;

                  return (
                    <TableRow
                      key={member.userId}
                      sx={{
                        bgcolor: isCurrentUser
                          ? "rgba(232, 93, 42, 0.08)"
                          : "transparent",
                        "&:hover": {
                          bgcolor: isCurrentUser
                            ? "rgba(232, 93, 42, 0.12)"
                            : "rgba(0, 0, 0, 0.04)",
                        },
                      }}
                    >
                      <TableCell>
                        <Box sx={{ display: "flex", alignItems: "center" }}>
                          <Typography
                            sx={{
                              fontWeight: isCurrentUser ? 700 : 400,
                              fontSize: "1.1rem",
                              color:
                                member.rank === 1
                                  ? "#FFD700"
                                  : member.rank === 2
                                    ? "#C0C0C0"
                                    : member.rank === 3
                                      ? "#CD7F32"
                                      : "inherit",
                            }}
                          >
                            {member.isTied ? "T-" : ""}{member.rank}
                          </Typography>
                          {member.rank === 1 && (
                            <EmojiEventsIcon
                              sx={{
                                ml: 1,
                                color: "#FFD700",
                                fontSize: 20,
                              }}
                            />
                          )}
                          <RankTrendIndicator trend={member.trend} delta={member.trendDelta} />
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: "flex", alignItems: "center" }}>
                          <Box
                            sx={{
                              width: 16,
                              height: 16,
                              borderRadius: "50%",
                              bgcolor: member.tribeColor || "#999",
                              mr: 1,
                            }}
                          />
                          <Typography
                            sx={{ fontWeight: isCurrentUser ? 700 : 400 }}
                          >
                            {member.displayName}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography
                          sx={{ fontWeight: isCurrentUser ? 600 : 400 }}
                        >
                          {getPlayerName(member)}
                          {isCurrentUser && (
                            <Chip
                              label="You"
                              size="small"
                              sx={{
                                ml: 1,
                                bgcolor: "#E85D2A",
                                color: "white",
                                fontWeight: 600,
                                fontSize: "0.7rem",
                              }}
                            />
                          )}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography
                          sx={{
                            fontWeight: isCurrentUser ? 700 : 600,
                            fontSize: "1.1rem",
                            color: "#E85D2A",
                          }}
                        >
                          {member.totalPoints || 0}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" color="text.secondary">
                          {activeRoster}/5
                        </Typography>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Mobile Card View */}
          <Box sx={{ display: { xs: "block", md: "none" }, p: 2 }}>
            {rankedMembers.map((member) => {
              const isCurrentUser = member.userId === user.uid;
              const activeRoster =
                member.roster?.filter(
                  (id) => !eliminatedIds.has(id),
                ).length || 0;

              return (
                <Card
                  key={member.userId}
                  sx={{
                    mb: 1.5,
                    bgcolor: isCurrentUser
                      ? "rgba(232, 93, 42, 0.08)"
                      : "transparent",
                    border: isCurrentUser
                      ? "2px solid #E85D2A"
                      : "1px solid #e0e0e0",
                  }}
                >
                  <CardContent sx={{ p: 1.5, "&:last-child": { pb: 1.5 } }}>
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        mb: 1,
                      }}
                    >
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <Typography
                          sx={{
                            fontWeight: 700,
                            fontSize: "1.2rem",
                            color:
                              member.rank === 1
                                ? "#FFD700"
                                : member.rank === 2
                                  ? "#C0C0C0"
                                  : member.rank === 3
                                    ? "#CD7F32"
                                    : "text.primary",
                          }}
                        >
                          {member.isTied ? "T-" : "#"}{member.rank}
                        </Typography>
                        {member.rank === 1 && (
                          <EmojiEventsIcon
                            sx={{ color: "#FFD700", fontSize: 20 }}
                          />
                        )}
                        <RankTrendIndicator trend={member.trend} delta={member.trendDelta} />
                      </Box>
                      <Typography
                        sx={{
                          fontWeight: 700,
                          fontSize: "1.2rem",
                          color: "#E85D2A",
                        }}
                      >
                        {member.totalPoints || 0} pts
                      </Typography>
                    </Box>

                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 1,
                      }}
                    >
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <Box
                          sx={{
                            width: 14,
                            height: 14,
                            borderRadius: "50%",
                            bgcolor: member.tribeColor || "#999",
                          }}
                        />
                        <Typography
                          sx={{
                            fontWeight: isCurrentUser ? 600 : 400,
                            fontSize: "0.95rem",
                          }}
                        >
                          {getPlayerName(member)}
                        </Typography>
                        {isCurrentUser && (
                          <Chip
                            label="You"
                            size="small"
                            sx={{
                              bgcolor: "#E85D2A",
                              color: "white",
                              fontWeight: 600,
                              fontSize: "0.65rem",
                              height: 20,
                            }}
                          />
                        )}
                      </Box>
                      <Typography
                        variant="body2"
                        sx={{
                          color: "text.secondary",
                          fontSize: "0.8rem",
                        }}
                      >
                        {activeRoster}/5
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              );
            })}
          </Box>

          <Box
            sx={{
              p: { xs: 1.5, sm: 2 },
              bgcolor: (theme) =>
                theme.palette.mode === "dark"
                  ? "rgba(255, 255, 255, 0.05)"
                  : "#f5f5f5",
              textAlign: "center",
            }}
          >
            <Button
              component={Link}
              href={`/dashboard/my-leagues/${selectedLeagueId}`}
              variant="outlined"
              fullWidth
              sx={{
                maxWidth: { xs: "100%", sm: 300 },
                borderColor: "#E85D2A",
                color: "#E85D2A",
                fontSize: { xs: "0.875rem", sm: "0.9375rem" },
                py: { xs: 1, sm: 0.75 },
                "&:hover": {
                  borderColor: "#D94E23",
                  bgcolor: "rgba(232, 93, 42, 0.08)",
                },
              }}
            >
              View League Details
            </Button>
          </Box>
        </Paper>
      </Container>

      {/* Tutorial Dialog */}
      {user && (
        <AppTutorial
          userId={user.uid}
          open={showTutorial}
          onClose={() => setShowTutorial(false)}
        />
      )}
    </Box>
  );
}
