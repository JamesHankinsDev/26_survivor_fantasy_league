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
  for (const n of ["48", "49", "50", "51"]) {
    const c = await db.collection("seasons").doc(n).collection("castaways").limit(5).get();
    console.log(`seasons/${n}/castaways size: ${c.size}`);
    for (const d of c.docs) {
      const data = d.data() as Record<string, unknown>;
      const we = (data.weeklyEvents ?? {}) as Record<string, unknown[]>;
      console.log(
        `  ${d.id} total=${data.totalPoints} elim=${data.eliminated} weeks=[${Object.keys(we).join(",")}]`
      );
    }
  }
}
main().catch(console.error);
