"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Alert,
  CircularProgress,
  Chip,
  Card,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import SwapHorizIcon from "@mui/icons-material/SwapHoriz";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
} from "@dnd-kit/core";
import { TribeMember } from "@/types/league";
import { Castaway } from "@/types/castaway";
import {
  getAvailableCastaways,
  isNetRosterChangeAllowed,
  getLatestLockedRoster,
} from "@/utils/scoring";
import TCGPickCard from "@/components/TCGPickCard";
import MobileAddDropFlow from "@/components/MobileAddDropFlow";

// ─── Static card for DragOverlay ───────────────────────────────────

function OverlayCard({ name, seasonScore }: { name: string; seasonScore: number }) {
  return (
    <Card
      sx={{
        display: "flex",
        alignItems: "center",
        px: 1.5,
        py: 1,
        boxShadow: 6,
        border: "2px solid #E85D2A",
        bgcolor: "background.paper",
        cursor: "grabbing",
        width: 250,
      }}
    >
      <DragIndicatorIcon sx={{ color: "#E85D2A", mr: 1, fontSize: 20 }} />
      <Box sx={{ flex: 1 }}>
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          {name}
        </Typography>
        <Typography variant="caption" sx={{ color: "text.secondary" }}>
          {seasonScore} season pts
        </Typography>
      </Box>
    </Card>
  );
}

// ─── Droppable column ──────────────────────────────────────────────

function DroppableColumn({
  id,
  title,
  count,
  maxCount,
  children,
  accentColor,
}: {
  id: string;
  title: string;
  count: number;
  maxCount?: number;
  children: React.ReactNode;
  accentColor: string;
}) {
  const { isOver, setNodeRef } = useDroppable({ id });

  return (
    <Box
      ref={setNodeRef}
      role="region"
      aria-label={`${title} column, ${count}${maxCount ? ` of ${maxCount}` : ""} castaways`}
      sx={{
        flex: 1,
        minWidth: 0,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          mb: 1.5,
          pb: 1,
          borderBottom: `2px solid ${isOver ? accentColor : "divider"}`,
          transition: "border-color 0.2s",
        }}
      >
        <Typography variant="subtitle2" sx={{ fontWeight: 700, color: accentColor }}>
          {title}
        </Typography>
        <Chip
          label={maxCount ? `${count}/${maxCount}` : count}
          size="small"
          sx={{ fontSize: "0.75rem", height: 22 }}
        />
      </Box>
      <Box
        sx={{
          flex: 1,
          overflowY: "auto",
          maxHeight: { xs: 240, sm: 520 },
          minHeight: 120,
          p: 0.5,
          borderRadius: 1,
          bgcolor: isOver ? `${accentColor}11` : "transparent",
          transition: "background-color 0.2s",
        }}
      >
        {children}
      </Box>
    </Box>
  );
}


