"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Avatar,
  Box,
  Button,
  Dialog,
  Fade,
  IconButton,
  Slide,
  Stack,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import SkipNextIcon from "@mui/icons-material/SkipNext";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import WhatshotIcon from "@mui/icons-material/Whatshot";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import { League } from "@/types/league";
import { SeasonRecap } from "@/utils/seasonRecap";
import { CURRENT_SEASON } from "@/data/seasons";

type Phase = "intro" | "podium" | "bigWeek" | "bigClimber" | "outro";

interface SeasonRecapModalProps {
  open: boolean;
  league: League;
  recap: SeasonRecap;
  onClose: () => void;
}

// Per-phase auto-advance delays (ms). Generous enough to read everything, snappy
// enough to keep momentum.
const PHASE_DURATIONS: Record<Phase, number> = {
  intro: 2400,
  podium: 6500,
  bigWeek: 5000,
  bigClimber: 5000,
  outro: 9999_000, // outro waits for user to close
};

const PODIUM_STYLES: Record<
  1 | 2 | 3,
  { color: string; bg: string; label: string; height: number }
> = {
  1: { color: "#FFD700", bg: "linear-gradient(180deg, #FFE082, #FFB300)", label: "1st", height: 180 },
  2: { color: "#C0C0C0", bg: "linear-gradient(180deg, #E0E0E0, #9E9E9E)", label: "2nd", height: 140 },
  3: { color: "#CD7F32", bg: "linear-gradient(180deg, #DDB077, #A06A2E)", label: "3rd", height: 110 },
};

/** Hand-rolled CSS confetti — no extra deps. */
const Confetti = ({ active }: { active: boolean }) => {
  const pieces = useMemo(
    () =>
      Array.from({ length: 60 }).map((_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 1.5,
        duration: 2.5 + Math.random() * 2,
        color: ["#E85D2A", "#20B2AA", "#FFD700", "#9C27B0", "#4FC3F7", "#66BB6A"][i % 6],
        rotate: Math.random() * 360,
        size: 6 + Math.random() * 6,
      })),
    [],
  );

  if (!active) return null;

  return (
    <Box
      aria-hidden
      sx={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        pointerEvents: "none",
        zIndex: 10,
        "@keyframes confettiFall": {
          "0%": { transform: "translateY(-20vh) rotate(0deg)", opacity: 1 },
          "100%": { transform: "translateY(120vh) rotate(720deg)", opacity: 0 },
        },
        "@media (prefers-reduced-motion: reduce)": {
          "& > *": { display: "none" },
        },
      }}
    >
      {pieces.map((p) => (
        <Box
          key={p.id}
          sx={{
            position: "absolute",
            top: 0,
            left: `${p.left}%`,
            width: p.size,
            height: p.size * 0.6,
            bgcolor: p.color,
            transform: `rotate(${p.rotate}deg)`,
            animation: `confettiFall ${p.duration}s ${p.delay}s linear forwards`,
          }}
        />
      ))}
    </Box>
  );
};

const PhaseShell = ({
  visible,
  children,
}: {
  visible: boolean;
  children: React.ReactNode;
}) => (
  <Fade in={visible} timeout={{ enter: 600, exit: 300 }} mountOnEnter unmountOnExit>
    <Box
      sx={{
        position: "absolute",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        px: 3,
        textAlign: "center",
      }}
    >
      {children}
    </Box>
  </Fade>
);

