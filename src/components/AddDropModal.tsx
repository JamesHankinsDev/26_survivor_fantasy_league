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
  isNetRosterChangeAllowed,
} from "@/utils/scoring";
import { CURRENT_SEASON } from "@/data/seasons";
import { add } from "date-fns/fp";

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
  addDropRestrictionEnabled: boolean;
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
  addDropRestrictionEnabled,
}) => {
  // ...existing code...
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
        `Roster locks in ${Math.floor(hoursUntilLock * 60)} minutes!`,
      );
    }
  }, [open]);

  // ...existing code...

  const currentWeek = getCurrentWeek(seasonStartDate);
  const currentRoster = tribeMember.roster || [];
  const previousWeek = currentWeek - 1;
  const previousRoster =
    tribeMember.weeklyRosterHistory?.find((w) => w.week === previousWeek)
      ?.roster || [];

  // Find which castaway is the "new" one if net change already made
  let netChangeExceeded = false;
  let onlyDroppableId: string | null = null;
  if (
    addDropRestrictionEnabled &&
    previousRoster.length > 0 &&
    !isNetRosterChangeAllowed(previousRoster, currentRoster)
  ) {
    netChangeExceeded = true;
    // Find the new member (in current but not previous)
    const prevIds = previousRoster
      .filter((r) => r.status === "active")
      .map((r) => r.castawayId);
    const currIds = currentRoster
      .filter((r) => r.status === "active")
      .map((r) => r.castawayId);
    const newIds = currIds.filter((id) => !prevIds.includes(id));
    onlyDroppableId = newIds.length === 1 ? newIds[0] : null;
  }

  // Contextual add/drop restrictions
  const maxRosterSize = 5;
  const activeRosterCount = currentRoster.filter(
    (r) => r.status === "active",
  ).length;
  let addDropWarning: string | null = null;
  let submitDisabled = !isNetRosterChangeAllowed(
    previousRoster,
    currentRoster,
    addCastawayId,
    dropCastawayId,
  );

  if (!addDropRestrictionEnabled) {
    submitDisabled =
      currentRoster.filter((el) => el.status === "active").length +
        (addCastawayId ? 1 : 0) -
        (dropCastawayId ? 1 : 0) >
      maxRosterSize;
    addDropWarning = submitDisabled
      ? `You cannot have more than ${maxRosterSize} castaways on your roster.`
      : null;
  } else if (activeRosterCount >= maxRosterSize && !dropCastawayId) {
    addDropWarning = `You have the maximum of ${maxRosterSize} castaways. Drop a castaway before adding another.`;
    submitDisabled = true;
  } else if (
    !isNetRosterChangeAllowed(
      previousRoster,
      currentRoster,
      addCastawayId,
      dropCastawayId,
    )
  ) {
    addDropWarning =
      "You have already made your one net roster change for this week. You may only drop the new castaway you added this week.";
    submitDisabled = true;
  } else if (
    dropCastawayId &&
    addCastawayId &&
    dropCastawayId === addCastawayId
  ) {
    addDropWarning = "You cannot add and drop the same castaway.";
    submitDisabled = true;
  } else if (!dropCastawayId && !addCastawayId) {
    submitDisabled = true;
  }

  const availableCastaways = getAvailableCastaways(
    allCastaways.map((c) => ({ id: c.id, name: c.name })),
    currentRoster,
    eliminatedCastawayIds,
  );

  // Castaways that can be dropped (only active castaways)
  let droppableCastaways = currentRoster.filter(
    (r) =>
      canAddDropCastaway(r, currentWeek) &&
      !eliminatedCastawayIds.includes(r.castawayId),
  );
  if (netChangeExceeded && onlyDroppableId) {
    droppableCastaways = droppableCastaways.filter(
      (r) => r.castawayId === onlyDroppableId,
    );
  }

  const handleSubmit = async () => {
    setError("");
    setLoading(true);
    // Get previous week's roster for net change check
    const previousWeek = currentWeek - 1;
    const previousRoster =
      tribeMember.weeklyRosterHistory?.find((w) => w.week === previousWeek)
        ?.roster || [];
    const newRoster = [...currentRoster];
    // Simulate add/drop
    if (dropCastawayId) {
      const dropIndex = newRoster.findIndex(
        (r) => r.castawayId === dropCastawayId,
      );
      if (dropIndex !== -1) {
        newRoster[dropIndex].status = "dropped";
        newRoster[dropIndex].droppedWeek = currentWeek;
      }
    }
    if (addCastawayId) {
      newRoster.push({
        castawayId: addCastawayId,
        status: "active",
        addedWeek: currentWeek,
        accumulatedPoints: 0,
      });
    }
    // Enforce net roster change limit (if restriction enabled)
    if (addDropRestrictionEnabled && previousRoster.length > 0) {
      if (!isNetRosterChangeAllowed(previousRoster, newRoster)) {
        setError(
          "You can only make one net roster change per week. At least 4 out of 5 castaways must remain the same as last week.",
        );
        setLoading(false);
        return;
      }
    }

    try {
      await onSubmit(dropCastawayId, addCastawayId);
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to process add/drop",
      );
    } finally {
      setLoading(false);
    }
  };

  // Reset to prior week's roster
  const handleResetToPriorWeek = async () => {
    setError("");
    setLoading(true);
    try {
      // We'll call onSubmit with a special signal to reset (null, null, true)
      // But for now, just call onSubmit with a special dropId
      await onSubmit("__RESET_TO_PRIOR_WEEK__", null);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reset roster");
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

          <Alert
            severity={addDropRestrictionEnabled ? "info" : "success"}
            sx={{ mb: 1 }}
          >
            {addDropRestrictionEnabled ? (
              <>
                <strong>Roster Management Rule Enforced:</strong> You may only
                have <strong>1 new player</strong> on your roster each week. At
                least 4 out of 5 castaways must remain the same as last week.{" "}
                <br />
                <strong>Note:</strong> You cannot drop eliminated castaways at
                any time.
              </>
            ) : (
              <>
                <strong>No Roster Management Restriction:</strong> You are free
                to make any add/drop changes at any time, except you cannot drop
                eliminated castaways.
              </>
            )}
          </Alert>

          <FormControl fullWidth>
            <InputLabel>Drop Castaway (Optional)</InputLabel>
            <Select
              value={dropCastawayId || ""}
              label="Drop Castaway (Optional)"
              onChange={(e) => setDropCastawayId(e.target.value || null)}
              disabled={netChangeExceeded && !onlyDroppableId}
            >
              <MenuItem value="">
                <em>None</em>
              </MenuItem>
              {droppableCastaways.map((entry) => {
                const castaway = allCastaways.find(
                  (c) => c.id === entry.castawayId,
                );
                const seasonScore = castawaySeasonScores[entry.castawayId] || 0;
                return (
                  <MenuItem key={entry.castawayId} value={entry.castawayId}>
                    {castaway?.name} ({seasonScore} pts)
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
              disabled={netChangeExceeded}
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

          {addDropWarning && <Alert severity="warning">{addDropWarning}</Alert>}

          <Typography variant="caption" sx={{ color: "#666", mt: 1 }}>
            {dropCastawayName && (
              <>
                Dropping <strong>{dropCastawayName}</strong> — you'll keep the{" "}
                <strong>
                  {droppableCastaways.find(
                    (r) => r.castawayId === dropCastawayId,
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
          disabled={loading || submitDisabled}
        >
          {loading ? <CircularProgress size={24} /> : "Submit"}
        </Button>
        <Button
          onClick={handleResetToPriorWeek}
          color="secondary"
          disabled={
            loading ||
            !previousRoster.length ||
            JSON.stringify(currentRoster) === JSON.stringify(previousRoster)
          }
        >
          Reset to Prior Week's Roster
        </Button>
      </DialogActions>
    </Dialog>
  );
};