// ─── Main modal ────────────────────────────────────────────────────

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
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const [dropCastawayId, setDropCastawayId] = useState<string | null>(null);
  const [addCastawayId, setAddCastawayId] = useState<string | null>(null);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [lockoutMessage, setLockoutMessage] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  useEffect(() => {
    if (!open) {
      setDropCastawayId(null);
      setAddCastawayId(null);
      setActiveDragId(null);
      setError("");
      setLockoutMessage("");
      return;
    }

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

  const currentRoster = tribeMember.roster || [];
  const latestLockedRoster = getLatestLockedRoster(
    tribeMember.weeklyRosters || [],
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

  // Net change restriction checks
  let netChangeExceeded = false;
  let onlyDroppableId: string | null = null;
  if (
    addDropRestrictionEnabled &&
    latestLockedRoster.length > 0 &&
    !isNetRosterChangeAllowed(latestLockedRoster, currentRoster)
  ) {
    netChangeExceeded = true;
    const newIds = currentRoster.filter((id) => !latestLockedRoster.includes(id));
    onlyDroppableId = newIds.length === 1 ? newIds[0] : null;
  }

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
    latestLockedRoster.length > 0 &&
    !isNetRosterChangeAllowed(latestLockedRoster, proposedRoster)
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

  const availableCastaways = useMemo(
    () =>
      getAvailableCastaways(
        allCastaways.map((c) => ({ id: c.id, name: c.name })),
        currentRoster,
        eliminatedCastawayIds,
      ),
    [allCastaways, currentRoster, eliminatedCastawayIds],
  );

  // Droppable roster castaways
  let droppableCastaways = currentRoster.filter(
    (id) => !eliminatedCastawayIds.includes(id),
  );
  if (netChangeExceeded && onlyDroppableId) {
    droppableCastaways = droppableCastaways.filter(
      (id) => id === onlyDroppableId,
    );
  }
  const droppableSet = new Set(droppableCastaways);

  // Can add? (roster not full, or dropping someone)
  const canAdd =
    !netChangeExceeded &&
    (currentRoster.length < maxRosterSize || !!dropCastawayId);

  // ─── Drag handlers ─────────────────────────────────────────────

  function handleDragStart(event: DragStartEvent) {
    setActiveDragId(event.active.data.current?.castawayId || null);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveDragId(null);
    const { active, over } = event;
    if (!over) return;

    const fromColumn = active.data.current?.origin as string;
    const castawayId = active.data.current?.castawayId as string;
    const toColumn = over.id as string;

    if (fromColumn === toColumn) return;

    if (fromColumn === "roster" && toColumn === "available") {
      setDropCastawayId((prev) => (prev === castawayId ? null : castawayId));
    } else if (fromColumn === "available" && toColumn === "roster") {
      setAddCastawayId((prev) => (prev === castawayId ? null : castawayId));
    }
  }

  // ─── Submit ────────────────────────────────────────────────────

  const handleSubmit = async () => {
    setError("");
    setLoading(true);

    if (addDropRestrictionEnabled && latestLockedRoster.length > 0) {
      const proposed = getProposedRoster();
      if (!isNetRosterChangeAllowed(latestLockedRoster, proposed)) {
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

  // ─── Helpers for overlay ───────────────────────────────────────

  const activeCastaway = activeDragId
    ? allCastaways.find((c) => c.id === activeDragId) ||
      availableCastaways.find((c) => c.id === activeDragId)
    : null;

  // ─── Mobile swipe handler ─────────────────────────────────────

  const handleSwipeComplete = async (swipeDropId: string | null, swipeAddId: string | null) => {
    setDropCastawayId(swipeDropId);
    setAddCastawayId(swipeAddId);

    // Submit directly from swipe flow
    setError("");
    setLoading(true);

    if (addDropRestrictionEnabled && latestLockedRoster.length > 0) {
      let proposed = [...currentRoster];
      if (swipeDropId) proposed = proposed.filter((id) => id !== swipeDropId);
      if (swipeAddId) proposed.push(swipeAddId);
      if (!isNetRosterChangeAllowed(latestLockedRoster, proposed)) {
        setError(
          "You can only make one net roster change per week. At least 4 out of 5 castaways must remain the same as last week.",
        );
        setLoading(false);
        return;
      }
    }

    try {
      await onSubmit(swipeDropId, swipeAddId);
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to process add/drop",
      );
    } finally {
      setLoading(false);
    }
  };

  // ─── Mobile roster data for swipe flow ──────────────────────

  const mobileRosterCastaways = useMemo(() => {
    return currentRoster.map((castawayId) => {
      const castaway = allCastaways.find((c) => c.id === castawayId);
      const isEliminated = eliminatedCastawayIds.includes(castawayId);
      const canDrop = droppableSet.has(castawayId);
      return {
        castaway: castaway || { id: castawayId, name: "Unknown", seasonNumber: 0, totalPoints: 0, eliminated: false, weeklyEvents: {} } as Castaway,
        isEliminated,
        canDrop,
      };
    });
  }, [currentRoster, allCastaways, eliminatedCastawayIds, droppableSet]);

  // ─── Desktop: Render roster column content ──────────────────

  const rosterCardGrid = (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
        gap: 1.25,
      }}
    >
      {currentRoster.map((castawayId) => {
        const castaway = allCastaways.find((c) => c.id === castawayId);
        const isEliminated = eliminatedCastawayIds.includes(castawayId);
        const canDrop = droppableSet.has(castawayId);
        return (
          <TCGPickCard
            key={castawayId}
            castawayId={castawayId}
            castaway={castaway}
            seasonScore={castawaySeasonScores[castawayId] || 0}
            isEliminated={isEliminated}
            isPendingDrop={dropCastawayId === castawayId}
            canAct={canDrop}
            action="discard"
            onAction={() =>
              setDropCastawayId((prev) =>
                prev === castawayId ? null : castawayId,
              )
            }
            isMobile={false}
            origin="roster"
          />
        );
      })}
    </Box>
  );

  const availableCardGrid = (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
        gap: 1.25,
      }}
    >
      {availableCastaways.map((c) => {
        const fullCastaway = allCastaways.find((x) => x.id === c.id);
        const isThisPending = addCastawayId === c.id;
        const canAdd_ =
          canAdd && (!addCastawayId || isThisPending);
        return (
          <TCGPickCard
            key={c.id}
            castawayId={c.id}
            castaway={fullCastaway}
            seasonScore={castawaySeasonScores[c.id] || 0}
            isPendingAdd={isThisPending}
            canAct={canAdd_}
            action="add"
            onAction={() =>
              setAddCastawayId((prev) => (prev === c.id ? null : c.id))
            }
            isMobile={false}
            origin="available"
          />
        );
      })}
    </Box>
  );

  // ─── Pending selection summary ─────────────────────────────────

  const dropName = dropCastawayId
    ? allCastaways.find((c) => c.id === dropCastawayId)?.name
    : null;
  const addName = addCastawayId
    ? (allCastaways.find((c) => c.id === addCastawayId)?.name ||
       availableCastaways.find((c) => c.id === addCastawayId)?.name)
    : null;

  // ─── Render ────────────────────────────────────────────────────

  // Mobile: full-screen swipe experience
  if (isMobile) {
    return (
      <Dialog
        open={open}
        onClose={onClose}
        fullScreen
        aria-labelledby="adddrop-mobile-title"
        PaperProps={{ sx: { bgcolor: "#fafafa" } }}
      >
        <DialogTitle id="adddrop-mobile-title" sx={{ fontWeight: 700, textAlign: "center", pb: 0 }}>
          Add/Drop Castaway
          <Typography variant="caption" sx={{ display: "block", color: "text.secondary", mt: 0.5 }}>
            Scroll cards · Tap to flip · Discard / Add to Hand to act
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 1.5, pt: 1 }}>
          {lockoutMessage && (
            <Alert severity="warning" sx={{ py: 0.5 }}>{lockoutMessage}</Alert>
          )}
          {error && <Alert severity="error" sx={{ py: 0.5 }}>{error}</Alert>}

          <Alert
            severity={addDropRestrictionEnabled ? "info" : "success"}
            sx={{ py: 0.5, fontSize: "0.8rem" }}
          >
            {addDropRestrictionEnabled ? (
              <>
                <strong>Roster Rule:</strong> 1 new player per week max. Cannot drop eliminated castaways.
              </>
            ) : (
              <>
                <strong>Free changes</strong> — Cannot drop eliminated castaways.
              </>
            )}
          </Alert>

          {loading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <MobileAddDropFlow
              rosterCastaways={mobileRosterCastaways}
              availableCastaways={availableCastaways}
              allCastaways={allCastaways}
              castawaySeasonScores={castawaySeasonScores}
              maxRosterSize={maxRosterSize}
              onComplete={handleSwipeComplete}
              netChangeExceeded={netChangeExceeded}
              onlyDroppableId={onlyDroppableId}
            />
          )}
        </DialogContent>
        <DialogActions sx={{ justifyContent: "center", pb: 2 }}>
          <Button onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={handleResetToPriorWeek}
            color="secondary"
            disabled={
              loading ||
              latestLockedRoster.length === 0 ||
              JSON.stringify([...currentRoster].sort()) ===
                JSON.stringify([...latestLockedRoster].sort())
            }
            sx={{ fontSize: "0.8rem" }}
          >
            Reset Roster
          </Button>
        </DialogActions>
      </Dialog>
    );
  }

  // Desktop: two-column DnD layout
  const columnsContent = (
    <Box
      sx={{
        display: "flex",
        flexDirection: "row",
        gap: 2,
        mt: 1,
      }}
    >
      <DroppableColumn
        id="roster"
        title="Your Hand"
        count={currentRoster.length}
        maxCount={maxRosterSize}
        accentColor="#E85D2A"
      >
        {rosterCardGrid}
      </DroppableColumn>

      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          px: 0.5,
        }}
      >
        <SwapHorizIcon sx={{ color: "text.disabled", fontSize: 28 }} />
      </Box>

      <DroppableColumn
        id="available"
        title="Available"
        count={availableCastaways.length}
        accentColor="#20B2AA"
      >
        {availableCardGrid}
      </DroppableColumn>
    </Box>
  );

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      aria-labelledby="adddrop-desktop-title"
      PaperProps={{ sx: { maxHeight: "90vh" } }}
    >
      <DialogTitle id="adddrop-desktop-title" sx={{ fontWeight: 700 }}>
        Add/Drop Castaway
        <Typography variant="caption" sx={{ display: "block", color: "text.secondary", mt: 0.5 }}>
          Drag castaways between columns, or click to select
        </Typography>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
          {lockoutMessage && (
            <Alert severity="warning">{lockoutMessage}</Alert>
          )}
          {error && <Alert severity="error">{error}</Alert>}

          <Alert
            severity={addDropRestrictionEnabled ? "info" : "success"}
            sx={{ py: 0.5 }}
          >
            {addDropRestrictionEnabled ? (
              <>
                <strong>Roster Rule:</strong> After your league start date (
                {seasonStartDate
                  ? new Date(seasonStartDate).toLocaleDateString("en-US", {
                      timeZone: "America/New_York",
                    })
                  : "TBD"}
                ), only <strong>1 new player</strong> per week. Cannot drop
                eliminated castaways.
              </>
            ) : (
              <>
                <strong>No Restriction:</strong> Free to make any changes.
                Cannot drop eliminated castaways.
              </>
            )}
          </Alert>

          {/* Pending changes summary */}
          {(dropName || addName) && (
            <Box aria-live="polite" sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
              {dropName && (
                <Chip
                  label={`Dropping: ${dropName}`}
                  onDelete={() => setDropCastawayId(null)}
                  deleteIcon={<CloseIcon />}
                  sx={{
                    bgcolor: "rgba(211, 47, 47, 0.1)",
                    color: "#d32f2f",
                    fontWeight: 600,
                    "& .MuiChip-deleteIcon": { color: "#d32f2f" },
                  }}
                />
              )}
              {addName && (
                <Chip
                  label={`Adding: ${addName}`}
                  onDelete={() => setAddCastawayId(null)}
                  deleteIcon={<CloseIcon />}
                  sx={{
                    bgcolor: "rgba(46, 125, 50, 0.1)",
                    color: "#2e7d32",
                    fontWeight: 600,
                    "& .MuiChip-deleteIcon": { color: "#2e7d32" },
                  }}
                />
              )}
            </Box>
          )}

          {addDropWarning && (
            <Alert severity="warning" sx={{ py: 0.5 }}>
              {addDropWarning}
            </Alert>
          )}

          {/* Two-column DnD layout */}
          <DndContext
            sensors={sensors}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            {columnsContent}

            <DragOverlay>
              {activeDragId && activeCastaway ? (
                <OverlayCard
                  name={activeCastaway.name}
                  seasonScore={castawaySeasonScores[activeDragId] || 0}
                />
              ) : null}
            </DragOverlay>
          </DndContext>
        </Box>
      </DialogContent>
      <DialogActions sx={{ flexWrap: "wrap", gap: 1 }}>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={loading || submitDisabled}
          sx={{
            bgcolor: "#E85D2A",
            "&:hover": { bgcolor: "#d14d1a" },
          }}
        >
          {loading ? <CircularProgress size={24} /> : "Submit"}
        </Button>
        <Button
          onClick={handleResetToPriorWeek}
          color="secondary"
          disabled={
            loading ||
            latestLockedRoster.length === 0 ||
            JSON.stringify(currentRoster.sort()) ===
              JSON.stringify(latestLockedRoster.sort())
          }
        >
          Reset to Prior Week&apos;s Roster
        </Button>
      </DialogActions>
    </Dialog>
  );
};
