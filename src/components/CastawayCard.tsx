import { useState } from "react";
import {
  Card,
  CardContent,
  CardMedia,
  Typography,
  Box,
  Chip,
} from "@mui/material";
import { Castaway } from "@/types/castaway";
import { CastawayEventSummary } from "@/hooks/useEpisodes";
import { getEventLabel } from "@/utils/eventScoringConfig";

export default function CastawayCard({
  castaway,
  seasonScore = 0,
  isEliminated = false,
  eventSummary = [],
}: {
  castaway: Castaway;
  seasonScore?: number;
  isEliminated?: boolean;
  eventSummary?: CastawayEventSummary[];
}) {
  const [flipped, setFlipped] = useState(false);

  const handleFlip = () => setFlipped((prev) => !prev);
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleFlip();
    }
  };

  return (
    <Box
      role="button"
      tabIndex={0}
      aria-label={`${castaway.name}${isEliminated ? " (eliminated)" : ""}. ${seasonScore} season points. Press Enter to ${flipped ? "show photo" : "show stats"}.`}
      onClick={handleFlip}
      onKeyDown={handleKeyDown}
      sx={{
        perspective: 1000,
        cursor: "pointer",
        height: "100%",
        "&:hover .flip-inner, &:focus .flip-inner": {
          transform: flipped ? "rotateY(180deg)" : undefined,
        },
        "&:focus-visible": {
          outline: "2px solid #E85D2A",
          outlineOffset: 2,
          borderRadius: 1,
        },
      }}
    >
      <Box
        className="flip-inner"
        aria-hidden="true"
        sx={{
          position: "relative",
          width: "100%",
          height: "100%",
          minHeight: { xs: 320, sm: 360 },
          transformStyle: "preserve-3d",
          transition: "transform 0.6s",
          transform: flipped ? "rotateY(180deg)" : "none",
        }}
      >
        {/* Front */}
        <Card
          sx={{
            backfaceVisibility: "hidden",
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            ...(isEliminated && {
              border: "2px solid #d32f2f",
            }),
          }}
        >
          {castaway.image && (
            <CardMedia
              component="img"
              height="280"
              image={castaway.image}
              alt={castaway.name}
              sx={{
                objectFit: "cover",
                objectPosition: "top",
                height: { xs: 200, sm: 240, md: 280 },
                ...(isEliminated && {
                  filter: "grayscale(100%)",
                  opacity: 0.6,
                }),
              }}
            />
          )}
          <CardContent sx={{ textAlign: "center", pb: 1 }}>
            <Typography
              variant="h6"
              sx={{ fontWeight: 700, fontSize: { xs: "1rem", sm: "1.1rem" } }}
            >
              {castaway.name}
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
                  fontSize: "0.75rem",
                }}
              />
            )}
          </CardContent>
        </Card>

        {/* Back */}
        <Card
          sx={{
            backfaceVisibility: "hidden",
            position: "absolute",
            inset: 0,
            transform: "rotateY(180deg)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-start",
            p: 2,
            backgroundColor: "#fafafa",
            ...(isEliminated && {
              border: "2px solid #d32f2f",
            }),
          }}
        >
          <CardContent sx={{ overflow: "auto", height: "100%" }}>
            {seasonScore > 0 && (
              <Box sx={{ mb: 2, textAlign: "center" }}>
                <Chip
                  label={`${seasonScore} pts this season`}
                  sx={{
                    bgcolor: "#E85D2A",
                    color: "white",
                    fontWeight: 600,
                    fontSize: "0.9rem",
                  }}
                />
              </Box>
            )}

            {eventSummary.length > 0 && (
              <Box sx={{ mb: 2 }}>
                <Typography
                  variant="subtitle2"
                  sx={{ fontWeight: 700, mb: 1, color: "#1976d2" }}
                >
                  Season Events
                </Typography>
                {eventSummary.map((e) => (
                  <Box
                    key={e.eventType}
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      py: 0.4,
                    }}
                  >
                    <Typography variant="body2" sx={{ color: "text.secondary" }}>
                      {getEventLabel(e.eventType)}
                      {e.count > 1 && ` x${e.count}`}
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: 600,
                        color: e.points >= 0 ? "#2e7d32" : "#d32f2f",
                        ml: 1,
                      }}
                    >
                      {e.points > 0 ? "+" : ""}
                      {e.points}
                    </Typography>
                  </Box>
                ))}
              </Box>
            )}

            {eventSummary.length === 0 && seasonScore === 0 && (
              <Box sx={{ mb: 2, textAlign: "center" }}>
                <Typography
                  variant="body2"
                  sx={{ color: "text.secondary", fontStyle: "italic" }}
                >
                  No scoring events yet
                </Typography>
              </Box>
            )}

            <Typography
              variant="subtitle2"
              sx={{ fontWeight: 700, mb: 1, color: "#1976d2" }}
            >
              Previous Seasons
            </Typography>
            <Typography
              variant="body2"
              sx={{ color: "text.secondary", lineHeight: 1.6 }}
            >
              {castaway.bio || "No previous season history available."}
            </Typography>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}
