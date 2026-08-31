# Season 51 Implementation Spec

Companion to `season-51-rules.md`. This is the implementation-side reference — data model, phases, edge cases, and rollout strategy.

## Goals

- Soften early-season snowballing (vote-out penalty, score floor, more swaps)
- Add skill expression (Captain, Pick-em)
- Add active comeback mechanics (Merge advantages, Find triggers)
- Boost late-game stakes (Final 3, Season winner)
- Ship behind a `scoringVersion` flag so existing leagues are unaffected

## Data model

### League config additions (`League` type extension)

```ts
scoringVersion: 1 | 2          // 1 = S50 rules, 2 = S51 — gate per league
weeklyScoreFloor: number       // 0 for S51
preMergeSwapsPerWeek: number   // 2
postMergeSwapsPerWeek: number  // 1
mergeWeek?: number             // admin-set when merge airs
captainEnabled: boolean
pickEmEnabled: boolean
powersEnabled: boolean
```

### `TribeMember` additions

```ts
weeklyCaptains?: Record<number, string>   // { weekNumber: castawayId }
weeklyPickEms?: Record<number, {
  pickedCastawayId: string
  correct?: boolean              // populated when admin records boot
  contrarianBonus?: boolean
  lockedAt: Timestamp
}>
```

### `SCORING_CONFIG` changes

Existing values updated for `scoringVersion: 2`:
- `voted_out: -5` (was -10)
- `survived_episode: 0` (was 1, effectively removed)
- `made_final_three: 10` (was 5)
- `season_winner: 25` (was 10)

New event types added:
- `pick_em_correct: 3`
- `pick_em_contrarian: 2`

### New collection: `leagues/{leagueId}/advantages/{advantageId}`

```ts
{
  id: string
  type:
    | 'hidden_idol'
    | 'steal_swap'
    | 'captain_boost'
    | 'sabotage_captain'
    | 'score_shield'
    | 'bonus_pick_em'
  ownerId: string
  acquiredAt: Timestamp
  acquiredVia:
    | 'merge_distribution_guaranteed'   // 8th place's auto-Idol
    | 'merge_distribution_random'        // 4th-8th's random draw
    | 'find_falling_behind'
    | 'find_roster_massacre'
    | 'find_cold_streak'
  status: 'held' | 'used' | 'expired'
  usedAt?: Timestamp
  usedAgainstId?: string         // null for self-buffs (idol, captain_boost, score_shield, bonus_pick_em)
  usedInWeek?: number
  expiresAt?: Timestamp          // 4 weeks past merge for merge-distributed
}
```

### Find-trigger state on `TribeMember`

```ts
findTriggers?: {
  totalFound: number              // hard cap at 3
  lastFindWeek?: number           // for the universal 2-week cooldown
  rosterMassacreLastWeek?: number // for the 4-week massacre-specific cooldown
  zeroPointWeeks: number[]        // weeks with 0 score; reset to [] after Cold Streak fires
}
```

## Implementation phases

| Phase | Scope | Est. |
|---|---|---|
| 1. Scoring tweaks | `SCORING_CONFIG` values, score floor in `useComputedScores`, gated by `scoringVersion === 2` | 2-4h |
| 2. Roster/swap rules + merge toggle | Update `isNetRosterChangeAllowed`, allow drop-voted-out pre-merge, **admin merge-week toggle** (sets `mergeWeek`, triggers downstream effects below) | 4-6h |
| 3. Captain slot | Type changes, lock-page UI, ×2 multiplier in score calc, ×2 penalty if captain voted out | 4-6h |
| 4. Pick-em | Type changes, lock-page UI, evaluation when admin records vote-out, contrarian bonus calc, weekly scoreboard view | 4-6h |
| 5. Powers system | Subcollection, admin merge distribution (incl. 8th-place double allocation), 3-trigger auto-find cron, Powers tab UI, target picker, 6 backend handlers, in-app notifications, expiry job, recap view | 12-18h |
| 6. Polish | About page rules, settings UI, badges/indicators, E2E test on non-prod league | 3-5h |
| **Total** | | **27-43h** |

## Files that will need touching