export default function SeasonRecapModal({
  open,
  league,
  recap,
  onClose,
}: SeasonRecapModalProps) {
  const [phase, setPhase] = useState<Phase>("intro");

  // Build the actual sequence based on what's available. Always include intro
  // and outro; podium / bigWeek / bigClimber are skipped if data is missing.
  const sequence = useMemo<Phase[]>(() => {
    const phases: Phase[] = ["intro"];
    if (recap.podium.length > 0) phases.push("podium");
    if (recap.bigWeek) phases.push("bigWeek");
    if (recap.bigClimber) phases.push("bigClimber");
    phases.push("outro");
    return phases;
  }, [recap]);

  // Reset phase whenever the modal re-opens.
  useEffect(() => {
    if (open) setPhase(sequence[0] ?? "intro");
  }, [open, sequence]);

  // Auto-advance based on PHASE_DURATIONS.
  useEffect(() => {
    if (!open) return;
    const idx = sequence.indexOf(phase);
    if (idx === -1 || idx >= sequence.length - 1) return;
    const delay = PHASE_DURATIONS[phase];
    const t = setTimeout(() => setPhase(sequence[idx + 1]), delay);
    return () => clearTimeout(t);
  }, [phase, open, sequence]);

  const handleSkip = () => {
    // Skip to outro if not there yet, otherwise close.
    if (phase !== "outro") setPhase("outro");
    else onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullScreen
      aria-labelledby="season-recap-title"
      PaperProps={{
        sx: {
          background: "radial-gradient(circle at 50% 30%, #2A1A4A 0%, #0F0A1F 65%, #050308 100%)",
          color: "#fff",
          overflow: "hidden",
        },
      }}
    >
      {/* Confetti: only during podium phase */}
      <Confetti active={phase === "podium"} />

      {/* Skip + close controls */}
      <Box
        sx={{
          position: "absolute",
          top: 12,
          right: 12,
          display: "flex",
          gap: 1,
          zIndex: 20,
        }}
      >
        {phase !== "outro" && (
          <Button
            onClick={handleSkip}
            startIcon={<SkipNextIcon />}
            sx={{ color: "rgba(255,255,255,0.85)", textTransform: "none", fontWeight: 600 }}
          >
            Skip
          </Button>
        )}
        <IconButton onClick={onClose} sx={{ color: "rgba(255,255,255,0.85)" }} aria-label="Close recap">
          <CloseIcon />
        </IconButton>
      </Box>

      <Box sx={{ position: "relative", flex: 1, minHeight: 0 }}>
        {/* INTRO */}
        <PhaseShell visible={phase === "intro"}>
          <Typography
            variant="overline"
            sx={{ letterSpacing: 6, opacity: 0.7, mb: 1 }}
          >
            {CURRENT_SEASON.name}
          </Typography>
          <Typography
            id="season-recap-title"
            variant="h2"
            sx={{
              fontWeight: 900,
              letterSpacing: -1,
              background: "linear-gradient(135deg, #FFE082, #E85D2A, #20B2AA)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              mb: 1,
              fontSize: { xs: "2.5rem", sm: "3.5rem" },
            }}
          >
            Season Recap
          </Typography>
          <Typography variant="h6" sx={{ opacity: 0.8, fontWeight: 400 }}>
            {league.name}
          </Typography>
        </PhaseShell>

        {/* PODIUM */}
        <PhaseShell visible={phase === "podium"}>
          <Typography variant="overline" sx={{ letterSpacing: 4, opacity: 0.7, mb: 2 }}>
            Final Standings
          </Typography>
          <Typography variant="h3" sx={{ fontWeight: 800, mb: 4 }}>
            The Podium
          </Typography>
          <PodiumDisplay entries={recap.podium} />
        </PhaseShell>

        {/* BIG WEEK */}
        <PhaseShell visible={phase === "bigWeek"}>
          {recap.bigWeek && (
            <>
              <WhatshotIcon sx={{ fontSize: 56, color: "#FF7043", mb: 1 }} />
              <Typography variant="overline" sx={{ letterSpacing: 4, opacity: 0.7 }}>
                Biggest Single Week
              </Typography>
              <Typography variant="h3" sx={{ fontWeight: 800, mb: 3, mt: 1 }}>
                Week {recap.bigWeek.week}
              </Typography>
              <Slide in direction="up" timeout={500}>
                <Stack
                  direction="row"
                  spacing={2.5}
                  alignItems="center"
                  sx={{
                    p: 2.5,
                    borderRadius: 3,
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.12)",
                  }}
                >
                  <Avatar
                    src={recap.bigWeek.member.avatar}
                    alt=""
                    sx={{
                      width: 72,
                      height: 72,
                      border: `3px solid ${recap.bigWeek.member.tribeColor || "#E85D2A"}`,
                    }}
                  />
                  <Stack alignItems="flex-start" spacing={0.5}>
                    <Typography variant="h5" sx={{ fontWeight: 700, color: "#fff" }}>
                      {recap.bigWeek.member.displayName}
                    </Typography>
                    <Typography
                      sx={{
                        fontWeight: 900,
                        fontSize: "2.5rem",
                        lineHeight: 1,
                        color: "#FFD54F",
                      }}
                    >
                      {recap.bigWeek.weekScore} pts
                    </Typography>
                  </Stack>
                </Stack>
              </Slide>
            </>
          )}
        </PhaseShell>

        {/* BIG CLIMBER */}
        <PhaseShell visible={phase === "bigClimber"}>
          {recap.bigClimber && (
            <>
              <TrendingUpIcon sx={{ fontSize: 56, color: "#66BB6A", mb: 1 }} />
              <Typography variant="overline" sx={{ letterSpacing: 4, opacity: 0.7 }}>
                Biggest Climber · Post-Merge
              </Typography>
              <Typography variant="h3" sx={{ fontWeight: 800, mb: 3, mt: 1 }}>
                {recap.bigClimber.climb} {recap.bigClimber.climb === 1 ? "Spot" : "Spots"}
              </Typography>
              <Slide in direction="up" timeout={500}>
                <Stack
                  direction="row"
                  spacing={2.5}
                  alignItems="center"
                  sx={{
                    p: 2.5,
                    borderRadius: 3,
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.12)",
                  }}
                >
                  <Avatar
                    src={recap.bigClimber.member.avatar}
                    alt=""
                    sx={{
                      width: 72,
                      height: 72,
                      border: `3px solid ${recap.bigClimber.member.tribeColor || "#66BB6A"}`,
                    }}
                  />
                  <Stack alignItems="flex-start" spacing={0.5}>
                    <Typography variant="h5" sx={{ fontWeight: 700 }}>
                      {recap.bigClimber.member.displayName}
                    </Typography>
                    <Stack direction="row" spacing={1.5} alignItems="center">
                      <Typography sx={{ fontSize: "1.4rem", fontWeight: 700, color: "#9E9E9E" }}>
                        #{recap.bigClimber.rankAtMerge}
                      </Typography>
                      <Typography sx={{ color: "#66BB6A" }}>→</Typography>
                      <Typography sx={{ fontSize: "1.8rem", fontWeight: 900, color: "#66BB6A" }}>
                        #{recap.bigClimber.rankAtFinal}
                      </Typography>
                    </Stack>
                  </Stack>
                </Stack>
              </Slide>
            </>
          )}
        </PhaseShell>

        {/* OUTRO */}
        <PhaseShell visible={phase === "outro"}>
          <EmojiEventsIcon sx={{ fontSize: 64, color: "#FFD700", mb: 2 }} />
          <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>
            That's a Wrap
          </Typography>
          <Typography sx={{ opacity: 0.8, mb: 4, maxWidth: 420 }}>
            Thanks for playing {league.name}. Check the Hall of Fame for this
            season's legends.
          </Typography>
          <Button
            variant="contained"
            size="large"
            onClick={onClose}
            sx={{
              bgcolor: "#E85D2A",
              "&:hover": { bgcolor: "#D94E23" },
              textTransform: "none",
              fontWeight: 700,
              px: 4,
              py: 1.25,
            }}
          >
            View Final Standings
          </Button>
        </PhaseShell>
      </Box>
    </Dialog>
  );
}

