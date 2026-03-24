"use client";

import { useEffect, useState } from "react";
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
} from "@mui/material";
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
  const [episodeNumber, setEpisodeNumber] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [openDialog, setOpenDialog] = useState(false);
  const [lockWeek, setLockWeek] = useState(2);
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

  // Load previous episode events from castaway docs when episode number changes
  useEffect(() => {
    if (castaways.length === 0) return;

    const loadedEvents: Record<string, { events: ScoringEvent[] }> = {};

    castaways.forEach((c) => {
      const epEvents = c.weeklyEvents?.[episodeNumber.toString()];
      if (epEvents && epEvents.length > 0) {
        loadedEvents[c.id] = { events: epEvents };
      } else {
        loadedEvents[c.id] = { events: [] };
      }
    });

    setEpisodes(loadedEvents);
  }, [episodeNumber, castaways]);

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
          const count = await lockRostersForLeague(leagueId, lockWeek);
          totalMembers += count;
        })
      );

      setLockResult(
        `Rosters locked for Week ${lockWeek} across ${allLeagueIds.length} league(s) (${totalMembers} teams).`
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
        episodeNumber,
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
        `Episode ${episodeNumber} events saved to castaway profiles.${leagueMsg}`
      );

      setEpisodeNumber(episodeNumber + 1);
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
            value={lockWeek}
            onChange={(e) => setLockWeek(parseInt(e.target.value) || 1)}
            inputProps={{ min: 1, max: 20 }}
            sx={{ width: 150 }}
          />
          <Button
            variant="contained"
            onClick={handleLockRosters}
            disabled={locking || allLeagueIds.length === 0}
            sx={{ bgcolor: "#20B2AA", "&:hover": { bgcolor: "#1A8A7F" } }}
          >
            {locking ? <CircularProgress size={24} /> : `Lock Rosters for Week ${lockWeek}`}
          </Button>
        </Box>

        {lockResult && (
          <Alert severity="success" sx={{ mt: 2 }}>
            {lockResult}
          </Alert>
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
            value={episodeNumber}
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

      {/* Confirmation Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)}>
        <DialogTitle>Confirm Episode Events</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Typography>
              Episode {episodeNumber}
            </Typography>
            <Typography sx={{ mt: 2, fontSize: "0.9em", color: "#666" }}>
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
          >
            Confirm & Save
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
