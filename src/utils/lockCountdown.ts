import { toZonedTime, fromZonedTime } from "date-fns-tz";

/**
 * Rosters lock every Wednesday at 8:00 PM ET (America/New_York). DST is handled
 * via date-fns-tz so the deadline tracks the wall clock, not a fixed UTC offset.
 *
 * Reused by the sidebar/topnav `<LockCountdown />` and eventually the add/drop
 * gating in `/dashboard/my-leagues/[id]`.
 */
const TZ = "America/New_York";
const LOCK_HOUR = 20; // 8pm
const WEDNESDAY = 3; // 0=Sun … 3=Wed

/** Next Wednesday 8:00 PM America/New_York as a UTC `Date`. */
export function getNextRosterLockDate(now: Date = new Date()): Date {
  // Project "now" into ET so day-of-week / hour math reflects the wall clock.
  const nowEt = toZonedTime(now, TZ);

  const candidateEt = new Date(nowEt);
  candidateEt.setHours(LOCK_HOUR, 0, 0, 0);

  const dayDiff = (WEDNESDAY - candidateEt.getDay() + 7) % 7;
  candidateEt.setDate(candidateEt.getDate() + dayDiff);

  // If we landed on today-Wednesday but the 8pm slot has already passed, jump
  // to next week.
  if (candidateEt.getTime() <= nowEt.getTime()) {
    candidateEt.setDate(candidateEt.getDate() + 7);
  }

  return fromZonedTime(candidateEt, TZ);
}

export interface LockRemaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  /** Total milliseconds remaining; <=0 means the lock has elapsed. */
  totalMs: number;
}

/** Break a "remaining ms" value into d/h/m/s. Clamps to zero. */
export function getLockRemaining(
  target: Date,
  now: Date = new Date(),
): LockRemaining {
  const totalMs = Math.max(0, target.getTime() - now.getTime());
  const totalSeconds = Math.floor(totalMs / 1000);
  return {
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
    totalMs,
  };
}
