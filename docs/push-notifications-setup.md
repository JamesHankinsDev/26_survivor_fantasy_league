# Push Notifications — Setup & Deployment Runbook

Everything needed to take push notifications from "code is merged" to "my phone
buzzes when scores post."

**Status at time of writing:** the code is on `main`, the Firestore rules and
index are deployed. Two things remain: one Vercel env var, and the Railway
service. Those are Parts 1 and 2 below.

---

## What you're actually setting up

```
Next app (Vercel)                              Railway
─────────────────                              ───────
admin saves scores / marks elimination
  └─ writes users/{uid}/notifications/{id}
       push: { state: "pending",
               sendAfter: <Timestamp>,  ──poll every 15s──►  sweep()
               tag: "scores-…" }                               │
                                                               ├─ claim (transaction): pending → sending
                                                               ├─ read users/{uid}/pushSubscriptions/*
                                                               ├─ web-push to each endpoint
                                                               └─ mark sent
                                                                     │
                                                       ┌─────────────┘
                                                       ▼
                                          public/sw.js `push` handler
                                            → showNotification()
```

Three moving parts:

| Part | Where it runs | What it does |
|---|---|---|
| `public/sw.js` | User's browser | Receives the push, shows the notification, routes the click |
| Next app | Vercel | Writes notification docs; hosts the opt-in toggle |
| `push-service/` | Railway | Polls for due notifications and delivers them |

Railway exists because delivery needs an **always-on process**. Vercel's
serverless functions can't hold a polling loop.

---

## There is no "VAPID account"

