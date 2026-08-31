/**
 * Measure the episode drafter against episodes you already scored by hand.
 *
 * Season 50 is a real, complete answer key — 13 episodes of admin-entered
 * events sitting in Firestore. This replays the drafter against them and diffs
 * the result, so you get an accuracy number before trusting it on Season 51
 * rather than after.
 *
 * It is READ-ONLY. It never writes a draft doc and never touches scoring.
 *
 * Usage:
 *   node --env-file=.env backtest.js 50 3        # one episode
 *   node --env-file=.env backtest.js 50 1-5      # a range
 *
 * Needs ANTHROPIC_API_KEY and FIREBASE_SERVICE_ACCOUNT in .env.
 */

import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { draftEpisode } from "./episode-scorer.js";

const { FIREBASE_SERVICE_ACCOUNT, ANTHROPIC_API_KEY } = process.env;
for (const [k, v] of Object.entries({ FIREBASE_SERVICE_ACCOUNT, ANTHROPIC_API_KEY })) {
  if (!v) { console.error(`missing env var: ${k}`); process.exit(1); }
}

initializeApp({ credential: cert(JSON.parse(FIREBASE_SERVICE_ACCOUNT)) });
const db = getFirestore();

const seasonNumber = Number(process.argv[2] ?? 50);
const range = String(process.argv[3] ?? "1");
const [from, to] = range.includes("-") ? range.split("-").map(Number) : [Number(range), Number(range)];

/** "castawayId:eventType" -> count, from the hand-entered answer key. */
function truthFor(cast, episodeNumber) {
  const map = new Map();
  for (const c of cast) {
    for (const e of c.weeklyEvents?.[String(episodeNumber)] ?? []) {
      map.set(`${c.id}:${e.eventType}`, (map.get(`${c.id}:${e.eventType}`) ?? 0) + (e.count ?? 1));
    }
  }
  return map;
}

function predictedFor(draft) {
  const map = new Map();
  for (const c of draft.castaways ?? []) {
    for (const e of c.events ?? []) {
      map.set(`${c.castawayId}:${e.eventType}`, (map.get(`${c.castawayId}:${e.eventType}`) ?? 0) + e.count);
      map.set(`__conf__${c.castawayId}:${e.eventType}`, e.confidence);
    }
  }
  return map;
}

async function main() {
  const castSnap = await db.collection("seasons").doc(String(seasonNumber)).collection("castaways").get();
  const cast = castSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  console.log(`Season ${seasonNumber}: ${cast.length} castaways\n`);

  const totals = { tp: 0, fp: 0, fn: 0, countMismatch: 0 };

  for (let ep = from; ep <= to; ep++) {
    const truth = truthFor(cast, ep);
    if (truth.size === 0) { console.log(`Episode ${ep}: no ground truth, skipping\n`); continue; }

    process.stdout.write(`Episode ${ep}: drafting… `);
    let draft;
    try {
      draft = await draftEpisode({ seasonNumber, episodeNumber: ep, cast, apiKey: ANTHROPIC_API_KEY });
    } catch (err) {
      console.log(`FAILED — ${err.message}\n`);
      continue;
    }
    if (!draft?.episodeFound) { console.log(`no recap found\n`); continue; }

    const pred = predictedFor(draft);
    const predKeys = new Set([...pred.keys()].filter((k) => !k.startsWith("__conf__")));

    const tp = [], fp = [], fn = [], mism = [];
    for (const k of predKeys) {
      if (!truth.has(k)) fp.push(k);
      else if (truth.get(k) !== pred.get(k)) mism.push(`${k} (said ${pred.get(k)}, actual ${truth.get(k)})`);
      else tp.push(k);
    }
    for (const k of truth.keys()) if (!predKeys.has(k)) fn.push(k);

    totals.tp += tp.length; totals.fp += fp.length;
    totals.fn += fn.length; totals.countMismatch += mism.length;

    console.log(`${tp.length} correct, ${fp.length} invented, ${fn.length} missed, ${mism.length} wrong count`);
    for (const k of fp) console.log(`    INVENTED  ${k}  [confidence: ${pred.get("__conf__" + k)}]`);
    for (const k of fn) console.log(`    MISSED    ${k}`);
    for (const m of mism) console.log(`    COUNT     ${m}`);
    if (draft.unresolved?.length) {
      console.log(`    flagged for review: ${draft.unresolved.length} item(s)`);
    }
    console.log();
  }

  const precision = totals.tp / (totals.tp + totals.fp) || 0;
  const recall = totals.tp / (totals.tp + totals.fn) || 0;
  console.log("─".repeat(60));
  console.log(`Exact matches : ${totals.tp}`);
  console.log(`Invented      : ${totals.fp}   <- the dangerous one`);
  console.log(`Missed        : ${totals.fn}   <- you add these by hand`);
  console.log(`Wrong count   : ${totals.countMismatch}`);
  console.log(`Precision     : ${(precision * 100).toFixed(1)}%`);
  console.log(`Recall        : ${(recall * 100).toFixed(1)}%`);
  console.log("\nPrecision is the number that matters: a missed event you'll notice");
  console.log("in review, an invented one you might not.");
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
