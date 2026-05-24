import type { Castaway } from "@/types/castaway";

/**
 * Trading-card rarity ladder used by the redesign's <TradingCard />.
 *
 * Distinct from the legacy `src/utils/cardRarity.ts` which still powers the
 * old `<CastawayCard />` on the Castaways + Hall of Fame pages. The two
 * helpers can coexist until later phases migrate every callsite onto the new
 * card and the legacy module gets deleted.
 *
 * Tier thresholds and border/chip values come from the design handoff
 * (`phases/01_trading_cards/README.md`).
 */
export type RarityTierId =
  | "common"
  | "rare"
  | "epic"
  | "legendary"
  | "mythic";

export interface RarityTier {
  id: RarityTierId;
  label: string;
  /** Lowest total-points value that maps to this tier (inclusive). */
  min: number;
  /** Highest total-points value that maps to this tier (inclusive). */
  max: number;
  /** CSS gradient painted into the card border + header band. */
  border: string;
  /** Solid accent color used by the footer rarity chip. */
  chip: string;
}

export const RARITY_TIERS: RarityTier[] = [
  {
    id: "common",
    label: "Common",
    min: 0,
    max: 14,
    border: "linear-gradient(135deg, #B0AAA0, #8C8579)",
    chip: "#8C8579",
  },
  {
    id: "rare",
    label: "Rare",
    min: 15,
    max: 25,
    border: "linear-gradient(135deg, #6FB1E6, #3E7AB8)",
    chip: "#3E7AB8",
  },
  {
    id: "epic",
    label: "Epic",
    min: 26,
    max: 34,
    border: "linear-gradient(135deg, #B589E6, #7A5AE0)",
    chip: "#7A5AE0",
  },
  {
    id: "legendary",
    label: "Legendary",
    min: 35,
    max: 44,
    border: "linear-gradient(135deg, #F5C44A, #C8851B 50%, #F5C44A)",
    chip: "#C8851B",
  },
  {
    id: "mythic",
    label: "Mythic",
    min: 45,
    max: Number.POSITIVE_INFINITY,
    border:
      "linear-gradient(135deg, #FF6B6B, #FFD93D 25%, #6BCB77 50%, #4D96FF 75%, #B86BFF)",
    chip: "#B86BFF",
  },
];

/** Resolve a rarity tier from a raw point total. Clamps below 0 to Common. */
export function rarityForPoints(points: number): RarityTier {
  const clamped = Math.max(0, Math.floor(points));
  const match = RARITY_TIERS.find((t) => clamped >= t.min && clamped <= t.max);
  // `find` will always match because Mythic.max is +Infinity, but TS doesn't
  // know that — fall back to Common to keep the return non-nullable.
  return match ?? RARITY_TIERS[0];
}

/** Convenience: derive a rarity tier from a Castaway (uses `totalPoints`). */
export function rarityFor(castaway: Pick<Castaway, "totalPoints">): RarityTier {
  return rarityForPoints(castaway.totalPoints ?? 0);
}
