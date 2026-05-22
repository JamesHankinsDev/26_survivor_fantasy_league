/**
 * Backfill `seasonNumber` onto every league doc that doesn't already carry one.
 *
 * Existing leagues all belong to Survivor 50 (the only season that's been
 * played so far), so anything missing the field gets `seasonNumber: 50`.
 *
 * Idempotent — safe to re-run.
 *
 * Usage:
 *   npx tsx scripts/backfill-league-season.ts
 *
 * Requires SERVICE_ACCOUNT_KEY.json in the project root.
 */

import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { readFileSync } from "fs";
import { resolve } from "path";

const DEFAULT_SEASON = 50;

const serviceAccountPath = resolve(
  import.meta.dirname,
  "..",
  "SERVICE_ACCOUNT_KEY.json",
);
const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, "utf-8"));

initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

async function backfill() {
  const snap = await db.collection("leagues").get();
  console.log(`Found ${snap.size} league doc(s).`);

  const needsUpdate: typeof snap.docs = [];
  let alreadyCorrect = 0;

  for (const d of snap.docs) {
    if (typeof d.data().seasonNumber === "number") {
      alreadyCorrect++;
    } else {
      needsUpdate.push(d);
    }
  }

  if (needsUpdate.length > 0) {
    const batch = db.batch();
    for (const d of needsUpdate) {
      batch.update(d.ref, { seasonNumber: DEFAULT_SEASON });
    }
    await batch.commit();
  }

  console.log(
    `Done. ${needsUpdate.length} updated to seasonNumber=${DEFAULT_SEASON}, ${alreadyCorrect} already correct.`,
  );
  process.exit(0);
}

backfill().catch((err) => {
  console.error("Backfill failed:", err);
  process.exit(1);
});
