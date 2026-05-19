# Phase 4c slice 3 — Lookahead sliding-window human projection — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade Hard-mode lookahead's human-opponent projection from last-round replay (Approach A) to a sliding-window "most recent non-empty round" projection (Approach B).

**Architecture:** One new pure helper, `recentHumanOrders`, in `src/engine/ai/lookahead.ts`. The human branch of `bestTargetByLookahead` calls it instead of the inline last-round read. Window = 5 rounds. Engine-only, no RNG, determinism preserved.

**Tech Stack:** TypeScript 5.4 strict, Vitest 1.6. Deterministic seeded RNG threaded through `state.rngState` (not touched by this slice).

**Spec:** `docs/superpowers/specs/2026-05-19-phase-4c-slice3-lookahead-sliding-window-design.md`

---

## Background the implementer must know

- **Where lookahead lives:** `src/engine/ai/lookahead.ts`. `bestTargetByLookahead(state, viewer, baseline, candidates, launch, opponentPlanner)` simulates one round per candidate target and returns the highest-scoring target. It is called once, from `src/engine/ai/index.ts`, in `hard` mode only, to re-target a launch.
- **The current human projection (Approach A)** — inside `bestTargetByLookahead`, in the loop over `state.cast`:
  ```ts
  if (isHuman(id)) {
    // Project the human as repeating last round's orders. Falls back to []
    // for the first round (no history yet) or if they passed last round.
    // simulateOneRound re-validates and gracefully drops invalid orders
    // (e.g., a launch order from last round when their stockpile is now empty).
    const lastRound = state.orderHistory[state.orderHistory.length - 1];
    ordersByLeader[id] = lastRound?.[id] ?? [];
    continue;
  }
  ```
  This is the only block this slice changes. AI opponents (the `else` branch, `opponentPlanner`) are untouched.
- **`orderHistory` shape:** `GameState.orderHistory` is `Partial<Record<LeaderId, Order[]>>[]` — one entry per resolved round, each mapping leader → that round's submitted orders. Index `0` is the oldest round; the last index is the most recent. A leader that passed a round has `[]`; a leader absent from a round's entry is `undefined`.
- **The problem:** if the human passed last round, Approach A projects them as passive even after rounds of launching. Approach B walks back through a 5-round window to the human's most recent non-empty round.
- **Window = 5** — a deliberate widening of the phase-2.5 design's named value of 3 (so a human who builds quietly for several rounds before striking still projects their last real move).
- **Staleness safety net (unchanged):** `simulateOneRound` re-validates projected orders and drops any the leader can no longer afford — a launch from an earlier round the human can't arm now collapses to passive within the simulation.
- **`isHuman`, `Order`, `LeaderId`** are already imported in `lookahead.ts` (`isHuman` from `../state`; `Order`, `LeaderId` from `../types`). No new imports are needed in the source file.

---

## File Structure

**Modified — engine:**
- `src/engine/ai/lookahead.ts` — add the `LOOKAHEAD_HISTORY_WINDOW` constant and the `recentHumanOrders` helper; swap the human branch of `bestTargetByLookahead` to call it.

**Modified — tests:**
- `tests/engine/ai/lookahead.test.ts` — add a `describe('recentHumanOrders')` block (7 unit tests) and a `describe('bestTargetByLookahead — sliding-window human projection (P4c.3)')` block (1 property test).

No other files change.

---

## Task 1: `recentHumanOrders` helper

The pure sliding-window helper. Walks back from the most recent round, within a 5-round window, and returns the first round with non-empty orders for the leader.

**Confidence: 97%** — a pure function with no dependencies beyond the `Order`/`LeaderId` types; full code and tests given. Residual risk: none material.

**Files:**
- Modify: `src/engine/ai/lookahead.ts`
- Modify: `tests/engine/ai/lookahead.test.ts`

- [ ] **Step 1: Write the failing tests**

In `tests/engine/ai/lookahead.test.ts`:

First, update the two existing import lines so `recentHumanOrders` and `LeaderId` are available. The file currently has:

```ts
import { simulateOneRound, scoreState, bestTargetByLookahead } from '../../../src/engine/ai/lookahead';
```
```ts
import type { Order } from '../../../src/engine/types';
```

Change them to:

