/**
 * Reset a single member back to the pre-draft "Open My Pack" state in the
 * QA Test League. Clears roster / dealtHand / dealtAt / draftedAt, zeroes
 * totalPoints, and empties weeklyRosters — matching how seed-test-league.ts
 * creates an undrafted member. Backs up the member doc before writing.
 *
 * Usage:
 *   npx tsx scripts/reset-my-draft.ts [ownerEmail] [--commit]
 * Without --commit this is a dry run.
 */
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { readFileSync, writeFileSync } from "fs";
import { resolve } from "path";

const LEAGUE_ID = "test-league-qa";
const DEFAULT_OWNER_EMAIL = "hankins.jamesb@gmail.com";

const serviceAccountPath = resolve(import.meta.dirname, "..", "SERVICE_ACCOUNT_KEY.json");
const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, "utf-8"));
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();
const auth = getAuth();

const commit = process.argv.includes("--commit");
const ownerEmail =
  process.argv.slice(2).find((a) => !a.startsWith("--")) || DEFAULT_OWNER_EMAIL;

async function main() {
  const owner = await auth.getUserByEmail(ownerEmail);
  console.log(`Owner: ${ownerEmail}  uid=${owner.uid}`);

  const ref = db.collection("leagues").doc(LEAGUE_ID);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw new Error(`League ${LEAGUE_ID} not found`);
    const data = snap.data() as Record<string, unknown>;
    const members = [...((data.memberDetails ?? []) as Array<Record<string, unknown>>)];
    const idx = members.findIndex((m) => m.userId === owner.uid);
    if (idx < 0) throw new Error(`User ${owner.uid} not a member of ${LEAGUE_ID}`);

    const before = members[idx];
    console.log("\n=== BEFORE ===");
    console.log("displayName:  ", before.displayName);
    console.log("roster:       ", JSON.stringify(before.roster));
    console.log("dealtHand:    ", JSON.stringify(before.dealtHand));
    console.log("totalPoints:  ", before.totalPoints);
    console.log("weeklyRosters:", JSON.stringify(before.weeklyRosters));

    const reset = { ...before };
    delete (reset as Record<string, unknown>).dealtHand;
    delete (reset as Record<string, unknown>).dealtAt;
    delete (reset as Record<string, unknown>).draftedAt;
    reset.roster = [];
    reset.weeklyRosters = [];
    reset.totalPoints = 0;
    members[idx] = reset;

    console.log("\n=== AFTER (planned) ===");
    console.log("roster:        [] (→ 'Open My Pack' shows)");
    console.log("dealtHand:     (removed → fresh pack dealt)");
    console.log("draftedAt:     (removed)");
    console.log("totalPoints:   0");
    console.log("weeklyRosters: []");

    if (!commit) {
      console.log("\n(dry run — pass --commit to apply)");
      return;
    }

    const backupPath = resolve(
      import.meta.dirname,
      "..",
      `roster-backup-${LEAGUE_ID}-${owner.uid}-reset-${Math.floor(new Date().getTime())}.json`,
    );
    writeFileSync(
      backupPath,
      JSON.stringify(
        { leagueId: LEAGUE_ID, userId: owner.uid, takenAt: new Date().toISOString(), memberBefore: before },
        null,
        2,
      ),
    );
    console.log(`\nBackup written: ${backupPath}`);

    tx.update(ref, { memberDetails: members, updatedAt: new Date() });
    console.log("Transaction committed. You are back to the pack-opening phase.");
  });
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("FAILED:", e.message ?? e);
    process.exit(1);
  });
