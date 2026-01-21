import React from "react";
import {
  Card,
  CardContent,
  CardMedia,
  Typography,
  Box,
  Chip,
} from "@mui/material";
import { Castaway } from "@/types/castaway";

export default function CastawayCard({
  castaway,
  seasonScore = 0,
  isEliminated = false,
}: {
  castaway: Castaway;
  seasonScore?: number;
  isEliminated?: boolean;
}) {
  return (
    <Box
      sx={{
        perspective: 1000,
        cursor: "pointer",
        height: "100%",
        opacity: isEliminated ? 0.5 : 1,
        filter: isEliminated ? "grayscale(100%)" : "none",
        "&:hover .flip-inner": { transform: "rotateY(180deg)" },
      }}
    >
      <Box
        className="flip-inner"
        sx={{
          position: "relative",
          width: "100%",
          height: "100%",
          minHeight: 360,
          transformStyle: "preserve-3d",
          transition: "transform 0.6s",
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
          }}
        >
          {castaway.image && (
            <CardMedia
              component="img"
              height="280"
              image={castaway.image}
              alt={castaway.name}
              sx={{ objectFit: "cover", objectPosition: "top" }}
            />
          )}
          <CardContent sx={{ textAlign: "center", pb: 1 }}>
            <Typography
              variant="h6"
              sx={{ fontWeight: 700, fontSize: "1.1rem" }}
            >
              {castaway.name}
            </Typography>
            {isEliminated && (
              <Chip
                label="Eliminated"
                size="small"
                sx={{
                  mt: 1,
                  bgcolor: "#999",
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
          }}
        >
          <CardContent sx={{ overflow: "auto", height: "100%" }}>
            {seasonScore > 0 && (
              <>
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
                <Typography
                  variant="subtitle2"
                  sx={{ fontWeight: 700, mb: 1.5, color: "#1976d2" }}
                >
                  Previous Seasons
                </Typography>
              </>
            )}
            {seasonScore === 0 && (
              <Typography
                variant="subtitle2"
                sx={{ fontWeight: 700, mb: 1.5, color: "#1976d2" }}
              >
                Previous Seasons
              </Typography>
            )}
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
