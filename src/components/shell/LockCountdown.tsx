"use client";

import { useEffect, useState } from "react";
import {
  getLockRemaining,
  getNextRosterLockDate,
  type LockRemaining,
} from "@/utils/lockCountdown";

interface LockCountdownProps {
  /** Smaller variant for the sidebar/topnav footer. */
  compact?: boolean;
  /** Label above the digits. Defaults to "Rosters lock in". */
  label?: string;
}

const pad = (n: number) => String(n).padStart(2, "0");

export default function LockCountdown({
  compact = false,
  label = "Rosters lock in",
}: LockCountdownProps) {
  const [remaining, setRemaining] = useState<LockRemaining | null>(null);

  // Compute on mount + tick every second. We re-derive the target each tick so
  // the countdown rolls over to the following Wednesday automatically once it
  // hits zero (no manual reset needed).
  useEffect(() => {
    const tick = () => {
      const target = getNextRosterLockDate();
      setRemaining(getLockRemaining(target));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  // Render a fixed-width placeholder during SSR / first paint so the layout
  // doesn't jump when the countdown hydrates.
  const r = remaining ?? { days: 0, hours: 0, minutes: 0, seconds: 0, totalMs: 0 };

  return (
    <div
      className={`sfl-lock${compact ? " compact" : ""}`}
      role="timer"
      aria-live="off"
      aria-label={`${label}: ${r.days} days ${r.hours} hours ${r.minutes} minutes ${r.seconds} seconds`}
    >
      <span className="sfl-lock-label">{label}</span>
      <span className="sfl-lock-time">
        <span>{pad(r.days)}</span>
        <i>d</i>
        <span>{pad(r.hours)}</span>
        <i>h</i>
        <span>{pad(r.minutes)}</span>
        <i>m</i>
        <span className="sfl-lock-s">{pad(r.seconds)}</span>
        <i>s</i>
      </span>
    </div>
  );
}
