"use client";

import { Container, Box, Typography, CircularProgress } from "@mui/material";
import { CURRENT_SEASON } from "@/data/seasons";
import { useSeasonCastaways, useEliminatedCastaways } from "@/hooks/useCastaways";
import { useEpisodeScores, useEpisodeEventsByCastaway } from "@/hooks/useEpisodes";
import CastawayCard from "@/components/CastawayCard";

export default function CastawaysPage() {
  const { data: castaways = [], isLoading } = useSeasonCastaways(CURRENT_SEASON.number);
  const { data: castawayScores = {} } = useEpisodeScores(CURRENT_SEASON.number);
  const { data: castawayEvents = {} } = useEpisodeEventsByCastaway(CURRENT_SEASON.number);
  const { data: eliminatedCastawayIds = [] } = useEliminatedCastaways(CURRENT_SEASON.number);

  const premiereDate = new Date(CURRENT_SEASON.premiereDate);
  const formattedDate = premiereDate.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const eliminatedSet = new Set(eliminatedCastawayIds);

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
        <Typography variant="h3" sx={{ fontWeight: 700, mb: 1 }}>
          {CURRENT_SEASON.name}
        </Typography>
        <Typography variant="h5" sx={{ color: "text.secondary", mb: 2 }}>
          {CURRENT_SEASON.theme}
        </Typography>
        <Typography variant="body1" sx={{ color: "text.secondary", mb: 3 }}>
          Premieres: <strong>{formattedDate}</strong>
        </Typography>
        <Typography
          variant="body2"
          sx={{ color: "text.secondary", maxWidth: 600 }}
        >
          {castaways.length} all-star returning players compete in the ultimate
          fan-voted season. Click on any castaway to see their previous Survivor
          experience.
        </Typography>
      </Box>

      {/* Castaways Grid */}
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
        {castaways.map((c) => (
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
    </Container>
  );
}
