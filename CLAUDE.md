# CLAUDE.md

## Project Summary
Survivor Fantasy League is a Next.js + Firebase web app where friends form private
leagues, draft a 5-castaway "tribe" from the current Survivor cast, and accrue
points each week based on episode events entered by a league admin. The app
handles league creation/joining via short codes, weekly add/drop with Wednesday
8pm ET deadlines, a real-time leaderboard that freezes points when a castaway is
dropped, a per-league message board with @mentions and reactions, a cross-season
hall of fame, admin tooling for episode scoring and eliminations, and a season
recap flow. It is currently mid-Season 51, with Season 50 sunset and historical
data preserved.

## WHY (Context that shapes decisions)
- Friends/family product — one league owner does admin work (scores, eliminations)
  for ~10 players per league. Optimize for that flow, not for a public-product UX.
- Firestore reads dominate cost; React Query caching and composite indexes were
  added deliberately. Don't bypass the hooks or you'll regress that work.
- Scoring must cascade correctly across all leagues when an admin enters events,
  and points only count while a castaway is on a player's roster.

## WHAT (Tech Stack)
- **Framework**: Next.js 16 (App Router, Turbopack) + React 19 + TypeScript strict
- **UI**: Material UI v7 + Emotion, Tailwind CSS v4, `@dnd-kit` for drag-drop draft
- **Data**: Firebase Auth (Google + email/magic link) + Firestore;
  `firebase-admin` for server-side scripts
- **State/caching**: TanStack React Query v5 (keys in `src/lib/query-client.tsx`)
- **PWA**: `next-pwa`; **Testing**: Vitest + React Testing Library + happy-dom
- **Hosting**: Vercel; Firestore rules/indexes deployed via Firebase CLI

## HOW (Commands)
```bash
npm run dev           # next dev (Turbopack)
npm run build         # next build
npm run lint          # next lint (eslint-config-next + core-web-vitals)
npm test              # vitest watch
npm run test:run      # vitest run (use in CI)
npm run test:coverage # coverage report
firebase deploy --only firestore:rules,firestore:indexes
```

## HOW (Conventions)
- **Imports**: use the `@/*` alias (→ `src/*`); avoid deep relative paths.
- **TypeScript**: strict + `noUnusedLocals/Parameters` + `noImplicitReturns` are
  on — fix, don't silence. Avoid `any`; prefer the shared types in `src/types/`.
- **Components**: function components with hooks, PascalCase filenames in
  `src/components/`. Co-locate tests as `Foo.test.tsx`.
- **Data access**: prefer the React Query hooks in `src/hooks/` (`useLeagues`,
  `useCastaways`, `useEpisodes`) over calling Firestore directly, so cache
  invalidation stays coherent. New query patterns usually need a composite index
  added to `firestore.indexes.json`.
- **Firestore shape**: `leagues/{id}` with `messages/` and
  `seasons/{seasonNumber}/episodes/` subcollections; global castaway profiles at
  `seasons/{n}/castaways/{id}`; admin overrides at `seasonOverrides/{n}`. Rules
  in `firestore.rules` gate by `members[]`, `ownerId`, and `users/{uid}.isAdmin`.
- **Scoring**: only count points while a castaway is on the roster — never
  recompute from raw events without checking drop weeks. Episode submission
  cascades across every league; touch `src/utils/scoring.ts` carefully and run
  its tests.
- **Validation**: always sanitize user input through `src/utils/validation.ts`
  (display names, messages, avatar URLs, league names) before writing.
- **Logging**: use module loggers from `src/lib/logger.ts` (`authLogger`,
  `dbLogger`, etc.) — they no-op in production except for `.error`. Don't add
  bare `console.log`; the Next config strips them and lint flags them.
- **Styling**: MUI is primary; Tailwind utilities are fine for layout, but don't
  mix the two approaches on one element.
- **Time-sensitive logic** (add/drop locks, weekly deadlines): week calculation
  is a known weak spot — verify against `src/data/seasons.ts` and the active
  season config before relying on hardcoded values.
- **Ad-hoc scripts** live in `scripts/` (e.g. `retro-score.ts`, `check-seasons.ts`)
  and run with `tsx` + a service account key. Never commit
  `SERVICE_ACCOUNT_KEY.json` or roster-backup JSON dumps.
