"use client";

import { useMemo, useState } from "react";
import {
  Box,
  Button,
  Menu,
  MenuItem,
  ListItemText,
  ListItemIcon,
} from "@mui/material";
import HistoryIcon from "@mui/icons-material/History";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import type { League } from "@/types/league";
import { useSeasonsWithOverrides } from "@/hooks/useSeasonsWithOverrides";
import { getSeasonLabel } from "@/data/seasons";
import { listPastSeasons, type PastSeasonEntry } from "@/utils/pastSeasons";
import PastSeasonRecapModal from "./PastSeasonRecapModal";
import StandingsTableModal from "./StandingsTableModal";

interface PriorSeasonToolsProps {
  leagues: League[];
}

/**
 * Top-right toolbar on the home page for replaying past-season content:
 *
 *  - **Recap** — re-opens the full animated SeasonRecapModal for any past
 *    season the user has played (drawn from `seasonArchive` snapshots OR a
 *    live league still pointed at a concluded season).
 *  - **Final Standings** — read-only standings table per past season for
 *    quick reference.
 *
 * Renders nothing when the user has no past-season history — the toolbar
 * should never be an empty hover target.
 */
export default function PriorSeasonTools({ leagues }: PriorSeasonToolsProps) {
  const { seasons } = useSeasonsWithOverrides();
  const pastEntries = useMemo(
    () => listPastSeasons(leagues, seasons),
    [leagues, seasons],
  );

  // Menu anchors
  // The anchor element lives in state, not a ref: MUI reads `anchorEl` during
  // render, and a ref's `.current` is not a render-safe value (null on the
  // render that opens the menu, so the popover anchors to the top-left corner).
  const [recapAnchorEl, setRecapAnchorEl] = useState<HTMLElement | null>(null);
  const [standingsAnchorEl, setStandingsAnchorEl] = useState<HTMLElement | null>(null);

  // Open-modal targets (null = closed)
  const [openRecap, setOpenRecap] = useState<PastSeasonEntry | null>(null);
  const [openStandings, setOpenStandings] = useState<PastSeasonEntry | null>(
    null,
  );

  // Resolve the league object for the selected recap entry so the recap
  // modal has a `League` to render its chrome around (name, etc.).
  const recapLeague = openRecap
    ? leagues.find((l) => l.id === openRecap.leagueId) ?? null
    : null;

  const hasHistory = pastEntries.length > 0;

  if (!hasHistory) return null;

  return (
    <>
      <Box
        sx={{
          display: "flex",
          flexWrap: "wrap",
          gap: 1,
          alignItems: "center",
          justifyContent: "flex-end",
        }}
        role="toolbar"
        aria-label="Prior-season tools"
      >
        {hasHistory && (
          <>
            <Button
              variant="outlined"
              size="small"
              startIcon={<HistoryIcon />}
              onClick={(e) => setRecapAnchorEl(e.currentTarget)}
              sx={{
                borderColor: "var(--line-strong)",
                color: "var(--ink)",
                textTransform: "none",
                "&:hover": {
                  borderColor: "var(--flame)",
                  bgcolor: "var(--bg-inset)",
                },
              }}
            >
              Recap
            </Button>
            <Menu
              anchorEl={recapAnchorEl}
              open={Boolean(recapAnchorEl)}
              onClose={() => setRecapAnchorEl(null)}
            >
              {pastEntries.map((entry) => (
                <MenuItem
                  key={`recap-${entry.leagueId}-${entry.seasonNumber}`}
                  onClick={() => {
                    setRecapAnchorEl(null);
                    setOpenRecap(entry);
                  }}
                >
                  <ListItemIcon>
                    <HistoryIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    primary={getSeasonLabel(entry.seasonNumber)}
                    secondary={entry.leagueName}
                  />
                </MenuItem>
              ))}
            </Menu>

            <Button
              variant="outlined"
              size="small"
              startIcon={<EmojiEventsIcon />}
              onClick={(e) => setStandingsAnchorEl(e.currentTarget)}
              sx={{
                borderColor: "var(--line-strong)",
                color: "var(--ink)",
                textTransform: "none",
                "&:hover": {
                  borderColor: "var(--flame)",
                  bgcolor: "var(--bg-inset)",
                },
              }}
            >
              Final Standings
            </Button>
            <Menu
              anchorEl={standingsAnchorEl}
              open={Boolean(standingsAnchorEl)}
              onClose={() => setStandingsAnchorEl(null)}
            >
              {pastEntries.map((entry) => (
                <MenuItem
                  key={`standings-${entry.leagueId}-${entry.seasonNumber}`}
                  onClick={() => {
                    setStandingsAnchorEl(null);
                    setOpenStandings(entry);
                  }}
                >
                  <ListItemIcon>
                    <EmojiEventsIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    primary={getSeasonLabel(entry.seasonNumber)}
                    secondary={entry.leagueName}
                  />
                </MenuItem>
              ))}
            </Menu>
          </>
        )}

      </Box>

      {/* Modals */}
      {openRecap && recapLeague && (
        <PastSeasonRecapModal
          open
          league={recapLeague}
          seasonNumber={openRecap.seasonNumber}
          memberDetails={openRecap.memberDetails}
          onClose={() => setOpenRecap(null)}
        />
      )}
      {openStandings && (
        <StandingsTableModal
          open
          leagueName={openStandings.leagueName}
          seasonNumber={openStandings.seasonNumber}
          memberDetails={openStandings.memberDetails}
          onClose={() => setOpenStandings(null)}
        />
      )}
    </>
  );
}
