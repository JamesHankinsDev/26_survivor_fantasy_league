"use client";

import { useMemo, useRef, useState } from "react";
import {
  Box,
  Button,
  Menu,
  MenuItem,
  ListItemText,
  ListItemIcon,
  Typography,
} from "@mui/material";
import HistoryIcon from "@mui/icons-material/History";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import CompareArrowsIcon from "@mui/icons-material/CompareArrows";
import type { League } from "@/types/league";
import { useSeasonsWithOverrides } from "@/hooks/useSeasonsWithOverrides";
import { useS51RuleProposal } from "@/hooks/useS51RuleProposal";
import { getSeasonLabel } from "@/data/seasons";
import { listPastSeasons, type PastSeasonEntry } from "@/utils/pastSeasons";
import PastSeasonRecapModal from "./PastSeasonRecapModal";
import StandingsTableModal from "./StandingsTableModal";
import SeasonRuleProposalModal from "@/components/SeasonRuleProposalModal";

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
 *  - **Rule Proposals** — re-opens the active rule-proposal modal (S51
 *    pitch) with voting controls. Hidden once the proposal becomes
 *    irrelevant (S51 launches or is otherwise marked past).
 *
 * Renders nothing when the user has no past-season history *and* no relevant
 * proposal — the toolbar should never be an empty hover target.
 */
export default function PriorSeasonTools({ leagues }: PriorSeasonToolsProps) {
  const { seasons } = useSeasonsWithOverrides();
  const pastEntries = useMemo(
    () => listPastSeasons(leagues, seasons),
    [leagues, seasons],
  );

  // Use the user's most-recent past league as the proposal's source league.
  // The proposal modal needs *a* league to backtest against.
  const proposalLeague = useMemo(() => {
    if (pastEntries.length > 0) {
      const first = pastEntries[0];
      return leagues.find((l) => l.id === first.leagueId) ?? leagues[0] ?? null;
    }
    return leagues[0] ?? null;
  }, [pastEntries, leagues]);

  const proposalHook = useS51RuleProposal(proposalLeague);

  // Menu anchors
  const recapAnchorRef = useRef<HTMLButtonElement | null>(null);
  const standingsAnchorRef = useRef<HTMLButtonElement | null>(null);
  const [recapMenuOpen, setRecapMenuOpen] = useState(false);
  const [standingsMenuOpen, setStandingsMenuOpen] = useState(false);

  // Open-modal targets (null = closed)
  const [openRecap, setOpenRecap] = useState<PastSeasonEntry | null>(null);
  const [openStandings, setOpenStandings] = useState<PastSeasonEntry | null>(
    null,
  );
  const [proposalOpen, setProposalOpen] = useState(false);

  // Resolve the league object for the selected recap entry so the recap
  // modal has a `League` to render its chrome around (name, etc.).
  const recapLeague = openRecap
    ? leagues.find((l) => l.id === openRecap.leagueId) ?? null
    : null;

  const hasHistory = pastEntries.length > 0;
  // Show the proposal button whenever the proposal is relevant for this league
  // (S51 is still Upcoming) — even if hasContent is false. The modal itself
  // shows a graceful "Not enough roster data to back-test this league" message
  // when the backtest can't compute (e.g. seasons/{n}/castaways has no
  // weeklyEvents populated), so users still get to read the rule comparison.
  const hasProposal = proposalHook.proposalRelevant && proposalLeague != null;

  if (!hasHistory && !hasProposal) return null;

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
              ref={recapAnchorRef}
              variant="outlined"
              size="small"
              startIcon={<HistoryIcon />}
              onClick={() => setRecapMenuOpen(true)}
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
              anchorEl={recapAnchorRef.current}
              open={recapMenuOpen}
              onClose={() => setRecapMenuOpen(false)}
            >
              {pastEntries.map((entry) => (
                <MenuItem
                  key={`recap-${entry.leagueId}-${entry.seasonNumber}`}
                  onClick={() => {
                    setRecapMenuOpen(false);
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
              ref={standingsAnchorRef}
              variant="outlined"
              size="small"
              startIcon={<EmojiEventsIcon />}
              onClick={() => setStandingsMenuOpen(true)}
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
              anchorEl={standingsAnchorRef.current}
              open={standingsMenuOpen}
              onClose={() => setStandingsMenuOpen(false)}
            >
              {pastEntries.map((entry) => (
                <MenuItem
                  key={`standings-${entry.leagueId}-${entry.seasonNumber}`}
                  onClick={() => {
                    setStandingsMenuOpen(false);
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

        {hasProposal && (
          <Button
            variant="outlined"
            size="small"
            startIcon={<CompareArrowsIcon />}
            onClick={() => setProposalOpen(true)}
            sx={{
              borderColor: "var(--flame)",
              color: "var(--flame-deep)",
              textTransform: "none",
              "&:hover": {
                borderColor: "var(--flame-deep)",
                bgcolor: "color-mix(in oklch, var(--flame) 6%, transparent)",
              },
            }}
          >
            Rule Proposals
          </Button>
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
      {proposalOpen && proposalHook.proposalRelevant && proposalLeague && (
        <SeasonRuleProposalModal
          open
          league={proposalLeague}
          backtest={proposalHook.backtest}
          sourceSeasonNumber={
            proposalHook.sourceSeasonNumber ?? proposalLeague.seasonNumber
          }
          targetSeasonNumber={proposalHook.targetSeasonNumber}
          onClose={() => setProposalOpen(false)}
        />
      )}

      {/* Sub-toolbar helper text when there's nothing in history yet but the
          rule proposal is the only thing to surface. */}
      {!hasHistory && hasProposal && (
        <Typography
          variant="caption"
          sx={{ color: "text.secondary", display: "none" }}
        >
          {/* Reserved for future copy. */}
        </Typography>
      )}
    </>
  );
}
