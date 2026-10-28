"use client";

/**
 * AI assistant — a launcher button plus a chat drawer (bottom sheet on phones).
 *
 * Talks to `/api/chat`, which streams NDJSON `ChatStreamEvent`s. Claude can
 * only *propose* roster swaps; each proposal renders as a card and is applied
 * through `/api/roster-swap` when the user taps Confirm.
 */
import { useEffect, useRef, useState } from "react";
import {
  Box,
  Button,
  CircularProgress,
  Drawer,
  Fab,
  IconButton,
  TextField,
  Typography,
  useMediaQuery,
} from "@mui/material";
import { useTheme as useMuiTheme } from "@mui/material/styles";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import CloseIcon from "@mui/icons-material/Close";
import SendIcon from "@mui/icons-material/Send";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { queryKeys } from "@/lib/query-client";
import { apiLogger } from "@/lib/logger";
import type {
  ChatStreamEvent,
  ChatTurn,
  RosterSwapResponse,
  SwapProposal,
} from "@/types/chat";

type ProposalStatus = "pending" | "saving" | "saved" | "dismissed" | "failed";

interface ProposalState {
  proposal: SwapProposal;
  status: ProposalStatus;
  error?: string;
}

interface ChatItem {
  id: number;
  role: "user" | "assistant";
  text: string;
  proposals: ProposalState[];
  error?: string;
}

const SUGGESTIONS = [
  "How's my tribe doing?",
  "Who's leading my league?",
  "Who should I pick up this week?",
];

const describeSwap = (p: SwapProposal) =>
  [p.drop && `drop ${p.drop.name}`, p.add && `add ${p.add.name}`].filter(Boolean).join(", ");

/**
 * Text-only history for the API. Proposal outcomes are folded into the
 * assistant's text so Claude knows what the user did with each card.
 */
const toHistory = (items: ChatItem[]): ChatTurn[] =>
  items
    .map((item) => {
      const notes = item.proposals.map((p) => {
        const outcome =
          p.status === "saved"
            ? "user confirmed; saved"
            : p.status === "dismissed"
              ? "user dismissed it"
              : "not confirmed yet";
        return `[Swap card in ${p.proposal.leagueName}: ${describeSwap(p.proposal)} — ${outcome}]`;
      });
      return {
        role: item.role,
        content: [item.text.trim(), ...notes].filter(Boolean).join("\n"),
      };
    })
    .filter((t) => t.content.length > 0);

/**
 * Render the one bit of markdown the assistant is allowed — `**bold**` — as
 * React elements (never innerHTML). Anything else stays plain text; an
 * unclosed `**` mid-stream shows as-is until its partner arrives.
 */
const renderReply = (text: string) =>
  text.split(/\*\*(.+?)\*\*/g).map((part, i) => (i % 2 ? <strong key={i}>{part}</strong> : part));