VAPID ([RFC 8292](https://datatracker.ietf.org/doc/html/rfc8292)) is a spec, not
a service. No signup, no vendor, no cost. It's a public/private keypair you
generate yourself; your server signs each push with the private key, and the
browser's push service verifies it against the public key. This proves pushes
come from your server and not from someone who scraped an endpoint URL.

**Your keypair is already generated** — it lives in `push-service/.env`
(gitignored) and `.env.local` (gitignored).

You also **do not need Firebase Cloud Messaging**. That was the pre-2018 way of
pushing to Chrome. With VAPID the browser hands you an endpoint and you sign a
request to it. Chrome's endpoints happen to sit on FCM infrastructure, but you
never register with it. Firefox uses Mozilla autopush, Safari uses Apple's —
same code, no accounts anywhere.

The only accounts involved are **Firebase** (for the service-account key you
already have) and **Railway** (to run the worker).

---

## Part 1 — Vercel (1 variable, 5 minutes)

### Find the value

It's public by design — it ships inside your client JavaScript:

```
BJY9DX8HKCnGdhmY8R2JvBroe1woQ7T_pb1M9L3fqG2lINi1P9EKN507fhUg82cYpqshFyl3T0uQAyCkEXdT4Oo
```

Or read it locally:

```bash
grep NEXT_PUBLIC_VAPID_PUBLIC_KEY .env.local
```

### Deploy it

**Vercel Dashboard → your project → Settings → Environment Variables → Add New**

| Field | Value |
|---|---|
| Key | `NEXT_PUBLIC_VAPID_PUBLIC_KEY` |
| Value | the string above |
| Environments | ✅ Production ✅ Preview ✅ Development |

Or via CLI, matching the existing `setup-vercel-env.sh` pattern:

```bash
vercel env add NEXT_PUBLIC_VAPID_PUBLIC_KEY production <<< "BJY9DX8HKCnGdhmY8R2JvBroe1woQ7T_pb1M9L3fqG2lINi1P9EKN507fhUg82cYpqshFyl3T0uQAyCkEXdT4Oo"
```

### ⚠️ Then redeploy — this is not optional

`NEXT_PUBLIC_*` variables are **inlined at build time**, not read at runtime.
Adding the variable changes nothing about the build that's already deployed.

```bash
vercel --prod
```

…or push any commit to `main`, or hit *Redeploy* in the Vercel dashboard.

**Symptom if you skip this:** the notification toggle silently never appears.
`isPushSupported()` returns `false` without the key, and it fails quietly rather
than erroring.

---

## Part 2 — Railway (4 variables, ~15 minutes)

### Create the service

1. Railway → your project → **New → GitHub Repo**
2. Pick `JamesHankinsDev/26_survivor_fantasy_league`
3. **Settings → Root Directory → `push-service`** ← easy to miss, and nothing
   works without it. Railway will otherwise try to build the Next app.

Nixpacks auto-detects Node. `push-service/railway.json` supplies the start
command, the `/health` check, and pins `numReplicas: 1`.

### Find the four values

All four already exist on your machine. Run each command and paste into Railway.

**`VAPID_PUBLIC_KEY`** — same string as Part 1:
```
BJY9DX8HKCnGdhmY8R2JvBroe1woQ7T_pb1M9L3fqG2lINi1P9EKN507fhUg82cYpqshFyl3T0uQAyCkEXdT4Oo
```

**`VAPID_PRIVATE_KEY`** — secret; copies straight to clipboard so it never hits
your screen or shell history:
```bash
grep '^VAPID_PRIVATE_KEY=' push-service/.env | cut -d= -f2- | tr -d '\n' | pbcopy
```

**`VAPID_SUBJECT`** — a contact address. Nobody verifies it; push providers use
it to reach you if your server misbehaves:
```
mailto:hankins.jamesb@gmail.com
```

**`FIREBASE_SERVICE_ACCOUNT`** — the service-account JSON, **minified to one
line**. The raw file is pretty-printed and will break as an env var:
```bash
node -e "console.log(JSON.stringify(require('./SERVICE_ACCOUNT_KEY.json')))" | pbcopy
```

If you ever need a fresh one: Firebase Console → ⚙ **Project Settings** →
**Service Accounts** → **Generate new private key**.

### Set them

**Railway → your `push-service` → Variables tab → New Variable**

| Variable | Required | Notes |
|---|---|---|
| `FIREBASE_SERVICE_ACCOUNT` | ✅ | One-line JSON |
| `VAPID_PUBLIC_KEY` | ✅ | |
| `VAPID_PRIVATE_KEY` | ✅ | Secret |
| `VAPID_SUBJECT` | ✅ | `mailto:` address |
| `SWEEP_INTERVAL_MS` | — | Default `15000` |
| `BATCH_LIMIT` | — | Default `200` |
| `PORT` | ❌ **don't set** | Railway injects it automatically |

The worker refuses to start if any of the first three is missing, and says which
one in the deploy logs.

### Deploy and check

Railway deploys on save. Then:

```bash
curl https://<your-service>.up.railway.app/health
```

Healthy output:

```json
{ "ok": true, "sweeps": 12, "sent": 0, "failed": 0, "pruned": 0,
  "lastSweepAt": "2026-08-31T15:04:11.000Z", "lastError": null }
```

`lastError: null` with `sweeps` climbing means it's talking to Firestore.
`sent: 0` is expected until somebody subscribes a device.

---

## Part 3 — Firestore (already done)

Recorded here so a future rebuild doesn't miss it.

```bash
firebase deploy --only firestore:rules,firestore:indexes
```

- **Rules** — `users/{userId}/pushSubscriptions/{id}`, owner read/write only. The
  push-service uses the Admin SDK and bypasses rules entirely.
- **Index** — collection group on `notifications`, `push.state` ASC +
  `push.sendAfter` ASC. The sweep query cannot run without it.

Collection-group indexes take a few minutes to build. Until it's ready the
service logs `FAILED_PRECONDITION … index is currently building` and retries on
its own — no action needed.

---

## Turning it on, per device

Push is a **device** capability, not an account setting. Subscribing on a phone
says nothing about a laptop. The toggle lives in the **notification bell →
"Notifications on this device."**

### Android / Chrome / Edge / Firefox desktop

Open the site, flip the toggle, accept the browser prompt. Done.

### iPhone / iPad — extra step required

iOS supports Web Push only on **16.4+**, and **only for web apps added to the
Home Screen**. Safari will not offer notifications for a page in a browser tab,
regardless of configuration.

1. Open the site in **Safari** (not Chrome — on iOS it can't register this)
2. **Share → Add to Home Screen**
3. Open the app **from the Home Screen icon**
4. Flip the toggle and accept the prompt

The manifest is already configured for this (`display: standalone`, 152/192px
icons, `apple-mobile-web-app-*` meta tags).

---

## Verify end to end

Once Railway is live and you've enabled the toggle on one device:

1. **Check the subscription saved.** Firebase Console → Firestore →
   `users/{your-uid}/pushSubscriptions`. There should be one doc per device,
   keyed by a hash of the endpoint, holding `endpoint`, `p256dh`, `auth`.

2. **Send yourself a real one.** Admin → Scoring, add a single event, save. In
   the confirm dialog set **Notify members → Send immediately** (the default
   holds until 11:30pm ET, which is correct for real use but unhelpful for a
   test).

3. **Watch it move.** In `users/{uid}/notifications/{id}`, the `push` map should
   go `pending → sent` within ~15 seconds, with `deviceCount` matching your
   number of subscribed devices.

---

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| Toggle never appears | `NEXT_PUBLIC_VAPID_PUBLIC_KEY` missing, **or set but not redeployed** | Add it, then redeploy. It's build-time inlined. |
| Toggle appears, greyed out, says "Blocked" | Notifications denied at browser level | Re-enable in browser site settings; the page can't re-prompt |
| Toggle does nothing on iPhone | Opened from a Safari tab, not the Home Screen icon | Add to Home Screen, reopen from the icon |
| `/health` shows `lastError` about an index | Index missing or still building | `firebase deploy --only firestore:indexes`, then wait |
| Service exits immediately | A required env var is missing | Deploy logs name it: `missing required env var: X` |
| Notification stuck at `pending` | Either `sendAfter` is in the future (working as intended) or the service is down | Check `push.sendAfter`; check `/health` |
| `state: sent` but `deviceCount: 0` | Recipient has no devices subscribed | Have them flip the toggle |
| Was working, silently stopped on one device | Endpoint expired; browser dropped the subscription | Already self-healing — the service prunes on 404/410; user re-toggles |
| Notification arrives with no detail | Working as intended | Messages are deliberately vague; detail is behind the link |

---

## Rotating the keys

Rotating VAPID keys **invalidates every existing subscription** — every device
silently stops receiving until its owner re-toggles. Only do this if the private
key leaks.

```bash
node -e '
const { generateKeyPairSync } = require("crypto");
const { publicKey, privateKey } = generateKeyPairSync("ec", { namedCurve: "prime256v1" });
const b64u = b => b.toString("base64").replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
const der = publicKey.export({ type: "spki", format: "der" });
console.log("public :", b64u(der.subarray(der.length - 65)));
console.log("private:", privateKey.export({ format: "jwk" }).d);
'
```

Then update all three places: `.env.local`, `push-service/.env`, and both
dashboards — Vercel (public) and Railway (both). Redeploy the Next app.

**No provider can reset these for you.** The private key exists only in
`push-service/.env` and Railway's variables. Keep a copy in a password manager.

---

## Related files

| Path | What it is |
|---|---|
| `push-service/README.md` | Service internals — why it polls, the delivery state machine |
| `push-service/index.js` | The worker |
| `public/sw.js` | Service worker; push + notificationclick handlers |
| `src/lib/push.ts` | Subscription serialization and storage |
| `src/hooks/usePushNotifications.ts` | Per-device permission and subscribe state |
| `src/utils/notifications.ts` | Notification creation and the `push` envelope |
| `src/utils/notifySchedule.ts` | ET/DST release-time arithmetic |
| `src/components/NotifySchedulePicker.tsx` | Admin "when to notify" control |
| `src/app/api/cron/deadline-reminder/route.ts` | Wednesday deadline reminder |
