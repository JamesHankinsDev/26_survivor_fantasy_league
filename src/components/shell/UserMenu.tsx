"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/lib/theme-context";
import { authLogger } from "@/lib/logger";

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
  const { logout } = useAuth();
  const { mode, toggleTheme, layout, setLayout } = useTheme();
  const router = useRouter();

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
