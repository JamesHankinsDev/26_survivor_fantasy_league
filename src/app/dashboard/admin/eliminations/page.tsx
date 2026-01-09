"use client";

import React, { useEffect, useState } from "react";
import {
  Container,
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Alert,
  CircularProgress,
  Chip,
} from "@mui/material";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import CASTAWAYS from "@/data/castaways";
import { CURRENT_SEASON } from "@/data/seasons";
import {
  loadEliminatedCastaways,
  saveEliminatedCastaway,
  removeEliminatedCastaway,
} from "@/utils/scoring";

export default function AdminCastawaysPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [eliminatedIds, setEliminatedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [changedIds, setChangedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const loadEliminations = async () => {
      try {
        const eliminated = await loadEliminatedCastaways(CURRENT_SEASON.number);
        setEliminatedIds(new Set(eliminated));
      } catch (err) {
        console.error("Failed to load eliminations:", err);
      } finally {
        setLoading(false);
      }
    };

    loadEliminations();
  }, []);

  const handleToggleEliminated = (castawayId: string) => {
    const newEliminated = new Set(eliminatedIds);
    const newChanged = new Set(changedIds);

    if (newEliminated.has(castawayId)) {
      newEliminated.delete(castawayId);
    } else {
      newEliminated.add(castawayId);
    }

    // Track which IDs have been changed for UI feedback
    newChanged.add(castawayId);

    setEliminatedIds(newEliminated);
    setChangedIds(newChanged);
  };

  const handleSaveEliminations = async () => {
    if (changedIds.size === 0) {
      setError("No changes to save");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      // Get previously loaded eliminatedIds
      const previouslyLoaded = await loadEliminatedCastaways(
        CURRENT_SEASON.number
      );
      const previousSet = new Set(previouslyLoaded);

      // Find new eliminations and removals
      const toAdd = Array.from(eliminatedIds).filter(
        (id) => !previousSet.has(id)
      );
      const toRemove = Array.from(previousSet).filter(
        (id) => !eliminatedIds.has(id)
      );

      if (toAdd.length === 0 && toRemove.length === 0) {
        setError("No changes detected");
        setSaving(false);
        return;
      }

      // Save changes
      await Promise.all([
        ...toAdd.map((id) => saveEliminatedCastaway(CURRENT_SEASON.number, id)),
        ...toRemove.map((id) =>
          removeEliminatedCastaway(CURRENT_SEASON.number, id)
        ),
      ]);

      // Reload the state to confirm changes
      const updated = await loadEliminatedCastaways(CURRENT_SEASON.number);
      setEliminatedIds(new Set(updated));
      setChangedIds(new Set());

      const message = [];
      if (toAdd.length > 0)
        message.push(`Marked ${toAdd.length} as eliminated`);
      if (toRemove.length > 0) message.push(`Un-eliminated ${toRemove.length}`);

      setSuccess(`${message.join(" and ")}. All active leagues updated.`);

      // Keep success visible longer for confirmation
      setTimeout(() => setSuccess(""), 4000);
    } catch (err) {
      console.error("Error saving eliminations:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to save eliminations. Please try again."
      );
    } finally {
      setSaving(false);
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
        Admin: Manage {CURRENT_SEASON.name} Eliminations
      </Typography>

      {success && (
        <Alert severity="success" sx={{ mb: 3 }}>
          {success}
        </Alert>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Typography variant="body2" sx={{ mb: 3, color: "#666" }}>
        Click castaways to mark them as eliminated from the game. Eliminated
        castaways:
        <ul>
          <li>Cannot be drafted by new players</li>
          <li>Cannot be added/dropped once eliminated on a team</li>
          <li>Cease earning points for their teams</li>
        </ul>
      </Typography>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            sm: "repeat(2, 1fr)",
            md: "repeat(3, 1fr)",
            lg: "repeat(4, 1fr)",
          },
          gap: 2,
          mb: 4,
        }}
      >
        {CASTAWAYS.map((castaway) => {
          const isEliminated = eliminatedIds.has(castaway.id);
          return (
            <Card
              key={castaway.id}
              onClick={() => handleToggleEliminated(castaway.id)}
              sx={{
                cursor: "pointer",
                height: "100%",
                border: isEliminated
                  ? "3px solid #999"
                  : "2px solid transparent",
                backgroundColor: isEliminated ? "#f5f5f5" : "transparent",
                opacity: isEliminated ? 0.7 : 1,
                transition: "all 0.2s ease",
                "&:hover": {
                  boxShadow: 3,
                  borderColor: isEliminated ? "#999" : "#E85D2A",
                },
              }}
            >
              <Box
                sx={{
                  position: "relative",
                  height: 180,
                  overflow: "hidden",
                }}
              >
                {castaway.image && (
                  <Box
                    component="img"
                    src={castaway.image}
                    alt={castaway.name}
                    sx={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      filter: isEliminated ? "grayscale(100%)" : "none",
                    }}
                  />
                )}
                {isEliminated && (
                  <Box
                    sx={{
                      position: "absolute",
                      inset: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: "rgba(0, 0, 0, 0.4)",
                    }}
                  >
                    <Typography
                      sx={{
                        color: "white",
                        fontWeight: "bold",
                        fontSize: "1.2rem",
                      }}
                    >
                      ELIMINATED
                    </Typography>
                  </Box>
                )}
              </Box>
              <CardContent>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  {castaway.name}
                </Typography>
                {isEliminated && (
                  <Chip
                    label="Eliminated"
                    size="small"
                    sx={{
                      mt: 1,
                      bgcolor: "#999",
                      color: "white",
                    }}
                  />
                )}
              </CardContent>
            </Card>
          );
        })}
      </Box>

      <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
        <Button
          variant="contained"
          onClick={handleSaveEliminations}
          disabled={saving || changedIds.size === 0}
        >
          {saving ? (
            <CircularProgress size={24} />
          ) : changedIds.size > 0 ? (
            `Save Changes (${changedIds.size})`
          ) : (
            `No Changes`
          )}
        </Button>
        <Button variant="outlined" onClick={() => router.back()}>
          Cancel
        </Button>
        {changedIds.size > 0 && (
          <Typography
            variant="body2"
            sx={{ color: "#E85D2A", fontWeight: "bold" }}
          >
            {changedIds.size} change{changedIds.size !== 1 ? "s" : ""} pending
          </Typography>
        )}
      </Box>
    </Container>
  );
}
