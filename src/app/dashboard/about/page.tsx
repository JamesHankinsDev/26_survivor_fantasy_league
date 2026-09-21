"use client";

import { useState } from "react";
import { Box, Container, Typography, Paper, Button } from "@mui/material";
import SchoolIcon from "@mui/icons-material/School";
import HowToPlayWalkthrough from "@/components/HowToPlayWalkthrough";
import { CURRENT_SEASON } from "@/data/seasons";
import {
  getScoringConfig,
  getSeasonRuleExtras,
} from "@/utils/seasonScoringConfig";
import {
  ALL_EVENT_TYPES,
  getEventDescription,
} from "@/utils/eventScoringConfig";
import { getRosterRules } from "@/utils/rosterRules";
import type { ScoringEventType } from "@/types/league";

const EVENT_EMOJI: Record<ScoringEventType, string> = {
  immunity_win: "🏆",
  team_challenge_win: "🎯",
  found_idol: "💎",
  found_advantage: "🃏",
  used_idol_successfully: "⚡",
  used_advantage_successfully: "✨",
  voted_at_tribal: "🗳️",
  survived_episode: "🌴",
  fire_making_win: "🔥",
  made_final_three: "🥉",
  season_winner: "👑",
  made_jury: "📋",
  voted_out: "❌",
};

/**
 * The scoring list is generated from the active season's config rather than
 * written out by hand — the hand-written version carried S50 values and folded
 * idols and advantages together ("Found Idol/Advantage +5"), so it disagreed
 * with what the engine actually awarded once S51 split and re-valued them.
 *
 * Events worth zero this season are left out entirely, which is what retires
 * "Survived the Episode" from the S51 list.
 */
const SEASON_SCORING = getScoringConfig(CURRENT_SEASON.number);

const scoredEvents = ALL_EVENT_TYPES.filter(
  (eventType) => SEASON_SCORING[eventType] !== 0,
)
  .map((eventType) => ({
    eventType,
    points: SEASON_SCORING[eventType],
    ...getEventDescription(eventType),
  }))
  .sort((a, b) => b.points - a.points);

const { weeklyScoreFloor } = getSeasonRuleExtras(CURRENT_SEASON.number);

// Both halves of the season, so the copy can state the allowance either side of
// the merge without depending on which week it happens to be right now.
const preMergeRules = getRosterRules(CURRENT_SEASON.number, 1, null);
const postMergeRules = getRosterRules(CURRENT_SEASON.number, 10, 7);

