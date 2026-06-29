import { describe, it, expect } from "vitest";
import { hashSeed, seededSample } from "./seededDeal";

const POOL = Array.from({ length: 18 }, (_, i) => `c${i}`);

describe("hashSeed", () => {
  it("is deterministic for the same input", () => {
    expect(hashSeed("user-a|league-1|51")).toBe(hashSeed("user-a|league-1|51"));
  });

  it("differs across members / leagues / seasons", () => {
    const a = hashSeed("user-a|league-1|51");
    const b = hashSeed("user-b|league-1|51");
    const c = hashSeed("user-a|league-2|51");
    const d = hashSeed("user-a|league-1|52");
    expect(new Set([a, b, c, d]).size).toBe(4);
  });

  it("returns a finite unsigned integer", () => {
    const h = hashSeed("anything");
    expect(Number.isInteger(h)).toBe(true);
    expect(h).toBeGreaterThanOrEqual(0);
  });
});

describe("seededSample", () => {
  it("returns the same hand for the same seed (no reroll)", () => {
    const seed = hashSeed("user-a|league-1|51");
    const first = seededSample(POOL, 7, seed);
    const second = seededSample(POOL, 7, seed);
    expect(first).toEqual(second);
    expect(first).toHaveLength(7);
  });

  it("returns different hands for different seeds (usually)", () => {
    const a = seededSample(POOL, 7, hashSeed("user-a|league-1|51"));
    const b = seededSample(POOL, 7, hashSeed("user-b|league-1|51"));
    expect(a).not.toEqual(b);
  });

  it("only draws from the pool, without duplicates", () => {
    const hand = seededSample(POOL, 7, 12345);
    expect(new Set(hand).size).toBe(hand.length);
    hand.forEach((c) => expect(POOL).toContain(c));
  });

  it("clamps count to the pool size", () => {
    expect(seededSample(POOL.slice(0, 4), 7, 1)).toHaveLength(4);
    expect(seededSample([], 7, 1)).toHaveLength(0);
  });

  it("does not mutate the input array", () => {
    const pool = POOL.slice();
    seededSample(pool, 7, 999);
    expect(pool).toEqual(POOL);
  });
});
