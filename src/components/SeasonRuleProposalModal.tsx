"use client";

import { Fragment, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Collapse,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import RemoveIcon from "@mui/icons-material/Remove";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import ThumbUpAltIcon from "@mui/icons-material/ThumbUpAlt";
import ThumbDownAltIcon from "@mui/icons-material/ThumbDownAlt";
import ThumbUpOffAltIcon from "@mui/icons-material/ThumbUpOffAlt";
import ThumbDownOffAltIcon from "@mui/icons-material/ThumbDownOffAlt";
import HowToVoteIcon from "@mui/icons-material/HowToVote";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import { League, ScoringEventType } from "@/types/league";
import { BacktestSummary, BacktestTeam, BacktestWeekImpact } from "@/lib/backtest";
import { getEventLabel } from "@/utils/eventScoringConfig";
import { SEASON_RULES, SEASON_SCORING } from "@/utils/seasonScoringConfig";
import { useProposalVote } from "@/hooks/useProposalVote";

interface SeasonRuleProposalModalProps {
  open: boolean;
  league: League | null;
  backtest: BacktestSummary | null;
  sourceSeasonNumber: number;
  targetSeasonNumber: number;
  /** Slug used for vote/outcome persistence on the league doc. */
  proposalSlug?: string;
  onClose: () => void;
}

interface RuleRow {
  eventType: ScoringEventType;
  sourcePts: number;
  targetPts: number;
  note: string;
}

const noteFor = (delta: number, was: number, now: number): string => {
  if (was === 0 && now !== 0) return "NEW";
  if (was !== 0 && now === 0) return "Removed";
  if (delta > 0) return "Increased";
  if (delta < 0) return "Decreased";
  return "Unchanged";
};

export default function SeasonRuleProposalModal({
  open,
  league,
  backtest,
  sourceSeasonNumber,
  targetSeasonNumber,
  proposalSlug = "s51_rules",
  onClose,
}: SeasonRuleProposalModalProps) {
  const vote = useProposalVote(league, proposalSlug);
  const ruleRows: RuleRow[] = useMemo(() => {
    const source = SEASON_SCORING[sourceSeasonNumber] ?? SEASON_SCORING[50];
    const target = SEASON_SCORING[targetSeasonNumber] ?? SEASON_SCORING[51];
    const allEventTypes = Object.keys(target) as ScoringEventType[];

    return allEventTypes.map((eventType) => {
      const sourcePts = source[eventType] ?? 0;
      const targetPts = target[eventType] ?? 0;
      const delta = targetPts - sourcePts;
      return {
        eventType,
        sourcePts,
        targetPts,
        note: noteFor(delta, sourcePts, targetPts),
      };
    });
  }, [sourceSeasonNumber, targetSeasonNumber]);

  const targetExtras = SEASON_RULES[targetSeasonNumber] ?? {};
  const hasFloorChange = typeof targetExtras.weeklyScoreFloor === "number";

  // Split the rule table into "changed" vs "unchanged" — most of the value is
  // in the changed rows; unchanged rows can be folded.
  const changedRules = ruleRows.filter((r) => r.note !== "Unchanged");
  const unchangedRules = ruleRows.filter((r) => r.note === "Unchanged");

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      aria-labelledby="s51-proposal-title"
      PaperProps={{ sx: { borderRadius: 3 } }}
    >
      <DialogTitle
        id="s51-proposal-title"
        sx={{
          fontWeight: 800,
          pr: 6,
          background: "linear-gradient(135deg, rgba(232, 93, 42, 0.10), rgba(92, 107, 192, 0.10))",
        }}
      >
        Survivor 51 Rule Proposal
        <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 400, mt: 0.5 }}>
          Pitched changes to the scoring system + a back-test of how Season{" "}
          {sourceSeasonNumber} would have played out under the new rules.
        </Typography>
        <IconButton
          aria-label="Close"
          onClick={onClose}
          sx={{ position: "absolute", right: 12, top: 12 }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ p: { xs: 2, sm: 3 } }}>
        {/* ============ Section 1: Rule comparison ============ */}
        <Typography variant="h6" sx={{ fontWeight: 800, mb: 1.5 }}>
          What's Changing
        </Typography>
        <Typography variant="body2" sx={{ color: "text.secondary", mb: 2 }}>
          Goal: keep things competitive deeper into the season — softer
          penalties for vote-outs, bigger rewards for picking the winner, and
          a separate, smaller reward for non-idol advantages.
        </Typography>

        <TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ "& th": { fontWeight: 700 } }}>
                <TableCell>Event</TableCell>
                <TableCell align="center">S{sourceSeasonNumber}</TableCell>
                <TableCell align="center">S{targetSeasonNumber}</TableCell>
                <TableCell align="right">Change</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {changedRules.map((r) => (
                <TableRow key={r.eventType}>
                  <TableCell sx={{ fontWeight: 600 }}>
                    {getEventLabel(r.eventType)}
                  </TableCell>
                  <TableCell align="center">
                    <PointsCell value={r.sourcePts} muted={r.note === "NEW"} />
                  </TableCell>
                  <TableCell align="center">
                    <PointsCell value={r.targetPts} muted={r.note === "Removed"} />
                  </TableCell>
                  <TableCell align="right">
                    <NoteChip note={r.note} />
                  </TableCell>
                </TableRow>
              ))}

              {hasFloorChange && (
                <TableRow sx={{ bgcolor: "rgba(46, 158, 78, 0.04)" }}>
                  <TableCell sx={{ fontWeight: 600 }}>
                    Weekly Score Floor
                    <Typography variant="caption" sx={{ display: "block", color: "text.secondary" }}>
                      Your team can't go negative in a single week.
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Typography variant="body2" sx={{ color: "text.secondary" }}>—</Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                      {targetExtras.weeklyScoreFloor} min
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <NoteChip note="NEW" />
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {unchangedRules.length > 0 && (
          <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mb: 3 }}>
            Unchanged: {unchangedRules.map((r) => getEventLabel(r.eventType)).join(" · ")}
          </Typography>
        )}

        {/* ============ Section 2: Roster Management ============ */}
        <Typography variant="h6" sx={{ fontWeight: 800, mb: 1.5 }}>
          Roster Management
        </Typography>
        <Typography variant="body2" sx={{ color: "text.secondary", mb: 2 }}>
          More moves on the front half of the season, then fewer once we hit
          the merge — keeps the early game flexible without making the late
          game a swap-fest.
        </Typography>

        <TableContainer component={Paper} variant="outlined" sx={{ mb: 3 }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ "& th": { fontWeight: 700 } }}>
                <TableCell>Rule</TableCell>
                <TableCell align="center">S{sourceSeasonNumber}</TableCell>
                <TableCell align="center">S{targetSeasonNumber}</TableCell>
                <TableCell align="right">Note</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>Pre-merge swaps per week</TableCell>
                <TableCell align="center">1</TableCell>
                <TableCell align="center"><strong>2</strong></TableCell>
                <TableCell align="right"><NoteChip note="Increased" /></TableCell>
              </TableRow>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>Post-merge swaps per week</TableCell>
                <TableCell align="center">1</TableCell>
                <TableCell align="center">1</TableCell>
                <TableCell align="right"><NoteChip note="Unchanged" /></TableCell>
              </TableRow>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>
                  Drop voted-out castaways
                  <Typography variant="caption" sx={{ display: "block", color: "text.secondary" }}>
                    Free up a slot when one of yours gets snuffed.
                  </Typography>
                </TableCell>
                <TableCell align="center">Never</TableCell>
                <TableCell align="center"><strong>Pre-merge only</strong></TableCell>
                <TableCell align="right"><NoteChip note="NEW" /></TableCell>
              </TableRow>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>
                  Post-merge dead weight
                  <Typography variant="caption" sx={{ display: "block", color: "text.secondary" }}>
                    Voted-out castaways stick on your roster after the merge.
                  </Typography>
                </TableCell>
                <TableCell align="center">—</TableCell>
                <TableCell align="center">Yes</TableCell>
                <TableCell align="right"><NoteChip note="NEW" /></TableCell>
              </TableRow>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>Roster exclusivity</TableCell>
                <TableCell align="center">None</TableCell>
                <TableCell align="center">None</TableCell>
                <TableCell align="right"><NoteChip note="Unchanged" /></TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>

        {/* ============ Section 3: Backtest ============ */}
        <Typography variant="h6" sx={{ fontWeight: 800, mb: 1.5 }}>
          What This Would Have Looked Like
        </Typography>
        {league && (
          <Typography variant="body2" sx={{ color: "text.secondary", mb: 2 }}>
            <strong>{league.name}</strong> re-scored using the proposed S
            {targetSeasonNumber} rules. Same picks, same weekly rosters, same
            episode events — only the scoring config differs.
          </Typography>
        )}

        {!backtest || backtest.teams.length === 0 ? (
          <Alert severity="info">
            Not enough roster data to back-test this league. The pitch comparison
            above still applies.
          </Alert>
        ) : (
          <>
            {/* Summary stat row */}
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={1.5}
              sx={{ mb: 2 }}
            >
              <SummaryStat
                label={`Avg S${sourceSeasonNumber}`}
                value={backtest.averageSource.toFixed(1)}
              />
              <SummaryStat
                label={`Avg S${targetSeasonNumber}`}
                value={backtest.averageTarget.toFixed(1)}
              />
              <SummaryStat
                label="Change"
                value={`${backtest.averageChange >= 0 ? "+" : ""}${backtest.averageChange.toFixed(1)}`}
                accent={backtest.averageChange > 0 ? "#2E9E4E" : backtest.averageChange < 0 ? "#D23A3A" : undefined}
              />
            </Stack>

            <BacktestStandingsTable
              teams={backtest.teams}
              sourceSeasonNumber={sourceSeasonNumber}
              targetSeasonNumber={targetSeasonNumber}
            />

            {/* Callouts */}
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
              {backtest.biggestWinner && backtest.biggestWinner.difference > 0 && (
                <CalloutCard
                  title="Biggest Winner"
                  body={`${backtest.biggestWinner.teamName} (+${backtest.biggestWinner.difference} pts)`}
                  accent="#2E9E4E"
                  icon={<TrendingUpIcon />}
                />
              )}
              {backtest.biggestLoser && backtest.biggestLoser.difference < 0 && (
                <CalloutCard
                  title="Biggest Drop"
                  body={`${backtest.biggestLoser.teamName} (${backtest.biggestLoser.difference} pts)`}
                  accent="#D23A3A"
                  icon={<TrendingDownIcon />}
                />
              )}
            </Stack>

            {backtest.rankShifts.length === 0 && (
              <Alert severity="success" sx={{ mt: 2 }}>
                <strong>No rank changes.</strong> Final standings would have been
                identical under the proposed rules — just tighter spreads.
              </Alert>
            )}
          </>
        )}

        {/* ============ Section 4: Vote ============ */}
        <Typography variant="h6" sx={{ fontWeight: 800, mt: 4, mb: 1.5 }}>
          Cast Your Vote
        </Typography>
        <VoteSection vote={vote} />

        <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 3 }}>
          <Button
            variant="outlined"
            onClick={onClose}
            sx={{
              textTransform: "none",
              fontWeight: 700,
              px: 4,
            }}
          >
            Close
          </Button>
        </Box>
      </DialogContent>
    </Dialog>
  );
}

