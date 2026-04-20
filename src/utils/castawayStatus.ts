import { Castaway, CastawayInventory, getInventory } from "@/types/castaway";

export interface CastawayBadges {
  /** Has earned a "made_jury" event at any point */
  jury: boolean;
  /** Manually-tracked inventory (zeros if unset) */
  inventory: CastawayInventory;
}

export const getCastawayBadges = (castaway: Castaway): CastawayBadges => {
  let jury = false;
  for (const events of Object.values(castaway.weeklyEvents || {})) {
    for (const e of events) {
      if (e.eventType === "made_jury") jury = true;
    }
  }
  return { jury, inventory: getInventory(castaway) };
};
