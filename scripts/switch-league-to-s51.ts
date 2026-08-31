/**
 * Point the Bernatchez family league at Season 51 and record the s51_rules
 * outcome as adopted.
 *
 * Two things needed fixing beyond the league's `seasonNumber` (which was
 * already 51):
 *
 *   1. A stale `dealtHand` of Season 50 castaway ids. The league page resolves
 *      the hand against the *current* season's cast and drops ids it can't find
 *      (`dealtHandIds` -> `dealtCastaways` in my-leagues/[id]/page.tsx), so an
 *      S50 hand renders as an empty draft pack rather than re-dealing. Clearing
 *      it lets the deterministic deal re-run against the S51 cast.
 *   2. No recorded proposal outcome. S51's scoring already lives in code
 *      (SEASON_SCORING[51]) keyed by season number — adopting doesn't switch
 *      any rules on, it records the verdict, locks voting, and flips the modal
 *      banner to ADOPTED.
 *
 * Read-only by default — pass `--apply` to write.
 *
 * Usage:
 *   npx tsx scripts/switch-league-to-s51.ts [--apply]
 */

import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { readFileSync } from "fs";
import { resolve } from "path";

const serviceAccount = JSON.parse(
  readFileSync(resolve(import.meta.dirname, "..", "SERVICE_ACCOUNT_KEY.json"), "utf-8"),
);
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

const LEAGUE_ID = "pQpkfufvM3PFfA3lh6gr";
const SEASON_NUMBER = 51;
const PROPOSAL_SLUG = "s51_rules";
const APPLY = process.argv.includes("--apply");

interface MemberDetail {
  userId: string;
  displayName?: string;
  roster?: string[];
  dealtHand?: string[];
  dealtAt?: unknown;
  totalPoints?: number;
  [k: string]: unknown;
}

async function main() {
  const ref = db.doc(`leagues/${LEAGUE_ID}`);
  const snap = await ref.get();
  if (!snap.exists) throw new Error(`League ${LEAGUE_ID} not found`);
  const league = snap.data()!;
  const members = (league.memberDetails ?? []) as MemberDetail[];

  console.log(`League: "${league.name}"`);
  console.log(`  seasonNumber: ${league.seasonNumber} -> ${SEASON_NUMBER}`);

  // Guard: only safe to reset draft state while nobody has drafted or scored.
  const drafted = members.filter((m) => (m.roster ?? []).length > 0);
  const scored = members.filter((m) => (m.totalPoints ?? 0) !== 0);
  if (drafted.length > 0 || scored.length > 0) {
    console.error(
      `\nREFUSING: ${drafted.length} member(s) have a roster and ${scored.length} have points.\n` +
        `Clearing dealt hands would strand real draft/scoring data. Resolve by hand.`,
    );
    process.exit(1);
  }

  const stale = members.filter((m) => (m.dealtHand ?? []).length > 0);
  console.log(`  stale dealt hands to clear: ${stale.length}`);
  for (const m of stale) {
    console.log(`    - ${m.displayName}: [${(m.dealtHand ?? []).join(", ")}]`);
  }

  const cleared = members.map((m) => {
    const next = { ...m };
    delete next.dealtHand;
    delete next.dealtAt;
    return next;
  });

  const outcome = {
    outcome: "adopted" as const,
    decidedAt: Timestamp.now(),
    decidedBy: league.ownerId as string,
  };
  const votes = (league.proposalVotes?.[PROPOSAL_SLUG] ?? {}) as Record<string, string>;
  const yay = Object.values(votes).filter((v) => v === "yay").length;
  const nay = Object.values(votes).filter((v) => v === "nay").length;
  console.log(
    `  ${PROPOSAL_SLUG}: recording "adopted" (votes cast: ${yay} yay / ${nay} nay of ${members.length} members)`,
  );

  if (!APPLY) {
    console.log("\nDry run — nothing written. Re-run with --apply.");
    return;
  }

  await ref.update({
    seasonNumber: SEASON_NUMBER,
    memberDetails: cleared,
    [`proposalOutcomes.${PROPOSAL_SLUG}`]: outcome,
    updatedAt: Timestamp.now(),
  });
  console.log("\nApplied.");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Failed:", err);
    process.exit(1);
  });
