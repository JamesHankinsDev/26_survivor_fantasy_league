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
  MenuItem,
  Select,
  FormControl,
  InputLabel,
} from "@mui/material";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import {
  ALL_SEASONS,
  getDisplayCastawaySeason,
  getSeasonStatus,
} from "@/data/seasons";
import { useSeasonCastaways, useEliminatedCastaways } from "@/hooks/useCastaways";
import { useEpisodeScores, useEpisodeEventsByCastaway } from "@/hooks/useEpisodes";
import CastawayCard from "@/components/CastawayCard";

type StatusFilter = "all" | "active" | "eliminated" | "jury";

const TBA_CARD_COUNT = 24;

const seasonOptions = [...ALL_SEASONS].sort((a, b) => b.number - a.number);

function TbaCard() {
  return (
    <Box
      aria-label="To Be Announced castaway"
      sx={{
        height: "100%",
        minHeight: { xs: 340, sm: 380 },
        borderRadius: "14px",
        padding: "3px",
        background: "linear-gradient(135deg, #8A8F98 0%, #5B6370 50%, #8A8F98 100%)",
        display: "flex",
      }}
    >
      <Box
        sx={{
          flex: 1,
          borderRadius: "11px",
          background: "#fafafa",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Box
          sx={{
            px: 1.25,
            py: 0.75,
            background:
              "linear-gradient(135deg, #8A8F98 0%, #5B6370 50%, #8A8F98 100%)",
            color: "#fff",
            textShadow: "0 1px 2px rgba(0,0,0,0.35)",
          }}
        >
          <Typography
            sx={{
              fontWeight: 800,
              fontSize: { xs: "0.95rem", sm: "1rem" },
              letterSpacing: 0.3,
              textTransform: "uppercase",
            }}
          >
            To Be Announced
          </Typography>
        </Box>
        <Box
          sx={{
            flex: 1,
            mx: 1,
            mt: 1,
            borderRadius: "6px",
            border: "2px dashed #B0B5BD",
            background:
              "repeating-linear-gradient(45deg, rgba(138,143,152,0.06) 0 12px, transparent 12px 24px)",
            minHeight: { xs: 200, sm: 240 },
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <HelpOutlineIcon sx={{ fontSize: 96, color: "#B0B5BD" }} />
        </Box>
        <Box
          sx={{
            px: 1.25,
            py: 0.9,
            mt: 1,
            borderTop: "1px solid rgba(138,143,152,0.2)",
            background: "rgba(138, 143, 152, 0.08)",
          }}
        >
          <Typography
            sx={{
              fontSize: "0.72rem",
              fontWeight: 700,
              letterSpacing: 1.2,
              textTransform: "uppercase",
              color: "#8A8F98",
            }}
          >
            Cast Reveal Coming Soon
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}

export default function CastawaysPage() {
  const defaultSeason = getDisplayCastawaySeason();
  const [seasonNumber, setSeasonNumber] = useState<number>(defaultSeason.number);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const selectedSeason =
    ALL_SEASONS.find((s) => s.number === seasonNumber) ?? defaultSeason;
  const seasonStatus = getSeasonStatus(selectedSeason);

  const { data: castaways = [], isLoading } = useSeasonCastaways(seasonNumber);
  const { data: castawayScores = {} } = useEpisodeScores(seasonNumber);
  const { data: castawayEvents = {} } = useEpisodeEventsByCastaway(seasonNumber);
  const { data: eliminatedCastawayIds = [] } = useEliminatedCastaways(seasonNumber);

  const premiereDate = new Date(selectedSeason.premiereDate);
  const formattedPremiereDate = premiereDate.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const formattedConcludedDate = selectedSeason.concludedAt
    ? new Date(selectedSeason.concludedAt).toLocaleDateString("en-US", {
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

  // Upcoming season with no cast data yet → render placeholder grid.
  const showTbaGrid = seasonStatus === "future" && castaways.length === 0;

  if (isLoading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4, textAlign: "center" }}>
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Season selector */}
      <Box sx={{ mb: 3, display: "flex", justifyContent: "flex-end" }}>
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel id="castaways-season-label">Season</InputLabel>
          <Select
            labelId="castaways-season-label"
            label="Season"
            value={seasonNumber}
            onChange={(e) => {
              setSeasonNumber(Number(e.target.value));
              setStatusFilter("all");
            }}
          >
            {seasonOptions.map((s) => (
              <MenuItem key={s.number} value={s.number}>
                {s.name}
                {getSeasonStatus(s) === "future"
                  ? " — Upcoming"
                  : getSeasonStatus(s) === "past"
                    ? " — Archive"
                    : ""}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {/* Season Header */}
      <Box sx={{ mb: 5 }}>
        {seasonStatus === "past" && (
          <Alert severity="info" sx={{ mb: 3 }}>
            <strong>{selectedSeason.name} has concluded.</strong>
            {formattedConcludedDate ? ` Finale aired ${formattedConcludedDate}.` : ""}
            {" "}This page is an archive of the cast and their final scores.
          </Alert>
        )}
        {seasonStatus === "future" && (
          <Alert severity="info" sx={{ mb: 3 }}>
            <strong>{selectedSeason.name} hasn&apos;t started yet.</strong>
            {" "}The official cast will be revealed closer to premiere — these
            placeholders fill in as castaways are announced.
          </Alert>
        )}
        <Typography variant="h3" sx={{ fontWeight: 700, mb: 1 }}>
          {selectedSeason.name}
        </Typography>
        <Typography variant="h5" sx={{ color: "text.secondary", mb: 2 }}>
          {selectedSeason.theme}
        </Typography>
        <Typography variant="body1" sx={{ color: "text.secondary", mb: 3 }}>
          {seasonStatus === "past" ? "Premiered" : "Premieres"}:{" "}
          <strong>{formattedPremiereDate}</strong>
        </Typography>
        {!showTbaGrid && (
          <Typography
            variant="body2"
            sx={{ color: "text.secondary", maxWidth: 600 }}
          >
            {castaways.length} all-star returning players{" "}
            {seasonStatus === "current" ? "compete" : "competed"} in the ultimate
            fan-voted season. Click on any castaway to see their previous
            Survivor experience.
          </Typography>
        )}
      </Box>

      {showTbaGrid ? (
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
          {Array.from({ length: TBA_CARD_COUNT }, (_, i) => (
            <Box key={`tba-${i}`} sx={{ width: "100%" }}>
              <TbaCard />
            </Box>
          ))}
        </Box>
      ) : (
        <>
          {/* Status filter */}
          <Box
            sx={{
              mb: 3,
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              gap: 2,
            }}
          >
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
                    seasonLabel={selectedSeason.name}
                  />
                </Box>
              ))}
            </Box>
          )}
        </>
      )}
    </Container>
  );
}