```ts
import { simulateOneRound, scoreState, bestTargetByLookahead, recentHumanOrders } from '../../../src/engine/ai/lookahead';
```
```ts
import type { LeaderId, Order } from '../../../src/engine/types';
```

Then APPEND this new `describe` block to the END of the file:

```ts
describe('recentHumanOrders', () => {
  const build: Order = { kind: 'build-factory' };
  const launch: Order = {
    kind: 'launch', target: 'carnage', delivery: 'missile', warhead: 'small', targetType: 'people',
  };

  it('returns [] for empty history', () => {
    expect(recentHumanOrders([], 'player1')).toEqual([]);
  });

  it('returns the last round when it is non-empty', () => {
    const history: Partial<Record<LeaderId, Order[]>>[] = [
      { player1: [build] },
      { player1: [launch] },
    ];
    expect(recentHumanOrders(history, 'player1')).toEqual([launch]);
  });

  it('walks back past an empty last round to the most recent non-empty round', () => {
    const history: Partial<Record<LeaderId, Order[]>>[] = [
      { player1: [launch] },
      { player1: [] },
    ];
    expect(recentHumanOrders(history, 'player1')).toEqual([launch]);
  });

  it('returns [] when every round in the window is empty', () => {
    const history: Partial<Record<LeaderId, Order[]>>[] = [
      { player1: [] },
      { player1: [] },
      { player1: [] },
    ];
    expect(recentHumanOrders(history, 'player1')).toEqual([]);
  });

  it('picks a non-empty round at the far edge of the 5-round window', () => {
    // Length 5: index 0 is exactly 5 rounds back (the last in the window).
    const history: Partial<Record<LeaderId, Order[]>>[] = [
      { player1: [launch] }, // index 0 — far edge of the window
      { player1: [] },
      { player1: [] },
      { player1: [] },
      { player1: [] },
    ];
    expect(recentHumanOrders(history, 'player1')).toEqual([launch]);
  });

  it('ignores a non-empty round one position outside the 5-round window', () => {
    // Length 6: index 0 is 6 rounds back — the scan covers indices 5..1 only.
    const history: Partial<Record<LeaderId, Order[]>>[] = [
      { player1: [launch] }, // index 0 — outside the window
      { player1: [] },
      { player1: [] },
      { player1: [] },
      { player1: [] },
      { player1: [] },
    ];
    expect(recentHumanOrders(history, 'player1')).toEqual([]);
  });

  it('skips a round with no entry for the leader (undefined)', () => {
    const history: Partial<Record<LeaderId, Order[]>>[] = [
      { player1: [launch] },
      { carnage: [build] }, // no player1 key → undefined → skipped
    ];
    expect(recentHumanOrders(history, 'player1')).toEqual([launch]);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run tests/engine/ai/lookahead.test.ts`
Expected: FAIL — the build/typecheck error is `"recentHumanOrders" is not exported by ".../lookahead.ts"` (the symbol does not exist yet).

- [ ] **Step 3: Implement `recentHumanOrders`**

In `src/engine/ai/lookahead.ts`, add the constant and the helper **directly above the `export function bestTargetByLookahead` declaration** (after `scoreState`). Insert exactly:

```ts
/** How many recent rounds the human projection looks back over. */
const LOOKAHEAD_HISTORY_WINDOW = 5;

/**
 * Project a human opponent for Hard-mode lookahead: the orders from the most
 * recent round, within the last LOOKAHEAD_HISTORY_WINDOW rounds, that has a
 * non-empty order list for `leaderId`.
 *
 * A recent pass (`[]`) no longer reads as passivity — the projection walks
 * back to the human's last real move. A non-empty round older than the window
 * is treated as stale and ignored (the human is projected as passive `[]`).
 */
export function recentHumanOrders(
  orderHistory: Partial<Record<LeaderId, Order[]>>[],
  leaderId: LeaderId,
): Order[] {
  const stop = Math.max(0, orderHistory.length - LOOKAHEAD_HISTORY_WINDOW);
  for (let r = orderHistory.length - 1; r >= stop; r--) {
    const orders = orderHistory[r]?.[leaderId];
    if (orders && orders.length > 0) return orders;
  }
  return [];
}
```

