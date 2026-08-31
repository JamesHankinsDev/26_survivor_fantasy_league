/**
 * Scheduling window tests. Run with: npm test
 *
 * The window is expressed in America/New_York, so the interesting cases are the
 * DST boundaries: the same ET wall-clock time maps to a different UTC hour in
 * summer and winter, and a UTC-based schedule would silently drift an hour
 * mid-season. The midnight start is the other trap — see the second test.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { inScorerWindow, etDayAndHour, nextEpisodeNumber } from "./episode-scorer.js";

const cases = [
  // Premiere week, EDT (UTC-4). Episode airs Wed Sep 23 2026, 8-10pm ET,
  // so the window opens at Thu 00:00 ET = Thu 04:00 UTC.
  ["2026-09-24T01:30:00Z", false, "Wed 9:30pm ET — episode still airing"],
  ["2026-09-24T02:00:00Z", false, "Wed 10:00pm ET — premiere ends, too early"],
  ["2026-09-24T03:59:00Z", false, "Wed 11:59pm ET — one minute early"],
  ["2026-09-24T04:00:00Z", true, "Thu 12:00am ET — window opens"],
  ["2026-09-24T07:00:00Z", true, "Thu 3:00am ET — retrying"],
  ["2026-09-24T15:59:00Z", true, "Thu 11:59am ET — last hour"],
  ["2026-09-24T16:00:00Z", false, "Thu 12:00pm ET — 12h elapsed, closes"],
  ["2026-09-24T20:00:00Z", false, "Thu 4:00pm ET — well past"],
  ["2026-09-22T04:00:00Z", false, "Tue midnight ET — wrong day"],
  ["2026-09-23T04:00:00Z", false, "Wed midnight ET — wrong day (a day early)"],
  // After DST ends (Nov 1 2026), EST (UTC-5) — same ET wall clock, +1h UTC.
  ["2026-11-19T04:00:00Z", false, "Wed 11:00pm EST — an hour early"],
  ["2026-11-19T05:00:00Z", true, "Thu 12:00am EST — window opens"],
  ["2026-11-19T16:59:00Z", true, "Thu 11:59am EST — last hour"],
  ["2026-11-19T17:00:00Z", false, "Thu 12:00pm EST — closes"],
];

test("scorer window opens Thu midnight ET for 12h, across DST", () => {
  for (const [iso, expected, label] of cases) {
    assert.equal(inScorerWindow(new Date(iso)), expected, label);
  }
});

test("a midnight start does not swallow the whole day", () => {
  // The bug the start/end-day formulation had: startHour 0 made "hour >= 0"
  // true for every hour of the day, plus part of the next.
  assert.equal(inScorerWindow(new Date("2026-09-24T16:00:00Z")), false, "Thu noon ET");
  assert.equal(inScorerWindow(new Date("2026-09-24T23:00:00Z")), false, "Thu 7pm ET");
});

test("a window may wrap past midnight into the next day", () => {
  const wrap = { day: 3, startHour: 22, durationHours: 6 }; // Wed 10pm -> Thu 4am
  assert.equal(inScorerWindow(new Date("2026-09-24T02:00:00Z"), wrap), true, "Wed 10pm ET");
  assert.equal(inScorerWindow(new Date("2026-09-24T06:00:00Z"), wrap), true, "Thu 2am ET");
  assert.equal(inScorerWindow(new Date("2026-09-24T08:00:00Z"), wrap), false, "Thu 4am ET");
});

test("etDayAndHour reports ET wall clock, not UTC", () => {
  // 02:00 UTC on Sep 24 is 10pm ET on Sep 23 — a different day and hour.
  assert.deepEqual(etDayAndHour(new Date("2026-09-24T02:00:00Z")), { day: 3, hour: 22 });
  // Midnight ET must be hour 0, not 24 (some engines render 24 under hour12:false).
  assert.deepEqual(etDayAndHour(new Date("2026-09-24T04:00:00Z")), { day: 4, hour: 0 });
});

test("nextEpisodeNumber mirrors the admin page's first-gap-from-1 rule", () => {
  assert.equal(nextEpisodeNumber([]), 1);
  assert.equal(nextEpisodeNumber([{ weeklyEvents: { 1: [{}], 2: [{}] } }]), 3);
  // Empty arrays don't count as scored.
  assert.equal(nextEpisodeNumber([{ weeklyEvents: { 1: [{}], 2: [] } }]), 2);
  // Fills a gap rather than appending after the max.
  assert.equal(nextEpisodeNumber([{ weeklyEvents: { 1: [{}], 3: [{}] } }]), 2);
});
