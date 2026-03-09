"use client";

import React, { useState, useEffect } from "react";
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
import { TribeMember } from "@/types/league";
import { Castaway } from "@/types/castaway";
import {
  getCurrentWeek,
  getAvailableCastaways,
  isNetRosterChangeAllowed,
  getPreviousWeekRoster,
} from "@/utils/scoring";

interface AddDropModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (dropId: string | null, addId: string | null) => Promise<void>;
  tribeMember: TribeMember;
  allCastaways: Castaway[];
  eliminatedCastawayIds: string[];
  seasonStartDate: Date;
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
  castawaySeasonScores = {},
  addDropRestrictionEnabled,
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
    const nowEST = new Date(
      now.toLocaleString("en-US", { timeZone: "America/New_York" }),
    );
    const nextLock = getNextWednesday8pm(nowEST);

    const timeUntilLock = nextLock.getTime() - now.getTime();
    const hoursUntilLock = timeUntilLock / (1000 * 60 * 60);

    if (hoursUntilLock < 1) {
      setLockoutMessage(
        `Roster locks in ${Math.floor(hoursUntilLock * 60)} minutes!`,
      );
    }
  }, [open]);

  const currentWeek = getCurrentWeek(seasonStartDate);
  const currentRoster = tribeMember.roster || [];
  const previousRoster = getPreviousWeekRoster(
    tribeMember.weeklyRosters || [],
    currentWeek,
  );

  // Build proposed roster for validation
  const getProposedRoster = () => {
    let proposed = [...currentRoster];
    if (dropCastawayId) {
      proposed = proposed.filter((id) => id !== dropCastawayId);
    }
    if (addCastawayId) {
      proposed.push(addCastawayId);
    }
    return proposed;
  };

  // Check if net change already exceeded (current roster vs previous)
  let netChangeExceeded = false;
  let onlyDroppableId: string | null = null;
  if (
    addDropRestrictionEnabled &&
    previousRoster.length > 0 &&
    !isNetRosterChangeAllowed(previousRoster, currentRoster)
  ) {
    netChangeExceeded = true;
    // Find the new member (in current but not previous)
    const newIds = currentRoster.filter((id) => !previousRoster.includes(id));
    onlyDroppableId = newIds.length === 1 ? newIds[0] : null;
  }

  // Contextual add/drop restrictions
  const maxRosterSize = 5;
  const proposedRoster = getProposedRoster();
  let addDropWarning: string | null = null;
  let submitDisabled = false;

  const nowEST = new Date(
    new Date().toLocaleString("en-US", { timeZone: "America/New_York" }),
  );

  if (!addDropRestrictionEnabled || seasonStartDate > nowEST) {
    submitDisabled = proposedRoster.length > maxRosterSize;
    addDropWarning = submitDisabled
      ? `You cannot have more than ${maxRosterSize} castaways on your roster.`
      : null;
  } else if (currentRoster.length >= maxRosterSize && !dropCastawayId) {
    addDropWarning = `You have the maximum of ${maxRosterSize} castaways. Drop a castaway before adding another.`;
    submitDisabled = true;
  } else if (
    previousRoster.length > 0 &&
    !isNetRosterChangeAllowed(previousRoster, proposedRoster)
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

  // Castaways that can be dropped (on current roster, not eliminated)
  let droppableCastaways = currentRoster.filter(
    (id) => !eliminatedCastawayIds.includes(id),
  );
  if (netChangeExceeded && onlyDroppableId) {
    droppableCastaways = droppableCastaways.filter(
      (id) => id === onlyDroppableId,
    );
  }

  const handleSubmit = async () => {
    setError("");
    setLoading(true);

    // Validate net roster change
    if (addDropRestrictionEnabled && previousRoster.length > 0) {
      const proposed = getProposedRoster();
      if (!isNetRosterChangeAllowed(previousRoster, proposed)) {
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
      await onSubmit("__RESET_TO_PRIOR_WEEK__", null);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reset roster");
    } finally {
      setLoading(false);
    }
  };

  const getNextWednesday8pm = (baseDate?: Date): Date => {
    const now =
      baseDate ||
      new Date(
        new Date().toLocaleString("en-US", { timeZone: "America/New_York" }),
      );
    const daysUntilWednesday = (3 - now.getDay() + 7) % 7 || 7;
    const nextWednesday = new Date(now);
    nextWednesday.setDate(nextWednesday.getDate() + daysUntilWednesday);
    nextWednesday.setHours(20, 0, 0, 0);
    if (now.getDay() === 3 && now.getHours() >= 20) {
      nextWednesday.setDate(nextWednesday.getDate() + 7);
    }
    return nextWednesday;
  };

  const dropCastawayName = dropCastawayId
    ? allCastaways.find((c) => c.id === dropCastawayId)?.name || ""
    : "";
  const addCastawayName = addCastawayId
    ? availableCastaways.find((c) => c.id === addCastawayId)?.name || ""
    : "";

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
                <strong>Roster Management Rule Enforced:</strong> After your
                leagues start date (
                {seasonStartDate
                  ? new Date(seasonStartDate).toLocaleDateString("en-US", {
                      timeZone: "America/New_York",
                    })
                  : "currently unknown"}
                ), you may only have <strong>1 new player</strong> on your
                roster each week. At least 4 out of 5 castaways must remain the
                same as last week. <br />
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
              {droppableCastaways.map((castawayId) => {
                const castaway = allCastaways.find(
                  (c) => c.id === castawayId,
                );
                const seasonScore = castawaySeasonScores[castawayId] || 0;
                return (
                  <MenuItem key={castawayId} value={castawayId}>
                    {castaway?.name} ({seasonScore} season pts)
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
                    {castaway.name} ({seasonScore} season pts)
                  </MenuItem>
                );
              })}
            </Select>
          </FormControl>

          {addDropWarning && <Alert severity="warning">{addDropWarning}</Alert>}

          {dropCastawayName && (
            <Typography variant="caption" sx={{ color: "#666", mt: 1 }}>
              Dropping <strong>{dropCastawayName}</strong> from your roster.
            </Typography>
          )}

          {addCastawayName && (
            <Typography variant="caption" sx={{ color: "#666" }}>
              Adding <strong>{addCastawayName}</strong> — they&apos;ll be on
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
            previousRoster.length === 0 ||
            JSON.stringify(currentRoster.sort()) === JSON.stringify(previousRoster.sort())
          }
          sx={{
            fontSize: { xs: "0.8rem", sm: "0.875rem" },
            px: { xs: 1, sm: 2 },
          }}
        >
          <Box component="span" sx={{ display: { xs: "none", sm: "inline" } }}>
            Reset to Prior Week&apos;s Roster
          </Box>
          <Box component="span" sx={{ display: { xs: "inline", sm: "none" } }}>
            Reset Roster
          </Box>
        </Button>
      </DialogActions>
    </Dialog>
  );
};
