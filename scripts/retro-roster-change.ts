/**
 * Retroactive roster swap for a single member.
 * Snapshots current state, then swaps one castaway in the member's current roster
 * AND in a specified weekly-roster snapshot, inside a Firestore transaction.
 *
 * Usage:
 *   npx tsx scripts/retro-roster-change.ts \
 *     --league <leagueId> --user <userId> \
 *     --drop <castawayId> --add <castawayId> --week <weekNumber> \
 *     [--commit]
 *
 * Without --commit this is a dry run (prints planned change, no write).
 */

import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { readFileSync, writeFileSync } from "fs";
import { resolve } from "path";

const serviceAccountPath = resolve(
  import.meta.dirname,
  "..",
  "SERVICE_ACCOUNT_KEY.json"
);
const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, "utf-8"));
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}
const leagueId = arg("league");
const userId = arg("user");
const dropId = arg("drop");
const addId = arg("add");
const weekArg = arg("week");
const commit = process.argv.includes("--commit");

if (!leagueId || !userId || !dropId || !addId || !weekArg) {
  console.error(
    "Usage: npx tsx scripts/retro-roster-change.ts --league <id> --user <id> --drop <castawayId> --add <castawayId> --week <n> [--commit]"
  );
  process.exit(1);
}
const week = Number(weekArg);

async function main() {
  const ref = db.collection("leagues").doc(leagueId!);

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw new Error(`League ${leagueId} not found`);
    const data = snap.data() as Record<string, unknown>;
    const members = [...((data.memberDetails ?? []) as Array<Record<string, unknown>>)];
    const idx = members.findIndex((m) => m.userId === userId);
    if (idx < 0) throw new Error(`User ${userId} not a member of league`);

    const member = { ...members[idx] } as Record<string, unknown>;

    const roster = [...((member.roster ?? []) as string[])];
    if (!roster.includes(dropId!)) {
      throw new Error(`Current roster does not contain ${dropId}. Have: ${JSON.stringify(roster)}`);
    }
    if (roster.includes(addId!)) {
      throw new Error(`Current roster already contains ${addId}`);
    }
    const newRoster = roster.map((c) => (c === dropId ? addId! : c));

    const weekly = [
      ...((member.weeklyRosters ?? []) as Array<Record<string, unknown>>),
    ];
    const wIdx = weekly.findIndex((w) => w.week === week);
    if (wIdx < 0) throw new Error(`No weeklyRosters entry for week ${week}`);
    const weekEntry = { ...weekly[wIdx] };
    const weekCastaways = [...((weekEntry.castawayIds ?? []) as string[])];
    if (!weekCastaways.includes(dropId!)) {
      throw new Error(
        `Week ${week} snapshot does not contain ${dropId}. Have: ${JSON.stringify(weekCastaways)}`
      );
    }
    if (weekCastaways.includes(addId!)) {
      throw new Error(`Week ${week} snapshot already contains ${addId}`);
    }
    if ((weekEntry.weekScore ?? 0) !== 0) {
      throw new Error(
        `Week ${week} already has a non-zero score (${weekEntry.weekScore}). Refusing to silently change scored data.`
      );
    }
    const newWeekCastaways = weekCastaways.map((c) => (c === dropId ? addId! : c));
    weekEntry.castawayIds = newWeekCastaways;
    weekly[wIdx] = weekEntry;

    member.roster = newRoster;
    member.weeklyRosters = weekly;
    members[idx] = member;

    // Snapshot BEFORE any mutation, to a file.
    const backupPath = resolve(
      import.meta.dirname,
      "..",
      `roster-backup-${leagueId}-${userId}-${Date.now()}.json`
    );
    writeFileSync(
      backupPath,
      JSON.stringify(
        {
          leagueId,
          userId,
          takenAt: new Date().toISOString(),
          memberBefore: (data.memberDetails as Array<Record<string, unknown>>)[idx],
          fullMemberDetailsBefore: data.memberDetails,
        },
        null,
        2
      )
    );
    console.log(`Backup written: ${backupPath}`);

    console.log("\nPlanned change for", member.displayName ?? member.name, `(${userId}):`);
    console.log("  current roster:", roster, "->", newRoster);
    console.log(`  week ${week} snapshot:`, weekCastaways, "->", newWeekCastaways);

    if (!commit) {
      console.log("\n(dry run — pass --commit to apply)");
      return;
    }

    tx.update(ref, { memberDetails: members, updatedAt: new Date() });
    console.log("\nTransaction committed.");
  });
}

main().catch((e) => {
  console.error("FAILED:", e.message ?? e);
  process.exit(1);
});
