/**
 * Retroactively re-score the live league using S51 rules:
 *  - voted_out: -10 -> -5
 *  - survived_episode: +1 -> 0 (removed)
 *  - weekly score floor of 0
 *  - all other event values unchanged
 *
 * Excludes: Captain (×2), Pick-em, Saved roster spot — those need new data.
 *
 * Usage: npx tsx scripts/retro-score.ts <leagueId> [seasonNumber]
 */

import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { readFileSync } from "fs";
import { resolve } from "path";

const serviceAccountPath = resolve(
  import.meta.dirname,
  "..",
  "SERVICE_ACCOUNT_KEY.json"
);
const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, "utf-8"));

initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

const OLD_SCORING: Record<string, number> = {
  immunity_win: 5,
  team_challenge_win: 3,
  found_idol: 5,
  used_idol_successfully: 3,
  voted_at_tribal: 3,
  survived_episode: 1,
  fire_making_win: 5,
  made_final_three: 5,
  season_winner: 10,
  made_jury: 3,
  voted_out: -10,
};

const NEW_SCORING: Record<string, number> = {
  immunity_win: 5,
  team_challenge_win: 3,
  found_idol: 5,
  used_idol_successfully: 3,
  voted_at_tribal: 3,
  survived_episode: 0, // removed
  fire_making_win: 5,
  made_final_three: 10, // doubled
  season_winner: 25, // boosted
  made_jury: 3,
  voted_out: -5, // halved
};

const [leagueId, seasonArg] = process.argv.slice(2);
if (!leagueId) {
  console.error("Usage: npx tsx scripts/retro-score.ts <leagueId> [seasonNumber]");
  process.exit(1);
}
const seasonNumber = seasonArg ?? "50";

interface ScoringEvent {
  eventType: string;
  count: number;
}

async function main() {
  const lDoc = await db.collection("leagues").doc(leagueId).get();
  if (!lDoc.exists) {
    console.error("League not found");
    process.exit(1);
  }
  const ld = lDoc.data() as Record<string, unknown>;
  const members = (ld.memberDetails ?? []) as Array<Record<string, unknown>>;

  // Pull every castaway's weeklyEvents
  const castSnap = await db
    .collection("seasons")
    .doc(seasonNumber)
    .collection("castaways")
    .get();
  const castEvents: Record<string, Record<string, ScoringEvent[]>> = {};
  for (const c of castSnap.docs) {
    const cd = c.data();
    castEvents[c.id] = (cd.weeklyEvents ?? {}) as Record<string, ScoringEvent[]>;
  }

  function scoreEvents(events: ScoringEvent[], scoring: Record<string, number>) {
    let s = 0;
    for (const e of events) s += (scoring[e.eventType] ?? 0) * (e.count ?? 1);
    return s;
  }

  type Row = {
    name: string;
    oldTotal: number;
    newTotal: number;
    oldWeeks: { week: number; score: number }[];
    newWeeks: { week: number; score: number }[];
  };

  const rows: Row[] = [];
  for (const m of members) {
    const name = (m.displayName ?? m.ownerName ?? m.userId) as string;
    const weekly = (m.weeklyRosters ?? []) as Array<{
      week: number;
      castawayIds: string[];
    }>;
    const oldWeeks: { week: number; score: number }[] = [];
    const newWeeks: { week: number; score: number }[] = [];

    for (const w of weekly) {
      // Only include weeks the production leaderboard credits (skip W2-W3 ghost-zero weeks)
      const liveWeekScore = (w as unknown as { weekScore?: number }).weekScore ?? 0;
      if (w.week < 4) continue;

      let oldScore = 0;
      let newScore = 0;
      for (const cid of w.castawayIds) {
        const events = castEvents[cid]?.[w.week.toString()] ?? [];
        oldScore += scoreEvents(events, OLD_SCORING);
        newScore += scoreEvents(events, NEW_SCORING);
      }
      // S51 weekly score floor of 0
      const newFloored = Math.max(0, newScore);
      oldWeeks.push({ week: w.week, score: liveWeekScore });
      newWeeks.push({ week: w.week, score: newFloored });
      void oldScore;
    }

    rows.push({
      name,
      oldTotal: oldWeeks.reduce((a, b) => a + b.score, 0),
      newTotal: newWeeks.reduce((a, b) => a + b.score, 0),
      oldWeeks,
      newWeeks,
    });
  }

  // Sort by old totals to show original ranking, then re-rank by new
  const oldRanked = [...rows].sort((a, b) => b.oldTotal - a.oldTotal);
  const newRanked = [...rows].sort((a, b) => b.newTotal - a.newTotal);
  const oldRank = new Map(oldRanked.map((r, i) => [r.name, i + 1]));
  const newRank = new Map(newRanked.map((r, i) => [r.name, i + 1]));

  console.log("\n=== ORIGINAL S50 STANDINGS (current rules) ===\n");
  for (const r of oldRanked) {
    const ws = r.oldWeeks.map((w) => `W${w.week}:${w.score}`).join(" ");
    console.log(
      `  ${oldRank.get(r.name)}. ${r.oldTotal.toString().padStart(3)} pts  ${r.name.padEnd(22)}  ${ws}`
    );
  }

  console.log("\n=== RETROACTIVE S51 STANDINGS (new scoring + floor) ===\n");
  for (const r of newRanked) {
    const ws = r.newWeeks.map((w) => `W${w.week}:${w.score}`).join(" ");
    const delta = r.newTotal - r.oldTotal;
    const rankShift = (oldRank.get(r.name) ?? 0) - (newRank.get(r.name) ?? 0);
    const shiftStr =
      rankShift > 0 ? `↑${rankShift}` : rankShift < 0 ? `↓${-rankShift}` : "—";
    console.log(
      `  ${newRank.get(r.name)}. ${r.newTotal.toString().padStart(3)} pts (Δ${delta >= 0 ? "+" : ""}${delta}, rank ${shiftStr})  ${r.name.padEnd(22)}  ${ws}`
    );
  }

  console.log("\n=== SUMMARY ===\n");
  const oldSpread = oldRanked[0].oldTotal - oldRanked[oldRanked.length - 1].oldTotal;
  const newSpread = newRanked[0].newTotal - newRanked[newRanked.length - 1].newTotal;
  const oldGapToLast =
    oldRanked[oldRanked.length - 2].oldTotal - oldRanked[oldRanked.length - 1].oldTotal;
  const newGapToLast =
    newRanked[newRanked.length - 2].newTotal - newRanked[newRanked.length - 1].newTotal;

  console.log(`  Old spread (1st-8th): ${oldSpread} pts`);
  console.log(`  New spread (1st-8th): ${newSpread} pts`);
  console.log(`  Old gap (7th-8th):    ${oldGapToLast} pts`);
  console.log(`  New gap (7th-8th):    ${newGapToLast} pts`);

  // Identify the cliff between contenders and the bottom
  console.log("\n  Largest rank-to-rank gap:");
  for (const ranked of [
    { label: "Old", arr: oldRanked, key: "oldTotal" as const },
    { label: "New", arr: newRanked, key: "newTotal" as const },
  ]) {
    let maxGap = 0;
    let maxAt = 0;
    for (let i = 0; i < ranked.arr.length - 1; i++) {
      const gap = ranked.arr[i][ranked.key] - ranked.arr[i + 1][ranked.key];
      if (gap > maxGap) {
        maxGap = gap;
        maxAt = i;
      }
    }
    console.log(
      `    ${ranked.label}: ${maxGap} pts between rank ${maxAt + 1} and ${maxAt + 2}`
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
