# Phase 2.5 — Player Slot Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a separate human player slot (`'player1'`, with `'player2'..'player5'` reserved for future hotseat) to the engine. The human plays a configurable country (default: Rufus T. Firefly / 🦆 Freedonia from *Duck Soup*) rather than taking over an AI character. Hard-mode AI projects the human as repeating their last-round orders.

**Architecture:** Three additions to the engine, all non-breaking to existing P1/P2 behaviour:
1. Extend `LeaderId` string-literal union with `'player1' | 'player2' | 'player3' | 'player4' | 'player5'`.
2. Add `GameConfig.playerProfiles` override merged in `initialState()`.
3. Add `GameState.lastOrders`, populated by `RESOLVE_ROUND` before clearing `pendingOrders`; `bestTargetByLookahead()` substitutes `state.lastOrders[id]` for human opponents instead of skipping them.

A small `isHuman(id: LeaderId): boolean` helper (one-line predicate `id.startsWith('player')`) lives in `state.ts`. No `controlledBy` field on `Leader` — the human/AI distinction is fully derivable.

**Tech Stack:** TypeScript 5.4, Vitest 1.5, no new dependencies. Test runner: `npm run test:run`. Typecheck: `npm run typecheck`.

**Source of truth:** `docs/superpowers/specs/2026-05-10-phase-2-5-player-slot-design.md` (committed `c39f6c8`). If anything in this plan conflicts with that spec, the spec wins — flag the discrepancy before coding.

**Per-step confidence:** every step is rated; sub-95% steps embed mitigations inline. Lowest step in this plan is 90 %.

---

## File structure

**Modified source files:**
- `src/engine/types.ts` — extend `LeaderId`; add `GameConfig.playerProfiles`; add `GameState.lastOrders`
- `src/engine/balance.ts` — append five `LEADER_PROFILES` entries (`player1..player5`)
- `src/engine/state.ts` — export `isHuman()`; merge `playerProfiles` override in `initialState()`; seed `lastOrders: {}`
- `src/engine/resolution.ts` — populate `lastOrders` from `state.pendingOrders` before clearing
- `src/engine/ai/dispatch.ts` — switch throws on `player1..player5`
- `src/engine/ai/index.ts` — `planAi` throws when called for human
- `src/engine/ai/lookahead.ts` — `bestTargetByLookahead` substitutes `state.lastOrders[id]` for human opponents
- `README.md` — Phase 2.5 status section

**Modified test files (no new files):**
- `tests/engine/balance.test.ts` — extend `LEADER_PROFILES` key-set assertion + `player1` profile shape
- `tests/engine/state.test.ts` — `player1` defaults; `isHuman()` sanity; `playerProfiles` overrides; `lastOrders` empty at init
- `tests/engine/resolution.test.ts` — `lastOrders` populated by `RESOLVE_ROUND`; second round overwrites first
- `tests/engine/ai/dispatcher.test.ts` — `planAi(state, 'player1')` throws
- `tests/engine/ai/lookahead.test.ts` — mixed-cast: no-history fallback + with-history substitution
- `tests/engine/integration.test.ts` — mixed-cast end-to-end round

---

## Task 1: Extend `LeaderId`, add `LEADER_PROFILES` entries, guard `dispatch`

**Confidence: 95 %.** TS exhaustiveness ties three changes together: extending `LeaderId` without simultaneously updating `LEADER_PROFILES` and `dispatch.ts` would leave the build red. Done as one atomic task.

**Files:**
- Modify: `src/engine/types.ts:1-7`
- Modify: `src/engine/balance.ts:1-59`
- Modify: `src/engine/ai/dispatch.ts:15-24`
- Modify: `tests/engine/balance.test.ts:14-19`
- Modify: `tests/engine/state.test.ts` (add a new test case at end of `describe('initialState', ...)`)

- [ ] **Step 1: Write the failing test for `initialState` with `player1`** (confidence 95 %)

Add this test case to `tests/engine/state.test.ts`, inside the existing `describe('initialState', ...)` block:

```typescript
it('seeds player1 with default Firefly / Freedonia identity', () => {
  const s = initialState({
    cast: ['player1', 'chump'],
    difficulty: 'normal',
    seed: 'p25-default',
  });
  expect(s.leaders.player1.name).toBe('Rufus T. Firefly');
  expect(s.leaders.player1.country).toBe('🦆 Freedonia');
  expect(s.leaders.player1.population).toBe(25);
  expect(s.leaders.player1.factories).toBe(6);
  expect(s.leaders.player1.ap).toBe(3);
  expect(s.leaders.player1.alive).toBe(true);
  expect(s.leaders.player1.bonusRule).toBeUndefined();
});
```

