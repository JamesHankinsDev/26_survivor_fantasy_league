import { describe, it, expect } from "vitest";
import { RARITY_TIERS, rarityForPoints, rarityFor } from "./rarityTier";

describe("rarityForPoints", () => {
  it.each([
    [0, "common"],
    [14, "common"],
    [15, "rare"],
    [25, "rare"],
    [26, "epic"],
    [34, "epic"],
    [35, "legendary"],
    [44, "legendary"],
    [45, "mythic"],
    [999, "mythic"],
  ])("maps %i points → %s tier", (points, expected) => {
    expect(rarityForPoints(points).id).toBe(expected);
  });

  it("clamps negative points to Common", () => {
    expect(rarityForPoints(-3).id).toBe("common");
  });

  it("floors fractional points", () => {
    expect(rarityForPoints(14.9).id).toBe("common");
    expect(rarityForPoints(45.1).id).toBe("mythic");
  });

  it("returns the same tier instance for repeated lookups (no copy)", () => {
    expect(rarityForPoints(20)).toBe(RARITY_TIERS[1]);
  });
});

describe("rarityFor", () => {
  it("reads totalPoints off the castaway", () => {
    expect(rarityFor({ totalPoints: 50 }).id).toBe("mythic");
    expect(rarityFor({ totalPoints: 0 }).id).toBe("common");
  });

  it("treats undefined totalPoints as zero", () => {
    expect(rarityFor({ totalPoints: undefined as unknown as number }).id).toBe(
      "common",
    );
  });
});
