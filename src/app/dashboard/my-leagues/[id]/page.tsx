"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
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

  // Load league and related data
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/");
      return;
    }
    if (!user || !leagueId) return;

    setLoading(true);
    setError("");

    // Firestore listener for league
    const leagueRef = doc(db, "leagues", leagueId);
    const unsubscribe = onSnapshot(
      leagueRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const raw = docSnap.data() as any;
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
            leagueStartDate: raw.leagueStartDate || undefined,
          } as League;
          // Membership check
          const isMember =
            normalized.members?.includes(user.uid) ||
            normalized.memberDetails?.some((m) => m.userId === user.uid);
          if (!isMember) {
            setError("You are not a member of this league");
            setTimeout(() => router.push("/dashboard/my-leagues"), 2000);
            return;
          }
          console.log("League Start Date:", normalized.leagueStartDate);
          setLeague(normalized);
          setLoading(false);
        } else {
          setError("League not found");
          setLoading(false);
        }
      },
      (err) => {
        setError("Failed to load league details");
        setLoading(false);
      },
    );

    // Load eliminated castaways and scores
    (async () => {
      try {
        const eliminated = await loadEliminatedCastaways(
          leagueId,
          CURRENT_SEASON.number,
        );
        setEliminatedCastawayIds(eliminated);
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
        // Non-fatal
      }
    })();

    return () => unsubscribe();
  }, [user, authLoading, leagueId, router]);

  // Get current user's tribe
  const currentUserTribe = useMemo(
    () => league?.memberDetails?.find((m) => m.userId === user?.uid),
    [league, user],
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
      } finally {
        setIsSaving(false);
      }
    },
    [league, user],
  );

  // Draft submit
  const handleSubmitDraft = useCallback(
    async (selectedCastawayIds: string[]) => {
      if (!league || !user) throw new Error("Missing league or user info");
      setIsSaving(true);
      try {
        const rosterEntries: RosterEntry[] = selectedCastawayIds.map(
          (castawayId) => ({
            castawayId,
            status: "active",
            addedWeek: 0,
            accumulatedPoints: 0,
          }),
        );
        const leagueStartDate = league.leagueStartDate
          ? new Date(league.leagueStartDate)
          : new Date("2025-01-01");
        const now = new Date();
        const msPerWeek = 7 * 24 * 60 * 60 * 1000;
        const week = Math.floor(
          (now.getTime() - leagueStartDate.getTime()) / msPerWeek,
        );
        const weeklyRosterHistory = [{ week, roster: rosterEntries }];
        const updatedMembers = league.memberDetails.map((member) =>
          member.userId === user.uid
            ? {
                ...member,
                roster: rosterEntries,
                draftedAt: new Date(),
                updatedAt: new Date(),
                weeklyRosterHistory,
              }
            : member,
        );
        const leagueRef = doc(db, "leagues", league.id);
        await updateDoc(leagueRef, {
          memberDetails: updatedMembers,
          updatedAt: new Date(),
        });
        setDraftDialogOpen(false);
      } finally {
        setIsSaving(false);
      }
    },
    [league, user],
  );

  // Add/Drop submit (with reset support)
  const handleSubmitAddDrop = useCallback(
    async (dropId: string | null, addId: string | null) => {
      if (!league || !user || !currentUserTribe)
        throw new Error("Missing league or user info");
      setIsSaving(true);
      try {
        const leagueStartDate = league.leagueStartDate
          ? new Date(league.leagueStartDate)
          : new Date("2025-01-01");
        const now = new Date();
        const msPerWeek = 7 * 24 * 60 * 60 * 1000;
        const currentWeek = Math.ceil(
          (now.getTime() - leagueStartDate.getTime()) / msPerWeek,
        );
        // Reset to prior week
        if (dropId === "__RESET_TO_PRIOR_WEEK__") {
          const previousWeek = currentWeek - 1;
          console.log("CURRENT WEEK:", currentWeek);
          console.log("PRIOR WEEK: ", previousWeek);
          console.log({
            previousWeek,
            previousSnapShot: currentUserTribe.weeklyRosterHistory,
          });
          const previousSnapshot = currentUserTribe.weeklyRosterHistory?.find(
            (w) => w.week === previousWeek,
          );
          if (!previousSnapshot)
            throw new Error("No prior week roster to reset to.");
          let weeklyRosterHistory = currentUserTribe.weeklyRosterHistory
            ? [...currentUserTribe.weeklyRosterHistory]
            : [];
          const snapshotIndex = weeklyRosterHistory.findIndex(
            (w) => w.week === currentWeek,
          );
          if (snapshotIndex !== -1) {
            weeklyRosterHistory[snapshotIndex] = {
              week: currentWeek,
              roster: previousSnapshot.roster,
            };
          } else {
            weeklyRosterHistory.push({
              week: currentWeek,
              roster: previousSnapshot.roster,
            });
          }
          const updatedMembers = league.memberDetails.map((member) =>
            member.userId === user.uid
              ? {
                  ...member,
                  roster: previousSnapshot.roster,
                  updatedAt: new Date(),
                  weeklyRosterHistory,
                }
              : member,
          );
          const leagueRef = doc(db, "leagues", league.id);
          await updateDoc(leagueRef, {
            memberDetails: updatedMembers,
            updatedAt: new Date(),
          });
          setAddDropDialogOpen(false);
          setIsSaving(false);
          return;
        }
        // Normal add/drop
        const previousWeek = currentWeek - 1;
        const previousRoster =
          currentUserTribe.weeklyRosterHistory?.find(
            (w) => w.week === previousWeek,
          )?.roster || [];
        const updatedRoster =
          currentUserTribe.roster?.map((entry) => {
            if (entry.castawayId === dropId) {
              return {
                ...entry,
                status: "dropped" as const,
                droppedWeek: currentWeek,
              };
            }
            return entry;
          }) || [];
        if (addId) {
          const previouslyDropped = updatedRoster.find(
            (entry) => entry.castawayId === addId && entry.status === "dropped",
          );
          if (previouslyDropped) {
            previouslyDropped.status = "active";
            delete previouslyDropped.droppedWeek;
          } else {
            updatedRoster.push({
              castawayId: addId,
              status: "active",
              addedWeek: currentWeek,
              accumulatedPoints: 0,
            });
          }
        }
        if (league.addDropRestrictionEnabled && previousRoster.length > 0) {
          if (!isNetRosterChangeAllowed(previousRoster, updatedRoster)) {
            setIsSaving(false);
            throw new Error(
              "You can only make one net roster change per week. At least 4 out of 5 castaways must remain the same as last week.",
            );
          }
        }
        let weeklyRosterHistory = currentUserTribe.weeklyRosterHistory
          ? [...currentUserTribe.weeklyRosterHistory]
          : [];
        const snapshotIndex = weeklyRosterHistory.findIndex(
          (w) => w.week === currentWeek,
        );
        if (snapshotIndex !== -1) {
          weeklyRosterHistory[snapshotIndex] = {
            week: currentWeek,
            roster: updatedRoster,
          };
        } else {
          weeklyRosterHistory.push({
            week: currentWeek,
            roster: updatedRoster,
          });
        }
        const updatedMembers = league.memberDetails.map((member) =>
          member.userId === user.uid
            ? {
                ...member,
                roster: updatedRoster,
                updatedAt: new Date(),
                weeklyRosterHistory,
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
    },
    [league, user, currentUserTribe],
  );

  // Sorted members and counts
  const sortedMembers = useMemo(
    () =>
      [...(league?.memberDetails || [])].sort((a, b) => b.points - a.points),
    [league],
  );
  const totalMembers =
    league?.memberDetails?.length ??
    league?.members?.length ??
    league?.currentPlayers ??
    0;
  const otherCount = Math.max(0, totalMembers - (currentUserTribe ? 1 : 0));

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
          seasonStartDate={
            league?.leagueStartDate
              ? new Date(league.leagueStartDate)
              : new Date()
          }
          seasonPremierDate={new Date(CURRENT_SEASON.premiereDate)}
          castawaySeasonScores={castawaySeasonScores}
          addDropRestrictionEnabled={league?.addDropRestrictionEnabled ?? false}
        />
      )}
    </Container>
  );
}
