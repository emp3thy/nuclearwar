# Phase 4c slice 2 — AI aggression rework + elimination-only endings — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the AI cast actually fight — repair two planners that structurally cannot fire, give every personality a multi-launch yield-ramping offence, give Starmless a kill instinct, and remove the dominance win condition so games end by elimination.

**Architecture:** Approach B — two shared, tested helpers in a new `src/engine/ai/aggression.ts` (`buildToward` for capped builds, `launchSalvo` for largest-yield-first multi-launch) called by all six planners. Each planner keeps its own target ranking and build plan, so the aggression spectrum survives. The dominance win condition and its `dominanceThreshold` config are deleted; games end on survivor / apocalypse / pyrrhic only.

**Tech Stack:** TypeScript 5.4 strict, Vitest 1.5, React 18 (UI only — one file). Engine purity rule: no React under `src/engine/**`. Deterministic seeded RNG threaded through `state.rngState`.

**Spec:** `docs/superpowers/specs/2026-05-16-phase-4c-slice2-ai-aggression-design.md`

---

## Background the implementer must know

- **Why Netanyahoo never fires:** his build loop is `while (remaining >= 1) build-missile`. `build-missile` is uncapped in `validateOrder` (always `ok`), so the loop eats his entire build budget every round. The warhead loop below it never runs → `warheadsSmall` stays 0 → his `canLaunch` (needs `warheadsSmall >= 1`) is never true.
- **Why Mileigh-hem never fires:** `planMileighHem` has no build orders at all; both its modes only spend existing stockpile, which starts empty.
- **Validation ordering rule:** the reducer and `validateOrderSequence` validate an order array *in sequence*, projecting stockpile mutations. A `launch` order placed before the `build-missile`/`build-warhead` that arms it will fail validation. **Builds must always precede launches in the submitted array.**
- **Round-start ammo:** a planner's launches this round consume ammo the leader *already owned at round start*. Builds this round resolve in the build phase and add ammo for *next* round. Both happen in the same submitted array; ordering builds-before-launches keeps `validateOrderSequence`'s projection valid.
- **The launch-first-budget pattern (used by every aggressive planner):** compute `offenceBudget`, call `launchSalvo` first — it self-limits to ammo on hand and only spends 2 AP per armed launch — then call `buildToward` with `offenceBudget - salvo.apSpent`. A leader with no ammo spends nothing on the salvo and all of it on building; a well-armed leader fires hard and builds with the remainder. This is self-balancing. The emitted array is then ordered `[...builds, ...launches, ...diplomacy]`.
- **`launchSalvo` self-limits:** it tracks a *projected* stockpile internally (decrementing as it emits launches) so it never emits more launches than the leader can arm. `validateOrder` alone cannot catch this — it checks the real, unmutated stockpile.

---

## File Structure

**New files:**
- `src/engine/ai/aggression.ts` — `buildToward` + `launchSalvo` helpers and their exported types. Pure, no React, no RNG.
- `tests/engine/ai/aggression.test.ts` — helper unit tests.

**Modified — engine:**
- `src/engine/winConditions.ts` — remove the dominance branch from `checkOutcome`.
- `src/engine/types.ts` — remove `dominance` from `WinType` and `WinOutcome`; remove `dominanceThreshold` from `GameConfig`.
- `src/engine/balance.ts` — remove `DOMINANCE_THRESHOLD_DEFAULT`.
- `src/engine/index.ts` — remove the `DOMINANCE_THRESHOLD_DEFAULT` re-export.
- `src/engine/state.ts` — remove the `dominanceThreshold` wiring in `initialState`.
- `src/engine/ai/netanyahoo.ts`, `khameneverhere.ts`, `mileighhem.ts`, `carnage.ts`, `starmless.ts`, `chump.ts` — rework onto the helpers.

**Modified — UI:**
- `src/ui/screens/Winners.tsx` — remove the `dominance` cases from `pickHeadline` and `pickSubLine`.

**Modified — tests:**
- `tests/engine/winConditions.test.ts` — remove dominance cases.
- `tests/engine/state.test.ts` — remove the `dominanceThreshold` default assertion.
- `tests/engine/balance.test.ts` — remove the `DOMINANCE_THRESHOLD_DEFAULT` import + assertion.
- `tests/engine/integration.test.ts` — remove the "reaches an outcome within 100 rounds" test (scripted games terminated *only* via dominance).
- `tests/engine/determinism.test.ts` — remove the now-invalid `dominanceThreshold` config from `runGame`.
- `tests/engine/ai/netanyahoo.test.ts`, `khameneverhere.test.ts`, `mileighhem.test.ts`, `carnage.test.ts`, `starmless.test.ts`, `chump.test.ts` — rework assertions.
- `tests/engine/ai-duel.test.ts` — replace "no crash" with a termination assertion.
- `README.md` — Phase 4c slice 2 status; correct "four win conditions" → three.

---

## Task 1: Remove the dominance win condition (elimination-only endings)

Self-contained, independent of the helpers. Removes the dominance rule and all its dead code across engine, UI, and tests.

**Files:**
- Modify: `src/engine/winConditions.ts`
- Modify: `src/engine/types.ts`
- Modify: `src/engine/balance.ts`
- Modify: `src/engine/index.ts`
- Modify: `src/engine/state.ts`
- Modify: `src/ui/screens/Winners.tsx`
- Modify: `tests/engine/winConditions.test.ts`
- Modify: `tests/engine/state.test.ts`
- Modify: `tests/engine/balance.test.ts`
- Modify: `tests/engine/integration.test.ts`
- Modify: `tests/engine/determinism.test.ts`

- [ ] **Step 1: Update `winConditions.test.ts` — remove dominance cases**

Delete these three `it(...)` blocks entirely: `'returns dominance when one leader has 2× the next-highest population'`, `'does not return dominance when ratio is below threshold'`, and `'survivor takes priority over dominance'`. Rename the first remaining test from `'returns null while multiple leaders are alive and no dominance'` to `'returns null while multiple leaders are alive'`. The file keeps four tests: returns-null, survivor, pyrrhic, apocalypse.

- [ ] **Step 2: Run the win-condition tests to verify they fail**

Run: `npx vitest run tests/engine/winConditions.test.ts`
Expected: FAIL — the renamed/kept tests still pass, but the file will not yet compile cleanly once later steps land. At this point it should still PASS (no source change yet). This step just confirms the edited test file is green before touching source. Expected: PASS, 4 tests.

- [ ] **Step 3: Remove the dominance branch from `checkOutcome`**

In `src/engine/winConditions.ts`, delete the entire "3) Dominance" block. The function becomes:

```ts
import type { GameState, LeaderId, WinOutcome } from './types';

export function checkOutcome(
  state: GameState,
  startOfRoundPop: Partial<Record<LeaderId, number>>,
): WinOutcome | null {
  const alive = state.cast.filter((id) => state.leaders[id].population > 0);

  // 1) Survivor — exactly one leader alive.
  if (alive.length === 1) {
    return { type: 'survivor', winner: alive[0] };
  }

  // 2) Pyrrhic / apocalypse — nobody alive.
  if (alive.length === 0) {
    let bestId: LeaderId | undefined;
    let bestPop = -1;
    for (const id of state.cast) {
      const p = startOfRoundPop[id] ?? 0;
      if (p > bestPop) {
        bestPop = p;
        bestId = id;
      }
    }
    if (bestPop > 0 && bestId) return { type: 'pyrrhic', winner: bestId };
    return { type: 'apocalypse' };
  }

  return null;
}
```

- [ ] **Step 4: Remove `dominance` from the type union and `dominanceThreshold` from config**

In `src/engine/types.ts`:
- Line 24 — change `export type WinType = 'survivor' | 'pyrrhic' | 'apocalypse' | 'dominance';` to `export type WinType = 'survivor' | 'pyrrhic' | 'apocalypse';`
- In `GameConfig`, delete the line `dominanceThreshold: number;`
- In `WinOutcome`, change `| { type: 'survivor' | 'pyrrhic' | 'dominance'; winner: LeaderId };` to `| { type: 'survivor' | 'pyrrhic'; winner: LeaderId };`

- [ ] **Step 5: Remove `DOMINANCE_THRESHOLD_DEFAULT` from balance and its re-export**

In `src/engine/balance.ts`, delete the line `export const DOMINANCE_THRESHOLD_DEFAULT = 2;`.
In `src/engine/index.ts`, delete `DOMINANCE_THRESHOLD_DEFAULT,` from the balance re-export block.

- [ ] **Step 6: Remove the `dominanceThreshold` wiring in `initialState`**

In `src/engine/state.ts`:
- Change the import `import { DOMINANCE_THRESHOLD_DEFAULT, LEADER_PROFILES } from './balance';` to `import { LEADER_PROFILES } from './balance';`
- In the returned `config` object, delete the line `dominanceThreshold: DOMINANCE_THRESHOLD_DEFAULT,`. The `config` block becomes:

```ts
    config: {
      fastPlay: false,
      ...opts.config,
    },
```

- [ ] **Step 7: Remove the `dominance` cases from `Winners.tsx`**

In `src/ui/screens/Winners.tsx`:
- In `pickHeadline`, delete the `case 'dominance':` line (it sits between `case 'pyrrhic':` and the `return` — just remove that one line; `survivor` and `pyrrhic` still fall through to the same `return`).
- In `pickSubLine`, delete the entire `case 'dominance': { ... }` block (lines forming that case).

