"use client";

import { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Alert,
  CircularProgress,
  Box,
} from "@mui/material";
import { useAuth } from "@/lib/auth-context";
import { generateJoinCode, League } from "@/types/league";
import { useSeasonsWithOverrides } from "@/hooks/useSeasonsWithOverrides";
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import {
  sanitizeLeagueName,
  sanitizeDisplayName,
  sanitizeAvatarURL,
} from "@/utils/inputValidation";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-client";

interface CreateLeagueDialogProps {
  open: boolean;
  onClose: () => void;
  onLeagueCreated: (league: League) => void;
}

export default function CreateLeagueDialog({
  open,
  onClose,
  onLeagueCreated,
}: CreateLeagueDialogProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { currentSeason } = useSeasonsWithOverrides();
  const [leagueName, setLeagueName] = useState("");
  const [maxPlayers, setMaxPlayers] = useState("8");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreateLeague = async () => {
    try {
      setError(null);
      setLoading(true);

      // Validate inputs
      if (!leagueName.trim()) {
        setError("League name is required");
        return;
      }

      const playerCount = parseInt(maxPlayers);
      if (playerCount < 2 || playerCount > 20) {
        setError("Number of players must be between 2 and 20");
        return;
      }

      if (!user || !db) {
        setError("User not authenticated or Firebase not initialized");
        return;
      }

      // Create league document
      const joinCode = generateJoinCode();

      // Sanitize inputs
      const sanitizedLeagueName = sanitizeLeagueName(leagueName);
      const sanitizedDisplayName = sanitizeDisplayName(user.displayName);
      const sanitizedAvatar = sanitizeAvatarURL(user.photoURL);

      if (!sanitizedLeagueName) {
        setError("League name cannot be empty");
        setLoading(false);
        return;
      }

      const newLeague: Omit<League, "id"> = {
        name: sanitizedLeagueName,
        ownerId: user.uid,
        ownerName: sanitizedDisplayName,
        maxPlayers: playerCount,
        currentPlayers: 1,
        joinCode,
        members: [user.uid],
        memberDetails: [
          {
            userId: user.uid,
            displayName: sanitizedDisplayName,
            ownerName: sanitizedDisplayName,
            avatar: sanitizedAvatar,
            tribeColor: "#20B2AA",
            totalPoints: 0,
            joinedAt: new Date(),
            roster: [], // Will be populated during draft phase
            weeklyRosters: [], // Snapshots locked every Wednesday 8pm
          },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
        status: "active",
        seasonNumber: currentSeason.number,
      };

      // Defensive: ensure owner is in members and memberDetails, dedupe arrays
      if (!newLeague.members.includes(user.uid)) {
        newLeague.members.push(user.uid);
      }

      const hasMemberDetail = newLeague.memberDetails.some(
        (m) => m.userId === user.uid,
      );
      if (!hasMemberDetail) {
        newLeague.memberDetails.push({
          userId: user.uid,
          displayName: user.displayName || "Unknown",
          ownerName: user.displayName || "Unknown",
          avatar: user.photoURL || "",
          tribeColor: "#20B2AA",
          totalPoints: 0,
          joinedAt: new Date(),
          roster: [],
          weeklyRosters: [],
        });
      }

      // Add to Firestore
      const leaguesRef = collection(db, "leagues");
      const docRef = await addDoc(leaguesRef, {
        ...newLeague,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      const createdLeague: League = {
        id: docRef.id,
        ...newLeague,
      };

      queryClient.invalidateQueries({ queryKey: queryKeys.leagues.all });
      onLeagueCreated(createdLeague);
      resetForm();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create league");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setLeagueName("");
    setMaxPlayers("8");
    setError(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth aria-labelledby="create-league-dialog-title">
      <DialogTitle id="create-league-dialog-title" sx={{ fontWeight: 600 }}>Create New League</DialogTitle>
      <DialogContent sx={{ pt: 2 }}>
        {error && (
          <Alert severity="error" role="alert" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <TextField
            label="League Name"
            fullWidth
            value={leagueName}
            onChange={(e) => setLeagueName(e.target.value)}
            placeholder="e.g., Summer 2026 Showdown"
            disabled={loading}
          />

          <TextField
            label="Number of Players"
            type="number"
            fullWidth
            value={maxPlayers}
            onChange={(e) => setMaxPlayers(e.target.value)}
            inputProps={{ min: 2, max: 20 }}
            disabled={loading}
            helperText="Between 2 and 20 players"
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          onClick={handleCreateLeague}
          variant="contained"
          disabled={loading}
          sx={{
            background: "linear-gradient(135deg, #D94E23 0%, #E85D2A 100%)",
            "&:hover": {
              background: "linear-gradient(135deg, #C93F1A 0%, #D94E23 100%)",
            },
          }}
        >
          {loading ? <CircularProgress size={24} aria-label="Creating league" /> : "Create League"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
