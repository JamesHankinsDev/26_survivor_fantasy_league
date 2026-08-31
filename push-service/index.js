/**
 * Survivor Fantasy League — push delivery worker (Railway).
 *
 * Watches Firestore for notification docs that are due, and fans each one out
 * to every Web Push subscription the recipient has registered.
 *
 * WHY THIS POLLS INSTEAD OF STREAMING
 * -----------------------------------
 * The obvious design is an onSnapshot listener on the `notifications` collection
 * group. That can't express "wake me when sendAfter arrives" — a scheduled
 * notification is written once, now, and becomes due later with no corresponding
 * write to fire a snapshot. A listener would deliver it immediately (spoiling the
 * episode) or never. So the loop polls for *due* work instead, which also means:
 *   - a restart loses nothing; state lives in Firestore, not in memory
 *   - no thundering herd of historical docs on startup, which is the classic
 *     onSnapshot-on-a-collection-group bug
 *   - retries are free — a failed send stays pending and is picked up next pass
 *
 * DELIVERY STATE MACHINE (on the notification doc, under `push`)
 *   pending  -> claimed by a sweep -> sending -> sent | failed
 *   skipped  -> never delivered (in-app only)
 * The claim is transactional, so running two replicas can't double-send.
 */

import { createServer } from "node:http";
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore, Timestamp, FieldValue } from "firebase-admin/firestore";
import webpush from "web-push";

const {
  FIREBASE_SERVICE_ACCOUNT,
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY,
  VAPID_SUBJECT = "mailto:admin@example.com",
  SWEEP_INTERVAL_MS = "15000",
  BATCH_LIMIT = "200",
  PORT = "8080",
} = process.env;

for (const [name, value] of Object.entries({
  FIREBASE_SERVICE_ACCOUNT,
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY,
})) {
  if (!value) {
    console.error(`[push] missing required env var: ${name}`);
    process.exit(1);
  }
}

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

initializeApp({ credential: cert(JSON.parse(FIREBASE_SERVICE_ACCOUNT)) });
const db = getFirestore();

const sweepInterval = Number(SWEEP_INTERVAL_MS);
const batchLimit = Number(BATCH_LIMIT);

const stats = { sweeps: 0, sent: 0, failed: 0, pruned: 0, lastSweepAt: null, lastError: null };

/**
 * Atomically move a notification from pending -> sending.
 * Returns false if another replica got there first.
 */
async function claim(ref) {
  try {
    return await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) return false;
      if (snap.get("push.state") !== "pending") return false;
      tx.update(ref, { "push.state": "sending", "push.claimedAt": Timestamp.now() });
      return true;
    });
  } catch (err) {
    console.error("[push] claim failed:", err.message);
    return false;
  }
}

async function loadSubscriptions(userId) {
  const snap = await db.collection("users").doc(userId).collection("pushSubscriptions").get();
  return snap.docs.map((d) => ({ id: d.id, ref: d.ref, ...d.data() }));
}

/**
 * Deliver one notification to every device the user has registered.
 * Returns { sent, pruned }.
 */
async function deliver(notification, subscriptions) {
  const payload = JSON.stringify({
    title: notification.title,
    body: notification.message,
    link: notification.link || "/dashboard",
    tag: notification.push?.tag || notification.type || "sfl-general",
    notificationId: notification.id,
  });

  let sent = 0;
  let pruned = 0;

  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload,
        );
        sent++;
      } catch (err) {
        // 404/410 mean the browser dropped the subscription (uninstalled the
        // PWA, cleared site data, rotated the endpoint). Delete it so we stop
        // paying for the round trip on every future notification.
        if (err.statusCode === 404 || err.statusCode === 410) {
          await sub.ref.delete().catch(() => {});
          pruned++;
        } else {
          console.error(`[push] send failed (${err.statusCode ?? "?"}):`, err.body ?? err.message);
        }
      }
    }),
  );

  return { sent, pruned };
}

async function sweep() {
  const now = Timestamp.now();

  const due = await db
    .collectionGroup("notifications")
    .where("push.state", "==", "pending")
    .where("push.sendAfter", "<=", now)
    .limit(batchLimit)
    .get();

  if (due.empty) return 0;

  let delivered = 0;

  for (const doc of due.docs) {
    // users/{uid}/notifications/{id} — the grandparent doc id is the recipient.
    const userId = doc.ref.parent.parent?.id;
    if (!userId) {
      await doc.ref.update({ "push.state": "failed", "push.error": "no parent user" });
      continue;
    }

    if (!(await claim(doc.ref))) continue;

    try {
      const subscriptions = await loadSubscriptions(userId);

      if (subscriptions.length === 0) {
        // No devices registered — that's a normal state, not a failure.
        await doc.ref.update({
          "push.state": "sent",
          "push.sentAt": Timestamp.now(),
          "push.deviceCount": 0,
        });
        continue;
      }

      const { sent, pruned } = await deliver({ id: doc.id, ...doc.data() }, subscriptions);

      await doc.ref.update({
        "push.state": "sent",
        "push.sentAt": Timestamp.now(),
        "push.deviceCount": sent,
      });

      delivered += sent;
      stats.sent += sent;
      stats.pruned += pruned;
    } catch (err) {
      console.error("[push] delivery error:", err.message);
      stats.failed++;
      // Back to pending so the next sweep retries, unless it keeps failing.
      const attempts = (doc.get("push.attempts") ?? 0) + 1;
      await doc.ref.update({
        "push.state": attempts >= 3 ? "failed" : "pending",
        "push.attempts": FieldValue.increment(1),
        "push.error": err.message,
      });
    }
  }

  return delivered;
}

let sweeping = false;

async function tick() {
  if (sweeping) return; // never overlap sweeps
  sweeping = true;
  try {
    const delivered = await sweep();
    stats.sweeps++;
    stats.lastSweepAt = new Date().toISOString();
    stats.lastError = null;
    if (delivered > 0) console.log(`[push] delivered ${delivered} notification(s)`);
  } catch (err) {
    stats.lastError = err.message;
    // A missing composite index is the most likely first-run failure — make it
    // obvious rather than burying it in a generic stack trace.
    if (err.code === 9 || /index/i.test(err.message)) {
      console.error(
        "[push] Firestore rejected the query — the collection-group index is " +
          "probably missing. Deploy it with:\n" +
          "  firebase deploy --only firestore:indexes\n" +
          err.message,
      );
    } else {
      console.error("[push] sweep failed:", err.message);
    }
  } finally {
    sweeping = false;
  }
}

// Railway health check + a peek at what the worker has been doing.
createServer((req, res) => {
  if (req.url === "/health" || req.url === "/") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ ok: true, ...stats }, null, 2));
    return;
  }
  res.writeHead(404).end();
}).listen(Number(PORT), () => {
  console.log(`[push] health server on :${PORT}`);
});

console.log(`[push] sweeping every ${sweepInterval}ms (batch limit ${batchLimit})`);
setInterval(tick, sweepInterval);
tick();

for (const signal of ["SIGTERM", "SIGINT"]) {
  process.on(signal, () => {
    console.log(`[push] ${signal} — shutting down`);
    process.exit(0);
  });
}
