"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Box,
  Container,
  Paper,
  TextField,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Chip,
  Stack,
} from "@mui/material";
import LockIcon from "@mui/icons-material/Lock";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import {
  ScoringEvent,
  ScoringEventType,
} from "@/types/league";
import { CURRENT_SEASON } from "@/data/seasons";
import { useSeasonCastaways } from "@/hooks/useCastaways";
import { useOwnedLeagues } from "@/hooks/useLeagues";
import {
  SCORING_CONFIG,
  calculatePointsFromEvents,
  getEventLabel,
  ALL_EVENT_TYPES,
} from "@/utils/eventScoringConfig";
import { lockRostersForLeague, saveEpisodeScores } from "@/utils/scoring";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-client";

export default function AdminScoresPage() {
  const { user } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: castaways = [], isLoading: castawaysLoading } = useSeasonCastaways(CURRENT_SEASON.number);
  const { data: ownedLeagues = [], isLoading: leaguesLoading } = useOwnedLeagues(user?.uid || null);
  const [episodes, setEpisodes] = useState<
    Record<string, { events: ScoringEvent[] }>
  >({});
  const [episodeNumber, setEpisodeNumber] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [openDialog, setOpenDialog] = useState(false);
  const [openLockDialog, setOpenLockDialog] = useState(false);
  const [lockWeek, setLockWeek] = useState<number | null>(null);
  const [locking, setLocking] = useState(false);
  const [lockResult, setLockResult] = useState("");

  // Initialize empty events when castaways load
  useEffect(() => {
    if (castaways.length === 0) return;
    const initialEvents: Record<string, { events: ScoringEvent[] }> = {};
    castaways.forEach((c) => {
      initialEvents[c.id] = { events: [] };
    });
    setEpisodes(initialEvents);
  }, [castaways]);

  // Redirect if not authenticated
  useEffect(() => {
    if (!user) {
      router.push("/");
    }
  }, [user, router]);

  const handleEventChange = (
    castawayId: string,
    eventType: ScoringEventType,
    delta: number
  ) => {
    setEpisodes((prev) => {
      const castawayEvents = prev[castawayId]?.events || [];
      const existingEvent = castawayEvents.find(
        (e) => e.eventType === eventType
      );

      const newCount = existingEvent
        ? Math.max(0, existingEvent.count + delta)
        : Math.max(0, delta);

      let newEvents: ScoringEvent[];
      if (existingEvent) {
        newEvents = castawayEvents.map((e) =>
          e.eventType === eventType ? { ...e, count: newCount } : e
        );
      } else if (newCount > 0) {
        newEvents = [...castawayEvents, { eventType, count: newCount }];
      } else {
        newEvents = castawayEvents;
      }

      return {
        ...prev,
        [castawayId]: {
          events: newEvents.filter((e) => e.count > 0),
        },
      };
    });
  };

  const getTotalForCastaway = (castawayId: string): number => {
    const castawayEvents = episodes[castawayId]?.events || [];
    return calculatePointsFromEvents(castawayEvents);
  };

  const allLeagueIds = ownedLeagues.map(l => l.id);

  /**
   * Build a lock history: for each week that has been locked, collect the lock
   * date and team count.
   */
  const lockHistory = useMemo(() => {
    const weekMap = new Map<number, { lockedAt: Date; teamCount: number }>();

    for (const league of ownedLeagues) {
      for (const member of league.memberDetails || []) {
        for (const wr of member.weeklyRosters || []) {
          const existing = weekMap.get(wr.week);
          const lockedAt = wr.lockedAt?.toDate?.() || wr.lockedAt;
          if (!existing) {
            weekMap.set(wr.week, {
              lockedAt: lockedAt instanceof Date ? lockedAt : new Date(lockedAt),
              teamCount: 1,
            });
          } else {
            existing.teamCount++;
          }
        }
      }
    }

    return Array.from(weekMap.entries())
      .sort(([a], [b]) => a - b)
      .map(([week, data]) => ({ week, ...data }));
  }, [ownedLeagues]);

  /** The next week to lock = highest locked week + 1, minimum 2 */
  const nextLockWeek = useMemo(() => {
    if (lockHistory.length === 0) return 2;
    return Math.max(2, lockHistory[lockHistory.length - 1].week + 1);
  }, [lockHistory]);

  // Default lockWeek to the computed next week once data loads
  useEffect(() => {
    if (lockWeek === null) {
      setLockWeek(nextLockWeek);
    }
  }, [nextLockWeek, lockWeek]);

  /** Effective lock week — use nextLockWeek as fallback while loading */
  const effectiveLockWeek = lockWeek ?? nextLockWeek;

  /** Next episode = first episode number with no saved events on any castaway */
  const nextEpisodeNumber = useMemo(() => {
    const episodesWithData = new Set<number>();
    for (const c of castaways) {
      for (const epStr of Object.keys(c.weeklyEvents || {})) {
        const events = c.weeklyEvents?.[epStr];
        if (events && events.length > 0) {
          episodesWithData.add(parseInt(epStr));
        }
      }
    }
    // Find the first gap starting from 1, or the next number after the max
    let next = 1;
    while (episodesWithData.has(next)) next++;
    return next;
  }, [castaways]);

  // Default episodeNumber to the computed next episode once data loads
  useEffect(() => {
    if (episodeNumber === null) {
      setEpisodeNumber(nextEpisodeNumber);
    }
  }, [nextEpisodeNumber, episodeNumber]);

  /** Effective episode number — use nextEpisodeNumber as fallback while loading */
  const effectiveEpisodeNumber = episodeNumber ?? nextEpisodeNumber;

  // Load previous episode events from castaway docs when episode number changes
  useEffect(() => {
    if (castaways.length === 0) return;

    const loadedEvents: Record<string, { events: ScoringEvent[] }> = {};

    castaways.forEach((c) => {
      const epEvents = c.weeklyEvents?.[effectiveEpisodeNumber.toString()];
      if (epEvents && epEvents.length > 0) {
        loadedEvents[c.id] = { events: epEvents };
      } else {
        loadedEvents[c.id] = { events: [] };
      }
    });

    setEpisodes(loadedEvents);
  }, [effectiveEpisodeNumber, castaways]);

  // Detect existing data that would be overwritten

  /** Castaways that already have events recorded for the current episode */
  const existingEpisodeEvents = castaways.filter(
    (c) => c.weeklyEvents?.[effectiveEpisodeNumber.toString()]?.length > 0,
  );

  /** Leagues that already have roster snapshots for the selected lock week */
  const leaguesWithExistingLocks = ownedLeagues.filter((league) =>
    league.memberDetails?.some((m) =>
      m.weeklyRosters?.some((wr) => wr.week === effectiveLockWeek),
    ),
  );

  /** Total members across leagues that already have a snapshot for this week */
  const membersWithExistingLocks = ownedLeagues.reduce((count, league) => {
    return count + (league.memberDetails?.filter((m) =>
      m.weeklyRosters?.some((wr) => wr.week === effectiveLockWeek),
    ).length || 0);
  }, 0);

  const handleLockRosters = async () => {
    if (allLeagueIds.length === 0) {
      setError("You don't own any leagues to lock rosters for.");
      return;
    }

    setLocking(true);
    setError("");
    setLockResult("");

    try {
      let totalMembers = 0;
      await Promise.all(
        allLeagueIds.map(async (leagueId) => {
          const count = await lockRostersForLeague(leagueId, effectiveLockWeek);
          totalMembers += count;
        })
      );

      setLockResult(
        `Rosters locked for Week ${effectiveLockWeek} across ${allLeagueIds.length} league(s) (${totalMembers} teams).`
      );
    } catch (err) {
      console.error("Error locking rosters:", err);
      setError("Failed to lock rosters. Please try again.");
    } finally {
      setLocking(false);
    }
  };

  const handleSaveScores = async () => {
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      // Build events map (only include castaways with events)
      const castawayEvents: Record<string, ScoringEvent[]> = {};
      for (const [castawayId, data] of Object.entries(episodes)) {
        if (data.events.length > 0) {
          castawayEvents[castawayId] = data.events;
        }
      }

      await saveEpisodeScores(
        CURRENT_SEASON.number,
        effectiveEpisodeNumber,
        castawayEvents,
        allLeagueIds,
      );

      // Invalidate castaways cache to pick up new scores
      await queryClient.invalidateQueries({
        queryKey: queryKeys.castaways.season(CURRENT_SEASON.number),
      });

      const leagueMsg = allLeagueIds.length > 0
        ? ` Scores updated for ${allLeagueIds.length} league(s).`
        : "";

      setSuccess(
        `Episode ${effectiveEpisodeNumber} events saved to castaway profiles.${leagueMsg}`
      );

      setEpisodeNumber(effectiveEpisodeNumber + 1);
    } catch (err) {
      console.error("Error saving events:", err);
      setError("Failed to save events. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (leaguesLoading || castawaysLoading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4, textAlign: "center" }}>
        <CircularProgress />
      </Container>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 2 }}>
          Admin: Scoring & Rosters
        </Typography>
        <Typography variant="body2" sx={{ color: "text.secondary", mb: 1 }}>
          Record global episode events and manage roster locks.
          Scores are saved to castaway profiles and automatically propagated to
          all {ownedLeagues.length} league(s) you own.
        </Typography>
      </Box>

      {ownedLeagues.length === 0 && (
        <Alert severity="info" sx={{ mb: 3 }}>
          You don&apos;t own any leagues yet. Episode events can still be recorded
          globally. League score propagation will apply once you create a league.
        </Alert>
      )}

      {/* Lock Rosters Section */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
          Lock Rosters
        </Typography>
        <Typography variant="body2" sx={{ color: "text.secondary", mb: 2 }}>
          Snapshot each team&apos;s current roster for a given week. Do this every
          Wednesday at 8:00 PM ET before the episode airs.
          Applies to all {ownedLeagues.length} league(s) you own.
        </Typography>

        <Box sx={{ display: "flex", gap: 2, alignItems: "center", flexWrap: "wrap" }}>
          <TextField
            label="Week Number"
            type="number"
            value={effectiveLockWeek}
            onChange={(e) => setLockWeek(parseInt(e.target.value) || 1)}
            inputProps={{ min: 1, max: 20 }}
            sx={{ width: 150 }}
          />
          <Button
            variant="contained"
            onClick={() => setOpenLockDialog(true)}
            disabled={locking || allLeagueIds.length === 0}
            sx={{ bgcolor: "#20B2AA", "&:hover": { bgcolor: "#1A8A7F" } }}
          >
            {locking ? <CircularProgress size={24} /> : `Lock Rosters for Week ${effectiveLockWeek}`}
          </Button>
        </Box>

        {lockResult && (
          <Alert severity="success" sx={{ mt: 2 }}>
            {lockResult}
          </Alert>
        )}

        {/* Lock History */}
        {lockHistory.length > 0 && (
          <Box sx={{ mt: 3 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5, color: "text.secondary" }}>
              Lock History
            </Typography>
            <Stack spacing={1}>
              {lockHistory.map(({ week, lockedAt, teamCount }) => (
                <Box
                  key={week}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1.5,
                    px: 2,
                    py: 1,
                    borderRadius: 1,
                    bgcolor: week === effectiveLockWeek ? "rgba(32, 178, 170, 0.08)" : "transparent",
                    border: "1px solid",
                    borderColor: week === effectiveLockWeek ? "#20B2AA" : "divider",
                  }}
                >
                  <LockIcon sx={{ fontSize: 16, color: "#20B2AA" }} />
                  <Typography variant="body2" sx={{ fontWeight: 600, minWidth: 70 }}>
                    Week {week}
                  </Typography>
                  <Typography variant="body2" sx={{ color: "text.secondary", flex: 1 }}>
                    {lockedAt.toLocaleDateString("en-US", {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}{" "}
                    at{" "}
                    {lockedAt.toLocaleTimeString("en-US", {
                      hour: "numeric",
                      minute: "2-digit",
                      hour12: true,
                    })}
                  </Typography>
                  <Chip
                    label={`${teamCount} team${teamCount !== 1 ? "s" : ""}`}
                    size="small"
                    sx={{ fontSize: "0.75rem", height: 22 }}
                  />
                </Box>
              ))}
            </Stack>
          </Box>
        )}
      </Paper>

      {/* Episode Scoring Section */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
          Record Episode Events
        </Typography>

        <Box sx={{ display: "flex", gap: 2, mb: 3, flexWrap: "wrap" }}>
          <TextField
            label="Episode Number"
            type="number"
            value={effectiveEpisodeNumber}
            onChange={(e) => setEpisodeNumber(parseInt(e.target.value) || 1)}
            inputProps={{ min: 1, max: 14 }}
            sx={{ width: 150 }}
          />
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {success}
          </Alert>
        )}

        <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: "bold" }}>
          Record events for each castaway:
        </Typography>

        <TableContainer sx={{ overflowX: "auto" }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ backgroundColor: "action.hover" }}>
                <TableCell sx={{ fontWeight: 600 }}>Castaway</TableCell>
                {ALL_EVENT_TYPES.map((eventType) => (
                  <TableCell
                    key={eventType}
                    align="center"
                    sx={{ fontSize: "0.8rem", fontWeight: 600 }}
                  >
                    {getEventLabel(eventType)}
                    <br />
                    <span style={{ fontSize: "0.75rem", color: "text.secondary" }}>
                      {SCORING_CONFIG[eventType] > 0 ? "+" : ""}
                      {SCORING_CONFIG[eventType]}
                    </span>
                  </TableCell>
                ))}
                <TableCell align="right" sx={{ fontWeight: 600 }}>
                  Total
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {castaways.map((castaway) => (
                <TableRow key={castaway.id}>
                  <TableCell sx={{ fontWeight: 500 }}>
                    {castaway.name}
                    {castaway.eliminated && (
                      <Chip label="Out" size="small" sx={{ ml: 1, bgcolor: "#d32f2f", color: "white", fontSize: "0.65rem", height: 18 }} />
                    )}
                  </TableCell>
                  {ALL_EVENT_TYPES.map((eventType) => {
                    const events = episodes[castaway.id]?.events || [];
                    const eventCount =
                      events.find((e) => e.eventType === eventType)?.count || 0;

                    return (
                      <TableCell key={eventType} align="center">
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 0.5,
                          }}
                        >
                          <IconButton
                            size="small"
                            onClick={() =>
                              handleEventChange(castaway.id, eventType, -1)
                            }
                          >
                            <RemoveIcon fontSize="small" />
                          </IconButton>
                          <Typography
                            sx={{ minWidth: 20, textAlign: "center" }}
                          >
                            {eventCount}
                          </Typography>
                          <IconButton
                            size="small"
                            onClick={() =>
                              handleEventChange(castaway.id, eventType, 1)
                            }
                          >
                            <AddIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      </TableCell>
                    );
                  })}
                  <TableCell align="right" sx={{ fontWeight: "bold" }}>
                    {getTotalForCastaway(castaway.id)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        <Box sx={{ display: "flex", gap: 2, mt: 3 }}>
          <Button
            variant="contained"
            onClick={() => setOpenDialog(true)}
            disabled={saving}
          >
            {saving ? <CircularProgress size={24} /> : "Save Episode Events"}
          </Button>
          <Button variant="outlined" onClick={() => router.back()}>
            Cancel
          </Button>
        </Box>
      </Paper>

      {/* Episode Save Confirmation Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} aria-labelledby="confirm-scores-title">
        <DialogTitle id="confirm-scores-title">
          {existingEpisodeEvents.length > 0
            ? "Overwrite Existing Episode Data?"
            : "Confirm Episode Events"}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1 }}>
            {existingEpisodeEvents.length > 0 && (
              <Alert severity="warning" sx={{ mb: 2 }}>
                <strong>Episode {effectiveEpisodeNumber} already has scoring data</strong> for{" "}
                {existingEpisodeEvents.length} castaway{existingEpisodeEvents.length !== 1 ? "s" : ""}.
                Saving will overwrite their existing events.
                <Box component="ul" sx={{ mt: 1, mb: 0, pl: 2 }}>
                  {existingEpisodeEvents.slice(0, 5).map((c) => {
                    const existing = c.weeklyEvents?.[effectiveEpisodeNumber.toString()] || [];
                    const pts = calculatePointsFromEvents(existing);
                    return (
                      <li key={c.id}>
                        <strong>{c.name}</strong>: {existing.length} event{existing.length !== 1 ? "s" : ""} ({pts > 0 ? "+" : ""}{pts} pts)
                      </li>
                    );
                  })}
                  {existingEpisodeEvents.length > 5 && (
                    <li>...and {existingEpisodeEvents.length - 5} more</li>
                  )}
                </Box>
              </Alert>
            )}
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              Events will be saved globally to each castaway&apos;s profile.
              {allLeagueIds.length > 0
                ? ` Team scores will be updated for all ${allLeagueIds.length} league(s) you own.`
                : " No leagues to update scores for."}
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button
            onClick={() => {
              setOpenDialog(false);
              handleSaveScores();
            }}
            variant="contained"
            color={existingEpisodeEvents.length > 0 ? "warning" : "primary"}
          >
            {existingEpisodeEvents.length > 0 ? "Overwrite & Save" : "Confirm & Save"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Roster Lock Confirmation Dialog */}
      <Dialog open={openLockDialog} onClose={() => setOpenLockDialog(false)} aria-labelledby="confirm-lock-title">
        <DialogTitle id="confirm-lock-title">
          {leaguesWithExistingLocks.length > 0
            ? "Overwrite Existing Roster Snapshots?"
            : "Confirm Roster Lock"}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1 }}>
            {leaguesWithExistingLocks.length > 0 && (
              <Alert severity="warning" sx={{ mb: 2 }}>
                <strong>Week {effectiveLockWeek} rosters are already locked</strong> for{" "}
                {membersWithExistingLocks} team{membersWithExistingLocks !== 1 ? "s" : ""} across{" "}
                {leaguesWithExistingLocks.length} league{leaguesWithExistingLocks.length !== 1 ? "s" : ""}.
                Locking again will overwrite those snapshots and reset their week scores to 0.
                <Box component="ul" sx={{ mt: 1, mb: 0, pl: 2 }}>
                  {leaguesWithExistingLocks.map((league) => {
                    const lockedCount = league.memberDetails?.filter((m) =>
                      m.weeklyRosters?.some((wr) => wr.week === effectiveLockWeek),
                    ).length || 0;
                    return (
                      <li key={league.id}>
                        <strong>{league.name}</strong>: {lockedCount} team{lockedCount !== 1 ? "s" : ""} already locked
                      </li>
                    );
                  })}
                </Box>
              </Alert>
            )}
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              This will snapshot each team&apos;s current working roster for Week {effectiveLockWeek} across{" "}
              {allLeagueIds.length} league{allLeagueIds.length !== 1 ? "s" : ""}.
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenLockDialog(false)}>Cancel</Button>
          <Button
            onClick={() => {
              setOpenLockDialog(false);
              handleLockRosters();
            }}
            variant="contained"
            color={leaguesWithExistingLocks.length > 0 ? "warning" : "primary"}
            sx={leaguesWithExistingLocks.length === 0 ? { bgcolor: "#20B2AA", "&:hover": { bgcolor: "#1A8A7F" } } : {}}
          >
            {leaguesWithExistingLocks.length > 0 ? "Overwrite & Lock" : "Confirm & Lock"}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
