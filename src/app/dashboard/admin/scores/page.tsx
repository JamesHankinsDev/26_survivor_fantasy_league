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
} from "@mui/material";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  setDoc,
  Timestamp,
  writeBatch,
} from "firebase/firestore";
import { Castaway } from "@/types/castaway";
import { EpisodeScores, League } from "@/types/league";
import { CURRENT_SEASON } from "@/data/seasons";
import { calculateTribeTotalPoints } from "@/utils/scoring";

export default function AdminScoresPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [castaways, setCastaways] = useState<Castaway[]>([]);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [episodeNumber, setEpisodeNumber] = useState(1);
  const [airDate, setAirDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [openDialog, setOpenDialog] = useState(false);

  // Load castaways on mount
  useEffect(() => {
    const loadCastaways = async () => {
      try {
        const castawayCollection = collection(db, "castaways");
        const snapshot = await getDocs(
          query(castawayCollection, where("seasonNumber", "==", CURRENT_SEASON.number))
        );

        // If no castaways in database, use hardcoded data
        if (snapshot.empty) {
          const { default: defaultCastaways } = await import(
            "@/data/castaways"
          );
          setCastaways(
            defaultCastaways.map((c, idx) => ({
              ...c,
              id: c.id,
              seasonNumber: CURRENT_SEASON.number,
            }))
          );
        } else {
          setCastaways(snapshot.docs.map((doc) => doc.data() as Castaway));
        }

        // Initialize scores object
        const initialScores: Record<string, number> = {};
        snapshot.docs.forEach((doc) => {
          initialScores[doc.id] = 0;
        });
        setScores(initialScores);
      } catch (err) {
        console.error("Error loading castaways:", err);
        setError("Failed to load castaways");
      } finally {
        setLoading(false);
      }
    };

    loadCastaways();
  }, []);

  const handleScoreChange = (castawayId: string, value: string) => {
    setScores((prev) => ({
      ...prev,
      [castawayId]: parseInt(value) || 0,
    }));
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
      // Create episode scores document
      const episodeScoresData: EpisodeScores = {
        id: `episode-${episodeNumber}`,
        seasonNumber: CURRENT_SEASON.number,
        episodeNumber,
        airDate: new Date(airDate),
        scores,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      // Save to Firestore in central location
      const scoresRef = doc(
        db,
        "seasons",
        CURRENT_SEASON.number.toString(),
        "episodes",
        `episode-${episodeNumber}`
      );

      await setDoc(scoresRef, episodeScoresData);

      // Cascade scores to all managed leagues
      await cascadeScoresToLeagues(scores);

      setSuccess(
        `Episode ${episodeNumber} scores saved successfully! Cascading to all managed leagues...`
      );

      // Reset form
      setScores(
        Object.fromEntries(castaways.map((c) => [c.id, 0]))
      );
      setEpisodeNumber(episodeNumber + 1);
      setAirDate("");
    } catch (err) {
      console.error("Error saving scores:", err);
      setError("Failed to save scores. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const cascadeScoresToLeagues = async (
    episodeScores: Record<string, number>
  ) => {
    try {
      // Load all leagues
      const leaguesRef = collection(db, "leagues");
      const allLeaguesSnapshot = await getDocs(leaguesRef);

      const batch = writeBatch(db);
      let updatedCount = 0;

      // For each league, update all tribe members' points
      allLeaguesSnapshot.docs.forEach((leagueDoc) => {
        const league = leagueDoc.data() as League;

        if (!league.memberDetails || league.memberDetails.length === 0) {
          return;
        }

        // Recalculate points for each member
        const updatedMembers = league.memberDetails.map((member) => {
          // Get all episodes scored so far for this league
          const allEpisodeScores: Record<number, Record<string, number>> = {};

          // Add the current episode
          allEpisodeScores[episodeNumber] = episodeScores;

          // Calculate new total points based on complete roster history
          const newTotalPoints = calculateTribeTotalPoints(member, allEpisodeScores);

          updatedCount++;
          return {
            ...member,
            points: newTotalPoints,
          };
        });

        // Update the league with new member details
        batch.update(doc(db, "leagues", leagueDoc.id), {
          memberDetails: updatedMembers,
          updatedAt: Timestamp.now(),
        });
      });

      await batch.commit();
      console.log(`Updated ${updatedCount} tribe members across all leagues`);
    } catch (err) {
      console.error("Error cascading scores:", err);
      // Don't throw - scores were saved, just failed to cascade
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

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" sx={{ mb: 3, fontWeight: "bold" }}>
        Admin: Episode Scoring
      </Typography>

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
          Enter points for each castaway:
        </Typography>

        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ backgroundColor: "#f5f5f5" }}>
                <TableCell>Castaway</TableCell>
                <TableCell align="center">Alive Bonus</TableCell>
                <TableCell align="center">Immunity Win</TableCell>
                <TableCell align="center">Jury Vote</TableCell>
                <TableCell align="center">Other</TableCell>
                <TableCell align="right">Total</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {castaways.map((castaway) => (
                <TableRow key={castaway.id}>
                  <TableCell>{castaway.name}</TableCell>
                  <TableCell align="center">
                    <TextField
                      type="number"
                      size="small"
                      value={scores[castaway.id] || 0}
                      onChange={(e) =>
                        handleScoreChange(castaway.id, e.target.value)
                      }
                      inputProps={{ min: 0, step: 1 }}
                      sx={{ width: 80 }}
                    />
                  </TableCell>
                  <TableCell align="center">-</TableCell>
                  <TableCell align="center">-</TableCell>
                  <TableCell align="center">-</TableCell>
                  <TableCell align="right" sx={{ fontWeight: "bold" }}>
                    {scores[castaway.id] || 0}
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
            {saving ? <CircularProgress size={24} /> : "Save Episode Scores"}
          </Button>
          <Button variant="outlined" onClick={() => router.back()}>
            Cancel
          </Button>
        </Box>
      </Paper>

      {/* Confirmation Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)}>
        <DialogTitle>Confirm Episode Scores</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Typography>
              Episode {episodeNumber} - Air Date: {airDate}
            </Typography>
            <Typography sx={{ mt: 2, fontSize: "0.9em", color: "#666" }}>
              These scores will cascade to ALL active leagues you manage. Points
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
