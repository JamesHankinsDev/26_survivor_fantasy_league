"use client";

import React, { useEffect, useState } from "react";
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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import {
  collection,
  getDocs,
  getDoc,
  query,
  where,
  doc,
  setDoc,
  Timestamp,
  writeBatch,
} from "firebase/firestore";
import { Castaway } from "@/types/castaway";
import {
  EpisodeEvents,
  ScoringEvent,
  ScoringEventType,
  League,
} from "@/types/league";
import { CURRENT_SEASON } from "@/data/seasons";
import CASTAWAYS from "@/data/castaways";
import { calculateTribeTotalPoints } from "@/utils/scoring";
import {
  SCORING_CONFIG,
  calculatePointsFromEvents,
  getEventLabel,
  ALL_EVENT_TYPES,
} from "@/utils/eventScoringConfig";

export default function AdminScoresPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [ownedLeagues, setOwnedLeagues] = useState<League[]>([]);
  const [selectedLeagueId, setSelectedLeagueId] = useState<string>("");
  const [castaways, setCastaways] = useState<Castaway[]>([]);
  const [episodes, setEpisodes] = useState<
    Record<
      string,
      {
        events: ScoringEvent[];
      }
    >
  >({});
  const [episodeNumber, setEpisodeNumber] = useState(1);
  const [airDate, setAirDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [openDialog, setOpenDialog] = useState(false);

  // Load leagues owned by the user
  useEffect(() => {
    const loadOwnedLeagues = async () => {
      if (!user) return;

      try {
        const leaguesRef = collection(db, "leagues");
        const q = query(leaguesRef, where("ownerId", "==", user.uid));
        const snapshot = await getDocs(q);
        const leagues = snapshot.docs.map(
          (doc) =>
            ({
              id: doc.id,
              ...doc.data(),
            } as League)
        );
        setOwnedLeagues(leagues);

        // Auto-select first league if available
        if (leagues.length > 0) {
          setSelectedLeagueId(leagues[0].id);
        }
      } catch (err) {
        console.error("Failed to load owned leagues:", err);
        setError("Failed to load your leagues");
      } finally {
        setLoading(false);
      }
    };

    loadOwnedLeagues();
  }, [user]);

  // Load castaways on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        // Load castaways - these are the same for all leagues
        const loadedCastaways = CASTAWAYS;
        setCastaways(loadedCastaways);

        // Initialize empty events for all castaways
        const initialEvents: Record<string, { events: ScoringEvent[] }> = {};
        loadedCastaways.forEach((c) => {
          initialEvents[c.id] = { events: [] };
        });
        setEpisodes(initialEvents);
      } catch (err) {
        console.error("Error loading castaways:", err);
        setError("Failed to load castaways");
      }
    };
    loadData();
  }, []);

  // Load previous episode events when episode number or league changes
  useEffect(() => {
    const loadEpisodeEvents = async () => {
      if (!selectedLeagueId || castaways.length === 0) return;

      try {
        const episodeRef = doc(
          db,
          "leagues",
          selectedLeagueId,
          "seasons",
          CURRENT_SEASON.number.toString(),
          "episodes",
          `episode-${episodeNumber}`
        );

        const snapshot = await getDoc(episodeRef);

        if (snapshot.exists()) {
          const episodeData = snapshot.data() as EpisodeEvents;
          // Pre-populate the form with existing events
          const loadedEvents: Record<string, { events: ScoringEvent[] }> = {};
          Object.entries(episodeData.events).forEach(([castawayId, events]) => {
            loadedEvents[castawayId] = { events };
          });
          setEpisodes(loadedEvents);
          // Also pre-fill the air date if it exists
          if (episodeData.airDate) {
            const date = episodeData.airDate.toDate
              ? episodeData.airDate.toDate()
              : new Date(episodeData.airDate);
            const isoDate = date.toISOString().split("T")[0];
            setAirDate(isoDate);
          }
        } else {
          // No previous episode found, reset to empty
          const emptyEvents: Record<string, { events: ScoringEvent[] }> = {};
          castaways.forEach((c) => {
            emptyEvents[c.id] = { events: [] };
          });
          setEpisodes(emptyEvents);
          setAirDate("");
        }
      } catch (err) {
        console.error("Error loading episode events:", err);
        // Reset on error
        const emptyEvents: Record<string, { events: ScoringEvent[] }> = {};
        castaways.forEach((c) => {
          emptyEvents[c.id] = { events: [] };
        });
        setEpisodes(emptyEvents);
        setAirDate("");
      }
    };

    loadEpisodeEvents();
  }, [episodeNumber, selectedLeagueId, castaways]);

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

  const handleSaveScores = async () => {
    if (!selectedLeagueId) {
      setError("Please select a league");
      return;
    }

    if (!airDate) {
      setError("Please select an air date");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      // Create episode events document
      const episodeEventsData: EpisodeEvents = {
        id: `episode-${episodeNumber}`,
        seasonNumber: CURRENT_SEASON.number,
        episodeNumber,
        airDate: new Date(airDate),
        events: Object.fromEntries(
          Object.entries(episodes).map(([castawayId, data]) => [
            castawayId,
            data.events,
          ])
        ),
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      // Save to Firestore under the specific league
      const eventsRef = doc(
        db,
        "leagues",
        selectedLeagueId,
        "seasons",
        CURRENT_SEASON.number.toString(),
        "episodes",
        `episode-${episodeNumber}`
      );

      await setDoc(eventsRef, episodeEventsData);

      // Calculate flat scores from events for cascading
      const flatScores: Record<string, number> = {};
      Object.entries(episodes).forEach(([castawayId, data]) => {
        flatScores[castawayId] = getTotalForCastaway(castawayId);
      });

      // Cascade scores to this specific league
      await cascadeScoresToLeague(selectedLeagueId, flatScores);

      setSuccess(
        `Episode ${episodeNumber} events saved successfully for ${
          ownedLeagues.find((l) => l.id === selectedLeagueId)?.name
        }!`
      );

      // Reset form
      const resetEvents: Record<string, { events: ScoringEvent[] }> = {};
      castaways.forEach((c) => {
        resetEvents[c.id] = { events: [] };
      });
      setEpisodes(resetEvents);
      setEpisodeNumber(episodeNumber + 1);
      setAirDate("");
    } catch (err) {
      console.error("Error saving events:", err);
      setError("Failed to save events. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const cascadeScoresToLeague = async (
    leagueId: string,
    episodeScores: Record<string, number>
  ) => {
    try {
      const leagueRef = doc(db, "leagues", leagueId);
      const leagueDoc = await getDoc(leagueRef);

      if (!leagueDoc.exists()) {
        throw new Error("League not found");
      }

      const league = leagueDoc.data() as any;
      const memberDetails = league.memberDetails || [];

      const updatedMembers = memberDetails.map((member: any) => {
        const allEpisodeScores: Record<number, Record<string, number>> = {};
        allEpisodeScores[episodeNumber] = episodeScores;

        const newTotalPoints = calculateTribeTotalPoints(
          member,
          allEpisodeScores
        );

        return {
          ...member,
          points: newTotalPoints,
        };
      });

      await setDoc(
        leagueRef,
        {
          memberDetails: updatedMembers,
          updatedAt: Timestamp.now(),
        },
        { merge: true }
      );

      console.log(
        `Updated ${memberDetails.length} tribe members in league ${leagueId}`
      );
    } catch (err) {
      console.error("Error cascading scores:", err);
      throw err;
    }
  };

  if (!user) {
    router.push("/");
    return null;
  }

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4, textAlign: "center" }}>
        <CircularProgress />
      </Container>
    );
  }

  if (ownedLeagues.length === 0) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="warning" sx={{ mb: 3 }}>
          You don&apos;t own any leagues. Only league owners can record episode
          events.
        </Alert>
        <Typography variant="body2" sx={{ mb: 2, color: "text.secondary" }}>
          To record episode events and manage scoring, you need to create your
          own league. Players who join via invite link cannot access admin
          functions.
        </Typography>
        <Button
          variant="contained"
          onClick={() => router.push("/dashboard/admin")}
          sx={{ mt: 2 }}
        >
          Create a League
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 2 }}>
          Record Episode Events
        </Typography>
        <Typography variant="body2" sx={{ color: "text.secondary", mb: 3 }}>
          Record events for each castaway this episode. Points are calculated
          automatically and applied to the selected league only.
        </Typography>
      </Box>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ mb: 3 }}>
          <FormControl fullWidth sx={{ maxWidth: 400, mb: 3 }}>
            <InputLabel>Select League</InputLabel>
            <Select
              value={selectedLeagueId}
              onChange={(e) => setSelectedLeagueId(e.target.value)}
              label="Select League"
            >
              {ownedLeagues.map((league) => (
                <MenuItem key={league.id} value={league.id}>
                  {league.name} ({league.currentPlayers}/{league.maxPlayers}{" "}
                  players)
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        <Box sx={{ display: "flex", gap: 2, mb: 3, flexWrap: "wrap" }}>
          <TextField
            label="Episode Number"
            type="number"
            value={episodeNumber}
            onChange={(e) => setEpisodeNumber(parseInt(e.target.value) || 1)}
            inputProps={{ min: 1, max: 14 }}
            sx={{ width: 150 }}
          />
          <TextField
            label="Air Date"
            type="date"
            value={airDate}
            onChange={(e) => setAirDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{ width: 200 }}
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
              <TableRow sx={{ backgroundColor: "#f5f5f5" }}>
                <TableCell sx={{ fontWeight: 600 }}>Castaway</TableCell>
                {ALL_EVENT_TYPES.map((eventType) => (
                  <TableCell
                    key={eventType}
                    align="center"
                    sx={{ fontSize: "0.8rem", fontWeight: 600 }}
                  >
                    {getEventLabel(eventType)}
                    <br />
                    <span style={{ fontSize: "0.75rem", color: "#666" }}>
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
              Episode {episodeNumber} - Air Date: {airDate}
            </Typography>
            <Typography sx={{ mt: 2, fontSize: "0.9em", color: "#666" }}>
              These events will be saved for{" "}
              <strong>
                {ownedLeagues.find((l) => l.id === selectedLeagueId)?.name}
              </strong>{" "}
              only. Points will only count for teams that had each castaway at
              the time of scoring.
            </Typography>
            <Typography sx={{ mt: 1, fontSize: "0.9em", color: "#666" }}>
              This action cannot be undone.
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
