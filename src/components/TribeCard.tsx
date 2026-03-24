"use client";

import {
  Card,
  CardContent,
  Box,
  Typography,
  Chip,
  Stack,
  Button,
  Avatar,
} from "@mui/material";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import { TribeMember } from "@/types/league";
import { Castaway } from "@/types/castaway";

interface TribeCardProps {
  member: TribeMember;
  rank: number;
  isTied?: boolean;
  isCurrentUser?: boolean;
  onEdit?: () => void;
  onAddDrop?: () => void;
  allMembers: TribeMember[];
  allCastaways?: Castaway[];
  eliminatedCastawayIds?: string[];
  castawayPoints?: Record<string, number>; // Points earned while on this team's roster
  castawaySeasonScores?: Record<string, number>; // Cumulative season scores per castaway
}

export default function TribeCard({
  member,
  rank,
  isTied = false,
  isCurrentUser,
  onEdit,
  onAddDrop,
  allMembers: _allMembers,
  allCastaways = [],
  eliminatedCastawayIds = [],
  castawayPoints = {},
}: TribeCardProps) {
  const getRankColor = (rankNum: number) => {
    if (rankNum === 1) return "#FFD700"; // Gold
    if (rankNum === 2) return "#C0C0C0"; // Silver
    if (rankNum === 3) return "#CD7F32"; // Bronze
    return "#20B2AA"; // Default aqua
  };

  const getRankLabel = (rankNum: number, tied: boolean = false) => {
    const suffix =
      rankNum % 10 === 1 && rankNum !== 11
        ? "st"
        : rankNum % 10 === 2 && rankNum !== 12
          ? "nd"
          : rankNum % 10 === 3 && rankNum !== 13
            ? "rd"
            : "th";
    return `${tied ? "T-" : ""}${rankNum}${suffix}`;
  };

  const getRankTitle = (rankNum: number, tied: boolean = false) => {
    return `${getRankLabel(rankNum, tied)} place`;
  };

  const roster = member.roster || [];

  return (
    <Card
      aria-label={`${member.displayName}'s tribe, ${getRankTitle(rank, isTied)}, ${member.totalPoints} points`}
      sx={{
        borderLeft: `6px solid ${member.tribeColor}`,
        boxShadow: isCurrentUser ? "0 0 0 3px rgba(232, 93, 42, 0.2)" : 1,
        position: "relative",
        transition: "transform 0.2s, box-shadow 0.2s",
        "&:hover": {
          transform: "translateY(-2px)",
          boxShadow: 2,
        },
      }}
    >
      <CardContent>
        <Stack spacing={2}>
          {/* Header with Avatar and Name */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Avatar
              src={member.avatar}
              alt={member.displayName}
              sx={{
                width: 64,
                height: 64,
                border: `3px solid ${member.tribeColor}`,
                bgcolor: member.tribeColor,
              }}
            />
            <Box sx={{ flex: 1 }}>
              <Stack
                direction="row"
                spacing={1}
                alignItems="center"
                sx={{ mb: 0.5 }}
              >
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  {member.displayName}
                </Typography>
                {rank <= 3 && (
                  <EmojiEventsIcon
                    aria-label={getRankTitle(rank, isTied)}
                    sx={{ color: getRankColor(rank), fontSize: "20px" }}
                  />
                )}
              </Stack>
              {isCurrentUser && (
                <Chip
                  label="Your Tribe"
                  size="small"
                  sx={{
                    bgcolor: "rgba(232, 93, 42, 0.1)",
                    color: "#E85D2A",
                    fontWeight: 600,
                  }}
                />
              )}
            </Box>
          </Box>

          {/* Rank and Points */}
          <Stack
            direction="row"
            spacing={2}
            sx={{
              p: 1.5,
              bgcolor: "rgba(32, 178, 170, 0.05)",
              borderRadius: 1,
            }}
          >
            <Box>
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                Rank
              </Typography>
              <Typography
                variant="h6"
                aria-label={getRankTitle(rank, isTied)}
                sx={{
                  color: getRankColor(rank),
                  fontWeight: 700,
                }}
              >
                {getRankLabel(rank, isTied)}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                Points
              </Typography>
              <Typography
                variant="h6"
                sx={{ fontWeight: 700, color: "#E85D2A" }}
              >
                {member.totalPoints}
              </Typography>
            </Box>
          </Stack>

          {/* Roster */}
          {roster.length > 0 && (
            <Box>
              <Typography
                variant="caption"
                sx={{
                  fontWeight: 600,
                  color: "text.secondary",
                  mb: 1,
                  display: "block",
                }}
              >
                Roster (
                {roster.filter((id) => !eliminatedCastawayIds.includes(id)).length})
              </Typography>
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: {
                    xs: "repeat(auto-fill, minmax(110px, 1fr))",
                    sm: "repeat(auto-fill, minmax(100px, 1fr))",
                  },
                  gap: { xs: 1.5, sm: 1 },
                }}
              >
                {roster.map((castawayId) => {
                  const castaway = allCastaways.find(
                    (c) => c.id === castawayId,
                  );
                  const isEliminated = eliminatedCastawayIds.includes(castawayId);
                  const statusColor = isEliminated ? "#999" : "#20B2AA";
                  const rosteredPts = castawayPoints[castawayId] || 0;
                  return (
                    <Box
                      key={castawayId}
                      sx={{
                        p: 1,
                        borderRadius: 1,
                        border: `1px solid ${statusColor}`,
                        bgcolor: `${statusColor}11`,
                        textAlign: "center",
                        opacity: isEliminated ? 0.5 : 1,
                        filter: isEliminated ? "grayscale(100%)" : "none",
                      }}
                    >
                      <Typography
                        variant="caption"
                        sx={{
                          fontWeight: 500,
                          fontSize: { xs: "0.8rem", sm: "0.75rem" },
                          display: "block",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {castaway?.name?.split(" ")[0] || "Unknown"}
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{
                          fontSize: { xs: "0.75rem", sm: "0.7rem" },
                          color: statusColor,
                          fontWeight: 600,
                          display: "block",
                        }}
                      >
                        {rosteredPts} pts
                      </Typography>
                      {isEliminated && (
                        <Typography
                          variant="caption"
                          sx={{
                            fontSize: { xs: "0.7rem", sm: "0.65rem" },
                            color: statusColor,
                            textTransform: "uppercase",
                          }}
                        >
                          eliminated
                        </Typography>
                      )}
                    </Box>
                  );
                })}
              </Box>
            </Box>
          )}

          {isCurrentUser && (onEdit || onAddDrop) && (
            <Stack direction="row" spacing={1}>
              {onEdit && (
                <Button
                  onClick={onEdit}
                  variant="outlined"
                  size="small"
                  fullWidth
                  sx={{
                    color: "#E85D2A",
                    borderColor: "#E85D2A",
                    minHeight: { xs: 44, sm: 36 },
                    py: { xs: 1.5, sm: 1 },
                    "&:hover": {
                      bgcolor: "rgba(232, 93, 42, 0.05)",
                      borderColor: "#D94E23",
                    },
                  }}
                >
                  Edit Tribe
                </Button>
              )}
              {onAddDrop && roster.length > 0 && (
                <Button
                  onClick={onAddDrop}
                  variant="outlined"
                  size="small"
                  fullWidth
                  sx={{
                    color: "#20B2AA",
                    borderColor: "#20B2AA",
                    minHeight: { xs: 44, sm: 36 },
                    py: { xs: 1.5, sm: 1 },
                    "&:hover": {
                      bgcolor: "rgba(32, 178, 170, 0.05)",
                      borderColor: "#1A8A7F",
                    },
                  }}
                >
                  Add/Drop
                </Button>
              )}
            </Stack>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}
