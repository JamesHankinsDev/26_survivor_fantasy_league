/**
 * Seed script: populate global seasons/51/castaways/{id} using Firebase Admin SDK.
 *
 * Cast source: CBS Survivor 51 ("Open Era") cast reveal, 2026-08-26.
 * Tribe assignments were not announced with the cast, so `tribe` is left unset —
 * cards fall back to the untribed placeholder art until an admin fills it in.
 *
 * Headshots hotlink the Gannett CDN copies of the CBS press portraits. Those are
 * published full-body, so each URL carries a `crop=` window that reframes them
 * head-and-shoulders: 45% of the source width, centred, anchored 2% down, at the
 * ~0.9 aspect of the card's photo box. Matching that box matters — the card
 * photo is `object-fit: cover`, and a taller 2:3 crop gets ~13% shaved off the
 * top and bottom, which clips foreheads. Source resolutions differ per castaway,
 * so the window is computed per image rather than shared.
 *
 * Idempotent: existing docs are skipped, so re-running never clobbers scoring
 * data once the season is underway. Pass `--force` to overwrite, or `--images`
 * to patch only the `image` field on docs that already exist.
 *
 * Usage:
 *   npx tsx scripts/seed-season-51-castaways.ts [--force | --images]
 *
 * Requires SERVICE_ACCOUNT_KEY.json in the project root.
 */

import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { readFileSync } from "fs";
import { resolve } from "path";

const serviceAccount = JSON.parse(
  readFileSync(resolve(import.meta.dirname, "..", "SERVICE_ACCOUNT_KEY.json"), "utf-8"),
);

initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

const SEASON_NUMBER = 51;
const FORCE = process.argv.includes("--force");
const IMAGES_ONLY = process.argv.includes("--images");

interface SeedCastaway {
  id: string;
  name: string;
  age: number;
  occupation: string;
  hometown: string;
  residence: string;
  /** CBS press portrait, pre-cropped waist-up by the CDN (see file header). */
  image: string;
}

