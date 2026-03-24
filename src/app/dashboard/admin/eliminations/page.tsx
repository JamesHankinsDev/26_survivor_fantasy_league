"use client";

import { useState } from "react";
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { CURRENT_SEASON } from "@/data/seasons";
import { useSeasonCastaways } from "@/hooks/useCastaways";
import { toggleCastawayEliminated } from "@/utils/scoring";
import { dbLogger } from "@/lib/logger";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-client";

export default function AdminCastawaysPage() {
  const { user } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: castaways = [], isLoading: castawaysLoading } = useSeasonCastaways(CURRENT_SEASON.number);
  const [saving, setSaving] = useState<string | null>(null);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [confirmTarget, setConfirmTarget] = useState<{
    castawayId: string;
    name: string;
    currentlyEliminated: boolean;
    totalPoints: number;
  } | null>(null);

  const handleToggleEliminated = async (castawayId: string, currentlyEliminated: boolean) => {
    setSaving(castawayId);
    setError("");
    setSuccess("");

    try {
      await toggleCastawayEliminated(
        CURRENT_SEASON.number,
        castawayId,
        !currentlyEliminated
      );

      // Invalidate castaways cache to refresh UI
      await queryClient.invalidateQueries({
        queryKey: queryKeys.castaways.season(CURRENT_SEASON.number),
      });

      const castaway = castaways.find((c) => c.id === castawayId);
      setSuccess(
        `${castaway?.name} ${!currentlyEliminated ? "marked as eliminated" : "restored"}.`
      );
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      dbLogger.error("Error toggling elimination:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to update elimination status."
      );
    } finally {
      setSaving(null);
    }
  };

  if (castawaysLoading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4, textAlign: "center" }}>
        <CircularProgress />
      </Container>
    );
  }

  if (!user) {
    router.push("/");
    return null;
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" sx={{ mb: 3, fontWeight: "bold" }}>
        Manage {CURRENT_SEASON.name} Eliminations
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

      <Alert severity="info" sx={{ mb: 3 }}>
        Click a castaway to toggle their elimination status. Changes are saved
        immediately and shared across all leagues.
      </Alert>

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
        {castaways.map((castaway) => {
          const isEliminated = castaway.eliminated;
          const isSaving = saving === castaway.id;
          return (
            <Card
              key={castaway.id}
              onClick={() => !isSaving && setConfirmTarget({
                castawayId: castaway.id,
                name: castaway.name,
                currentlyEliminated: isEliminated,
                totalPoints: castaway.totalPoints,
              })}
              sx={{
                cursor: isSaving ? "wait" : "pointer",
                height: "100%",
                border: isEliminated
                  ? "3px solid #d32f2f"
                  : "2px solid transparent",
                backgroundColor: isEliminated ? "#f5f5f5" : "transparent",
                transition: "all 0.2s ease",
                "&:hover": {
                  boxShadow: 3,
                  borderColor: isEliminated ? "#d32f2f" : "#E85D2A",
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
                      opacity: isEliminated ? 0.6 : 1,
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
                {isSaving && (
                  <Box
                    sx={{
                      position: "absolute",
                      inset: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: "rgba(255, 255, 255, 0.6)",
                    }}
                  >
                    <CircularProgress size={32} />
                  </Box>
                )}
              </Box>
              <CardContent>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  {castaway.name}
                </Typography>
                <Typography variant="caption" sx={{ color: "#E85D2A", fontWeight: 600 }}>
                  {castaway.totalPoints} pts
                </Typography>
                {isEliminated && (
                  <Chip
                    label="Eliminated"
                    size="small"
                    sx={{
                      ml: 1,
                      bgcolor: "#d32f2f",
                      color: "white",
                    }}
                  />
                )}
              </CardContent>
            </Card>
          );
        })}
      </Box>

      <Button variant="outlined" onClick={() => router.back()}>
        Back
      </Button>

      {/* Elimination Confirmation Dialog */}
      <Dialog
        open={!!confirmTarget}
        onClose={() => setConfirmTarget(null)}
        aria-labelledby="confirm-elimination-title"
      >
        <DialogTitle id="confirm-elimination-title">
          {confirmTarget?.currentlyEliminated
            ? `Restore ${confirmTarget?.name}?`
            : `Eliminate ${confirmTarget?.name}?`}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1 }}>
            {confirmTarget?.currentlyEliminated ? (
              <Alert severity="info" sx={{ mb: 2 }}>
                <strong>{confirmTarget.name}</strong> is currently marked as eliminated.
                Restoring them will make them available for roster selection again across all leagues.
              </Alert>
            ) : (
              <Alert severity="warning" sx={{ mb: 2 }}>
                <strong>{confirmTarget?.name}</strong> has{" "}
                <strong>{confirmTarget?.totalPoints || 0} points</strong> this season.
                Eliminating them will:
                <Box component="ul" sx={{ mt: 1, mb: 0, pl: 2 }}>
                  <li>Mark them as eliminated across all leagues</li>
                  <li>Prevent them from being added to any roster</li>
                  <li>Keep them on existing rosters (but grayed out)</li>
                </Box>
              </Alert>
            )}
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              This change takes effect immediately and is visible to all users.
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmTarget(null)}>Cancel</Button>
          <Button
            onClick={() => {
              if (confirmTarget) {
                handleToggleEliminated(confirmTarget.castawayId, confirmTarget.currentlyEliminated);
              }
              setConfirmTarget(null);
            }}
            variant="contained"
            color={confirmTarget?.currentlyEliminated ? "primary" : "error"}
          >
            {confirmTarget?.currentlyEliminated ? "Restore" : "Eliminate"}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
