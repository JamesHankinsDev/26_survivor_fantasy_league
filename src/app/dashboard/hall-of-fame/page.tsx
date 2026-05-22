"use client";

import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  Container,
  Stack,
  Typography,
} from "@mui/material";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import { useHallOfFame } from "@/hooks/useHallOfFame";
import { getSeasonLabel } from "@/data/seasons";
import { getRarity, getRarityConfig } from "@/utils/cardRarity";
import CastawayCard from "@/components/CastawayCard";

export default function HallOfFamePage() {
  const { data: entries = [], isLoading, error } = useHallOfFame();

  const legendaryCount = entries.filter(
    (e) => getRarity(e.totalPoints) === "legendary",
  ).length;
  const mythicCount = entries.filter(
    (e) => getRarity(e.totalPoints) === "mythic",
  ).length;
  const legendaryAccent = getRarityConfig("legendary").accent;
  const mythicAccent = getRarityConfig("mythic").accent;

  if (isLoading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4, textAlign: "center" }}>
        <CircularProgress sx={{ color: "#E85D2A" }} />
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1 }}>
          <EmojiEventsIcon sx={{ fontSize: 36, color: "#C8871B" }} />
          <Typography variant="h3" sx={{ fontWeight: 700 }}>
            Hall of Fame
          </Typography>
        </Stack>
        <Typography variant="body1" sx={{ color: "text.secondary", mb: 2, maxWidth: 720 }}>
          The greatest castaways across every season — anyone who finished at
          Legendary rarity or higher takes their place here, ranked by total
          points.
        </Typography>
        <Stack direction="row" spacing={1} flexWrap="wrap">
          <Chip
            label={`${mythicCount} Mythic`}
            sx={{
              bgcolor: `${mythicAccent}1A`,
              color: mythicAccent,
              fontWeight: 700,
            }}
          />
          <Chip
            label={`${legendaryCount} Legendary`}
            sx={{
              bgcolor: `${legendaryAccent}1A`,
              color: legendaryAccent,
              fontWeight: 700,
            }}
          />
        </Stack>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          Couldn&apos;t load the Hall of Fame. Try again in a moment.
        </Alert>
      )}

      {entries.length === 0 ? (
        <Box sx={{ py: 8, textAlign: "center" }}>
          <Typography variant="body1" sx={{ color: "text.secondary" }}>
            No castaways have reached Legendary rarity yet. Check back after
            the next finale.
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
          {entries.map((entry) => (
            <Box key={`${entry.seasonNumber}-${entry.id}`} sx={{ width: "100%" }}>
              <CastawayCard
                castaway={entry}
                seasonScore={entry.totalPoints}
                isEliminated={false}
                seasonLabel={getSeasonLabel(entry.seasonNumber)}
              />
            </Box>
          ))}
        </Box>
      )}
    </Container>
  );
}