const CAST: SeedCastaway[] = [
  { id: "aaliyah-puglia", name: "Aaliyah Puglia", age: 24, occupation: "Chef", hometown: "Gloucester City, N.J.", residence: "Providence, R.I.", image: "https://www.gannett-cdn.com/authoring/authoring-images/2026/08/27/USAT/91483703007-aaliyah-puglia.JPG?crop=2592,2880,x1584,y161&width=540&height=600&format=pjpg&auto=webp" },
  { id: "alexis-levine", name: "Alexis Levine", age: 34, occupation: "Criminal defense attorney", hometown: "Atlanta, Ga.", residence: "Atlanta, Ga.", image: "https://www.gannett-cdn.com/authoring/authoring-images/2026/08/27/USAT/91483700007-alexis-levine.jpg?crop=2592,2880,x1584,y173&width=540&height=600&format=pjpg&auto=webp" },
  { id: "an-nguyen", name: 'An "Thien An" Nguyen', age: 24, occupation: "Medical student", hometown: "Fort Worth, Texas", residence: "Fort Worth, Texas", image: "https://www.gannett-cdn.com/authoring/authoring-images/2026/08/27/USAT/91483688007-an-thien-an-nguyen.JPG?crop=2385,2650,x1458,y159&width=540&height=600&format=pjpg&auto=webp" },
  { id: "ana-sani", name: "Ana Sani", age: 34, occupation: "Voice actress", hometown: "Richmond Hill, Ontario, Canada", residence: "Toronto, Ontario, Canada", image: "https://www.gannett-cdn.com/authoring/authoring-images/2026/08/27/USAT/91483693007-ana-sani.JPG?crop=2592,2880,x1584,y173&width=540&height=600&format=pjpg&auto=webp" },
  { id: "angelica-loblack", name: 'Angelica "Jelly" Loblack', age: 29, occupation: "Sociology professor", hometown: "Garland, Texas and Midwest City, Okla.", residence: "Bloomington, Ind.", image: "https://www.gannett-cdn.com/authoring/authoring-images/2026/08/27/USAT/91483687007-angelica-jelly-loblack.JPG?crop=2592,2880,x1584,y173&width=540&height=600&format=pjpg&auto=webp" },
  { id: "brady-booker", name: "Brady Booker", age: 27, occupation: "Pro wrestler", hometown: "La Salle, Ill.", residence: "Knoxville, Tenn.", image: "https://www.gannett-cdn.com/authoring/authoring-images/2026/08/27/USAT/91483701007-brady-booker.jpg?crop=2592,2880,x1584,y173&width=540&height=600&format=pjpg&auto=webp" },
  { id: "carter-krull", name: "Carter Krull", age: 24, occupation: "Livestock farmer", hometown: "Rock Rapids, Iowa", residence: "Sioux Falls, S.D.", image: "https://www.gannett-cdn.com/authoring/authoring-images/2026/08/27/USAT/91483692007-carter-krull.JPG?crop=2592,2880,x1584,y173&width=540&height=600&format=pjpg&auto=webp" },
  { id: "cristian-chavez", name: "Cristian Chavez", age: 26, occupation: "Head of HR", hometown: "Salt Lake City, Utah", residence: "Salt Lake City, Utah", image: "https://www.gannett-cdn.com/authoring/authoring-images/2026/08/27/USAT/91483696007-cristian-chavez.JPG?crop=2592,2880,x1584,y173&width=540&height=600&format=pjpg&auto=webp" },
  { id: "danny-kilby", name: 'Danny "Kilby" Kilby', age: 30, occupation: "Game designer", hometown: "Mount Forest, Ontario, Canada", residence: "London, Ontario, Canada", image: "https://www.gannett-cdn.com/authoring/authoring-images/2026/08/27/USAT/91483702007-danny-kilby-kilby.jpg?crop=2592,2880,x1584,y173&width=540&height=600&format=pjpg&auto=webp" },
  { id: "devin-way", name: "Devin Way", age: 33, occupation: "Actor", hometown: "Lufkin, Texas", residence: "Los Angeles, Calif.", image: "https://www.gannett-cdn.com/authoring/authoring-images/2026/08/27/USAT/91483691007-devin-way.jpg?crop=2592,2880,x1584,y173&width=540&height=600&format=pjpg&auto=webp" },
  { id: "eric-macksoud", name: "Eric Macksoud", age: 34, occupation: "Mental health counselor", hometown: "Lincoln, R.I.", residence: "Windsor Locks, Conn.", image: "https://www.gannett-cdn.com/authoring/authoring-images/2026/08/27/USAT/91483698007-eric-macksoud.JPG?crop=2592,2880,x1584,y173&width=540&height=600&format=pjpg&auto=webp" },
  { id: "jenna-doore", name: "Jenna Doore", age: 30, occupation: "Wedding photographer", hometown: "Perrysburg, Ohio", residence: "Toledo, Ohio", image: "https://www.gannett-cdn.com/authoring/authoring-images/2026/08/27/USAT/91483697007-jenna-doore.JPG?crop=2305,2561,x1409,y154&width=540&height=600&format=pjpg&auto=webp" },
  { id: "kristin-flickinger", name: "Kristin Flickinger", age: 49, occupation: "Crisis management", hometown: "Ketchum, Idaho", residence: "Santa Barbara, Calif.", image: "https://www.gannett-cdn.com/authoring/authoring-images/2026/08/27/USAT/91483699007-kristin-flickinger.JPG?crop=2403,2670,x1469,y160&width=540&height=600&format=pjpg&auto=webp" },
  { id: "lewis-kelly", name: "Lewis Kelly", age: 28, occupation: "Farmer", hometown: "Dublin, Ireland", residence: "Puerto Rico, USA", image: "https://www.gannett-cdn.com/authoring/authoring-images/2026/08/27/USAT/91483695007-lewis-kelly.jpg?crop=2572,2858,x1572,y171&width=540&height=600&format=pjpg&auto=webp" },
  { id: "linnea-capobianco", name: "Linnea Capobianco", age: 25, occupation: "Entrepreneur", hometown: "Kearny, N.J.", residence: "Jersey City, N.J.", image: "https://www.gannett-cdn.com/authoring/authoring-images/2026/08/27/USAT/91483694007-linnea-capobianco.JPG?crop=2592,2880,x1584,y173&width=540&height=600&format=pjpg&auto=webp" },
  { id: "maggie-nestor", name: "Maggie Nestor", age: 40, occupation: "Farmer", hometown: "Middleway, W.Va.", residence: "Charlestown, W.Va.", image: "https://www.gannett-cdn.com/authoring/authoring-images/2026/08/27/USAT/91483686007-maggie-nestor.JPG?crop=2592,2880,x1584,y173&width=540&height=600&format=pjpg&auto=webp" },
  { id: "mike-pinsky", name: "Mike Pinsky", age: 32, occupation: "Baseball executive", hometown: "New York City, N.Y.", residence: "New York City, N.Y.", image: "https://www.gannett-cdn.com/authoring/authoring-images/2026/08/27/USAT/91483690007-mike-pinsky.JPG?crop=2592,2880,x1584,y173&width=540&height=600&format=pjpg&auto=webp" },
  { id: "ori-jean-charles", name: "Ori Jean-Charles", age: 27, occupation: "Personal trainer", hometown: "Spring Valley, N.Y.", residence: "Spring Valley, N.Y.", image: "https://www.gannett-cdn.com/authoring/authoring-images/2026/08/27/USAT/91483689007-ori-jean-charles.JPG?crop=2534,2816,x1549,y169&width=540&height=600&format=pjpg&auto=webp" },
  { id: "patt-cannaday", name: "Patt Cannaday", age: 33, occupation: "Federal prosecutor", hometown: "Tampa, Fla.", residence: "Washington, D.C.", image: "https://www.gannett-cdn.com/authoring/authoring-images/2026/08/26/PNJM/91478394007-3197255-srvr-s-51-patt-cannaday-03410-b.JPG?crop=900,1000,x550,y60&width=540&height=600&format=pjpg&auto=webp" },
  { id: "rob-antonson", name: "Rob Antonson", age: 40, occupation: "Airline gate agent", hometown: "Johnston, R.I.", residence: "Cumberland, R.I.", image: "https://www.gannett-cdn.com/authoring/authoring-images/2026/08/27/USAT/91483683007-rob-antonson.JPG?crop=2565,2850,x1567,y171&width=540&height=600&format=pjpg&auto=webp" },
  { id: "sharonda-cox", name: "Sharonda Cox", age: 34, occupation: "Resident OBGYN", hometown: "Pompano Beach, Fla.", residence: "Richmond, Ky.", image: "https://www.gannett-cdn.com/authoring/authoring-images/2026/08/27/USAT/91483685007-sharonda-cox.jpg?crop=2569,2854,x1570,y171&width=540&height=600&format=pjpg&auto=webp" },
];

