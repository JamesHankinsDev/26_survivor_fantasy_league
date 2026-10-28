/**
 * Wire types for the AI assistant (`/api/chat`, `/api/roster-swap`).
 *
 * The chat route streams newline-delimited JSON `ChatStreamEvent`s. Roster
 * changes are never written by the chat itself: Claude can only *propose* a
 * swap, which the client renders as a confirm card and applies via
 * `/api/roster-swap` (which re-validates server-side).
 */

/** One prior turn sent back by the client. Text only — tools re-run each turn. */
export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

export interface ChatRequestBody {
  messages: ChatTurn[];
}

export interface CastawayRef {
  id: string;
  name: string;
}

export interface SwapProposal {
  leagueId: string;
  leagueName: string;
  drop: CastawayRef | null;
  add: CastawayRef | null;
  /** Working roster after the swap, for display. */
  resultingRoster: CastawayRef[];
}

export type ChatStreamEvent =
  | { type: "text"; text: string }
  | { type: "proposal"; proposal: SwapProposal }
  | { type: "error"; message: string }
  | { type: "done" };

export interface RosterSwapRequestBody {
  leagueId: string;
  dropId: string | null;
  addId: string | null;
}

export type RosterSwapResponse =
  | { ok: true; roster: string[] }
  | { ok: false; error: string };
