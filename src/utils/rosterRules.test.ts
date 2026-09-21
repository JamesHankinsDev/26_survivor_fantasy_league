import { describe, it, expect } from "vitest";
import { getRosterRules, isPostMerge } from "./rosterRules";

describe("isPostMerge", () => {
  it("is false before the merge week", () => {
    expect(isPostMerge(6, 7)).toBe(false);
  });

  it("is true from the merge week onward — the merge episode itself counts", () => {
    expect(isPostMerge(7, 7)).toBe(true);
    expect(isPostMerge(12, 7)).toBe(true);
  });

  it("is never true when the merge week is unset", () => {
    expect(isPostMerge(12, undefined)).toBe(false);
    expect(isPostMerge(12, null)).toBe(false);
  });

  it("is never true when the week is unknown", () => {
    expect(isPostMerge(null, 7)).toBe(false);
    expect(isPostMerge(undefined, 7)).toBe(false);
  });
});

describe("getRosterRules", () => {
  it("gives pre-S51 seasons the legacy single swap and no dropping the dead", () => {
    const rules = getRosterRules(50, 3, 7);
    expect(rules).toEqual({
      swapsPerWeek: 1,
      canDropEliminated: false,
      isPostMerge: false,
    });
  });

  it("keeps legacy rules for S50 even after its merge week", () => {
    expect(getRosterRules(50, 9, 7).swapsPerWeek).toBe(1);
    expect(getRosterRules(50, 9, 7).canDropEliminated).toBe(false);
  });

  it("S51 pre-merge: 2 swaps and voted-out castaways are droppable", () => {
    const rules = getRosterRules(51, 3, 7);
    expect(rules.swapsPerWeek).toBe(2);
    expect(rules.canDropEliminated).toBe(true);
    expect(rules.isPostMerge).toBe(false);
  });

  it("S51 post-merge: 1 swap and voted-out castaways become dead weight", () => {
    const rules = getRosterRules(51, 7, 7);
    expect(rules.swapsPerWeek).toBe(1);
    expect(rules.canDropEliminated).toBe(false);
    expect(rules.isPostMerge).toBe(true);
  });

  it("an unset merge week stays pre-merge — never silently locks rosters", () => {
    // This is the live S51 configuration until a merge week is entered.
    const rules = getRosterRules(51, 12, undefined);
    expect(rules.swapsPerWeek).toBe(2);
    expect(rules.canDropEliminated).toBe(true);
    expect(rules.isPostMerge).toBe(false);
  });

  it("treats an unknown week as pre-merge, the permissive side", () => {
    const rules = getRosterRules(51, null, 7);
    expect(rules.swapsPerWeek).toBe(2);
    expect(rules.canDropEliminated).toBe(true);
  });

  it("applies the new rules to seasons after 51 too", () => {
    expect(getRosterRules(52, 3, 7).swapsPerWeek).toBe(2);
    expect(getRosterRules(52, 8, 7).swapsPerWeek).toBe(1);
  });
});
