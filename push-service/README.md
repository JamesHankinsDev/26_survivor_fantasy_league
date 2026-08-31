# Push service (Railway)

Two background jobs for Survivor Fantasy League, in one always-on service:

1. **Push delivery** — polls Firestore for due notifications and pushes them.
2. **Episode drafter** *(optional)* — Thursday midnight ET, reads published
   recaps and drafts the week's scoring for admin review. **It never commits
   scores.**

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


---

# Episode drafter

Survivor airs Wednesday 8pm ET. This opens at **Thursday midnight ET**, reads
published recaps, and writes a proposed scoring to
`seasons/{n}/pendingScores/{episode}`. The admin
scores page shows it as a banner with an **Apply draft to form** button; saving
still goes through `saveEpisodeScores` with a human pressing the button.

**It never commits scores, by design.** `saveEpisodeScores` cascades across every
league and recomputes totals from deltas — there is no undo. A recap that
garbles who went home would silently rewrite everyone's standings, and nobody
would notice until they questioned their score. Drafting removes the tedium
without moving the decision.

## Accuracy is uneven, and the prompt says so

| Reported reliably by any recap | Covered inconsistently |
|---|---|
| `voted_out`, `immunity_win`, `team_challenge_win`, `made_jury`, `made_final_three`, `season_winner`, `fire_making_win` | `found_idol`, `found_advantage`, `used_idol_successfully`, `used_advantage_successfully` |

The right-hand column is where the show deliberately hides information. Those
events come back `medium`/`low` confidence, or as a note in `unresolved`, rather
than being guessed. The banner puts the low-confidence count up front.

## Measure it before you trust it

Season 50 is a complete answer key — 13 episodes of hand-entered events already
in Firestore. Replay the drafter against them:

```bash
cd push-service
node --env-file=.env backtest.js 50 1-5
```

Read-only; writes no drafts and touches no scoring. It reports precision and
recall, broken out into *invented*, *missed*, and *wrong count*.

**Precision is the number that matters.** A missed event you'll spot while
reviewing; an invented one you might not.

## Schedule, and why it retries

The window opens **Thursday 00:00 ET** and stays open **12 hours**, to noon.

Midnight is roughly two hours after the episode ends — 90-minute episodes finish
at 9:30pm ET, and the season premiere runs to 10:00 — which is when the faster
outlets have published. Not all of them have, so the job retries every 10
minutes across the window rather than writing one "not found" and giving up for
the week. A `ready` draft ends the week; a `not_found` one is retried, bounded
at 12 attempts so a genuinely missing episode can't loop all night.

The window is a start plus a duration, not a start-day/end-day pair. The pair
form breaks at midnight: a window starting Thursday 00:00 would match "any hour
on Thursday >= 0" — the whole day, plus part of Friday.

The schedule is expressed in **America/New_York, not UTC** — Thu midnight ET is
04:00 UTC in summer and 05:00 UTC in winter, so a UTC schedule would silently
shift an hour when the clocks change mid-season. `npm test` covers both DST
sides and the midnight case.

## Enabling it

Set `ANTHROPIC_API_KEY` and `EPISODE_SCORER_ENABLED=true` on the Railway
service. Optional: `SCORER_DAY_ET` (default 4 = Thursday),
`SCORER_START_HOUR_ET` (default 0), `SCORER_WINDOW_HOURS` (default 12), and
`SCORER_SEASON_NUMBER` (defaults to the highest season among active leagues).

Idempotence comes from the draft document, not a timer — a restart or redeploy
can't double-run it. Cost is roughly one Opus call a week, well under a dollar
including web search; a night that needs several retries is still cents.

`GET /health` reports a `scorer` block alongside the push counters.
