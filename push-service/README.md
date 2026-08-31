# Push service (Railway)

Delivers Web Push notifications for Survivor Fantasy League.

The Next app on Vercel writes notification docs to Firestore. This worker polls
for the ones that are **due** and pushes them to every device the recipient has
registered. It exists as a separate always-on service because Vercel's
serverless functions can't hold a long-lived loop.

## How it works

```
Next app (Vercel)                         Railway
─────────────────                         ───────
admin saves scores
  └─ writes users/{uid}/notifications/{id}
       push: { state: "pending",
               sendAfter: <Timestamp>,     ──poll every 15s──►  sweep()
               tag: "scores-…" }                                  │
                                                                  ├─ claim (txn): pending → sending
                                                                  ├─ load users/{uid}/pushSubscriptions/*
                                                                  ├─ web-push to each endpoint
                                                                  └─ mark sent (or retry)
                                                                        │
                                                          ┌─────────────┘
                                                          ▼
                                            public/sw.js `push` handler
                                              → showNotification()
```

### Why it polls instead of using onSnapshot

A listener can't express *"wake me when `sendAfter` arrives"* — a scheduled
notification is written once, now, and becomes due later with no corresponding
write to trigger a snapshot. A listener would fire immediately (spoiling the
episode) or never. Polling for *due* work also means:

- a restart loses nothing — all state lives in Firestore
- no thundering herd of historical docs on startup (the classic
  collection-group `onSnapshot` bug)
- retries are free: a failed send stays `pending` and is picked up next pass

### Delivery states

Stored on the notification doc under `push`:

| state | meaning |
|---|---|
| `pending` | due (or scheduled); the next sweep will claim it |
| `sending` | claimed by a sweep — transactional, so two replicas can't double-send |
| `sent` | delivered; `deviceCount` records how many endpoints accepted it (0 is normal — the user has no devices registered) |
| `failed` | 3 attempts exhausted; `error` holds the last message |
| `skipped` | in-app only, never pushed (`push: false` at the call site) |

Endpoints that return **404/410** are deleted — the browser dropped the
subscription (PWA uninstalled, site data cleared, endpoint rotated).

## Deploying to Railway

1. **Create the service.** In your Railway project: *New → GitHub Repo*, pick
   this repo, and set **Root Directory** to `push-service`. Railway detects
   Node via Nixpacks and `railway.json` supplies the start command and health
   check.

2. **Set the service variables** (Variables tab). All four are required; the
   worker refuses to start without the first three.

   | Variable | Value |
   |---|---|
   | `FIREBASE_SERVICE_ACCOUNT` | The full contents of `SERVICE_ACCOUNT_KEY.json`, as one line of JSON |
   | `VAPID_PUBLIC_KEY` | From `push-service/.env` (generated locally, gitignored) |
   | `VAPID_PRIVATE_KEY` | From `push-service/.env` — **secret** |
   | `VAPID_SUBJECT` | `mailto:you@example.com` |
   | `SWEEP_INTERVAL_MS` | Optional, default `15000` |
   | `BATCH_LIMIT` | Optional, default `200` |

   Keep `numReplicas` at 1. The transactional claim makes >1 safe, but a second
   replica only adds Firestore reads — it doesn't deliver anything faster.

3. **Deploy**, then hit the service URL: `GET /health` returns sweep counters
   and `lastError`.

## The other half (Vercel side)

`NEXT_PUBLIC_VAPID_PUBLIC_KEY` must be set on the Vercel project to the **same
public key**, or the browser can't subscribe. It's in `.env.local` locally.

Also deploy the Firestore rules and the collection-group index the sweep query
needs:

```bash
firebase deploy --only firestore:rules,firestore:indexes
```

The index (`notifications`, COLLECTION_GROUP, `push.state` + `push.sendAfter`)
is already deployed. Without the rules, browsers can't save their subscription.

## Local development

```bash
cd push-service
npm install
npm run dev          # reads .env via node --env-file
curl localhost:8080/health
```

`.env` is gitignored and already contains the generated VAPID pair. Add the
service account JSON to it to run locally.

## Rotating VAPID keys

Rotating invalidates **every existing subscription** — each device must
re-subscribe, which happens silently the next time someone opens the app and
toggles notifications back on. Only rotate if the private key leaks.
