"use client";

import { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Stack,
  Card,
  CardContent,
  Box,
  Typography,
  IconButton,
  Alert,
  CircularProgress,
  Avatar,
  Divider,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import WarningIcon from "@mui/icons-material/Warning";
import { League, TribeMember } from "@/types/league";
import { db } from "@/lib/firebase";
import {
  doc,
  updateDoc,
  deleteDoc,
  arrayRemove,
  increment,
} from "firebase/firestore";

interface ManageLeagueDialogProps {
  open: boolean;
  league: League | null;
  onClose: () => void;
  onLeagueDeleted?: () => void;
}

export default function ManageLeagueDialog({
  open,
  league,
  onClose,
  onLeagueDeleted,
}: ManageLeagueDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<string | null>(null);

  if (!league) return null;

  const canDelete = league.currentPlayers === 1; // Only owner remains
  const membersSortedByPoints = [...(league.memberDetails || [])].sort(
    (a, b) => b.points - a.points
  );

  const handleRemoveMember = async (userId: string, memberName: string) => {
    setLoading(true);
    setError("");

    try {
      const leagueRef = doc(db, "leagues", league.id);
      const memberToRemoveObj = league.memberDetails.find(
        (m) => m.userId === userId
      );

      if (!memberToRemoveObj) {
        throw new Error("Member not found");
      }

      await updateDoc(leagueRef, {
        members: arrayRemove(userId),
        memberDetails: arrayRemove(memberToRemoveObj),
        currentPlayers: increment(-1),
        updatedAt: new Date(),
      });

      setMemberToRemove(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove member");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteLeague = async () => {
    if (!canDelete) {
      setError("You must remove all other members before deleting the league");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const leagueRef = doc(db, "leagues", league.id);
      await deleteDoc(leagueRef);
      setConfirmDeleteOpen(false);
      onLeagueDeleted?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete league");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 600 }}>
          Manage League: {league.name}
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Stack spacing={3}>
            {error && <Alert severity="error">{error}</Alert>}

            {/* League Info Summary */}
            <Card sx={{ bgcolor: "rgba(32, 178, 170, 0.05)" }}>
              <CardContent>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                  League Information
                </Typography>
                <Stack spacing={0.5}>
                  <Typography variant="body2">
                    <strong>Status:</strong> {league.status}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Players:</strong> {league.currentPlayers} /{" "}
                    {league.maxPlayers}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Join Code:</strong> {league.joinCode}
                  </Typography>
                </Stack>
              </CardContent>
            </Card>

            <Divider />

            {/* Members List */}
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>
                League Members ({league.currentPlayers})
              </Typography>
              <Stack spacing={1}>
                {membersSortedByPoints.map((member) => (
                  <Card key={member.userId}>
                    <CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: 2,
                        }}
                      >
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 2,
                            flex: 1,
                          }}
                        >
                          <Avatar
                            src={member.avatar}
                            alt={member.displayName}
                            sx={{
                              width: 40,
                              height: 40,
                              border: `2px solid ${member.tribeColor}`,
                            }}
                          />
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography
                              variant="body2"
                              sx={{
                                fontWeight: 600,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {member.displayName}
                            </Typography>
                            <Typography
                              variant="caption"
                              sx={{ color: "text.secondary" }}
                            >
                              {member.points} points
                            </Typography>
                          </Box>
                        </Box>
                        {league.currentPlayers > 1 && (
                          <IconButton
                            size="small"
                            onClick={() => setMemberToRemove(member.userId)}
                            disabled={loading}
                            sx={{
                              color: "#E85D2A",
                              "&:hover": { bgcolor: "rgba(232, 93, 42, 0.1)" },
                            }}
                            title={`Remove ${member.displayName}`}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        )}
                      </Box>
                    </CardContent>
                  </Card>
                ))}
              </Stack>
            </Box>

            <Divider />

            {/* Delete League Section */}
            <Card
              sx={{
                bgcolor: canDelete
                  ? "rgba(232, 93, 42, 0.05)"
                  : "rgba(0, 0, 0, 0.02)",
                borderLeft: `4px solid ${canDelete ? "#E85D2A" : "#ccc"}`,
              }}
            >
              <CardContent>
                <Box sx={{ display: "flex", gap: 2, alignItems: "flex-start" }}>
                  <WarningIcon
                    sx={{
                      color: canDelete ? "#E85D2A" : "#999",
                      mt: 0.5,
                      flexShrink: 0,
                    }}
                  />
                  <Box>
                    <Typography
                      variant="subtitle2"
                      sx={{ fontWeight: 600, mb: 0.5 }}
                    >
                      Delete League
                    </Typography>
                    {canDelete ? (
                      <>
                        <Typography
                          variant="caption"
                          sx={{
                            color: "text.secondary",
                            display: "block",
                            mb: 1.5,
                          }}
                        >
                          You are the only member. The league can now be
                          deleted.
                        </Typography>
                        <Button
                          variant="contained"
                          color="error"
                          size="small"
                          startIcon={<DeleteIcon />}
                          onClick={() => setConfirmDeleteOpen(true)}
                          disabled={loading}
                        >
                          Delete League
                        </Button>
                      </>
                    ) : (
                      <Typography
                        variant="caption"
                        sx={{ color: "text.secondary" }}
                      >
                        Remove all {league.currentPlayers - 1} other member
                        {league.currentPlayers > 2 ? "s" : ""} to delete this
                        league.
                      </Typography>
                    )}
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={loading}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Remove Member Confirmation */}
      {memberToRemove && (
        <Dialog
          open={!!memberToRemove}
          onClose={() => !loading && setMemberToRemove(null)}
        >
          <DialogTitle>Remove Member?</DialogTitle>
          <DialogContent>
            <Typography variant="body2" sx={{ mt: 2 }}>
              Are you sure you want to remove{" "}
              <strong>
                {
                  league.memberDetails.find((m) => m.userId === memberToRemove)
                    ?.displayName
                }
              </strong>{" "}
              from this league? They will not be able to access it anymore.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setMemberToRemove(null)} disabled={loading}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                const member = league.memberDetails.find(
                  (m) => m.userId === memberToRemove
                );
                if (member) {
                  handleRemoveMember(memberToRemove, member.displayName);
                }
              }}
              variant="contained"
              color="error"
              disabled={loading}
            >
              {loading ? <CircularProgress size={24} /> : "Remove Member"}
            </Button>
          </DialogActions>
        </Dialog>
      )}

      {/* Delete League Confirmation */}
      <Dialog
        open={confirmDeleteOpen}
        onClose={() => !loading && setConfirmDeleteOpen(false)}
      >
        <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <WarningIcon sx={{ color: "#E85D2A" }} />
          Delete League?
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mt: 2, mb: 2 }}>
            Are you sure you want to permanently delete{" "}
            <strong>{league.name}</strong>? This action cannot be undone.
          </Typography>
          <Alert severity="warning">
            This will delete the league and all associated data.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setConfirmDeleteOpen(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleDeleteLeague}
            variant="contained"
            color="error"
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : "Delete League"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
