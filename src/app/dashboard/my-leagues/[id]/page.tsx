"use client";

import { useEffect, useState } from "react";
import {
  Container,
  Box,
  Typography,
  Button,
  CircularProgress,
  Alert,
  Divider,
  Chip,
} from "@mui/material";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import {
  doc,
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
import ForumIcon from "@mui/icons-material/Forum";
import CASTAWAYS from "@/data/castaways";
import { CURRENT_SEASON } from "@/data/seasons";
import {
  loadEliminatedCastaways,
  isNetRosterChangeAllowed,
} from "@/utils/scoring";
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
    [],
  );
  const [castawaySeasonScores, setCastawaySeasonScores] = useState<
    Record<string, number>
  >({});

  // Get current user's tribe member info
  const currentUserTribe = league?.memberDetails?.find(
    (m) => m.userId === user?.uid,
  );

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/");
      return;
    }

    if (!user || !leagueId) return;

    // Load league-specific data
    const loadLeagueData = async () => {
      try {
        // Load eliminated castaways for this league
        const eliminated = await loadEliminatedCastaways(
          leagueId,
          CURRENT_SEASON.number,
        );
        setEliminatedCastawayIds(eliminated);

        // Load castaway season scores for this league
        const episodesRef = collection(
          db,
          "leagues",
          leagueId,
          "seasons",
          CURRENT_SEASON.number.toString(),
          "episodes",
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
        console.error("Error loading league data:", err);
      }
    };

    loadLeagueData();

    // Listen for league details
    try {
      const leagueRef = doc(db, "leagues", leagueId);
      const unsubscribe = onSnapshot(
        leagueRef,
        (docSnap) => {
          if (docSnap.exists()) {
            const raw = docSnap.data() as any;
            // ...existing code...

            // Normalize missing fields for older documents
            const normalized: League = {
              id: docSnap.id,
              name: raw.name,
              ownerId: raw.ownerId,
              ownerName: raw.ownerName,
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
              addDropRestrictionEnabled:
                typeof raw.addDropRestrictionEnabled !== "undefined"
                  ? raw.addDropRestrictionEnabled
                  : false,
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
        },
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
    tribeColor: string,
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
          : member,
      );

      const leagueRef = doc(db, "leagues", league.id);
      await updateDoc(leagueRef, {
        memberDetails: updatedMembers,
        updatedAt: new Date(),
      });

      setEditDialogOpen(false);
    } catch (err) {
      throw new Error(
        err instanceof Error ? err.message : "Failed to save tribe info",
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
        }),
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
          : member,
      );

      const leagueRef = doc(db, "leagues", league.id);
      await updateDoc(leagueRef, {
        memberDetails: updatedMembers,
        updatedAt: new Date(),
      });

      setDraftDialogOpen(false);
    } catch (err) {
      throw new Error(
        err instanceof Error ? err.message : "Failed to submit draft",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmitAddDrop = async (
    dropId: string | null,
    addId: string | null,
  ) => {
    if (!league || !user || !currentUserTribe)
      throw new Error("Missing league or user info");

    setIsSaving(true);

    try {
      // Calculate the current week
      const seasonStartDate = new Date("2025-01-01");
      const seasonPremierDate = new Date(CURRENT_SEASON.premiereDate);
      const getCurrentWeek = (seasonStart: Date, premiere: Date) => {
        const now = new Date();
        if (now < premiere) return 0;
        // Weeks start at Wed 8pm ET
        const msPerWeek = 7 * 24 * 60 * 60 * 1000;
        const firstLock = new Date(premiere);
        firstLock.setDate(
          firstLock.getDate() + ((3 - firstLock.getDay() + 7) % 7),
        );
        firstLock.setHours(20, 0, 0, 0);
        let week = 1;
        let lock = new Date(firstLock);
        while (now > lock) {
          lock = new Date(lock.getTime() + msPerWeek);
          week++;
        }
        return week - 1;
      };
      const currentWeek = getCurrentWeek(seasonStartDate, seasonPremierDate);

      // Get previous week's roster for net change check
      const previousWeek = currentWeek - 1;
      const previousRoster =
        currentUserTribe.weeklyRosterHistory?.find(
          (w) => w.week === previousWeek,
        )?.roster || [];

      // Update roster with add/drop
      const updatedRoster =
        currentUserTribe.roster?.map((entry) => {
          // Mark dropped castaway
          if (entry.castawayId === dropId) {
            return {
              ...entry,
              status: "dropped" as const,
              droppedWeek: currentWeek,
            };
          }
          return entry;
        }) || [];

      // Add new castaway if provided
      if (addId) {
        // Check if castaway was previously dropped - if so, reactivate instead of creating new
        const previouslyDropped = updatedRoster.find(
          (entry) => entry.castawayId === addId && entry.status === "dropped",
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
            addedWeek: currentWeek,
            accumulatedPoints: 0,
          });
        }
      }

      // ENFORCE ADD/DROP RESTRICTION (backend)
      if (league.addDropRestrictionEnabled && previousRoster.length > 0) {
        // Import isNetRosterChangeAllowed from utils/scoring
        // (already imported at top)
        if (!isNetRosterChangeAllowed(previousRoster, updatedRoster)) {
          setIsSaving(false);
          throw new Error(
            "You can only make one net roster change per week. At least 4 out of 5 castaways must remain the same as last week.",
          );
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
          : member,
      );

      const leagueRef = doc(db, "leagues", league.id);
      await updateDoc(leagueRef, {
        memberDetails: updatedMembers,
        updatedAt: new Date(),
      });

      setAddDropDialogOpen(false);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to process add/drop",
      );
      setIsSaving(false);
      throw err;
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
    (a, b) => b.points - a.points,
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
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            mb: 2,
          }}
        >
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => router.push("/dashboard/my-leagues")}
            sx={{ color: "#E85D2A" }}
          >
            Back to My Leagues
          </Button>
          <Button
            variant="contained"
            startIcon={<ForumIcon />}
            onClick={() =>
              router.push(`/dashboard/my-leagues/${leagueId}/messages`)
            }
            sx={{
              bgcolor: "#E85D2A",
              "&:hover": { bgcolor: "#d14d1a" },
            }}
          >
            Message Board
          </Button>
        </Box>
        <Typography
          variant="h4"
          sx={{ fontWeight: 700, color: "text.primary", mb: 1 }}
        >
          {league.name}
        </Typography>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 2,
            flexWrap: "wrap",
          }}
        >
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            Owner: {league.ownerName}
          </Typography>
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            •
          </Typography>
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            {league.currentPlayers}/{league.maxPlayers} Players
          </Typography>
          {user?.uid === league.ownerId && (
            <>
              <Typography variant="body2" sx={{ color: "text.secondary" }}>
                •
              </Typography>
              <Chip
                label="You are the Owner"
                size="small"
                sx={{
                  bgcolor: "rgba(232, 93, 42, 0.1)",
                  color: "#E85D2A",
                  fontWeight: 600,
                }}
              />
            </>
          )}
        </Box>
      </Box>

      {/* Current User's Tribe Card (Highlighted) */}
      {currentUserTribe && (
        <Box sx={{ mb: 4 }}>
          <Typography
            variant="subtitle1"
            sx={{ fontWeight: 600, mb: 2, color: "text.primary" }}
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
              eliminatedCastawayIds={eliminatedCastawayIds}
            />
          )}
        </Box>
      )}

      <Divider sx={{ my: 4 }} />

      {/* Other Tribes */}
      <Box>
        <Typography
          variant="subtitle1"
          sx={{ fontWeight: 600, mb: 2, color: "text.primary" }}
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
                eliminatedCastawayIds={eliminatedCastawayIds}
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
