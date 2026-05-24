"use client";

import Card from "@/components/primitives/Card";

export interface ChatPreviewMessage {
  id: string;
  authorName: string;
  authorInitials: string;
  body: string;
  /** Relative time string already formatted (e.g. "8m ago"). */
  time: string;
}

interface LeagueChatMiniProps {
  leagueName: string;
  messages: ChatPreviewMessage[];
  /** Called when "Open →" is clicked — typically opens the full chat drawer. */
  onOpen?: () => void;
}

export default function LeagueChatMini({
  leagueName,
  messages,
  onOpen,
}: LeagueChatMiniProps) {
  return (
    <Card className="sfl-board-mini">
      <div className="sfl-board-mini-head">
        <div>
          <div className="sfl-eyebrow">League chat</div>
          <div className="sfl-board-mini-title">{leagueName}</div>
        </div>
        {onOpen && (
          <button type="button" className="sfl-btn-tiny" onClick={onOpen}>
            Open →
          </button>
        )}
      </div>
      <div className="sfl-board-mini-feed">
        {messages.length === 0 ? (
          <div className="sfl-board-mini-empty">
            No messages yet — be the first to talk strategy.
          </div>
        ) : (
          messages.slice(0, 3).map((m) => (
            <div key={m.id} className="sfl-board-mini-row">
              <span className="sfl-avatar sm">{m.authorInitials}</span>
              <div>
                <div className="sfl-board-mini-meta">
                  <b>{m.authorName}</b>
                  <span>· {m.time}</span>
                </div>
                <div className="sfl-board-mini-body">{m.body}</div>
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}
