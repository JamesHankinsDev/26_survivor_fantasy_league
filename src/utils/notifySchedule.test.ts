import { describe, it, expect } from "vitest";
import {
  etWallClockToDate,
  resolveSendAfter,
  describeSendAfter,
} from "./notifySchedule";

/** Render an instant as ET wall-clock, for readable assertions. */
const inET = (d: Date) =>
  d.toLocaleString("en-US", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

describe("etWallClockToDate", () => {
  it("resolves a summer (EDT, UTC-4) wall time", () => {
    // 2026-09-23 23:30 ET === 2026-09-24 03:30 UTC
    expect(etWallClockToDate(2026, 9, 23, 23, 30).toISOString()).toBe(
      "2026-09-24T03:30:00.000Z",
    );
  });

  it("resolves a winter (EST, UTC-5) wall time", () => {
    // 2026-01-14 23:30 ET === 2026-01-15 04:30 UTC
    expect(etWallClockToDate(2026, 1, 14, 23, 30).toISOString()).toBe(
      "2026-01-15T04:30:00.000Z",
    );
  });

  it("lands on the right wall time the day DST ends", () => {
    // 2026-11-01 is the EDT->EST switch. 09:00 ET that morning is EST (UTC-5).
    const d = etWallClockToDate(2026, 11, 1, 9, 0);
    expect(inET(d)).toBe("11/01/2026, 09:00");
  });

  it("lands on the right wall time the day DST begins", () => {
    // 2026-03-08 is the EST->EDT switch.
    const d = etWallClockToDate(2026, 3, 8, 9, 0);
    expect(inET(d)).toBe("03/08/2026, 09:00");
  });
});

describe("resolveSendAfter", () => {
  // Wednesday 2026-09-23, 9:15pm ET — mid-episode on the East Coast, which is
  // exactly when an admin would be entering scores.
  const duringEpisode = new Date("2026-09-24T01:15:00.000Z");

  it("returns undefined for 'now' (caller omits sendAfter)", () => {
    expect(resolveSendAfter("now", undefined, duringEpisode)).toBeUndefined();
  });

  it("returns null for 'none' (in-app only)", () => {
    expect(resolveSendAfter("none", undefined, duringEpisode)).toBeNull();
  });

  it("holds until 11:30pm ET the same night for 'after_west_coast'", () => {
    const at = resolveSendAfter("after_west_coast", undefined, duringEpisode) as Date;
    expect(inET(at)).toBe("09/23/2026, 23:30");
    expect(at.getTime()).toBeGreaterThan(duringEpisode.getTime());
  });

  it("sends immediately when 11:30pm ET has already passed", () => {
    // 11:45pm ET the same night — holding until 23:30 would be in the past.
    const late = new Date("2026-09-24T03:45:00.000Z");
    expect(resolveSendAfter("after_west_coast", undefined, late)).toBeUndefined();
  });

  it("does not roll a whole day forward in the small hours", () => {
    // 12:30am ET Thursday. The ET calendar date is the 24th, so 23:30 on the
    // 24th is still ~23h out — correct, and notably not the 23rd (the past).
    const smallHours = new Date("2026-09-24T04:30:00.000Z");
    const at = resolveSendAfter("after_west_coast", undefined, smallHours) as Date;
    expect(inET(at)).toBe("09/24/2026, 23:30");
  });

  it("targets 9am ET the next ET day for 'tomorrow_morning'", () => {
    const at = resolveSendAfter("tomorrow_morning", undefined, duringEpisode) as Date;
    expect(inET(at)).toBe("09/24/2026, 09:00");
  });

  it("rolls tomorrow_morning across a month boundary", () => {
    const monthEnd = new Date("2026-10-01T01:15:00.000Z"); // Sep 30, 9:15pm ET
    const at = resolveSendAfter("tomorrow_morning", undefined, monthEnd) as Date;
    expect(inET(at)).toBe("10/01/2026, 09:00");
  });

  it("accepts a future custom time", () => {
    const at = resolveSendAfter("custom", "2026-09-24T20:00:00.000Z", duringEpisode) as Date;
    expect(at.toISOString()).toBe("2026-09-24T20:00:00.000Z");
  });

  it("treats a past custom time as send-now", () => {
    expect(resolveSendAfter("custom", "2020-01-01T00:00:00.000Z", duringEpisode)).toBeUndefined();
  });

  it("falls back to send-now on an unparseable custom time", () => {
    expect(resolveSendAfter("custom", "not a date", duringEpisode)).toBeUndefined();
  });

  it("falls back to send-now when custom is chosen but left blank", () => {
    expect(resolveSendAfter("custom", "", duringEpisode)).toBeUndefined();
  });
});

describe("describeSendAfter", () => {
  it("describes each of the three outcomes", () => {
    expect(describeSendAfter(null)).toMatch(/no push/i);
    expect(describeSendAfter(undefined)).toMatch(/immediately/i);
    expect(describeSendAfter(new Date("2026-09-24T03:30:00.000Z"))).toMatch(
      /held until Sep 23, 11:30 PM ET/,
    );
  });
});
