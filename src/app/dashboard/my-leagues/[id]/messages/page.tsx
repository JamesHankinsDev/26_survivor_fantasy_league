"use client";

import { useEffect, useState } from "react";
import {
  Container,
  Box,
  Typography,
  CircularProgress,
  Alert,
  Button,
  Paper,
} from "@mui/material";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { League } from "@/types/league";
import MessageBoard from "@/components/MessageBoard";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";

export default function LeagueMessagesPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const leagueId = params.id as string;

  const [league, setLeague] = useState<League | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/");
      return;
    }

    if (!user || !leagueId) return;

    const loadLeague = async () => {
      try {
        const leagueRef = doc(db, "leagues", leagueId);
        const docSnap = await getDoc(leagueRef);

        if (docSnap.exists()) {
          const raw = docSnap.data() as any;

          const normalized: League = {
            id: docSnap.id,
            name: raw.name,
            ownerId: raw.ownerId,
            ownerName: raw.ownerName,
            ownerEmail: raw.ownerEmail,
            maxPlayers: raw.maxPlayers,
            currentPlayers:
              raw.currentPlayers ??
              raw.memberDetails?.length ??
              raw.members?.length ??
              0,
            joinCode: raw.joinCode,
            members: raw.members || [],
            memberDetails: raw.memberDetails || [],
            createdAt: raw.createdAt?.toDate
              ? raw.createdAt.toDate()
              : raw.createdAt || new Date(),
            updatedAt: raw.updatedAt?.toDate
              ? raw.updatedAt.toDate()
              : raw.updatedAt || new Date(),
            status: raw.status || "active",
          } as League;

          // Check membership
          const isMember =
            normalized.members?.includes(user.uid) ||
            normalized.memberDetails?.some((m) => m.userId === user.uid);

          if (!isMember) {
            setError("You are not a member of this league");
            setTimeout(() => router.push("/dashboard/my-leagues"), 2000);
            return;
          }

          setLeague(normalized);
        } else {
          setError("League not found");
        }
      } catch (err) {
        console.error("Error loading league:", err);
        setError("Failed to load league details");
      } finally {
        setLoading(false);
      }
    };

    loadLeague();
  }, [user, authLoading, leagueId, router]);

  if (authLoading || loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box
          display="flex"
          justifyContent="center"
          alignItems="center"
          minHeight="60vh"
        >
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  if (!league || !user) {
    return null;
  }

  const currentUserMember = league.memberDetails.find(
    (m) => m.userId === user.uid,
  );

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box mb={3}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => router.push(`/dashboard/my-leagues/${leagueId}`)}
          sx={{ mb: 2 }}
        >
          Back to League
        </Button>
        <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
          <Typography variant="h4" gutterBottom>
            {league.name} - Message Board
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Share updates, strategies, and banter with your league members. Use
            @ to mention users or tribes!
          </Typography>
        </Paper>
      </Box>

      <MessageBoard
        league={league}
        currentUserId={user.uid}
        currentUserName={
          currentUserMember?.displayName || user.email || "Anonymous"
        }
        currentUserAvatar={currentUserMember?.avatar}
      />
    </Container>
  );
}
