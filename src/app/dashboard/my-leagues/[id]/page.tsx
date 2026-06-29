"use client";

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import {
  Container,
  Box,
  Typography,
  Button,
  CircularProgress,
  Alert,
  Divider,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import HistoryIcon from "@mui/icons-material/History";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useLeague } from "@/hooks/useLeagues";
import { useEliminatedCastaways } from "@/hooks/useCastaways";
import { useComputedScores } from "@/hooks/useScores";
import {
  TribeMember,
  assignRanks,
  withRankTrends,
} from "@/types/league";
import TribeCard from "@/components/TribeCard";
import EditTribeDialog from "@/components/EditTribeDialog";
import CardPack from "@/components/cards/CardPack";
import AddDropDraft from "@/components/cards/AddDropDraft";
import { hashSeed, seededSample } from "@/utils/seededDeal";
import { CURRENT_SEASON, isSeasonActive } from "@/data/seasons";
import { useSeasonCastaways } from "@/hooks/useCastaways";
import { isNetRosterChangeAllowed, getLatestLockedRoster } from "@/utils/scoring";
import ScoringHistory from "@/components/ScoringHistory";
import SeasonRecapModal from "@/components/SeasonRecapModal";
import { useSeasonRecap } from "@/hooks/useSeasonRecap";
import ReplayIcon from "@mui/icons-material/Replay";
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
  const [scoringHistoryOpen, setScoringHistoryOpen] = useState(false);
  const [recapReplayOpen, setRecapReplayOpen] = useState(false);
  const [adminAddDropMember, setAdminAddDropMember] = useState<TribeMember | null>(null);
  const [, setIsSaving] = useState(false);

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
        setTimeout(() => router.push("/dashboard"), 2000);
      }
    }
  }, [user, authLoading, league, router]);

  // One-time backfill: write ownerName for the current user if missing.
  // This ensures other users see the real name, not the edited tribe name.
  useEffect(() => {
    if (!league || !user) return;
    const currentMember = league.memberDetails?.find((m) => m.userId === user.uid);
    if (!currentMember) return;

    const authName = user.displayName || user.email || "";
    // Skip if ownerName is already set and differs from displayName (was set intentionally)
    if (currentMember.ownerName && currentMember.ownerName !== currentMember.displayName) return;
    // Skip if nothing to backfill
    if (!authName || currentMember.ownerName === authName) return;

    const updatedMembers = league.memberDetails.map((m) =>
      m.userId === user.uid ? { ...m, ownerName: authName } : m,
    );
    const leagueRef = doc(db, "leagues", league.id);
    updateDoc(leagueRef, { memberDetails: updatedMembers }).then(() => {
      invalidateLeagueData();
    }).catch(() => {
      // Non-critical — silently ignore backfill failures
    });
  }, [league?.id, user?.uid]); // eslint-disable-line react-hooks/exhaustive-deps

  // Get current user's tribe
  const currentUserTribe = useMemo(
    () => computedMembers.find((m) => m.userId === user?.uid),
    [computedMembers, user],
  );

  // ───────── Season-start "starter pack" draft ─────────
  // The current member's raw record (carries the persisted dealt hand).
  const currentMember = useMemo(
    () => league?.memberDetails?.find((m) => m.userId === user?.uid),
    [league, user],
  );
  const eliminatedSet = useMemo(
    () => new Set(eliminatedCastawayIds),
    [eliminatedCastawayIds],
  );
  // Stable seed per (member, league, season) so the deal can't be rerolled.
  const draftSeed = useMemo(
    () => (user && league ? hashSeed(`${user.uid}|${league.id}|${league.seasonNumber}`) : 0),
    [user, league],
  );
  // The dealt hand of castaway ids: the persisted hand once written, otherwise
  // a deterministic deal computed from the seed (so display is instant + stable
  // even before the background persist completes).
  const dealtHandIds = useMemo(() => {
    if (currentMember?.dealtHand?.length) return currentMember.dealtHand;
    const eligible = castaways.filter((c) => !eliminatedSet.has(c.id));
    // Deal 9, discard down to a tribe of 5 (a 3×3 hand).
    return seededSample(eligible, Math.min(9, eligible.length), draftSeed).map((c) => c.id);
  }, [currentMember, castaways, eliminatedSet, draftSeed]);
  const dealtCastaways = useMemo(
    () =>
      dealtHandIds
        .map((id) => castaways.find((c) => c.id === id))
        .filter((c): c is NonNullable<typeof c> => Boolean(c)),
    [dealtHandIds, castaways],
  );

  // Persist the dealt hand the first time the draft opens, locking it in even
  // if the eligible pool later changes (e.g. an elimination). Idempotent.
  const dealtWriteRef = useRef(false);
  useEffect(() => {
    if (!draftDialogOpen || !league || !user || !currentMember) return;
    if (currentMember.dealtHand?.length) return;
    if (dealtHandIds.length === 0 || dealtWriteRef.current) return;
    dealtWriteRef.current = true;
    const updatedMembers = league.memberDetails.map((m) =>
      m.userId === user.uid ? { ...m, dealtHand: dealtHandIds, dealtAt: new Date() } : m,
    );
    updateDoc(doc(db, "leagues", league.id), { memberDetails: updatedMembers })
      .then(invalidateLeagueData)
      .catch(() => {
        dealtWriteRef.current = false;
      });
  }, [draftDialogOpen, league?.id, user?.uid, currentMember, dealtHandIds, league, user, invalidateLeagueData]);

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
      if (selectedCastawayIds.length < 1 || selectedCastawayIds.length > 5) {
        throw new Error("A starting tribe must have between 1 and 5 castaways");
      }
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

  // Admin add/drop submit — league owner editing another member's roster
  const handleAdminSubmitAddDrop = useCallback(
    async (dropId: string | null, addId: string | null) => {
      if (!league || !user || !adminAddDropMember)
        throw new Error("Missing league or user info");
      setIsSaving(true);
      try {
        // Reset to prior week
        if (dropId === "__RESET_TO_PRIOR_WEEK__") {
          const previousRoster = getLatestLockedRoster(
            adminAddDropMember.weeklyRosters || [],
          );
          if (previousRoster.length === 0)
            throw new Error("No prior week roster to reset to.");

          const updatedMembers = league.memberDetails.map((member) =>
            member.userId === adminAddDropMember.userId
              ? { ...member, roster: previousRoster }
              : member,
          );
          const leagueRef = doc(db, "leagues", league.id);
          await updateDoc(leagueRef, {
            memberDetails: updatedMembers,
            updatedAt: new Date(),
          });
          invalidateLeagueData();
          setAdminAddDropMember(null);
          setIsSaving(false);
          return;
        }

        // Normal add/drop
        let newRoster = [...(adminAddDropMember.roster || [])];
        if (dropId) {
          newRoster = newRoster.filter((id) => id !== dropId);
        }
        if (addId) {
          newRoster.push(addId);
        }

        const updatedMembers = league.memberDetails.map((member) =>
          member.userId === adminAddDropMember.userId
            ? { ...member, roster: newRoster }
            : member,
        );
        const leagueRef = doc(db, "leagues", league.id);
        await updateDoc(leagueRef, {
          memberDetails: updatedMembers,
          updatedAt: new Date(),
        });
        invalidateLeagueData();
        setAdminAddDropMember(null);
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
    [league, user, adminAddDropMember, invalidateLeagueData],
  );

  const isLeagueOwner = user?.uid === league?.ownerId;
  const seasonActive = isSeasonActive();
  const { recap: replayRecap, hasContent: recapHasContent } = useSeasonRecap(league);

  // Sorted members with tie-aware ranks and week-over-week trends
  const sortedMembers = useMemo(
    () => withRankTrends(assignRanks(computedMembers)),
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
      </Container>
    );
  }

  const concludedDate = CURRENT_SEASON.concludedAt
    ? new Date(CURRENT_SEASON.concludedAt).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {!seasonActive && (
        <Alert
          severity="info"
          sx={{ mb: 3 }}
          action={
            recapHasContent ? (
              <Button
                color="inherit"
                size="small"
                startIcon={<ReplayIcon />}
                onClick={() => setRecapReplayOpen(true)}
                sx={{ fontWeight: 600 }}
              >
                Replay Recap
              </Button>
            ) : undefined
          }
        >
          <strong>{CURRENT_SEASON.name} has concluded.</strong>
          {concludedDate ? ` Finale aired ${concludedDate}.` : ""}
          {" "}This league is now an archive — final standings and scoring
          history are preserved below.
        </Alert>
      )}
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <h1 className="sfl-h1" style={{ marginBottom: 8 }}>
          {league.name}
        </h1>
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
          <div className="sfl-eyebrow flame" style={{ marginBottom: 12 }}>
            Your Tribe
          </div>
          {!currentUserTribe.roster || currentUserTribe.roster.length === 0 ? (
            seasonActive ? (
              <div
                className="sfl-card"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 16,
                  flexWrap: "wrap",
                  marginBottom: 16,
                  border: "1px solid var(--line)",
                }}
              >
                <div style={{ fontSize: 14, color: "var(--ink-soft)" }}>
                  Your <strong style={{ color: "var(--ink)" }}>Starter Pack</strong> is waiting. Rip
                  it open and cut down to your tribe of 5.
                </div>
                <button className="sfl-btn" onClick={() => setDraftDialogOpen(true)}>
                  <span className="sfl-btn-glyph" aria-hidden>🔥</span>
                  Open My Pack
                </button>
              </div>
            ) : (
              <Alert severity="info" sx={{ mb: 2 }}>
                You didn't draft a team for {CURRENT_SEASON.name}. The season
                has concluded.
              </Alert>
            )
          ) : (
            (() => {
              const userRanked = sortedMembers.find((m) => m.userId === user!.uid);
              return (
                <TribeCard
                  member={currentUserTribe}
                  rank={userRanked?.rank || 0}
                  isTied={userRanked?.isTied}
                  trend={userRanked?.trend}
                  trendDelta={userRanked?.trendDelta}
                  isCurrentUser
                  onEdit={seasonActive ? () => setEditDialogOpen(true) : undefined}
                  onAddDrop={seasonActive ? () => setAddDropDialogOpen(true) : undefined}
                  allMembers={sortedMembers}
                  allCastaways={castaways}
                  eliminatedCastawayIds={eliminatedCastawayIds}
                  castawayPoints={currentUserTribe.castawayPoints}
                  castawaySeasonScores={castawaySeasonScores}
                />
              );
            })()
          )}

          {/* Scoring History — opens in a modal on demand */}
          {currentUserTribe.weeklyRosters &&
            currentUserTribe.weeklyRosters.length > 0 && (
              <Box sx={{ mt: 2, display: "flex", justifyContent: "flex-end" }}>
                <Button
                  onClick={() => setScoringHistoryOpen(true)}
                  startIcon={<HistoryIcon />}
                  variant="text"
                  size="small"
                  sx={{
                    color: "#E85D2A",
                    textTransform: "none",
                    fontWeight: 600,
                    "&:hover": { bgcolor: "rgba(232, 93, 42, 0.08)" },
                  }}
                >
                  View Scoring History
                </Button>
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
                rank={member.rank}
                isTied={member.isTied}
                trend={member.trend}
                trendDelta={member.trendDelta}
                allMembers={sortedMembers}
                allCastaways={castaways}
                eliminatedCastawayIds={eliminatedCastawayIds}
                castawayPoints={member.castawayPoints}
                castawaySeasonScores={castawaySeasonScores}
                onAdminAddDrop={isLeagueOwner && seasonActive ? () => setAdminAddDropMember(member) : undefined}
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

      {/* Season-start draft — rip the starter pack, discard down to a tribe of 5 */}
      <CardPack
        open={draftDialogOpen}
        hand={dealtCastaways}
        keepCount={Math.min(5, dealtCastaways.length)}
        season={CURRENT_SEASON.name}
        seasonNumber={CURRENT_SEASON.number}
        onClose={() => setDraftDialogOpen(false)}
        onLock={handleSubmitDraft}
      />

      {/* Weekly add/drop — card drag-drop overlay */}

      {currentUserTribe && (
        <AddDropDraft
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
          seasonNumber={CURRENT_SEASON.number}
        />
      )}

      {/* Admin add/drop — league owner editing another member's roster */}
      {adminAddDropMember && (
        <AddDropDraft
          open={!!adminAddDropMember}
          onClose={() => setAdminAddDropMember(null)}
          onSubmit={handleAdminSubmitAddDrop}
          tribeMember={adminAddDropMember}
          allCastaways={castaways}
          eliminatedCastawayIds={eliminatedCastawayIds}
          seasonStartDate={
            league?.leagueStartDate
              ? new Date(league.leagueStartDate)
              : new Date()
          }
          castawaySeasonScores={castawaySeasonScores}
          addDropRestrictionEnabled={false}
          seasonNumber={CURRENT_SEASON.number}
        />
      )}

      {/* Replay Season Recap */}
      {league && (
        <SeasonRecapModal
          open={recapReplayOpen}
          league={league}
          recap={replayRecap}
          onClose={() => setRecapReplayOpen(false)}
        />
      )}

      {/* Scoring History Modal */}
      {currentUserTribe && (
        <Dialog
          open={scoringHistoryOpen}
          onClose={() => setScoringHistoryOpen(false)}
          maxWidth="md"
          fullWidth
          aria-labelledby="scoring-history-title"
        >
          <DialogTitle
            id="scoring-history-title"
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              fontWeight: 700,
              pr: 6,
            }}
          >
            <HistoryIcon sx={{ color: "#E85D2A" }} />
            Scoring History
            <IconButton
              aria-label="Close"
              onClick={() => setScoringHistoryOpen(false)}
              sx={{ position: "absolute", right: 12, top: 12 }}
            >
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          <DialogContent dividers>
            <ScoringHistory
              weeklyRosters={currentUserTribe.weeklyRosters || []}
              allCastaways={castaways}
            />
          </DialogContent>
        </Dialog>
      )}

    </Container>
  );
}