/** One-line dossier shown on the castaway card detail sheet. */
const buildBio = (c: SeedCastaway): string =>
  c.hometown === c.residence
    ? `${c.age} · ${c.occupation} · ${c.residence}`
    : `${c.age} · ${c.occupation} · From ${c.hometown}; lives in ${c.residence}`;

async function seed() {
  const col = db.collection("seasons").doc(String(SEASON_NUMBER)).collection("castaways");
  const existing = new Set((await col.get()).docs.map((d) => d.id));

  // --images: patch just the headshot on docs that already exist. Never touches
  // totalPoints / eliminated / weeklyEvents, so it is safe to run mid-season.
  if (IMAGES_ONLY) {
    const present = CAST.filter((c) => existing.has(c.id));
    const missing = CAST.filter((c) => !existing.has(c.id));
    const batch = db.batch();
    for (const c of present) {
      batch.update(col.doc(c.id), { image: c.image });
      console.log(`  ~ ${c.id.padEnd(20)} ${c.name}`);
    }
    if (present.length > 0) await batch.commit();
    console.log(`\nPatched ${present.length} image URLs.`);
    if (missing.length > 0) {
      console.log(`Not in Firestore yet (run without --images first): ${missing.map((c) => c.id).join(", ")}`);
    }
    return;
  }

  const toWrite = FORCE ? CAST : CAST.filter((c) => !existing.has(c.id));
  const skipped = CAST.length - toWrite.length;

  if (toWrite.length === 0) {
    console.log(`Nothing to do — all ${CAST.length} castaways already exist in seasons/${SEASON_NUMBER}/castaways/.`);
    console.log("Re-run with --force to overwrite them (this resets points and events).");
    return;
  }

  console.log(
    `Seeding ${toWrite.length} castaways to seasons/${SEASON_NUMBER}/castaways/` +
      (skipped > 0 ? ` (${skipped} already present, skipped)` : "") +
      (FORCE ? " [--force: overwriting]" : ""),
  );

  const batch = db.batch();
  for (const c of toWrite) {
    batch.set(col.doc(c.id), {
      name: c.name,
      image: c.image,
      bio: buildBio(c),
      seasonNumber: SEASON_NUMBER,
      totalPoints: 0,
      eliminated: false,
      weeklyEvents: {},
    });
    console.log(`  + ${c.id.padEnd(20)} ${c.name}`);
  }

  await batch.commit();
  console.log(`\nDone — ${toWrite.length} written. Verify under seasons/${SEASON_NUMBER}/castaways/`);
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  });
