"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useUserLeagues } from "@/hooks/useLeagues";
import CreateLeagueDialog from "@/components/CreateLeagueDialog";
import type { League } from "@/types/league";

const STORAGE_KEY = "survivor:lastViewedLeagueId";

interface LeagueSwitcherProps {
  /** Called after a navigation choice so callers can close drawers, etc. */
  onNavigate?: () => void;
}

export default function LeagueSwitcher({ onNavigate }: LeagueSwitcherProps) {
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { data: leagues = [] } = useUserLeagues(user?.uid || null);
  const [open, setOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  // URL takes precedence — when viewing a specific league, that is "current".
  // Otherwise fall back to the user's last viewed league (localStorage), then
  // to the only league if they have exactly one.
  const urlLeagueId = useMemo(() => {
    const match = pathname?.match(/\/dashboard\/my-leagues\/([^/]+)/);
    return match ? match[1] : null;
  }, [pathname]);

  const selectedId = useMemo(() => {
    if (urlLeagueId && leagues.some((l) => l.id === urlLeagueId)) return urlLeagueId;
    if (typeof window !== "undefined") {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored && leagues.some((l) => l.id === stored)) return stored;
    }
    if (leagues.length === 1) return leagues[0].id;
    return "";
  }, [urlLeagueId, leagues]);

  const selectedLeague = leagues.find((l) => l.id === selectedId) ?? null;

  useEffect(() => {
    if (urlLeagueId && typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, urlLeagueId);
    }
  }, [urlLeagueId]);

  // Click-outside to dismiss the menu.
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const handleSelect = (league: League) => {
    setOpen(false);
    router.push(`/dashboard/my-leagues/${league.id}`);
    onNavigate?.();
  };

  const handleLeagueCreated = (league: League) => {
    setCreateOpen(false);
    router.push(`/dashboard/my-leagues/${league.id}`);
    onNavigate?.();
  };

  const buttonLabel = selectedLeague?.name ?? "Choose a league…";
  const memberCount = selectedLeague
    ? `${selectedLeague.currentPlayers ?? selectedLeague.members?.length ?? 0}/${selectedLeague.maxPlayers ?? 0}`
    : null;

  return (
    <div ref={ref} className="sfl-leagueswitch">
      <button
        type="button"
        className="sfl-ls-button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="sfl-ls-dot" aria-hidden />
        <span className="sfl-ls-name">
          {buttonLabel}
          {memberCount && (
            <span style={{ color: "var(--ink-mute)", fontWeight: 500 }}>
              {" "}
              ({memberCount})
            </span>
          )}
        </span>
        <span className="sfl-ls-caret" aria-hidden>
          ⌄
        </span>
      </button>

      {open && (
        <div className="sfl-ls-menu" role="menu">
          {leagues.length === 0 && (
            <div
              className="sfl-ls-item ghost"
              style={{ cursor: "default", padding: "10px" }}
            >
              No leagues yet
            </div>
          )}
          {leagues.map((l) => (
            <button
              key={l.id}
              type="button"
              role="menuitem"
              className={`sfl-ls-item${l.id === selectedId ? " current" : ""}`}
              onClick={() => handleSelect(l)}
            >
              <span className="sfl-ls-dot" aria-hidden />
              <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {l.name}
              </span>
              <span style={{ color: "var(--ink-mute)", fontSize: 11, fontVariantNumeric: "tabular-nums" }}>
                {l.currentPlayers ?? l.members?.length ?? 0}/{l.maxPlayers ?? 0}
              </span>
            </button>
          ))}
          {leagues.length > 0 && <div className="sfl-ls-divider" />}
          <button
            type="button"
            role="menuitem"
            className="sfl-ls-item ghost"
            onClick={() => {
              setOpen(false);
              setCreateOpen(true);
            }}
          >
            ＋ New league
          </button>
        </div>
      )}

      {user && (
        <CreateLeagueDialog
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          onLeagueCreated={handleLeagueCreated}
        />
      )}
    </div>
  );
}