export default function AboutPage() {
  const [showTutorial, setShowTutorial] = useState(false);

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 4, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 2 }}>
        <Typography
          variant="h4"
          sx={{
            fontWeight: 700,
            color: "text.primary",
            mb: 1,
          }}
        >
          About Survivor Fantasy League
        </Typography>
        
        <Button
          variant="outlined"
          startIcon={<SchoolIcon />}
          onClick={() => setShowTutorial(true)}
          sx={{
            borderColor: "#E85D2A",
            color: "#E85D2A",
            "&:hover": {
              borderColor: "#D94E23",
              bgcolor: "rgba(232, 93, 42, 0.08)",
            },
          }}
        >
          How to play
        </Button>
      </Box>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
          What is Survivor Fantasy League?
        </Typography>
        <Typography
          variant="body2"
          sx={{ color: "text.secondary", lineHeight: 1.8, mb: 3 }}
        >
          Survivor Fantasy League is a competitive fantasy sports platform where
          fans can draft players from their favorite Survivor seasons and
          compete with friends. Build your league, manage your roster, and track
          your performance throughout the season.
        </Typography>

        <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
          How It Works
        </Typography>
        <Typography
          variant="body2"
          sx={{ color: "text.secondary", lineHeight: 1.8, mb: 3 }}
        >
          <strong>1. Create or Join a League:</strong> Start your own league or
          join an existing one with your friends.
          <br />
          <br />
          <strong>2. Draft Players:</strong> After joining a league, select your
          starting tribe roster of 5 castaways.
          <br />
          <br />
          <strong>3. Earn Points:</strong> Your players earn points based on
          their performance in challenges, tribal councils, and other in-game
          events.
          <br />
          <br />
          <strong>4. Compete:</strong> Track your league standings and compete
          for the championship.
        </Typography>

        <Typography
          variant="h6"
          sx={{ fontWeight: 600, mb: 2, color: "text.primary" }}
        >
          Features
        </Typography>
        <Box
          component="ul"
          sx={{ color: "text.secondary", lineHeight: 1.8, marginLeft: "20px" }}
        >
          <li>Real-time scoring updates</li>
          <li>Multiple league types and scoring systems</li>
          <li>Detailed player statistics and analytics</li>
          <li>League chat and notifications</li>
          <li>Mobile-friendly interface</li>
        </Box>
      </Paper>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
          How Scoring Works
        </Typography>
        <Typography
          variant="body2"
          sx={{ color: "text.secondary", lineHeight: 1.8, mb: 3 }}
        >
          Scoring is based on recording individual events that happen to each
          castaway during an episode. League managers log these events, and
          points are calculated automatically. Here are all the scoring events:
        </Typography>

        <Box sx={{ ml: 2, mb: 3 }}>
          {scoredEvents.map(({ eventType, points, title, description }) => (
            <Typography
              key={eventType}
              variant="body2"
              sx={{ color: "text.secondary", lineHeight: 1.8, mb: 1.5 }}
            >
              <span role="img" aria-hidden="true">
                {EVENT_EMOJI[eventType]}
              </span>{" "}
              <strong>
                {title} ({points > 0 ? "+" : ""}
                {points}):
              </strong>{" "}
              {description}
            </Typography>
          ))}
        </Box>

        {typeof weeklyScoreFloor === "number" && (
          <Typography
            variant="body2"
            sx={{ color: "text.secondary", lineHeight: 1.8, mb: 2 }}
          >
            <strong>Weekly floor:</strong> however rough the week, a tribe&apos;s
            score for it can&apos;t drop below {weeklyScoreFloor}.
          </Typography>
        )}

        <Typography
          variant="body2"
          sx={{ color: "text.secondary", lineHeight: 1.8, mb: 2 }}
        >
          <strong>Total Points:</strong> A castaway's points for an episode are
          the sum of every event above that they recorded that week.
        </Typography>

        <Typography
          variant="body2"
          sx={{ color: "text.secondary", lineHeight: 1.8 }}
        >
          <strong>Roster Points:</strong> Your tribe's total points are
          calculated by summing the episode points from all castaways on your
          roster at the time the scores were recorded.
        </Typography>
      </Paper>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
          Roster Management
        </Typography>
        <Typography
          variant="body2"
          sx={{ color: "text.secondary", lineHeight: 1.8, mb: 2 }}
        >
          <strong>Draft:</strong> Leagues begin with a draft where members
          select 5 castaways to form their initial roster.
        </Typography>
        <Typography
          variant="body2"
          sx={{ color: "text.secondary", lineHeight: 1.8, mb: 2 }}
        >
          <strong>Add/Drop:</strong> Throughout the season you can swap
          castaways in and out. You get{" "}
          <strong>{preMergeRules.swapsPerWeek} swaps a week before the merge</strong>{" "}
          and <strong>{postMergeRules.swapsPerWeek} after it</strong>. Rosters lock
          Wednesday at 8:00 PM ET. Only castaways on your roster when scores are
          recorded earn points for your tribe.
        </Typography>
        <Typography
          variant="body2"
          sx={{ color: "text.secondary", lineHeight: 1.8, mb: 2 }}
        >
          <strong>Eliminations:</strong> When a castaway is voted out, league
          managers mark them as eliminated. They stop earning points and can't be
          added to a roster again.
        </Typography>

        <Box
          sx={{
            p: 2,
            bgcolor: "rgba(232, 93, 42, 0.08)",
            border: "1px solid #E85D2A",
            borderRadius: 1,
            mt: 2,
          }}
        >
          <Typography
            variant="body2"
            sx={{
              color: "#D94E23",
              fontWeight: 600,
              mb: 1,
            }}
          >
            ⚠️ Important: Voted-Out Castaways
          </Typography>
          <Typography
            variant="body2"
            sx={{
              color: "text.secondary",
              lineHeight: 1.8,
            }}
          >
            <strong>Before the merge</strong>, a voted-out castaway can be
            dropped like anyone else — you free the slot and swap in a
            replacement. <strong>After the merge they stay on your roster</strong>{" "}
            for the rest of the season: no drop, no replacement. By the finale
            you may be down to one or two surviving castaways carrying your whole
            tribe, so pick your late-game roster carefully.
          </Typography>
        </Box>
      </Paper>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
          When a Season Ends
        </Typography>
        <Typography
          variant="body2"
          sx={{ color: "text.secondary", lineHeight: 1.8, mb: 2 }}
        >
          <strong>League Archive:</strong> Once the season's finale airs and
          final scores are entered, your league becomes a read-only archive.
          Final standings, scoring history, and the castaway roster stay
          visible — drafts, add/drops, and tribe edits are disabled.
        </Typography>
        <Typography
          variant="body2"
          sx={{ color: "text.secondary", lineHeight: 1.8 }}
        >
          <strong>Hall of Fame:</strong> Castaways who finished a season at{" "}
          <strong>Legendary</strong> rarity or above (51+ total points) are
          enshrined in the Hall of Fame, ranked by total points across every
          season. Check the sidebar for the full list — it grows after each
          finale.
        </Typography>
      </Paper>

      {/* Replaying from here never re-marks the flag — it's already set. */}
      <HowToPlayWalkthrough
        open={showTutorial}
        onClose={() => setShowTutorial(false)}
      />
    </Container>
  );
}