- [ ] **Step 2: Run the test, verify it fails to compile** (confidence 95 %)

```
npm run test:run -- tests/engine/state.test.ts
```

Expected: TypeScript error — `Type '"player1"' is not assignable to type 'LeaderId'`.

- [ ] **Step 3: Extend the `LeaderId` union in `src/engine/types.ts`** (confidence 98 %)

Replace lines 1-7 of `src/engine/types.ts` with:

```typescript
export type LeaderId =
  | 'chump'
  | 'khameneverhere'
  | 'starmless'
  | 'carnage'
  | 'mileigh-hem'
  | 'netanyahoo'
  | 'player1'
  | 'player2'
  | 'player3'
  | 'player4'
  | 'player5';
```

- [ ] **Step 4: Add `LEADER_PROFILES` entries for player1..player5 in `src/engine/balance.ts`** (confidence 95 %)

Append these entries to the `LEADER_PROFILES` object literal in `src/engine/balance.ts` (after the `netanyahoo` entry, before the closing `};` on line 59):

```typescript
  player1: {
    name: 'Rufus T. Firefly',
    country: '🦆 Freedonia',
    startPop: 25,
    startFactories: 6,
    startAp: 3,
  },
  player2: {
    name: 'Player 2',
    country: '🦆 Freedonia 2',
    startPop: 25,
    startFactories: 6,
    startAp: 3,
  },
  player3: {
    name: 'Player 3',
    country: '🦆 Freedonia 3',
    startPop: 25,
    startFactories: 6,
    startAp: 3,
  },
  player4: {
    name: 'Player 4',
    country: '🦆 Freedonia 4',
    startPop: 25,
    startFactories: 6,
    startAp: 3,
  },
  player5: {
    name: 'Player 5',
    country: '🦆 Freedonia 5',
    startPop: 25,
    startFactories: 6,
    startAp: 3,
  },
```

- [ ] **Step 5: Update `tests/engine/balance.test.ts:14-19` for the new key set** (confidence 98 %)

Replace the existing `it('defines a profile for every leader id', ...)` test in `tests/engine/balance.test.ts` with:

```typescript
  it('defines a profile for every leader id', () => {
    const ids = Object.keys(LEADER_PROFILES).sort();
    expect(ids).toEqual(
      [
        'carnage', 'chump', 'khameneverhere', 'mileigh-hem',
        'netanyahoo', 'starmless',
        'player1', 'player2', 'player3', 'player4', 'player5',
      ].sort(),
    );
  });

  it('defaults player1 to Rufus T. Firefly / 🦆 Freedonia', () => {
    expect(LEADER_PROFILES.player1.name).toBe('Rufus T. Firefly');
    expect(LEADER_PROFILES.player1.country).toBe('🦆 Freedonia');
    expect(LEADER_PROFILES.player1.startPop).toBe(25);
    expect(LEADER_PROFILES.player1.bonusRule).toBeUndefined();
  });
```

- [ ] **Step 6: Add throwing branches for player slots in `src/engine/ai/dispatch.ts`** (confidence 95 %)

Replace the entire `dispatch()` function in `src/engine/ai/dispatch.ts` (lines 15-24) with:

```typescript
export function dispatch(state: GameState, leaderId: LeaderId): Order[] {
  switch (leaderId) {
    case 'chump': return planChump(state, leaderId);
    case 'carnage': return planCarnage(state, leaderId);
    case 'khameneverhere': return planKhameneverhere(state, leaderId);
    case 'netanyahoo': return planNetanyahoo(state, leaderId);
    case 'starmless': return planStarmless(state, leaderId);
    case 'mileigh-hem': return planMileighHem(state, leaderId);
    case 'player1':
    case 'player2':
    case 'player3':
    case 'player4':
    case 'player5':
      throw new Error(
        `dispatch() called for human player slot '${leaderId}'. ` +
        `Human leaders submit orders via SUBMIT_ORDERS, not via the AI dispatcher.`,
      );
  }
}
```

- [ ] **Step 7: Run typecheck + tests, verify everything passes** (confidence 95 %)

```
npm run typecheck
npm run test:run
```

Expected: typecheck clean, all tests green (the new player1 default test passes; dispatch-throws case for player slots not yet exercised).

- [ ] **Step 8: Commit**

```
git add src/engine/types.ts src/engine/balance.ts src/engine/ai/dispatch.ts \
        tests/engine/state.test.ts tests/engine/balance.test.ts
git commit -m "engine: add player1..player5 LeaderId slots with Firefly/Freedonia defaults"
```

---