export default function AssistantChat() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const muiTheme = useMuiTheme();
  const belowMd = useMediaQuery(muiTheme.breakpoints.down("md"));

  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<ChatItem[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const nextId = useRef(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [items]);

  const patchItem = (id: number, fn: (item: ChatItem) => ChatItem) =>
    setItems((prev) => prev.map((it) => (it.id === id ? fn(it) : it)));

  const send = async (raw: string) => {
    const text = raw.trim();
    if (!text || busy || !user) return;

    const userItem: ChatItem = { id: nextId.current++, role: "user", text, proposals: [] };
    const replyId = nextId.current++;
    const history = toHistory([...items, userItem]);
    setItems((prev) => [
      ...prev,
      userItem,
      { id: replyId, role: "assistant", text: "", proposals: [] },
    ]);
    setInput("");
    setBusy(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${await user.getIdToken()}`,
        },
        body: JSON.stringify({ messages: history }),
      });
      if (!res.ok || !res.body) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || "The assistant is unavailable right now.");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          const event = JSON.parse(line) as ChatStreamEvent;
          if (event.type === "text") {
            patchItem(replyId, (it) => ({ ...it, text: it.text + event.text }));
          } else if (event.type === "proposal") {
            patchItem(replyId, (it) => ({
              ...it,
              proposals: [...it.proposals, { proposal: event.proposal, status: "pending" }],
            }));
          } else if (event.type === "error") {
            patchItem(replyId, (it) => ({ ...it, error: event.message }));
          }
        }
      }
    } catch (err) {
      apiLogger.error("assistant request failed", err);
      patchItem(replyId, (it) => ({
        ...it,
        error: err instanceof Error ? err.message : "Something went wrong.",
      }));
    } finally {
      setBusy(false);
    }
  };

  const setProposal = (itemId: number, idx: number, patch: Partial<ProposalState>) =>
    patchItem(itemId, (it) => ({
      ...it,
      proposals: it.proposals.map((p, i) => (i === idx ? { ...p, ...patch } : p)),
    }));

  const confirm = async (itemId: number, idx: number, proposal: SwapProposal) => {
    if (!user) return;
    setProposal(itemId, idx, { status: "saving", error: undefined });
    try {
      const res = await fetch("/api/roster-swap", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${await user.getIdToken()}`,
        },
        body: JSON.stringify({
          leagueId: proposal.leagueId,
          dropId: proposal.drop?.id ?? null,
          addId: proposal.add?.id ?? null,
        }),
      });
      const result = (await res.json()) as RosterSwapResponse;
      if (!result.ok) throw new Error(result.error);
      setProposal(itemId, idx, { status: "saved" });
      queryClient.invalidateQueries({ queryKey: queryKeys.leagues.detail(proposal.leagueId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.leagues.all });
    } catch (err) {
      setProposal(itemId, idx, {
        status: "failed",
        error: err instanceof Error ? err.message : "Couldn't save that swap.",
      });
    }
  };

  if (!user) return null;

  return (
    <>
      {!open && (
        <Fab
          aria-label="Open assistant"
          onClick={() => setOpen(true)}
          sx={{
            position: "fixed",
            // Mirrors the message-board button on the left; clears the mobile tab bar.
            bottom: belowMd ? "calc(72px + env(safe-area-inset-bottom))" : 24,
            right: belowMd ? 20 : 24,
            zIndex: 1200,
            bgcolor: "var(--ink)",
            color: "var(--bg)",
            "&:hover": { bgcolor: "var(--ink)", opacity: 0.9 },
          }}
        >
          <AutoAwesomeIcon />
        </Fab>
      )}

      <Drawer
        anchor={belowMd ? "bottom" : "right"}
        open={open}
        onClose={() => setOpen(false)}
        aria-label="Assistant"
        ModalProps={{ keepMounted: true }}
        PaperProps={{
          sx: belowMd
            ? { height: "85vh", borderTopLeftRadius: 16, borderTopRightRadius: 16 }
            : { width: { md: 420, lg: 480 }, maxWidth: "100vw" },
        }}
      >
        <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              px: 2,
              py: 1.5,
              borderBottom: "1px solid",
              borderColor: "divider",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <AutoAwesomeIcon sx={{ fontSize: 20, color: "var(--flame)" }} />
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                Assistant
              </Typography>
            </Box>
            <IconButton size="small" onClick={() => setOpen(false)} aria-label="Close assistant">
              <CloseIcon />
            </IconButton>
          </Box>

          <Box
            ref={scrollRef}
            sx={{ flex: 1, overflow: "auto", p: 2, display: "flex", flexDirection: "column", gap: 1.5 }}
          >
            {items.length === 0 && (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1, mt: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  Ask about your tribe, the standings or castaways — or ask me to make a swap.
                  Swaps only save when you tap Confirm.
                </Typography>
                {SUGGESTIONS.map((s) => (
                  <Button
                    key={s}
                    variant="outlined"
                    size="small"
                    onClick={() => send(s)}
                    sx={{ alignSelf: "flex-start", textTransform: "none", borderRadius: 4 }}
                  >
                    {s}
                  </Button>
                ))}
              </Box>
            )}

            {items.map((item) => (
              <Box
                key={item.id}
                sx={{
                  alignSelf: item.role === "user" ? "flex-end" : "flex-start",
                  maxWidth: "88%",
                  display: "flex",
                  flexDirection: "column",
                  gap: 1,
                }}
              >
                {(item.text || (item.role === "assistant" && busy && !item.error)) && (
                  <Box
                    sx={{
                      px: 1.5,
                      py: 1,
                      borderRadius: 2,
                      bgcolor: item.role === "user" ? "var(--flame)" : "action.hover",
                      color: item.role === "user" ? "white" : "text.primary",
                      whiteSpace: "pre-wrap",
                      fontSize: "0.9rem",
                      lineHeight: 1.45,
                    }}
                  >
                    {item.text ? (
                      item.role === "assistant" ? renderReply(item.text) : item.text
                    ) : (
                      <CircularProgress size={14} />
                    )}
                  </Box>
                )}

                {item.proposals.map((p, idx) => (
                  <Box
                    key={idx}
                    sx={{
                      border: "1px solid",
                      borderColor: "divider",
                      borderRadius: 2,
                      p: 1.5,
                      display: "flex",
                      flexDirection: "column",
                      gap: 0.75,
                    }}
                  >
                    <Typography variant="caption" color="text.secondary">
                      {p.proposal.leagueName}
                    </Typography>
                    {p.proposal.drop && (
                      <Typography variant="body2">
                        <strong>Drop</strong> {p.proposal.drop.name}
                      </Typography>
                    )}
                    {p.proposal.add && (
                      <Typography variant="body2">
                        <strong>Add</strong> {p.proposal.add.name}
                      </Typography>
                    )}
                    <Typography variant="caption" color="text.secondary">
                      New tribe: {p.proposal.resultingRoster.map((c) => c.name).join(", ")}
                    </Typography>

                    {p.status === "saved" ? (
                      <Typography variant="body2" sx={{ color: "success.main", fontWeight: 600 }}>
                        Saved ✓
                      </Typography>
                    ) : p.status === "dismissed" ? (
                      <Typography variant="body2" color="text.secondary">
                        Dismissed
                      </Typography>
                    ) : (
                      <Box sx={{ display: "flex", gap: 1, mt: 0.5 }}>
                        <Button
                          variant="contained"
                          size="small"
                          disabled={p.status === "saving"}
                          onClick={() => confirm(item.id, idx, p.proposal)}
                          sx={{ textTransform: "none", bgcolor: "var(--flame)" }}
                        >
                          {p.status === "saving" ? "Saving…" : "Confirm"}
                        </Button>
                        <Button
                          size="small"
                          disabled={p.status === "saving"}
                          onClick={() => setProposal(item.id, idx, { status: "dismissed" })}
                          sx={{ textTransform: "none" }}
                        >
                          Dismiss
                        </Button>
                      </Box>
                    )}
                    {p.error && (
                      <Typography variant="caption" color="error">
                        {p.error}
                      </Typography>
                    )}
                  </Box>
                ))}

                {item.error && (
                  <Typography variant="caption" color="error">
                    {item.error}
                  </Typography>
                )}
              </Box>
            ))}
          </Box>

          <Box
            component="form"
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            sx={{
              display: "flex",
              gap: 1,
              p: 1.5,
              pb: "calc(12px + env(safe-area-inset-bottom))",
              borderTop: "1px solid",
              borderColor: "divider",
            }}
          >
            <TextField
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about your tribe…"
              size="small"
              fullWidth
              multiline
              maxRows={4}
              slotProps={{ htmlInput: { maxLength: 2000 } }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send(input);
                }
              }}
            />
            <IconButton
              type="submit"
              aria-label="Send"
              disabled={busy || !input.trim()}
              sx={{ color: "var(--flame)" }}
            >
              <SendIcon />
            </IconButton>
          </Box>
        </Box>
      </Drawer>
    </>
  );
}
