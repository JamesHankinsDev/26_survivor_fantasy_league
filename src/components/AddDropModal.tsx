"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
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
  CardMedia,
  CardContent,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import SwapHorizIcon from "@mui/icons-material/SwapHoriz";
import CheckIcon from "@mui/icons-material/Check";
import BlockIcon from "@mui/icons-material/Block";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { useDrag } from "@use-gesture/react";
import { TribeMember } from "@/types/league";
import { Castaway } from "@/types/castaway";
import {
  getAvailableCastaways,
  isNetRosterChangeAllowed,
  getLatestLockedRoster,
} from "@/utils/scoring";

// ─── Draggable castaway card ───────────────────────────────────────

interface CastawayCardItemProps {
  id: string;
  name: string;
  seasonScore: number;
  isDraggable: boolean;
  isEliminated?: boolean;
  isSelected?: boolean;
  isPendingDrop?: boolean;
  isPendingAdd?: boolean;
  origin: "roster" | "available";
  onTap?: () => void;
  isMobile: boolean;
}

function DraggableCastawayCard({
  id,
  name,
  seasonScore,
  isDraggable,
  isEliminated,
  isSelected,
  isPendingDrop,
  isPendingAdd,
  origin,
  onTap,
  isMobile,
}: CastawayCardItemProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: `${origin}-${id}`,
      data: { castawayId: id, origin },
      disabled: !isDraggable || isMobile,
    });

  const style = transform
    ? { transform: CSS.Translate.toString(transform), zIndex: 10 }
    : undefined;

  const borderColor = isPendingDrop
    ? "#d32f2f"
    : isPendingAdd
      ? "#2e7d32"
      : isSelected
        ? "#E85D2A"
        : isEliminated
          ? "#999"
          : "transparent";

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...(isMobile ? {} : { ...attributes, ...listeners })}
      onClick={isMobile && isDraggable ? onTap : undefined}
      sx={{
        display: "flex",
        alignItems: "center",
        px: 1.5,
        py: 1,
        mb: 1,
        cursor: isDraggable
          ? isMobile
            ? "pointer"
            : "grab"
          : "default",
        opacity: isDragging ? 0.3 : isEliminated ? 0.5 : 1,
        border: `2px solid ${borderColor}`,
        bgcolor: isPendingDrop
          ? "rgba(211, 47, 47, 0.05)"
          : isPendingAdd
            ? "rgba(46, 125, 50, 0.05)"
            : isSelected
              ? "rgba(232, 93, 42, 0.08)"
              : "background.paper",
        transition: "border-color 0.2s, background-color 0.2s",
        "&:hover": isDraggable
          ? { boxShadow: 2 }
          : {},
        filter: isEliminated ? "grayscale(100%)" : "none",
      }}
    >
      {!isMobile && isDraggable && (
        <DragIndicatorIcon
          sx={{ color: "text.disabled", mr: 1, fontSize: 20 }}
        />
      )}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography
          variant="body2"
          sx={{
            fontWeight: 600,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            textDecoration: isPendingDrop ? "line-through" : "none",
          }}
        >
          {name}
        </Typography>
        <Typography variant="caption" sx={{ color: "text.secondary" }}>
          {seasonScore} season pts
        </Typography>
      </Box>
      {isEliminated && (
        <Chip
          label="Out"
          size="small"
          sx={{
            bgcolor: "#d32f2f",
            color: "white",
            fontSize: "0.65rem",
            height: 20,
            ml: 1,
          }}
        />
      )}
      {isPendingDrop && (
        <Chip
          label="Dropping"
          size="small"
          sx={{
            bgcolor: "#d32f2f",
            color: "white",
            fontSize: "0.65rem",
            height: 20,
            ml: 1,
          }}
        />
      )}
      {isPendingAdd && (
        <Chip
          label="Adding"
          size="small"
          sx={{
            bgcolor: "#2e7d32",
            color: "white",
            fontSize: "0.65rem",
            height: 20,
            ml: 1,
          }}
        />
      )}
    </Card>
  );
}

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
          maxHeight: { xs: 200, sm: 350 },
          minHeight: 100,
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

// ─── Swipeable castaway card (mobile) ──────────────────────────────

interface SwipeCardProps {
  castaway: Castaway;
  seasonScore: number;
  isEliminated?: boolean;
  leftLabel: string;
  rightLabel: string;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
}

