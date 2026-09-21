"use client";

export interface WelcomeBackBannerProps {
  /** The player's name — first name only is used. */
  displayName: string;
  /** Opens the walkthrough. */
  onStart: () => void;
  /** Dismisses without viewing; still counts as seen. */
  onDismiss: () => void;
}

/**
 * WelcomeBackBanner — the entry point to the how-to-play walkthrough.
 *
 * Deliberately a banner rather than an auto-opening modal for people who
 * already use the app: springing a six-step tour on a returning player is the
 * fastest way to teach them to dismiss things without reading. First-ever
 * logins still get the walkthrough opened for them — they have nothing else to
 * go on.
 *
 * Dismissing counts as seen, so nobody is nagged twice.
 */
export default function WelcomeBackBanner({
  displayName,
  onStart,
  onDismiss,
}: WelcomeBackBannerProps) {
  const firstName = displayName.trim().split(/[\s@]+/)[0] || "there";

  return (
    <section className="sfl-welcome" aria-label="Welcome back">
      <button
        className="sfl-welcome-x"
        onClick={onDismiss}
        aria-label="Dismiss welcome message"
      >
        ✕
      </button>
      <div className="sfl-welcome-body">
        <p className="sfl-welcome-kicker">Welcome back</p>
        <h2 className="sfl-welcome-title">Hey {firstName} — the app just changed</h2>
        <p className="sfl-welcome-text">
          Your weekly swap now happens right here on this screen, in three taps.
          Two minutes on how the whole game works?
        </p>
      </div>
      <div className="sfl-welcome-actions">
        <button className="sfl-btn" onClick={onStart}>
          <span className="sfl-btn-glyph" aria-hidden>
            ▶
          </span>
          Show me how to play
        </button>
        <button className="sfl-btn ghost" onClick={onDismiss}>
          No thanks
        </button>
      </div>
    </section>
  );
}
