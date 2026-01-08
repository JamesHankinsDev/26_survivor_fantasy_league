import React from "react";
import { Card, CardContent, CardMedia, Typography, Box } from "@mui/material";

export interface Castaway {
  id: string;
  name: string;
  image?: string;
  bio?: string;
  stats?: Record<string, any>;
}

export default function CastawayCard({ castaway }: { castaway: Castaway }) {
  return (
    <Box
      sx={{
        perspective: 1000,
        cursor: "pointer",
        height: "100%",
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
              sx={{ objectFit: "cover" }}
            />
          )}
          <CardContent sx={{ textAlign: "center" }}>
            <Typography variant="h6" sx={{ fontWeight: 700, fontSize: "1.1rem" }}>
              {castaway.name}
            </Typography>
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
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5, color: "#1976d2" }}>
              Previous Seasons
            </Typography>
            <Typography variant="body2" sx={{ color: "text.secondary", lineHeight: 1.6 }}>
              {castaway.bio || "No previous season history available."}
            </Typography>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}
