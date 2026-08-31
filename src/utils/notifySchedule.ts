/**
 * When to release a push notification.
 *
 * Scoring gets entered while the episode is still airing on the East Coast. A
 * push that says "your castaway was voted out" is a spoiler for anyone three
 * time zones behind, so the admin picks a release time and the push-service
 * holds the notification until then. The in-app bell is unaffected — it only
 * shows up when the user opens the app, which is their own choice.
 *
 * All the named options are expressed in America/New_York because that's the
 * timezone the show and the league's deadlines run on.
 */

export type NotifySchedule =
  | "now"
  | "after_west_coast" // 11:30pm ET — after the 8pm PT airing finishes
  | "tomorrow_morning" // 9:00am ET the next day
  | "custom"
  | "none";

export interface NotifyScheduleOption {
  value: NotifySchedule;
  label: string;
  hint: string;
}

export const NOTIFY_SCHEDULE_OPTIONS: NotifyScheduleOption[] = [
  {
    value: "after_west_coast",
    label: "After tonight's West Coast airing",
    hint: "11:30pm ET — safe for everyone who watches live",
  },
  { value: "now", label: "Send immediately", hint: "May spoil anyone who hasn't watched" },
  { value: "tomorrow_morning", label: "Tomorrow morning", hint: "9:00am ET" },
  { value: "custom", label: "Pick a time…", hint: "Choose an exact release time" },
  { value: "none", label: "Don't send a push", hint: "In-app notification only" },
];

const ET = "America/New_York";

/** Milliseconds `tz` is offset from UTC at a given instant (DST-aware). */
function zoneOffsetMs(tz: string, at: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })
    .formatToParts(at)
    .reduce<Record<string, string>>((acc, p) => {
      if (p.type !== "literal") acc[p.type] = p.value;
      return acc;
    }, {});

  // Intl renders hour 24 for midnight under hour12:false in some engines.
  const hour = Number(parts.hour) % 24;
  const asIfUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    hour,
    Number(parts.minute),
    Number(parts.second),
  );
  return asIfUtc - at.getTime();
}

/** The calendar date in ET at a given instant, as {year, month, day}. */
function etCalendarDate(at: Date): { year: number; month: number; day: number } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: ET,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(at);
  const [year, month, day] = parts.split("-").map(Number);
  return { year, month, day };
}

/**
 * Build a UTC Date for a wall-clock time in ET.
 *
 * Done in two passes: guess by treating the wall time as UTC, measure the zone
 * offset at that guess, then correct. The second pass matters across a DST
 * boundary, where the offset at the guess differs from the offset at the answer.
 */
export function etWallClockToDate(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
): Date {
  const guess = Date.UTC(year, month - 1, day, hour, minute);
  const firstPass = new Date(guess - zoneOffsetMs(ET, new Date(guess)));
  return new Date(guess - zoneOffsetMs(ET, firstPass));
}

/**
 * Resolve a schedule choice into a send time.
 *
 * Returns `undefined` for "send now" (the caller omits sendAfter entirely) and
 * `null` for "don't push at all".
 */
export function resolveSendAfter(
  schedule: NotifySchedule,
  customValue?: string,
  now: Date = new Date(),
): Date | undefined | null {
  if (schedule === "now") return undefined;
  if (schedule === "none") return null;

  if (schedule === "custom") {
    if (!customValue) return undefined;
    const parsed = new Date(customValue);
    if (Number.isNaN(parsed.getTime())) return undefined;
    // A time already in the past means "send now".
    return parsed.getTime() <= now.getTime() ? undefined : parsed;
  }

  const { year, month, day } = etCalendarDate(now);

  if (schedule === "after_west_coast") {
    const target = etWallClockToDate(year, month, day, 23, 30);
    // Entering scores after 11:30pm ET (or in the small hours) shouldn't push
    // the release a whole day out — send now instead.
    return target.getTime() <= now.getTime() ? undefined : target;
  }

  // tomorrow_morning — 9am ET on the following ET calendar day.
  //
  // Advance the ET calendar date with plain arithmetic. Reading the result back
  // through etCalendarDate would be wrong: UTC midnight of the next day is
  // still the *previous* evening in ET, so the round trip lands a day short.
  const next = new Date(Date.UTC(year, month - 1, day) + 24 * 60 * 60 * 1000);
  return etWallClockToDate(
    next.getUTCFullYear(),
    next.getUTCMonth() + 1,
    next.getUTCDate(),
    9,
    0,
  );
}

/** Human-readable summary of when a push will land, for admin confirmation UI. */
export function describeSendAfter(sendAfter: Date | undefined | null): string {
  if (sendAfter === null) return "No push will be sent (in-app only).";
  if (sendAfter === undefined) return "Push will be sent immediately.";
  return `Push will be held until ${sendAfter.toLocaleString("en-US", {
    timeZone: ET,
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })} ET.`;
}