function PodiumDisplay({ entries }: { entries: SeasonRecap["podium"] }) {
  // Order visually as 2nd-1st-3rd so the gold center pops; reveal in reverse
  // (3rd first, then 2nd, then 1st) by staggering Slide timings.
  const byRank = new Map(entries.map((e) => [e.rank, e]));
  const order: (1 | 2 | 3)[] = [2, 1, 3];
  const revealOrder: Record<1 | 2 | 3, number> = { 3: 0, 2: 1, 1: 2 };

  return (
    <Stack
      direction="row"
      spacing={{ xs: 1, sm: 2 }}
      alignItems="flex-end"
      sx={{ width: "100%", maxWidth: 560, justifyContent: "center" }}
    >
      {order.map((rank) => {
        const entry = byRank.get(rank);
        if (!entry) return null;
        const style = PODIUM_STYLES[rank];
        const revealDelay = revealOrder[rank] * 700 + 200;

        return (
          <Slide
            key={rank}
            in
            direction="up"
            timeout={{ enter: 600, exit: 300 }}
            style={{ transitionDelay: `${revealDelay}ms` }}
          >
            <Stack alignItems="center" spacing={1} sx={{ flex: 1, minWidth: 0 }}>
              <Avatar
                src={entry.member.avatar}
                alt=""
                sx={{
                  width: { xs: 56, sm: 72 },
                  height: { xs: 56, sm: 72 },
                  border: `3px solid ${style.color}`,
                  boxShadow: `0 0 20px ${style.color}80`,
                }}
              />
              <Typography
                variant="body2"
                sx={{
                  fontWeight: 700,
                  maxWidth: "100%",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  px: 0.5,
                }}
              >
                {entry.member.displayName}
              </Typography>
              <Typography sx={{ fontWeight: 800, color: style.color }}>
                {entry.totalPoints} pts
              </Typography>
              <Box
                sx={{
                  width: "100%",
                  height: style.height,
                  background: style.bg,
                  border: `2px solid ${style.color}`,
                  borderBottom: "none",
                  borderTopLeftRadius: 8,
                  borderTopRightRadius: 8,
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "center",
                  pt: 1.5,
                  color: "#1a1a1a",
                  fontWeight: 900,
                  fontSize: "1.5rem",
                  textShadow: "0 1px 2px rgba(255,255,255,0.3)",
                }}
              >
                {style.label}
              </Box>
            </Stack>
          </Slide>
        );
      })}
    </Stack>
  );
}
