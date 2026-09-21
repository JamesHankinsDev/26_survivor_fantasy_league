/**
 * Tear down the QA test league + Test Season seeded by seed-test-league.ts.
 * Deletes leagues/test-league-qa and every doc under seasons/99/castaways.
 *
 * After running this, remove the temporary `number: 99` "Test Season" entry
 * from src/data/seasons.ts to restore normal season resolution.
 *
 * Usage:  npx tsx scripts/delete-test-league.ts
 */

import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { readFileSync } from "fs";
import { resolve } from "path";

const TEST_SEASON = 99;
const LEAGUE_ID = "test-league-qa";

const serviceAccountPath = resolve(import.meta.dirname, "..", "SERVICE_ACCOUNT_KEY.json");
const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, "utf-8"));
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

async function main() {
  // 1) Delete the league.
  await db.collection("leagues").doc(LEAGUE_ID).delete();
  console.log(`Deleted leagues/${LEAGUE_ID}`);

  // 2) Delete the test-season castaways, then the season doc if present.
  const castaways = await db
    .collection("seasons")
    .doc(String(TEST_SEASON))
    .collection("castaways")
    .get();
  let batch = db.batch();
  let n = 0;
  for (const d of castaways.docs) {
    batch.delete(d.ref);
    if (++n % 400 === 0) {
      await batch.commit();
      batch = db.batch();
    }
  }
  await batch.commit();
  console.log(`Deleted ${n} docs under seasons/${TEST_SEASON}/castaways`);

  await db.collection("seasons").doc(String(TEST_SEASON)).delete().catch(() => {});

  console.log(`\n✅ Teardown complete. Now remove the "number: 99" Test Season entry from src/data/seasons.ts.`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
