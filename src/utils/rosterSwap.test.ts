import { describe, it, expect } from "vitest";
import {
  applyRosterChange,
  getSwapsLeft,
  validateRosterSwap,
  type RosterSwapContext,
} from "./rosterSwap";
import { getRosterRules } from "./rosterRules";

const PRE_MERGE = getRosterRules(51, 3, 7);
const POST_MERGE = getRosterRules(51, 8, 7);

const ctx = (overrides: Partial<RosterSwapContext> = {}): RosterSwapContext => ({
  roster: ["a", "b", "c", "d", "e"],
  weeklyRosters: [{ week: 3, castawayIds: ["a", "b", "c", "d", "e"], weekScore: 0, lockedAt: null }],
  rules: PRE_MERGE,
  restrictionEnabled: true,
  seasonStarted: true,
  seasonCastawayIds: new Set(["a", "b", "c", "d", "e", "f", "g", "h", "x"]),
  eliminatedIds: new Set(["x"]),
  ...overrides,
});

describe("validateRosterSwap", () => {
  it("applies a straight swap", () => {
    expect(validateRosterSwap("a", "f", ctx())).toEqual({
      ok: true,
      roster: ["b", "c", "d", "e", "f"],
    });
  });

  it("rejects an empty change", () => {
    expect(validateRosterSwap(null, null, ctx()).ok).toBe(false);
  });

  it("requires a drafted tribe", () => {
    expect(validateRosterSwap(null, "f", ctx({ roster: [] })).ok).toBe(false);
  });

  it("rejects dropping someone not on the tribe", () => {
    expect(validateRosterSwap("f", "g", ctx()).ok).toBe(false);
  });

  it("rejects adding a castaway from another season", () => {
    expect(validateRosterSwap("a", "zzz", ctx()).ok).toBe(false);
  });

  it("rejects adding someone already rostered or voted out", () => {
    expect(validateRosterSwap("a", "b", ctx()).ok).toBe(false);
    expect(validateRosterSwap("a", "x", ctx()).ok).toBe(false);
  });

  it("rejects adding to a full tribe without a drop", () => {
    expect(validateRosterSwap(null, "f", ctx()).ok).toBe(false);
  });

  it("allows two swaps pre-merge but not three", () => {
    const afterTwo = ctx({ roster: ["c", "d", "e", "f", "g"] });
    expect(validateRosterSwap("c", "h", afterTwo).ok).toBe(false);
    expect(validateRosterSwap("a", "f", ctx({ roster: ["b", "c", "d", "e", "g"] })).ok).toBe(
      false,
    );
    expect(validateRosterSwap("b", "g", ctx({ roster: ["b", "c", "d", "e", "f"] })).ok).toBe(true);
  });

  it("allows one swap post-merge, and swapping back frees it", () => {
    const spent = ctx({ rules: POST_MERGE, roster: ["b", "c", "d", "e", "f"] });
    expect(validateRosterSwap("b", "g", spent).ok).toBe(false);
    expect(validateRosterSwap("f", "g", spent).ok).toBe(true);
  });

  it("blocks dropping a voted-out castaway post-merge only", () => {
    const withOut = { roster: ["a", "b", "c", "d", "x"], seasonCastawayIds: new Set(["a", "b", "c", "d", "x", "f"]) };
    expect(validateRosterSwap("x", "f", ctx({ ...withOut, rules: POST_MERGE })).ok).toBe(false);
    expect(validateRosterSwap("x", "f", ctx({ ...withOut, rules: PRE_MERGE })).ok).toBe(true);
  });

  it("skips the weekly limit when restriction is off or the season hasn't started", () => {
    const threeSwaps = ctx({ roster: ["d", "e", "f", "g", "c"] });
    expect(validateRosterSwap("c", "h", threeSwaps).ok).toBe(false);
    expect(validateRosterSwap("c", "h", { ...threeSwaps, restrictionEnabled: false }).ok).toBe(true);
    expect(validateRosterSwap("c", "h", { ...threeSwaps, seasonStarted: false }).ok).toBe(true);
  });
});

describe("getSwapsLeft", () => {
  const locked = [{ week: 3, castawayIds: ["a", "b", "c", "d", "e"], weekScore: 0, lockedAt: null }];

  it("counts castaways added since the last lock", () => {
    expect(getSwapsLeft(["a", "b", "c", "d", "f"], locked, PRE_MERGE, true)).toBe(1);
    expect(getSwapsLeft(["a", "b", "c", "g", "f"], locked, PRE_MERGE, true)).toBe(0);
  });

  it("is null when the league doesn't restrict add/drop", () => {
    expect(getSwapsLeft(["a"], locked, PRE_MERGE, false)).toBeNull();
  });
});

describe("applyRosterChange", () => {
  it("applies several drops and adds at once", () => {
    expect(applyRosterChange(["a", "b", "c"], ["a", "b"], ["f", "g"])).toEqual({
      ok: true,
      roster: ["c", "f", "g"],
    });
  });

  it("rejects a change staged against a roster that has since moved on", () => {
    // The first swap (a → f) already saved; replaying it from a stale copy fails
    // instead of silently reverting it.
    expect(applyRosterChange(["b", "c", "f"], ["a"], ["f"]).ok).toBe(false);
  });

  it("rejects an empty or duplicated change", () => {
    expect(applyRosterChange(["a"], [], []).ok).toBe(false);
    expect(applyRosterChange(["a", "b"], ["a", "b"], ["f", "f"]).ok).toBe(false);
  });
});
