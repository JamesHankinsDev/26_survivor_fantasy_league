"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
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
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useLeague } from "@/hooks/useLeagues";
import { useEliminatedCastaways } from "@/hooks/useCastaways";
import { useComputedScores } from "@/hooks/useScores";
import {
  TribeMember,
  getMemberRank,
} from "@/types/league";
import TribeCard from "@/components/TribeCard";
import EditTribeDialog from "@/components/EditTribeDialog";
import { DraftTeamModal } from "@/components/DraftTeamModal";
import { AddDropModal } from "@/components/AddDropModal";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ForumIcon from "@mui/icons-material/Forum";
import { CURRENT_SEASON } from "@/data/seasons";
import { useSeasonCastaways } from "@/hooks/useCastaways";
import { isNetRosterChangeAllowed, getLatestLockedRoster } from "@/utils/scoring";
import ScoringHistory from "@/components/ScoringHistory";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-client";

export default function LeagueDetailPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const leagueId = params.id as string;
  const queryClient = useQueryClient();

  /** Invalidate league caches so all views reflect the latest data */
  const invalidateLeagueData = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: queryKeys.leagues.detail(leagueId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.leagues.all });
  }, [queryClient, leagueId]);

  // React Query hooks for data fetching
  const {
    data: league,
    isLoading: loadingLeague,
    error: leagueError,
  } = useLeague(leagueId);

  const { data: castaways = [] } = useSeasonCastaways(CURRENT_SEASON.number);

  const { data: eliminatedCastawayIds = [] } = useEliminatedCastaways(
    CURRENT_SEASON.number
  );

  const { computedMembers, castawaySeasonScores } = useComputedScores(
    CURRENT_SEASON.number,
    league?.memberDetails || [],
  );

  // Local UI state
  const [error, setError] = useState("");
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [draftDialogOpen, setDraftDialogOpen] = useState(false);
  const [addDropDialogOpen, setAddDropDialogOpen] = useState(false);
  const [_isSaving, setIsSaving] = useState(false);

  // Check membership and redirect if not a member
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/");
      return;
    }

    if (league && user) {
      const isMember =
        league.members?.includes(user.uid) ||
        league.memberDetails?.some((m: TribeMember) => m.userId === user.uid);
      if (!isMember) {
        setError("You are not a member of this league");
        setTimeout(() => router.push("/dashboard/my-leagues"), 2000);
      }
    }
  }, [user, authLoading, league, router]);

  // Get current user's tribe
  const currentUserTribe = useMemo(
    () => computedMembers.find((m) => m.userId === user?.uid),
    [computedMembers, user],
  );

  // Calculate week number
  const weekNumber = useMemo(() => {
    if (!league?.leagueStartDate) return null;
    const start = new Date(league.leagueStartDate);
    const now = new Date();
    const msPerWeek = 7 * 24 * 60 * 60 * 1000;
    return Math.max(
      1,
      Math.floor((now.getTime() - start.getTime()) / msPerWeek) + 1,
    );
  }, [league]);

  // Tribe info save
  const handleSaveTribeInfo = useCallback(
    async (displayName: string, avatar: string, tribeColor: string) => {
      if (!league || !user) throw new Error("Missing league or user info");
      setIsSaving(true);
      try {
        const updatedMembers = league.memberDetails.map((member) =>
          member.userId === user.uid
            ? {
                ...member,
                displayName,
                avatar,
                tribeColor,
              }
            : member,
        );
        const leagueRef = doc(db, "leagues", league.id);
        await updateDoc(leagueRef, {
          memberDetails: updatedMembers,
          updatedAt: new Date(),
        });
        invalidateLeagueData();
        setEditDialogOpen(false);
      } finally {
        setIsSaving(false);
      }
    },
    [league, user, invalidateLeagueData],
  );

  // Draft submit — saves roster as working roster (will be snapshotted at Wed 8pm)
  const handleSubmitDraft = useCallback(
    async (selectedCastawayIds: string[]) => {
      if (!league || !user) throw new Error("Missing league or user info");
      setIsSaving(true);
      try {
        const updatedMembers = league.memberDetails.map((member) =>
          member.userId === user.uid
            ? {
                ...member,
                roster: selectedCastawayIds,
                totalPoints: 0,
                draftedAt: new Date(),
                weeklyRosters: member.weeklyRosters || [],
              }
            : member,
        );
        const leagueRef = doc(db, "leagues", league.id);
        await updateDoc(leagueRef, {
          memberDetails: updatedMembers,
          updatedAt: new Date(),
        });
        invalidateLeagueData();
        setDraftDialogOpen(false);
      } finally {
        setIsSaving(false);
      }
    },
    [league, user, invalidateLeagueData],
  );

  // Add/Drop submit
  const handleSubmitAddDrop = useCallback(
    async (dropId: string | null, addId: string | null) => {
      if (!league || !user || !currentUserTribe)
        throw new Error("Missing league or user info");
      setIsSaving(true);
      try {
        // Reset to prior week
        if (dropId === "__RESET_TO_PRIOR_WEEK__") {
          const previousRoster = getLatestLockedRoster(
            currentUserTribe.weeklyRosters || [],
          );
          if (previousRoster.length === 0)
            throw new Error("No prior week roster to reset to.");

          const updatedMembers = league.memberDetails.map((member) =>
            member.userId === user.uid
              ? {
                  ...member,
                  roster: previousRoster,
                }
              : member,
          );
          const leagueRef = doc(db, "leagues", league.id);
          await updateDoc(leagueRef, {
            memberDetails: updatedMembers,
            updatedAt: new Date(),
          });
          invalidateLeagueData();
          setAddDropDialogOpen(false);
          setIsSaving(false);
          return;
        }

        // Normal add/drop — modify the working roster
        let newRoster = [...(currentUserTribe.roster || [])];

        if (dropId) {
          newRoster = newRoster.filter((id) => id !== dropId);
        }
        if (addId) {
          newRoster.push(addId);
        }

        // Enforce net roster change limit
        if (league.addDropRestrictionEnabled) {
          const previousRoster = getLatestLockedRoster(
            currentUserTribe.weeklyRosters || [],
          );
          if (previousRoster.length > 0 && !isNetRosterChangeAllowed(previousRoster, newRoster)) {
            setIsSaving(false);
            throw new Error(
              "You can only make one net roster change per week. At least 4 out of 5 castaways must remain the same as last week.",
            );
          }
        }

        const updatedMembers = league.memberDetails.map((member) =>
          member.userId === user.uid
            ? {
                ...member,
                roster: newRoster,
              }
            : member,
        );
        const leagueRef = doc(db, "leagues", league.id);
        await updateDoc(leagueRef, {
          memberDetails: updatedMembers,
          updatedAt: new Date(),
        });
        invalidateLeagueData();
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
    },
    [league, user, currentUserTribe, invalidateLeagueData],
  );

  // Sorted members and counts
  const sortedMembers = useMemo(
    () => [...computedMembers].sort((a, b) => b.totalPoints - a.totalPoints),
    [computedMembers],
  );
  const totalMembers =
    computedMembers.length ??
    league?.members?.length ??
    league?.currentPlayers ??
    0;
  const otherCount = Math.max(0, totalMembers - (currentUserTribe ? 1 : 0));

  if (authLoading || loadingLeague) {
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
  if (error || leagueError || !league) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error" sx={{ mb: 3 }}>
          {error || (leagueError as Error)?.message || "League not found"}
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
            sx={{ bgcolor: "#E85D2A", "&:hover": { bgcolor: "#d14d1a" } }}
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
          {typeof weekNumber === "number" && (
            <>
              <Typography variant="body2" sx={{ color: "text.secondary" }}>
                •
              </Typography>
              <Chip
                label={`Week #${weekNumber}`}
                size="small"
                sx={{
                  bgcolor: "rgba(32, 178, 170, 0.1)",
                  color: "#20B2AA",
                  fontWeight: 600,
                }}
              />
            </>
          )}
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
              allCastaways={castaways}
              eliminatedCastawayIds={eliminatedCastawayIds}
              castawayPoints={currentUserTribe.castawayPoints}
              castawaySeasonScores={castawaySeasonScores}
            />
          )}

          {/* Scoring History */}
          {currentUserTribe.weeklyRosters &&
            currentUserTribe.weeklyRosters.length > 0 && (
              <Box sx={{ mt: 2 }}>
                <ScoringHistory
                  weeklyRosters={currentUserTribe.weeklyRosters}
                  allCastaways={castaways}
                />
              </Box>
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
                allCastaways={castaways}
                eliminatedCastawayIds={eliminatedCastawayIds}
                castawayPoints={member.castawayPoints}
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
        allCastaways={castaways}
        eliminatedCastawayIds={eliminatedCastawayIds}
        castawaySeasonScores={castawaySeasonScores}
      />

      {/* Add/Drop Modal */}

      {currentUserTribe && (
        <AddDropModal
          open={addDropDialogOpen}
          onClose={() => setAddDropDialogOpen(false)}
          onSubmit={handleSubmitAddDrop}
          tribeMember={currentUserTribe}
          allCastaways={castaways}
          eliminatedCastawayIds={eliminatedCastawayIds}
          seasonStartDate={
            league?.leagueStartDate
              ? new Date(league.leagueStartDate)
              : new Date()
          }
          castawaySeasonScores={castawaySeasonScores}
          addDropRestrictionEnabled={league?.addDropRestrictionEnabled ?? false}
        />
      )}
    </Container>
  );
}