The two switches now cover `apocalypse`, `survivor`, `pyrrhic` — exhaustive against the narrowed `WinOutcome`, so the compiler is satisfied.

- [ ] **Step 8: Fix `state.test.ts`, `balance.test.ts`, `integration.test.ts`, `determinism.test.ts`**

`tests/engine/state.test.ts` — delete the test `it('defaults config dominanceThreshold to 2 and fastPlay to false', ...)`. If a `fastPlay` default still needs coverage, replace it with:

```ts
  it('defaults config fastPlay to false', () => {
    const s = initialState({ cast: ['chump', 'carnage'], difficulty: 'normal', seed: 'cfg' });
    expect(s.config.fastPlay).toBe(false);
  });
```

`tests/engine/balance.test.ts` — remove `DOMINANCE_THRESHOLD_DEFAULT` from the import list (line 10) and delete the assertion `expect(DOMINANCE_THRESHOLD_DEFAULT).toBe(2);` (and its enclosing `it(...)` if that is the only assertion in it).

`tests/engine/integration.test.ts` — delete the entire test `it('reaches an outcome within 100 rounds for sample seeds', ...)`. Scripted games never eliminate anyone; they terminated *only* via dominance, so this test's premise is gone. The other two integration tests stay.

`tests/engine/determinism.test.ts` — in `runGame`, remove `config: { dominanceThreshold: 1.5 },` from the `initialState` call and delete the stale 3-line comment above it. `runGame` still caps at `maxRounds = 80`, so determinism comparisons remain valid even though scripted games no longer reach an outcome.

- [ ] **Step 9: Run the full suite and typecheck**

Run: `npm test -- --run`
Expected: PASS — all green. The dominance tests are gone; nothing references the removed symbols.

Run: `npx tsc --noEmit`
Expected: clean, no output. (If `tsc` flags an unreferenced `dominance` anywhere, fix that reference — there should be none.)

- [ ] **Step 10: Commit**

```bash
git add src/engine/winConditions.ts src/engine/types.ts src/engine/balance.ts src/engine/index.ts src/engine/state.ts src/ui/screens/Winners.tsx tests/engine/winConditions.test.ts tests/engine/state.test.ts tests/engine/balance.test.ts tests/engine/integration.test.ts tests/engine/determinism.test.ts
git commit -m "engine: remove dominance win condition — games end by elimination only"
```

---

## Task 2: `buildToward` helper

The capped build helper. A planner passes an ordered, capped build plan; `buildToward` emits build orders up to each cap, in priority order, until budget runs out.

**Files:**
- Create: `src/engine/ai/aggression.ts`
- Create: `tests/engine/ai/aggression.test.ts`

- [ ] **Step 1: Write the failing tests for `buildToward`**

Create `tests/engine/ai/aggression.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { buildToward, type BuildPlanEntry } from '../../../src/engine/ai/aggression';
import { initialState } from '../../../src/engine/state';

describe('buildToward', () => {
  it('builds each plan entry up to its target and no further', () => {
    const s = initialState({ cast: ['netanyahoo', 'chump'], difficulty: 'normal', seed: 'b1' });
    s.leaders.netanyahoo.stockpile.missiles = 0;
    const plan: BuildPlanEntry[] = [{ build: { item: 'missile' }, target: 3 }];
    const r = buildToward(s, 'netanyahoo', plan, 10);
    expect(r.orders.filter((o) => o.kind === 'build-missile')).toHaveLength(3);
    expect(r.apSpent).toBe(3); // build-missile costs 1
  });

  it('counts existing stockpile toward the target', () => {
    const s = initialState({ cast: ['netanyahoo', 'chump'], difficulty: 'normal', seed: 'b2' });
    s.leaders.netanyahoo.stockpile.missiles = 2;
    const plan: BuildPlanEntry[] = [{ build: { item: 'missile' }, target: 3 }];
    const r = buildToward(s, 'netanyahoo', plan, 10);
    expect(r.orders.filter((o) => o.kind === 'build-missile')).toHaveLength(1);
  });

  it('walks entries in priority order and stops at budget exhaustion', () => {
    const s = initialState({ cast: ['netanyahoo', 'chump'], difficulty: 'normal', seed: 'b3' });
    const plan: BuildPlanEntry[] = [
      { build: { item: 'missile' }, target: 5 },
      { build: { item: 'warhead', yield: 'small' }, target: 5 },
    ];
    const r = buildToward(s, 'netanyahoo', plan, 3); // only 3 AP, missile costs 1
    expect(r.orders.filter((o) => o.kind === 'build-missile')).toHaveLength(3);
    expect(r.orders.filter((o) => o.kind === 'build-warhead')).toHaveLength(0);
  });

  it('respects per-yield warhead targets independently', () => {
    const s = initialState({ cast: ['netanyahoo', 'chump'], difficulty: 'normal', seed: 'b4' });
    const plan: BuildPlanEntry[] = [
      { build: { item: 'warhead', yield: 'small' }, target: 2 },
      { build: { item: 'warhead', yield: 'large' }, target: 1 },
    ];
    const r = buildToward(s, 'netanyahoo', plan, 20);
    expect(r.orders.filter((o) => o.kind === 'build-warhead' && o.yield === 'small')).toHaveLength(2);
    expect(r.orders.filter((o) => o.kind === 'build-warhead' && o.yield === 'large')).toHaveLength(1);
    expect(r.apSpent).toBe(2 * 1 + 1 * 3); // small=1, large=3
  });

  it('emits nothing when budget is below the cheapest item cost', () => {
    const s = initialState({ cast: ['starmless', 'chump'], difficulty: 'normal', seed: 'b5' });
    const plan: BuildPlanEntry[] = [{ build: { item: 'factory' }, target: 5 }];
    const r = buildToward(s, 'starmless', plan, 2); // factory costs 3
    expect(r.orders).toHaveLength(0);
    expect(r.apSpent).toBe(0);
  });

  it('emits nothing for an already-satisfied plan', () => {
    const s = initialState({ cast: ['netanyahoo', 'chump'], difficulty: 'normal', seed: 'b6' });
    s.leaders.netanyahoo.stockpile.missiles = 9;
    const plan: BuildPlanEntry[] = [{ build: { item: 'missile' }, target: 3 }];
    const r = buildToward(s, 'netanyahoo', plan, 10);
    expect(r.orders).toHaveLength(0);
  });

  it('builds bombers and defences from the plan', () => {
    const s = initialState({ cast: ['carnage', 'chump'], difficulty: 'normal', seed: 'b7' });
    const plan: BuildPlanEntry[] = [
      { build: { item: 'bomber' }, target: 1 },
      { build: { item: 'defence', type: 'shield' }, target: 1 },
    ];
    const r = buildToward(s, 'carnage', plan, 20);
    expect(r.orders.filter((o) => o.kind === 'build-bomber')).toHaveLength(1);
    expect(r.orders.filter((o) => o.kind === 'build-defence')).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run tests/engine/ai/aggression.test.ts`
Expected: FAIL — `Cannot find module '../../../src/engine/ai/aggression'`.

- [ ] **Step 3: Implement `buildToward`**

Create `src/engine/ai/aggression.ts`:

```ts
import type { GameState, LeaderId, Order, Yield } from '../types';
import { ACTION_COSTS } from '../balance';
import { apCostOf, validateOrder } from '../orders';
import { warheadFieldFor } from '../launches';

// --- buildToward ---------------------------------------------------------

export type BuildItem =
  | { item: 'factory' }
  | { item: 'missile' }
  | { item: 'bomber' }
  | { item: 'warhead'; yield: Yield }
  | { item: 'defence'; type: 'shield' | 'aa' };

export interface BuildPlanEntry {
  build: BuildItem;
  /** Build up to this many TOTAL (current stockpile + queued by this call). */
  target: number;
}

export interface BuildResult {
  orders: Order[];
  apSpent: number;
}

function buildOrderFor(b: BuildItem): Order {
  switch (b.item) {
    case 'factory': return { kind: 'build-factory' };
    case 'missile': return { kind: 'build-missile' };
    case 'bomber': return { kind: 'build-bomber' };
    case 'warhead': return { kind: 'build-warhead', yield: b.yield };
    case 'defence': return { kind: 'build-defence', type: b.type };
  }
}

function currentCount(state: GameState, leaderId: LeaderId, b: BuildItem): number {
  const me = state.leaders[leaderId];
  switch (b.item) {
    case 'factory': return me.factories;
    case 'missile': return me.stockpile.missiles;
    case 'bomber': return me.stockpile.bombers;
    case 'warhead': return me.stockpile[warheadFieldFor(b.yield)];
    case 'defence': return b.type === 'shield' ? me.stockpile.shields : me.stockpile.aa;
  }
}

function matchesBuildItem(o: Order, b: BuildItem): boolean {
  switch (b.item) {
    case 'factory': return o.kind === 'build-factory';
    case 'missile': return o.kind === 'build-missile';
    case 'bomber': return o.kind === 'build-bomber';
    case 'warhead': return o.kind === 'build-warhead' && o.yield === b.yield;
    case 'defence': return o.kind === 'build-defence' && o.type === b.type;
  }
}

/**
 * Walk an ordered, capped build plan. For each entry, emit build orders until
 * the leader's count of that item (current stockpile + orders queued by this
 * call) reaches `target`, the budget cannot afford the item, or validation
 * fails. The cap makes an unbounded build loop inexpressible.
 */
export function buildToward(
  state: GameState,
  leaderId: LeaderId,
  plan: BuildPlanEntry[],
  budget: number,
): BuildResult {
  const orders: Order[] = [];
  let remaining = budget;
  for (const entry of plan) {
    const order = buildOrderFor(entry.build);
    const cost = apCostOf(order);
    const baseCount = currentCount(state, leaderId, entry.build);
    while (
      baseCount + orders.filter((o) => matchesBuildItem(o, entry.build)).length < entry.target &&
      remaining >= cost &&
      validateOrder(state, leaderId, order).ok
    ) {
      orders.push(order);
      remaining -= cost;
    }
  }
  return { orders, apSpent: budget - remaining };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run tests/engine/ai/aggression.test.ts`
