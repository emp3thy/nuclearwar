# nuke — "fun while dying" slice 1: characters & difficulty

**Date:** 2026-07-26
**Status:** approved in brainstorming; pending spec review
**Design frame:** Make games play differently and the cast read louder — the variety the playability assessment (`docs/playability/playability-usability-assessment.md`, criteria C3/C6/C7) says the game lacks. Two named leaders get distinct big-nuke/all-in doctrines, and `easy` is reworked so its difficulty is *character*, not chaotic randomness (fixing the data finding that easy is harsher than normal). Slice 1 of 3; slice 2 (newspaper) shipped in PR #16; slice 3 (score-how-you-died) follows.

## 0. Decisions (locked in brainstorming)

- **Netanyahoo → big-but-rare warmonger.** A deliberate big-bomb doctrine: builds toward *large* warheads over volume; fires fewer, huge strikes rather than spamming small.
- **Khameneverhere → grudge big-nuke builder.** His vengeance goes large — build plan reaches large warheads, fired at his top grudge target.
- **Easy → light non-lethal noise.** Keep a little randomness for per-game variety, but never let it manufacture big/concentrated strikes; lower the rate. Fixes the easy-harsher-than-normal paradox.
- **Scope: these two leaders + easy only.** Other planners (Chump/Carnage/Mileigh/Burn'em) unchanged this slice.

## 1. Background (why large nukes never appear today)

From the AI-behaviour study: large warheads only ever appear via the easy/normal *randomness knob*, never as strategy (hard fired 0 large across 100 games). Root cause (verified in code): `launchSalvo` fires largest-yield-first, so the constraint is *building*. Only Netanyahoo has a large-warhead build entry and it sits **last** in his plan (`{large, target:2}` after missile/small/medium), so AP is exhausted before `buildToward` reaches it. Khameneverhere has no large entry at all. This slice makes large warheads a **deliberate character trait** for these two by making the large tier reachable.

## 2. Netanyahoo — big-but-rare (`src/engine/ai/netanyahoo.ts`)

Keep the warmonger frame (launch-first uncapped salvo → `launchSalvo` fires largest-first; Chump-exception until provoked, with the only-opponent deadlock fallback; propaganda at Chump). **Change only the build plan** so AP flows to large warheads first:

```ts
const NETANYAHOO_BUILD_PLAN: BuildPlanEntry[] = [
  { build: { item: 'missile' }, target: 4 },          // delivery, first
  { build: { item: 'warhead', yield: 'large' }, target: 3 },  // primary doctrine
  { build: { item: 'warhead', yield: 'medium' }, target: 2 }, // fallback yield
];
```

- Drop the small-warhead tier entirely — Netanyahoo does not do small nukes.
- Large is now reachable (front of the plan after delivery), so over a few rounds he accumulates large warheads and `launchSalvo` fires them. Because large costs 3 AP to build, he arms slowly → **rare but devastating** strikes. This is the doctrine, not a bug.
- `netanyahoo-launch-bonus` (existing `bonusRule`) already rewards his launching — unchanged.

## 3. Khameneverhere — grudge goes large (`src/engine/ai/khameneverhere.ts`)

Keep the grudge frame (top-grudge-first ranking, launch-first uncapped, no diplomacy). Add a large tier, front-loaded enough to be reachable:

```ts
const KHAMENEVERHERE_BUILD_PLAN: BuildPlanEntry[] = [
  { build: { item: 'missile' }, target: 5 },
  { build: { item: 'warhead', yield: 'large' }, target: 2 },   // vengeance goes big
  { build: { item: 'warhead', yield: 'medium' }, target: 2 },
  { build: { item: 'warhead', yield: 'small' }, target: 2 },
];
```

- Large first among warheads → when he can afford it, his grudge strikes land large; when he can't, he falls back to medium/small so he is never disarmed. He stays launch-happy (unlike Netanyahoo's rarer cadence) but now hits harder against whoever wronged him.

## 4. Easy difficulty — light non-lethal noise (`src/engine/ai/index.ts`)

Two changes to `applyRandomization` / its config:
1. **Lower the rate:** `DIFFICULTY_RANDOM_PCT.easy` `0.3 → 0.12`. (Normal stays `0.1`, hard `0`.)
2. **Non-lethal candidate pool on easy:** the random-swap `candidates` list currently includes `build-warhead medium` and `build-warhead large` — the exact source of easy's chaotic big strikes (12.4% of easy launches were large, ~3× normal). Make the candidate pool **difficulty-aware**: on easy, exclude `build-warhead medium` and `build-warhead large` (keep factory, missile, bomber, small warhead, shield, aa). Normal keeps the full pool (its large-warhead rate of 3.8% is acceptable and we don't want to shift normal balance).

Effect: easy still varies game-to-game (12% noise) so no two easy games are identical, but the noise can no longer manufacture big/concentrated strikes → easy stops being deadlier than normal. This is the "difficulty = character, not chaos" fix.

Determinism note: randomization seeds from `state.rngState` (existing "shadow" read), so easy stays reproducible per seed while differing across seeds — unchanged mechanism, just gentler content.

## 5. Balance & tests

- **Hard gate (must stay green):** `tests/engine/ai-duel.test.ts` asserts `unfinished === 0` across 80 seeds (every all-AI game terminates); `tests/engine/integration.test.ts` termination. Big-nuke doctrines accelerate deaths, which helps termination, but Netanyahoo's slower arming must not stall — the existing Chump-exception/only-opponent fallback prevents that; verify with the duel run.
- **Distribution:** the duel test prints a per-leader win breakdown but has **no hard threshold**. Target: no single leader degenerately dominates (soft ≤ ~40/80) and more pyrrhic/apocalypse outcomes are *fine* (on-theme). If a leader runs away or games stall, rebalance the **constants** (build targets, easy pct) — never loosen a test threshold.
- **Per-planner tests:** `tests/engine/ai/netanyahoo.test.ts` and `.../khameneverhere.test.ts` assert build/launch behaviour — update to the new build plans (e.g. Netanyahoo emits `build-warhead large` when AP allows and no longer emits small; Khameneverhere can emit large). Assertions unconditional.
- **Lookahead / dispatcher ripple:** hard-mode lookahead (`lookahead.ts`) uses `dispatch` for opponents and only rewrites launch *targets*; changing build plans can shift `lookahead.test.ts` / `dispatcher.test.ts` expectations. Run the full engine suite and update any coincidentally-pinned expectations (mem: planner/scoring changes shift lookahead tests outside the planned files).
- **Easy randomization test:** add a unit test that the easy candidate pool excludes medium/large warheads (and normal does not), and that `DIFFICULTY_RANDOM_PCT.easy` is the lowered value.

## 6. Out of scope
- Other leaders' personalities (Chump/Carnage/Mileigh/Burn'em) — untouched.
- Newspaper content (slice 2, shipped). Scoring/outcome (slice 3).
- Win-condition / `checkOutcome` / `scoreState` changes — NONE (keeps hard-mode lookahead stable).
- UI — none; this is engine-only.

## 7. Constraints
- Every commit typechecks (`tsc --noEmit`) and passes `npm run test:run`; no guarded assertions.
- Rebalance via constants, not test thresholds.
- Keep producers-before-consumers order in emitted batches (existing `[...build.orders, ...salvo.orders]`).
