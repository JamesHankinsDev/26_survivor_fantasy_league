/**
 * Seed a QA test league + a "Test Season" (number 99) for exercising the
 * design-refresh features (pack-open draft, mini-grid detail, leaderboard
 * podium, add/drop).
 *
 *   - Copies the Season 50 cast into seasons/99/castaways/* with everyone
 *     un-eliminated, so the "deal 7, discard 2" draft has a full pool.
 *   - Creates a fixed league `test-league-qa` owned by you, where YOU are an
 *     undrafted member (so you immediately see "Open My Pack") and four bot
 *     tribes are pre-drafted with varied points (so the standings/podium fill).
 *
 * Pairs with the temporary active "Test Season" entry (number 99) in
 * src/data/seasons.ts. Re-runnable (idempotent — overwrites by fixed ids).
 *
 * Usage:  npx tsx scripts/seed-test-league.ts [ownerEmail]
 * Teardown:  npx tsx scripts/delete-test-league.ts   (then remove season 99 from seasons.ts)
 */

import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { readFileSync } from "fs";
import { resolve } from "path";

const SOURCE_SEASON = 50;
const TEST_SEASON = 99;
const LEAGUE_ID = "test-league-qa";
const JOIN_CODE = "QATEST";
const DEFAULT_OWNER_EMAIL = "hankins.jamesb@gmail.com";

const serviceAccountPath = resolve(import.meta.dirname, "..", "SERVICE_ACCOUNT_KEY.json");
const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, "utf-8"));
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();
const auth = getAuth();

const BOTS = [
  { userId: "qa-bot-aria", displayName: "Coconut Cartel", ownerName: "Aria (bot)", tribeColor: "#E76F3C", totalPoints: 96 },
  { userId: "qa-bot-milo", displayName: "Idol Hands", ownerName: "Milo (bot)", tribeColor: "#3B8E6E", totalPoints: 81 },
  { userId: "qa-bot-nova", displayName: "Snuffed Out", ownerName: "Nova (bot)", tribeColor: "#7A5AE0", totalPoints: 67 },
  { userId: "qa-bot-rex", displayName: "Merge Mercenaries", ownerName: "Rex (bot)", tribeColor: "#C8871B", totalPoints: 52 },
];

async function main() {
  const ownerEmail = process.argv[2] || DEFAULT_OWNER_EMAIL;
  console.log(`\nLooking up owner by email: ${ownerEmail}`);
  const owner = await auth.getUserByEmail(ownerEmail);
  const ownerName = owner.displayName || ownerEmail;
  console.log(`  → uid=${owner.uid}  name=${ownerName}`);

  // 1) Copy the source cast into the test season, all un-eliminated.
  console.log(`\nCopying season ${SOURCE_SEASON} cast → season ${TEST_SEASON} (all alive)…`);
  const srcCast = await db.collection("seasons").doc(String(SOURCE_SEASON)).collection("castaways").get();
  if (srcCast.empty) throw new Error(`No castaways found under seasons/${SOURCE_SEASON}/castaways`);

  const destCol = db.collection("seasons").doc(String(TEST_SEASON)).collection("castaways");
  let batch = db.batch();
  const aliveIds: { id: string; points: number }[] = [];
  let n = 0;
  for (const d of srcCast.docs) {
    const data = d.data();
    // Strip end-of-game state so they read as active + draftable.
    const { eliminatedWeek: _drop, ...rest } = data as Record<string, unknown>;
    void _drop;
    batch.set(destCol.doc(d.id), {
      ...rest,
      seasonNumber: TEST_SEASON,
      eliminated: false,
    });
    aliveIds.push({ id: d.id, points: Number(data.totalPoints) || 0 });
    if (++n % 400 === 0) {
      await batch.commit();
      batch = db.batch();
    }
  }
  await batch.commit();
  console.log(`  → wrote ${n} castaways to seasons/${TEST_SEASON}/castaways`);

  // Highest-scoring castaways make the most legible podium "best cards".
  const ranked = aliveIds.sort((a, b) => b.points - a.points).map((c) => c.id);
  const pick5 = (offset: number) => {
    const out: string[] = [];
    for (let i = 0; i < 5; i++) out.push(ranked[(offset + i) % ranked.length]);
    return out;
  };

  // 2) Build members: you (undrafted) + bots (drafted, varied points).
  const now = new Date();
  const startDate = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000); // 2 weeks ago

  const memberDetails = [
    {
      userId: owner.uid,
      displayName: ownerName,
      ownerName,
      avatar: owner.photoURL || "",
      tribeColor: "#E76F3C",
      totalPoints: 0,
      roster: [] as string[], // ← undrafted → triggers the pack draft
      weeklyRosters: [],
      joinedAt: now,
    },
    ...BOTS.map((b, i) => ({
      userId: b.userId,
      displayName: b.displayName,
      ownerName: b.ownerName,
      avatar: "",
      tribeColor: b.tribeColor,
      totalPoints: b.totalPoints,
      roster: pick5(i * 3),
      weeklyRosters: [], // empty → standings uses the stored totalPoints above
      draftedAt: now,
      joinedAt: now,
    })),
  ];

  const league = {
    name: "🧪 QA Test League",
    ownerId: owner.uid,
    ownerName,
    maxPlayers: 8,
    currentPlayers: memberDetails.length,
    joinCode: JOIN_CODE,
    members: memberDetails.map((m) => m.userId),
    memberDetails,
    createdAt: now,
    updatedAt: now,
    status: "active" as const,
    addDropRestrictionEnabled: false,
    leagueStartDate: startDate.toISOString(),
    seasonNumber: TEST_SEASON,
  };

  await db.collection("leagues").doc(LEAGUE_ID).set(league);

  console.log(`\n✅ Seeded league "${league.name}" (id: ${LEAGUE_ID})`);
  console.log(`   Open:   /dashboard/my-leagues/${LEAGUE_ID}`);
  console.log(`   Join code: ${JOIN_CODE}  ·  Season: ${TEST_SEASON}  ·  ${memberDetails.length} tribes`);
  console.log(`   You are UNDRAFTED → "Open My Pack" appears on the league page.`);
  console.log(`\n   Make sure season 99 is the active entry in src/data/seasons.ts, then run \`npm run dev\`.`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
