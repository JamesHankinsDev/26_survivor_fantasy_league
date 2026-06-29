/**
 * Sidebar / topnav nav config. Glyphs come from the prototype; routes mirror
 * the current Next.js app structure. Items that the redesign mentions but
 * don't have routes yet (Draft, Recap, Trash Talk, per-league My Tribe) live
 * in later phases — add them here as those phases ship.
 */
export interface NavItem {
  id: string;
  label: string;
  /** Compact label used by the mobile bottom tab bar (falls back to `label`). */
  shortLabel?: string;
  glyph: string;
  href: string;
  /** Optional unread/notification count. */
  badge?: number;
  /** Hidden unless the user has a matching role. */
  requiresAdmin?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { id: "home", label: "Home", glyph: "◐", href: "/dashboard" },
  {
    id: "standings",
    label: "Standings",
    shortLabel: "Ranks",
    glyph: "≡",
    href: "/dashboard/leaderboard",
  },
  { id: "cast", label: "Cast", glyph: "◯", href: "/dashboard/castaways" },
  {
    id: "hall",
    label: "Hall of Fame",
    shortLabel: "Hall",
    glyph: "★",
    href: "/dashboard/hall-of-fame",
  },
  {
    id: "admin",
    label: "Admin",
    glyph: "✦",
    href: "/dashboard/admin",
  },
  { id: "about", label: "About", glyph: "ⓘ", href: "/dashboard/about" },
];

/**
 * Decide if a nav item is the current page. Home is special: it stays active
 * across `/dashboard` and `/dashboard/my-leagues/*` (which is the per-league
 * detail screen reached from Home).
 */
export const isNavActive = (item: NavItem, pathname: string | null): boolean => {
  if (!pathname) return false;
  if (item.href === "/dashboard") {
    return (
      pathname === "/dashboard" || pathname.startsWith("/dashboard/my-leagues")
    );
  }
  return pathname === item.href || pathname.startsWith(item.href + "/");
};
