"use client";

import { useState } from "react";
import {
  Box,
  Container,
  Typography,
  Button,
  Alert,
  Stack,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import CreateLeagueDialog from "@/components/CreateLeagueDialog";
import LeagueList from "@/components/LeagueList";
import { League } from "@/types/league";

export default function AdminPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleLeagueCreated = (league: League) => {
    // Trigger a refresh of the league list
    setRefreshTrigger((prev) => prev + 1);
  };

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
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              mb: 2,
              flexWrap: "wrap",
              gap: 2,
            }}
          >
            <Box>
              <Typography
                variant="h4"
                sx={{
                  fontWeight: 700,
                  color: "#1A1A1A",
                  mb: 0.5,
                }}
              >
                League Management
              </Typography>
              <Typography variant="body2" sx={{ color: "text.secondary" }}>
                Create and manage your fantasy leagues
              </Typography>
            </Box>

            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setDialogOpen(true)}
              sx={{
                background: "linear-gradient(135deg, #D94E23 0%, #E85D2A 100%)",
                "&:hover": {
                  background:
                    "linear-gradient(135deg, #C93F1A 0%, #D94E23 100%)",
                },
              }}
            >
              Create League
            </Button>
          </Box>

          <Alert severity="info" sx={{ mb: 3 }}>
            Create leagues and share join links with your friends. Each league
            can have between 2 and 20 players.
          </Alert>
        </Box>

        {/* League List */}
        <LeagueList refreshTrigger={refreshTrigger} />
      </Container>

      {/* Create League Dialog */}
      <CreateLeagueDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onLeagueCreated={handleLeagueCreated}
      />
    </Box>
  );
}
