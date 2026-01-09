"use client";

import { useEffect, useState } from "react";
import {
  Container,
  Box,
  Typography,
  Stack,
  Button,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  Divider,
} from "@mui/material";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import {
  doc,
  getDoc,
  onSnapshot,
  updateDoc,
  collection,
  getDocs,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  League,
  TribeMember,
  getMemberRank,
  RosterEntry,
  EpisodeEvents,
} from "@/types/league";
import TribeCard from "@/components/TribeCard";
import EditTribeDialog from "@/components/EditTribeDialog";
import { DraftTeamModal } from "@/components/DraftTeamModal";
import { AddDropModal } from "@/components/AddDropModal";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CASTAWAYS from "@/data/castaways";
import { CURRENT_SEASON } from "@/data/seasons";
import { loadEliminatedCastaways } from "@/utils/scoring";
import { calculatePointsFromEvents } from "@/utils/eventScoringConfig";

export default function LeagueDetailPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const leagueId = params.id as string;

  const [league, setLeague] = useState<League | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [draftDialogOpen, setDraftDialogOpen] = useState(false);
  const [addDropDialogOpen, setAddDropDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [eliminatedCastawayIds, setEliminatedCastawayIds] = useState<string[]>(
    []
  );
  const [castawaySeasonScores, setCastawaySeasonScores] = useState<
    Record<string, number>
  >({});

  // Get current user's tribe member info
  const currentUserTribe = league?.memberDetails?.find(
    (m) => m.userId === user?.uid
  );

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/");
      return;
    }

    // Load eliminated castaways
    const loadEliminated = async () => {
      try {
        const eliminated = await loadEliminatedCastaways(CURRENT_SEASON.number);
        setEliminatedCastawayIds(eliminated);
      } catch (err) {
        console.error("Failed to load eliminated castaways:", err);
      }
    };

    loadEliminated();

    if (!user || !leagueId) return;

    // Load castaway season scores
    const loadCastawayScores = async () => {
      try {
        const episodesRef = collection(
          db,
          "seasons",
          CURRENT_SEASON.number.toString(),
          "episodes"
        );
        const snapshot = await getDocs(episodesRef);

        const scores: Record<string, number> = {};

        snapshot.forEach((doc) => {
          const episode = doc.data() as EpisodeEvents;
          Object.entries(episode.events).forEach(([castawayId, events]) => {
            const points = calculatePointsFromEvents(events);
            scores[castawayId] = (scores[castawayId] || 0) + points;
          });
        });

        setCastawaySeasonScores(scores);
      } catch (err) {
        console.error("Error loading castaway scores:", err);
      }
    };

    loadCastawayScores();

    try {
      // Listen for league details
      const leagueRef = doc(db, "leagues", leagueId);
      const unsubscribe = onSnapshot(
        leagueRef,
        (docSnap) => {
          if (docSnap.exists()) {
            const raw = docSnap.data() as any;

            // Normalize missing fields for older documents
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

            // Robust membership check: either members array or memberDetails contains user
            const isMember =
              normalized.members?.includes(user.uid) ||
              normalized.memberDetails?.some((m) => m.userId === user.uid);

            if (!isMember) {
              setError("You are not a member of this league");
              setTimeout(() => router.push("/dashboard/my-leagues"), 2000);
              return;
            }

            setLeague(normalized);
            setLoading(false);
          } else {
            setError("League not found");
            setLoading(false);
          }
        },
        (err) => {
          console.error("Error fetching league:", err);
          setError("Failed to load league details");
          setLoading(false);
        }
      );

      return () => unsubscribe();
    } catch (err) {
      console.error("Error setting up league listener:", err);
      setError("Failed to load league details");
      setLoading(false);
    }
  }, [user, authLoading, leagueId, router]);

  const handleSaveTribeInfo = async (
    displayName: string,
    avatar: string,
    tribeColor: string
  ) => {
    if (!league || !user) throw new Error("Missing league or user info");

    setIsSaving(true);

    try {
      // Update member details in the league
      const updatedMembers = league.memberDetails.map((member) =>
        member.userId === user.uid
          ? {
              ...member,
              displayName,
              avatar,
              tribeColor,
              updatedAt: new Date(),
            }
          : member
      );

      const leagueRef = doc(db, "leagues", league.id);
      await updateDoc(leagueRef, {
        memberDetails: updatedMembers,
        updatedAt: new Date(),
      });

      setEditDialogOpen(false);
    } catch (err) {
      throw new Error(
        err instanceof Error ? err.message : "Failed to save tribe info"
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmitDraft = async (selectedCastawayIds: string[]) => {
    if (!league || !user) throw new Error("Missing league or user info");

    setIsSaving(true);

    try {
      // Create roster entries from selected castaways
      const rosterEntries: RosterEntry[] = selectedCastawayIds.map(
        (castawayId) => ({
          castawayId,
          status: "active",
          addedWeek: 0, // Week 0 = draft
          accumulatedPoints: 0,
        })
      );

      // Update member details with roster
      const updatedMembers = league.memberDetails.map((member) =>
        member.userId === user.uid
          ? {
              ...member,
              roster: rosterEntries,
              draftedAt: new Date(),
              updatedAt: new Date(),
            }
          : member
      );

      const leagueRef = doc(db, "leagues", league.id);
      await updateDoc(leagueRef, {
        memberDetails: updatedMembers,
        updatedAt: new Date(),
      });

      setDraftDialogOpen(false);
    } catch (err) {
      throw new Error(
        err instanceof Error ? err.message : "Failed to submit draft"
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmitAddDrop = async (
    dropId: string | null,
    addId: string | null
  ) => {
    if (!league || !user || !currentUserTribe)
      throw new Error("Missing league or user info");

    setIsSaving(true);

    try {
      // Update roster with add/drop
      const updatedRoster =
        currentUserTribe.roster?.map((entry) => {
          // Mark dropped castaway
          if (entry.castawayId === dropId) {
            return {
              ...entry,
              status: "dropped" as const,
              droppedWeek: 1, // TODO: Calculate actual week
            };
          }
          return entry;
        }) || [];

      // Add new castaway if provided
      if (addId) {
        // Check if castaway was previously dropped - if so, reactivate instead of creating new
        const previouslyDropped = updatedRoster.find(
          (entry) => entry.castawayId === addId && entry.status === "dropped"
        );

        if (previouslyDropped) {
          // Reactivate the dropped entry
          previouslyDropped.status = "active";
          // Remove the droppedWeek so it's not considered dropped anymore
          delete previouslyDropped.droppedWeek;
        } else {
          // Add new castaway if they weren't previously on the team
          updatedRoster.push({
            castawayId: addId,
            status: "active",
            addedWeek: 1, // TODO: Calculate actual week
            accumulatedPoints: 0,
          });
        }
      }

      // Update member details with new roster
      const updatedMembers = league.memberDetails.map((member) =>
        member.userId === user.uid
          ? {
              ...member,
              roster: updatedRoster,
              updatedAt: new Date(),
            }
          : member
      );

      const leagueRef = doc(db, "leagues", league.id);
      await updateDoc(leagueRef, {
        memberDetails: updatedMembers,
        updatedAt: new Date(),
      });

      setAddDropDialogOpen(false);
    } catch (err) {
      throw new Error(
        err instanceof Error ? err.message : "Failed to process add/drop"
      );
    } finally {
      setIsSaving(false);
    }
  };

  if (authLoading || loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            minHeight: "400px",
          }}
        >
          <CircularProgress sx={{ color: "#E85D2A" }} />
        </Box>
      </Container>
    );
  }

  if (error || !league) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error" sx={{ mb: 3 }}>
          {error || "League not found"}
        </Alert>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => router.push("/dashboard/my-leagues")}
          sx={{ color: "#E85D2A" }}
        >
          Back to My Leagues
        </Button>
      </Container>
    );
  }

  // Sort members by points (descending) to determine rank
  const sortedMembers = [...(league.memberDetails || [])].sort(
    (a, b) => b.points - a.points
  );

  // Safe member counts (support older docs without memberDetails)
  const totalMembers =
    league.memberDetails?.length ??
    league.members?.length ??
    league.currentPlayers ??
    0;
  const otherCount = Math.max(0, totalMembers - (currentUserTribe ? 1 : 0));

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => router.push("/dashboard/my-leagues")}
          sx={{ mb: 2, color: "#E85D2A" }}
        >
          Back to My Leagues
        </Button>
        <Typography
          variant="h4"
          sx={{ fontWeight: 700, color: "#1A1A1A", mb: 1 }}
        >
          {league.name}
        </Typography>
        <Typography variant="body2" sx={{ color: "text.secondary" }}>
          Owner: {league.ownerName} - {league.currentPlayers}/
          {league.maxPlayers} Players
        </Typography>
      </Box>

      {/* Current User's Tribe Card (Highlighted) */}
      {currentUserTribe && (
        <Box sx={{ mb: 4 }}>
          <Typography
            variant="subtitle1"
            sx={{ fontWeight: 600, mb: 2, color: "#1A1A1A" }}
          >
            Your Tribe
          </Typography>

          {!currentUserTribe.roster || currentUserTribe.roster.length === 0 ? (
            <Alert
              severity="info"
              action={
                <Button
                  color="inherit"
                  size="small"
                  onClick={() => setDraftDialogOpen(true)}
                >
                  Draft Now
                </Button>
              }
              sx={{ mb: 2 }}
            >
              You haven't drafted your team yet. Select 5 castaways to get
              started!
            </Alert>
          ) : (
            <TribeCard
              member={currentUserTribe}
              rank={getMemberRank(sortedMembers, user!.uid)}
              isCurrentUser
              onEdit={() => setEditDialogOpen(true)}
              onAddDrop={() => setAddDropDialogOpen(true)}
              allMembers={sortedMembers}
              allCastaways={CASTAWAYS}
              castawaySeasonScores={castawaySeasonScores}
            />
          )}
        </Box>
      )}

      <Divider sx={{ my: 4 }} />

      {/* Other Tribes */}
      <Box>
        <Typography
          variant="subtitle1"
          sx={{ fontWeight: 600, mb: 2, color: "#1A1A1A" }}
        >
          Other Tribes ({otherCount})
        </Typography>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              sm: "repeat(2, 1fr)",
              md: "repeat(3, 1fr)",
            },
            gap: 2,
          }}
        >
          {sortedMembers
            .filter((m) => m.userId !== user?.uid)
            .map((member) => (
              <TribeCard
                key={member.userId}
                member={member}
                rank={getMemberRank(sortedMembers, member.userId)}
                allMembers={sortedMembers}
                allCastaways={CASTAWAYS}
                castawaySeasonScores={castawaySeasonScores}
              />
            ))}
        </Box>
      </Box>

      {/* Edit Tribe Dialog */}
      <EditTribeDialog
        open={editDialogOpen}
        tribeMember={currentUserTribe || null}
        onSave={handleSaveTribeInfo}
        onClose={() => setEditDialogOpen(false)}
      />

      {/* Draft Team Modal */}
      <DraftTeamModal
        open={draftDialogOpen}
        onClose={() => setDraftDialogOpen(false)}
        onSubmit={handleSubmitDraft}
        allCastaways={CASTAWAYS}
        eliminatedCastawayIds={eliminatedCastawayIds}
      />

      {/* Add/Drop Modal */}
      {currentUserTribe && (
        <AddDropModal
          open={addDropDialogOpen}
          onClose={() => setAddDropDialogOpen(false)}
          onSubmit={handleSubmitAddDrop}
          tribeMember={currentUserTribe}
          allCastaways={CASTAWAYS}
          eliminatedCastawayIds={eliminatedCastawayIds}
          seasonStartDate={new Date("2025-01-01")}
          seasonPremierDate={new Date(CURRENT_SEASON.premiereDate)}
          castawaySeasonScores={castawaySeasonScores}
        />
      )}
    </Container>
  );
}
