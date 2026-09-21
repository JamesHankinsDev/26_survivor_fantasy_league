import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { readFileSync } from "fs";
import { resolve } from "path";

const sa = JSON.parse(
  readFileSync(resolve(import.meta.dirname, "..", "SERVICE_ACCOUNT_KEY.json"), "utf-8")
);
initializeApp({ credential: cert(sa) });
const db = getFirestore();

async function main() {
  console.log("Root collections:");
  const cols = await db.listCollections();
  for (const c of cols) console.log(" -", c.id);

  console.log("\nSeasons docs:");
  const seasons = await db.collection("seasons").get();
  for (const s of seasons.docs) {
    console.log("  season doc:", s.id, "data keys:", Object.keys(s.data()));
    const subs = await s.ref.listCollections();
    console.log("    subcollections:", subs.map((x) => x.id));
    for (const sub of subs) {
      const sample = await sub.limit(2).get();
      console.log(`    ${sub.id} sample (${sample.size}):`);
      for (const d of sample.docs) {
        const data = d.data();
        console.log(`      ${d.id}: keys = ${Object.keys(data).join(", ")}`);
        if (data.weeklyEvents) {
          console.log(
            `        weeklyEvents weeks: ${Object.keys(data.weeklyEvents).join(", ")}`
          );
        }
      }
    }
  }

  // Also check top-level castaways collection just in case
  console.log("\nTop-level castaways collection:");
  try {
    const cs = await db.collection("castaways").limit(3).get();
    console.log("  size:", cs.size);
    for (const d of cs.docs) {
      console.log("  -", d.id, "keys:", Object.keys(d.data()));
    }
  } catch (e) {
    console.log("  none");
  }
}

main().catch(console.error);