function SwipeCard({
  castaway,
  seasonScore,
  isEliminated,
  leftLabel,
  rightLabel,
  onSwipeLeft,
  onSwipeRight,
}: SwipeCardProps) {
  const [offset, setOffset] = useState(0);
  const [swiping, setSwiping] = useState(false);
  const [exitDir, setExitDir] = useState<"left" | "right" | null>(null);
  const THRESHOLD = 100;

  const bind = useDrag(
    ({ down, movement: [mx], velocity: [vx], direction: [dx] }) => {
      if (exitDir) return; // already animating out

      if (down) {
        setOffset(mx);
        setSwiping(true);
      } else {
        setSwiping(false);
        // Check if swipe exceeded threshold or was fast enough
        const fast = vx > 0.5;
        if (mx < -THRESHOLD || (fast && dx < 0)) {
          setExitDir("left");
          setOffset(-400);
          setTimeout(() => onSwipeLeft(), 300);
        } else if (mx > THRESHOLD || (fast && dx > 0)) {
          setExitDir("right");
          setOffset(400);
          setTimeout(() => onSwipeRight(), 300);
        } else {
          setOffset(0);
        }
      }
    },
    { axis: "x", filterTaps: true },
  );

  const rotation = offset * 0.05; // slight rotation effect
  const leftOpacity = Math.min(1, Math.max(0, -offset / THRESHOLD));
  const rightOpacity = Math.min(1, Math.max(0, offset / THRESHOLD));

  return (
    <Box sx={{ position: "relative", width: "100%", touchAction: "pan-y" }}>
      {/* Direction indicators */}
      <Box
        sx={{
          position: "absolute",
          top: "50%",
          left: 16,
          transform: "translateY(-50%)",
          zIndex: 5,
          opacity: leftOpacity,
          transition: swiping ? "none" : "opacity 0.2s",
          pointerEvents: "none",
        }}
      >
        <Box
          sx={{
            bgcolor: leftLabel === "Drop" ? "#d32f2f" : "#999",
            color: "white",
            borderRadius: 2,
            px: 2,
            py: 1,
            fontWeight: 700,
            fontSize: "1rem",
            display: "flex",
            alignItems: "center",
            gap: 0.5,
          }}
        >
          <BlockIcon fontSize="small" />
          {leftLabel}
        </Box>
      </Box>
      <Box
        sx={{
          position: "absolute",
          top: "50%",
          right: 16,
          transform: "translateY(-50%)",
          zIndex: 5,
          opacity: rightOpacity,
          transition: swiping ? "none" : "opacity 0.2s",
          pointerEvents: "none",
        }}
      >
        <Box
          sx={{
            bgcolor: rightLabel === "Keep" ? "#20B2AA" : "#2e7d32",
            color: "white",
            borderRadius: 2,
            px: 2,
            py: 1,
            fontWeight: 700,
            fontSize: "1rem",
            display: "flex",
            alignItems: "center",
            gap: 0.5,
          }}
        >
          <CheckIcon fontSize="small" />
          {rightLabel}
        </Box>
      </Box>

      {/* Card */}
      <Box
        {...bind()}
        style={{
          transform: `translateX(${offset}px) rotate(${rotation}deg)`,
          transition: swiping ? "none" : "transform 0.3s ease-out",
          opacity: exitDir ? 0 : 1,
        }}
        sx={{ touchAction: "pan-y" }}
      >
        <Card
          sx={{
            overflow: "hidden",
            ...(isEliminated && { border: "2px solid #d32f2f" }),
          }}
        >
          {castaway.image && (
            <CardMedia
              component="img"
              height="240"
              image={castaway.image}
              alt={castaway.name}
              sx={{
                objectFit: "cover",
                objectPosition: "top",
                ...(isEliminated && {
                  filter: "grayscale(100%)",
                  opacity: 0.6,
                }),
              }}
            />
          )}
          <CardContent sx={{ textAlign: "center", pb: 1 }}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              {castaway.name}
            </Typography>
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              {seasonScore} season pts
            </Typography>
            {isEliminated && (
              <Chip
                label="Eliminated"
                size="small"
                sx={{
                  mt: 1,
                  bgcolor: "#d32f2f",
                  color: "white",
                  fontWeight: 600,
                }}
              />
            )}
          </CardContent>
        </Card>
      </Box>

      {/* Hint arrows */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          mt: 1,
          px: 2,
          opacity: 0.5,
        }}
      >
        <Typography variant="caption">← {leftLabel}</Typography>
        <Typography variant="caption">{rightLabel} →</Typography>
      </Box>
    </Box>
  );
}

// ─── Mobile Swipe Flow ─────────────────────────────────────────────

type SwipePhase = "keep-drop" | "add-skip" | "summary";

interface MobileSwipeFlowProps {
  rosterCastaways: { castaway: Castaway; isEliminated: boolean; canDrop: boolean }[];
  availableCastaways: { id: string; name: string }[];
  allCastaways: Castaway[];
  castawaySeasonScores: Record<string, number>;
  maxRosterSize: number;
  onComplete: (dropId: string | null, addId: string | null) => void;
  netChangeExceeded: boolean;
  onlyDroppableId: string | null;
}

