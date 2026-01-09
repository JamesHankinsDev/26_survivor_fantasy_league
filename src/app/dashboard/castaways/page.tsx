"use client";

import { useEffect, useState } from "react";
import { Container, Box, Typography } from "@mui/material";
import CASTAWAYS from "@/data/castaways";
import CURRENT_SEASON from "@/data/seasons";
import CastawayCard from "@/components/CastawayCard";
import { db } from "@/lib/firebase";
import { collection, getDocs } from "firebase/firestore";
import { EpisodeEvents } from "@/types/league";
import { calculatePointsFromEvents } from "@/utils/eventScoringConfig";
import { loadEliminatedCastaways } from "@/utils/scoring";

export default function CastawaysPage() {
  const premiereDate = new Date(CURRENT_SEASON.premiereDate);
  const formattedDate = premiereDate.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const [castawayScores, setCastawayScores] = useState<Record<string, number>>(
    {}
  );
  const [eliminatedCastawayIds, setEliminatedCastawayIds] = useState<string[]>(
    []
  );

  // Load all episode events and calculate castaway scores
  useEffect(() => {
    const loadScores = async () => {
      try {
        const episodesRef = collection(
          db,
          "seasons",
          CURRENT_SEASON.number.toString(),
          "episodes"
        );
        const snapshot = await getDocs(episodesRef);

        const scores: Record<string, number> = {};

        snapshot.forEach((doc) => {
          const episode = doc.data() as EpisodeEvents;
          Object.entries(episode.events).forEach(([castawayId, events]) => {
            const points = calculatePointsFromEvents(events);
            scores[castawayId] = (scores[castawayId] || 0) + points;
          });
        });

        setCastawayScores(scores);
      } catch (err) {
        console.error("Error loading castaway scores:", err);
      }
    };

    const loadEliminated = async () => {
      try {
        const eliminated = await loadEliminatedCastaways(CURRENT_SEASON.number);
        setEliminatedCastawayIds(eliminated);
      } catch (err) {
        console.error("Error loading eliminated castaways:", err);
      }
    };

    loadScores();
    loadEliminated();
  }, []);

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
          {CASTAWAYS.length} all-star returning players compete in the ultimate
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
        {CASTAWAYS.map((c) => (
          <Box key={c.id} sx={{ width: "100%" }}>
            <CastawayCard
              castaway={c}
              seasonScore={castawayScores[c.id] || 0}
              isEliminated={eliminatedCastawayIds.includes(c.id)}
            />
          </Box>
        ))}
      </Box>
    </Container>
  );
}
