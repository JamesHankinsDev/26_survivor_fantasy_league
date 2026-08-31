/**
 * Scheduling window tests. Run with: npm test
 *
 * The window is expressed in America/New_York, so the interesting cases are the
 * DST boundaries: the same ET wall-clock time maps to a different UTC hour in
 * summer and winter, and a UTC-based schedule would silently drift an hour
 * mid-season.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { inScorerWindow, etDayAndHour, nextEpisodeNumber } from "./episode-scorer.js";

const cases = [
  // Premiere week, EDT (UTC-4). Episode airs Wed Sep 23 2026, 8-10pm ET.
  ["2026-09-24T01:30:00Z", false, "Wed 9:30pm ET — episode still airing"],
  ["2026-09-24T02:00:00Z", true, "Wed 10:00pm ET — opens as the premiere ends"],
  ["2026-09-24T03:30:00Z", true, "Wed 11:30pm ET — recaps landing"],
  ["2026-09-24T05:00:00Z", true, "Thu 1:00am ET — overnight retry"],
  ["2026-09-24T15:59:00Z", true, "Thu 11:59am ET — last retry"],
  ["2026-09-24T16:00:00Z", false, "Thu 12:00pm ET — window closes"],
  ["2026-09-25T02:00:00Z", false, "Thu 10:00pm ET — wrong day"],
  ["2026-09-22T02:00:00Z", false, "Mon 10:00pm ET — wrong day"],
  // After DST ends (Nov 1 2026), EST (UTC-5) — same ET wall clock, +1h UTC.
  ["2026-11-19T02:00:00Z", false, "Wed 9:00pm EST — an hour too early"],
  ["2026-11-19T03:00:00Z", true, "Wed 10:00pm EST — opens"],
  ["2026-11-19T16:59:00Z", true, "Thu 11:59am EST — last retry"],
  ["2026-11-19T17:00:00Z", false, "Thu 12:00pm EST — closes"],
];

test("scorer window opens Wed 10pm ET and holds until Thu noon, across DST", () => {
  for (const [iso, expected, label] of cases) {
    assert.equal(inScorerWindow(new Date(iso)), expected, label);
  }
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
