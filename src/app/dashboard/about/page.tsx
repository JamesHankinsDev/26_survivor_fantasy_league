"use client";

import { Box, Container, Typography, Paper } from "@mui/material";

export default function AboutPage() {
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography
          variant="h4"
          sx={{
            fontWeight: 700,
            color: "#1A1A1A",
            mb: 1,
          }}
        >
          About Survivor Fantasy League
        </Typography>
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
          <strong>2. Draft Players:</strong> Participate in league drafts to
          build your team of Survivor contestants.
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

        <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
          Features
        </Typography>
        <ul style={{ color: "#666", lineHeight: 1.8, marginLeft: "20px" }}>
          <li>Real-time scoring updates</li>
          <li>Multiple league types and scoring systems</li>
          <li>Detailed player statistics and analytics</li>
          <li>League chat and notifications</li>
          <li>Mobile-friendly interface</li>
        </ul>
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
          <Typography
            variant="body2"
            sx={{ color: "text.secondary", lineHeight: 1.8, mb: 1.5 }}
          >
            <strong>Immunity Win (+5):</strong> Castaway won an individual
            immunity challenge and cannot be voted out.
          </Typography>
          <Typography
            variant="body2"
            sx={{ color: "text.secondary", lineHeight: 1.8, mb: 1.5 }}
          >
            <strong>Team Challenge Win (+3):</strong> Castaway's team won a
            reward or immunity challenge.
          </Typography>
          <Typography
            variant="body2"
            sx={{ color: "text.secondary", lineHeight: 1.8, mb: 1.5 }}
          >
            <strong>Found Idol/Advantage (+5):</strong> Castaway discovered a
            hidden immunity idol or other game advantage.
          </Typography>
          <Typography
            variant="body2"
            sx={{ color: "text.secondary", lineHeight: 1.8, mb: 1.5 }}
          >
            <strong>Successfully Used Idol/Advantage (+3):</strong> Castaway
            played an idol or advantage that helped them in the game.
          </Typography>
          <Typography
            variant="body2"
            sx={{ color: "text.secondary", lineHeight: 1.8, mb: 1.5 }}
          >
            <strong>Voted at Tribal Council (+3):</strong> Castaway participated
            in voting at tribal council. Points awarded per vote.
          </Typography>
          <Typography
            variant="body2"
            sx={{ color: "text.secondary", lineHeight: 1.8, mb: 1.5 }}
          >
            <strong>Survived the Episode (+1):</strong> Castaway was not voted
            out and survived to the next episode.
          </Typography>
          <Typography
            variant="body2"
            sx={{ color: "text.secondary", lineHeight: 1.8, mb: 1.5 }}
          >
            <strong>Fire-Making Challenge Win (+5):</strong> Castaway won a
            fire-making tiebreaker challenge.
          </Typography>
          <Typography
            variant="body2"
            sx={{ color: "text.secondary", lineHeight: 1.8, mb: 1.5 }}
          >
            <strong>Made Final 3 (+5):</strong> Castaway made it to the final
            three of the season.
          </Typography>
          <Typography
            variant="body2"
            sx={{ color: "text.secondary", lineHeight: 1.8, mb: 1.5 }}
          >
            <strong>Season Winner (+10):</strong> Castaway was crowned Sole
            Survivor and won the game.
          </Typography>
          <Typography
            variant="body2"
            sx={{ color: "text.secondary", lineHeight: 1.8, mb: 1.5 }}
          >
            <strong>Made Jury (+3):</strong> Castaway was voted out but made the
            jury.
          </Typography>
          <Typography
            variant="body2"
            sx={{ color: "text.secondary", lineHeight: 1.8 }}
          >
            <strong>Voted Out (-10):</strong> Castaway was voted out of the game
            and eliminated.
          </Typography>
        </Box>

        <Typography
          variant="body2"
          sx={{ color: "text.secondary", lineHeight: 1.8, mb: 2 }}
        >
          <strong>Total Points:</strong> Your castaway's total points for the
          episode is the sum of all four categories above.
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
          <strong>Add/Drop:</strong> Throughout the season, you can add
          castaways who were not drafted and drop castaways from your roster.
          Only castaways on your roster when scores are recorded will earn
          points for your tribe.
        </Typography>
        <Typography
          variant="body2"
          sx={{ color: "text.secondary", lineHeight: 1.8, mb: 2 }}
        >
          <strong>Eliminations:</strong> When a castaway is eliminated from
          Survivor, league managers mark them as eliminated. Eliminated
          castaways no longer earn points and cannot be added to new rosters.
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
            ⚠️ Important: Eliminated Castaways Impact
          </Typography>
          <Typography
            variant="body2"
            sx={{
              color: "text.secondary",
              lineHeight: 1.8,
            }}
          >
            Once a castaway is eliminated, you <strong>cannot drop them</strong> to
            free up a roster spot. If one of your drafted castaways is
            eliminated early, you effectively lose that roster spot for the
            remainder of the season. Choose your draft picks wisely!
          </Typography>
        </Box>
      </Paper>
    </Container>
  );
}