- `src/utils/eventScoringConfig.ts` — point values
- `src/utils/scoring.ts` — multipliers, floor, captain logic
- `src/hooks/useScores.ts` — captain × power composition during scoring
- `src/types/league.ts`, `src/types/firestore.ts` — type extensions
- `src/app/dashboard/my-leagues/[id]/page.tsx` — captain + pick-em UI
- `src/app/dashboard/leagues/[id]/powers/` — new tab/route
- `src/app/api/cron/lock-rosters/route.ts` — find-advantage trigger logic
- `src/app/dashboard/admin/scores/page.tsx` — pick-em evaluation hook
- `src/app/dashboard/about/page.tsx` — rules doc update

## Edge cases (pre-decided)

### Power interactions

| Case | Decision |
|---|---|
| Hidden Idol auto-drop | Does NOT count against weekly swap limit (free move) |
| Sabotage vs Boost on same team same week | Sabotage wins (×1). Boost-owner finds out only at recap |
| Captain voted out + Captain Boost active | Boost wasted, ×3 of nothing = nothing. -5 penalty doubled to -10 (Boost doesn't compound the penalty further) |
| Steal a Swap timing | Must be deployed before target's Wed 8pm ET lock. If they've already locked, wasted |
| Multiple Sabotage Captains on same target same week | Idempotent (captain is already ×1) |
| Score Shield + Captain | Captain ×2 has no effect during a Shield week — roster events bypassed entirely |
| Score Shield + vote-out penalty | Bypassed for the week (penalty is part of the rostered events being skipped). **But** eliminated castaway stays on roster (no auto-drop, unlike Idol) |
| Score Shield + Sabotage Captain on same target | Sabotage wasted — target's captain isn't being scored anyway |
| Multiple Score Shields same week | Compute "would-have-scored" for every team first, then average. All Shield users get that average. No recursion |
| Score Shield + Pick-em points | Pick-em scores normally on top of the league-average team score |
| Bonus Pick-em scoring | If both submitted picks are correct, only the one with higher contrarian-bonus (or random tie-break) is kept — never double-credit |

### Pick-em rules

| Case | Decision |
|---|---|
| Contrarian threshold edge | "Less than 25%" = strictly less. Exactly 25% does not trigger contrarian |

### Find-advantage triggers

| Case | Decision |
|---|---|
| Find trigger week 1-3 | Disabled — Falling Behind requires Week 4+; other triggers also gated to Week 4+ for first eligibility |
| 7th and 8th tied | Falling Behind does not fire (no clear "10 behind the pack") |
| Falling Behind cooldown | 2 weeks since any find fired |
| Roster Massacre cooldown | 4 weeks since last Massacre fired (overrides the universal 2-week cooldown when stricter) |
| Cold Streak counter | Resets to 0 after firing — needs 3 *more* zero-point weeks to re-trigger |
| Multiple triggers fire same week | Award ONE advantage (priority: Falling Behind > Roster Massacre > Cold Streak). Counters for the non-firing triggers still update normally |
| Total finds cap | 3 per season per team, hard limit across all trigger types |

### Merge distribution

| Case | Decision |
|---|---|
| 8th place treatment | Receives Hidden Idol (guaranteed) **+** 1 random other power = 2 powers |
| 4th-7th place | 1 random power each from the catalog |
| 1st-3rd place | Nothing |
| Random pool | Uniform across all 6 catalog entries (including Hidden Idol, so 8th could get 2 Idols) |
| Tied at the merge cutoff | Standard tie-break: total points DESC, then most recent week score DESC. If still tied, both get the higher-rank treatment (i.e., a tie at 4th means both get 1 random; tie at 8th means both get Idol+random) |

## Rollout strategy

1. Build behind a `scoringVersion: 2` flag — current Bernatchez league stays untouched on `scoringVersion: 1`
2. Create a private test league with `scoringVersion: 2` to dry-run mechanics before S51 starts
3. Roll out phase-by-phase; phases 1-2 can ship anytime, phases 3-6 ideally land before S51 premiere
4. Keep a migration script ready to flip the family league to v2 on S51 launch day

## Testing strategy

### Replay testing
We have full S50 events in `seasons/50/castaways/{id}.weeklyEvents`. Use `scripts/retro-score.ts` (already built) as a foundation to replay the season under S51 rules:
- Replay scoring (already validated — Δ-29% spread)
- Add synthetic Captain choices per team per week → see how ×2 redistributes
- Add synthetic Pick-em answers → see weekly contrarian bonus shapes
- Inject merge advantages at the actual S50 merge week → see deploy patterns

### Test league
- Spin up a private league with `scoringVersion: 2` and seed it with S50 data
- Manual smoke test of every UI surface: captain selection, pick-em entry, powers tab, target picker
- Cron test: simulate a week roll where 8th is 10+ behind 7th → verify advantage was created

### Unit tests
- Scoring math correctness for v1 (regression) and v2 (new)
- Floor application (multiple vote-outs in a week → 0, not negative)
- Captain multiplier application (×2 for normal, ×3 with Boost, ×1 with Sabotage)
- Vote-out penalty doubling for captains
- Pick-em contrarian threshold edge cases (boundary at exactly 25%)
- Find-advantage trigger: cooldown, cap, week 3+ minimum, tie handling

### Beta on family league
- Phase 1-2 ship to a non-prod-cloned league for shadow testing during S50 finale weeks
- Compare shadow scores to live scores weekly to verify parity for `scoringVersion: 1` users

## Suggested timeline (S51 premiere ~late September 2026)

| Month | Goal |
|---|---|
| **May 2026** | Phase 1-2 (scoring + roster). Ship behind flag, test in shadow |
| **June** | Phase 3 (Captain) + Phase 4 (Pick-em). UI polish |
| **July** | Phase 5 (Powers) — biggest piece, leave time for iteration |
| **August** | Phase 6 (Polish), full E2E on test league with synthetic episodes |
| **Early Sept** | Family league pre-flight: educate players, run a mock pick-em / captain week |
| **S51 premiere** | Flip Bernatchez league to `scoringVersion: 2` |

## Merge toggle — what flipping it does

The league commissioner sets `mergeWeek` (a single integer — the week the merge airs) from an admin control on the league settings page. Setting this value is the single source of truth for "we are now post-merge" and triggers the following downstream effects from that week onward:

| Effect | Behavior change |
|---|---|
| Weekly swap limit | Drops from `preMergeSwapsPerWeek` (2) to `postMergeSwapsPerWeek` (1) |
| Drop voted-out castaways | Disabled — voted-out castaways stay on the roster as dead weight, slot cannot be swapped |
| Merge advantage distribution | Triggered automatically at the end of the lock cycle for `mergeWeek` — 4th-7th get 1 random power, 8th gets Idol + 1 random |
| Advantage expiry clock | All merge-distributed powers get `expiresAt = mergeWeek + 4 weeks` |
| Find-advantage triggers | Continue to function pre- and post-merge (no behavior change at merge cutoff) |

### Setter UI

- Single number input on the admin league-settings page (e.g., "Merge Week: [   ]")
- Confirmation modal before saving — "Setting this triggers merge advantage distribution and locks roster rules into post-merge mode. This action is reversible but should match the actual show's merge episode." 
- Reversible: clearing or lowering the value reverts swap limits and advantage rules, but **already-distributed merge powers are NOT clawed back** (avoids destroying player state). Worth flagging in the confirmation.
- Validation: must be ≥ current week, must be a real week number that has rosters locked

## Resolved design decisions

- **Power catalog:** 6 powers (Hidden Idol, Steal a Swap, Captain Boost, Sabotage Captain, Score Shield, Bonus Pick-em). Spy was dropped (rosters are always visible league-wide).
- **Random distribution:** Uniform across all 6 powers. 8th place's guaranteed Idol is in addition to (not in place of) their random draw.
- **Notifications:** In-app only. No email or push.
- **Score Shield mechanic:** Replaces team-score with the league-average team-score for the week. Bidirectional risk — defensive insurance, not a guaranteed gain.

## Open questions to revisit before build

- (none currently — design is locked. Re-open this section if questions surface during Phase 5 build.)
