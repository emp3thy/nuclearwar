# Slice 1 — Characters & difficulty Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Netanyahoo becomes a big-but-rare warmonger, Khameneverhere's grudge goes large, and `easy` gets light non-lethal noise instead of chaotic randomness — so games play differently, large nukes become a character trait, and easy stops being harsher than normal.

**Architecture:** Three engine edits (two build plans + the easy randomization knob), each pure/deterministic, then a balance-verification pass. No win-condition/scoring/UI change.

**Tech Stack:** TypeScript engine (pure fns, seeded RNG), vitest, `vite-node`.

**Spec:** `docs/superpowers/specs/2026-07-26-fun-while-dying-slice1-characters-difficulty-design.md`

## Global Constraints

- Every commit: `npm run typecheck` clean AND `npm run test:run` green.
- Tests: unconditional assertions only.
- Rebalance via CONSTANTS (build targets, easy pct), never by loosening a test threshold.
- Producers-before-consumers order preserved (`[...build.orders, ...salvo.orders]`).
- No win-condition/`checkOutcome`/`scoreState`/UI change (keeps hard-mode lookahead stable).

## Guardrails (better-memory)

- Planner/build-plan changes shift hard-mode lookahead + dispatcher tests OUTSIDE the edited files — run the FULL engine suite, update coincidentally-pinned expectations (mem: changing scoring/planner inputs silently shifts lookahead tests).
- `buildToward` walks the plan in order and stops when AP runs out — front-load the tier you want reachable (large), or it never builds (the exact reason large nukes never appeared).
- Every commit independently typechecks; if `applyRandomization` gains a param, update its call site same commit.

## File Structure

```
src/engine/ai/netanyahoo.ts        (modify: NETANYAHOO_BUILD_PLAN → big-but-rare)
src/engine/ai/khameneverhere.ts    (modify: KHAMENEVERHERE_BUILD_PLAN → add large tier)
src/engine/ai/index.ts             (modify: DIFFICULTY_RANDOM_PCT.easy; applyRandomization diff-aware candidate pool + threaded diff)
tests/engine/ai/netanyahoo.test.ts     (update to new build plan)
tests/engine/ai/khameneverhere.test.ts (update to new build plan)
tests/engine/ai/index.test.ts OR a new easy-randomization test (candidate-pool + pct)
tests/engine/ai/lookahead.test.ts, dispatcher.test.ts (update only if coincidentally pinned)
```

---

### Task 1: Netanyahoo — big-but-rare warmonger

**Files:** Modify `src/engine/ai/netanyahoo.ts`; Test `tests/engine/ai/netanyahoo.test.ts`.

- [ ] **Step 1: Update tests first** — netanyahoo.test.ts: assert the planner, given enough AP/rounds, emits `build-warhead` with `yield:'large'` and NO `yield:'small'`; still launches first; still respects the Chump-exception. Keep existing target-ranking assertions. Unconditional asserts. (Read the current test to reuse its state-builders.)
- [ ] **Step 2: Run — expect FAIL** (`npx vitest run tests/engine/ai/netanyahoo.test.ts`).
- [ ] **Step 3: Implement** — replace `NETANYAHOO_BUILD_PLAN`:

```ts
const NETANYAHOO_BUILD_PLAN: BuildPlanEntry[] = [
  { build: { item: 'missile' }, target: 4 },
  { build: { item: 'warhead', yield: 'large' }, target: 3 },
  { build: { item: 'warhead', yield: 'medium' }, target: 2 },
];
```
Update the file's doc comment to describe the big-but-rare doctrine (large-first, no small). Planner body/launch logic unchanged.
- [ ] **Step 4: Run — expect PASS.** Then `npx vitest run tests/engine/ai` (sibling planners/lookahead may shift — note failures for Task 4).

---

### Task 2: Khameneverhere — grudge goes large

**Files:** Modify `src/engine/ai/khameneverhere.ts`; Test `tests/engine/ai/khameneverhere.test.ts`.

- [ ] **Step 1: Update tests first** — assert the planner can emit `build-warhead` `yield:'large'` when AP allows; grudge target ranking unchanged; still launch-first. Unconditional.
- [ ] **Step 2: Run — expect FAIL.**
- [ ] **Step 3: Implement** — replace `KHAMENEVERHERE_BUILD_PLAN`:

