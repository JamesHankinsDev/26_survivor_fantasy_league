"use client";

import { useState } from "react";
import {
  Paper,
  Box,
  Typography,
  Stack,
  Avatar,
  IconButton,
  Menu,
  MenuItem,
  TextField,
  Button,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  ListItemIcon,
  ListItemText,
  Tooltip,
  Popover,
} from "@mui/material";
import {
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Person as PersonIcon,
  Group as GroupIcon,
  AddReaction as AddReactionIcon,
  Reply as ReplyIcon,
} from "@mui/icons-material";
import {
  doc,
  updateDoc,
  deleteDoc,
  Timestamp,
  arrayUnion,
  arrayRemove,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  LeagueMessage,
  MessageEdit,
  MessageReaction,
  REACTION_EMOJIS,
} from "@/types/league";
import { formatDistanceToNow } from "date-fns";
import { notifyReaction } from "@/utils/notifications";

interface MessageItemProps {
  message: LeagueMessage;
  currentUserId: string;
  currentUserName: string;
  isOwner: boolean;
  leagueId: string;
  leagueName: string;
  onReply?: (message: LeagueMessage) => void;
}

export default function MessageItem({
  message,
  currentUserId,
  currentUserName,
  isOwner,
  leagueId,
  leagueName,
  onReply,
}: MessageItemProps) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [reactionAnchorEl, setReactionAnchorEl] = useState<null | HTMLElement>(
    null,
  );

  const isAuthor = message.authorId === currentUserId;
  const canEdit = isAuthor;
  const canDelete = isAuthor || isOwner;

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleEditClick = () => {
    setIsEditing(true);
    setEditContent(message.content);
    handleMenuClose();
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditContent(message.content);
  };

  const handleSaveEdit = async () => {
    if (!editContent.trim() || editContent === message.content) {
      handleCancelEdit();
      return;
    }

    setSaving(true);
    try {
      const messageRef = doc(db, "leagues", leagueId, "messages", message.id);

      const editHistoryEntry: MessageEdit = {
        editedAt: Timestamp.now(),
        previousContent: message.content,
      };

      await updateDoc(messageRef, {
        content: editContent.trim(),
        updatedAt: Timestamp.now(),
        isEdited: true,
        editHistory: arrayUnion(editHistoryEntry),
      });

      setIsEditing(false);
    } catch (err) {
      console.error("Error updating message:", err);
      alert("Failed to update message");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClick = () => {
    setDeleteDialogOpen(true);
    handleMenuClose();
  };

  const handleConfirmDelete = async () => {
    setSaving(true);
    try {
      const messageRef = doc(db, "leagues", leagueId, "messages", message.id);
      await deleteDoc(messageRef);
      setDeleteDialogOpen(false);
    } catch (err) {
      console.error("Error deleting message:", err);
      alert("Failed to delete message");
    } finally {
      setSaving(false);
    }
  };

  const handleReactionClick = (event: React.MouseEvent<HTMLElement>) => {
    setReactionAnchorEl(event.currentTarget);
  };

  const handleReactionClose = () => {
    setReactionAnchorEl(null);
  };

  const handleAddReaction = async (emoji: string) => {
    try {
      const messageRef = doc(db, "leagues", leagueId, "messages", message.id);

      const existingReaction = message.reactions?.find(
        (r) => r.userId === currentUserId && r.emoji === emoji,
      );

      if (existingReaction) {
        await updateDoc(messageRef, {
          reactions: arrayRemove(existingReaction),
        });
      } else {
        const newReaction: MessageReaction = {
          emoji,
          userId: currentUserId,
          userName: currentUserName,
          createdAt: Timestamp.now(),
        };
        await updateDoc(messageRef, {
          reactions: arrayUnion(newReaction),
        });
        
        // Notify the message author (if it's not the current user)
        if (message.authorId !== currentUserId) {
          await notifyReaction(
            message.authorId,
            leagueId,
            leagueName,
            currentUserName,
            emoji,
            message.id,
          );
        }
      }

      handleReactionClose();
    } catch (err) {
      console.error("Error updating reaction:", err);
    }
  };

  const handleReplyClick = () => {
    if (onReply) {
      onReply(message);
    }
    handleMenuClose();
  };

  const groupedReactions = (message.reactions || []).reduce(
    (acc, reaction) => {
      if (!acc[reaction.emoji]) {
        acc[reaction.emoji] = [];
      }
      acc[reaction.emoji].push(reaction);
      return acc;
    },
    {} as Record<string, MessageReaction[]>,
  );

  const renderContent = () => {
    if (!message.mentions || message.mentions.length === 0) {
      return <Typography variant="body1">{message.content}</Typography>;
    }

    const parts: React.ReactNode[] = [];
    let lastIndex = 0;

    const sortedMentions = [...message.mentions].sort(
      (a, b) => a.startIndex - b.startIndex,
    );

    sortedMentions.forEach((mention, idx) => {
      if (mention.startIndex > lastIndex) {
        parts.push(
          <span key={`text-${idx}`}>
            {message.content.slice(lastIndex, mention.startIndex)}
          </span>,
        );
      }

      parts.push(
        <Chip
          key={`mention-${idx}`}
          size="small"
          icon={mention.type === "user" ? <PersonIcon /> : <GroupIcon />}
          label={mention.name}
          sx={{
            mx: 0.5,
            height: 24,
            "& .MuiChip-label": { px: 1 },
          }}
        />,
      );

      lastIndex = mention.endIndex;
    });

    if (lastIndex < message.content.length) {
      parts.push(
        <span key="text-end">{message.content.slice(lastIndex)}</span>,
      );
    }

    return (
      <Box
        sx={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: 0.5,
        }}
      >
        {parts}
      </Box>
    );
  };

  return (
    <>
      <Paper
        elevation={1}
        sx={{
          p: 2,
          ml: message.parentMessageId ? 4 : 0,
          borderLeft: message.parentMessageId ? "3px solid" : "none",
          borderColor: "primary.main",
        }}
      >
        <Stack spacing={1.5}>
          <Box display="flex" alignItems="flex-start" gap={1.5}>
            <Avatar
              src={message.authorAvatar}
              alt={message.authorName}
              sx={{ width: 40, height: 40 }}
            >
              {message.authorName.charAt(0).toUpperCase()}
            </Avatar>
            <Box flex={1}>
              <Box display="flex" alignItems="center" gap={1}>
                <Typography variant="subtitle2" fontWeight="bold">
                  {message.authorName}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {formatDistanceToNow(message.createdAt, { addSuffix: true })}
                </Typography>
                {message.isEdited && (
                  <Typography variant="caption" color="text.secondary">
                    (edited)
                  </Typography>
                )}
              </Box>
            </Box>
            {(canEdit || canDelete) && (
              <IconButton size="small" onClick={handleMenuOpen}>
                <MoreVertIcon />
              </IconButton>
            )}
          </Box>

          {isEditing ? (
            <Box>
              <TextField
                fullWidth
                multiline
                rows={3}
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                disabled={saving}
              />
              <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                <Button
                  size="small"
                  variant="contained"
                  onClick={handleSaveEdit}
                  disabled={saving || !editContent.trim()}
                >
                  Save
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={handleCancelEdit}
                  disabled={saving}
                >
                  Cancel
                </Button>
              </Stack>
            </Box>
          ) : (
            renderContent()
          )}

          {Object.keys(groupedReactions).length > 0 && (
            <Box display="flex" gap={0.5} flexWrap="wrap">
              {Object.entries(groupedReactions).map(([emoji, reactions]) => {
                const userReacted = reactions.some(
                  (r) => r.userId === currentUserId,
                );
                return (
                  <Tooltip
                    key={emoji}
                    title={reactions.map((r) => r.userName).join(", ")}
                  >
                    <Chip
                      size="small"
                      label={`${emoji} ${reactions.length}`}
                      onClick={() => handleAddReaction(emoji)}
                      sx={{
                        cursor: "pointer",
                        bgcolor: userReacted
                          ? "primary.light"
                          : "background.default",
                        "&:hover": {
                          bgcolor: userReacted
                            ? "primary.main"
                            : "action.hover",
                        },
                      }}
                    />
                  </Tooltip>
                );
              })}
            </Box>
          )}

          <Box display="flex" gap={1}>
            <Button
              size="small"
              startIcon={<AddReactionIcon />}
              onClick={handleReactionClick}
              sx={{ textTransform: "none" }}
            >
              React
            </Button>
            {!message.parentMessageId && onReply && (
              <Button
                size="small"
                startIcon={<ReplyIcon />}
                onClick={handleReplyClick}
                sx={{ textTransform: "none" }}
              >
                Reply {message.replyCount ? `(${message.replyCount})` : ""}
              </Button>
            )}
          </Box>
        </Stack>
      </Paper>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        {canEdit && (
          <MenuItem onClick={handleEditClick}>
            <ListItemIcon>
              <EditIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Edit</ListItemText>
          </MenuItem>
        )}
        {canDelete && (
          <MenuItem onClick={handleDeleteClick}>
            <ListItemIcon>
              <DeleteIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Delete</ListItemText>
          </MenuItem>
        )}
      </Menu>

      <Popover
        open={Boolean(reactionAnchorEl)}
        anchorEl={reactionAnchorEl}
        onClose={handleReactionClose}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "left",
        }}
      >
        <Box sx={{ p: 1, display: "flex", gap: 0.5 }}>
          {REACTION_EMOJIS.map(({ emoji, label }) => (
            <Tooltip key={emoji} title={label}>
              <IconButton
                size="large"
                onClick={() => handleAddReaction(emoji)}
                sx={{
                  fontSize: "1.5rem",
                  "&:hover": {
                    transform: "scale(1.2)",
                    transition: "transform 0.2s",
                  },
                }}
              >
                {emoji}
              </IconButton>
            </Tooltip>
          ))}
        </Box>
      </Popover>

      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>Delete Message</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this message? This action cannot be
            undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)} disabled={saving}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirmDelete}
            color="error"
            variant="contained"
            disabled={saving}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