const VoteSection = ({ vote }: { vote: ReturnType<typeof useProposalVote> }) => {
  const { tally, myVote, isOwner, allVoted, outcome, isLocked, isSubmitting } = vote;

  const yayPct = tally.total === 0 ? 0 : (tally.yay / tally.total) * 100;
  const nayPct = tally.total === 0 ? 0 : (tally.nay / tally.total) * 100;

  return (
    <Paper variant="outlined" sx={{ p: { xs: 2, sm: 2.5 }, borderRadius: 2 }}>
      {/* Tally bar */}
      <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 1 }}>
        <HowToVoteIcon sx={{ color: "#E85D2A" }} />
        <Typography variant="subtitle2" sx={{ fontWeight: 700, flex: 1 }}>
          {tally.yay} Yay · {tally.nay} Nay · {tally.notVoted} Not yet voted
        </Typography>
        <Typography variant="caption" sx={{ color: "text.secondary" }}>
          {tally.total} {tally.total === 1 ? "member" : "members"}
        </Typography>
      </Stack>

      {/* Stacked progress bar: yay (green) | nay (red) | remaining gray */}
      <Box
        sx={{
          display: "flex",
          height: 10,
          borderRadius: 5,
          overflow: "hidden",
          bgcolor: "rgba(0,0,0,0.08)",
          mb: 2,
        }}
      >
        <Box sx={{ width: `${yayPct}%`, bgcolor: "#2E9E4E", transition: "width 300ms" }} />
        <Box sx={{ width: `${nayPct}%`, bgcolor: "#D23A3A", transition: "width 300ms" }} />
      </Box>

      {/* Outcome banner */}
      {outcome && (
        <Alert
          severity={outcome.outcome === "adopted" ? "success" : "warning"}
          icon={outcome.outcome === "adopted" ? <CheckCircleIcon /> : <CancelIcon />}
          sx={{ mb: 2 }}
          action={
            isOwner ? (
              <Button color="inherit" size="small" onClick={vote.reopenVoting} disabled={isSubmitting}>
                Reopen Voting
              </Button>
            ) : undefined
          }
        >
          <strong>
            Rule change {outcome.outcome === "adopted" ? "ADOPTED" : "REJECTED"}.
          </strong>{" "}
          {outcome.outcome === "adopted"
            ? "These rules will be in effect when Season 51 launches."
            : "Season 51 will keep the existing rules."}
        </Alert>
      )}

      {/* Voting controls — hidden once locked */}
      {!isLocked && (
        <>
          <Typography variant="body2" sx={{ color: "text.secondary", mb: 1.5 }}>
            One vote per player. Change your vote any time before the league owner
            decides.
          </Typography>
          <Stack direction="row" spacing={1.5}>
            <Button
              variant={myVote === "yay" ? "contained" : "outlined"}
              startIcon={myVote === "yay" ? <ThumbUpAltIcon /> : <ThumbUpOffAltIcon />}
              onClick={() => vote.submitVote("yay")}
              disabled={isSubmitting}
              sx={{
                flex: 1,
                textTransform: "none",
                fontWeight: 700,
                ...(myVote === "yay"
                  ? { bgcolor: "#2E9E4E", "&:hover": { bgcolor: "#247A3B" } }
                  : {
                      borderColor: "#2E9E4E",
                      color: "#2E9E4E",
                      "&:hover": { borderColor: "#247A3B", bgcolor: "rgba(46,158,78,0.06)" },
                    }),
              }}
            >
              {myVote === "yay" ? "Voted Yay" : "Vote Yay"}
            </Button>
            <Button
              variant={myVote === "nay" ? "contained" : "outlined"}
              startIcon={myVote === "nay" ? <ThumbDownAltIcon /> : <ThumbDownOffAltIcon />}
              onClick={() => vote.submitVote("nay")}
              disabled={isSubmitting}
              sx={{
                flex: 1,
                textTransform: "none",
                fontWeight: 700,
                ...(myVote === "nay"
                  ? { bgcolor: "#D23A3A", "&:hover": { bgcolor: "#A52B2B" } }
                  : {
                      borderColor: "#D23A3A",
                      color: "#D23A3A",
                      "&:hover": { borderColor: "#A52B2B", bgcolor: "rgba(210,58,58,0.06)" },
                    }),
              }}
            >
              {myVote === "nay" ? "Voted Nay" : "Vote Nay"}
            </Button>
          </Stack>
        </>
      )}

      {/* Owner-only decision panel — only shown once everyone has voted */}
      {!isLocked && allVoted && isOwner && (
        <Box
          sx={{
            mt: 2.5,
            pt: 2.5,
            borderTop: "1px dashed",
            borderColor: "divider",
          }}
        >
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
            Everyone's voted. Time to decide.
          </Typography>
          <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mb: 1.5 }}>
            As league owner you cast the final call. This locks voting and
            announces the outcome to every member.
          </Typography>
          <Stack direction="row" spacing={1.5}>
            <Button
              variant="contained"
              color="success"
              startIcon={<CheckCircleIcon />}
              onClick={() => vote.submitOutcome("adopted")}
              disabled={isSubmitting}
              sx={{ flex: 1, textTransform: "none", fontWeight: 700 }}
            >
              Adopt Rule Change
            </Button>
            <Button
              variant="outlined"
              color="error"
              startIcon={<CancelIcon />}
              onClick={() => vote.submitOutcome("rejected")}
              disabled={isSubmitting}
              sx={{ flex: 1, textTransform: "none", fontWeight: 700 }}
            >
              Reject Change
            </Button>
          </Stack>
        </Box>
      )}

      {/* Waiting messages */}
      {!isLocked && allVoted && !isOwner && (
        <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mt: 2 }}>
          Everyone has voted. Waiting on the league owner to make the call.
        </Typography>
      )}
    </Paper>
  );
};

