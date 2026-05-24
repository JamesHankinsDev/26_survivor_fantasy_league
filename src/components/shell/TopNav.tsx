"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import AppLogo from "./AppLogo";
import LockCountdown from "./LockCountdown";
import UserMenu from "./UserMenu";
import LeagueSwitcher from "@/components/LeagueSwitcher";
import { NAV_ITEMS, isNavActive } from "./navItems";

export default function TopNav() {
  const pathname = usePathname();
  const { user } = useAuth();

  const displayName = user?.displayName || user?.email?.split("@")[0] || "Player";
  const meta = user?.email ?? undefined;
  const initials =
    (user?.displayName || user?.email || "P")
      .split(/[ @]/)
      .map((s) => s[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "P";

  return (
    <header className="sfl-topnav" role="banner">
      <div className="sfl-topnav-left">
        <AppLogo />
        <LeagueSwitcher />
      </div>
      <nav className="sfl-topnav-nav" aria-label="Pages">
        {NAV_ITEMS.map((item) => {
          const active = isNavActive(item, pathname);
          return (
            <Link
              key={item.id}
              href={item.href}
              className={`sfl-topnav-item${active ? " active" : ""}`}
              aria-current={active ? "page" : undefined}
            >
              <span aria-hidden>{item.glyph}</span>
              <span>{item.label}</span>
              {item.badge != null && item.badge > 0 && (
                <span className="sfl-nav-badge">{item.badge}</span>
              )}
            </Link>
          );
        })}
      </nav>
      <div className="sfl-topnav-right">
        <LockCountdown compact />
        <UserMenu
          displayName={displayName}
          meta={meta}
          initials={initials}
          popoverDirection="down"
        />
      </div>
    </header>
  );
}
