/**
 * Deterministic dealing for the season-start "starter pack".
 *
 * The draft deals a random hand, but the deal must be *stable*: a refresh must
 * never reroll a better hand. We get there with a seeded PRNG so the same
 * (member, league, season) always produces the same hand, and the caller then
 * persists the result so it can never change even if the eligible pool does.
 *
 * No dependencies — `Math.random` is intentionally avoided so the deal is
 * reproducible and auditable.
 */

/** cyrb53 string hash → a 32-bit-ish unsigned seed. */
export function hashSeed(input: string): number {
  let h1 = 0xdeadbeef ^ input.length;
  let h2 = 0x41c6ce57 ^ input.length;
  for (let i = 0; i < input.length; i++) {
    const ch = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  // 53-bit result folded into an unsigned 32-bit seed for mulberry32.
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)) % 4294967296;
}

/** mulberry32 — small fast seeded PRNG returning floats in [0, 1). */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Pick `count` items from `items` deterministically given a numeric `seed`.
 * Uses a seeded Fisher–Yates partial shuffle over a copy; never mutates input.
 * Returns at most `items.length` items (when `count` exceeds the pool).
 */
export function seededSample<T>(items: readonly T[], count: number, seed: number): T[] {
  const pool = items.slice();
  const n = Math.max(0, Math.min(count, pool.length));
  const rand = mulberry32(seed);
  for (let i = 0; i < n; i++) {
    const j = i + Math.floor(rand() * (pool.length - i));
    const tmp = pool[i];
    pool[i] = pool[j];
    pool[j] = tmp;
  }
  return pool.slice(0, n);
}
