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

        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
            Contact & Support
          </Typography>
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            Have questions or feedback? Reach out to us at
            support@survivorfantasyleague.com
          </Typography>
        </Paper>
      </Container>
    </Box>
  );
}
