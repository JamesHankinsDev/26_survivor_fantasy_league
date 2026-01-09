"use client";

import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Alert,
  CircularProgress,
} from "@mui/material";
import { RosterEntry, TribeMember } from "@/types/league";
import { Castaway } from "@/types/castaway";
import {
  getCurrentWeek,
  canAddDropCastaway,
  getAvailableCastaways,
} from "@/utils/scoring";
import { CURRENT_SEASON } from "@/data/seasons";

interface AddDropModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (dropId: string | null, addId: string | null) => Promise<void>;
  tribeMember: TribeMember;
  allCastaways: Castaway[];
  eliminatedCastawayIds: string[];
  seasonStartDate: Date;
  seasonPremierDate: Date;
  castawaySeasonScores?: Record<string, number>;
}

export const AddDropModal: React.FC<AddDropModalProps> = ({
  open,
  onClose,
  onSubmit,
  tribeMember,
  allCastaways,
  eliminatedCastawayIds,
  seasonStartDate,
  seasonPremierDate,
  castawaySeasonScores = {},
}) => {
  const [dropCastawayId, setDropCastawayId] = useState<string | null>(null);
  const [addCastawayId, setAddCastawayId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [lockoutMessage, setLockoutMessage] = useState("");

  useEffect(() => {
    if (!open) {
      setDropCastawayId(null);
      setAddCastawayId(null);
      setError("");
      setLockoutMessage("");
      return;
    }

    // Check if roster is locked
    const now = new Date();
    const nextLock = getNextWednesday8pm();

    // If less than 1 hour until lock, show warning
    const timeUntilLock = nextLock.getTime() - now.getTime();
    const hoursUntilLock = timeUntilLock / (1000 * 60 * 60);

    if (hoursUntilLock < 1) {
      setLockoutMessage(
        `Roster locks in ${Math.floor(hoursUntilLock * 60)} minutes!`
      );
    }
  }, [open]);

  const currentWeek = getCurrentWeek(seasonStartDate, seasonPremierDate);
  const currentRoster = tribeMember.roster || [];
  const availableCastaways = getAvailableCastaways(
    allCastaways.map((c) => ({ id: c.id, name: c.name })),
    currentRoster,
    eliminatedCastawayIds
  );

  // Castaways that can be dropped (only active castaways)
  const droppableCastaways = currentRoster.filter((r) =>
    canAddDropCastaway(r, currentWeek) && r.status === "active"
  );

  const handleSubmit = async () => {
    setError("");
    setLoading(true);

    try {
      await onSubmit(dropCastawayId, addCastawayId);
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to process add/drop"
      );
    } finally {
      setLoading(false);
    }
  };

  const getNextWednesday8pm = (): Date => {
    const now = new Date();
    const daysUntilWednesday = (3 - now.getDay() + 7) % 7 || 7;
    const nextWednesday = new Date(now);
    nextWednesday.setDate(nextWednesday.getDate() + daysUntilWednesday);
    nextWednesday.setHours(20, 0, 0, 0);

    if (now.getDay() === 3 && now.getHours() >= 20) {
      nextWednesday.setDate(nextWednesday.getDate() + 7);
    }

    return nextWednesday;
  };

  const dropCastawayName =
    droppableCastaways.find((r) => r.castawayId === dropCastawayId)
      ?.castawayId || "";
  const addCastawayName =
    availableCastaways.find((c) => c.id === addCastawayId)?.name || "";

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Add/Drop Castaway</DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 2, display: "flex", flexDirection: "column", gap: 2 }}>
          {lockoutMessage && <Alert severity="warning">{lockoutMessage}</Alert>}

          {error && <Alert severity="error">{error}</Alert>}

          <Typography variant="caption" sx={{ color: "#666" }}>
            You can add 1 castaway and drop 1 castaway each week. Roster locks
            Wednesday 8pm ET.
          </Typography>

          <FormControl fullWidth>
            <InputLabel>Drop Castaway (Optional)</InputLabel>
            <Select
              value={dropCastawayId || ""}
              label="Drop Castaway (Optional)"
              onChange={(e) => setDropCastawayId(e.target.value || null)}
            >
              <MenuItem value="">
                <em>None</em>
              </MenuItem>
              {droppableCastaways.map((entry) => {
                const castaway = allCastaways.find(
                  (c) => c.id === entry.castawayId
                );
                const seasonScore = castawaySeasonScores[entry.castawayId] || 0;
                return (
                  <MenuItem key={entry.castawayId} value={entry.castawayId}>
                    {castaway?.name} ({seasonScore} pts )
                  </MenuItem>
                );
              })}
            </Select>
          </FormControl>

          <FormControl fullWidth>
            <InputLabel>Add Castaway (Optional)</InputLabel>
            <Select
              value={addCastawayId || ""}
              label="Add Castaway (Optional)"
              onChange={(e) => setAddCastawayId(e.target.value || null)}
            >
              <MenuItem value="">
                <em>None</em>
              </MenuItem>
              {availableCastaways.map((castaway) => {
                const seasonScore = castawaySeasonScores[castaway.id] || 0;
                return (
                  <MenuItem key={castaway.id} value={castaway.id}>
                    {castaway.name} ({seasonScore} pts)
                  </MenuItem>
                );
              })}
            </Select>
          </FormControl>

          <Typography variant="caption" sx={{ color: "#666", mt: 1 }}>
            {dropCastawayName && (
              <>
                Dropping <strong>{dropCastawayName}</strong> — you'll keep the{" "}
                <strong>
                  {droppableCastaways.find(
                    (r) => r.castawayId === dropCastawayId
                  )?.accumulatedPoints || 0}
                </strong>{" "}
                points they've already earned.
              </>
            )}
          </Typography>

          {addCastawayName && (
            <Typography variant="caption" sx={{ color: "#666" }}>
              Adding <strong>{addCastawayName}</strong> — they'll be added to
              your roster starting this week.
            </Typography>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={
            loading ||
            (!dropCastawayId && !addCastawayId) ||
            dropCastawayId === addCastawayId
          }
        >
          {loading ? <CircularProgress size={24} /> : "Submit"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
