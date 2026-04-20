import { Castaway } from "@/types/castaway";

export interface CastawayBadges {
  /** Has earned a "made_jury" event at any point */
  jury: boolean;
  /** Has found more idols than they've used (i.e. currently holds one) */
  idol: boolean;
}

export const getCastawayBadges = (castaway: Castaway): CastawayBadges => {
  let foundIdols = 0;
  let usedIdols = 0;
  let jury = false;

  for (const events of Object.values(castaway.weeklyEvents || {})) {
    for (const e of events) {
      if (e.eventType === "made_jury") jury = true;
      else if (e.eventType === "found_idol") foundIdols += e.count;
      else if (e.eventType === "used_idol_successfully") usedIdols += e.count;
    }
  }

  return { jury, idol: foundIdols > usedIdols };
};
