/**
 * Sidebar / topnav / tab-bar nav config.
 *
 * Split into a *primary* set — what the bottom tab bar shows on a phone — and a
 * *secondary* set that lives in the account menu. Six tabs across a 390px
 * viewport gave each one 65px, which ellipsised "Hall of Fame" to "Hall" and
 * "Standings" to "Ranks"; four tabs leave ~97px and fit the real words. Admin
 * and About are also the two nobody taps weekly, and Admin is meaningful to
 * exactly one person per league.
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
  /** Hidden unless the user owns a league or is a site admin. */
  requiresAdmin?: boolean;
}

/** The weekly loop: where am I, what's my move, who's left. */
export const NAV_ITEMS: NavItem[] = [
  { id: "home", label: "Home", glyph: "◐", href: "/dashboard" },
  {
    id: "standings",
    label: "Standings",
    glyph: "≡",
    href: "/dashboard/leaderboard",
  },
  { id: "cast", label: "Cast", glyph: "◯", href: "/dashboard/castaways" },
  {
    id: "hall",
    label: "Hall of Fame",
    shortLabel: "Hall of Fame",
    glyph: "★",
    href: "/dashboard/hall-of-fame",
  },
];

/** Rendered inside the account menu rather than the tab bar. */
export const SECONDARY_NAV_ITEMS: NavItem[] = [
  {
    id: "admin",
    label: "Admin tools",
    glyph: "✦",
    href: "/dashboard/admin",
    requiresAdmin: true,
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
