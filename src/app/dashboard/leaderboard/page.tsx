"use client";

import React, { useEffect, useState } from "react";
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
import { db } from "@/lib/firebase";
import {
  collection,
  query,
  where,
  onSnapshot,
  QueryConstraint,
} from "firebase/firestore";
import { League, TribeMember } from "@/types/league";
import { CURRENT_SEASON } from "@/data/seasons";

// Prevent static generation for this page
export const dynamic = "force-dynamic";

interface LeagueMember extends TribeMember {
  rank: number;
}

export default function LeaderboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [leagues, setLeagues] = useState<League[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLeagueId, setSelectedLeagueId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      router.push("/");
      return;
    }

    // Subscribe to leagues where user is a member
    const leaguesRef = collection(db, "leagues");
    const constraints: QueryConstraint[] = [
      where("members", "array-contains", user.uid),
    ];

    const unsubscribe = onSnapshot(
      query(leaguesRef, ...constraints),
      (snapshot) => {
        const loadedLeagues = snapshot.docs.map((doc) => {
          const rawData = doc.data() as any;
          return {
            id: doc.id,
            ...rawData,
            createdAt: rawData.createdAt?.toDate?.() || rawData.createdAt,
            updatedAt: rawData.updatedAt?.toDate?.() || rawData.updatedAt,
          } as League;
        });

        setLeagues(loadedLeagues);

        // Auto-select first league
        if (loadedLeagues.length > 0 && !selectedLeagueId) {
          setSelectedLeagueId(loadedLeagues[0].id);
        }

        setLoading(false);
      },
      (error) => {
        console.error("Error loading leagues:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user, router, selectedLeagueId]);

  if (!user) {
    return null;
  }

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4, textAlign: "center" }}>
        <CircularProgress />
      </Container>
    );
  }

  if (leagues.length === 0) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="info">
          You haven't joined any leagues yet. Create or join a league to see
          leaderboards.
        </Alert>
      </Container>
    );
  }

  const selectedLeague = leagues.find((l) => l.id === selectedLeagueId);

  if (!selectedLeague) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error">League not found</Alert>
      </Container>
    );
  }

  // Sort members by points (descending) and assign ranks
  const rankedMembers: LeagueMember[] = (selectedLeague.memberDetails || [])
    .map((member, idx) => ({
      ...member,
      rank: idx + 1, // Will be updated after sort
    }))
    .sort((a, b) => (b.points || 0) - (a.points || 0))
    .map((member, idx) => ({
      ...member,
      rank: idx + 1,
    }));

  return (
    <Box
      sx={{
        flex: 1,
        bgcolor: "#f5f5f5",
        p: { xs: 2, md: 4 },
        overflow: "auto",
      }}
    >
      <Container maxWidth="lg">
        <Typography variant="h4" sx={{ mb: 3, fontWeight: "bold" }}>
          Leaderboards
        </Typography>

        {/* League Selector */}
        <Box sx={{ mb: 4, display: "flex", gap: 1, flexWrap: "wrap" }}>
          {leagues.map((league) => (
            <Chip
              key={league.id}
              label={league.name}
              onClick={() => setSelectedLeagueId(league.id)}
              color={selectedLeagueId === league.id ? "primary" : "default"}
              variant={selectedLeagueId === league.id ? "filled" : "outlined"}
              sx={{
                fontSize: "1rem",
                py: 3,
                px: 2,
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
              <Typography variant="body2" sx={{ color: "#666" }}>
                League Name
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: "bold" }}>
                {selectedLeague.name}
              </Typography>
            </Box>
            <Box>
              <Typography variant="body2" sx={{ color: "#666" }}>
                Members
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: "bold" }}>
                {selectedLeague.memberDetails?.length || 0}/
                {selectedLeague.maxPlayers}
              </Typography>
            </Box>
            <Box>
              <Typography variant="body2" sx={{ color: "#666" }}>
                Season
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: "bold" }}>
                {CURRENT_SEASON.name}
              </Typography>
            </Box>
            <Box>
              <Typography variant="body2" sx={{ color: "#666" }}>
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

        {/* Leaderboard Table */}
        <TableContainer component={Paper}>
          <Table sx={{ minWidth: 600 }}>
            <TableHead sx={{ backgroundColor: "#f5f5f5" }}>
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
                  member.roster?.filter((r) => r.status === "active").length ||
                  0;

                const isCurrentUser = member.userId === user.uid;

                return (
                  <TableRow
                    key={member.userId}
                    sx={{
                      backgroundColor: isCurrentUser
                        ? "#E3F2FD"
                        : "transparent",
                      borderLeft: isCurrentUser
                        ? "4px solid #1976D2"
                        : "4px solid transparent",
                      "&:hover": {
                        backgroundColor: isCurrentUser ? "#E3F2FD" : "#fafafa",
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
                      {member.rank === 1 && "🏆"} {member.rank}
                    </TableCell>
                    <TableCell>
                      {member.displayName || member.userId}
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
                        {member.points || 0}
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
                    {member.rank === 1 && "🏆"}
                    {member.rank === 2 && "🥈"}
                    {member.rank === 3 && "🥉"}
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: "bold", mb: 1 }}>
                    {member.displayName || "Tribe Member"}
                  </Typography>
                  <Typography variant="body2" sx={{ color: "#666", mb: 2 }}>
                    #{member.rank}
                  </Typography>
                  <Typography
                    variant="h5"
                    sx={{
                      color: "#E85D2A",
                      fontWeight: "bold",
                    }}
                  >
                    {member.points || 0} points
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
