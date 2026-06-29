"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS, isNavActive } from "./navItems";

/**
 * MobileTabBar — the fixed bottom navigation shown below the md breakpoint.
 * Mirrors the design system's `.sfl-tabbar`, replacing the wrapping top-nav
 * pills with a thumb-reachable tab bar. Rendered by the shell only on mobile.
 */
export default function MobileTabBar() {
  const pathname = usePathname();

  return (
    <nav className="sfl-tabbar sfl-tabbar-fixed" aria-label="Primary">
      {NAV_ITEMS.map((item) => {
        const active = isNavActive(item, pathname);
        return (
          <Link
            key={item.id}
            href={item.href}
            className={`sfl-tab${active ? " active" : ""}`}
            aria-current={active ? "page" : undefined}
          >
            <span className="sfl-tab-glyph" aria-hidden>
              {item.glyph}
            </span>
            <span className="sfl-tab-label">{item.shortLabel ?? item.label}</span>
            {item.badge != null && item.badge > 0 && (
              <span className="sfl-tab-badge">{item.badge > 9 ? "9+" : item.badge}</span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
