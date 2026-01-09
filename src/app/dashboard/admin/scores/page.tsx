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
import { EpisodeEvents, ScoringEvent, ScoringEventType } from "@/types/league";
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
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [openDialog, setOpenDialog] = useState(false);

  // Load castaways on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const castawaysRef = collection(
          db,
          "seasons",
          CURRENT_SEASON.number.toString(),
          "castaways"
        );
        const snapshot = await getDocs(castawaysRef);
        let loadedCastaways: Castaway[] = [];
        if (snapshot.empty) {
          loadedCastaways = CASTAWAYS;
        } else {
          loadedCastaways = snapshot.docs.map(
            (doc) =>
              ({
                id: doc.id,
                ...doc.data(),
              } as Castaway)
          );
        }
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

  // Load previous episode events when episode number changes
  useEffect(() => {
    const loadEpisodeEvents = async () => {
      try {
        const episodeRef = doc(
          db,
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

    if (castaways.length > 0) {
      loadEpisodeEvents();
    }
  }, [episodeNumber, castaways]);

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

      // Save to Firestore
      const eventsRef = doc(
        db,
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

      // Cascade scores to all managed leagues
      await cascadeScoresToLeagues(flatScores);

      setSuccess(
        `Episode ${episodeNumber} events saved successfully! Cascading to all managed leagues...`
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

  const cascadeScoresToLeagues = async (
    episodeScores: Record<string, number>
  ) => {
    try {
      const leaguesRef = collection(db, "leagues");
      const snapshot = await getDocs(leaguesRef);
      const batch = writeBatch(db);
      let updatedCount = 0;

      snapshot.forEach((leagueDoc) => {
        const league = leagueDoc.data() as any;
        const memberDetails = league.memberDetails || [];

        const updatedMembers = memberDetails.map((member: any) => {
          const allEpisodeScores: Record<number, Record<string, number>> = {};
          allEpisodeScores[episodeNumber] = episodeScores;

          const newTotalPoints = calculateTribeTotalPoints(
            member,
            allEpisodeScores
          );

          updatedCount++;
          return {
            ...member,
            points: newTotalPoints,
          };
        });

        batch.update(doc(db, "leagues", leagueDoc.id), {
          memberDetails: updatedMembers,
          updatedAt: Timestamp.now(),
        });
      });

      await batch.commit();
      console.log(`Updated ${updatedCount} tribe members across all leagues`);
    } catch (err) {
      console.error("Error cascading scores:", err);
    }
  };

  if (!user) {
    router.push("/");
    return null;
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 2 }}>
          Record Episode Events
        </Typography>
        <Typography variant="body2" sx={{ color: "text.secondary", mb: 3 }}>
          Record events for each castaway this episode. Points are calculated
          automatically based on the event types.
        </Typography>
      </Box>

      <Paper sx={{ p: 3, mb: 3 }}>
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
              These events will cascade to ALL active leagues you manage. Points
              will only count for teams that had each castaway at the time of
              scoring.
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