`Order` and `LeaderId` are already imported at the top of `lookahead.ts` (`import type { DeliveryType, GameState, LeaderId, Order, TargetType, Yield } from '../types';`) — do not add imports.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run tests/engine/ai/lookahead.test.ts`
Expected: PASS — the 7 new `recentHumanOrders` tests plus every pre-existing test in the file (`simulateOneRound`, `scoreState`, `bestTargetByLookahead`). The call site still uses Approach A at this point; the existing tests are unaffected.

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: clean, no output.

- [ ] **Step 6: Commit**

```bash
git add src/engine/ai/lookahead.ts tests/engine/ai/lookahead.test.ts
git commit -m "engine: add recentHumanOrders — sliding-window human projection helper"
```

---

## Task 2: Wire `recentHumanOrders` into `bestTargetByLookahead`

Swap the human branch of `bestTargetByLookahead` from the inline last-round read to the helper, and add a property test that the window walks back past a recent pass.

**Confidence: 93%** — the call-site change is a verbatim three-line swap. The property test is a deterministic equality (guaranteed to hold under Approach B by construction); the 7 unit tests from Task 1 are the rigorous coverage of the windowing logic. Residual risk: the property test could be vacuous for some seeds (the human's projected orders may not change the target choice) — it remains a correct regression guard regardless, and the unit tests carry the core coverage.

**Files:**
- Modify: `src/engine/ai/lookahead.ts`
- Modify: `tests/engine/ai/lookahead.test.ts`

- [ ] **Step 1: Swap the call site in `bestTargetByLookahead`**

In `src/engine/ai/lookahead.ts`, inside `bestTargetByLookahead`, replace the human branch. Find this block:

```ts
      if (isHuman(id)) {
        // Project the human as repeating last round's orders. Falls back to []
        // for the first round (no history yet) or if they passed last round.
        // simulateOneRound re-validates and gracefully drops invalid orders
        // (e.g., a launch order from last round when their stockpile is now empty).
        const lastRound = state.orderHistory[state.orderHistory.length - 1];
        ordersByLeader[id] = lastRound?.[id] ?? [];
        continue;
      }
```

Replace it with:

```ts
      if (isHuman(id)) {
        // Project the human by their most recent non-empty round within a
        // sliding window (Approach B — see recentHumanOrders). A recent pass no
        // longer reads as passivity. simulateOneRound re-validates and drops
        // orders the human can no longer afford (e.g. a launch from an earlier
        // round when their stockpile is now empty).
        ordersByLeader[id] = recentHumanOrders(state.orderHistory, id);
        continue;
      }
