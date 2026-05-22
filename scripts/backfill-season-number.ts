/**
 * Backfill `seasonNumber` onto every castaway doc in `seasons/{N}/castaways/*`.
 *
 * The Hall of Fame uses a Firestore collection group query across all castaway
 * subcollections. Carrying `seasonNumber` on the doc itself avoids a parent-ref
 * walk per result.
 *
 * Idempotent — only writes the field when missing or when it doesn't match the
 * parent path. Safe to re-run.
 *
 * Usage:
 *   npx tsx scripts/backfill-season-number.ts
 *
 * Requires SERVICE_ACCOUNT_KEY.json in the project root.
 */

import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { readFileSync } from "fs";
import { resolve } from "path";

const serviceAccountPath = resolve(
  import.meta.dirname,
  "..",
  "SERVICE_ACCOUNT_KEY.json",
);
const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, "utf-8"));

initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

async function backfill() {
  // Collection group query — finds every doc under any `castaways` subcollection,
  // independent of whether the parent season doc exists at `seasons/{N}`.
  const snap = await db.collectionGroup("castaways").get();
  console.log(`Found ${snap.size} castaway doc(s) across all seasons.`);

  // Bucket by season for clean logging and to skip docs that already have the field.
  const bySeason = new Map<string, { needsUpdate: typeof snap.docs; alreadyCorrect: number }>();

  for (const c of snap.docs) {
    const parentDocId = c.ref.parent.parent?.id;
    if (!parentDocId) {
      console.warn(`  Skipping ${c.ref.path} — could not determine parent season id`);
      continue;
    }
    const seasonNumber = parseInt(parentDocId, 10);
    if (Number.isNaN(seasonNumber)) {
      console.warn(`  Skipping ${c.ref.path} — non-numeric season id "${parentDocId}"`);
      continue;
    }

    if (!bySeason.has(parentDocId)) {
      bySeason.set(parentDocId, { needsUpdate: [], alreadyCorrect: 0 });
    }
    const bucket = bySeason.get(parentDocId)!;

    if (c.data().seasonNumber === seasonNumber) {
      bucket.alreadyCorrect++;
    } else {
      bucket.needsUpdate.push(c);
    }
  }

  let totalUpdated = 0;
  let totalSkipped = 0;

  for (const [seasonId, bucket] of bySeason) {
    const seasonNumber = parseInt(seasonId, 10);
    if (bucket.needsUpdate.length > 0) {
      const batch = db.batch();
      for (const c of bucket.needsUpdate) batch.update(c.ref, { seasonNumber });
      await batch.commit();
    }
    console.log(
      `  seasons/${seasonId}: ${bucket.needsUpdate.length} updated, ${bucket.alreadyCorrect} already correct`,
    );
    totalUpdated += bucket.needsUpdate.length;
    totalSkipped += bucket.alreadyCorrect;
  }

  console.log(`\nDone. ${totalUpdated} updated, ${totalSkipped} skipped.`);
  process.exit(0);
}

backfill().catch((err) => {
  console.error("Backfill failed:", err);
  process.exit(1);
});
