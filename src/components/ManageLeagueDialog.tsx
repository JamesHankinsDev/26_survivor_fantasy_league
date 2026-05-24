"use client";

import { useMemo, useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Stack,
  Card,
  CardContent,
  Box,
  Typography,
  IconButton,
  Alert,
  CircularProgress,
  Avatar,
  Divider,
  Switch,
  FormControlLabel,
  MenuItem,
  TextField,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import WarningIcon from "@mui/icons-material/Warning";
import EastIcon from "@mui/icons-material/East";
import { League } from "@/types/league";
import { db } from "@/lib/firebase";
import {
  doc,
  updateDoc,
  deleteDoc,
  arrayRemove,
  increment,
} from "firebase/firestore";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-client";
import { getSeasonStatus } from "@/data/seasons";
import { useSeasonsWithOverrides } from "@/hooks/useSeasonsWithOverrides";
import { adoptNewSeason } from "@/utils/adoptNewSeason";
import SeasonRecapModal from "@/components/SeasonRecapModal";
import SeasonRuleProposalModal from "@/components/SeasonRuleProposalModal";
import { useSeasonRecap } from "@/hooks/useSeasonRecap";
import { useS51RuleProposal } from "@/hooks/useS51RuleProposal";

interface ManageLeagueDialogProps {
  open: boolean;
  league: League | null;
  onClose: () => void;
  onLeagueDeleted?: () => void;
}

export default function ManageLeagueDialog({
  open,
  league,
  onClose,
  onLeagueDeleted,
}: ManageLeagueDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<string | null>(null);
  const [restrictionEnabled, setRestrictionEnabled] = useState(
    league?.addDropRestrictionEnabled ?? false,
  );
  const [leagueStartDate, setLeagueStartDate] = useState<string>(league?.leagueStartDate ? league.leagueStartDate.substring(0, 10) : "");
  const queryClient = useQueryClient();
  const { seasons } = useSeasonsWithOverrides();

  // Season carry-over state
  const [targetSeasonNumber, setTargetSeasonNumber] = useState<number | null>(null);
  /**
   * Multi-step carry-over flow:
   *  - "recap":    show the prior season's recap (read-only)
   *  - "proposal": show the new season's rule proposal + voting
   *  - "confirm":  final confirmation; clicking Adopt commits the write
   *
   * Steps that have no content for this league get skipped automatically.
   */
  const [adoptStep, setAdoptStep] = useState<
    "idle" | "recap" | "proposal" | "confirm"
  >("idle");
  const [adoptLoading, setAdoptLoading] = useState(false);
  const [adoptError, setAdoptError] = useState<string | null>(null);

  // Recap + proposal hooks read pre-adopt state (current league.memberDetails
  // still has S50 totals + weeklyRosters), so they compute correctly.
  const recapHook = useSeasonRecap(league);
  const proposalHook = useS51RuleProposal(league);

  // Sync restrictionEnabled with league prop
  useEffect(() => {
    setRestrictionEnabled(league?.addDropRestrictionEnabled ?? false);
    setLeagueStartDate(league?.leagueStartDate ? league.leagueStartDate.substring(0, 10) : "");
  }, [league]);
  const [restrictionLoading, setRestrictionLoading] = useState(false);

  // Compute season-carry-over eligibility BEFORE the early return so the hook
  // count stays stable for the typechecker. Falls through to `null` if league
  // isn't loaded yet.
  const currentSeason = useMemo(
    () => seasons.find((s) => s.number === league?.seasonNumber) ?? null,
    [seasons, league?.seasonNumber],
  );
  const isCurrentConcluded =
    currentSeason ? getSeasonStatus(currentSeason) === "past" : false;
  const eligibleTargets = useMemo(
    () =>
      seasons
        .filter(
          (s) =>
            s.number !== league?.seasonNumber &&
            getSeasonStatus(s) !== "past",
        )
        .sort((a, b) => a.number - b.number),
    [seasons, league?.seasonNumber],
  );

  // Default the target selector to the lowest-numbered eligible season when
  // it changes (e.g. admin launches a new one).
  useEffect(() => {
    if (eligibleTargets.length === 0) {
      setTargetSeasonNumber(null);
      return;
    }
    setTargetSeasonNumber((prev) =>
      prev != null && eligibleTargets.some((s) => s.number === prev)
        ? prev
        : eligibleTargets[0].number,
    );
  }, [eligibleTargets]);

  if (!league) return null;

  const canDelete = league.currentPlayers === 1; // Only owner remains
  const membersSortedByPoints = [...(league.memberDetails || [])].sort(
    (a, b) => b.totalPoints - a.totalPoints,
  );

  // Pick the first relevant step when the user kicks off the flow. Skip any
  // step that has no content for this league so the modal chain never opens
  // an empty modal.
  const startAdoptFlow = () => {
    setAdoptError(null);
    if (recapHook.hasContent) setAdoptStep("recap");
    else if (proposalHook.proposalRelevant && proposalHook.hasContent)
      setAdoptStep("proposal");
    else setAdoptStep("confirm");
  };

  // Advance from recap → proposal (if relevant) → confirm. Mark recap seen so
  // the dashboard's auto-open path doesn't re-pop it after the carry-over.
  const advanceFromRecap = () => {
    recapHook.markSeen();
    if (proposalHook.proposalRelevant && proposalHook.hasContent)
      setAdoptStep("proposal");
    else setAdoptStep("confirm");
  };

  const advanceFromProposal = () => {
    proposalHook.markSeen();
    setAdoptStep("confirm");
  };

  const cancelAdoptFlow = () => {
    if (adoptLoading) return;
    setAdoptStep("idle");
    setAdoptError(null);
  };

  const handleAdoptNewSeason = async () => {
    if (!league || targetSeasonNumber == null) return;
    setAdoptLoading(true);
    setAdoptError(null);
    try {
      const next = adoptNewSeason(league, targetSeasonNumber);
      const leagueRef = doc(db, "leagues", league.id);
      await updateDoc(leagueRef, {
        seasonNumber: next.seasonNumber,
        memberDetails: next.memberDetails,
        seasonArchive: next.seasonArchive,
        updatedAt: new Date(),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.leagues.all });
      // Defense in depth: if the user reached confirm by skipping steps (no
      // content), markSeen is a no-op; if they saw the modals it's already
      // marked. Calling again is safe.
      recapHook.markSeen();
      proposalHook.markSeen();
      setAdoptStep("idle");
      onClose();
    } catch (err) {
      // Surface in the confirm dialog AND log to devtools — silent failures
      // here were the original "click does nothing" bug.
      // eslint-disable-next-line no-console
      console.error("[adoptNewSeason] failed:", err);
      setAdoptError(
        err instanceof Error ? err.message : "Failed to adopt new season",
      );
    } finally {
      setAdoptLoading(false);
    }
  };

  const handleRemoveMember = async (userId: string, _memberName: string) => {
    setLoading(true);
    setError("");

    try {
      const leagueRef = doc(db, "leagues", league.id);
      const memberToRemoveObj = league.memberDetails.find(
        (m) => m.userId === userId,
      );

      if (!memberToRemoveObj) {
        throw new Error("Member not found");
      }

      await updateDoc(leagueRef, {
        members: arrayRemove(userId),
        memberDetails: arrayRemove(memberToRemoveObj),
        currentPlayers: increment(-1),
        updatedAt: new Date(),
      });

      setMemberToRemove(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove member");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteLeague = async () => {
    if (!canDelete) {
      setError("You must remove all other members before deleting the league");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const leagueRef = doc(db, "leagues", league.id);
      await deleteDoc(leagueRef);
      setConfirmDeleteOpen(false);
      onLeagueDeleted?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete league");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth aria-labelledby="manage-league-dialog-title">
        <DialogTitle id="manage-league-dialog-title" sx={{ fontWeight: 600 }}>
          Manage League: {league.name}
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Stack spacing={3}>
            {error && <Alert severity="error" role="alert">{error}</Alert>}

            {/* Add/Drop Restriction Toggle */}
            <Card sx={{ bgcolor: "rgba(232, 93, 42, 0.05)" }}>
              <CardContent>
                <FormControlLabel
                  control={
                    <Switch
                      checked={restrictionEnabled}
                      onChange={async (e) => {
                        setRestrictionLoading(true);
                        setRestrictionEnabled(e.target.checked);
                        try {
                          const leagueRef = doc(db, "leagues", league.id);
                          await updateDoc(leagueRef, {
                            addDropRestrictionEnabled: e.target.checked,
                            updatedAt: new Date(),
                          });
                        } catch (err) {
                          setError("Failed to update restriction setting");
                        } finally {
                          setRestrictionLoading(false);
                        }
                      }}
                      disabled={restrictionLoading}
                    />
                  }
                  label="Limit Add/Drop to 1 per week (Wed 8pm - Wed 8pm)"
                />
                <Typography variant="caption" sx={{ color: "text.secondary" }}>
                  Toggle this restriction for testing or league rules. When
                  enabled, users can only add and drop once per week.
                </Typography>
                <Box sx={{ mt: 2 }}>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    <strong>League Start Date:</strong>
                  </Typography>
                  <input
                    type="date"
                    value={leagueStartDate}
                    aria-label="League start date"
                    onChange={async (e) => {
                      setLeagueStartDate(e.target.value);
                      try {
                        const leagueRef = doc(db, "leagues", league.id);
                        await updateDoc(leagueRef, {
                          leagueStartDate: new Date(e.target.value).toISOString(),
                          updatedAt: new Date(),
                        });
                      } catch (err) {
                        setError("Failed to update league start date");
                      }
                    }}
                    style={{ fontSize: "1rem", padding: "0.5em" }}
                  />
                  <Typography variant="caption" sx={{ color: "text.secondary" }}>
                    Set the start date for your league. Week counting will begin from this date.
                  </Typography>
                </Box>
              </CardContent>
            </Card>
            {/* League Info Summary */}
            <Card sx={{ bgcolor: "rgba(32, 178, 170, 0.05)" }}>
              <CardContent>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                  League Information
                </Typography>
                <Stack spacing={0.5}>
                  <Typography variant="body2">
                    <strong>Status:</strong> {league.status}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Players:</strong> {league.currentPlayers} /{" "}
                    {league.maxPlayers}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Join Code:</strong> {league.joinCode}
                  </Typography>
                </Stack>
              </CardContent>
            </Card>

            <Divider />

            {/* Members List */}
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>
                League Members ({league.currentPlayers})
              </Typography>
              <Stack spacing={1}>
                {membersSortedByPoints.map((member) => (
                  <Card key={member.userId}>
                    <CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: 2,
                        }}
                      >
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 2,
                            flex: 1,
                          }}
                        >
                          <Avatar
                            src={member.avatar}
                            alt={member.displayName}
                            sx={{
                              width: 40,
                              height: 40,
                              border: `2px solid ${member.tribeColor}`,
                            }}
                          />
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography
                              variant="body2"
                              sx={{
                                fontWeight: 600,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {member.displayName}
                            </Typography>
                            <Typography
                              variant="caption"
                              sx={{ color: "text.secondary" }}
                            >
                              {member.totalPoints} points
                            </Typography>
                          </Box>
                        </Box>
                        {league.currentPlayers > 1 && (
                          <IconButton
                            size="small"
                            onClick={() => setMemberToRemove(member.userId)}
                            disabled={loading}
                            sx={{
                              color: "#E85D2A",
                              "&:hover": { bgcolor: "rgba(232, 93, 42, 0.1)" },
                            }}
                            aria-label={`Remove ${member.displayName} from league`}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        )}
                      </Box>
                    </CardContent>
                  </Card>
                ))}
              </Stack>
            </Box>

            <Divider />

            {/* Adopt New Season */}
            <Card
              sx={{
                bgcolor: isCurrentConcluded
                  ? "color-mix(in oklch, var(--flame) 4%, var(--bg-paper))"
                  : "rgba(0, 0, 0, 0.02)",
                borderLeft: `4px solid ${isCurrentConcluded ? "var(--flame)" : "#ccc"}`,
              }}
            >
              <CardContent>
                <Stack spacing={1.5}>
                  <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                    <EastIcon
                      sx={{ color: isCurrentConcluded ? "var(--flame)" : "#999" }}
                    />
                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                      Carry over to a new season
                    </Typography>
                  </Box>
                  <Typography variant="caption" sx={{ color: "text.secondary" }}>
                    Keep this league&apos;s members + join code and start fresh
                    on a new season. Final standings from the current season
                    are archived to the league so you can look them up later.
                  </Typography>
                  {!isCurrentConcluded && (
                    <Alert severity="info" sx={{ mt: 1 }}>
                      Available once the current season ends.
                    </Alert>
                  )}
                  {isCurrentConcluded && eligibleTargets.length === 0 && (
                    <Alert severity="info" sx={{ mt: 1 }}>
                      No upcoming or active seasons available to adopt yet.
                    </Alert>
                  )}
                  {isCurrentConcluded && eligibleTargets.length > 0 && (
                    <Box sx={{ display: "flex", gap: 1.5, alignItems: "flex-end", flexWrap: "wrap" }}>
                      <TextField
                        select
                        label="New season"
                        size="small"
                        value={
                          targetSeasonNumber != null
                            ? String(targetSeasonNumber)
                            : ""
                        }
                        onChange={(e) =>
                          setTargetSeasonNumber(Number(e.target.value))
                        }
                        sx={{ minWidth: 220 }}
                        disabled={adoptLoading}
                      >
                        {eligibleTargets.map((s) => {
                          const label =
                            getSeasonStatus(s) === "current"
                              ? "Active"
                              : "Upcoming";
                          return (
                            <MenuItem key={s.number} value={String(s.number)}>
                              {s.name} — {label}
                            </MenuItem>
                          );
                        })}
                      </TextField>
                      <Button
                        variant="contained"
                        size="small"
                        startIcon={<EastIcon />}
                        onClick={startAdoptFlow}
                        disabled={adoptLoading || targetSeasonNumber == null}
                        sx={{
                          bgcolor: "var(--flame)",
                          "&:hover": { bgcolor: "var(--flame-deep)" },
                          color: "white",
                        }}
                      >
                        Adopt season
                      </Button>
                    </Box>
                  )}
                </Stack>
              </CardContent>
            </Card>

            {/* Delete League Section */}
            <Card
              sx={{
                bgcolor: canDelete
                  ? "rgba(232, 93, 42, 0.05)"
                  : "rgba(0, 0, 0, 0.02)",
                borderLeft: `4px solid ${canDelete ? "#E85D2A" : "#ccc"}`,
              }}
            >
              <CardContent>
                <Box sx={{ display: "flex", gap: 2, alignItems: "flex-start" }}>
                  <WarningIcon
                    sx={{
                      color: canDelete ? "#E85D2A" : "#999",
                      mt: 0.5,
                      flexShrink: 0,
                    }}
                  />
                  <Box>
                    <Typography
                      variant="subtitle2"
                      sx={{ fontWeight: 600, mb: 0.5 }}
                    >
                      Delete League
                    </Typography>
                    {canDelete ? (
                      <>
                        <Typography
                          variant="caption"
                          sx={{
                            color: "text.secondary",
                            display: "block",
                            mb: 1.5,
                          }}
                        >
                          You are the only member. The league can now be
                          deleted.
                        </Typography>
                        <Button
                          variant="contained"
                          color="error"
                          size="small"
                          startIcon={<DeleteIcon />}
                          onClick={() => setConfirmDeleteOpen(true)}
                          disabled={loading}
                        >
                          Delete League
                        </Button>
                      </>
                    ) : (
                      <Typography
                        variant="caption"
                        sx={{ color: "text.secondary" }}
                      >
                        Remove all {league.currentPlayers - 1} other member
                        {league.currentPlayers > 2 ? "s" : ""} to delete this
                        league.
                      </Typography>
                    )}
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={loading}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Remove Member Confirmation */}
      {memberToRemove && (
        <Dialog
          open={!!memberToRemove}
          onClose={() => !loading && setMemberToRemove(null)}
          aria-labelledby="remove-member-dialog-title"
        >
          <DialogTitle id="remove-member-dialog-title">Remove Member?</DialogTitle>
          <DialogContent>
            <Typography variant="body2" sx={{ mt: 2 }}>
              Are you sure you want to remove{" "}
              <strong>
                {
                  league.memberDetails.find((m) => m.userId === memberToRemove)
                    ?.displayName
                }
              </strong>{" "}
              from this league? They will not be able to access it anymore.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setMemberToRemove(null)} disabled={loading}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                const member = league.memberDetails.find(
                  (m) => m.userId === memberToRemove,
                );
                if (member) {
                  handleRemoveMember(memberToRemove, member.displayName);
                }
              }}
              variant="contained"
              color="error"
              disabled={loading}
            >
              {loading ? <CircularProgress size={24} /> : "Remove Member"}
            </Button>
          </DialogActions>
        </Dialog>
      )}

      {/* Delete League Confirmation */}
      <Dialog
        open={confirmDeleteOpen}
        onClose={() => !loading && setConfirmDeleteOpen(false)}
        aria-labelledby="delete-league-dialog-title"
      >
        <DialogTitle id="delete-league-dialog-title" sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <WarningIcon aria-hidden="true" sx={{ color: "#E85D2A" }} />
          Delete League?
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mt: 2, mb: 2 }}>
            Are you sure you want to permanently delete{" "}
            <strong>{league.name}</strong>? This action cannot be undone.
          </Typography>
          <Alert severity="warning">
            This will delete the league and all associated data.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setConfirmDeleteOpen(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleDeleteLeague}
            variant="contained"
            color="error"
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : "Delete League"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Carry-over step 1: prior-season recap (read-only) */}
      {adoptStep === "recap" && (
        <SeasonRecapModal
          open
          league={league}
          recap={recapHook.recap}
          onClose={advanceFromRecap}
        />
      )}

      {/* Carry-over step 2: new-season rule proposal + voting */}
      {adoptStep === "proposal" && proposalHook.proposalRelevant && (
        <SeasonRuleProposalModal
          open
          league={league}
          backtest={proposalHook.backtest}
          sourceSeasonNumber={proposalHook.sourceSeasonNumber ?? league.seasonNumber}
          targetSeasonNumber={proposalHook.targetSeasonNumber}
          onClose={advanceFromProposal}
        />
      )}

      {/* Carry-over step 3: final adopt confirmation */}
      <Dialog
        open={adoptStep === "confirm"}
        onClose={cancelAdoptFlow}
        aria-labelledby="adopt-season-dialog-title"
      >
        <DialogTitle
          id="adopt-season-dialog-title"
          sx={{ display: "flex", alignItems: "center", gap: 1 }}
        >
          <EastIcon aria-hidden sx={{ color: "var(--flame)" }} />
          Carry over to{" "}
          {eligibleTargets.find((s) => s.number === targetSeasonNumber)?.name ??
            `Season ${targetSeasonNumber}`}
          ?
        </DialogTitle>
        <DialogContent>
          {adoptError && (
            <Alert severity="error" role="alert" sx={{ mt: 2, mb: 2 }}>
              {adoptError}
            </Alert>
          )}
          <Typography variant="body2" sx={{ mt: 2, mb: 2 }}>
            <strong>{league.name}</strong> will be reset for{" "}
            <strong>
              {eligibleTargets.find((s) => s.number === targetSeasonNumber)
                ?.name ?? `Season ${targetSeasonNumber}`}
            </strong>
            .
          </Typography>
          <Box
            sx={{
              display: "grid",
              gap: 0.5,
              fontSize: "0.875rem",
              mb: 2,
            }}
          >
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              <strong>Resets:</strong> every member&apos;s roster, weekly
              snapshots, and total points.
            </Typography>
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              <strong>Preserves:</strong> members, join code{" "}
              <code>{league.joinCode}</code>, tribe names, colors, league
              settings.
            </Typography>
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              <strong>Archives:</strong> final {currentSeason?.name ?? "season"}{" "}
              standings under this league for later viewing.
            </Typography>
          </Box>
          <Alert severity="warning">
            Members will need to draft a new roster for{" "}
            {eligibleTargets.find((s) => s.number === targetSeasonNumber)?.name ??
              `Season ${targetSeasonNumber}`}
            .
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={cancelAdoptFlow} disabled={adoptLoading}>
            Cancel
          </Button>
          <Button
            onClick={handleAdoptNewSeason}
            variant="contained"
            disabled={adoptLoading || targetSeasonNumber == null}
            sx={{
              bgcolor: "var(--flame)",
              "&:hover": { bgcolor: "var(--flame-deep)" },
              color: "white",
            }}
          >
            {adoptLoading ? <CircularProgress size={24} /> : "Adopt season"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
