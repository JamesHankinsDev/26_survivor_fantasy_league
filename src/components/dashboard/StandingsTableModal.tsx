"use client";

import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Avatar,
} from "@mui/material";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import type { TribeMember } from "@/types/league";
import { assignRanks } from "@/types/league";
import { getSeasonLabel } from "@/data/seasons";

interface StandingsTableModalProps {
  open: boolean;
  leagueName: string;
  seasonNumber: number;
  memberDetails: TribeMember[];
  onClose: () => void;
}

const MEDAL: Record<number, string> = {
  1: "🥇",
  2: "🥈",
  3: "🥉",
};

/**
 * Lightweight read-only final-standings table for a past season. Mirrors the
 * data SeasonRecapModal animates through, but as a static table — useful when
 * you want the numbers without the full recap experience.
 */
export default function StandingsTableModal({
  open,
  leagueName,
  seasonNumber,
  memberDetails,
  onClose,
}: StandingsTableModalProps) {
  const ranked = assignRanks(memberDetails);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      aria-labelledby="standings-table-title"
    >
      <DialogTitle
        id="standings-table-title"
        sx={{ display: "flex", alignItems: "center", gap: 1 }}
      >
        <EmojiEventsIcon sx={{ color: "var(--flame)" }} />
        Final Standings
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2" sx={{ color: "text.secondary", mb: 2 }}>
          <strong>{leagueName}</strong> · {getSeasonLabel(seasonNumber)}
        </Typography>
        {ranked.length === 0 ? (
          <Box
            sx={{
              py: 4,
              textAlign: "center",
              color: "var(--ink-mute)",
              fontSize: 13,
            }}
          >
            No member data archived for this season.
          </Box>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ width: 50, fontWeight: 700 }}>Rank</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Tribe</TableCell>
                <TableCell sx={{ fontWeight: 700, textAlign: "right" }}>
                  Points
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {ranked.map((m) => (
                <TableRow key={m.userId}>
                  <TableCell
                    sx={{
                      fontFamily: "var(--font-mono-stack)",
                      fontWeight: 700,
                    }}
                  >
                    {MEDAL[m.rank] ?? `#${m.rank}`}
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
                      <Avatar
                        src={m.avatar}
                        alt=""
                        sx={{
                          width: 28,
                          height: 28,
                          border: `2px solid ${m.tribeColor}`,
                          bgcolor: m.tribeColor,
                          fontSize: 12,
                          fontWeight: 700,
                        }}
                      >
                        {(m.displayName?.[0] ?? "?").toUpperCase()}
                      </Avatar>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {m.displayName}
                        </Typography>
                        {m.ownerName && (
                          <Typography
                            variant="caption"
                            sx={{ color: "text.secondary" }}
                          >
                            {m.ownerName}
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell
                    sx={{
                      fontFamily: "var(--font-mono-stack)",
                      fontWeight: 700,
                      textAlign: "right",
                    }}
                  >
                    {m.totalPoints}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
