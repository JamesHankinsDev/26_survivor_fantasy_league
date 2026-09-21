/**
 * Read-only: dump all leagues with member standings + per-week scores.
 * Also dumps castaway scoring events for the active season for distribution analysis.
 *
 * Usage: npx tsx scripts/dump-leagues.ts
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

async function main() {
  console.log("=== LEAGUES ===\n");
  const leagues = await db.collection("leagues").get();
  for (const doc of leagues.docs) {
    const d = doc.data();
    const members = (d.memberDetails ?? []) as Array<Record<string, unknown>>;
    console.log(`League: ${d.name} (${doc.id})`);
    console.log(
      `  status=${d.status}  members=${members.length}/${d.maxPlayers}  addDropRestrict=${d.addDropRestrictionEnabled}`
    );

    const ranked = [...members]
      .map((m) => ({
        name: (m.displayName ?? m.ownerName ?? m.userId) as string,
        total: (m.totalPoints ?? 0) as number,
        weeks: (m.weeklyRosters ?? []) as Array<Record<string, unknown>>,
        roster: (m.roster ?? []) as string[],
      }))
      .sort((a, b) => b.total - a.total);

    for (const r of ranked) {
      const weekStr = r.weeks
        .map((w) => `W${w.week}:${w.weekScore}`)
        .join(" ");
      console.log(
        `   ${r.total.toString().padStart(4)} pts  ${r.name.padEnd(24)}  ${weekStr}`
      );
    }
    console.log();
  }

  console.log("\n=== ACTIVE SEASON CASTAWAY SCORES ===\n");
  const seasons = await db.collection("seasons").get();
  for (const sDoc of seasons.docs) {
    const sData = sDoc.data();
    if (!sData.isActive) continue;
    console.log(`Season: ${sData.name ?? sDoc.id}`);
    const casts = await sDoc.ref.collection("castaways").get();
    const rows: Array<{
      name: string;
      total: number;
      eliminated: boolean;
      elimWeek?: number;
      events: Record<string, number>;
    }> = [];
    for (const c of casts.docs) {
      const cd = c.data();
      const events: Record<string, number> = {};
      const weekly = (cd.weeklyEvents ?? {}) as Record<
        string,
        Array<{ type?: string }>
      >;
      for (const ep of Object.values(weekly)) {
        for (const e of ep) {
          if (!e?.type) continue;
          events[e.type] = (events[e.type] ?? 0) + 1;
        }
      }
      rows.push({
        name: (cd.name ?? c.id) as string,
        total: (cd.totalPoints ?? 0) as number,
        eliminated: Boolean(cd.eliminated),
        elimWeek: cd.eliminatedWeek as number | undefined,
        events,
      });
    }
    rows.sort((a, b) => b.total - a.total);
    for (const r of rows) {
      const status = r.eliminated ? `OUT W${r.elimWeek}` : "alive";
      const evStr = Object.entries(r.events)
        .map(([k, v]) => `${k}:${v}`)
        .join(" ");
      console.log(
        `  ${r.total.toString().padStart(4)} pts [${status.padEnd(7)}] ${r.name.padEnd(22)} ${evStr}`
      );
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
