"use client";

import { useEffect, useState } from "react";
import {
  Box,
  Container,
  Typography,
  CircularProgress,
  Alert,
  Button,
} from "@mui/material";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { useAuth } from "@/lib/auth-context";
import { db } from "@/lib/firebase";
import { dbLogger } from "@/lib/logger";
import { useUserLeagues } from "@/hooks/useLeagues";
import AppTutorial from "@/components/AppTutorial";

export default function DashboardHome() {
  const { user, isDemoMode } = useAuth();
  const router = useRouter();
  const [showTutorial, setShowTutorial] = useState(false);

  const { data: leagues = [], isLoading: loadingLeagues } = useUserLeagues(
    user?.uid || null,
  );

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

  useEffect(() => {
    if (!user) router.push("/");
  }, [user, router]);

  // Redirect to the active league's details page. Priority:
  //   1. Last viewed league (localStorage)
  //   2. Only league the user belongs to
  //   3. First league returned
  // Users with zero leagues stay here to see the empty state.
  useEffect(() => {
    if (loadingLeagues || !user || leagues.length === 0) return;
    let targetId: string | null = null;
    if (typeof window !== "undefined") {
      const stored = window.localStorage.getItem("survivor:lastViewedLeagueId");
      if (stored && leagues.some((l) => l.id === stored)) targetId = stored;
    }
    if (!targetId) targetId = leagues[0].id;
    router.replace(`/dashboard/my-leagues/${targetId}`);
  }, [loadingLeagues, user, leagues, router]);

  if (!user) return null;

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
              sx={{ fontWeight: 700, color: "text.primary", mb: 1 }}
            >
              Welcome to Survivor Fantasy League
            </Typography>
            <Typography variant="body1" sx={{ color: "text.secondary", mb: 2 }}>
              Hello {user?.displayName || user?.email}!
            </Typography>
          </Box>

          <Alert severity="info" sx={{ mb: 3 }}>
            You haven&apos;t joined any leagues yet. Create one from the League
            dropdown in the sidebar to get started!
          </Alert>

          <Button
            component={Link}
            href="/dashboard/admin"
            variant="contained"
            sx={{
              maxWidth: 240,
              background: "linear-gradient(135deg, #D94E23 0%, #E85D2A 100%)",
              "&:hover": {
                background: "linear-gradient(135deg, #C93F1A 0%, #D94E23 100%)",
              },
            }}
          >
            Create a League
          </Button>
        </Container>

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

  // While the redirect effect above runs, show a brief spinner.
  return (
    <Box
      aria-busy="true"
      sx={{
        flex: 1,
        bgcolor: "background.default",
        p: { xs: 2, md: 4 },
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <CircularProgress sx={{ color: "#E85D2A" }} aria-label="Loading" />
    </Box>
  );
}
