"use client";

import { useMemo, useState } from "react";
import { Box, Typography, Button, Chip, Stack } from "@mui/material";
import BlockIcon from "@mui/icons-material/Block";
import AddIcon from "@mui/icons-material/Add";
import type { Castaway } from "@/types/castaway";
import CastawayCard from "@/components/CastawayCard";

type Phase = "hand" | "available" | "summary";

interface RosterItem {
  castaway: Castaway;
  isEliminated: boolean;
  canDrop: boolean;
}

interface Props {
  rosterCastaways: RosterItem[];
  availableCastaways: { id: string; name: string }[];
  allCastaways: Castaway[];
  castawaySeasonScores: Record<string, number>;
  onComplete: (dropId: string | null, addId: string | null) => void;
  netChangeExceeded: boolean;
  onlyDroppableId: string | null;
  maxRosterSize: number;
}

export default function MobileAddDropFlow({
  rosterCastaways,
  availableCastaways,
  allCastaways,
  castawaySeasonScores,
  onComplete,
  netChangeExceeded,
  onlyDroppableId,
  maxRosterSize,
}: Props) {
  const droppableRoster = useMemo(
    () =>
      rosterCastaways.filter((r) => {
        if (r.isEliminated) return false;
        if (
          netChangeExceeded &&
          onlyDroppableId &&
          r.castaway.id !== onlyDroppableId
        )
          return false;
        return true;
      }),
    [rosterCastaways, netChangeExceeded, onlyDroppableId],
  );

  const hasRosterRoom = rosterCastaways.length < maxRosterSize;
  const canAdd = !netChangeExceeded && availableCastaways.length > 0;

  const initialPhase: Phase =
    droppableRoster.length > 0
      ? "hand"
      : hasRosterRoom && canAdd
        ? "available"
        : "summary";

  const [phase, setPhase] = useState<Phase>(initialPhase);
  const [dropId, setDropId] = useState<string | null>(null);
  const [addId, setAddId] = useState<string | null>(null);

  const autoKeptCount = rosterCastaways.length - droppableRoster.length;

  const handleDiscard = (id: string) => {
    setDropId(id);
    if (canAdd) setPhase("available");
    else setPhase("summary");
  };

  const handleSkipDiscard = () => {
    if (hasRosterRoom && canAdd) setPhase("available");
    else setPhase("summary");
  };

  const handleAdd = (id: string) => {
    setAddId(id);
    setPhase("summary");
  };

  const handleSkipAdd = () => setPhase("summary");

  const handleStartOver = () => {
    setDropId(null);
    setAddId(null);
    setPhase(initialPhase);
  };

  if (phase === "hand") {
    return (
      <Box>
        <Typography
          sx={{
            textAlign: "center",
            fontWeight: 700,
            color: "#E85D2A",
            letterSpacing: 0.4,
            textTransform: "uppercase",
            fontSize: "0.85rem",
          }}
        >
          Your Hand
        </Typography>
        <Typography
          variant="caption"
          sx={{
            display: "block",
            textAlign: "center",
            color: "text.secondary",
            mb: 1.5,
          }}
        >
          Tap a card to flip for stats · Tap Discard to swap out
        </Typography>
        {autoKeptCount > 0 && (
          <Typography
            variant="caption"
            sx={{
              display: "block",
              textAlign: "center",
              color: "text.secondary",
              mb: 1,
            }}
          >
            {autoKeptCount} card{autoKeptCount === 1 ? "" : "s"} auto-kept
            (eliminated or locked)
          </Typography>
        )}

        <ScrollDeck>
          {droppableRoster.map(({ castaway, isEliminated }) => (
            <DeckSlot key={castaway.id}>
              <CastawayCard
                castaway={castaway}
                seasonScore={castawaySeasonScores[castaway.id] || 0}
                isEliminated={isEliminated}
              />
              <ActionButton
                action="discard"
                onClick={() => handleDiscard(castaway.id)}
              />
            </DeckSlot>
          ))}
        </ScrollDeck>

        <Stack direction="row" spacing={1} justifyContent="center" sx={{ mt: 2 }}>
          <Button onClick={handleSkipDiscard} variant="outlined" size="small">
            {hasRosterRoom && canAdd ? "Skip — Add Without Dropping" : "Done"}
          </Button>
        </Stack>
      </Box>
    );
  }

  if (phase === "available") {
    return (
      <Box>
        <Typography
          sx={{
            textAlign: "center",
            fontWeight: 700,
            color: "#2e7d32",
            letterSpacing: 0.4,
            textTransform: "uppercase",
            fontSize: "0.85rem",
          }}
        >
          Available Castaways
        </Typography>
        <Typography
          variant="caption"
          sx={{
            display: "block",
            textAlign: "center",
            color: "text.secondary",
            mb: 1.5,
          }}
        >
          Tap a card to flip for stats · Tap Add to Hand to roster them
        </Typography>

        <ScrollDeck>
          {availableCastaways.map((c) => {
            const full = allCastaways.find((x) => x.id === c.id);
            if (!full) return null;
            return (
              <DeckSlot key={c.id}>
                <CastawayCard
                  castaway={full}
                  seasonScore={castawaySeasonScores[c.id] || 0}
                />
                <ActionButton
                  action="add"
                  onClick={() => handleAdd(c.id)}
                />
              </DeckSlot>
            );
          })}
        </ScrollDeck>

        <Stack direction="row" spacing={1} justifyContent="center" sx={{ mt: 2 }}>
          <Button onClick={handleSkipAdd} variant="outlined" size="small">
            Skip
          </Button>
        </Stack>
      </Box>
    );
  }

  // Summary
  const dropCastaway = dropId
    ? allCastaways.find((c) => c.id === dropId)
    : null;
  const addCastaway = addId ? allCastaways.find((c) => c.id === addId) : null;

  return (
    <Box sx={{ textAlign: "center", py: 2 }}>
      <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
        Review Changes
      </Typography>

      {!dropCastaway && !addCastaway && (
        <Typography sx={{ color: "text.secondary", mb: 2 }}>
          No changes made.
        </Typography>
      )}

      {dropCastaway && (
        <Box sx={{ mb: 1 }}>
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
        <Box sx={{ mb: 1 }}>
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

      <Stack
        direction="row"
        spacing={1}
        justifyContent="center"
        sx={{ mt: 3 }}
      >
        <Button variant="outlined" onClick={handleStartOver}>
          Start Over
        </Button>
        <Button
          variant="contained"
          onClick={() => onComplete(dropId, addId)}
          disabled={!dropId && !addId}
          sx={{
            bgcolor: "#E85D2A",
            "&:hover": { bgcolor: "#d14d1a" },
          }}
        >
          Confirm
        </Button>
      </Stack>
    </Box>
  );
}

function ScrollDeck({ children }: { children: React.ReactNode }) {
  return (
    <Box
      sx={{
        display: "flex",
        gap: 2,
        overflowX: "auto",
        overflowY: "visible",
        scrollSnapType: "x mandatory",
        px: 2,
        py: 1,
        WebkitOverflowScrolling: "touch",
        // Scroll padding so the snapped card is centered with some inset
        scrollPadding: "0 16px",
        "&::-webkit-scrollbar": { height: 6 },
        "&::-webkit-scrollbar-thumb": {
          bgcolor: "rgba(0,0,0,0.2)",
          borderRadius: 3,
        },
      }}
    >
      {children}
    </Box>
  );
}

function DeckSlot({ children }: { children: React.ReactNode }) {
  return (
    <Box
      sx={{
        flex: "0 0 auto",
        width: 260,
        scrollSnapAlign: "center",
        display: "flex",
        flexDirection: "column",
        gap: 1,
      }}
    >
      {children}
    </Box>
  );
}

function ActionButton({
  action,
  onClick,
}: {
  action: "discard" | "add";
  onClick: () => void;
}) {
  const color = action === "discard" ? "#d32f2f" : "#2e7d32";
  const label = action === "discard" ? "Discard" : "Add to Hand";
  const Icon = action === "discard" ? BlockIcon : AddIcon;
  return (
    <Button
      onClick={onClick}
      fullWidth
      variant="contained"
      startIcon={<Icon />}
      sx={{
        bgcolor: color,
        color: "#fff",
        fontWeight: 800,
        textTransform: "none",
        letterSpacing: 0.3,
        py: 1,
        "&:hover": { bgcolor: color, filter: "brightness(0.9)" },
      }}
    >
      {label}
    </Button>
  );
}
