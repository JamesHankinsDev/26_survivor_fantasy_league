/**
 * Read-only inspection: dump a member's roster state and lock history.
 *
 * Usage:
 *   npx tsx scripts/inspect-roster.ts <leagueId> <userId>
 */

import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
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

const [leagueId, userId] = process.argv.slice(2);
if (!leagueId || !userId) {
  console.error("Usage: npx tsx scripts/inspect-roster.ts <leagueId> <userId>");
  process.exit(1);
}

function fmt(ts: unknown): string {
  if (!ts) return "(none)";
  if (ts instanceof Timestamp) return ts.toDate().toISOString();
  if (typeof ts === "object" && ts !== null && "_seconds" in ts) {
    const s = (ts as { _seconds: number })._seconds;
    return new Date(s * 1000).toISOString();
  }
  if (ts instanceof Date) return ts.toISOString();
  return String(ts);
}

async function main() {
  const ref = db.collection("leagues").doc(leagueId);
  const snap = await ref.get();
  if (!snap.exists) {
    console.error(`League ${leagueId} not found`);
    process.exit(1);
  }
  const data = snap.data() as Record<string, unknown>;

  console.log("=== LEAGUE ===");
  console.log("id:        ", leagueId);
  console.log("name:      ", data.name);
  console.log("currentWeek:", data.currentWeek);
  console.log("updatedAt: ", fmt(data.updatedAt));
  console.log("createdAt: ", fmt(data.createdAt));

  const members = (data.memberDetails ?? []) as Array<Record<string, unknown>>;
  const member = members.find((m) => m.userId === userId);
  if (!member) {
    console.error(`\nUser ${userId} not in memberDetails. Member userIds:`);
    for (const m of members) console.error(" -", m.userId, m.displayName ?? m.name);
    process.exit(1);
  }

  console.log("\n=== MEMBER ===");
  console.log("userId:      ", member.userId);
  console.log("displayName: ", member.displayName ?? member.name);
  console.log("email:       ", member.email);
  console.log("joinedAt:    ", fmt(member.joinedAt));

  console.log("\n=== CURRENT ROSTER (member.roster) ===");
  const roster = member.roster as unknown;
  if (Array.isArray(roster)) {
    for (const r of roster) {
      if (typeof r === "string") console.log(" -", r);
      else console.log(" -", JSON.stringify(r));
    }
  } else {
    console.log("(not an array)", roster);
  }

  console.log("\n=== WEEKLY ROSTERS (locked snapshots) ===");
  const weekly = (member.weeklyRosters ?? []) as Array<Record<string, unknown>>;
  if (weekly.length === 0) {
    console.log("(none)");
  } else {
    for (const w of weekly) {
      console.log(
        `week ${w.week}: lockedAt=${fmt(w.lockedAt)} score=${w.weekScore} castaways=${JSON.stringify(w.castawayIds)}`
      );
    }
  }

  // Check for any subcollections (e.g. rosterChanges) on this league doc
  console.log("\n=== LEAGUE SUBCOLLECTIONS ===");
  const subs = await ref.listCollections();
  if (subs.length === 0) console.log("(none)");
  for (const s of subs) console.log(" -", s.id);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