```

This is the only source change in this task.

- [ ] **Step 2: Add the property test**

APPEND this `describe` block to the END of `tests/engine/ai/lookahead.test.ts` (after the `recentHumanOrders` block from Task 1). It uses `initialState` and `dispatch`, both already imported at the top of the file.

```ts
describe('bestTargetByLookahead — sliding-window human projection (P4c.3)', () => {
  it('projects a human who passed last round by their most recent acted round', () => {
    // A Hard-mode viewer (carnage) chooses between two candidate targets.
    // player1 (human) launched at carnage, and the projection must reach that
    // round whether it is the last round or one round before a pass.
    const base = initialState({
      cast: ['carnage', 'player1', 'chump'],
      difficulty: 'hard',
      seed: 'lh-window',
    });
    base.leaders.carnage.stockpile.missiles = 1;
    base.leaders.carnage.stockpile.warheadsSmall = 1;
    // player1 needs the stock so simulateOneRound keeps the projected launch.
    base.leaders.player1.stockpile.missiles = 1;
    base.leaders.player1.stockpile.warheadsSmall = 1;

    const humanLaunch: Order = {
      kind: 'launch', target: 'carnage', delivery: 'missile', warhead: 'small', targetType: 'people',
    };

    // History A: player1 launched last round.
    const launchedLast = structuredClone(base);
    launchedLast.orderHistory = [{ player1: [humanLaunch] }];

    // History B: player1 launched, then passed last round.
    const passedLast = structuredClone(base);
    passedLast.orderHistory = [{ player1: [humanLaunch] }, { player1: [] }];

    const spec = { delivery: 'missile' as const, warhead: 'small' as const, targetType: 'people' as const };
    const candidates: LeaderId[] = ['player1', 'chump'];

    const tLaunchedLast = bestTargetByLookahead(launchedLast, 'carnage', [], candidates, spec, dispatch);
    const tPassedLast = bestTargetByLookahead(passedLast, 'carnage', [], candidates, spec, dispatch);

    // Approach B walks back past the empty last round to the same launch round,
    // so both histories project player1 identically → identical target choice.
    expect(tPassedLast).toBe(tLaunchedLast);
    // Sanity: the result is one of the candidates.
    expect(candidates).toContain(tPassedLast);
  });
});
```

- [ ] **Step 3: Run the lookahead tests**

Run: `npx vitest run tests/engine/ai/lookahead.test.ts`
Expected: PASS — the new property test, the 7 `recentHumanOrders` tests, and every pre-existing test. The pre-existing `bestTargetByLookahead` tests that involve a human (e.g. the mixed-cast-with-history test) still pass: when the human acted last round, Approach B projects exactly what Approach A did.

- [ ] **Step 4: Run the full suite + typecheck**

Run: `npm test -- --run`
Expected: PASS — all green. (Slow, ~40s+; let the ai-duel and determinism tests finish.)

Run: `npx tsc --noEmit`
Expected: clean, no output.

- [ ] **Step 5: Commit**

```bash
git add src/engine/ai/lookahead.ts tests/engine/ai/lookahead.test.ts
git commit -m "engine: lookahead projects humans via sliding-window history"
```

---

## Final steps (after all tasks)

1. Dispatch a final branch-wide code review covering both commits.
2. Run `npm test -- --run` and `npx tsc --noEmit` once more — both must be green/clean.
3. Use `superpowers:finishing-a-development-branch`: push + PR + babysit BugBot + merge + main pull (the standing flow for this project). The branch `feat/p4c-slice3-lookahead-sliding-window` already exists and carries the design-spec commit.

---

## Confidence summary

| Task | Confidence | Note |
|------|-----------|------|
| T1 — `recentHumanOrders` helper | 97% | pure fn, full code + 7 tests given; types verified present in `lookahead.ts` |
| T2 — wire into `bestTargetByLookahead` | 93% | verbatim 3-line call-site swap; property test is a deterministic equality, unit tests carry core coverage |

No task is below 90%. The one soft spot — whether the T2 property test is vacuous for the chosen seed — does not lower correctness: the test is a valid Approach-B equality guard regardless, and Task 1's 7 unit tests rigorously cover the windowing logic independently of the lookahead integration.

---

## Self-review

**Spec coverage:**
- §3.1 `recentHumanOrders` helper + `LOOKAHEAD_HISTORY_WINDOW = 5` → Task 1.
- §3.2 call-site change in `bestTargetByLookahead` → Task 2 Step 1.
- §4 behaviour (last round acted / passed-then-walk-back / all-empty / stale-outside-window) → covered by Task 1's 7 unit tests (last-round-non-empty, walk-back, all-empty, far-edge-picked, outside-window-ignored, undefined-skipped, empty-history).
- §5.1 unit tests → Task 1 Step 1 (the spec lists 6; the plan adds a 7th — "far edge of the window" — so the window size itself is pinned from both sides).
- §5.2 behavioural test → Task 2 Step 2 (realised as a deterministic Approach-B equality property, per the spec's own minor/accepted note that this is a test-construction task).
- §5.3 regression → Task 2 Step 4 (full suite + tsc); existing `lookahead.test.ts` tests are explicitly expected to still pass.
- §6 out of scope (Approach C, `dispatch`/`scoreState`/`simulateOneRound`, runtime window config, multi-round lookahead) → no task touches them.

**Placeholder scan:** No TBD/TODO. Every code step has the exact code. Every command has its expected output.

**Type consistency:** `recentHumanOrders(orderHistory: Partial<Record<LeaderId, Order[]>>[], leaderId: LeaderId): Order[]` — the signature in Task 1 Step 3 matches the call in Task 2 Step 1 (`recentHumanOrders(state.orderHistory, id)`, where `state.orderHistory` is typed `Partial<Record<LeaderId, Order[]>>[]` and `id: LeaderId`) and the test calls in Task 1 Step 1. `LOOKAHEAD_HISTORY_WINDOW` is defined once (Task 1) and read only inside the helper.