## Task 2: Add `GameState.lastOrders` field, `isHuman()` helper, seed in `initialState`

**Confidence: 92 %.** Adds a new required field to `GameState`. Risk: any other place that constructs a `GameState` must initialize the field. Mitigation: only `initialState()` constructs from scratch; `reduce()` uses `structuredClone()` which preserves it; `LOAD_STATE` accepts a full state from outside (no current callers). Verified at design time.

**Files:**
- Modify: `src/engine/types.ts:98-109` (GameState interface)
- Modify: `src/engine/state.ts` (export isHuman, seed lastOrders in initialState)
- Modify: `tests/engine/state.test.ts`

- [ ] **Step 1: Write the failing tests** (confidence 95 %)

Add these test cases to `tests/engine/state.test.ts`, inside `describe('initialState', ...)`. (If `isHuman` isn't yet imported at the top of the file, add `import { initialState, isHuman } from '../../src/engine/state';` — replacing the existing `initialState`-only import line.)

```typescript
it('seeds lastOrders as an empty object', () => {
  const s = initialState({
    cast: ['player1', 'chump'],
    difficulty: 'normal',
    seed: 'p25-lastOrders-init',
  });
  expect(s.lastOrders).toEqual({});
});

it('isHuman classifies player slots vs AI characters', () => {
  expect(isHuman('player1')).toBe(true);
  expect(isHuman('player5')).toBe(true);
  expect(isHuman('chump')).toBe(false);
  expect(isHuman('carnage')).toBe(false);
});
```

- [ ] **Step 2: Run the tests, verify they fail** (confidence 95 %)

```
npm run test:run -- tests/engine/state.test.ts
```

Expected: TypeScript error — `Property 'lastOrders' does not exist on type 'GameState'`, plus `Module ... has no exported member 'isHuman'`.

- [ ] **Step 3: Add `lastOrders` to `GameState` in `src/engine/types.ts`** (confidence 95 %)

Replace lines 98-109 of `src/engine/types.ts` (the `GameState` interface) with:

```typescript
export interface GameState {
  round: number;
  cast: LeaderId[];
  difficulty: Difficulty;
  seed: string;
  rngState: number;
  leaders: Record<LeaderId, Leader>;
  pendingOrders: Partial<Record<LeaderId, SealedOrders>>;
  /** The most recent round's submitted orders for each leader. Populated by RESOLVE_ROUND before pendingOrders is cleared. Used by Hard-mode lookahead to project human opponents' likely behaviour. */
  lastOrders: Partial<Record<LeaderId, Order[]>>;
  log: ResolutionEvent[];
  outcome: WinOutcome | null;
  config: GameConfig;
}
```

- [ ] **Step 4: Export `isHuman()` and seed `lastOrders` in `src/engine/state.ts`** (confidence 92 %)

In `src/engine/state.ts`, add the `isHuman` export and update the return statement of `initialState()`. The full file should now read:

```typescript
import type { Difficulty, GameConfig, GameState, Leader, LeaderId } from './types';
import { DOMINANCE_THRESHOLD_DEFAULT, LEADER_PROFILES } from './balance';
import { seedFromString } from './rng';

export interface NewGameOpts {
  cast: LeaderId[];
  difficulty: Difficulty;
  seed: string;
  config?: Partial<GameConfig>;
}

/** Returns true for human player slots ('player1'..'player5'); false for the six AI character ids. Derived from the LeaderId — no stored field. */
export function isHuman(id: LeaderId): boolean {
  return id.startsWith('player');
}

export function initialState(opts: NewGameOpts): GameState {
  const leaders = {} as Record<LeaderId, Leader>;
  for (const id of opts.cast) {
    const profile = LEADER_PROFILES[id];
    const startPop = opts.config?.startPopOverride?.[id] ?? profile.startPop;
    leaders[id] = {
      id,
      name: profile.name,
      country: profile.country,
      population: startPop,
      factories: profile.startFactories,
      stockpile: {
        missiles: 0,
        bombers: 0,
        warheadsSmall: 0,
        warheadsMedium: 0,
        warheadsLarge: 0,
        shields: 0,
        aa: 0,
      },
      ap: profile.startAp,
      apBanked: 0,
      alive: true,
      favourability: {},
      grudge: {},
      recentAggressionFrom: {},
      bonusRule: profile.bonusRule,
    };
  }
  return {
    round: 1,
    cast: [...opts.cast],
    difficulty: opts.difficulty,
    seed: opts.seed,
    rngState: seedFromString(opts.seed),
    leaders,
    pendingOrders: {},
    lastOrders: {},
    log: [],
    outcome: null,
    config: {
      dominanceThreshold: DOMINANCE_THRESHOLD_DEFAULT,
      fastPlay: false,
      ...opts.config,
    },
  };
}
```

- [ ] **Step 5: Run typecheck + tests, verify everything passes** (confidence 92 %)

```
npm run typecheck
npm run test:run
```

Expected: typecheck clean. All tests pass; the two new tests pass; existing tests stay green (the new `lastOrders: {}` field is set on every initialState call, so existing tests that destructure or shape-compare state may break — they don't, because all existing assertions use field-by-field property access, not deep equality on the whole state). If a test fails with "expected lastOrders not present", the assertion is over-tight and needs loosening.

- [ ] **Step 6: Commit**

```
git add src/engine/types.ts src/engine/state.ts tests/engine/state.test.ts
git commit -m "engine: add GameState.lastOrders and isHuman() helper"
```

---

## Task 3: Add `GameConfig.playerProfiles` override

**Confidence: 92 %.** Mirrors the existing `startPopOverride` pattern. Slight risk: getting the merge order right (override > LEADER_PROFILES default). Mitigation: explicit code in step 4.

**Files:**
- Modify: `src/engine/types.ts:88-92` (GameConfig interface)
- Modify: `src/engine/state.ts:14-20` (initialState merges the override)
- Modify: `tests/engine/state.test.ts`

- [ ] **Step 1: Write the failing tests** (confidence 95 %)

Add these test cases to `tests/engine/state.test.ts`, inside `describe('initialState', ...)`:

```typescript
it('honours playerProfiles override for name and country', () => {
  const s = initialState({
    cast: ['player1', 'chump'],
    difficulty: 'normal',
    seed: 'p25-override',
    config: {
      playerProfiles: {
        player1: { name: 'Tony', country: '🇮🇹 Italy' },
      },
    },
  });
  expect(s.leaders.player1.name).toBe('Tony');
  expect(s.leaders.player1.country).toBe('🇮🇹 Italy');
  // AI leaders are unaffected by playerProfiles overrides.
  expect(s.leaders.chump.name).toBe('Chump');
});

it('falls back to LEADER_PROFILES defaults when playerProfiles override is partial', () => {
  const s = initialState({
    cast: ['player1'],
    difficulty: 'normal',
    seed: 'p25-partial',
    config: {
      playerProfiles: {
        player1: { name: 'Tony' }, // country omitted
      },
    },
  });
  expect(s.leaders.player1.name).toBe('Tony');
  expect(s.leaders.player1.country).toBe('🦆 Freedonia');
});
```

- [ ] **Step 2: Run the tests, verify they fail** (confidence 95 %)

```
npm run test:run -- tests/engine/state.test.ts
```

Expected: TypeScript error — `Object literal may only specify known properties, and 'playerProfiles' does not exist in type 'Partial<GameConfig>'`.

- [ ] **Step 3: Extend `GameConfig` in `src/engine/types.ts`** (confidence 95 %)

Replace the `GameConfig` interface (lines 88-92 of `src/engine/types.ts`) with:

```typescript
export interface GameConfig {
  startPopOverride?: Partial<Record<LeaderId, number>>;
  /** Per-game name/country overrides for player slots. Keys should be 'player1'..'player5'; entries for AI leaders are ignored. Setup screen populates this from user input. */
  playerProfiles?: Partial<Record<LeaderId, { name?: string; country?: string }>>;
  dominanceThreshold: number;
  fastPlay: boolean;
}
```

- [ ] **Step 4: Apply the override in `initialState` in `src/engine/state.ts`** (confidence 90 % — explicit code below mitigates merge-order risk)

In `src/engine/state.ts`, update the leader-construction loop inside `initialState()`. Replace the existing loop body with:

```typescript
  for (const id of opts.cast) {
    const profile = LEADER_PROFILES[id];
    const startPop = opts.config?.startPopOverride?.[id] ?? profile.startPop;
    const playerOverride = opts.config?.playerProfiles?.[id];
    leaders[id] = {
      id,
      name: playerOverride?.name ?? profile.name,
      country: playerOverride?.country ?? profile.country,
      population: startPop,
      factories: profile.startFactories,
      stockpile: {
        missiles: 0,
        bombers: 0,
        warheadsSmall: 0,
        warheadsMedium: 0,
        warheadsLarge: 0,
        shields: 0,
        aa: 0,
      },
      ap: profile.startAp,
      apBanked: 0,
      alive: true,
      favourability: {},
      grudge: {},
      recentAggressionFrom: {},
      bonusRule: profile.bonusRule,
    };
  }
```

The merge order is: **override (if present and not undefined) > LEADER_PROFILES default**. The `??` operator only falls back when the LHS is `null` / `undefined`, so a `name: ''` empty-string override would still take precedence (intentional — input validation is the Setup screen's job).

- [ ] **Step 5: Run typecheck + tests, verify everything passes** (confidence 95 %)

```
npm run typecheck
npm run test:run
```

Expected: typecheck clean, all tests green including the two new override tests.

- [ ] **Step 6: Commit**

```
git add src/engine/types.ts src/engine/state.ts tests/engine/state.test.ts
git commit -m "engine: add GameConfig.playerProfiles override, merged in initialState"
```

---

## Task 4: `RESOLVE_ROUND` populates `lastOrders` before clearing `pendingOrders`

**Confidence: 90 %.** Single-file change to `resolution.ts`. Risk: ordering — must populate `lastOrders` BEFORE `pendingOrders = {}` clears the source data. Mitigation: explicit code with comment in step 3.

**Files:**
- Modify: `src/engine/resolution.ts:131-134` (the area just before `s.pendingOrders = {};`)
- Modify: `tests/engine/resolution.test.ts` (add new tests at end of an existing describe block, or create one)

- [ ] **Step 1: Write the failing tests** (confidence 92 %)

Add these test cases to `tests/engine/resolution.test.ts`. (If the file doesn't already have a top-level `describe('lastOrders persistence', ...)`, add one. Imports for `initialState` and `reduce` should already exist — add them if missing.)

```typescript
describe('lastOrders persistence', () => {
  it('populates lastOrders after RESOLVE_ROUND for each leader who submitted', () => {
    let s = initialState({
      cast: ['chump', 'carnage'],
      difficulty: 'normal',
      seed: 'lastOrders-1',
    });
    s = reduce(s, {
      type: 'SUBMIT_ORDERS',
      leaderId: 'chump',
      orders: [{ kind: 'build-factory' }],
    });
    s = reduce(s, {
      type: 'SUBMIT_ORDERS',
      leaderId: 'carnage',
      orders: [{ kind: 'build-defence', type: 'shield' }],
    });
    s = reduce(s, { type: 'RESOLVE_ROUND' });
    expect(s.lastOrders.chump).toEqual([{ kind: 'build-factory' }]);
    expect(s.lastOrders.carnage).toEqual([{ kind: 'build-defence', type: 'shield' }]);
  });

  it('overwrites lastOrders on the second RESOLVE_ROUND', () => {
    let s = initialState({
      cast: ['chump'],
      difficulty: 'normal',
      seed: 'lastOrders-2',
    });
    // Round 1
    s = reduce(s, {
      type: 'SUBMIT_ORDERS',
      leaderId: 'chump',
      orders: [{ kind: 'build-factory' }],
    });
    s = reduce(s, { type: 'RESOLVE_ROUND' });
    expect(s.lastOrders.chump).toEqual([{ kind: 'build-factory' }]);
    // Round 2 — different orders
    s = reduce(s, {
      type: 'SUBMIT_ORDERS',
      leaderId: 'chump',
      orders: [{ kind: 'build-missile' }],
    });
    s = reduce(s, { type: 'RESOLVE_ROUND' });
    expect(s.lastOrders.chump).toEqual([{ kind: 'build-missile' }]);
  });
});
```

- [ ] **Step 2: Run the tests, verify they fail** (confidence 92 %)

```
npm run test:run -- tests/engine/resolution.test.ts
```

Expected: tests fail because `s.lastOrders.chump` is `undefined` (RESOLVE_ROUND doesn't yet populate it).

- [ ] **Step 3: Populate `lastOrders` in `resolveRound()`** (confidence 90 %)

In `src/engine/resolution.ts`, find the `// Clear pending, advance round.` comment near line 131. **Insert** the lastOrders population just before the `s.pendingOrders = {};` line. The block becomes:

```typescript
  // Persist this round's orders for next round's planAi (Hard-mode lookahead
  // reads lastOrders[humanId] for human opponents; AI opponents are still
  // re-planned via dispatch). Read from the original `state` parameter to
  // match the existing pattern in this function (see line 119-121).
  s.lastOrders = {};
  for (const id of s.cast) {
    const sealed = state.pendingOrders[id];
    if (sealed) s.lastOrders[id] = sealed.orders;
  }
  // Clear pending, advance round.
  s.pendingOrders = {};
  s.round += 1;
```

A leader who didn't submit (eliminated, passed) gets no entry. Lookahead reads `state.lastOrders[id] ?? []` and naturally falls back to empty.

- [ ] **Step 4: Run typecheck + tests, verify everything passes** (confidence 95 %)

```
npm run typecheck
npm run test:run
```

Expected: typecheck clean, all tests green including the two new persistence tests.

- [ ] **Step 5: Commit**

```
git add src/engine/resolution.ts tests/engine/resolution.test.ts
git commit -m "engine: RESOLVE_ROUND persists pending orders to GameState.lastOrders"
```

---

## Task 5: `planAi` rejects human leaders

**Confidence: 95 %.** Trivial guard at the top of the function using the `isHuman` helper from Task 2.

**Files:**
- Modify: `src/engine/ai/index.ts:1-17` (top of file: imports + planAi guard)
- Modify: `tests/engine/ai/dispatcher.test.ts` (add a new test at end of `describe('planAi dispatcher', ...)`)

- [ ] **Step 1: Write the failing test** (confidence 95 %)

Add this test case to `tests/engine/ai/dispatcher.test.ts`, inside `describe('planAi dispatcher', ...)`:

```typescript
it('throws when called for a human player slot', () => {
  const s = initialState({
    cast: ['player1', 'chump'],
    difficulty: 'normal',
    seed: 'planAi-human',
  });
  expect(() => planAi(s, 'player1')).toThrow(/human/i);
});
```

- [ ] **Step 2: Run the test, verify it fails** (confidence 95 %)

```
npm run test:run -- tests/engine/ai/dispatcher.test.ts
```

Expected: test fails because either `planAi` doesn't throw (currently it would silently call `dispatch()` for `player1`, which throws but with a "dispatch" message that doesn't match the `/human/i` regex), OR the message doesn't contain "human" in the right case.

- [ ] **Step 3: Add the human-guard at the top of `planAi` in `src/engine/ai/index.ts`** (confidence 95 %)

Update the imports and the top of `planAi()`. Replace lines 1-17 of `src/engine/ai/index.ts` with:

```typescript
import type { Difficulty, GameState, LeaderId, Order } from '../types';
import { apCostOf, validateOrder } from '../orders';
import { nextRandom } from '../rng';
import { isHuman } from '../state';
import { dispatch } from './dispatch';
import { bestTargetByLookahead } from './lookahead';

const DIFFICULTY_RANDOM_PCT: Record<Difficulty, number> = {
  easy: 0.3,
  normal: 0.1,
  hard: 0,
};

export function planAi(state: GameState, leaderId: LeaderId, difficulty?: Difficulty): Order[] {
  const me = state.leaders[leaderId];
  if (!me || !me.alive) return [];
  if (isHuman(leaderId)) {
    throw new Error(
      `planAi() called for human leader '${leaderId}'. ` +
      `Human leaders submit orders via SUBMIT_ORDERS, not via the AI planner.`,
    );
  }
  const diff = difficulty ?? state.difficulty;
```

(The rest of `planAi` from `let orders = dispatch(...)` onward stays unchanged.)

Note: the `difficulty` resolution moves to after the alive + human checks. This is purely cosmetic; the prior `me.alive` guard already returned early before `state.difficulty` mattered.

- [ ] **Step 4: Run typecheck + tests, verify everything passes** (confidence 95 %)

```
npm run typecheck
npm run test:run
```

Expected: typecheck clean, all tests green.

- [ ] **Step 5: Commit**

```
git add src/engine/ai/index.ts tests/engine/ai/dispatcher.test.ts
git commit -m "engine: planAi throws when called for a human leader"
```

---

## Task 6: `bestTargetByLookahead` substitutes human's `lastOrders`

**Confidence: 90 %.** The simulation semantics matter — humans contribute their previous round's orders (or `[]` if no history). Inline code below mitigates risk; the test covers both branches.

**Files:**
- Modify: `src/engine/ai/lookahead.ts:1-2,99-104` (imports + opponent loop)
- Modify: `tests/engine/ai/lookahead.test.ts` (add new test at end of file)

- [ ] **Step 1: Write the failing tests** (confidence 92 %)

Add these test cases to the end of `tests/engine/ai/lookahead.test.ts`, inside the existing top-level `describe(...)` block. (Add `import { planAi } from '../../../src/engine/ai';` and `import { initialState } from '../../../src/engine/state';` at the top of the file if they aren't already present.)

```typescript
it('mixed cast with no history: lookahead falls back to passive simulation for human', () => {
  const s = initialState({
    cast: ['chump', 'carnage', 'player1'],
    difficulty: 'hard',
    seed: 'lookahead-human-no-history',
  });
  s.leaders.chump.stockpile.missiles = 1;
  s.leaders.chump.stockpile.warheadsSmall = 1;
  s.leaders.carnage.population = 8;
  s.leaders.carnage.stockpile.shields = 0;
  s.leaders.player1.population = 8;
  s.leaders.player1.stockpile.shields = 0;
  // No lastOrders[player1] populated. Should not throw, should pick a target.
  expect(() => planAi(s, 'chump')).not.toThrow();
  const orders = planAi(s, 'chump');
  expect(orders.find((o) => o.kind === 'launch')).toBeDefined();
});

it('mixed cast with history: lookahead simulates human as repeating their last orders', () => {
  let s = initialState({
    cast: ['chump', 'carnage', 'player1'],
    difficulty: 'hard',
    seed: 'lookahead-human-with-history',
  });
  // Pre-populate lastOrders for player1 with a launch at chump.
  // Give player1 the stockpile that supports the launch in the simulated round.
  s.leaders.player1.stockpile.missiles = 1;
  s.leaders.player1.stockpile.warheadsSmall = 1;
  s.lastOrders = {
    player1: [{
      kind: 'launch',
      target: 'chump',
      delivery: 'missile',
      warhead: 'small',
      targetType: 'people',
    }],
  };
  // Set up so chump has a viable launch candidate
  s.leaders.chump.stockpile.missiles = 1;
  s.leaders.chump.stockpile.warheadsSmall = 1;
  s.leaders.carnage.stockpile.shields = 0;
  // planAi should not throw, should produce some launch from chump.
  expect(() => planAi(s, 'chump')).not.toThrow();
});
```

- [ ] **Step 2: Run the tests, verify they fail** (confidence 92 %)

```
npm run test:run -- tests/engine/ai/lookahead.test.ts
```

Expected: tests fail with `dispatch() called for human player slot 'player1'` (raised by Task 1's dispatch guard, surfacing through Hard-mode lookahead's opponent loop, since Task 6 hasn't shipped yet).

- [ ] **Step 3: Add `isHuman` import and substitute `lastOrders` in the opponent loop in `src/engine/ai/lookahead.ts`** (confidence 90 %)

In `src/engine/ai/lookahead.ts`, add the `isHuman` import at the top of the file (after the `import { reduce } from '../reducer';` line):

```typescript
import { isHuman } from '../state';
```

Then replace the opponent-planner loop inside `bestTargetByLookahead` (lines 99-104) with:

```typescript
    for (const id of state.cast) {
      if (id === viewer) continue;
      const opp = state.leaders[id];
      if (!opp || !opp.alive) continue;
      if (isHuman(id)) {
        // Project the human as repeating last round's orders. Falls back to []
        // for the first round (no history yet) or if they passed last round.
        // simulateOneRound re-validates and gracefully drops invalid orders
        // (e.g., a launch order from last round when their stockpile is now empty).
        ordersByLeader[id] = state.lastOrders[id] ?? [];
        continue;
      }
      ordersByLeader[id] = opponentPlanner(state, id);
    }
```

- [ ] **Step 4: Run typecheck + tests, verify everything passes** (confidence 92 %)

```
npm run typecheck
npm run test:run
```

Expected: typecheck clean, all tests green. Both new sub-cases pass.

- [ ] **Step 5: Commit**

```
git add src/engine/ai/lookahead.ts tests/engine/ai/lookahead.test.ts
git commit -m "engine: lookahead substitutes human's lastOrders into simulated round"
```

---

## Task 7: Integration test — mixed cast end-to-end

**Confidence: 92 %.** Validates the whole flow: human submits orders manually, AI orders generated via `planAi`, `RESOLVE_ROUND` runs, `lastOrders` is populated. Sanity check that Tasks 1-6 compose correctly.

**Files:**
- Modify: `tests/engine/integration.test.ts` (add new test at end of existing top-level `describe` block)

- [ ] **Step 1: Write the integration test** (confidence 90 %)

Add this test case to the end of `tests/engine/integration.test.ts`. (If `planAi` isn't already imported, add `import { planAi } from '../../src/engine/ai';` at the top.)

```typescript
it('runs a mixed-cast round end-to-end (player1 + 2 AI), and persists lastOrders', () => {
  let s = initialState({
    cast: ['player1', 'chump', 'carnage'],
    difficulty: 'normal',
    seed: 'p25-integration',
    config: {
      playerProfiles: {
        player1: { name: 'Tony', country: '🇮🇹 Italy' },
      },
    },
  });
  // Sanity: player overrides applied; lastOrders empty at game start.
  expect(s.leaders.player1.name).toBe('Tony');
  expect(s.lastOrders).toEqual({});

  // Human submits orders directly.
  const playerOrders = [{ kind: 'build-factory' as const }];
  s = reduce(s, {
    type: 'SUBMIT_ORDERS',
    leaderId: 'player1',
    orders: playerOrders,
  });
  expect(s.pendingOrders.player1?.orders).toHaveLength(1);

  // AI leaders use planAi.
  for (const id of ['chump', 'carnage'] as const) {
    const orders = planAi(s, id);
    s = reduce(s, { type: 'SUBMIT_ORDERS', leaderId: id, orders });
  }

  // Resolve the round; should not throw, should advance round counter,
  // clear pendingOrders, and populate lastOrders.
  s = reduce(s, { type: 'RESOLVE_ROUND' });
  expect(s.round).toBe(2);
  expect(s.pendingOrders).toEqual({});
  expect(s.lastOrders.player1).toEqual(playerOrders);
  expect(s.lastOrders.chump).toBeDefined();
  expect(s.lastOrders.carnage).toBeDefined();
});
```

- [ ] **Step 2: Run the test, verify it passes on the first try** (confidence 92 %)

```
npm run test:run -- tests/engine/integration.test.ts
```

Expected: passes. Tasks 1-6 should have made this work without further code changes — this test is the integration check that all prior tasks composed correctly.

If it fails, the failure pinpoints which prior task left a gap:
- `dispatch() called for human player slot` → Task 6's lookahead substitution didn't land. Check `lookahead.ts:99-105`.
- `Cannot read properties of undefined (reading 'name')` → `LEADER_PROFILES.player1` missing. Check Task 1 step 4.
- `s.lastOrders is undefined` → Task 4 didn't populate. Check `resolution.ts` block before `pendingOrders = {}`.

- [ ] **Step 3: Commit**

```
git add tests/engine/integration.test.ts
git commit -m "test: mixed-cast (player1 + AI) end-to-end integration with lastOrders"
```

---

## Task 8: README — Phase 2.5 status note

**Confidence: 99 %.** Documentation only.

**Files:**
- Modify: `README.md` (insert a new `## Phase 2.5 status` section after the existing `## Phase 2 status` section)

- [ ] **Step 1: Add the Phase 2.5 status section** (confidence 99 %)

Insert this section after the closing of `## Phase 2 status` in `README.md` (after the `Per-personality scoring weight tuning. Deferred to P4 balance pass.` line):

```markdown
## Phase 2.5 status

Phase 2.5 adds a separate human player slot. The human plays a configurable country (default: Rufus T. Firefly / 🦆 Freedonia from *Duck Soup*) rather than taking over an AI character.

What's in `src/engine/`:

- `LeaderId` extended with `'player1' | 'player2' | 'player3' | 'player4' | 'player5'`. Forward-compatible to ≤5-human hotseat games without further engine changes.
- `isHuman(id)` derived helper in `state.ts` — one-line predicate, no stored field on `Leader`.
- `GameConfig.playerProfiles` override lets the Setup screen replace the default name/country per player slot at game-start. Mirrors the existing `startPopOverride` pattern.
- `GameState.lastOrders` persists each round's submitted orders. Hard-mode lookahead reads it for human opponents and projects them as repeating last round's orders (better than treating them as passive).
- `planAi()` and `dispatch()` throw when called for human leaders; `bestTargetByLookahead()` substitutes the human's `lastOrders` into the simulated round.

What's NOT in this phase:

- Production SVG art for the Freedonia flag (Phase 3 art workstream — current implementation is the engine-level `🦆 Freedonia` glyph + name string).
- Setup-screen UX for editing player name/country. Phase 3 wires the override through.
- Multi-human hotseat coordination (passing-the-device curtain). Phase 3 / 4 UX work.
- Approach B (sliding-window history) and Approach C (personality-fit modelling) for human prediction — deferred; can be added later without engine refactor.
```

- [ ] **Step 2: Commit**

```
git add README.md
git commit -m "docs: phase 2.5 status note in README"
```

---

## Done

After Task 8 commits cleanly:

- `npm run typecheck` is green.
- `npm run test:run` is green (all prior tests + ~9 new ones added across `state.test.ts`, `balance.test.ts`, `resolution.test.ts`, `dispatcher.test.ts`, `lookahead.test.ts`, `integration.test.ts`).
- The engine supports a mixed cast of humans and AI; humans submit via `SUBMIT_ORDERS` and AI via `planAi`. Hard-mode AI lookahead projects humans as repeating their previous round.
- Phase 3 can now build a Setup screen with a first-class "you" slot and a Hard-mode AI that takes the human's recent behaviour into account.

Optional follow-up (not part of this plan): run `graphify update .` to refresh the knowledge graph with the new types and helpers.
