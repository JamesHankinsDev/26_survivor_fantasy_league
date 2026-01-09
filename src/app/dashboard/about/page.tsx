"use client";

import { Box, Container, Typography, Paper } from "@mui/material";

export default function AboutPage() {
  return (
    <Box
      sx={{
        flex: 1,
        bgcolor: "#f5f5f5",
        p: { xs: 2, md: 4 },
        overflow: "auto",
      }}
    >
      <Container maxWidth="lg">
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
            Survivor Fantasy League is a competitive fantasy sports platform
            where fans can draft players from their favorite Survivor seasons
            and compete with friends. Build your league, manage your roster, and
            track your performance throughout the season.
          </Typography>

          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
            How It Works
          </Typography>
          <Typography
            variant="body2"
            sx={{ color: "text.secondary", lineHeight: 1.8, mb: 3 }}
          >
            <strong>1. Create or Join a League:</strong> Start your own league
            or join an existing one with your friends.
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
            sx={{ color: "text.secondary", lineHeight: 1.8, mb: 2 }}
          >
            Points are awarded to your team members based on their performance
            each episode. League managers award points in four categories:
          </Typography>

          <Box sx={{ ml: 2, mb: 3 }}>
            <Typography
              variant="body2"
              sx={{ color: "text.secondary", lineHeight: 1.8, mb: 1.5 }}
            >
              <strong>Alive Bonus:</strong> Points awarded to castaways still in
              the game at the end of an episode. Example: +1 point per episode.
            </Typography>
            <Typography
              variant="body2"
              sx={{ color: "text.secondary", lineHeight: 1.8, mb: 1.5 }}
            >
              <strong>Immunity Win:</strong> Points awarded when a castaway wins
              individual immunity. Example: +5 points per win.
            </Typography>
            <Typography
              variant="body2"
              sx={{ color: "text.secondary", lineHeight: 1.8, mb: 1.5 }}
            >
              <strong>Jury Vote:</strong> Points awarded based on jury voting,
              final tribal council performance, or other voting-related actions.
              Example: +2 points per vote received.
            </Typography>
            <Typography
              variant="body2"
              sx={{ color: "text.secondary", lineHeight: 1.8, mb: 1.5 }}
            >
              <strong>Other:</strong> Bonus points for special moments, challenge
              performances, or league-specific rules. Example: +3 points for
              winning a challenge.
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
            sx={{ color: "text.secondary", lineHeight: 1.8 }}
          >
            <strong>Eliminations:</strong> When a castaway is eliminated from
            Survivor, league managers mark them as eliminated. Eliminated
            castaways no longer earn points and cannot be added to new rosters.
          </Typography>
        </Paper>
      </Container>
    </Box>
  );
}
