"use client";

import { useState, useEffect } from "react";
import {
  Box,
  Container,
  Typography,
  Button,
  Alert,
  Stack,
  Card,
  CardContent,
  CircularProgress,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import ScoreboardIcon from "@mui/icons-material/Scoreboard";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import CreateLeagueDialog from "@/components/CreateLeagueDialog";
import LeagueList from "@/components/LeagueList";
import { League } from "@/types/league";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { useRouter } from "next/navigation";

export default function AdminPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isOwner, setIsOwner] = useState(false);
  const [checkingOwnership, setCheckingOwnership] = useState(true);

  // Check if user owns any leagues
  useEffect(() => {
    const checkOwnership = async () => {
      if (!user) {
        setIsOwner(false);
        setCheckingOwnership(false);
        return;
      }

      try {
        const leaguesRef = collection(db, "leagues");
        const q = query(leaguesRef, where("ownerId", "==", user.uid));
        const snapshot = await getDocs(q);
        setIsOwner(!snapshot.empty);
      } catch (err) {
        console.error("Error checking league ownership:", err);
        setIsOwner(false);
      } finally {
        setCheckingOwnership(false);
      }
    };

    if (!authLoading) {
      checkOwnership();
    }
  }, [user, authLoading, refreshTrigger]);

  const handleLeagueCreated = (league: League) => {
    // Trigger a refresh of the league list and ownership check
    setRefreshTrigger((prev) => prev + 1);
  };

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
        <Box sx={{ mb: 4 }}>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              mb: 2,
              flexWrap: "wrap",
              gap: 2,
            }}
          >
            <Box>
              <Typography
                variant="h4"
                sx={{
                  fontWeight: 700,
                  color: "#1A1A1A",
                  mb: 0.5,
                }}
              >
                League Management
              </Typography>
              <Typography variant="body2" sx={{ color: "text.secondary" }}>
                Create and manage your fantasy leagues
              </Typography>
            </Box>

            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setDialogOpen(true)}
              sx={{
                background: "linear-gradient(135deg, #D94E23 0%, #E85D2A 100%)",
                "&:hover": {
                  background:
                    "linear-gradient(135deg, #C93F1A 0%, #D94E23 100%)",
                },
              }}
            >
              Create League
            </Button>
          </Box>

          {!isOwner && !checkingOwnership && (
            <Alert severity="info" sx={{ mb: 3 }}>
              <strong>Welcome!</strong> You&apos;re currently a player in one or
              more leagues. To access admin tools for managing episode scoring
              and eliminations, create your own league.
            </Alert>
          )}
          {isOwner && (
            <Alert severity="info" sx={{ mb: 3 }}>
              Create leagues and share join links with your friends. Each league
              can have between 2 and 20 players. As a league owner, you&apos;ll
              manage episode scoring and eliminations for your specific league.
            </Alert>
          )}
        </Box>

        {/* Admin Tools - Only show if user owns leagues */}
        {checkingOwnership ? (
          <Box sx={{ textAlign: "center", py: 4 }}>
            <CircularProgress />
          </Box>
        ) : isOwner ? (
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                sm: "repeat(2, 1fr)",
                md: "repeat(3, 1fr)",
              },
              gap: 2,
              mb: 4,
            }}
          >
            <Card sx={{ height: "100%", "&:hover": { boxShadow: 3 } }}>
              <CardContent sx={{ textAlign: "center", py: 3 }}>
                <ScoreboardIcon
                  sx={{ fontSize: 40, color: "#E85D2A", mb: 1 }}
                />
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                  Episode Scoring
                </Typography>
                <Typography
                  variant="body2"
                  sx={{ color: "text.secondary", mb: 2 }}
                >
                  Record castaway events and points for your leagues
                </Typography>
                <Button
                  component={Link}
                  href="/dashboard/admin/scores"
                  variant="outlined"
                  fullWidth
                >
                  Manage Scores
                </Button>
              </CardContent>
            </Card>

            <Card sx={{ height: "100%", "&:hover": { boxShadow: 3 } }}>
              <CardContent sx={{ textAlign: "center", py: 3 }}>
                <EmojiEventsIcon
                  sx={{ fontSize: 40, color: "#20B2AA", mb: 1 }}
                />
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                  Eliminations
                </Typography>
                <Typography
                  variant="body2"
                  sx={{ color: "text.secondary", mb: 2 }}
                >
                  Mark castaways eliminated from your leagues
                </Typography>
                <Button
                  component={Link}
                  href="/dashboard/admin/eliminations"
                  variant="outlined"
                  fullWidth
                >
                  Manage Eliminations
                </Button>
              </CardContent>
            </Card>
          </Box>
        ) : (
          <Alert severity="info" sx={{ mb: 4 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
              League Owner Features
            </Typography>
            <Typography variant="body2">
              Episode scoring and elimination management are only available to
              league owners. Create your own league above to access these admin
              tools.
            </Typography>
          </Alert>
        )}

        <LeagueList refreshTrigger={refreshTrigger} />
      </Container>

      {/* Create League Dialog */}
      <CreateLeagueDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onLeagueCreated={handleLeagueCreated}
      />
    </Box>
  );
}
