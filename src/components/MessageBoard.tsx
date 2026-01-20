"use client";

import { useEffect, useState, useRef } from "react";
import {
  Box,
  Paper,
  TextField,
  Button,
  Stack,
  Typography,
  CircularProgress,
  Alert,
  Chip,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
} from "@mui/material";
import {
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { LeagueMessage, MessageMention, League } from "@/types/league";
import MessageItem from "./MessageItem";
import PersonIcon from "@mui/icons-material/Person";
import GroupIcon from "@mui/icons-material/Group";
import { notifyMention } from "@/utils/notifications";
import {
  sanitizeMessageContent,
  isValidMessageLength,
  VALIDATION_LIMITS,
} from "@/utils/inputValidation";

interface MessageBoardProps {
  league: League;
  currentUserId: string;
  currentUserName: string;
  currentUserAvatar?: string;
}

export default function MessageBoard({
  league,
  currentUserId,
  currentUserName,
  currentUserAvatar,
}: MessageBoardProps) {
  const [messages, setMessages] = useState<LeagueMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [messageContent, setMessageContent] = useState("");
  const [sending, setSending] = useState(false);
  const [mentions, setMentions] = useState<MessageMention[]>([]);
  const [showMentionMenu, setShowMentionMenu] = useState(false);
  const [mentionSearch, setMentionSearch] = useState("");
  const [mentionStartPos, setMentionStartPos] = useState(-1);
  const [mentionAnchorEl, setMentionAnchorEl] = useState<null | HTMLElement>(
    null,
  );
  const textFieldRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!league?.id) return;

    const messagesRef = collection(db, "leagues", league.id, "messages");
    const q = query(messagesRef, orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const msgs: LeagueMessage[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          msgs.push({
            id: doc.id,
            leagueId: league.id,
            authorId: data.authorId,
            authorName: data.authorName,
            authorAvatar: data.authorAvatar,
            content: data.content,
            mentions: data.mentions || [],
            createdAt: data.createdAt?.toDate?.() || new Date(),
            updatedAt: data.updatedAt?.toDate?.() || null,
            isEdited: data.isEdited || false,
            editHistory: data.editHistory || [],
            reactions: data.reactions || [], // Add this line
            replyCount: data.replyCount || 0, // Add this line
            parentMessageId: data.parentMessageId, // Add this line
          });
        });
        setMessages(msgs);
        setLoading(false);
      },
      (err) => {
        console.error("Error fetching messages:", err);
        setError("Failed to load messages");
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [league?.id]);

  // Handle typing in message input to detect @ mentions
  const handleMessageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const cursorPos = e.target.selectionStart || 0;

    setMessageContent(value);

    // Check for @ symbol to trigger mention menu
    const textBeforeCursor = value.slice(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf("@");

    if (lastAtIndex !== -1 && lastAtIndex === cursorPos - 1) {
      // @ was just typed
      setMentionStartPos(lastAtIndex);
      setMentionSearch("");
      setShowMentionMenu(true);
      setMentionAnchorEl(textFieldRef.current);
    } else if (
      lastAtIndex !== -1 &&
      lastAtIndex < cursorPos &&
      !textBeforeCursor.slice(lastAtIndex).includes(" ")
    ) {
      // User is typing after @
      const searchText = textBeforeCursor.slice(lastAtIndex + 1);
      setMentionSearch(searchText);
      setShowMentionMenu(true);
      setMentionAnchorEl(textFieldRef.current);
    } else {
      setShowMentionMenu(false);
      setMentionStartPos(-1);
    }
  };

  // Get available mentions filtered by search
  const getAvailableMentions = () => {
    const users = league.memberDetails.map((m) => ({
      type: "user" as const,
      id: m.userId,
      name: m.displayName,
    }));

    const tribes = league.memberDetails
      .map((m) => ({
        type: "tribe" as const,
        id: m.displayName, // Use display name as ID for tribes
        name: m.displayName,
      }))
      .filter(
        (t, index, self) =>
          index === self.findIndex((item) => item.name === t.name),
      ); // Remove duplicates

    const all = [...users, ...tribes];

    if (!mentionSearch) return all;

    return all.filter((item) =>
      item.name.toLowerCase().includes(mentionSearch.toLowerCase()),
    );
  };

  // Handle selecting a mention from the menu
  const handleSelectMention = (mention: {
    type: "user" | "tribe";
    id: string;
    name: string;
  }) => {
    if (mentionStartPos === -1) return;

    const beforeMention = messageContent.slice(0, mentionStartPos);
    const afterMention = messageContent.slice(
      mentionStartPos + mentionSearch.length + 1,
    );
    const newContent = `${beforeMention}@${mention.name} ${afterMention}`;

    const mentionObj: MessageMention = {
      type: mention.type,
      id: mention.id,
      name: mention.name,
      startIndex: mentionStartPos,
      endIndex: mentionStartPos + mention.name.length + 1, // +1 for @
    };

    setMessageContent(newContent);
    setMentions([...mentions, mentionObj]);
    setShowMentionMenu(false);
    setMentionStartPos(-1);
    setMentionSearch("");
  };

  const handleSendMessage = async () => {
    if (!messageContent.trim() || sending) return;

    // Sanitize and validate input
    const sanitizedContent = sanitizeMessageContent(messageContent);
    if (!isValidMessageLength(sanitizedContent)) {
      setError(
        `Message must be between 1 and ${VALIDATION_LIMITS.MAX_MESSAGE_LENGTH} characters`,
      );
      return;
    }

    setSending(true);
    setError("");

    try {
      const messagesRef = collection(db, "leagues", league.id, "messages");

      // Update mention indices based on final content
      const finalMentions: MessageMention[] = [];
      let searchPos = 0;
      mentions.forEach((mention) => {
        const mentionText = `@${mention.name}`;
        const index = sanitizedContent.indexOf(mentionText, searchPos);
        if (index !== -1) {
          finalMentions.push({
            ...mention,
            startIndex: index,
            endIndex: index + mentionText.length,
          });
          searchPos = index + mentionText.length;
        }
      });

      // Create the message document
      const messageDoc = await addDoc(messagesRef, {
        leagueId: league.id,
        authorId: currentUserId,
        authorName: currentUserName,
        authorAvatar: currentUserAvatar || "",
        content: sanitizedContent,
        mentions: finalMentions,
        createdAt: Timestamp.now(),
        isEdited: false,
        editHistory: [],
        reactions: [], // Add this line
        replyCount: 0, // Add this line
      });

      // Send notifications for mentions
      // Only notify users (not tribes) who are not the author
      const userMentions = finalMentions.filter(
        (m) => m.type === "user" && m.id !== currentUserId,
      );

      for (const mention of userMentions) {
        await notifyMention(
          mention.id, // userId
          league.id, // leagueId
          league.name, // leagueName
          currentUserName, // mentionedBy
          messageDoc.id, // messageId
        );
      }

      setMessageContent("");
      setMentions([]);
    } catch (err) {
      console.error("Error sending message:", err);
      setError("Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Message Input */}
      <Paper elevation={2} sx={{ p: 2, mb: 3 }}>
        <Stack spacing={2}>
          <TextField
            ref={textFieldRef}
            multiline
            rows={3}
            fullWidth
            placeholder="Write a message... (Use @ to mention users or tribes)"
            value={messageContent}
            onChange={handleMessageChange}
            onKeyPress={handleKeyPress}
            disabled={sending}
          />
          {mentions.length > 0 && (
            <Box>
              <Typography variant="caption" color="text.secondary">
                Mentions:
              </Typography>
              <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
                {mentions.map((mention, idx) => (
                  <Chip
                    key={idx}
                    size="small"
                    icon={
                      mention.type === "user" ? <PersonIcon /> : <GroupIcon />
                    }
                    label={mention.name}
                    onDelete={() =>
                      setMentions(mentions.filter((_, i) => i !== idx))
                    }
                  />
                ))}
              </Stack>
            </Box>
          )}
          <Box display="flex" justifyContent="flex-end">
            <Button
              variant="contained"
              onClick={handleSendMessage}
              disabled={!messageContent.trim() || sending}
            >
              {sending ? <CircularProgress size={24} /> : "Send"}
            </Button>
          </Box>
        </Stack>
      </Paper>

      {/* Mention Menu */}
      <Menu
        anchorEl={mentionAnchorEl}
        open={showMentionMenu}
        onClose={() => setShowMentionMenu(false)}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "left",
        }}
      >
        {getAvailableMentions().length === 0 ? (
          <MenuItem disabled>No matches found</MenuItem>
        ) : (
          getAvailableMentions().map((item, idx) => (
            <MenuItem key={idx} onClick={() => handleSelectMention(item)}>
              <ListItemIcon>
                {item.type === "user" ? <PersonIcon /> : <GroupIcon />}
              </ListItemIcon>
              <ListItemText
                primary={item.name}
                secondary={item.type === "user" ? "User" : "Tribe"}
              />
            </MenuItem>
          ))
        )}
      </Menu>

      {/* Messages List */}
      <Stack spacing={2}>
        {messages.length === 0 ? (
          <Paper elevation={1} sx={{ p: 4, textAlign: "center" }}>
            <Typography color="text.secondary">
              No messages yet. Be the first to post!
            </Typography>
          </Paper>
        ) : (
          messages.map((message) => (
            <MessageItem
              key={message.id}
              message={message}
              currentUserId={currentUserId}
              currentUserName={currentUserName}
              isOwner={league.ownerId === currentUserId}
              leagueId={league.id}
              leagueName={league.name}
            />
          ))
        )}
      </Stack>
    </Box>
  );
}
