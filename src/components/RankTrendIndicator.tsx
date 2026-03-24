"use client";

import { Box, Typography, Tooltip } from "@mui/material";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import RemoveIcon from "@mui/icons-material/Remove";
import { RankTrend } from "@/types/league";

interface RankTrendIndicatorProps {
  trend: RankTrend;
  delta: number;
  size?: "small" | "medium";
}

export default function RankTrendIndicator({
  trend,
  delta,
  size = "small",
}: RankTrendIndicatorProps) {
  if (trend === "new") return null;

  const iconSize = size === "small" ? 16 : 20;
  const fontSize = size === "small" ? "0.7rem" : "0.8rem";

  const config = {
    up: {
      icon: <ArrowUpwardIcon sx={{ fontSize: iconSize }} />,
      color: "#2e7d32",
      label: `Up ${Math.abs(delta)} spot${Math.abs(delta) !== 1 ? "s" : ""}`,
    },
    down: {
      icon: <ArrowDownwardIcon sx={{ fontSize: iconSize }} />,
      color: "#d32f2f",
      label: `Down ${Math.abs(delta)} spot${Math.abs(delta) !== 1 ? "s" : ""}`,
    },
    same: {
      icon: <RemoveIcon sx={{ fontSize: iconSize }} />,
      color: "#9e9e9e",
      label: "No change",
    },
  }[trend];

  return (
    <Tooltip title={config.label} arrow>
      <Box
        aria-label={config.label}
        sx={{
          display: "inline-flex",
          alignItems: "center",
          gap: 0.25,
          color: config.color,
          ml: 0.5,
        }}
      >
        {config.icon}
        {trend !== "same" && Math.abs(delta) > 0 && (
          <Typography
            component="span"
            sx={{ fontSize, fontWeight: 700, lineHeight: 1, color: config.color }}
          >
            {Math.abs(delta)}
          </Typography>
        )}
      </Box>
    </Tooltip>
  );
}
