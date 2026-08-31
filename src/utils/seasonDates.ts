/**
 * Formatting for the date-only season fields (`premiereDate`, `concludedAt`).
 *
 * These are calendar dates — "the premiere is on September 23rd" — not moments
 * in time. `new Date("2026-09-23")` parses as UTC **midnight**, which is
 * September 22nd at 8pm in New York, so every US viewer saw the day before:
 *
 *   new Date("2026-09-23").toLocaleDateString("en-US", { weekday: "long", … })
 *   // => "Tuesday, September 22, 2026"      <- off by one, silently
 *
 * Passing `timeZone` doesn't help, because the instant itself is already the
 * 22nd. The fix is to build a *local* midnight from the calendar parts so the
 * rendered day matches the stored string for every viewer, everywhere.
 */

/** Parse `YYYY-MM-DD` as a local calendar date, not a UTC instant. */
export function parseSeasonDate(iso: string): Date {
  const [year, month, day] = iso.split("-").map(Number);
  // Guard against a malformed value rather than returning Invalid Date.
  if (!year || !month || !day) return new Date(iso);
  return new Date(year, month - 1, day);
}

/** Format a season date for display. Defaults to "September 23, 2026". */
export function formatSeasonDate(
  iso: string,
  options: Intl.DateTimeFormatOptions = { year: "numeric", month: "long", day: "numeric" },
): string {
  return parseSeasonDate(iso).toLocaleDateString("en-US", options);
}

/**
 * Whole days from today until a season date, floored at 0.
 *
 * Compares calendar dates rather than instants, so "premieres in 1 day" doesn't
 * flip to 0 partway through the previous afternoon.
 */
export function daysUntilSeasonDate(iso: string, now: Date = new Date()): number {
  const target = parseSeasonDate(iso);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const ms = target.getTime() - today.getTime();
  return Math.max(0, Math.round(ms / (1000 * 60 * 60 * 24)));
}