const BacktestStandingsTable = ({
  teams,
  sourceSeasonNumber,
  targetSeasonNumber,
}: {
  teams: BacktestTeam[];
  sourceSeasonNumber: number;
  targetSeasonNumber: number;
}) => {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggle = (userId: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });

  return (
    <TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
      <Table size="small">
        <TableHead>
          <TableRow sx={{ "& th": { fontWeight: 700 } }}>
            <TableCell sx={{ width: 32, p: 0 }} />
            <TableCell>Team</TableCell>
            <TableCell align="right">S{sourceSeasonNumber}</TableCell>
            <TableCell align="right">S{targetSeasonNumber}</TableCell>
            <TableCell align="right">Δ</TableCell>
            <TableCell align="center">Rank</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {teams.map((t) => {
            const isOpen = expanded.has(t.userId);
            const hasWeekly = t.weekly.length > 0;
            return (
              <BacktestTeamRows
                key={t.userId}
                team={t}
                isOpen={isOpen}
                hasWeekly={hasWeekly}
                onToggle={() => toggle(t.userId)}
                sourceSeasonNumber={sourceSeasonNumber}
                targetSeasonNumber={targetSeasonNumber}
              />
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

const BacktestTeamRows = ({
  team,
  isOpen,
  hasWeekly,
  onToggle,
  sourceSeasonNumber,
  targetSeasonNumber,
}: {
  team: BacktestTeam;
  isOpen: boolean;
  hasWeekly: boolean;
  onToggle: () => void;
  sourceSeasonNumber: number;
  targetSeasonNumber: number;
}) => {
  return (
    <>
      <TableRow
        sx={{
          "& > *": { borderBottom: isOpen ? "none" : undefined },
          cursor: hasWeekly ? "pointer" : "default",
        }}
        onClick={hasWeekly ? onToggle : undefined}
      >
        <TableCell sx={{ p: 0, width: 32 }}>
          {hasWeekly && (
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                onToggle();
              }}
              aria-label={isOpen ? "Collapse weekly detail" : "Expand weekly detail"}
            >
              {isOpen ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
            </IconButton>
          )}
        </TableCell>
        <TableCell sx={{ fontWeight: 600 }}>{team.teamName}</TableCell>
        <TableCell align="right">{team.sourceTotal}</TableCell>
        <TableCell align="right">{team.targetTotal}</TableCell>
        <TableCell
          align="right"
          sx={{
            fontWeight: 700,
            color:
              team.difference > 0
                ? "#2E9E4E"
                : team.difference < 0
                  ? "#D23A3A"
                  : "text.secondary",
          }}
        >
          {team.difference > 0 ? "+" : ""}
          {team.difference}
        </TableCell>
        <TableCell align="center">
          <RankShiftCell from={team.sourceRank} to={team.targetRank} delta={team.rankChange} />
        </TableCell>
      </TableRow>

      <TableRow>
        <TableCell sx={{ p: 0, borderBottom: isOpen ? undefined : "none" }} colSpan={6}>
          <Collapse in={isOpen} unmountOnExit>
            <Box
              sx={{
                px: { xs: 2, sm: 3 },
                py: 1.5,
                bgcolor: "rgba(0,0,0,0.02)",
              }}
            >
              <Typography
                variant="caption"
                sx={{
                  letterSpacing: 1.2,
                  color: "text.secondary",
                  fontWeight: 700,
                  display: "block",
                  mb: 1,
                }}
              >
                WEEK-BY-WEEK
              </Typography>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ "& th": { fontWeight: 700, fontSize: "0.75rem" } }}>
                    <TableCell sx={{ pl: 0 }}>Week</TableCell>
                    <TableCell align="right">S{sourceSeasonNumber}</TableCell>
                    <TableCell align="right">S{targetSeasonNumber}</TableCell>
                    <TableCell align="right" sx={{ pr: 0 }}>Δ</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {team.weekly.map((w) => {
                    const hasBreakdown =
                      w.impacts.length > 0 || w.floorImpact !== 0;
                    return (
                      <Fragment key={w.week}>
                        <TableRow
                          sx={
                            hasBreakdown
                              ? { "& td": { borderBottom: "none", pb: 0.5 } }
                              : undefined
                          }
                        >
                          <TableCell sx={{ pl: 0, fontWeight: 600 }}>
                            Week {w.week}
                          </TableCell>
                          <TableCell align="right">{w.sourceScore}</TableCell>
                          <TableCell align="right">{w.targetScore}</TableCell>
                          <TableCell
                            align="right"
                            sx={{
                              pr: 0,
                              fontWeight: 700,
                              color:
                                w.difference > 0
                                  ? "#2E9E4E"
                                  : w.difference < 0
                                    ? "#D23A3A"
                                    : "text.secondary",
                            }}
                          >
                            {w.difference > 0 ? "+" : ""}
                            {w.difference}
                          </TableCell>
                        </TableRow>
                        {hasBreakdown && (
                          <TableRow>
                            <TableCell colSpan={4} sx={{ pl: 0, pt: 0, pb: 1 }}>
                              <Stack
                                direction="row"
                                spacing={0.75}
                                flexWrap="wrap"
                                useFlexGap
                              >
                                {w.impacts.map((imp) => (
                                  <ImpactChip key={imp.eventType} impact={imp} />
                                ))}
                                {w.floorImpact !== 0 && (
                                  <FloorImpactChip floorImpact={w.floorImpact} />
                                )}
                              </Stack>
                            </TableCell>
                          </TableRow>
                        )}
                      </Fragment>
                    );
                  })}
                </TableBody>
              </Table>
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
};

const ImpactChip = ({ impact }: { impact: BacktestWeekImpact }) => {
  const positive = impact.impact > 0;
  const color = positive ? "#2E9E4E" : "#D23A3A";
  const bg = positive ? "rgba(46, 158, 78, 0.12)" : "rgba(210, 58, 58, 0.12)";
  return (
    <Box
      sx={{
        display: "inline-flex",
        alignItems: "center",
        gap: 0.5,
        bgcolor: bg,
        color,
        borderRadius: 1,
        px: 0.9,
        py: 0.3,
        fontSize: "0.72rem",
        fontWeight: 700,
      }}
    >
      <Box component="span" sx={{ color: "text.primary", fontWeight: 600 }}>
        {getEventLabel(impact.eventType)}
      </Box>
      <Box component="span" sx={{ color: "text.secondary", fontWeight: 500 }}>
        ×{impact.eventCount}
      </Box>
      <Box component="span">
        {impact.impact > 0 ? "+" : ""}
        {impact.impact}
      </Box>
    </Box>
  );
};

const FloorImpactChip = ({ floorImpact }: { floorImpact: number }) => (
  <Box
    sx={{
      display: "inline-flex",
      alignItems: "center",
      gap: 0.5,
      bgcolor: "rgba(47, 123, 200, 0.12)",
      color: "#2F7BC8",
      borderRadius: 1,
      px: 0.9,
      py: 0.3,
      fontSize: "0.72rem",
      fontWeight: 700,
    }}
  >
    <Box component="span" sx={{ color: "text.primary", fontWeight: 600 }}>
      Weekly Floor
    </Box>
    <Box component="span">
      {floorImpact > 0 ? "+" : ""}
      {floorImpact}
    </Box>
  </Box>
);

const PointsCell = ({ value, muted }: { value: number; muted: boolean }) => (
  <Typography
    variant="body2"
    sx={{
      fontWeight: 700,
      color: muted ? "text.disabled" : value < 0 ? "#D23A3A" : "text.primary",
    }}
  >
    {muted && value === 0 ? "—" : value > 0 ? `+${value}` : value}
  </Typography>
);

const NoteChip = ({ note }: { note: string }) => {
  const color =
    note === "NEW"
      ? { bg: "rgba(46, 158, 78, 0.16)", fg: "#2E9E4E" }
      : note === "Removed"
        ? { bg: "rgba(210, 58, 58, 0.16)", fg: "#D23A3A" }
        : note === "Increased"
          ? { bg: "rgba(47, 123, 200, 0.16)", fg: "#2F7BC8" }
          : note === "Decreased"
            ? { bg: "rgba(200, 135, 27, 0.16)", fg: "#C8871B" }
            : { bg: "rgba(0,0,0,0.06)", fg: "text.secondary" };

  return (
    <Chip
      label={note}
      size="small"
      sx={{ bgcolor: color.bg, color: color.fg as string, fontWeight: 700, fontSize: "0.7rem" }}
    />
  );
};

const SummaryStat = ({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: string;
}) => (
  <Paper
    variant="outlined"
    sx={{ flex: 1, p: 1.5, borderRadius: 2, textAlign: "center" }}
  >
    <Typography variant="caption" sx={{ color: "text.secondary", letterSpacing: 1 }}>
      {label.toUpperCase()}
    </Typography>
    <Typography
      variant="h5"
      sx={{ fontWeight: 800, color: accent ?? "text.primary", lineHeight: 1.2 }}
    >
      {value}
    </Typography>
  </Paper>
);

const RankShiftCell = ({
  from,
  to,
  delta,
}: {
  from: number;
  to: number;
  delta: number;
}) => {
  if (delta === 0)
    return (
      <Chip
        icon={<RemoveIcon sx={{ fontSize: 14 }} />}
        label={`#${from}`}
        size="small"
        variant="outlined"
        sx={{ fontWeight: 700 }}
      />
    );
  const climbed = delta > 0;
  return (
    <Chip
      icon={
        climbed ? (
          <TrendingUpIcon sx={{ fontSize: 14 }} />
        ) : (
          <TrendingDownIcon sx={{ fontSize: 14 }} />
        )
      }
      label={`#${from} → #${to}`}
      size="small"
      sx={{
        bgcolor: climbed ? "rgba(46, 158, 78, 0.16)" : "rgba(210, 58, 58, 0.16)",
        color: climbed ? "#2E9E4E" : "#D23A3A",
        fontWeight: 700,
      }}
    />
  );
};

const CalloutCard = ({
  title,
  body,
  accent,
  icon,
}: {
  title: string;
  body: string;
  accent: string;
  icon: React.ReactNode;
}) => (
  <Paper
    variant="outlined"
    sx={{ flex: 1, p: 1.5, borderRadius: 2, borderColor: accent, borderLeftWidth: 4 }}
  >
    <Stack direction="row" spacing={1.5} alignItems="center">
      <Box sx={{ color: accent, display: "flex" }}>{icon}</Box>
      <Box>
        <Typography variant="caption" sx={{ color: "text.secondary", display: "block" }}>
          {title}
        </Typography>
        <Typography sx={{ fontWeight: 700 }}>{body}</Typography>
      </Box>
    </Stack>
  </Paper>
);
