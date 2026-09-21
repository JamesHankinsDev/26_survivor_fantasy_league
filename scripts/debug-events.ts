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
  const all = await db.collection("seasons").doc("50").collection("castaways").get();
  console.log(`Total castaways in seasons/50: ${all.size}\n`);

  // Find one with events
  const aubry = all.docs.find((d) => d.id === "aubry-bracco");
  if (!aubry) {
    console.log("aubry not found");
    return;
  }
  const data = aubry.data();
  console.log("aubry-bracco totalPoints:", data.totalPoints);
  console.log("\nweeklyEvents:");
  console.log(JSON.stringify(data.weeklyEvents, null, 2));

  // Check the league's first member's W4 roster
  const ld = await db.collection("leagues").doc("pQpkfufvM3PFfA3lh6gr").get();
  const members = (ld.data()?.memberDetails ?? []) as Array<Record<string, unknown>>;
  const meagan = members.find((m) => (m.displayName as string)?.includes("Meagan"));
  if (meagan) {
    const w4 = (meagan.weeklyRosters as Array<Record<string, unknown>>)?.find(
      (w) => w.week === 4
    );
    console.log("\nMeagan W4 roster:", w4?.castawayIds);
    console.log("Meagan W4 weekScore:", w4?.weekScore);
  }
}
main().catch(console.error);
