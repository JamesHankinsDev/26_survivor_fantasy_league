"use client";

import { useState } from "react";
import {
  Box,
  Card,
  CardContent,
  CardActions,
  Typography,
  Button,
  Chip,
  CircularProgress,
  Alert,
  Stack,
  Tooltip,
} from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import SettingsIcon from "@mui/icons-material/Settings";
import { useAuth } from "@/lib/auth-context";
import { League, getLeagueJoinUrl } from "@/types/league";
import { useOwnedLeagues } from "@/hooks/useLeagues";
import ManageLeagueDialog from "./ManageLeagueDialog";

interface LeagueListProps {
  refreshTrigger?: number;
}

export default function LeagueList({ refreshTrigger: _refreshTrigger = 0 }: LeagueListProps) {
  const { user } = useAuth();
  const {
    data: leagues = [],
    isLoading: loading,
    error: queryError,
  } = useOwnedLeagues(user?.uid || null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [manageDialogOpen, setManageDialogOpen] = useState(false);
  const [selectedLeague, setSelectedLeague] = useState<League | null>(null);

  const handleCopyJoinLink = (joinCode: string) => {
    const joinUrl = getLeagueJoinUrl(joinCode);
    navigator.clipboard.writeText(joinUrl);
    setCopiedCode(joinCode);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleOpenManageDialog = (league: League) => {
    setSelectedLeague(league);
    setManageDialogOpen(true);
  };

  const handleCloseManageDialog = () => {
    setManageDialogOpen(false);
    setSelectedLeague(null);
  };

  const handleLeagueDeleted = () => {
    handleCloseManageDialog();
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
        <CircularProgress sx={{ color: "#E85D2A" }} />
      </Box>
    );
  }

  if (queryError) {
    return <Alert severity="error">Failed to load leagues</Alert>;
  }

  if (leagues.length === 0) {
    return (
      <Alert severity="info">
        You haven't created any leagues yet. Click the button above to create
        one!
      </Alert>
    );
  }

  return (
    <>
      <Stack spacing={2}>
        {leagues.map((league) => (
          <Card
            key={league.id}
            sx={{
              borderLeft: "4px solid #E85D2A",
              "&:hover": {
                boxShadow: 3,
              },
            }}
          >
            <CardContent>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "start",
                  mb: 2,
                }}
              >
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
                    {league.name}
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{ color: "text.secondary" }}
                  >
                    Created {new Date(league.createdAt).toLocaleDateString()}
                  </Typography>
                </Box>
                <Chip
                  label={(league.status || "active").toUpperCase()}
                  size="small"
                  sx={{
                    backgroundColor:
                      league.status === "active" ? "#20B2AA" : "#999",
                    color: "white",
                  }}
                />
              </Box>

              <Stack spacing={1}>
                <Box sx={{ display: "flex", gap: 2 }}>
                  <Typography variant="body2" sx={{ color: "text.secondary" }}>
                    <strong>Players:</strong> {league.currentPlayers} /{" "}
                    {league.maxPlayers}
                  </Typography>
                  <Typography variant="body2" sx={{ color: "text.secondary" }}>
                    <strong>Join Code:</strong> {league.joinCode}
                  </Typography>
                </Box>
              </Stack>
            </CardContent>

            <CardActions sx={{ pt: 0 }}>
              <Tooltip
                title={
                  copiedCode === league.joinCode ? "Copied!" : "Copy join link"
                }
              >
                <Button
                  size="small"
                  startIcon={<ContentCopyIcon />}
                  onClick={() => handleCopyJoinLink(league.joinCode)}
                  sx={{ color: "#E85D2A" }}
                >
                  {copiedCode === league.joinCode ? "Copied" : "Copy Join Link"}
                </Button>
              </Tooltip>
              <Button
                size="small"
                startIcon={<SettingsIcon />}
                onClick={() => handleOpenManageDialog(league)}
                sx={{ color: "#20B2AA" }}
              >
                Manage League
              </Button>
            </CardActions>
          </Card>
        ))}
      </Stack>

      {/* Manage League Dialog */}
      <ManageLeagueDialog
        open={manageDialogOpen}
        league={selectedLeague}
        onClose={handleCloseManageDialog}
        onLeagueDeleted={handleLeagueDeleted}
      />
    </>
  );
}
