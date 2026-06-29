import type { Castaway } from "@/types/castaway";
import type { ScoringEventType } from "@/types/league";
import { getScoringConfig } from "@/utils/seasonScoringConfig";
import { getEventLabel } from "@/utils/eventScoringConfig";

export interface CastawayEventRow {
  label: string;
  points: number;
}

/**
 * Aggregate a castaway's per-episode scoring events into a season-event
 * breakdown (one row per event type, with the points it contributed using the
 * season's scoring config). Used by the full-screen CardDetail sheet.
 *
 * Rows are sorted by point magnitude (biggest swings first), so "Voted Out"
 * and big positives surface at the top.
 */
export function castawayEventBreakdown(
  castaway: Castaway,
  seasonNumber: number,
): CastawayEventRow[] {
  const config = getScoringConfig(seasonNumber);
  const counts = new Map<ScoringEventType, number>();
  for (const events of Object.values(castaway.weeklyEvents ?? {})) {
    for (const e of events) {
      counts.set(e.eventType, (counts.get(e.eventType) ?? 0) + e.count);
    }
  }

  const rows: CastawayEventRow[] = [];
  for (const [type, count] of counts) {
    if (count === 0) continue;
    const points = (config[type] ?? 0) * count;
    const label = count > 1 ? `${getEventLabel(type)} ×${count}` : getEventLabel(type);
    rows.push({ label, points });
  }
  rows.sort((a, b) => Math.abs(b.points) - Math.abs(a.points));
  return rows;
}