Expected: PASS — 7 tests.

- [ ] **Step 5: Commit**

```bash
git add src/engine/ai/aggression.ts tests/engine/ai/aggression.test.ts
git commit -m "engine: add buildToward AI helper — capped, priority-ordered builds"
```

---

## Task 3: `launchSalvo` helper

The volume+yield core. Pairs delivery vehicles with warheads largest-yield-first, emits launches until AP, ammo, or the cap runs out.

**Files:**
- Modify: `src/engine/ai/aggression.ts`
- Modify: `tests/engine/ai/aggression.test.ts`

- [ ] **Step 1: Write the failing tests for `launchSalvo`**

Append to `tests/engine/ai/aggression.test.ts` (add `launchSalvo` to the import from `aggression`):

```ts
import { launchSalvo } from '../../../src/engine/ai/aggression';

describe('launchSalvo', () => {
  it('fires until AP and ammo run out when no cap is given', () => {
    const s = initialState({ cast: ['netanyahoo', 'chump'], difficulty: 'normal', seed: 'l1' });
    s.leaders.netanyahoo.stockpile.missiles = 3;
    s.leaders.netanyahoo.stockpile.warheadsSmall = 3;
    const r = launchSalvo(s, 'netanyahoo', { budget: 100, rankedTargets: ['chump'] });
    expect(r.orders).toHaveLength(3); // 3 missile+warhead pairs
    expect(r.apSpent).toBe(6); // launch costs 2
  });

  it('honours maxLaunches', () => {
    const s = initialState({ cast: ['netanyahoo', 'chump'], difficulty: 'normal', seed: 'l2' });
    s.leaders.netanyahoo.stockpile.missiles = 5;
    s.leaders.netanyahoo.stockpile.warheadsSmall = 5;
    const r = launchSalvo(s, 'netanyahoo', { budget: 100, rankedTargets: ['chump'], maxLaunches: 2 });
    expect(r.orders).toHaveLength(2);
  });

  it('stops when budget cannot cover another launch', () => {
    const s = initialState({ cast: ['netanyahoo', 'chump'], difficulty: 'normal', seed: 'l3' });
    s.leaders.netanyahoo.stockpile.missiles = 5;
    s.leaders.netanyahoo.stockpile.warheadsSmall = 5;
    const r = launchSalvo(s, 'netanyahoo', { budget: 5, rankedTargets: ['chump'] });
    expect(r.orders).toHaveLength(2); // 5 AP / 2 per launch = 2
  });

  it('pairs largest-yield warheads first', () => {
    const s = initialState({ cast: ['netanyahoo', 'chump'], difficulty: 'normal', seed: 'l4' });
    s.leaders.netanyahoo.stockpile.missiles = 3;
    s.leaders.netanyahoo.stockpile.warheadsSmall = 1;
    s.leaders.netanyahoo.stockpile.warheadsMedium = 1;
    s.leaders.netanyahoo.stockpile.warheadsLarge = 1;
    const r = launchSalvo(s, 'netanyahoo', { budget: 100, rankedTargets: ['chump'] });
    const yields = r.orders.map((o) => (o.kind === 'launch' ? o.warhead : null));
    expect(yields).toEqual(['large', 'medium', 'small']);
  });

  it('prefers bomber delivery when a bomber is in stock', () => {
    const s = initialState({ cast: ['carnage', 'chump'], difficulty: 'normal', seed: 'l5' });
    s.leaders.carnage.stockpile.bombers = 1;
    s.leaders.carnage.stockpile.missiles = 1;
    s.leaders.carnage.stockpile.warheadsSmall = 2;
    const r = launchSalvo(s, 'carnage', { budget: 100, rankedTargets: ['chump'] });
    expect(r.orders).toHaveLength(2);
    if (r.orders[0].kind === 'launch') expect(r.orders[0].delivery).toBe('bomber');
    if (r.orders[1].kind === 'launch') expect(r.orders[1].delivery).toBe('missile');
  });

  it('focus-fires rankedTargets[0] by default', () => {
    const s = initialState({ cast: ['netanyahoo', 'chump', 'carnage'], difficulty: 'normal', seed: 'l6' });
    s.leaders.netanyahoo.stockpile.missiles = 3;
    s.leaders.netanyahoo.stockpile.warheadsSmall = 3;
    const r = launchSalvo(s, 'netanyahoo', { budget: 100, rankedTargets: ['carnage', 'chump'] });
    expect(r.orders.every((o) => o.kind === 'launch' && o.target === 'carnage')).toBe(true);
  });

  it('cycles targets when spread is true', () => {
    const s = initialState({ cast: ['mileigh-hem', 'chump', 'carnage'], difficulty: 'normal', seed: 'l7' });
    s.leaders['mileigh-hem'].stockpile.missiles = 4;
    s.leaders['mileigh-hem'].stockpile.warheadsSmall = 4;
    const r = launchSalvo(s, 'mileigh-hem', { budget: 100, rankedTargets: ['chump', 'carnage'], spread: true });
    const targets = r.orders.map((o) => (o.kind === 'launch' ? o.target : null));
    expect(targets).toEqual(['chump', 'carnage', 'chump', 'carnage']);
  });

  it('never emits more launches than the projected stockpile can arm', () => {
    const s = initialState({ cast: ['netanyahoo', 'chump'], difficulty: 'normal', seed: 'l8' });
    s.leaders.netanyahoo.stockpile.missiles = 1;
    s.leaders.netanyahoo.stockpile.warheadsSmall = 5;
    const r = launchSalvo(s, 'netanyahoo', { budget: 100, rankedTargets: ['chump'] });
    expect(r.orders).toHaveLength(1); // only 1 delivery vehicle
  });

  it('returns nothing for empty rankedTargets', () => {
    const s = initialState({ cast: ['netanyahoo', 'chump'], difficulty: 'normal', seed: 'l9' });
    s.leaders.netanyahoo.stockpile.missiles = 3;
    s.leaders.netanyahoo.stockpile.warheadsSmall = 3;
    const r = launchSalvo(s, 'netanyahoo', { budget: 100, rankedTargets: [] });
    expect(r.orders).toHaveLength(0);
    expect(r.apSpent).toBe(0);
  });

  it('respects the targetTypeFor selector', () => {
    const s = initialState({ cast: ['chump', 'carnage'], difficulty: 'normal', seed: 'l10' });
    s.leaders.chump.stockpile.missiles = 1;
    s.leaders.chump.stockpile.warheadsSmall = 1;
    const r = launchSalvo(s, 'chump', {
      budget: 100, rankedTargets: ['carnage'], targetTypeFor: () => 'infra',
    });
    expect(r.orders[0].kind === 'launch' && r.orders[0].targetType).toBe('infra');
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run tests/engine/ai/aggression.test.ts`
Expected: FAIL — `launchSalvo` is not exported.

- [ ] **Step 3: Implement `launchSalvo`**

Append to `src/engine/ai/aggression.ts`:

```ts
// --- launchSalvo ---------------------------------------------------------

export interface LaunchSalvoOpts {
  /** AP available for launches this round. */
  budget: number;
  /** Targets ranked best-first. Each must be alive and non-self. */
  rankedTargets: LeaderId[];
  /** Hard cap on launches emitted. Omit to fire until AP/ammo run out. */
  maxLaunches?: number;
  /** false (default) = focus-fire rankedTargets[0]; true = cycle targets. */
  spread?: boolean;
  /** Per-target targetType selector. Default: () => 'people'. */
  targetTypeFor?: (target: LeaderId) => 'people' | 'infra';
}

export interface SalvoResult {
  orders: Order[];
  apSpent: number;
}

const YIELD_ORDER: Yield[] = ['large', 'medium', 'small'];

/**
 * Pair available delivery vehicles with warheads, largest-yield-first, and
 * emit launch orders until budget, ammo, or maxLaunches runs out. A projected
 * stockpile is tracked internally so the salvo never over-commits.
 */
export function launchSalvo(
  state: GameState,
  leaderId: LeaderId,
  opts: LaunchSalvoOpts,
): SalvoResult {
  const me = state.leaders[leaderId];
  const orders: Order[] = [];
  if (!me || opts.rankedTargets.length === 0) return { orders, apSpent: 0 };

  let remaining = opts.budget;
  let bombers = me.stockpile.bombers;
  let missiles = me.stockpile.missiles;
  const warheads: Record<Yield, number> = {
    large: me.stockpile.warheadsLarge,
    medium: me.stockpile.warheadsMedium,
    small: me.stockpile.warheadsSmall,
  };
  const targetTypeFor = opts.targetTypeFor ?? ((): 'people' => 'people');

  let launched = 0;
  while (true) {
    if (opts.maxLaunches !== undefined && launched >= opts.maxLaunches) break;
    if (remaining < ACTION_COSTS.launch) break;
    if (bombers + missiles < 1) break;
    const y = YIELD_ORDER.find((yy) => warheads[yy] > 0);
    if (y === undefined) break;

    const delivery: 'bomber' | 'missile' = bombers >= 1 ? 'bomber' : 'missile';
    const target = opts.spread
      ? opts.rankedTargets[launched % opts.rankedTargets.length]
      : opts.rankedTargets[0];
    const launch: Order = {
      kind: 'launch',
      target,
      delivery,
      warhead: y,
      targetType: targetTypeFor(target),
    };
    if (!validateOrder(state, leaderId, launch).ok) break;

    orders.push(launch);
    remaining -= ACTION_COSTS.launch;
    warheads[y] -= 1;
    if (delivery === 'bomber') bombers -= 1;
    else missiles -= 1;
    launched += 1;
  }
  return { orders, apSpent: opts.budget - remaining };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run tests/engine/ai/aggression.test.ts`