```ts
const KHAMENEVERHERE_BUILD_PLAN: BuildPlanEntry[] = [
  { build: { item: 'missile' }, target: 5 },
  { build: { item: 'warhead', yield: 'large' }, target: 2 },
  { build: { item: 'warhead', yield: 'medium' }, target: 2 },
  { build: { item: 'warhead', yield: 'small' }, target: 2 },
];
```
Update the doc comment (grudge now goes large, falls back to medium/small so never disarmed).
- [ ] **Step 4: Run — expect PASS**, then `npx vitest run tests/engine/ai`.

---

### Task 3: Easy — light non-lethal noise

**Files:** Modify `src/engine/ai/index.ts`; Test: new/extended easy-randomization test.

- [ ] **Step 1: Write tests first** — assert: (a) `DIFFICULTY_RANDOM_PCT.easy === 0.12` (normal 0.1, hard 0); (b) the easy candidate pool excludes `build-warhead medium` and `build-warhead large`, while normal's includes them. If the candidate pool is internal, expose it via a small pure helper `randomizationCandidates(diff): Order[]` and test that directly (easy list has no medium/large warhead; normal does). Unconditional asserts.
- [ ] **Step 2: Run — expect FAIL.**
- [ ] **Step 3: Implement:**
  - `DIFFICULTY_RANDOM_PCT.easy` `0.3 → 0.12`.
  - Extract the candidate list into `function randomizationCandidates(diff: Difficulty): Order[]`: full 8-item list for non-easy; on `easy`, omit `{build-warhead medium}` and `{build-warhead large}` (keep factory, missile, bomber, small warhead, shield, aa).
  - Thread `diff` into `applyRandomization` (add a `diff: Difficulty` param) and build `candidates` from `randomizationCandidates(diff)`. Update the call site (`applyRandomization(state, leaderId, orders, DIFFICULTY_RANDOM_PCT[diff], diff)`).
- [ ] **Step 4: Run — expect PASS**, then `npm run typecheck` (catches the call-site/param wiring).

---

### Task 4: Balance verification & suite green

**Files:** whichever tests the changes shifted (lookahead/dispatcher/balance); no new source unless a rebalance is needed.

- [ ] **Step 1: Full suite** — `npm run test:run`. Update any tests that pinned old planner behaviour coincidentally (lookahead target picks, dispatcher routing) to the new correct behaviour — do NOT weaken assertions, correct them to what the new doctrine legitimately does.
- [ ] **Step 2: Termination gate** — confirm `tests/engine/ai-duel.test.ts` (`unfinished === 0` across 80 seeds) and `integration.test.ts` termination pass. If any game now stalls (Netanyahoo arming too slowly to end a 1v1), the Chump-exception/only-opponent fallback should prevent it; if not, adjust Netanyahoo's build targets (constants) so he can still finish — re-run.
- [ ] **Step 3: Distribution sanity** — read the duel breakdown the test prints. Expectation: no leader degenerately dominates (soft ≤ ~40/80); more pyrrhic/apocalypse is fine (on-theme). If Netanyahoo or Khameneverhere runs away or flatlines, tune build targets / easy pct (constants) and re-run. Record the final breakdown in the report.
- [ ] **Step 4: Typecheck + build** — `npm run typecheck && npm run build` clean.
- [ ] **Step 5: Commit** (single commit for the coupled slice; branch `feat/character-personalities`):

```bash
git add src/engine/ai tests/engine
git commit -m "feat(engine): big-nuke Netanyahoo/Khameneverhere doctrines + easy non-lethal noise"
```

---

## Self-Review Notes

- Spec coverage: §2 → Task 1; §3 → Task 2; §4 → Task 3; §5 balance/tests → Task 4.
- The one cross-file ripple is planner-behaviour → lookahead/dispatcher tests (Task 4 Step 1) and the `applyRandomization` signature (Task 3 Step 3) — both called out.
- No win-condition/scoring/UI change, so hard-mode `scoreState` and the RoundSummary/Winners UI are untouched; large-nuke visibility is now a deliberate build-plan trait, not randomness.
- If TDD reveals `buildToward` still can't reach large at realistic AP for Netanyahoo (economy too thin for a target-3 large tier), reduce the large target or add a factory entry first — flag as DONE_WITH_CONCERNS with the duel breakdown rather than silently under-arming him.
