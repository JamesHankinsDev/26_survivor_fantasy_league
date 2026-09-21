import { describe, it, expect } from "vitest";
import {
  calculateSeasonPoints,
  applyWeeklyFloor,
  getScoringConfig,
} from "./seasonScoringConfig";
import { isNetRosterChangeAllowed } from "./scoring";

describe("calculateSeasonPoints", () => {
  it("scores S51 events with S51 values, not the S50 baseline", () => {
    // Voted out is -5 in S51 and -10 in S50 — the difference the whole rules
    // update hinges on.
    expect(calculateSeasonPoints([{ eventType: "voted_out", count: 1 }], 51)).toBe(-5);
    expect(calculateSeasonPoints([{ eventType: "voted_out", count: 1 }], 50)).toBe(-10);
  });

  it("awards points for finding and using advantages in S51", () => {
    expect(calculateSeasonPoints([{ eventType: "found_advantage", count: 1 }], 51)).toBe(2);
    expect(
      calculateSeasonPoints([{ eventType: "used_advantage_successfully", count: 1 }], 51),
    ).toBe(1);
  });

  it("scored those same advantage events as zero under S50", () => {
    expect(calculateSeasonPoints([{ eventType: "found_advantage", count: 1 }], 50)).toBe(0);
    expect(
      calculateSeasonPoints([{ eventType: "used_advantage_successfully", count: 1 }], 50),
    ).toBe(0);
  });

  it("keeps advantages worth less than idols", () => {
    const s51 = getScoringConfig(51);
    expect(s51.found_advantage).toBeLessThan(s51.found_idol);
    expect(s51.used_advantage_successfully).toBeLessThan(s51.used_idol_successfully);
  });

  it("drops the survived-episode point in S51", () => {
    expect(calculateSeasonPoints([{ eventType: "survived_episode", count: 4 }], 51)).toBe(0);
    expect(calculateSeasonPoints([{ eventType: "survived_episode", count: 4 }], 50)).toBe(4);
  });

  it("raises the endgame payouts in S51", () => {
    expect(calculateSeasonPoints([{ eventType: "season_winner", count: 1 }], 51)).toBe(25);
    expect(calculateSeasonPoints([{ eventType: "made_final_three", count: 1 }], 51)).toBe(10);
  });

  it("multiplies by event count", () => {
    expect(calculateSeasonPoints([{ eventType: "immunity_win", count: 3 }], 51)).toBe(15);
  });

  it("sums a mixed event list", () => {
    const points = calculateSeasonPoints(
      [
        { eventType: "immunity_win", count: 1 }, // +5
        { eventType: "found_advantage", count: 2 }, // +4
        { eventType: "voted_out", count: 1 }, // -5
      ],
      51,
    );
    expect(points).toBe(4);
  });

  it("falls back to the S51 config for an unknown season", () => {
    expect(calculateSeasonPoints([{ eventType: "voted_out", count: 1 }], 999)).toBe(-5);
  });

  it("scores an empty event list as zero", () => {
    expect(calculateSeasonPoints([], 51)).toBe(0);
  });
});

describe("applyWeeklyFloor", () => {
  it("stops an S51 week going negative", () => {
    expect(applyWeeklyFloor(-12, 51)).toBe(0);
  });

  it("leaves a positive S51 week alone", () => {
    expect(applyWeeklyFloor(18, 51)).toBe(18);
  });

  it("lets an S50 week go negative — it had no floor", () => {
    expect(applyWeeklyFloor(-12, 50)).toBe(-12);
  });
});

describe("isNetRosterChangeAllowed with a swap allowance", () => {
  const locked = ["c0", "c1", "c2", "c3", "c4"];

  it("allows one change by default, preserving the old behaviour", () => {
    expect(isNetRosterChangeAllowed(locked, ["c0", "c1", "c2", "c3", "c9"])).toBe(true);
    expect(isNetRosterChangeAllowed(locked, ["c0", "c1", "c2", "c8", "c9"])).toBe(false);
  });

  it("allows two changes when the pre-merge allowance is passed", () => {
    expect(isNetRosterChangeAllowed(locked, ["c0", "c1", "c2", "c8", "c9"], 2)).toBe(true);
  });

  it("still refuses three changes on a two-swap allowance", () => {
    expect(isNetRosterChangeAllowed(locked, ["c0", "c1", "c7", "c8", "c9"], 2)).toBe(false);
  });

  it("measures against the previous roster's size, not a hardcoded five", () => {
    // A three-castaway roster with a one-swap allowance may change exactly one.
    expect(isNetRosterChangeAllowed(["a", "b", "c"], ["a", "b", "z"], 1)).toBe(true);
    expect(isNetRosterChangeAllowed(["a", "b", "c"], ["a", "y", "z"], 1)).toBe(false);
  });

  it("allows an unchanged roster under any allowance", () => {
    expect(isNetRosterChangeAllowed(locked, [...locked], 1)).toBe(true);
    expect(isNetRosterChangeAllowed(locked, [...locked], 2)).toBe(true);
  });
});