function MobileSwipeFlow({
  rosterCastaways,
  availableCastaways,
  allCastaways,
  castawaySeasonScores,
  maxRosterSize,
  onComplete,
  netChangeExceeded,
  onlyDroppableId,
}: MobileSwipeFlowProps) {
  const [phase, setPhase] = useState<SwipePhase>("keep-drop");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [dropId, setDropId] = useState<string | null>(null);
  const [addId, setAddId] = useState<string | null>(null);
  const [, setKept] = useState<string[]>([]);
  const [dropped, setDropped] = useState<string[]>([]);
  const [, setSkipped] = useState<string[]>([]);

  // Only show swipeable roster castaways (non-eliminated, or restricted to only droppable)
  const swipeableRoster = useMemo(() => {
    return rosterCastaways.filter((r) => {
      if (r.isEliminated) return false;
      if (netChangeExceeded && onlyDroppableId && r.castaway.id !== onlyDroppableId) return false;
      return true;
    });
  }, [rosterCastaways, netChangeExceeded, onlyDroppableId]);

  // Auto-keep eliminated and non-swipeable castaways
  const autoKeptCount = rosterCastaways.length - swipeableRoster.length;

  const currentRosterCard = swipeableRoster[currentIndex];

  const handleKeep = useCallback(() => {
    if (!currentRosterCard) return;
    setKept((prev) => [...prev, currentRosterCard.castaway.id]);
    const next = currentIndex + 1;
    if (next >= swipeableRoster.length) {
      setCurrentIndex(0);
      setPhase("check-add" as SwipePhase);
    } else {
      setCurrentIndex(next);
    }
  }, [currentRosterCard, currentIndex, swipeableRoster.length]);

  const handleDrop = useCallback(() => {
    if (!currentRosterCard) return;
    setDropId(currentRosterCard.castaway.id);
    setDropped([currentRosterCard.castaway.id]);
    // Only 1 drop allowed per transaction — skip remaining roster, go to add phase
    setCurrentIndex(0);
    setPhase("check-add" as SwipePhase);
  }, [currentRosterCard]);

  // Transition from keep-drop → add-skip or summary
  useEffect(() => {
    if (phase !== ("check-add" as SwipePhase)) return;

    const currentRosterSize = rosterCastaways.length - dropped.length;
    const hasOpenSpot = dropped.length > 0 && currentRosterSize < maxRosterSize;

    if (hasOpenSpot && availableCastaways.length > 0 && !netChangeExceeded) {
      setCurrentIndex(0);
      setPhase("add-skip");
    } else {
      setPhase("summary");
    }
  }, [phase, dropped, rosterCastaways.length, maxRosterSize, availableCastaways.length, netChangeExceeded]);

  // Add/Skip phase
  const currentAvailable = phase === "add-skip" ? availableCastaways[currentIndex] : null;
  const currentAvailableCastaway = currentAvailable
    ? allCastaways.find((c) => c.id === currentAvailable.id)
    : null;

  const handleAdd = useCallback(() => {
    if (!currentAvailable) return;
    setAddId(currentAvailable.id);
    // After adding, go to summary
    setPhase("summary");
  }, [currentAvailable]);

  const handleSkip = useCallback(() => {
    if (!currentAvailable) return;
    setSkipped((prev) => [...prev, currentAvailable.id]);
    const next = currentIndex + 1;
    if (next >= availableCastaways.length) {
      // No more available, go to summary
      setPhase("summary");
    } else {
      setCurrentIndex(next);
    }
  }, [currentAvailable, currentIndex, availableCastaways.length]);

  // Summary phase
  if (phase === "summary") {
    const dropCastaway = dropId ? allCastaways.find((c) => c.id === dropId) : null;
    const addCastaway = addId ? allCastaways.find((c) => c.id === addId) : null;

    return (
      <Box sx={{ textAlign: "center", py: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
          Review Changes
        </Typography>

        {!dropCastaway && !addCastaway && (
          <Typography sx={{ color: "text.secondary", mb: 2 }}>
            No changes made. You kept everyone!
          </Typography>
        )}

        {dropCastaway && (
          <Box sx={{ mb: 2 }}>
            <Chip
              label={`Dropping: ${dropCastaway.name}`}
              sx={{
                bgcolor: "rgba(211, 47, 47, 0.1)",
                color: "#d32f2f",
                fontWeight: 600,
                fontSize: "0.9rem",
                py: 2,
              }}
            />
          </Box>
        )}

        {addCastaway && (
          <Box sx={{ mb: 2 }}>
            <Chip
              label={`Adding: ${addCastaway.name}`}
              sx={{
                bgcolor: "rgba(46, 125, 50, 0.1)",
                color: "#2e7d32",
                fontWeight: 600,
                fontSize: "0.9rem",
                py: 2,
              }}
            />
          </Box>
        )}

        <Box sx={{ display: "flex", gap: 1, justifyContent: "center", mt: 3 }}>
          <Button
            variant="outlined"
            onClick={() => {
              // Reset and start over
              setPhase("keep-drop");
              setCurrentIndex(0);
              setDropId(null);
              setAddId(null);
              setKept([]);
              setDropped([]);
              setSkipped([]);
            }}
          >
            Start Over
          </Button>
          <Button
            variant="contained"
            onClick={() => onComplete(dropId, addId)}
            disabled={!dropId && !addId}
            sx={{ bgcolor: "#E85D2A", "&:hover": { bgcolor: "#d14d1a" } }}
          >
            Confirm
          </Button>
        </Box>
      </Box>
    );
  }

  // Keep/Drop phase
  if (phase === "keep-drop") {
    if (swipeableRoster.length === 0) {
      // All eliminated or restricted — skip to summary
      return (
        <Box sx={{ textAlign: "center", py: 2 }}>
          <Typography sx={{ color: "text.secondary", mb: 2 }}>
            No roster changes available.
          </Typography>
          <Button variant="outlined" onClick={() => onComplete(null, null)}>
            Done
          </Button>
        </Box>
      );
    }

    if (!currentRosterCard) return null;

    return (
      <Box>
        <Box sx={{ textAlign: "center", mb: 1.5 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "#E85D2A" }}>
            Keep or Drop? ({currentIndex + 1}/{swipeableRoster.length})
          </Typography>
          {autoKeptCount > 0 && (
            <Typography variant="caption" sx={{ color: "text.secondary" }}>
              {autoKeptCount} eliminated castaway(s) auto-kept
            </Typography>
          )}
        </Box>
        <SwipeCard
          key={currentRosterCard.castaway.id}
          castaway={currentRosterCard.castaway}
          seasonScore={castawaySeasonScores[currentRosterCard.castaway.id] || 0}
          isEliminated={currentRosterCard.isEliminated}
          leftLabel="Drop"
          rightLabel="Keep"
          onSwipeLeft={handleDrop}
          onSwipeRight={handleKeep}
        />
      </Box>
    );
  }

  // Add/Skip phase
  if (phase === "add-skip" && currentAvailableCastaway) {
    return (
      <Box>
        <Box sx={{ textAlign: "center", mb: 1.5 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "#2e7d32" }}>
            Add or Skip? ({currentIndex + 1}/{availableCastaways.length})
          </Typography>
          <Typography variant="caption" sx={{ color: "text.secondary" }}>
            You have an open roster spot!
          </Typography>
        </Box>
        <SwipeCard
          key={currentAvailableCastaway.id}
          castaway={currentAvailableCastaway}
          seasonScore={castawaySeasonScores[currentAvailableCastaway.id] || 0}
          leftLabel="Skip"
          rightLabel="Add"
          onSwipeLeft={handleSkip}
          onSwipeRight={handleAdd}
        />
      </Box>
    );
  }

  return null;
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

  const rosterCards = currentRoster.map((castawayId) => {
    const castaway = allCastaways.find((c) => c.id === castawayId);
    const isEliminated = eliminatedCastawayIds.includes(castawayId);
    const canDrop = droppableSet.has(castawayId);

    return (
      <DraggableCastawayCard
        key={castawayId}
        id={castawayId}
        name={castaway?.name || "Unknown"}
        seasonScore={castawaySeasonScores[castawayId] || 0}
        isDraggable={canDrop}
        isEliminated={isEliminated}
        isPendingDrop={dropCastawayId === castawayId}
        origin="roster"
        isMobile={false}
      />
    );
  });

  const availableCards = availableCastaways.map((castaway) => (
    <DraggableCastawayCard
      key={castaway.id}
      id={castaway.id}
      name={castaway.name}
      seasonScore={castawaySeasonScores[castaway.id] || 0}
      isDraggable={canAdd && !addCastawayId}
      isPendingAdd={addCastawayId === castaway.id}
      origin="available"
      isMobile={false}
    />
  ));

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
        PaperProps={{ sx: { bgcolor: "#fafafa" } }}
      >
        <DialogTitle sx={{ fontWeight: 700, textAlign: "center", pb: 0 }}>
          Add/Drop Castaway
          <Typography variant="caption" sx={{ display: "block", color: "text.secondary", mt: 0.5 }}>
            Swipe right to keep/add, left to drop/skip
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
            <MobileSwipeFlow
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
        title="Your Roster"
        count={currentRoster.length}
        maxCount={maxRosterSize}
        accentColor="#E85D2A"
      >
        {rosterCards}
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
        {availableCards}
      </DroppableColumn>
    </Box>
  );

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{ sx: { maxHeight: "90vh" } }}
    >
      <DialogTitle sx={{ fontWeight: 700 }}>
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
            <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
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
