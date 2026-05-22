"use client";

import { useState } from "react";
import {
  Alert,
  Container,
  Box,
  Typography,
  CircularProgress,
  ToggleButton,
  ToggleButtonGroup,
} from "@mui/material";
import { CURRENT_SEASON, isSeasonActive } from "@/data/seasons";
import { useSeasonCastaways, useEliminatedCastaways } from "@/hooks/useCastaways";
import { useEpisodeScores, useEpisodeEventsByCastaway } from "@/hooks/useEpisodes";
import CastawayCard from "@/components/CastawayCard";

type StatusFilter = "all" | "active" | "eliminated" | "jury";

export default function CastawaysPage() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const { data: castaways = [], isLoading } = useSeasonCastaways(CURRENT_SEASON.number);
  const { data: castawayScores = {} } = useEpisodeScores(CURRENT_SEASON.number);
  const { data: castawayEvents = {} } = useEpisodeEventsByCastaway(CURRENT_SEASON.number);
  const { data: eliminatedCastawayIds = [] } = useEliminatedCastaways(CURRENT_SEASON.number);

  const seasonActive = isSeasonActive();
  const premiereDate = new Date(CURRENT_SEASON.premiereDate);
  const formattedPremiereDate = premiereDate.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const formattedConcludedDate = CURRENT_SEASON.concludedAt
    ? new Date(CURRENT_SEASON.concludedAt).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  const eliminatedSet = new Set(eliminatedCastawayIds);

  const jurySet = new Set(
    castaways
      .filter((c) =>
        Object.values(c.weeklyEvents || {}).some((events) =>
          events.some((e) => e.eventType === "made_jury"),
        ),
      )
      .map((c) => c.id),
  );

  const visibleCastaways = castaways.filter((c) => {
    if (statusFilter === "active") return !eliminatedSet.has(c.id);
    if (statusFilter === "eliminated") return eliminatedSet.has(c.id);
    if (statusFilter === "jury") return jurySet.has(c.id);
    return true;
  });

  const activeCount = castaways.length - eliminatedSet.size;
  const eliminatedCount = eliminatedSet.size;
  const juryCount = jurySet.size;

  if (isLoading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4, textAlign: "center" }}>
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Season Header */}
      <Box sx={{ mb: 5 }}>
        {!seasonActive && (
          <Alert severity="info" sx={{ mb: 3 }}>
            <strong>{CURRENT_SEASON.name} has concluded.</strong>
            {formattedConcludedDate ? ` Finale aired ${formattedConcludedDate}.` : ""}
            {" "}This page is an archive of the cast and their final scores.
          </Alert>
        )}
        <Typography variant="h3" sx={{ fontWeight: 700, mb: 1 }}>
          {CURRENT_SEASON.name}
        </Typography>
        <Typography variant="h5" sx={{ color: "text.secondary", mb: 2 }}>
          {CURRENT_SEASON.theme}
        </Typography>
        <Typography variant="body1" sx={{ color: "text.secondary", mb: 3 }}>
          {seasonActive ? "Premieres" : "Premiered"}: <strong>{formattedPremiereDate}</strong>
        </Typography>
        <Typography
          variant="body2"
          sx={{ color: "text.secondary", maxWidth: 600 }}
        >
          {castaways.length} all-star returning players {seasonActive ? "compete" : "competed"} in the ultimate
          fan-voted season. Click on any castaway to see their previous Survivor
          experience.
        </Typography>
      </Box>

      {/* Status filter */}
      <Box sx={{ mb: 3, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 2 }}>
        <ToggleButtonGroup
          value={statusFilter}
          exclusive
          onChange={(_, next) => {
            if (next !== null) setStatusFilter(next);
          }}
          size="small"
          aria-label="Filter castaways by status"
          sx={{
            "& .MuiToggleButton-root": {
              textTransform: "none",
              fontWeight: 600,
              px: 2,
            },
            "& .Mui-selected": {
              bgcolor: "rgba(232, 93, 42, 0.12) !important",
              color: "#E85D2A !important",
            },
          }}
        >
          <ToggleButton value="all">All ({castaways.length})</ToggleButton>
          <ToggleButton value="active">Active ({activeCount})</ToggleButton>
          <ToggleButton value="eliminated">
            Eliminated ({eliminatedCount})
          </ToggleButton>
          <ToggleButton value="jury">The Jury ({juryCount})</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {/* Castaways Grid */}
      {visibleCastaways.length === 0 ? (
        <Box sx={{ py: 6, textAlign: "center" }}>
          <Typography variant="body1" sx={{ color: "text.secondary" }}>
            No {statusFilter} castaways to show.
          </Typography>
        </Box>
      ) : (
        <Box
          sx={{
            display: "grid",
            gap: 3,
            gridTemplateColumns: {
              xs: "repeat(1, minmax(0, 1fr))",
              sm: "repeat(2, minmax(0, 1fr))",
              md: "repeat(3, minmax(0, 1fr))",
              lg: "repeat(4, minmax(0, 1fr))",
            },
          }}
        >
          {visibleCastaways.map((c) => (
            <Box key={c.id} sx={{ width: "100%" }}>
              <CastawayCard
                castaway={c}
                seasonScore={castawayScores[c.id] || 0}
                isEliminated={eliminatedSet.has(c.id)}
                eventSummary={castawayEvents[c.id] || []}
              />
            </Box>
          ))}
        </Box>
      )}
    </Container>
  );
}
