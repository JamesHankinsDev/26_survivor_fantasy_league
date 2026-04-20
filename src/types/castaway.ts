import { ScoringEvent } from "@/types/league";

export type InventoryItem =
  | "immunity_idol"
  | "extra_vote"
  | "steal_a_vote"
  | "lose_your_vote";

export type CastawayInventory = Record<InventoryItem, number>;

export const EMPTY_INVENTORY: CastawayInventory = {
  immunity_idol: 0,
  extra_vote: 0,
  steal_a_vote: 0,
  lose_your_vote: 0,
};

export const getInventory = (castaway: Castaway): CastawayInventory => ({
  ...EMPTY_INVENTORY,
  ...(castaway.inventory || {}),
});

export interface Castaway {
  id: string;
  name: string;
  image?: string;
  imageUrl?: string;
  bio?: string;
  seasonNumber?: number;
  totalPoints: number;
  eliminated: boolean;
  eliminatedWeek?: number;
  /** Scoring events keyed by episode number, e.g. { "1": [...], "2": [...] } */
  weeklyEvents: Record<string, ScoringEvent[]>;
  /** Manually-tracked advantages/idols. Optional — treat missing as all zero. */
  inventory?: Partial<CastawayInventory>;
}
