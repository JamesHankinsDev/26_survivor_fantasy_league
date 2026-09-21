"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/lib/theme-context";
import { useOwnedLeagues } from "@/hooks/useLeagues";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { authLogger } from "@/lib/logger";
import { SECONDARY_NAV_ITEMS } from "./navItems";

interface UserMenuProps {
  displayName: string;
  meta?: string;
  initials: string;
  /** Avatar background color (defaults to flame). */
  color?: string;
  /**
   * Which way the popover should open relative to the trigger.
   * - `up` (default): for the sidebar footer, which sits at the bottom.
   * - `down`: for the topnav, where there's no room above.
   */
  popoverDirection?: "up" | "down";
}

/**
 * Footer profile card for the sidebar. The gear opens a small popover with
 * sign-out, theme toggle, and layout (sidebar/topnav) toggle.
 */
export default function UserMenu({
  displayName,
  meta,
  initials,
  color = "var(--flame)",
  popoverDirection = "up",
}: UserMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  const { user, logout } = useAuth();
  const { mode, toggleTheme, layout, setLayout } = useTheme();
  const router = useRouter();

  // Admin tooling is only meaningful to a league owner — one person per league.
  // Gating it here is what lets the tab bar drop from six tabs to four.
  const { data: ownedLeagues = [] } = useOwnedLeagues(user?.uid || null);
  const isOwner = ownedLeagues.length > 0;
  const secondaryItems = SECONDARY_NAV_ITEMS.filter(
    (item) => !item.requiresAdmin || isOwner,
  );

  // Push opt-in lived in the notification bell, which floated fixed at
  // top-right and sat on top of this menu's gear. The bell is gone; the toggle
  // belongs here anyway — it's a setting, and this is the settings menu.
  // Per-device, not per-account: subscribing on a phone says nothing about a
  // laptop, so this reflects only the current browser.
  const push = usePushNotifications();

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const handleLogout = async () => {
    setOpen(false);
    try {
      await logout();
      router.push("/");
    } catch (error) {
      authLogger.error("Logout failed:", error);
    }
  };

  return (
    <div ref={ref} className="sfl-leagueswitch">
      <div className="sfl-side-profile">
        <span className="sfl-avatar" style={{ background: color }}>
          {initials}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="sfl-side-name" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {displayName}
          </div>
          {meta && <div className="sfl-side-meta">{meta}</div>}
        </div>
        <button
          type="button"
          className="sfl-side-gear"
          aria-label="Account settings"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
        >
          ⚙
        </button>
      </div>
      {open && (
        <div
          className="sfl-ls-menu"
          role="menu"
          style={
            popoverDirection === "down"
              ? {
                  // Topnav: drop below, right-anchor so it doesn't blow past
                  // the viewport edge, and give it a usable min-width since
                  // the trigger in the topnav is narrower than the sidebar.
                  top: "calc(100% + 6px)",
                  bottom: "auto",
                  left: "auto",
                  right: 0,
                  minWidth: 200,
                }
              : { top: "auto", bottom: "calc(100% + 6px)" }
          }
        >
          {secondaryItems.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              className="sfl-ls-item"
              role="menuitem"
              onClick={() => setOpen(false)}
            >
              <span style={{ width: 14, textAlign: "center" }} aria-hidden>
                {item.glyph}
              </span>
              {item.label}
            </Link>
          ))}
          {secondaryItems.length > 0 && <div className="sfl-ls-divider" />}
          <button
            type="button"
            className="sfl-ls-item"
            role="menuitem"
            onClick={toggleTheme}
          >
            <span style={{ width: 14, textAlign: "center" }}>
              {mode === "dark" ? "☀" : "☾"}
            </span>
            {mode === "dark" ? "Light theme" : "Dark theme"}
          </button>
          <button
            type="button"
            className="sfl-ls-item"
            role="menuitem"
            onClick={() => setLayout(layout === "sidebar" ? "topnav" : "sidebar")}
          >
            <span style={{ width: 14, textAlign: "center" }}>
              {layout === "sidebar" ? "▤" : "◫"}
            </span>
            {layout === "sidebar" ? "Use top nav" : "Use sidebar"}
          </button>
          {push.status !== "unsupported" && (
            <button
              type="button"
              className="sfl-ls-item"
              // A toggle in a menu is a menuitemcheckbox, not a menuitem —
              // menuitem doesn't support a checked/pressed state.
              role="menuitemcheckbox"
              aria-checked={push.status === "on"}
              disabled={push.isBusy || push.status === "denied"}
              onClick={() => (push.status === "on" ? push.disable() : push.enable())}
              title={
                push.status === "denied"
                  ? "Blocked — re-enable notifications in your browser settings"
                  : "Alerts on this device, even when the app is closed"
              }
            >
              <span style={{ width: 14, textAlign: "center" }} aria-hidden>
                {push.status === "on" ? "🔔" : "🔕"}
              </span>
              {push.status === "denied"
                ? "Alerts blocked by browser"
                : push.status === "on"
                  ? "Alerts on for this device"
                  : "Turn on alerts for this device"}
            </button>
          )}
          {push.error && (
            <div className="sfl-ls-note" role="status">
              {push.error}
            </div>
          )}
          <div className="sfl-ls-divider" />
          <button
            type="button"
            className="sfl-ls-item ghost"
            role="menuitem"
            onClick={handleLogout}
          >
            <span style={{ width: 14, textAlign: "center" }}>↩</span>
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