Expected: PASS — 17 tests (7 `buildToward` + 10 `launchSalvo`).

- [ ] **Step 5: Run the full suite + typecheck**

Run: `npm test -- --run` — Expected: all green.
Run: `npx tsc --noEmit` — Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add src/engine/ai/aggression.ts tests/engine/ai/aggression.test.ts
git commit -m "engine: add launchSalvo AI helper — largest-yield-first multi-launch"
```

---

## Task 4: Netanyahoo — Warmonger rework

Fixes the zero-fire bug. Capped `buildToward` plan with a yield ramp; uncapped `launchSalvo`. Chump-exception and Chump-propaganda preserved.

**Files:**
- Modify: `src/engine/ai/netanyahoo.ts`
- Modify: `tests/engine/ai/netanyahoo.test.ts`

- [ ] **Step 1: Update `netanyahoo.test.ts`**

The existing four `'Netanyahoo (Warmonger)'` tests and the P4c.1 missile-bias regression all still hold under the rework (verified against the new code below). Keep them as-is. Append a new describe block:

```ts
import { planNetanyahoo } from '../../../src/engine/ai/netanyahoo';

describe('Netanyahoo aggression (P4c.2)', () => {
  it('actually fires when armed — the zero-fire bug is gone', () => {
    const s = initialState({ cast: ['netanyahoo', 'carnage'], difficulty: 'normal', seed: 'na1' });
    s.leaders.netanyahoo.stockpile.missiles = 3;
    s.leaders.netanyahoo.stockpile.warheadsSmall = 3;
    s.leaders.netanyahoo.ap = 10;
    const orders = planNetanyahoo(s, 'netanyahoo');
    expect(orders.filter((o) => o.kind === 'launch').length).toBeGreaterThanOrEqual(1);
  });

  it('fires a multi-launch salvo when richly armed', () => {
    const s = initialState({ cast: ['netanyahoo', 'carnage'], difficulty: 'normal', seed: 'na2' });
    s.leaders.netanyahoo.stockpile.missiles = 4;
    s.leaders.netanyahoo.stockpile.warheadsSmall = 4;
    s.leaders.netanyahoo.ap = 12;
    const orders = planNetanyahoo(s, 'netanyahoo');
    expect(orders.filter((o) => o.kind === 'launch').length).toBeGreaterThanOrEqual(2);
  });

  it('builds toward a yield ramp (medium/large warheads), not only small', () => {
    const s = initialState({ cast: ['netanyahoo', 'carnage'], difficulty: 'normal', seed: 'na3' });
    s.leaders.netanyahoo.stockpile.missiles = 6;
    s.leaders.netanyahoo.stockpile.warheadsSmall = 4;
    s.leaders.netanyahoo.ap = 12;
    const orders = planNetanyahoo(s, 'netanyahoo');
    expect(orders.some((o) => o.kind === 'build-warhead' && o.yield === 'medium')).toBe(true);
  });

  it('emits builds before launches (validateOrderSequence ordering)', () => {
    const s = initialState({ cast: ['netanyahoo', 'carnage'], difficulty: 'normal', seed: 'na4' });
    s.leaders.netanyahoo.stockpile.missiles = 2;
    s.leaders.netanyahoo.stockpile.warheadsSmall = 2;
    s.leaders.netanyahoo.ap = 12;
    const orders = planNetanyahoo(s, 'netanyahoo');
    const firstLaunch = orders.findIndex((o) => o.kind === 'launch');
    const lastBuild = orders.map((o) => o.kind).lastIndexOf('build-missile');
    if (firstLaunch !== -1 && lastBuild !== -1) {
      expect(lastBuild).toBeLessThan(firstLaunch);
    }
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run tests/engine/ai/netanyahoo.test.ts`
Expected: FAIL — the new aggression tests fail against the current buggy planner.

- [ ] **Step 3: Rewrite `netanyahoo.ts`**

Replace the entire contents of `src/engine/ai/netanyahoo.ts` with:

```ts
import type { GameState, LeaderId, Order } from '../types';
import { apCostOf, validateOrder } from '../orders';
import { threatScore, wasAttackedBy } from './scoring';
import { buildToward, launchSalvo, type BuildPlanEntry } from './aggression';

/**
 * Netanyahoo — Warmonger personality (P4c.2 rework).
 *
 * Hardest-hitting personality. Launch-first (uncapped salvo), then build the
 * remainder toward a yield ramp. Chump-exception preserved: no launch at Chump
 * until Chump has attacked first. Propaganda exclusively at Chump.
 */
const PROPAGANDA_COST = 1;

const NETANYAHOO_BUILD_PLAN: BuildPlanEntry[] = [
  { build: { item: 'missile' }, target: 6 },
  { build: { item: 'warhead', yield: 'small' }, target: 4 },
  { build: { item: 'warhead', yield: 'medium' }, target: 3 },
  { build: { item: 'warhead', yield: 'large' }, target: 2 },
];

export function planNetanyahoo(state: GameState, leaderId: LeaderId): Order[] {
  const me = state.leaders[leaderId];
  if (!me || !me.alive) return [];

  let budget = me.ap;

  const others = state.cast.filter((t) => t !== leaderId && state.leaders[t]?.alive);
  const chumpAlive = state.cast.includes('chump') && state.leaders['chump']?.alive === true;
  const chumpProvoked = wasAttackedBy(state, leaderId, 'chump');

  // Launch candidates: exclude Chump unless he has attacked first.
  const launchCandidates = others.filter((t) => t !== 'chump' || chumpProvoked);
  // Rank by threat, highest first.
  const rankedTargets = [...launchCandidates].sort(
    (a, b) => threatScore(state, leaderId, b) - threatScore(state, leaderId, a),
  );

  // Reserve 1 AP for propaganda at Chump.
  const propagandaReserve = chumpAlive && budget >= PROPAGANDA_COST ? PROPAGANDA_COST : 0;
  const offenceBudget = budget - propagandaReserve;

  // Launch first — salvo self-limits to ammo on hand; warmonger has no cap.
  const salvo = launchSalvo(state, leaderId, { budget: offenceBudget, rankedTargets });
  // Build with whatever the salvo left unspent.
  const build = buildToward(
    state, leaderId, NETANYAHOO_BUILD_PLAN, offenceBudget - salvo.apSpent,
  );
  budget -= salvo.apSpent + build.apSpent;

  // Builds must precede launches in the submitted array.
  const orders: Order[] = [...build.orders, ...salvo.orders];

  // Propaganda exclusively at Chump.
  if (chumpAlive && budget >= PROPAGANDA_COST) {
    const prop: Order = { kind: 'propaganda', target: 'chump' };
    if (validateOrder(state, leaderId, prop).ok) {
      orders.push(prop);
      budget -= apCostOf(prop);
    }
  }

  return orders;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run tests/engine/ai/netanyahoo.test.ts`
Expected: PASS — the four original tests, the P4c.1 regression, and the four new P4c.2 tests.

- [ ] **Step 5: Run the full suite + typecheck**

Run: `npm test -- --run` — Expected: all green.
Run: `npx tsc --noEmit` — Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add src/engine/ai/netanyahoo.ts tests/engine/ai/netanyahoo.test.ts
git commit -m "engine: Netanyahoo rework — fix zero-fire bug, multi-launch yield ramp"
```

---

## Task 5: Khameneverhere — Grudge rework

Very aggressive. `buildToward` with raised targets + medium warheads; uncapped `launchSalvo` focus-firing the top grudge target.

**Files:**
- Modify: `src/engine/ai/khameneverhere.ts`
- Modify: `tests/engine/ai/khameneverhere.test.ts`

- [ ] **Step 1: Read the existing test file**

Read `tests/engine/ai/khameneverhere.test.ts` to see which existing assertions survive. The grudge-targeting behaviour is preserved; tests that assert "launches at top grudge target" still hold. Tests that assert the old `MISSILE_TARGET = 3` / `WARHEAD_TARGET = 3` exact stockpile caps must be updated to the new targets (missile 6, small 4, medium 3).

- [ ] **Step 2: Update `khameneverhere.test.ts`**

Keep grudge-targeting and fallback tests. Replace any exact-stockpile-cap assertions, and append:

```ts
import { planKhameneverhere } from '../../../src/engine/ai/khameneverhere';

describe('Khameneverhere aggression (P4c.2)', () => {
  it('fires a multi-launch salvo at the top grudge target when armed', () => {
    const s = initialState({ cast: ['khameneverhere', 'carnage', 'chump'], difficulty: 'normal', seed: 'ka1' });
    s.leaders.khameneverhere.stockpile.missiles = 3;
    s.leaders.khameneverhere.stockpile.warheadsSmall = 3;
    s.leaders.khameneverhere.ap = 12;
    s.leaders.khameneverhere.grudge = { carnage: 9 };
    const orders = planKhameneverhere(s, 'khameneverhere');
    const launches = orders.filter((o) => o.kind === 'launch');
    expect(launches.length).toBeGreaterThanOrEqual(2);
    expect(launches.every((o) => o.kind === 'launch' && o.target === 'carnage')).toBe(true);
  });

  it('builds medium warheads into the ramp', () => {
    const s = initialState({ cast: ['khameneverhere', 'carnage'], difficulty: 'normal', seed: 'ka2' });
    s.leaders.khameneverhere.stockpile.missiles = 6;
    s.leaders.khameneverhere.stockpile.warheadsSmall = 4;
    s.leaders.khameneverhere.ap = 12;
    const orders = planKhameneverhere(s, 'khameneverhere');
    expect(orders.some((o) => o.kind === 'build-warhead' && o.yield === 'medium')).toBe(true);
  });
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npx vitest run tests/engine/ai/khameneverhere.test.ts`
Expected: FAIL — the multi-launch test fails against the current one-launch planner.

- [ ] **Step 4: Rewrite `khameneverhere.ts`**

Replace the entire contents of `src/engine/ai/khameneverhere.ts` with:

```ts
import type { GameState, LeaderId, Order } from '../types';
import { topGrudgeTarget } from './scoring';
import { buildToward, launchSalvo, type BuildPlanEntry } from './aggression';

/**
 * Khameneverhere — Grudge personality (P4c.2 rework).
 *
 * Very aggressive, launch-focused. Ranks targets by grudge (top grudge first,
 * then remaining living leaders). Launch-first uncapped salvo, then build the
 * remainder toward a raised stockpile with medium warheads. No diplomacy.
 */
const KHAMENEVERHERE_BUILD_PLAN: BuildPlanEntry[] = [
  { build: { item: 'missile' }, target: 6 },
  { build: { item: 'warhead', yield: 'small' }, target: 4 },
  { build: { item: 'warhead', yield: 'medium' }, target: 3 },
];

export function planKhameneverhere(state: GameState, leaderId: LeaderId): Order[] {
  const me = state.leaders[leaderId];
  if (!me || !me.alive) return [];

  const others = state.cast.filter((t) => t !== leaderId && state.leaders[t]?.alive);

  // Rank: top grudge target first, then the remaining living leaders.
  const top = topGrudgeTarget(state, leaderId);
  const rankedTargets: LeaderId[] =
    top !== null && others.includes(top)
      ? [top, ...others.filter((t) => t !== top)]
      : [...others];

  // Launch first (uncapped), then build with the remainder.
  const salvo = launchSalvo(state, leaderId, { budget: me.ap, rankedTargets });
  const build = buildToward(
    state, leaderId, KHAMENEVERHERE_BUILD_PLAN, me.ap - salvo.apSpent,
  );

  // Builds precede launches in the submitted array.
  return [...build.orders, ...salvo.orders];
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run tests/engine/ai/khameneverhere.test.ts`
Expected: PASS.

- [ ] **Step 6: Run the full suite + typecheck**

Run: `npm test -- --run` — Expected: all green.
Run: `npx tsc --noEmit` — Expected: clean.

- [ ] **Step 7: Commit**

```bash
git add src/engine/ai/khameneverhere.ts tests/engine/ai/khameneverhere.test.ts
git commit -m "engine: Khameneverhere rework — multi-launch grudge salvo, raised stockpile"
```

---

## Task 6: Mileigh-hem — Glass cannon rework

Fixes the zero-fire bug (no build logic). Keeps the two-mode identity: activated → build + spread-fire salvo; not activated → diplomatic mode unchanged.

**Files:**
- Modify: `src/engine/ai/mileighhem.ts`
- Modify: `tests/engine/ai/mileighhem.test.ts`

- [ ] **Step 1: Read the existing test file**

Read `tests/engine/ai/mileighhem.test.ts`. Diplomatic-mode tests (woo/propaganda when not activated) survive unchanged. All-out-mode tests that assumed a pre-seeded stockpile survive; the new behaviour adds build orders in activated mode.

- [ ] **Step 2: Update `mileighhem.test.ts`**

Keep the diplomatic-mode tests. Append:

```ts
import { planMileighHem } from '../../../src/engine/ai/mileighhem';

describe('Mileigh-hem aggression (P4c.2)', () => {
  it('builds delivery + warheads in activated mode — the zero-fire bug is gone', () => {
    const s = initialState({ cast: ['mileigh-hem', 'carnage'], difficulty: 'normal', seed: 'ma1' });
    // Activated: apBanked + ap >= 4. Make him an attacker target so he is activated.
    s.leaders['mileigh-hem'].ap = 10;
    s.leaders['mileigh-hem'].grudge = { carnage: 3 };
    const orders = planMileighHem(s, 'mileigh-hem');
    expect(orders.some((o) => o.kind === 'build-missile' || o.kind === 'build-warhead')).toBe(true);
  });

  it('fires a spread salvo across targets when armed in activated mode', () => {
    const s = initialState({ cast: ['mileigh-hem', 'carnage', 'chump'], difficulty: 'normal', seed: 'ma2' });
    s.leaders['mileigh-hem'].ap = 12;
    s.leaders['mileigh-hem'].stockpile.missiles = 4;
    s.leaders['mileigh-hem'].stockpile.warheadsSmall = 4;
    s.leaders['mileigh-hem'].grudge = { carnage: 2, chump: 2 };
    const orders = planMileighHem(s, 'mileigh-hem');
    const targets = new Set(orders.filter((o) => o.kind === 'launch').map((o) => (o.kind === 'launch' ? o.target : '')));
    expect(orders.filter((o) => o.kind === 'launch').length).toBeGreaterThanOrEqual(2);
    expect(targets.size).toBeGreaterThanOrEqual(2); // spread across targets
  });
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npx vitest run tests/engine/ai/mileighhem.test.ts`
Expected: FAIL — the build test fails (current planner builds nothing).

- [ ] **Step 4: Rewrite `mileighhem.ts`**

Replace the entire contents of `src/engine/ai/mileighhem.ts` with:

```ts
import type { GameState, LeaderId, Order } from '../types';
import { apCostOf, validateOrder } from '../orders';
import { wasAttackedBy } from './scoring';
import { AI_SCORING_WEIGHTS } from '../balance';
import { buildToward, launchSalvo, type BuildPlanEntry } from './aggression';

/**
 * Mileigh-hem — Glass cannon personality (P4c.2 rework).
 *
 * Two modes gated by the activation trigger (apBanked + ap >= threshold).
 *
 * Activated: launch-first SPREAD salvo (cycles targets), then build a cheap
 * fast offensive stockpile with the remainder. No defence — glass cannon.
 *
 * Diplomatic (not activated): up to 2 woo + up to 2 propaganda at attackers.
 */
const MILEIGH_BUILD_PLAN: BuildPlanEntry[] = [
  { build: { item: 'missile' }, target: 4 },
  { build: { item: 'warhead', yield: 'small' }, target: 3 },
  { build: { item: 'warhead', yield: 'medium' }, target: 2 },
];

export function planMileighHem(state: GameState, leaderId: LeaderId): Order[] {
  const me = state.leaders[leaderId];
  if (!me || !me.alive) return [];

  const others = state.cast.filter((t) => t !== leaderId && state.leaders[t]?.alive);
  const attackers = others.filter((t) => wasAttackedBy(state, leaderId, t));

  const totalAp = me.apBanked + me.ap;
  const activated = totalAp >= AI_SCORING_WEIGHTS.mileighActivationApThreshold;

  if (activated) {
    // All-out mode: spread salvo first, then build with the remainder.
    const rankedTargets = attackers.length > 0 ? attackers : others;
    const salvo = launchSalvo(state, leaderId, {
      budget: me.ap,
      rankedTargets,
      spread: true,
    });
    const build = buildToward(state, leaderId, MILEIGH_BUILD_PLAN, me.ap - salvo.apSpent);
    return [...build.orders, ...salvo.orders];
  }

  // --- Diplomatic mode (unchanged from P4b) ---
  const orders: Order[] = [];
  let budget = me.ap;
  const WOO_COST = 1;
  const PROPAGANDA_COST = 1;

  const wooPool = attackers.length > 0 ? attackers : others;
  let wooCount = 0;
  for (const t of wooPool) {
    if (wooCount >= 2) break;
    if (budget < WOO_COST) break;
    const woo: Order = { kind: 'woo', target: t };
    if (validateOrder(state, leaderId, woo).ok) {
      orders.push(woo);
      budget -= apCostOf(woo);
      wooCount++;
    }
  }

  let propCount = 0;
  for (const t of attackers) {
    if (propCount >= 2) break;
    if (budget < PROPAGANDA_COST) break;
    const prop: Order = { kind: 'propaganda', target: t };
    if (validateOrder(state, leaderId, prop).ok) {
      orders.push(prop);
      budget -= apCostOf(prop);
      propCount++;
    }
  }

  return orders;
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run tests/engine/ai/mileighhem.test.ts`
Expected: PASS.

- [ ] **Step 6: Run the full suite + typecheck**

Run: `npm test -- --run` — Expected: all green.
Run: `npx tsc --noEmit` — Expected: clean.

- [ ] **Step 7: Commit**

```bash
git add src/engine/ai/mileighhem.ts tests/engine/ai/mileighhem.test.ts
git commit -m "engine: Mileigh-hem rework — fix zero-fire bug, build logic + spread salvo"
```

---

## Task 7: Carnage — Rational + Opportunist rework

Keeps the P4c.1 bomber bias. `buildToward` builds a bomber + warhead mix; moderate-capped `launchSalvo` focus-fires the top threat+opportunism target. Attacker-propaganda preserved.

**Files:**
- Modify: `src/engine/ai/carnage.ts`
- Modify: `tests/engine/ai/carnage.test.ts`

- [ ] **Step 1: Read the existing test file**

Read `tests/engine/ai/carnage.test.ts`. The P4c.1 bomber-bias tests (`'Carnage AI bomber bias (P4c.1)'`) must still hold: Carnage builds a bomber when none owned, does not build a second, launches with bomber delivery when available. The new code preserves all of this — `buildToward` with `{ bomber, target: 1 }` builds exactly one bomber, and `launchSalvo` prefers bomber delivery.

- [ ] **Step 2: Update `carnage.test.ts`**

Keep the existing combined-score targeting tests and the P4c.1 bomber-bias tests. Append:

```ts
import { planCarnage } from '../../../src/engine/ai/carnage';

describe('Carnage aggression (P4c.2)', () => {
  it('fires a multi-launch salvo when armed', () => {
    const s = initialState({ cast: ['carnage', 'chump'], difficulty: 'normal', seed: 'ca1' });
    s.leaders.carnage.stockpile.bombers = 1;
    s.leaders.carnage.stockpile.missiles = 2;
    s.leaders.carnage.stockpile.warheadsSmall = 3;
    s.leaders.carnage.ap = 12;
    const orders = planCarnage(s, 'carnage');
    expect(orders.filter((o) => o.kind === 'launch').length).toBeGreaterThanOrEqual(2);
  });

  it('still builds exactly one bomber when none owned (P4c.1 bias preserved)', () => {
    const s = initialState({ cast: ['carnage', 'chump'], difficulty: 'normal', seed: 'ca2' });
    s.leaders.carnage.stockpile.bombers = 0;
    s.leaders.carnage.ap = 10;
    const orders = planCarnage(s, 'carnage');
    expect(orders.filter((o) => o.kind === 'build-bomber')).toHaveLength(1);
  });
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npx vitest run tests/engine/ai/carnage.test.ts`
Expected: FAIL — the multi-launch test fails against the current one-launch planner.

- [ ] **Step 4: Rewrite `carnage.ts`**

Replace the entire contents of `src/engine/ai/carnage.ts` with:

```ts
import type { GameState, LeaderId, Order } from '../types';
import { apCostOf, validateOrder } from '../orders';
import { threatScore, opportunismScore, wasAttackedBy } from './scoring';
import { AI_SCORING_WEIGHTS } from '../balance';
import { buildToward, launchSalvo, type BuildPlanEntry } from './aggression';

/**
 * Carnage — Rational + Opportunist personality (P4c.2 rework).
 *
 * Aggressive-rational. Ranks targets by threat (with escalation against
 * leaders who hit Carnage last round) + opportunism. Keeps the P4c.1 bomber
 * bias: builds one reusable bomber when none owned; launchSalvo prefers bomber
 * delivery. Moderate launch cap. Propaganda only at attackers.
 */
const PROPAGANDA_COST = 1;
const CARNAGE_MAX_LAUNCHES = 3;

const CARNAGE_BUILD_PLAN: BuildPlanEntry[] = [
  { build: { item: 'bomber' }, target: 1 },
  { build: { item: 'warhead', yield: 'small' }, target: 4 },
  { build: { item: 'warhead', yield: 'medium' }, target: 2 },
];

export function planCarnage(state: GameState, leaderId: LeaderId): Order[] {
  const me = state.leaders[leaderId];
  if (!me || !me.alive) return [];

  let budget = me.ap;

  const others = state.cast.filter((t) => t !== leaderId && state.leaders[t]?.alive);
  const attackers = others.filter((t) => wasAttackedBy(state, leaderId, t));

  function combinedScore(target: LeaderId): number {
    const base = threatScore(state, leaderId, target);
    const escalated =
      (me.recentAggressionFrom[target] ?? 0) > 0
        ? base * AI_SCORING_WEIGHTS.carnageEscalationMultiplier
        : base;
    return escalated + opportunismScore(state, target);
  }

  const rankedTargets = [...others].sort((a, b) => combinedScore(b) - combinedScore(a));

  // Reserve 1 AP per attacker for propaganda (capped so it never starves offence).
  const propagandaReserve = Math.min(attackers.length, Math.max(0, budget - 2));
  const offenceBudget = budget - propagandaReserve;

  // Launch first (moderate cap), then build with the remainder.
  const salvo = launchSalvo(state, leaderId, {
    budget: offenceBudget,
    rankedTargets,
    maxLaunches: CARNAGE_MAX_LAUNCHES,
  });
  const build = buildToward(
    state, leaderId, CARNAGE_BUILD_PLAN, offenceBudget - salvo.apSpent,
  );
  budget -= salvo.apSpent + build.apSpent;

  const orders: Order[] = [...build.orders, ...salvo.orders];

  // Propaganda only at leaders who attacked Carnage.
  for (const attacker of attackers) {
    if (budget < PROPAGANDA_COST) break;
    const prop: Order = { kind: 'propaganda', target: attacker };
    if (validateOrder(state, leaderId, prop).ok) {
      orders.push(prop);
      budget -= apCostOf(prop);
    }
  }

  return orders;
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run tests/engine/ai/carnage.test.ts`
Expected: PASS — combined-score targeting, P4c.1 bomber bias, and new P4c.2 tests.

- [ ] **Step 6: Run the full suite + typecheck**

Run: `npm test -- --run` — Expected: all green.
Run: `npx tsc --noEmit` — Expected: clean.

- [ ] **Step 7: Commit**

```bash
git add src/engine/ai/carnage.ts tests/engine/ai/carnage.test.ts
git commit -m "engine: Carnage rework — multi-launch salvo, P4c.1 bomber bias preserved"
```

---

## Task 8: Starmless — Cautious + Scapegoat rework, new kill instinct

Adds the opportunism finish path: Starmless now launches when retaliating **or** when a finishable (low-population) opponent exists. Low launch cap. Keeps factory/defence building, deploy logic, scapegoat roll.

**Files:**
- Modify: `src/engine/ai/starmless.ts`
- Modify: `tests/engine/ai/starmless.test.ts`

- [ ] **Step 1: Read the existing test file**

Read `tests/engine/ai/starmless.test.ts`. Retaliation-targeting and scapegoat-roll tests survive. The new behaviour adds: Starmless launches at a low-population opponent even with no prior attack on him.

- [ ] **Step 2: Update `starmless.test.ts`**

Keep retaliation + scapegoat tests. Append:

```ts
import { planStarmless } from '../../../src/engine/ai/starmless';

describe('Starmless kill instinct (P4c.2)', () => {
  it('launches at a finishable low-population opponent with no prior attack', () => {
    const s = initialState({ cast: ['starmless', 'carnage'], difficulty: 'normal', seed: 'sa1' });
    s.leaders.starmless.stockpile.missiles = 2;
    s.leaders.starmless.stockpile.warheadsSmall = 2;
    s.leaders.starmless.ap = 10;
    s.leaders.carnage.population = 4; // finishable — below the finish threshold
    // No grudge / aggression from carnage → not a retaliation round.
    const orders = planStarmless(s, 'starmless');
    const launch = orders.find((o) => o.kind === 'launch');
    expect(launch).toBeDefined();
    expect(launch?.kind === 'launch' && launch.target).toBe('carnage');
  });

  it('does not launch when no opponent is finishable and no retaliation is pending', () => {
    const s = initialState({ cast: ['starmless', 'carnage'], difficulty: 'normal', seed: 'sa2' });
    s.leaders.starmless.stockpile.missiles = 2;
    s.leaders.starmless.stockpile.warheadsSmall = 2;
    s.leaders.starmless.ap = 10;
    s.leaders.carnage.population = 25; // healthy — not finishable
    const orders = planStarmless(s, 'starmless');
    expect(orders.some((o) => o.kind === 'launch')).toBe(false);
  });
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npx vitest run tests/engine/ai/starmless.test.ts`
Expected: FAIL — the finishable-target test fails (current planner only launches on retaliation).

- [ ] **Step 4: Rewrite `starmless.ts`**

Replace the entire contents of `src/engine/ai/starmless.ts` with:

```ts
import type { GameState, LeaderId, Order } from '../types';
import { apCostOf, validateOrder } from '../orders';
import { threatScore, wasAttackedBy } from './scoring';
import { AI_SCORING_WEIGHTS } from '../balance';
import { nextRandom } from '../rng';
import { buildToward, launchSalvo, type BuildPlanEntry } from './aggression';

/**
 * Starmless — Cautious + Scapegoat personality (P4c.2 rework).
 *
 * Defensive baseline, but with a new kill instinct: launches when retaliating
 * OR when a finishable (low-population) opponent exists. Low launch cap — he
 * still builds factories and defence. Scapegoat roll preserved on retaliation.
 */
const PROPAGANDA_COST = 1;
const DEPLOY_COST = 4;
const STARMLESS_FINISH_POP_M = 8;
const STARMLESS_MAX_LAUNCHES = 2;

const STARMLESS_BUILD_PLAN: BuildPlanEntry[] = [
  { build: { item: 'factory' }, target: 8 },
  { build: { item: 'defence', type: 'shield' }, target: 2 },
  { build: { item: 'warhead', yield: 'small' }, target: 3 },
];

export function planStarmless(state: GameState, leaderId: LeaderId): Order[] {
  const me = state.leaders[leaderId];
  if (!me || !me.alive) return [];

  let budget = me.ap;

  const others = state.cast.filter((t) => t !== leaderId && state.leaders[t]?.alive);
  const attackers = others.filter((t) => wasAttackedBy(state, leaderId, t));
  const isRetaliationRound = attackers.length > 0;

  // --- Determine launch target ---
  let launchTarget: LeaderId | undefined;

  if (isRetaliationRound) {
    // Primary attacker = highest recentAggressionFrom.
    let primaryAttacker: LeaderId = attackers[0];
    let bestAggression = me.recentAggressionFrom[primaryAttacker] ?? 0;
    for (const a of attackers) {
      const agg = me.recentAggressionFrom[a] ?? 0;
      if (agg > bestAggression) {
        bestAggression = agg;
        primaryAttacker = a;
      }
    }
    // Scapegoat roll (reads rngState without advancing shared state).
    const roll = nextRandom(state.rngState).value;
    const doScapegoat = roll < AI_SCORING_WEIGHTS.starmlessScapegoatPct;
    if (doScapegoat) {
      const candidates = others.filter((t) => t !== primaryAttacker);
      if (candidates.length > 0) {
        const aggregateThreat = (c: LeaderId): number =>
          state.cast.reduce((sum, l) => sum + threatScore(state, l, c), 0);
        launchTarget = candidates.reduce((best, t) =>
          aggregateThreat(t) >= aggregateThreat(best) ? t : best,
        );
      } else {
        launchTarget = primaryAttacker;
      }
    } else {
      launchTarget = primaryAttacker;
    }
  } else {
    // New P4c.2 kill instinct: finish off a low-population opponent.
    const finishable = others
      .filter((t) => state.leaders[t].population <= STARMLESS_FINISH_POP_M)
      .sort((a, b) => state.leaders[a].population - state.leaders[b].population);
    if (finishable.length > 0) launchTarget = finishable[0];
  }

  const rankedTargets = launchTarget !== undefined ? [launchTarget] : [];

  // Reserve 1 AP per attacker for propaganda.
  const propagandaReserve = Math.min(attackers.length, Math.max(0, budget - 2));
  const offenceBudget = budget - propagandaReserve;

  // Launch first (low cap), then build with the remainder.
  const salvo = launchSalvo(state, leaderId, {
    budget: offenceBudget,
    rankedTargets,
    maxLaunches: STARMLESS_MAX_LAUNCHES,
  });
  const build = buildToward(
    state, leaderId, STARMLESS_BUILD_PLAN, offenceBudget - salvo.apSpent,
  );
  budget -= salvo.apSpent + build.apSpent;

  const orders: Order[] = [...build.orders, ...salvo.orders];

  // Deploy a shield if one is in stock and AP allows (deploy = commit).
  if (me.stockpile.shields >= 1 && budget >= DEPLOY_COST) {
    const deploy: Order = { kind: 'deploy-defence', type: 'shield' };
    if (validateOrder(state, leaderId, deploy).ok) {
      orders.push(deploy);
      budget -= DEPLOY_COST;
    }
  }

  // Propaganda only at attackers.
  for (const attacker of attackers) {
    if (budget < PROPAGANDA_COST) break;
    const prop: Order = { kind: 'propaganda', target: attacker };
    if (validateOrder(state, leaderId, prop).ok) {
      orders.push(prop);
      budget -= apCostOf(prop);
    }
  }

  return orders;
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run tests/engine/ai/starmless.test.ts`
Expected: PASS.

Note on test ordering: `deploy-defence` is appended *after* launches in the array. `validateOrderSequence` projects a `build-defence` (+1 shield) before a `deploy-defence` (−1 shield) only if the build is earlier in the array — which it is (`build.orders` come first). A deploy of a *pre-owned* shield (not built this round) is also valid since the real stockpile has it. No ordering hazard.

- [ ] **Step 6: Run the full suite + typecheck**

Run: `npm test -- --run` — Expected: all green.
Run: `npx tsc --noEmit` — Expected: clean.

- [ ] **Step 7: Commit**

```bash
git add src/engine/ai/starmless.ts tests/engine/ai/starmless.test.ts
git commit -m "engine: Starmless rework — new kill instinct, multi-launch under low cap"
```

---

## Task 9: Chump — Coward rework

Routes Chump's existing opportunism-launch path through `launchSalvo` with a low cap. Heavy defence build + deploy, propaganda, and wooing-suppression preserved.

**Files:**
- Modify: `src/engine/ai/chump.ts`
- Modify: `tests/engine/ai/chump.test.ts`

- [ ] **Step 1: Read the existing test file**

Read `tests/engine/ai/chump.test.ts`. The wooing-suppression rule (never launch at a leader with `favourability[t] > 0`), the weak-target selection, and infra-vs-people targeting all survive. Defence-building tests survive.

- [ ] **Step 2: Update `chump.test.ts`**

Keep the existing tests. Append:

```ts
import { planChump } from '../../../src/engine/ai/chump';

describe('Chump aggression (P4c.2)', () => {
  it('fires a capped multi-launch salvo at a weak target', () => {
    const s = initialState({ cast: ['chump', 'carnage'], difficulty: 'normal', seed: 'cha1' });
    s.leaders.chump.stockpile.missiles = 3;
    s.leaders.chump.stockpile.warheadsSmall = 3;
    s.leaders.chump.ap = 12;
    s.leaders.carnage.population = 4; // weak — opportunismScore > 0
    s.leaders.carnage.factories = 0;
    const orders = planChump(s, 'chump');
    const launches = orders.filter((o) => o.kind === 'launch');
    expect(launches.length).toBeGreaterThanOrEqual(1);
    expect(launches.length).toBeLessThanOrEqual(2); // low cap
  });

  it('never launches at a leader who has wooed Chump', () => {
    const s = initialState({ cast: ['chump', 'carnage'], difficulty: 'normal', seed: 'cha2' });
    s.leaders.chump.stockpile.missiles = 3;
    s.leaders.chump.stockpile.warheadsSmall = 3;
    s.leaders.chump.ap = 12;
    s.leaders.carnage.population = 4;
    s.leaders.carnage.factories = 0;
    s.leaders.chump.favourability = { carnage: 5 }; // carnage wooed chump
    const orders = planChump(s, 'chump');
    expect(orders.some((o) => o.kind === 'launch')).toBe(false);
  });
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npx vitest run tests/engine/ai/chump.test.ts`
Expected: FAIL — the multi-launch test fails against the current one-launch planner.

- [ ] **Step 4: Rewrite `chump.ts`**

Replace the entire contents of `src/engine/ai/chump.ts` with:

```ts
import type { GameState, LeaderId, Order } from '../types';
import { apCostOf, validateOrder } from '../orders';
import { defenceVisibilityScore, opportunismScore } from './scoring';
import { buildToward, launchSalvo, type BuildPlanEntry } from './aggression';

/**
 * Chump — Coward personality (P4c.2 rework).
 *
 * Defensive, but opportunistic: launches at weak / undefended targets under a
 * low cap. Never launches at a leader who has wooed Chump. Heavy defence build
 * + deploy and propaganda preserved. Prefers infra targeting when the target
 * still has factories to lose.
 */
const PROPAGANDA_COST = 1;
const DEPLOY_COST = 4;
const CHUMP_MAX_LAUNCHES = 2;

const CHUMP_BUILD_PLAN: BuildPlanEntry[] = [
  { build: { item: 'defence', type: 'shield' }, target: 3 },
  { build: { item: 'warhead', yield: 'small' }, target: 4 },
];

export function planChump(state: GameState, leaderId: LeaderId): Order[] {
  const me = state.leaders[leaderId];
  if (!me || !me.alive) return [];

  let budget = me.ap;

  const others = state.cast.filter((t) => t !== leaderId && state.leaders[t].alive);

  // Eligible launch targets: not protected by Chump's own favourability toward
  // them (a leader who wooed Chump raises me.favourability[t] > 0).
  const eligible = others.filter((t) => (me.favourability[t] ?? 0) <= 0);
  // Weak targets: low defence OR otherwise vulnerable. Ranked weakest-first.
  const weakTargets = eligible
    .filter((t) => opportunismScore(state, t) > 0 || defenceVisibilityScore(state, t) === 0)
    .sort((a, b) => opportunismScore(state, b) - opportunismScore(state, a));

  // Infra targeting when the target still has factories to lose.
  const targetTypeFor = (t: LeaderId): 'people' | 'infra' =>
    state.leaders[t].factories > 2 ? 'infra' : 'people';

  // Reserve 1 AP for propaganda.
  const propagandaReserve = others.length > 0 && budget >= 1 ? PROPAGANDA_COST : 0;
  const offenceBudget = budget - propagandaReserve;

  // Launch first (low cap), then build with the remainder.
  const salvo = launchSalvo(state, leaderId, {
    budget: offenceBudget,
    rankedTargets: weakTargets,
    maxLaunches: CHUMP_MAX_LAUNCHES,
    targetTypeFor,
  });
  const build = buildToward(
    state, leaderId, CHUMP_BUILD_PLAN, offenceBudget - salvo.apSpent,
  );
  budget -= salvo.apSpent + build.apSpent;

  const orders: Order[] = [...build.orders, ...salvo.orders];

  // Deploy a shield if one is in stock and AP allows.
  if (me.stockpile.shields >= 1 && budget >= DEPLOY_COST) {
    const deploy: Order = { kind: 'deploy-defence', type: 'shield' };
    if (validateOrder(state, leaderId, deploy).ok) {
      orders.push(deploy);
      budget -= DEPLOY_COST;
    }
  }

  // Propaganda — broadcast to the first available target.
  if (budget >= PROPAGANDA_COST && others.length > 0) {
    const prop: Order = { kind: 'propaganda', target: others[0] };
    if (validateOrder(state, leaderId, prop).ok) {
      orders.push(prop);
      budget -= apCostOf(prop);
    }
  }

  return orders;
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run tests/engine/ai/chump.test.ts`
Expected: PASS.

- [ ] **Step 6: Run the full suite + typecheck**

Run: `npm test -- --run` — Expected: all green.
Run: `npx tsc --noEmit` — Expected: clean.

- [ ] **Step 7: Commit**

```bash
git add src/engine/ai/chump.ts tests/engine/ai/chump.test.ts
git commit -m "engine: Chump rework — capped opportunistic salvo, defence preserved"
```

---

## Task 10: AI-duel termination assertion + README

Replaces the duel test's "no crash" assertion with a termination assertion: every seeded all-AI game reaches an outcome within a round cap. This is the success criterion for the whole slice.

**Files:**
- Modify: `tests/engine/ai-duel.test.ts`
- Modify: `README.md`

- [ ] **Step 1: Rewrite `ai-duel.test.ts`**

Replace the entire contents of `tests/engine/ai-duel.test.ts` with:

```ts
import { describe, it, expect } from 'vitest';
import { initialState } from '../../src/engine/state';
import { reduce } from '../../src/engine/reducer';
import { planAi } from '../../src/engine/ai';
import type { LeaderId, WinType } from '../../src/engine/types';

const FULL_CAST: LeaderId[] = ['chump', 'khameneverhere', 'starmless', 'carnage', 'mileigh-hem', 'netanyahoo'];

// Round cap is a TEST TRIPWIRE, not a game rule. With the P4c.2 aggression
// rework + elimination-only endings, all-AI games terminate by elimination /
// apocalypse / pyrrhic. If this assertion ever fires, that is a balance bug to
// fix — not a cap to add to the game.
const ROUND_CAP = 60;

function runOneGame(seed: string): { type: WinType | null; rounds: number } {
  let s = initialState({ cast: FULL_CAST, difficulty: 'normal', seed });
  let rounds = 0;
  while (!s.outcome && rounds < ROUND_CAP) {
    for (const id of FULL_CAST) {
      const orders = planAi(s, id);
      s = reduce(s, { type: 'SUBMIT_ORDERS', leaderId: id, orders });
    }
    s = reduce(s, { type: 'RESOLVE_ROUND' });
    rounds++;
  }
  return { type: s.outcome?.type ?? null, rounds };
}

describe('AI-duel headless (P4c.2)', () => {
  it('every seeded all-AI game terminates within the round cap', () => {
    const SEEDS = 40;
    let unfinished = 0;
    let maxRounds = 0;
    for (let i = 0; i < SEEDS; i++) {
      const r = runOneGame(`duel-${i}`);
      if (r.type === null) unfinished++;
      if (r.rounds > maxRounds) maxRounds = r.rounds;
    }
    // eslint-disable-next-line no-console
    console.log(`AI-duel: ${SEEDS} games, max rounds = ${maxRounds}, unfinished = ${unfinished}`);
    expect(unfinished).toBe(0);
  }, 60_000);
});
```

- [ ] **Step 2: Run the duel test**

Run: `npx vitest run tests/engine/ai-duel.test.ts`
Expected: PASS — `unfinished` is 0; the console line reports the max round count.

**If the test FAILS (`unfinished > 0`):** a balance bug is blocking termination. This is the spec's documented real concern (§6.1.1) and fixing it is part of this task. Diagnose by raising `ROUND_CAP` temporarily and logging the stuck game's final state — typically a leader hoarding AP into defence. Tune the offending planner's build plan (lower the defence target, raise warhead targets) or launch cap, re-run, and keep the change. Do not add an in-game round cap — that contradicts the elimination-only decision.

- [ ] **Step 3: Update `README.md`**

Two edits:
1. Correct the win-conditions line. Change `- All four win conditions: survivor, pyrrhic, apocalypse, dominance.` to `- Win conditions: survivor, pyrrhic, apocalypse (elimination-only — dominance removed in P4c.2).`
2. Append a new section after the existing Phase 4c slice 1 status section:

```markdown
## Phase 4c slice 2 status

(AI aggression rework + elimination-only endings.) The six AI planners were reworked onto two shared helpers — `buildToward` (capped, priority-ordered builds) and `launchSalvo` (largest-yield-first multi-launch). This fixed two planners that structurally could not fire (Netanyahoo's runaway missile-build loop starved warhead production; Mileigh-hem had no build logic), gave Starmless a kill instinct against low-population opponents, and let the whole cast fire multi-launch salvos with a medium/large warhead ramp. The dominance win condition was removed: games now end only by survivor / apocalypse / pyrrhic. The AI-duel test asserts every seeded all-AI game terminates within 60 rounds. Verify: `npm run test:run`.
```

- [ ] **Step 4: Run the full suite + typecheck**

Run: `npm test -- --run` — Expected: all green.
Run: `npx tsc --noEmit` — Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add tests/engine/ai-duel.test.ts README.md
git commit -m "test: AI-duel termination assertion; docs: P4c slice 2 status"
```

---

## Final steps (after all tasks)

1. Dispatch a final branch-wide code review covering all 10 commits.
2. Run `npm test -- --run` and `npx tsc --noEmit` once more — both must be green/clean.
3. Use `superpowers:finishing-a-development-branch`: push + PR + babysit BugBot + merge + main pull + worktree prune (the standing flow for this project).

---

## Notes on test count

P4c.1 baseline is 255. This slice removes ~6 dominance-related tests (Task 1) and adds ~17 helper tests (Tasks 2–3) plus ~2–4 behavioural tests per planner (Tasks 4–9) and reworks the duel test. The exact final count is whatever the suite reports — every task ends with `npm test -- --run` green. Do not hard-code a target number; assert green, not a count.

---

## Self-review

**Spec coverage:**
- §2.1 win condition removal → Task 1 (incl. the wider blast radius: `index.ts` re-export, `Winners.tsx`, `state`/`balance`/`integration`/`determinism` tests — found via grep, beyond the spec's file list).
- §2.2.1 `buildToward` → Task 2. §2.2.2 `launchSalvo` → Task 3.
- §2.3 per-planner rework → Tasks 4–9, one per personality, spectrum preserved via per-planner build plans + launch caps.
- §2.4 UI projection unchanged → no task needed (correct — `projectInventory` is untouched).
- §2.5 / §5.3 duel termination assertion → Task 10.
- §4 schema changes (`GameConfig.dominanceThreshold`, `WinOutcome.dominance`) → Task 1 Steps 4. `WinOutcome.dominance` IS removed (not left unreferenced) because the only consumer, `Winners.tsx`, is updated in the same task — cleaner than dead code, and the spec permits it (§6.1.2).
- §5 testing → helper tests (Task 2–3), per-planner tests (Tasks 4–9), duel (Task 10), winConditions (Task 1).

**Placeholder scan:** No TBD/TODO. Per-planner build-plan numbers and launch caps are concrete first-pass values (spec §6.3 explicitly designates these as first-pass, playtest-tuned — not placeholders). Task 10 Step 2 gives a concrete diagnose-and-tune procedure if the termination assertion fails.

**Type consistency:** `BuildItem`, `BuildPlanEntry`, `BuildResult`, `LaunchSalvoOpts`, `SalvoResult` are defined in Task 2/3 and imported identically in Tasks 4–9. `buildToward(state, leaderId, plan, budget)` and `launchSalvo(state, leaderId, opts)` signatures are used consistently. Every planner uses the same `[...build.orders, ...salvo.orders, ...diplomacy]` array ordering, satisfying the validateOrderSequence builds-before-launches rule.
