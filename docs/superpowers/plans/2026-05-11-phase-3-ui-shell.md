# Phase 3 — Thin UI Shell Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the first playable build of `nuke` — a thin React UI over the existing engine, with six functional screens (Setup, Planning, AiConferring, Action, RoundSummary, Winners) navigable via a screen state machine, mockup-matched CSS via CSS Modules, and an engine refactor (`lastOrders` → `orderHistory`) positioning Phase 4a's replay scrubber + advanced AI lookahead as logic-only changes.

**Architecture:** Pure-TS engine stays as-is structurally; one engine refactor (Task 1) replaces P2.5's `lastOrders` with `orderHistory` (per-round array). New React UI under `src/ui/` consumes engine exports via a single `useReducer` holding `{ screen, game, events, prevPopulations, initialPopulations, lastNewGameOpts }`. Screen state machine in the reducer; no React Router. CSS Modules per screen; mockup HTML ports verbatim from `docs/superpowers/mockups/`.

**Tech Stack:** TypeScript 5.4, Vite 5, React 18, Vitest 1.5 (jsdom env added), React Testing Library, CSS Modules. No new runtime deps beyond React.

**Source of truth:** `docs/superpowers/specs/2026-05-11-phase-3-ui-design.md` (committed `2d2a5e0`). If anything below conflicts with that spec, the spec wins — flag the discrepancy before coding.

**Per-step confidence:** every step is rated; sub-95% steps embed mitigations inline. After the confidence-lift pass (autonomous resolutions for the original 11 sub-91% steps), lowest step in this plan is **92 %**. Three real bugs caught and fixed in-plan: (1) OrderForm multi-launch silent-failure → `validateOrderSequence` helper extracted in Task 1; (2) Action-screen LeaderEliminated wrong-phase for FR-cascade kills → stateful cursor in Task 8; (3) RoundSummary `pickSubhead` rendering raw LeaderId → name lookup in Task 9. Tap-and-hold simplified from `setInterval` to CSS transition.

---

## File structure

**Modified source files (Task 1 — engine refactor):**
- `src/engine/types.ts` — replace `lastOrders` with `orderHistory` on `GameState`
- `src/engine/state.ts` — seed `orderHistory: []` in `initialState`
- `src/engine/resolution.ts` — append per-round snapshot to `orderHistory` instead of overwriting `lastOrders`
- `src/engine/ai/lookahead.ts` — read `state.orderHistory[length-1]?.[id] ?? []` instead of `state.lastOrders[id]`

**Engine test reshape (Task 1):**
- `tests/engine/state.test.ts` — replace `lastOrders === {}` assertion with `orderHistory === []`
- `tests/engine/resolution.test.ts` — reshape "lastOrders persistence" describe block
- `tests/engine/integration.test.ts` — final assertion uses `orderHistory[length-1]?.player1`
- `tests/engine/ai/lookahead.test.ts` — with-history sub-case pre-populates `s.orderHistory = [{...}]`

**New top-level files (Task 2):**
- `index.html`
- `vite.config.ts`
- `package.json` — add React + Vite + RTL devDependencies, add `dev` and `build` scripts
- `tsconfig.json` — add `"jsx": "react-jsx"`, DOM lib

**New source tree (Tasks 3-10):**
- `src/ui/main.tsx`
- `src/ui/App.tsx`
- `src/ui/store.ts`
- `src/ui/screens/{Setup,Planning,AiConferring,Action,RoundSummary,Winners}.tsx + .module.css`
- `src/ui/components/{LeaderCard,OrderForm,ApBudget,EventCard,PhaseTracker}.tsx + .module.css`

**New tests:**
- `tests/ui/setup.ts` — RTL test setup (imports `@testing-library/jest-dom`)
- `tests/ui/OrderForm.test.tsx` (part of Task 6)
- `tests/ui/ApBudget.test.tsx` (part of Task 5)

**Modified docs (Task 11):**
- `README.md` — Phase 3 status section

---

## Task 1: Engine refactor — `lastOrders` → `orderHistory` + `validateOrderSequence` helper

**Confidence: 95 %.** Two engine changes in one cohesive commit: (1) replace `lastOrders` with `orderHistory` (P2.5→P3 data-shape extension), (2) extract `validateOrderSequence` from the reducer into `src/engine/orders.ts` for UI consumption (prevents OrderForm silent-failure on multi-launch order queues). Both mechanical; TS exhaustiveness catches every consumer.

**Files:**
- Modify: `src/engine/types.ts:110-114` (GameState interface — replace `lastOrders` field)
- Modify: `src/engine/state.ts:54` (initialState return — `lastOrders: {}` → `orderHistory: []`)
- Modify: `src/engine/resolution.ts:132-141` (the lastOrders population block)
- Modify: `src/engine/ai/lookahead.ts:104-110` (lookahead substitution)
- Modify: `src/engine/orders.ts` (export new `validateOrderSequence` helper)
- Modify: `src/engine/reducer.ts:25-37` (SUBMIT_ORDERS body uses the new helper)
- Modify: `tests/engine/state.test.ts:97-103` (initialState empty-state assertion)
- Modify: `tests/engine/resolution.test.ts` "lastOrders persistence" describe block (~2 tests)
- Modify: `tests/engine/integration.test.ts` (mixed-cast e2e final assertion)
- Modify: `tests/engine/ai/lookahead.test.ts` (with-history sub-case setup)
- Modify: `tests/engine/orders.test.ts` (add validateOrderSequence test cases)

- [ ] **Step 1: Replace `lastOrders` in `GameState` interface** (confidence 98 %)

In `src/engine/types.ts:110-114`, replace:

```ts
  /** The most recent round's submitted orders for each leader. Populated by RESOLVE_ROUND before pendingOrders is cleared. Used by Hard-mode lookahead to project human opponents' likely behaviour. */
  lastOrders: Partial<Record<LeaderId, Order[]>>;
```

with:

```ts
  /** Per-round history of submitted orders. One entry per completed round (chronological), populated by RESOLVE_ROUND before pendingOrders is cleared. Used by Hard-mode lookahead to project human opponents' likely behaviour, and (in P4a) by the replay scrubber to reconstruct each round. */
  orderHistory: Partial<Record<LeaderId, Order[]>>[];
```

- [ ] **Step 2: Update `initialState` return literal** (confidence 98 %)

In `src/engine/state.ts:54`, replace `lastOrders: {}` with `orderHistory: []`.

- [ ] **Step 3: Update `resolveRound` to append snapshot** (confidence 95 %)

In `src/engine/resolution.ts`, locate the existing block (around lines 132-141):

```ts
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
```

Replace with:

```ts
  // Persist this round's orders for next round's planAi (Hard-mode lookahead
  // reads orderHistory[length-1][humanId] for human opponents; AI opponents
  // are still re-planned via dispatch). Read from the original `state` parameter
  // to match the existing pattern in this function (see line 119-121).
  const thisRound: Partial<Record<LeaderId, Order[]>> = {};
  for (const id of s.cast) {
    const sealed = state.pendingOrders[id];
    if (sealed) thisRound[id] = sealed.orders;
  }
  s.orderHistory = [...state.orderHistory, thisRound];
  // Clear pending, advance round.
  s.pendingOrders = {};
```

Note: read `state.orderHistory` (original parameter) for the spread base, matching the same defensive pattern used elsewhere in the function.

- [ ] **Step 4: Update lookahead substitution** (confidence 95 %)

In `src/engine/ai/lookahead.ts`, locate the existing human branch (around lines 104-110):

```ts
      if (isHuman(id)) {
        // Project the human as repeating last round's orders. Falls back to []
        // for the first round (no history yet) or if they passed last round.
        // simulateOneRound re-validates and gracefully drops invalid orders
        // (e.g., a launch order from last round when their stockpile is now empty).
        ordersByLeader[id] = state.lastOrders[id] ?? [];
        continue;
      }
```

Replace with:

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

- [ ] **Step 5: Reshape `state.test.ts` empty-state assertion** (confidence 98 %)

In `tests/engine/state.test.ts`, locate the test asserting `s.lastOrders` is `{}` (around line 100):

```ts
  it('seeds lastOrders as an empty object', () => {
    const s = initialState({
      cast: ['player1', 'chump'],
      difficulty: 'normal',
      seed: 'p25-lastOrders-init',
    });
    expect(s.lastOrders).toEqual({});
  });
```

Replace with:

```ts
  it('seeds orderHistory as an empty array', () => {
    const s = initialState({
      cast: ['player1', 'chump'],
      difficulty: 'normal',
      seed: 'p3-orderHistory-init',
    });
    expect(s.orderHistory).toEqual([]);
  });
```

- [ ] **Step 6: Reshape `resolution.test.ts` orderHistory persistence tests** (confidence 95 %)

In `tests/engine/resolution.test.ts`, locate the `describe('lastOrders persistence', ...)` block and replace it entirely with:

```ts
describe('orderHistory persistence', () => {
  it('appends this round\'s orders to orderHistory after RESOLVE_ROUND', () => {
    let s = initialState({
      cast: ['chump', 'carnage'],
      difficulty: 'normal',
      seed: 'orderHistory-1',
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
    expect(s.orderHistory).toHaveLength(1);
    expect(s.orderHistory[0].chump).toEqual([{ kind: 'build-factory' }]);
    expect(s.orderHistory[0].carnage).toEqual([{ kind: 'build-defence', type: 'shield' }]);
  });

  it('appends a new entry per round (does not overwrite)', () => {
    let s = initialState({
      cast: ['chump'],
      difficulty: 'normal',
      seed: 'orderHistory-2',
    });
    s = reduce(s, {
      type: 'SUBMIT_ORDERS',
      leaderId: 'chump',
      orders: [{ kind: 'build-factory' }],
    });
    s = reduce(s, { type: 'RESOLVE_ROUND' });
    expect(s.orderHistory).toHaveLength(1);
    expect(s.orderHistory[0].chump).toEqual([{ kind: 'build-factory' }]);
    s = reduce(s, {
      type: 'SUBMIT_ORDERS',
      leaderId: 'chump',
      orders: [{ kind: 'build-missile' }],
    });
    s = reduce(s, { type: 'RESOLVE_ROUND' });
    expect(s.orderHistory).toHaveLength(2);
    expect(s.orderHistory[0].chump).toEqual([{ kind: 'build-factory' }]);
    expect(s.orderHistory[1].chump).toEqual([{ kind: 'build-missile' }]);
  });
});
```

- [ ] **Step 7: Reshape `integration.test.ts` final assertion** (confidence 95 %)

In `tests/engine/integration.test.ts`, locate the mixed-cast e2e final assertion `expect(s.lastOrders.player1).toEqual(playerOrders)` and the surrounding orderHistory-related assertions. Replace the three lastOrders assertions:

```ts
    expect(s.lastOrders.player1).toEqual(playerOrders);
    expect(s.lastOrders.chump).toBeDefined();
    expect(s.lastOrders.carnage).toBeDefined();
```

with:

```ts
    expect(s.orderHistory).toHaveLength(1);
    expect(s.orderHistory[0].player1).toEqual(playerOrders);
    expect(s.orderHistory[0].chump).toBeDefined();
    expect(s.orderHistory[0].carnage).toBeDefined();
```

Also replace the earlier sanity assertion at the top of the test:

```ts
  expect(s.lastOrders).toEqual({});
```

with:

```ts
  expect(s.orderHistory).toEqual([]);
```

- [ ] **Step 8: Reshape `lookahead.test.ts` with-history sub-case** (confidence 92 %)

In `tests/engine/ai/lookahead.test.ts`, locate the "with-history" test (`'mixed cast with history: lookahead simulates human as repeating their last orders'`). Find the line `s.lastOrders = { player1: [...] };` and replace:

```ts
  s.lastOrders = {
    player1: [{
      kind: 'launch',
      target: 'chump',
      delivery: 'missile',
      warhead: 'small',
      targetType: 'people',
    }],
  };
```

with:

```ts
  s.orderHistory = [{
    player1: [{
      kind: 'launch',
      target: 'chump',
      delivery: 'missile',
      warhead: 'small',
      targetType: 'people',
    }],
  }];
```

- [ ] **Step 9: Write the failing test for `validateOrderSequence`** (confidence 95 %)

Add to `tests/engine/orders.test.ts` (inside an existing or new `describe` block):

```ts
describe('validateOrderSequence', () => {
  it('accepts a sequence of valid orders within AP budget', () => {
    const s = initialState({ cast: ['chump', 'carnage'], difficulty: 'normal', seed: 'seq-1' });
    const orders: Order[] = [{ kind: 'build-factory' }, { kind: 'build-missile' }];
    const r = validateOrderSequence(s, 'chump', orders);
    expect(r.ok).toBe(true);
  });

  it('rejects a second launch that would over-consume stockpile', () => {
    const s = initialState({ cast: ['chump', 'carnage'], difficulty: 'normal', seed: 'seq-2' });
    // Give chump just one missile + one warhead
    s.leaders.chump.stockpile.missiles = 1;
    s.leaders.chump.stockpile.warheadsSmall = 1;
    const launch: Order = {
      kind: 'launch', target: 'carnage', delivery: 'missile', warhead: 'small', targetType: 'people',
    };
    const r = validateOrderSequence(s, 'chump', [launch, launch]);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.orderIndex).toBe(1);
      expect(r.reason).toMatch(/missile|warhead|stockpile/i);
    }
  });
});
```

- [ ] **Step 10: Run the test, verify it fails to compile** (confidence 95 %)

```
npm run test:run -- tests/engine/orders.test.ts
```

Expected: `'validateOrderSequence' is not exported from '../../src/engine/orders'`.

- [ ] **Step 11: Export `validateOrderSequence` from `src/engine/orders.ts`** (confidence 95 %)

Add to `src/engine/orders.ts`:

```ts
import type { GameState, LeaderId, Order } from './types';
import { warheadFieldFor } from './launches';
// (existing imports above)

export type SequenceValidation =
  | { ok: true }
  | { ok: false; reason: string; orderIndex: number };

/**
 * Validate a SEQUENCE of orders against a leader's state, projecting stockpile
 * consumption from prior launches in the same sequence. Mirrors the per-order
 * loop in reducer.ts's SUBMIT_ORDERS case; extracted so UI can validate the
 * full queue without duplicating the projection logic.
 */
export function validateOrderSequence(
  state: GameState,
  leaderId: LeaderId,
  orders: Order[],
): SequenceValidation {
  let projected: GameState = state;
  for (let i = 0; i < orders.length; i++) {
    const o = orders[i];
    const v = validateOrder(projected, leaderId, o);
    if (!v.ok) return { ok: false, reason: v.reason, orderIndex: i };
    if (o.kind === 'launch') {
      projected = structuredClone(projected);
      const pl = projected.leaders[leaderId];
      if (o.delivery === 'missile') pl.stockpile.missiles -= 1;
      else pl.stockpile.bombers -= 1;
      pl.stockpile[warheadFieldFor(o.warhead)] -= 1;
    }
  }
  return { ok: true };
}
```

- [ ] **Step 12: Refactor `reducer.ts` SUBMIT_ORDERS to use the new helper** (confidence 92 %)

In `src/engine/reducer.ts` SUBMIT_ORDERS case (~lines 25-37), replace the inline per-order projection loop with a single helper call:

```ts
case 'SUBMIT_ORDERS': {
  const me = state.leaders[action.leaderId];
  if (!me || !me.alive) return state;

  const v = validateOrderSequence(state, action.leaderId, action.orders);
  if (!v.ok) return state;

  const cost = totalApCost(action.orders);
  if (cost > me.ap) return state;

  const next = structuredClone(state);
  next.leaders[action.leaderId].ap = me.ap - cost;
  next.pendingOrders[action.leaderId] = {
    leaderId: action.leaderId,
    orders: action.orders,
    apSpent: cost,
  };
  return next;
}
```

Add `import { validateOrderSequence } from './orders';` at the top of `reducer.ts` if not already imported.

- [ ] **Step 13: Run typecheck + tests, verify everything passes** (confidence 95 %)

```
npm run typecheck
npm run test:run
```

Expected: typecheck clean. All 161 existing tests still green + 2 new validateOrderSequence tests = 163 tests. The reducer refactor is internal (same behaviour, just delegates to the helper) so no existing tests should break.

- [ ] **Step 14: Commit**

```
git add src/engine/types.ts src/engine/state.ts src/engine/resolution.ts src/engine/ai/lookahead.ts \
        src/engine/orders.ts src/engine/reducer.ts \
        tests/engine/state.test.ts tests/engine/resolution.test.ts tests/engine/integration.test.ts \
        tests/engine/ai/lookahead.test.ts tests/engine/orders.test.ts
git commit -m "engine: orderHistory + validateOrderSequence helper"
```

---

## Task 2: Vite + React scaffold

**Confidence: 95 %.** Tooling setup. Steps are mostly file-creation; the only previously-flagged risk (`vitest/config`'s defineConfig extending Vite's config) is a documented Vitest 1.x pattern — verified against the published API.

**Files:**
- Modify: `package.json`
- Modify: `tsconfig.json`
- Create: `index.html`
- Create: `vite.config.ts`
- Create: `src/ui/main.tsx`
- Create: `tests/ui/setup.ts`

- [ ] **Step 1: Add React + Vite + RTL devDependencies** (confidence 92 %)

In `package.json`, the `devDependencies` block should become:

```json
"devDependencies": {
  "@testing-library/jest-dom": "^6.4.0",
  "@testing-library/react": "^14.2.0",
  "@types/node": "^20.12.7",
  "@types/react": "^18.2.0",
  "@types/react-dom": "^18.2.0",
  "@vitejs/plugin-react": "^4.2.0",
  "jsdom": "^24.0.0",
  "react": "^18.2.0",
  "react-dom": "^18.2.0",
  "typescript": "^5.4.5",
  "vite": "^5.2.0",
  "vitest": "^1.5.0"
}
```

Add new scripts:

```json
"scripts": {
  "dev": "vite",
  "build": "tsc --noEmit && vite build",
  "test": "vitest",
  "test:run": "vitest run",
  "typecheck": "tsc --noEmit"
}
```

Run `npm install`.

- [ ] **Step 2: Update `tsconfig.json`** (confidence 92 %)

Replace `tsconfig.json` with:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "isolatedModules": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "verbatimModuleSyntax": false,
    "types": ["vitest/globals", "@testing-library/jest-dom"]
  },
  "include": ["src", "tests"],
  "exclude": ["node_modules", "dist"]
}
```

(If the existing `tsconfig.json` differs significantly from this, preserve any project-specific options like `paths` or `baseUrl`.)

- [ ] **Step 3: Create `index.html` at project root** (confidence 95 %)

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>nuke</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/ui/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 4: Create `vite.config.ts`** (confidence 95 %)

```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/ui/setup.ts'],
    globals: true,
    include: ['tests/**/*.test.{ts,tsx}'],
  },
});
```

Note: `vitest/config`'s `defineConfig` extends Vite's, so this config doubles as the Vite dev/build config and the Vitest config. The `test` block is honoured only by Vitest.

- [ ] **Step 5: Create `tests/ui/setup.ts`** (confidence 95 %)

```ts
import '@testing-library/jest-dom';
```

That's it — single import gives the extra jest-dom matchers globally.

- [ ] **Step 6: Create `src/ui/main.tsx` placeholder** (confidence 95 %)

```tsx
import { createRoot } from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Root element #root not found in index.html');
createRoot(rootElement).render(<App />);
```

Note: this imports `./App` which doesn't exist yet — typecheck will fail until Task 3 creates `src/ui/App.tsx`. That's fine; Task 2's commit is "tooling only" without an App. The next task (Task 3) fixes the build.

- [ ] **Step 7: Run typecheck, expect it to fail on missing App** (confidence 95 %)

```
npm run typecheck
```

Expected: `Cannot find module './App' or its corresponding type declarations.` Acceptable for this task's commit — Task 3 creates App.

If typecheck passes (e.g., App already exists from an earlier WIP), proceed.

- [ ] **Step 8: Commit** (the tooling scaffold; non-blocking that typecheck doesn't yet pass)

```
git add package.json package-lock.json tsconfig.json index.html vite.config.ts src/ui/main.tsx tests/ui/setup.ts
git commit -m "ui: add Vite + React + RTL scaffold (App.tsx in next task)"
```

---

## Task 3: UI store + App shell + stub screens (skeleton-first end-to-end)

**Confidence: 93 %.** Sets up the screen state machine and stub renderers so the whole flow is clickable on day one. Mitigation: complete code per step + explicit reducer-action enumeration. `ScreenProps` typing simplified to use explicit `UiState`/`UiAction` imports rather than `ReturnType<typeof uiReducer>` / `Parameters<typeof uiReducer>[1]` indirection.

**Files:**
- Create: `src/ui/store.ts`
- Create: `src/ui/App.tsx`
- Create: `src/ui/screens/Setup.tsx`
- Create: `src/ui/screens/Planning.tsx`
- Create: `src/ui/screens/AiConferring.tsx`
- Create: `src/ui/screens/Action.tsx`
- Create: `src/ui/screens/RoundSummary.tsx`
- Create: `src/ui/screens/Winners.tsx`

- [ ] **Step 1: Create `src/ui/store.ts`** (confidence 90 %)

```ts
import type { GameState, LeaderId, NewGameOpts, Order, ResolutionEvent } from '../engine/types';
import { initialState } from '../engine/state';
import { isHuman } from '../engine/state';
import { reduce } from '../engine/reducer';
import { planAi } from '../engine/ai';
import { resolveRound } from '../engine/resolution';

export type ScreenName =
  | 'setup'
  | 'planning'
  | 'aiConferring'
  | 'action'
  | 'roundSummary'
  | 'winners';

export interface UiState {
  screen: ScreenName;
  game: GameState | null;
  events: ResolutionEvent[];
  prevPopulations: Partial<Record<LeaderId, number>>;
  initialPopulations: Partial<Record<LeaderId, number>>;
  lastNewGameOpts: NewGameOpts | null;
}

export type UiAction =
  | { type: 'START_GAME'; opts: NewGameOpts }
  | { type: 'PLAYER_SUBMIT'; orders: Order[] }
  | { type: 'AI_RESOLVE' }
  | { type: 'ACTION_DONE' }
  | { type: 'NEXT_ROUND' }
  | { type: 'BACK_TO_SETUP' };

export const initialUiState: UiState = {
  screen: 'setup',
  game: null,
  events: [],
  prevPopulations: {},
  initialPopulations: {},
  lastNewGameOpts: null,
};

export function uiReducer(state: UiState, action: UiAction): UiState {
  switch (action.type) {
    case 'START_GAME': {
      const game = initialState(action.opts);
      const initialPopulations: Partial<Record<LeaderId, number>> = {};
      for (const id of game.cast) initialPopulations[id] = game.leaders[id].population;
      return {
        screen: 'planning',
        game,
        events: [],
        prevPopulations: {},
        initialPopulations,
        lastNewGameOpts: action.opts,
      };
    }
    case 'PLAYER_SUBMIT': {
      if (!state.game) return state;
      const game = reduce(state.game, {
        type: 'SUBMIT_ORDERS',
        leaderId: 'player1',
        orders: action.orders,
      });
      return { ...state, screen: 'aiConferring', game };
    }
    case 'AI_RESOLVE': {
      if (!state.game) return state;
      const prevPopulations: Partial<Record<LeaderId, number>> = {};
      for (const id of state.game.cast) prevPopulations[id] = state.game.leaders[id].population;
      let game = state.game;
      for (const id of game.cast) {
        if (isHuman(id)) continue;
        if (!game.leaders[id].alive) continue;
        const orders = planAi(game, id);
        game = reduce(game, { type: 'SUBMIT_ORDERS', leaderId: id, orders });
      }
      const result = resolveRound(game);
      return {
        ...state,
        screen: 'action',
        game: result.state,
        events: result.events,
        prevPopulations,
      };
    }
    case 'ACTION_DONE': {
      if (!state.game) return state;
      const next: ScreenName = state.game.outcome ? 'winners' : 'roundSummary';
      return { ...state, screen: next };
    }
    case 'NEXT_ROUND': {
      if (!state.game) return state;
      const next: ScreenName = state.game.outcome ? 'winners' : 'planning';
      return { ...state, screen: next };
    }
    case 'BACK_TO_SETUP':
      return initialUiState;
  }
}
```

- [ ] **Step 2: Create `src/ui/App.tsx` with screen switch** (confidence 95 %)

```tsx
import type { Dispatch } from 'react';
import { useReducer } from 'react';
import type { UiAction, UiState } from './store';
import { initialUiState, uiReducer } from './store';
import Setup from './screens/Setup';
import Planning from './screens/Planning';
import AiConferring from './screens/AiConferring';
import Action from './screens/Action';
import RoundSummary from './screens/RoundSummary';
import Winners from './screens/Winners';

export default function App() {
  const [state, dispatch] = useReducer(uiReducer, initialUiState);

  switch (state.screen) {
    case 'setup':         return <Setup state={state} dispatch={dispatch} />;
    case 'planning':      return <Planning state={state} dispatch={dispatch} />;
    case 'aiConferring':  return <AiConferring state={state} dispatch={dispatch} />;
    case 'action':        return <Action state={state} dispatch={dispatch} />;
    case 'roundSummary':  return <RoundSummary state={state} dispatch={dispatch} />;
    case 'winners':       return <Winners state={state} dispatch={dispatch} />;
  }
}

export type ScreenProps = {
  state: UiState;
  dispatch: Dispatch<UiAction>;
};
```

`UiState` and `UiAction` are exported from `store.ts` (Step 1) — explicit typing is cleaner than `ReturnType<typeof uiReducer>` + `Parameters<typeof uiReducer>[1]` and gives clearer error messages when a screen component dispatches an invalid action.

- [ ] **Step 3: Create stub screen components** (confidence 95 %)

Each screen file is a placeholder that renders the screen name and a "next" button to walk the flow E2E. We'll fill them in tasks 4-10.

Create `src/ui/screens/Setup.tsx`:

```tsx
import type { ScreenProps } from '../App';

export default function Setup({ dispatch }: ScreenProps) {
  return (
    <div>
      <h1>Setup (stub)</h1>
      <button
        onClick={() =>
          dispatch({
            type: 'START_GAME',
            opts: {
              cast: ['player1', 'chump', 'carnage'],
              difficulty: 'normal',
              seed: 'stub-seed',
            },
          })
        }
      >
        Start (debug)
      </button>
    </div>
  );
}
```

Create `src/ui/screens/Planning.tsx`:

```tsx
import type { ScreenProps } from '../App';

export default function Planning({ state, dispatch }: ScreenProps) {
  return (
    <div>
      <h1>Planning (stub) — Round {state.game?.round}</h1>
      <button onClick={() => dispatch({ type: 'PLAYER_SUBMIT', orders: [] })}>
        Seal (debug — empty orders)
      </button>
    </div>
  );
}
```

Create `src/ui/screens/AiConferring.tsx`:

```tsx
import { useEffect } from 'react';
import type { ScreenProps } from '../App';

export default function AiConferring({ dispatch }: ScreenProps) {
  useEffect(() => {
    const timer = setTimeout(() => dispatch({ type: 'AI_RESOLVE' }), 1500);
    return () => clearTimeout(timer);
  }, [dispatch]);
  return <div><h1>AI players are filing orders…</h1></div>;
}
```

Create `src/ui/screens/Action.tsx`:

```tsx
import type { ScreenProps } from '../App';

export default function Action({ state, dispatch }: ScreenProps) {
  return (
    <div>
      <h1>Action (stub) — {state.events.length} events</h1>
      <button onClick={() => dispatch({ type: 'ACTION_DONE' })}>
        Continue
      </button>
    </div>
  );
}
```

Create `src/ui/screens/RoundSummary.tsx`:

```tsx
import type { ScreenProps } from '../App';

export default function RoundSummary({ state, dispatch }: ScreenProps) {
  return (
    <div>
      <h1>Round Summary (stub) — Round {state.game?.round}</h1>
      <button onClick={() => dispatch({ type: 'NEXT_ROUND' })}>
        Round {(state.game?.round ?? 0) + 1} → Plan
      </button>
    </div>
  );
}
```

Create `src/ui/screens/Winners.tsx`:

```tsx
import type { ScreenProps } from '../App';

export default function Winners({ state, dispatch }: ScreenProps) {
  return (
    <div>
      <h1>Winners (stub)</h1>
      <p>Outcome: {state.game?.outcome?.type ?? 'none'}</p>
      <button onClick={() => dispatch({ type: 'BACK_TO_SETUP' })}>New Game</button>
    </div>
  );
}
```

- [ ] **Step 4: Run typecheck and dev server to verify the skeleton walks** (confidence 90 %)

```
npm run typecheck
npm run dev
```

Open `http://localhost:5173` in a browser. Verify:
1. Setup stub loads. Click "Start (debug)" → Planning stub appears.
2. Planning stub shows "Round 1". Click "Seal (debug)" → AI Conferring stub appears for 1.5s, then Action stub appears with event count.
3. Click "Continue" → Round Summary stub.
4. Click "Round 2 → Plan" → back to Planning stub showing "Round 2".
5. Repeat until game ends (could take many rounds with all-empty orders — game might never end if no one launches). For dev sanity, you can skip to step 6.

Stop the dev server.

- [ ] **Step 5: Run tests** (confidence 95 %)

```
npm run test:run
```

Expected: all 161 engine tests green. No UI tests yet.

- [ ] **Step 6: Commit**

```
git add src/ui/store.ts src/ui/App.tsx src/ui/screens/Setup.tsx src/ui/screens/Planning.tsx \
        src/ui/screens/AiConferring.tsx src/ui/screens/Action.tsx \
        src/ui/screens/RoundSummary.tsx src/ui/screens/Winners.tsx
git commit -m "ui: add store, App shell, and stub screens for E2E navigation"
```

---

## Task 4: Setup screen (full content)

**Confidence: 92 %.** Form with player profile inputs, AI cast picker (toggle 2-4 of 6), difficulty radio, seed input, validated "New Game" button. Replaces stub from Task 3.

**Files:**
- Modify: `src/ui/screens/Setup.tsx`
- Create: `src/ui/screens/Setup.module.css`

- [ ] **Step 1: Replace Setup.tsx stub with full form** (confidence 92 %)

```tsx
import { useState } from 'react';
import type { ScreenProps } from '../App';
import type { Difficulty, LeaderId } from '../../engine/types';
import { LEADER_PROFILES } from '../../engine/balance';
import { isHuman } from '../../engine/state';
import styles from './Setup.module.css';

const AI_IDS: LeaderId[] = (Object.keys(LEADER_PROFILES) as LeaderId[]).filter(
  (id) => !isHuman(id),
);

function generateSeed(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export default function Setup({ dispatch }: ScreenProps) {
  const [name, setName] = useState('Rufus T. Firefly');
  const [country, setCountry] = useState('🦆 Freedonia');
  const [selectedAi, setSelectedAi] = useState<LeaderId[]>([]);
  const [difficulty, setDifficulty] = useState<Difficulty>('normal');
  const [seedInput, setSeedInput] = useState('');

  const canStart = selectedAi.length >= 2 && selectedAi.length <= 4;

  function toggleAi(id: LeaderId) {
    setSelectedAi((current) =>
      current.includes(id) ? current.filter((x) => x !== id) : [...current, id],
    );
  }

  function start() {
    if (!canStart) return;
    dispatch({
      type: 'START_GAME',
      opts: {
        cast: ['player1', ...selectedAi],
        difficulty,
        seed: seedInput || generateSeed(),
        config: {
          playerProfiles: { player1: { name, country } },
        },
      },
    });
  }

  return (
    <div className={styles.setup}>
      <h1 className={styles.title}>New Game</h1>

      <section className={styles.playerPanel}>
        <label>
          Your name
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Rufus T. Firefly"
          />
        </label>
        <label>
          Country
          <input
            type="text"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            placeholder="🦆 Freedonia"
          />
        </label>
      </section>

      <section className={styles.castPicker}>
        <h2 className={styles.sectionTitle}>AI cast (pick 2–4)</h2>
        {AI_IDS.map((id) => {
          const profile = LEADER_PROFILES[id];
          const selected = selectedAi.includes(id);
          return (
            <button
              key={id}
              type="button"
              className={`${styles.castCard} ${selected ? styles.selected : ''}`}
              onClick={() => toggleAi(id)}
            >
              <span className={styles.castFlag}>{profile.country}</span>
              <span className={styles.castName}>{profile.name}</span>
              <span className={styles.castPop}>{profile.startPop}M</span>
            </button>
          );
        })}
      </section>

      <section className={styles.difficulty}>
        <h2 className={styles.sectionTitle}>Difficulty</h2>
        {(['easy', 'normal', 'hard'] as const).map((d) => (
          <label key={d} className={styles.diffRadio}>
            <input
              type="radio"
              name="difficulty"
              value={d}
              checked={difficulty === d}
              onChange={() => setDifficulty(d)}
            />
            {d.charAt(0).toUpperCase() + d.slice(1)}
          </label>
        ))}
      </section>

      <section className={styles.seed}>
        <label>
          Seed (optional)
          <input
            type="text"
            value={seedInput}
            onChange={(e) => setSeedInput(e.target.value)}
            placeholder="(random)"
          />
        </label>
      </section>

      <button
        type="button"
        disabled={!canStart}
        onClick={start}
        className={styles.newGameButton}
      >
        New Game
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Create `Setup.module.css`** (confidence 92 %)

```css
.setup {
  max-width: 480px;
  margin: 0 auto;
  padding: 24px 16px;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  background: #f4ede2;
  color: #1a1a1a;
  min-height: 100vh;
  box-sizing: border-box;
}

.title {
  text-align: center;
  font-size: 28px;
  font-weight: 700;
  color: #6b1d1d;
  margin: 0 0 24px;
}

.sectionTitle {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: #8a7a6b;
  margin: 16px 0 8px;
  font-weight: 600;
}

.playerPanel label,
.seed label {
  display: block;
  font-size: 13px;
  color: #5a4a3a;
  margin: 8px 0;
}

.playerPanel input[type="text"],
.seed input[type="text"] {
  display: block;
  width: 100%;
  margin-top: 4px;
  padding: 8px 10px;
  font-size: 14px;
  border: 1px solid #d0c8b8;
  border-radius: 6px;
  background: #fff8eb;
  box-sizing: border-box;
}

.castPicker {
  margin: 16px 0;
}

.castCard {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 10px 14px;
  margin: 6px 0;
  background: #fff8eb;
  border: 1px solid #d0c8b8;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  color: inherit;
}

.castCard.selected {
  background: #ffe9c8;
  border-color: #6b1d1d;
  box-shadow: 0 0 0 2px rgba(107, 29, 29, 0.15);
}

.castFlag { font-size: 18px; }
.castName { text-align: left; font-weight: 600; }
.castPop { font-size: 12px; color: #5a4a3a; }

.difficulty {
  margin: 16px 0;
}

.diffRadio {
  display: inline-flex;
  align-items: center;
  margin-right: 16px;
  font-size: 14px;
  gap: 6px;
  cursor: pointer;
}

.newGameButton {
  display: block;
  width: 100%;
  margin-top: 24px;
  padding: 14px;
  font-size: 16px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  background: #6b1d1d;
  color: #fff8eb;
  border: none;
  border-radius: 8px;
  cursor: pointer;
}

.newGameButton:disabled {
  background: #c9b89a;
  cursor: not-allowed;
}
```

- [ ] **Step 3: Run typecheck + dev server, smoke-test in browser** (confidence 92 %)

```
npm run typecheck
npm run dev
```

In browser: fill in name "Tony", country "🇮🇹 Italy", pick 2 AI characters (e.g., Chump + Carnage), normal difficulty, blank seed. Click "New Game". Should transition to Planning stub showing "Round 1". Stop dev server.

- [ ] **Step 4: Run tests** (confidence 95 %)

```
npm run test:run
```

Expected: still 161 engine tests green; no UI tests added.

- [ ] **Step 5: Commit**

```
git add src/ui/screens/Setup.tsx src/ui/screens/Setup.module.css
git commit -m "ui: Setup screen — cast picker + player profile form"
```

---

## Task 5: Planning shared components (`LeaderCard`, `ApBudget`)

**Confidence: 92 %.** Presentational `LeaderCard` (used by Planning + RoundSummary) and computed `ApBudget` (with TDD test).

**Files:**
- Create: `src/ui/components/LeaderCard.tsx`
- Create: `src/ui/components/LeaderCard.module.css`
- Create: `src/ui/components/ApBudget.tsx`
- Create: `src/ui/components/ApBudget.module.css`
- Create: `tests/ui/ApBudget.test.tsx`

- [ ] **Step 1: Write the failing test for `ApBudget`** (confidence 92 %)

`leader.ap` already includes `factoryAp + banked + bonus` per `resolution.ts:127-129` — bonus and factoryAp are not exposed as separate fields on `Leader`. `ApBudget` shows the total available AP plus an informational note about how much carried over as `apBanked`.

```tsx
// tests/ui/ApBudget.test.tsx
import { render, screen } from '@testing-library/react';
import ApBudget from '../../src/ui/components/ApBudget';

describe('<ApBudget>', () => {
  it('renders AP available', () => {
    render(<ApBudget ap={5} apBanked={1} />);
    expect(screen.getByText(/AP available/i)).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('shows banked row when apBanked > 0', () => {
    render(<ApBudget ap={5} apBanked={2} />);
    expect(screen.getByText(/banked/i)).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('omits banked row when apBanked is 0', () => {
    render(<ApBudget ap={3} apBanked={0} />);
    expect(screen.queryByText(/banked/i)).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test, verify it fails** (confidence 95 %)

```
npm run test:run -- tests/ui/ApBudget.test.tsx
```

Expected: `Cannot find module '../../src/ui/components/ApBudget'`.

- [ ] **Step 3: Implement `ApBudget.tsx`** (confidence 95 %)

```tsx
// src/ui/components/ApBudget.tsx
import styles from './ApBudget.module.css';

export interface ApBudgetProps {
  ap: number;       // total AP available this round (engine bakes factoryAp + banked + bonus into this)
  apBanked: number; // informational: how much of `ap` carried over from last round
}

export default function ApBudget({ ap, apBanked }: ApBudgetProps) {
  return (
    <div className={styles.apBudget}>
      <div className={styles.row}>
        <span className={styles.label}>AP available</span>
        <span className={styles.value}>{ap}</span>
      </div>
      {apBanked > 0 && (
        <div className={styles.row}>
          <span className={styles.label}>Of which banked</span>
          <span className={styles.value}>{apBanked}</span>
        </div>
      )}
    </div>
  );
}
```

```css
/* src/ui/components/ApBudget.module.css */
.apBudget {
  background: #fff8eb;
  border: 1px solid #d0c8b8;
  border-radius: 8px;
  padding: 8px 12px;
  margin: 8px 0;
}

.row {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  margin: 2px 0;
}

.label { color: #5a4a3a; }
.value { font-weight: 600; color: #6b1d1d; }

.row.total {
  border-top: 1px dashed #d0c8b8;
  padding-top: 4px;
  margin-top: 4px;
  font-size: 13px;
}
```

- [ ] **Step 4: Run the test, verify it passes** (confidence 95 %)

```
npm run test:run -- tests/ui/ApBudget.test.tsx
```

Expected: 3 tests pass.

- [ ] **Step 5: Implement `LeaderCard.tsx`** (confidence 92 %)

```tsx
// src/ui/components/LeaderCard.tsx
import type { Leader, LeaderId } from '../../engine/types';
import styles from './LeaderCard.module.css';

export interface LeaderCardProps {
  leader: Leader;
  playerHits: number;     // recentAggressionFrom value against player
  playerFav: number;      // favourability *they* have toward me (player wooing them)
  myFav: number;          // favourability *I* have toward them (they wooed me)
  playerGrudge: number;   // their grudge against player
}

export default function LeaderCard({
  leader,
  playerHits,
  playerFav,
  myFav,
  playerGrudge,
}: LeaderCardProps) {
  const arsenalCount =
    leader.stockpile.missiles +
    leader.stockpile.bombers +
    leader.stockpile.warheadsSmall +
    leader.stockpile.warheadsMedium +
    leader.stockpile.warheadsLarge;

  return (
    <div className={styles.card}>
      <div className={styles.head}>
        <span className={styles.flag}>{leader.country.split(' ')[0]}</span>
        <span className={styles.name}>{leader.name}</span>
      </div>
      <div className={styles.stats}>
        Pop {leader.population}M · Factories {leader.factories} · Arsenal {arsenalCount}
      </div>
      <div className={styles.badges}>
        {playerHits > 0 && <span className={`${styles.badge} ${styles.hitYou}`}>hit you</span>}
        {playerFav > 0 && <span className={`${styles.badge} ${styles.wooingYou}`}>you wooed</span>}
        {myFav > 0 && <span className={`${styles.badge} ${styles.youWooed}`}>they wooed you</span>}
        {playerGrudge > 0 && <span className={`${styles.badge} ${styles.grudge}`}>grudge ({playerGrudge})</span>}
      </div>
      {/* mood-line slot — empty in thin P3, P4a fills with flavor */}
      <div className={styles.moodSlot} />
    </div>
  );
}
```

```css
/* src/ui/components/LeaderCard.module.css */
.card {
  background: #fff8eb;
  border: 1px solid #d0c8b8;
  border-radius: 8px;
  padding: 8px;
  cursor: default;
}

.head {
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 600;
  font-size: 13px;
}

.flag { font-size: 16px; }

.stats {
  font-size: 11px;
  color: #5a4a3a;
  margin-top: 3px;
}

.badges {
  display: flex;
  gap: 3px;
  flex-wrap: wrap;
  margin-top: 4px;
}

.badge {
  font-size: 9px;
  padding: 2px 5px;
  border-radius: 3px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  font-weight: 600;
  color: white;
}

.hitYou { background: #8a1a1a; }
.wooingYou { background: #6b8a2b; }
.youWooed { background: #2b6b2b; }
.grudge { background: #5a3a1a; }

.moodSlot {
  min-height: 14px;  /* reserved space for P4a mood lines */
}
```

- [ ] **Step 6: Run typecheck + tests, verify everything passes** (confidence 95 %)

```
npm run typecheck
npm run test:run
```

Expected: 163 engine tests (161 + 2 new validateOrderSequence) + 3 new UI tests = 166 total, all green.

- [ ] **Step 7: Commit**

```
git add src/ui/components/LeaderCard.tsx src/ui/components/LeaderCard.module.css \
        src/ui/components/ApBudget.tsx src/ui/components/ApBudget.module.css \
        tests/ui/ApBudget.test.tsx
git commit -m "ui: add LeaderCard + ApBudget components with budget test"
```

---

## Task 6: Planning screen (full content)

**Confidence: 93 %** (was 88; lifted by `validateOrderSequence` extraction in Task 1 + CSS-transition tap-and-hold pattern). Largest task in the plan — own country panel, leaders table, history strip, order form (with TDD test against the new helper), order queue, tap-and-hold seal button. Mitigations: complete code per sub-component; full-queue validation via the engine-side helper instead of duplicating projection logic; single `setTimeout` + CSS transition for the hold-and-progress affordance.

**Files:**
- Modify: `src/ui/screens/Planning.tsx`
- Create: `src/ui/screens/Planning.module.css`
- Create: `src/ui/components/OrderForm.tsx`
- Create: `src/ui/components/OrderForm.module.css`
- Create: `tests/ui/OrderForm.test.tsx`

- [ ] **Step 1: Write the failing test for `OrderForm`** (confidence 92 %)

```tsx
// tests/ui/OrderForm.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import OrderForm from '../../src/ui/components/OrderForm';
import { initialState } from '../../src/engine/state';
import type { GameState, Order } from '../../src/engine/types';

function gameWithCast(): GameState {
  return initialState({
    cast: ['player1', 'chump', 'carnage'],
    difficulty: 'normal',
    seed: 'order-form-test',
  });
}

describe('<OrderForm>', () => {
  it('blocks Add for a launch without delivery + warhead', () => {
    const state = gameWithCast();
    let added: Order | null = null;
    render(
      <OrderForm
        state={state}
        playerId="player1"
        committedOrders={[]}
        onAdd={(o) => { added = o; }}
      />,
    );
    fireEvent.change(screen.getByLabelText(/order kind/i), { target: { value: 'launch' } });
    fireEvent.change(screen.getByLabelText(/target/i), { target: { value: 'chump' } });
    // delivery + warhead not set — should be invalid
    fireEvent.click(screen.getByRole('button', { name: /add/i }));
    expect(added).toBeNull();
    expect(screen.getByText(/missing.*delivery|missing.*warhead/i)).toBeInTheDocument();
  });

  it('surfaces engine validateOrder reason on AP overrun', () => {
    const state = gameWithCast();
    // player starts with ap=3; queue a build-warhead-large (cost 3); a second cost-3 order overruns
    const prior: Order[] = [{ kind: 'build-warhead', yield: 'large' }];
    let added: Order | null = null;
    render(
      <OrderForm
        state={state}
        playerId="player1"
        committedOrders={prior}
        onAdd={(o) => { added = o; }}
      />,
    );
    fireEvent.change(screen.getByLabelText(/order kind/i), { target: { value: 'build-factory' } });
    fireEvent.click(screen.getByRole('button', { name: /add/i }));
    expect(added).toBeNull();
    expect(screen.getByText(/budget|overrun|ap/i)).toBeInTheDocument();
  });

  it('accepts a valid build-factory order', () => {
    const state = gameWithCast();
    let added: Order | null = null;
    render(
      <OrderForm
        state={state}
        playerId="player1"
        committedOrders={[]}
        onAdd={(o) => { added = o; }}
      />,
    );
    fireEvent.change(screen.getByLabelText(/order kind/i), { target: { value: 'build-factory' } });
    fireEvent.click(screen.getByRole('button', { name: /add/i }));
    expect(added).toEqual({ kind: 'build-factory' });
  });
});
```

- [ ] **Step 2: Run the test, verify it fails** (confidence 95 %)

```
npm run test:run -- tests/ui/OrderForm.test.tsx
```

Expected: `Cannot find module '../../src/ui/components/OrderForm'`.

- [ ] **Step 3: Implement `OrderForm.tsx`** (confidence 93 %)

Uses `validateOrderSequence` (added in Task 1) to validate the full queue including the new order, projecting stockpile consumption from prior launches in the queue — prevents silent-failure on multi-launch sequences where individual `validateOrder` would accept each launch separately but the reducer would reject the sequence.

```tsx
// src/ui/components/OrderForm.tsx
import { useState } from 'react';
import type { DeliveryType, GameState, LeaderId, Order, TargetType, Yield } from '../../engine/types';
import { validateOrderSequence, totalApCost } from '../../engine/orders';
import styles from './OrderForm.module.css';

export interface OrderFormProps {
  state: GameState;
  playerId: LeaderId;
  committedOrders: Order[];
  onAdd: (order: Order) => void;
}

type OrderKind = Order['kind'];

const ORDER_KINDS: { value: OrderKind; label: string }[] = [
  { value: 'build-factory', label: 'Build factory' },
  { value: 'build-missile', label: 'Build missile' },
  { value: 'build-bomber', label: 'Build bomber' },
  { value: 'build-warhead', label: 'Build warhead' },
  { value: 'build-defence', label: 'Build defence' },
  { value: 'launch', label: 'Launch' },
  { value: 'propaganda', label: 'Propaganda' },
  { value: 'woo', label: 'Woo' },
];

export default function OrderForm({ state, playerId, committedOrders, onAdd }: OrderFormProps) {
  const [kind, setKind] = useState<OrderKind>('build-factory');
  const [yieldValue, setYieldValue] = useState<Yield>('small');
  const [defenceType, setDefenceType] = useState<'shield' | 'aa'>('shield');
  const [target, setTarget] = useState<LeaderId | ''>('');
  const [delivery, setDelivery] = useState<DeliveryType>('missile');
  const [targetType, setTargetType] = useState<TargetType>('people');
  const [points, setPoints] = useState(1);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const aliveOthers = state.cast.filter(
    (id) => id !== playerId && state.leaders[id]?.alive,
  );

  function buildOrder(): Order | null {
    switch (kind) {
      case 'build-factory':
      case 'build-missile':
      case 'build-bomber':
        return { kind };
      case 'build-warhead':
        return { kind, yield: yieldValue };
      case 'build-defence':
        return { kind, type: defenceType };
      case 'launch':
        if (!target) return null;
        return { kind, target, delivery, warhead: yieldValue, targetType };
      case 'propaganda':
        if (!target) return null;
        return { kind, target };
      case 'woo':
        if (!target) return null;
        return { kind, target, points };
    }
  }

  function tryAdd() {
    const order = buildOrder();
    if (!order) {
      setErrorMsg('Missing required fields (e.g., target / delivery / warhead).');
      return;
    }
    // Validate the FULL queue (existing + new) with stockpile projection —
    // catches multi-launch cases where individual launches each pass validateOrder
    // but the sequence would over-consume stockpile.
    const fullQueue = [...committedOrders, order];
    const v = validateOrderSequence(state, playerId, fullQueue);
    if (!v.ok) {
      // If the failure is on the NEW order (last index), surface its reason.
      // If it's on a prior order, that shouldn't happen if each was validated
      // when added — surface the indexed reason for debugging.
      const onNewOrder = v.orderIndex === fullQueue.length - 1;
      setErrorMsg(onNewOrder ? v.reason : `Prior order #${v.orderIndex + 1}: ${v.reason}`);
      return;
    }
    // AP check (validateOrderSequence does NOT check AP — that's the reducer's
    // final gate, but we mirror it here so the user gets immediate feedback)
    const totalCost = totalApCost(fullQueue);
    if (totalCost > state.leaders[playerId].ap) {
      setErrorMsg(`Over-budget: ${totalCost} AP > ${state.leaders[playerId].ap} AP available.`);
      return;
    }
    setErrorMsg(null);
    onAdd(order);
  }

  const needsTarget = kind === 'launch' || kind === 'propaganda' || kind === 'woo';
  const needsYield = kind === 'build-warhead' || kind === 'launch';
  const needsDefenceType = kind === 'build-defence';
  const needsDelivery = kind === 'launch';
  const needsTargetType = kind === 'launch';
  const needsPoints = kind === 'woo';

  return (
    <div className={styles.orderForm}>
      <label className={styles.field}>
        <span>Order kind</span>
        <select
          value={kind}
          onChange={(e) => { setKind(e.target.value as OrderKind); setErrorMsg(null); }}
          aria-label="Order kind"
        >
          {ORDER_KINDS.map((k) => (
            <option key={k.value} value={k.value}>{k.label}</option>
          ))}
        </select>
      </label>

      {needsTarget && (
        <label className={styles.field}>
          <span>Target</span>
          <select
            value={target}
            onChange={(e) => setTarget(e.target.value as LeaderId)}
            aria-label="Target"
          >
            <option value="">— pick —</option>
            {aliveOthers.map((id) => (
              <option key={id} value={id}>{state.leaders[id].name}</option>
            ))}
          </select>
        </label>
      )}

      {needsYield && (
        <label className={styles.field}>
          <span>Yield</span>
          <select value={yieldValue} onChange={(e) => setYieldValue(e.target.value as Yield)} aria-label="Yield">
            <option value="small">Small</option>
            <option value="medium">Medium</option>
            <option value="large">Large</option>
          </select>
        </label>
      )}

      {needsDefenceType && (
        <label className={styles.field}>
          <span>Defence type</span>
          <select
            value={defenceType}
            onChange={(e) => setDefenceType(e.target.value as 'shield' | 'aa')}
            aria-label="Defence type"
          >
            <option value="shield">Shield (vs missiles)</option>
            <option value="aa">AA (vs bombers)</option>
          </select>
        </label>
      )}

      {needsDelivery && (
        <label className={styles.field}>
          <span>Delivery</span>
          <select value={delivery} onChange={(e) => setDelivery(e.target.value as DeliveryType)} aria-label="Delivery">
            <option value="missile">Missile</option>
            <option value="bomber">Bomber</option>
          </select>
        </label>
      )}

      {needsTargetType && (
        <label className={styles.field}>
          <span>Target type</span>
          <select value={targetType} onChange={(e) => setTargetType(e.target.value as TargetType)} aria-label="Target type">
            <option value="people">People</option>
            <option value="infra">Infrastructure</option>
          </select>
        </label>
      )}

      {needsPoints && (
        <label className={styles.field}>
          <span>Woo points</span>
          <input
            type="number"
            min={1}
            max={5}
            value={points}
            onChange={(e) => setPoints(parseInt(e.target.value, 10) || 1)}
            aria-label="Woo points"
          />
        </label>
      )}

      <button type="button" onClick={tryAdd} className={styles.addButton}>
        Add
      </button>

      {errorMsg && <div className={styles.error}>{errorMsg}</div>}
    </div>
  );
}
```

```css
/* src/ui/components/OrderForm.module.css */
.orderForm {
  background: #fff8eb;
  border: 1px solid #d0c8b8;
  border-radius: 8px;
  padding: 12px;
  margin: 8px 0;
}

.field {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 6px 0;
  font-size: 13px;
}

.field span { color: #5a4a3a; }

.field select,
.field input {
  font-size: 13px;
  padding: 4px 6px;
  border: 1px solid #d0c8b8;
  border-radius: 4px;
  background: white;
  min-width: 140px;
}

.addButton {
  display: block;
  margin: 8px auto 0;
  padding: 8px 16px;
  background: #6b1d1d;
  color: #fff8eb;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

.error {
  margin-top: 8px;
  padding: 6px 10px;
  background: #ffe9d5;
  border: 1px solid #8a1a1a;
  border-radius: 6px;
  color: #8a1a1a;
  font-size: 12px;
}
```

- [ ] **Step 4: Run OrderForm tests, verify they pass** (confidence 95 %)

```
npm run test:run -- tests/ui/OrderForm.test.tsx
```

Expected: 3 tests pass.

- [ ] **Step 5: Replace `Planning.tsx` stub with full screen** (confidence 93 %)

Tap-and-hold uses a CSS-transition pattern (single `setTimeout` + class toggle + CSS `transition`) rather than per-frame `setInterval` — smoother, fewer React renders, simpler to reason about.

```tsx
// src/ui/screens/Planning.tsx
import { useRef, useState, useCallback } from 'react';
import type { ScreenProps } from '../App';
import type { Order } from '../../engine/types';
import { isHuman } from '../../engine/state';
import { totalApCost } from '../../engine/orders';
import LeaderCard from '../components/LeaderCard';
import ApBudget from '../components/ApBudget';
import OrderForm from '../components/OrderForm';
import styles from './Planning.module.css';

const HOLD_MS = 600;

export default function Planning({ state, dispatch }: ScreenProps) {
  const game = state.game!;
  const player = game.leaders.player1;
  const aiLeaders = game.cast.filter((id) => !isHuman(id) && game.leaders[id].alive);

  const [orders, setOrders] = useState<Order[]>([]);
  const [holding, setHolding] = useState(false);
  const holdTimer = useRef<number | null>(null);

  function addOrder(o: Order) { setOrders((q) => [...q, o]); }
  function removeOrder(i: number) { setOrders((q) => q.filter((_, idx) => idx !== i)); }

  const startHold = useCallback(() => {
    setHolding(true);
    holdTimer.current = window.setTimeout(() => {
      setHolding(false);
      holdTimer.current = null;
      dispatch({ type: 'PLAYER_SUBMIT', orders });
    }, HOLD_MS);
  }, [orders, dispatch]);

  const cancelHold = useCallback(() => {
    setHolding(false);
    if (holdTimer.current !== null) {
      window.clearTimeout(holdTimer.current);
      holdTimer.current = null;
    }
  }, []);

  const apUsed = totalApCost(orders);
  const apTotal = player.ap;  // engine's ap already factors banked + bonus per resolution
  const overBudget = apUsed > apTotal;

  const lastRoundChips = game.orderHistory.length > 0
    ? Object.entries(game.orderHistory[game.orderHistory.length - 1])
        .flatMap(([id, os]) =>
          (os ?? []).filter((o) => o.kind === 'launch' || o.kind === 'propaganda').map((o) => ({ id, o })),
        )
    : [];

  return (
    <div className={styles.planning}>
      <header className={styles.header}>Round {game.round}</header>

      <section className={styles.ownPanel}>
        <h2 className={styles.sectionTitle}>{player.country} {player.name} (you)</h2>
        <div className={styles.statsRow}>
          <span>Pop {player.population}M</span>
          <span>Factories {player.factories}</span>
        </div>
        <div className={styles.statsRow}>
          <span>Missiles {player.stockpile.missiles}</span>
          <span>Bombers {player.stockpile.bombers}</span>
          <span>Shields {player.stockpile.shields}</span>
          <span>AA {player.stockpile.aa}</span>
        </div>
        <ApBudget ap={player.ap} apBanked={player.apBanked} />
      </section>

      <section className={styles.historyStrip}>
        <h2 className={styles.sectionTitle}>Last round</h2>
        {lastRoundChips.length === 0 ? (
          <div className={styles.chip}>—</div>
        ) : (
          lastRoundChips.map((c, i) => (
            <div key={i} className={`${styles.chip} ${styles.attack}`}>
              {game.leaders[c.id as keyof typeof game.leaders]?.country.split(' ')[0]}{' '}
              {c.o.kind === 'launch'
                ? `→ ${game.leaders[c.o.target].country.split(' ')[0]}`
                : c.o.kind === 'propaganda'
                ? `📰 ${game.leaders[c.o.target].country.split(' ')[0]}`
                : ''}
            </div>
          ))
        )}
      </section>

      <section className={styles.tableGrid}>
        {aiLeaders.map((id) => {
          const leader = game.leaders[id];
          return (
            <LeaderCard
              key={id}
              leader={leader}
              playerHits={leader.recentAggressionFrom.player1 ?? 0}
              playerFav={leader.favourability.player1 ?? 0}
              myFav={player.favourability[id] ?? 0}
              playerGrudge={leader.grudge.player1 ?? 0}
            />
          );
        })}
      </section>

      <section className={styles.ordersList}>
        <h2 className={styles.sectionTitle}>Your orders</h2>
        {orders.length === 0 ? (
          <div className={styles.empty}>No orders yet.</div>
        ) : (
          orders.map((o, i) => (
            <div key={i} className={styles.orderRow}>
              <span className={styles.orderLabel}>{formatOrder(o, game)}</span>
              <button type="button" className={styles.removeBtn} onClick={() => removeOrder(i)}>×</button>
            </div>
          ))
        )}
        <div className={`${styles.apSummary} ${overBudget ? styles.over : ''}`}>
          AP used: {apUsed} / {apTotal}
        </div>
      </section>

      <OrderForm state={game} playerId="player1" committedOrders={orders} onAdd={addOrder} />

      <div className={styles.sealWrap}>
        <button
          type="button"
          className={`${styles.sealBtn} ${holding ? styles.holding : ''}`}
          disabled={overBudget}
          onPointerDown={startHold}
          onPointerUp={cancelHold}
          onPointerLeave={cancelHold}
          onPointerCancel={cancelHold}
        >
          <span className={styles.sealLabel}>Hold to Seal Orders</span>
          <span className={styles.sealProgress} />
        </button>
      </div>
    </div>
  );
}

function formatOrder(o: Order, game: import('../../engine/types').GameState): string {
  switch (o.kind) {
    case 'build-factory': return 'Build factory (3 AP)';
    case 'build-missile': return 'Build missile (1 AP)';
    case 'build-bomber': return 'Build bomber (1 AP)';
    case 'build-warhead': return `Build ${o.yield} warhead (${o.yield === 'small' ? 1 : o.yield === 'medium' ? 2 : 3} AP)`;
    case 'build-defence': return `Build ${o.type === 'shield' ? 'shield' : 'AA'} (2 AP)`;
    case 'launch': return `Launch ${o.warhead} at ${game.leaders[o.target].name} (${o.targetType}, 2 AP)`;
    case 'propaganda': return `Propaganda → ${game.leaders[o.target].name} (1 AP)`;
    case 'woo': return `Woo ${game.leaders[o.target].name} × ${o.points} (${o.points} AP)`;
  }
}
```

- [ ] **Step 6: Create `Planning.module.css`** (confidence 92 %)

```css
.planning {
  max-width: 480px;
  margin: 0 auto;
  padding: 12px 14px;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  background: #f4ede2;
  color: #1a1a1a;
  min-height: 100vh;
  box-sizing: border-box;
}

.header {
  text-align: center;
  font-size: 18px;
  font-weight: 700;
  color: #6b1d1d;
  margin-bottom: 12px;
}

.sectionTitle {
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: #8a7a6b;
  margin: 12px 0 6px;
  font-weight: 600;
}

.ownPanel {
  background: #e8d8c0;
  border-radius: 8px;
  padding: 10px 12px;
}

.statsRow {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  font-size: 12px;
  color: #5a4a3a;
  margin: 2px 0;
}

.historyStrip {
  display: flex;
  gap: 6px;
  overflow-x: auto;
  padding-bottom: 4px;
  align-items: center;
}

.chip {
  background: #fff8eb;
  border: 1px solid #d0c8b8;
  border-radius: 6px;
  padding: 4px 7px;
  font-size: 11px;
  white-space: nowrap;
}

.chip.attack { color: #8a1a1a; }

.tableGrid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin: 8px 0;
}

.ordersList {
  background: #fff8eb;
  border-radius: 8px;
  padding: 8px 10px;
  border: 1px solid #d0c8b8;
}

.empty {
  font-size: 12px;
  color: #8a7a6b;
  font-style: italic;
  padding: 4px 0;
}

.orderRow {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 0;
  border-bottom: 1px dashed #d0c8b8;
  font-size: 12px;
}

.orderRow:last-of-type { border-bottom: none; }

.orderLabel { color: #2a2a2a; }

.removeBtn {
  background: none;
  border: none;
  font-size: 18px;
  color: #8a1a1a;
  cursor: pointer;
  padding: 0 4px;
}

.apSummary {
  font-size: 11px;
  color: #5a4a3a;
  margin-top: 6px;
  text-align: right;
}

.apSummary.over { color: #8a1a1a; font-weight: 700; }

.sealWrap {
  margin-top: 16px;
}

.sealBtn {
  position: relative;
  display: block;
  width: 100%;
  padding: 14px;
  background: #6b1d1d;
  color: #fff8eb;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  cursor: pointer;
  overflow: hidden;
}

.sealBtn:disabled { background: #c9b89a; cursor: not-allowed; }

.sealLabel { position: relative; z-index: 1; }

.sealProgress {
  position: absolute;
  inset: 0;
  background: rgba(255, 255, 255, 0.25);
  transform-origin: left center;
  transform: scaleX(0);
  pointer-events: none;
  transition: transform 0ms linear;
}

.sealBtn.holding .sealProgress {
  transform: scaleX(1);
  transition: transform 600ms linear;
}
```

- [ ] **Step 7: Run typecheck + tests, smoke-test in browser** (confidence 93 %)

```
npm run typecheck
npm run test:run
npm run dev
```

In browser: start a game from Setup. On Planning, verify:
1. Own panel shows correct stats + ApBudget.
2. AI leader cards render with country/name/stats + badges (if any).
3. Add a `build-factory` order via OrderForm — appears in queue.
4. Try adding an over-budget order (e.g., several warheads) — surfaces error.
5. Press-and-hold "Seal Orders" — progress fills 600ms then dispatches; transitions to AI Conferring stub then back through Action / Round Summary stubs.

Stop dev server.

- [ ] **Step 8: Commit**

```
git add src/ui/screens/Planning.tsx src/ui/screens/Planning.module.css \
        src/ui/components/OrderForm.tsx src/ui/components/OrderForm.module.css \
        tests/ui/OrderForm.test.tsx
git commit -m "ui: Planning screen with OrderForm, ApBudget, LeaderCards, tap-and-hold Seal"
```

---

## Task 7: AI Conferring beat (full content)

**Confidence: 95 %.** Replaces stub with a styled 1.5s wait.

**Files:**
- Modify: `src/ui/screens/AiConferring.tsx`
- Create: `src/ui/screens/AiConferring.module.css`

- [ ] **Step 1: Replace `AiConferring.tsx` stub** (confidence 95 %)

```tsx
import { useEffect } from 'react';
import type { ScreenProps } from '../App';
import styles from './AiConferring.module.css';

export default function AiConferring({ dispatch }: ScreenProps) {
  useEffect(() => {
    const timer = setTimeout(() => dispatch({ type: 'AI_RESOLVE' }), 1500);
    return () => clearTimeout(timer);
  }, [dispatch]);

  return (
    <div className={styles.beat}>
      <p className={styles.text}>
        AI players are filing orders<span className={styles.dots}><span>.</span><span>.</span><span>.</span></span>
      </p>
    </div>
  );
}
```

- [ ] **Step 2: Create `AiConferring.module.css`** (confidence 95 %)

```css
.beat {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: #f4ede2;
  color: #5a4a3a;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

.text {
  font-size: 18px;
  font-weight: 500;
  font-style: italic;
}

.dots span {
  display: inline-block;
  animation: blink 1s infinite;
}

.dots span:nth-child(2) { animation-delay: 0.2s; }
.dots span:nth-child(3) { animation-delay: 0.4s; }

@keyframes blink {
  0%, 60%, 100% { opacity: 0.2; }
  30% { opacity: 1; }
}
```

- [ ] **Step 3: Run typecheck + tests, smoke-test** (confidence 95 %)

```
npm run typecheck
npm run test:run
npm run dev
```

Verify the styled beat appears for 1.5s with pulsing dots, then transitions to Action stub.

- [ ] **Step 4: Commit**

```
git add src/ui/screens/AiConferring.tsx src/ui/screens/AiConferring.module.css
git commit -m "ui: AI Conferring beat with pulsing dots"
```

---

## Task 8: Action screen (full content)

**Confidence: 95 %** (was 90; lifted by verifying the 14-kind `ResolutionEvent` union exhaustively + replacing per-kind phase mapping with a stateful cursor that correctly places `LeaderEliminated` events under their actual emission phase).

**Files:**
- Modify: `src/ui/screens/Action.tsx`
- Create: `src/ui/screens/Action.module.css`
- Create: `src/ui/components/EventCard.tsx`
- Create: `src/ui/components/EventCard.module.css`
- Create: `src/ui/components/PhaseTracker.tsx`
- Create: `src/ui/components/PhaseTracker.module.css`

- [ ] **Step 1: Create `EventCard.tsx`** (confidence 95 %)

```tsx
// src/ui/components/EventCard.tsx
import type { GameState, ResolutionEvent } from '../../engine/types';
import styles from './EventCard.module.css';

export interface EventCardProps {
  event: ResolutionEvent;
  game: GameState;
}

export default function EventCard({ event, game }: EventCardProps) {
  const { icon, body, className } = formatEventCard(event, game);
  return (
    <div className={`${styles.card} ${className ?? ''}`}>
      <span className={styles.icon}>{icon}</span>
      <span className={styles.body}>{body}</span>
    </div>
  );
}

function flag(game: GameState, id: keyof GameState['leaders']): string {
  return game.leaders[id]?.country.split(' ')[0] ?? id;
}
function name(game: GameState, id: keyof GameState['leaders']): string {
  return game.leaders[id]?.name ?? id;
}

export function formatEventCard(
  event: ResolutionEvent,
  game: GameState,
): { icon: string; body: string; className?: string } {
  switch (event.kind) {
    case 'OrdersSealed':
      return { icon: '', body: '' };  // not rendered
    case 'FactoryBuilt':
      return { icon: '⚙', body: `${flag(game, event.by)} ${name(game, event.by)} builds 1 factory` };
    case 'DeliveryBuilt':
      return {
        icon: event.type === 'missile' ? '🚀' : '🛩',
        body: `${flag(game, event.by)} ${name(game, event.by)} builds 1 ${event.type}`,
      };
    case 'WarheadBuilt':
      return { icon: '☢', body: `${flag(game, event.by)} ${name(game, event.by)} builds 1 ${event.yield} warhead` };
    case 'DefenceBuilt':
      return {
        icon: '🛡',
        body: `${flag(game, event.by)} ${name(game, event.by)} builds 1 ${event.type === 'shield' ? 'shield' : 'AA'}`,
      };
    case 'PropagandaTransfer':
      return {
        icon: '📰',
        body: `${flag(game, event.from)} → ${flag(game, event.to)} · ${event.amount}M transferred`,
      };
    case 'WooApplied':
      return {
        icon: '🤝',
        body: `${flag(game, event.from)} woos ${flag(game, event.to)} · ${event.points} points`,
      };
    case 'MissileLaunched':
      return {
        icon: event.delivery === 'missile' ? '🚀' : '🛩',
        body: `${flag(game, event.from)} → ${flag(game, event.to)} (${event.warhead} · ${event.targetType})`,
      };
    case 'MissileIntercepted':
      return {
        icon: '🛡✗',
        body: `${name(game, event.from)}'s ${event.delivery} to ${name(game, event.to)} intercepted`,
      };
    case 'ImpactPeople':
      return {
        icon: '☠️',
        body: `${flag(game, event.target)} ${name(game, event.target)} ─ ${event.deaths}M deaths (from ${flag(game, event.from)})`,
      };
    case 'ImpactInfrastructure':
      return {
        icon: '🏭✗',
        body: `${flag(game, event.target)} ${name(game, event.target)} ─ ${event.factoriesDestroyed} factories destroyed`,
      };
    case 'LeaderEliminated':
      return {
        icon: '⬛',
        body: `${name(game, event.id)} eliminated`,
        className: styles.obituary,
      };
    case 'FinalRetaliationTriggered':
      return {
        icon: '💥',
        body: `${flag(game, event.by)} launches Final Retaliation at ${event.targets.map((t) => flag(game, t)).join(', ')}`,
      };
    case 'OutcomeReached':
      return { icon: '', body: '' };  // not rendered
  }
}
```

```css
/* src/ui/components/EventCard.module.css */
.card {
  display: flex;
  align-items: center;
  gap: 10px;
  background: #fff8eb;
  border: 1px solid #d0c8b8;
  border-radius: 6px;
  padding: 8px 12px;
  margin: 4px 0;
  font-size: 13px;
}

.icon {
  font-size: 18px;
  min-width: 24px;
  text-align: center;
}

.body { flex: 1; }

.obituary {
  background: #2a2a2a;
  color: #d8d0c0;
  border-color: #000;
}
```

- [ ] **Step 2: Create `PhaseTracker.tsx`** (confidence 95 %)

```tsx
// src/ui/components/PhaseTracker.tsx
import styles from './PhaseTracker.module.css';

const PHASES = ['Defences', 'Builds', 'Propaganda', 'Wooing', 'Launches', 'Final Retal.'];

export default function PhaseTracker() {
  return (
    <div className={styles.tracker}>
      {PHASES.map((p) => (
        <span key={p} className={styles.phase}>{p}</span>
      ))}
    </div>
  );
}
```

```css
/* src/ui/components/PhaseTracker.module.css */
.tracker {
  display: flex;
  justify-content: space-between;
  background: #e8d8c0;
  padding: 8px 12px;
  border-radius: 8px;
  margin-bottom: 12px;
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #5a4a3a;
}

.phase {
  flex: 1;
  text-align: center;
  font-weight: 600;
}
```

- [ ] **Step 3: Replace `Action.tsx` stub with full screen** (confidence 95 %)

Phase grouping uses a **stateful cursor** that walks events in chronological order (the engine emits them in strict phase order per `resolution.ts`), assigning each event to the most recently-entered phase. This correctly places `LeaderEliminated` events under LAUNCHES *or* FINAL_RETALIATIONS depending on what killed the leader (the previous approach hard-mapped LeaderEliminated to LAUNCHES, which was wrong for FR-cascade kills).

```tsx
// src/ui/screens/Action.tsx
import type { ScreenProps } from '../App';
import type { ResolutionEvent } from '../../engine/types';
import EventCard from '../components/EventCard';
import PhaseTracker from '../components/PhaseTracker';
import styles from './Action.module.css';

type Phase = 'DEFENCES' | 'BUILDS' | 'PROPAGANDA' | 'WOOING' | 'LAUNCHES' | 'FINAL_RETALIATIONS';

const PHASE_ORDER: Phase[] = ['DEFENCES', 'BUILDS', 'PROPAGANDA', 'WOOING', 'LAUNCHES', 'FINAL_RETALIATIONS'];
const PHASE_LABELS: Record<Phase, string> = {
  DEFENCES: 'Defences',
  BUILDS: 'Builds',
  PROPAGANDA: 'Propaganda',
  WOOING: 'Wooing',
  LAUNCHES: 'Launches',
  FINAL_RETALIATIONS: 'Final Retaliations',
};

/** Returns the phase a "phase-advancing" event belongs to, or null for
 *  events that should NOT advance the cursor (LeaderEliminated, OrdersSealed,
 *  OutcomeReached — those inherit the current phase or aren't rendered). */
function phaseAdvanceFor(kind: ResolutionEvent['kind']): Phase | null {
  switch (kind) {
    case 'DefenceBuilt': return 'DEFENCES';
    case 'FactoryBuilt':
    case 'DeliveryBuilt':
    case 'WarheadBuilt': return 'BUILDS';
    case 'PropagandaTransfer': return 'PROPAGANDA';
    case 'WooApplied': return 'WOOING';
    case 'MissileLaunched':
    case 'MissileIntercepted':
    case 'ImpactPeople':
    case 'ImpactInfrastructure': return 'LAUNCHES';
    case 'FinalRetaliationTriggered': return 'FINAL_RETALIATIONS';
    // Non-phase-advancing kinds:
    case 'LeaderEliminated':
    case 'OrdersSealed':
    case 'OutcomeReached': return null;
  }
}

function isRenderable(kind: ResolutionEvent['kind']): boolean {
  return kind !== 'OrdersSealed' && kind !== 'OutcomeReached';
}

export default function Action({ state, dispatch }: ScreenProps) {
  const game = state.game!;
  const byPhase: Record<Phase, ResolutionEvent[]> = {
    DEFENCES: [], BUILDS: [], PROPAGANDA: [], WOOING: [], LAUNCHES: [], FINAL_RETALIATIONS: [],
  };
  let cursor: Phase = 'DEFENCES';  // first phase the engine emits into
  for (const e of state.events) {
    const advance = phaseAdvanceFor(e.kind);
    if (advance !== null) cursor = advance;
    if (isRenderable(e.kind)) byPhase[cursor].push(e);
  }

  const continueLabel = game.outcome ? 'View Final Verdict' : 'Continue → Round Summary';

  return (
    <div className={styles.action}>
      <header className={styles.header}>Round {game.round - 1} — events</header>
      <PhaseTracker />

      {PHASE_ORDER.map((phase) => {
        const events = byPhase[phase];
        if (events.length === 0) return null;
        return (
          <section key={phase} className={styles.phaseSection}>
            <h2 className={styles.phaseHeader}>{PHASE_LABELS[phase]}</h2>
            {events.map((e, i) => <EventCard key={i} event={e} game={game} />)}
          </section>
        );
      })}

      <button
        type="button"
        className={styles.continueBtn}
        onClick={() => dispatch({ type: 'ACTION_DONE' })}
      >
        {continueLabel}
      </button>
    </div>
  );
}
```

- [ ] **Step 4: Create `Action.module.css`** (confidence 92 %)

```css
.action {
  max-width: 480px;
  margin: 0 auto;
  padding: 16px;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  background: #f4ede2;
  color: #1a1a1a;
  min-height: 100vh;
  box-sizing: border-box;
}

.header {
  text-align: center;
  font-size: 16px;
  font-weight: 700;
  color: #6b1d1d;
  margin-bottom: 12px;
}

.phaseSection {
  margin: 12px 0;
}

.phaseHeader {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: #8a7a6b;
  margin: 0 0 6px;
  font-weight: 600;
}

.continueBtn {
  display: block;
  width: 100%;
  margin-top: 24px;
  padding: 14px;
  font-size: 14px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  background: #6b1d1d;
  color: #fff8eb;
  border: none;
  border-radius: 8px;
  cursor: pointer;
}
```

- [ ] **Step 5: Run typecheck + tests, smoke-test** (confidence 92 %)

```
npm run typecheck
npm run test:run
npm run dev
```

In browser: play through Setup → Planning → seal real orders → AI Conferring → Action. Verify events appear in phase-grouped sections with appropriate icons/text. Click Continue → Round Summary stub.

- [ ] **Step 6: Commit**

```
git add src/ui/screens/Action.tsx src/ui/screens/Action.module.css \
        src/ui/components/EventCard.tsx src/ui/components/EventCard.module.css \
        src/ui/components/PhaseTracker.tsx src/ui/components/PhaseTracker.module.css
git commit -m "ui: Action screen with phase-grouped event cards"
```

---

## Task 9: Round Summary screen (full content)

**Confidence: 93 %** (was 90; lifted by fixing `pickSubhead` to look up leader names via `leaders[id].name` rather than rendering raw LeaderId in the subhead text).

**Files:**
- Modify: `src/ui/screens/RoundSummary.tsx`
- Create: `src/ui/screens/RoundSummary.module.css`

- [ ] **Step 1: Replace `RoundSummary.tsx` stub** (confidence 93 %)

```tsx
// src/ui/screens/RoundSummary.tsx
import type { ScreenProps } from '../App';
import type { GameState, LeaderId, ResolutionEvent } from '../../engine/types';
import styles from './RoundSummary.module.css';

function pickHeadline(
  events: ResolutionEvent[],
  leaders: GameState['leaders'],
  prevPopulations: Partial<Record<LeaderId, number>>,
  round: number,
  outcome: GameState['outcome'],
): string {
  if (outcome?.type === 'apocalypse') return 'THE END.';

  const elims = events.filter((e): e is Extract<ResolutionEvent, { kind: 'LeaderEliminated' }> =>
    e.kind === 'LeaderEliminated',
  );
  if (elims.length > 0) return `${leaders[elims[0].id].name.toUpperCase()} ELIMINATED`;

  let worstId: LeaderId | null = null;
  let worstDelta = 0;
  for (const idStr of Object.keys(prevPopulations)) {
    const id = idStr as LeaderId;
    const prev = prevPopulations[id]!;
    const delta = leaders[id].population - prev;
    if (delta < worstDelta) { worstDelta = delta; worstId = id; }
  }
  if (worstId !== null && worstDelta <= -10) return `${leaders[worstId].name.toUpperCase()} CLOBBERED`;
  if (worstId !== null && worstDelta <= -3) return `${leaders[worstId].name.toUpperCase()} STRUCK`;
  return `ROUND ${round - 1} SETTLES`;
}

function pickSubhead(events: ResolutionEvent[], leaders: GameState['leaders']): string {
  const impacts = events.filter((e): e is Extract<ResolutionEvent, { kind: 'ImpactPeople' }> =>
    e.kind === 'ImpactPeople',
  );
  if (impacts.length === 0) return 'No casualties this round.';
  const biggest = impacts.reduce((a, b) => (a.deaths > b.deaths ? a : b));
  return `${leaders[biggest.from].name} hits ${leaders[biggest.target].name} for ${biggest.deaths}M.`;
}

export default function RoundSummary({ state, dispatch }: ScreenProps) {
  const game = state.game!;
  const headline = pickHeadline(state.events, game.leaders, state.prevPopulations, game.round, game.outcome);
  const subhead = pickSubhead(state.events, game.leaders);

  const thisRoundLost = Object.values(state.prevPopulations).reduce<number>((acc, prev, idx) => {
    const id = game.cast[idx];
    if (!id || prev === undefined) return acc;
    return acc + Math.max(0, prev - game.leaders[id].population);
  }, 0);
  const warTotalLost = Object.entries(state.initialPopulations).reduce<number>((acc, [idStr, init]) => {
    const id = idStr as LeaderId;
    if (init === undefined) return acc;
    return acc + Math.max(0, init - game.leaders[id].population);
  }, 0);
  const survivors = game.cast.filter((id) => game.leaders[id].alive).length;

  const continueLabel = game.outcome ? 'Final Verdict' : `Round ${game.round} → Plan`;

  return (
    <div className={styles.summary}>
      <div className={styles.masthead}>─── THE NUKE TIMES ───  R {game.round - 1}</div>
      <h1 className={`${styles.headline} ${game.outcome?.type === 'apocalypse' ? styles.theEnd : ''}`}>
        {headline}
      </h1>
      <p className={styles.subhead}>{subhead}</p>

      <div className={styles.casualtyStrip}>
        <div className={styles.casualtyPlaceholder}>[ mushroom-cloud SVG — P4a ]</div>
        <div className={styles.casualtyRow}>This round: {thisRoundLost}M lost</div>
        <div className={styles.casualtyRow}>War total: {warTotalLost}M lost</div>
        <div className={styles.casualtyRow}>Survivors: {survivors} of {game.cast.length}</div>
      </div>

      <h2 className={styles.sectionTitle}>World Reactions</h2>
      <div className={styles.reactionsList}>
        {game.cast.map((id) => {
          const leader = game.leaders[id];
          const prev = state.prevPopulations[id] ?? leader.population;
          const delta = leader.population - prev;
          const sign = delta > 0 ? '△' : delta < 0 ? '▽' : '─';
          const eliminated = !leader.alive;
          return (
            <div key={id} className={`${styles.reactionRow} ${eliminated ? styles.obituary : ''}`}>
              <span className={styles.flag}>{leader.country.split(' ')[0]}</span>
              <span className={styles.name}>
                {eliminated && 'OBITUARY: '}{leader.name}
              </span>
              <span className={styles.delta}>{sign} {Math.abs(delta)}</span>
              <span className={styles.state}>{eliminated ? 'eliminated' : 'alive'}</span>
            </div>
          );
        })}
      </div>

      <button
        type="button"
        className={styles.continueBtn}
        onClick={() => dispatch({ type: 'NEXT_ROUND' })}
      >
        {continueLabel}
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Create `RoundSummary.module.css`** (confidence 92 %)

```css
.summary {
  max-width: 480px;
  margin: 0 auto;
  padding: 16px;
  font-family: Georgia, "Times New Roman", serif;
  background: #efe5d2;
  color: #1a1a1a;
  min-height: 100vh;
  box-sizing: border-box;
}

.masthead {
  text-align: center;
  font-size: 11px;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: #5a4a3a;
  border-top: 2px solid #1a1a1a;
  border-bottom: 2px solid #1a1a1a;
  padding: 4px 0;
  margin-bottom: 12px;
  font-family: Georgia, serif;
}

.headline {
  font-size: 32px;
  font-weight: 900;
  text-align: center;
  margin: 16px 0 6px;
  letter-spacing: -0.02em;
}

.headline.theEnd {
  font-size: 48px;
  letter-spacing: 0;
}

.subhead {
  font-size: 14px;
  font-style: italic;
  text-align: center;
  color: #5a4a3a;
  margin: 0 0 16px;
}

.casualtyStrip {
  background: #fff8eb;
  border: 1px solid #d0c8b8;
  border-radius: 8px;
  padding: 12px;
  margin: 12px 0;
}

.casualtyPlaceholder {
  text-align: center;
  color: #8a7a6b;
  font-style: italic;
  font-size: 11px;
  margin-bottom: 8px;
  padding: 16px 8px;
  background: #e8d8c0;
  border-radius: 6px;
}

.casualtyRow {
  font-family: ui-monospace, monospace;
  font-size: 13px;
  margin: 2px 0;
}

.sectionTitle {
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: #5a4a3a;
  margin: 16px 0 8px;
  font-weight: 700;
  font-family: Georgia, serif;
}

.reactionsList {
  background: #fff8eb;
  border: 1px solid #d0c8b8;
  border-radius: 8px;
  padding: 8px 10px;
}

.reactionRow {
  display: grid;
  grid-template-columns: 28px 1fr auto auto;
  align-items: center;
  gap: 8px;
  padding: 6px 0;
  border-bottom: 1px dashed #d0c8b8;
  font-size: 13px;
}

.reactionRow:last-of-type { border-bottom: none; }

.reactionRow.obituary {
  color: #5a5a5a;
  border: 1px solid #1a1a1a;
  padding: 6px 8px;
  border-radius: 4px;
  margin: 4px 0;
}

.flag { font-size: 16px; }
.name { font-weight: 600; }
.delta { font-family: ui-monospace, monospace; font-size: 12px; color: #6b1d1d; }
.state { font-size: 11px; color: #5a4a3a; text-transform: uppercase; letter-spacing: 0.05em; }

.continueBtn {
  display: block;
  width: 100%;
  margin-top: 24px;
  padding: 16px;
  font-size: 16px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  background: #8a1a1a;
  color: #fff8eb;
  border: none;
  border-radius: 8px;
  cursor: pointer;
}
```

- [ ] **Step 3: Run typecheck + tests, smoke-test** (confidence 92 %)

```
npm run typecheck
npm run test:run
npm run dev
```

In browser: play through to a Round Summary. Verify: headline reflects events, per-leader pop deltas displayed, OBITUARY rows render for eliminated leaders, continue button advances.

- [ ] **Step 4: Commit**

```
git add src/ui/screens/RoundSummary.tsx src/ui/screens/RoundSummary.module.css
git commit -m "ui: Round Summary screen with rule-based headline + casualty strip"
```

---

## Task 10: Winners screen (full content)

**Confidence: 92 %.** Win headline by outcome type, algorithmic sub-line, death-toll table, new-game buttons.

**Files:**
- Modify: `src/ui/screens/Winners.tsx`
- Create: `src/ui/screens/Winners.module.css`

- [ ] **Step 1: Replace `Winners.tsx` stub** (confidence 92 %)

```tsx
// src/ui/screens/Winners.tsx
import type { ScreenProps } from '../App';
import type { GameState, LeaderId, WinOutcome } from '../../engine/types';
import styles from './Winners.module.css';

function pickHeadline(outcome: WinOutcome, leaders: GameState['leaders']): string {
  switch (outcome.type) {
    case 'apocalypse': return 'WINNER: NOBODY';
    case 'survivor':
    case 'pyrrhic':
    case 'dominance':
      return `${leaders[outcome.winner].name.toUpperCase()} WINS`;
  }
}

function pickSubLine(
  outcome: WinOutcome,
  leaders: GameState['leaders'],
  initialPopulations: Partial<Record<LeaderId, number>>,
  cast: LeaderId[],
): string {
  switch (outcome.type) {
    case 'apocalypse':
      return 'Total casualties: 100% of starting population. The board is dark.';
    case 'survivor': {
      const winner = leaders[outcome.winner];
      return `${winner.name} rules over ${winner.population}M. The rest are ash.`;
    }
    case 'pyrrhic': {
      const winner = leaders[outcome.winner];
      const initial = initialPopulations[outcome.winner] ?? winner.population;
      return `${winner.name} had ${initial}M when the bombs flew. They have 0M now. So does everyone else. Briefly, they had more.`;
    }
    case 'dominance': {
      const winner = leaders[outcome.winner];
      const others = cast
        .filter((id) => id !== outcome.winner)
        .map((id) => leaders[id].population)
        .sort((a, b) => b - a);
      const secondPop = others[0] ?? 0;
      return `${winner.name} rules over ${winner.population}M. The next-largest has ${secondPop}M.`;
    }
  }
}

export default function Winners({ state, dispatch }: ScreenProps) {
  const game = state.game!;
  const outcome = game.outcome!;
  const headline = pickHeadline(outcome, game.leaders);
  const subLine = pickSubLine(outcome, game.leaders, state.initialPopulations, game.cast);

  const tollRows = game.cast.map((id) => {
    const leader = game.leaders[id];
    const start = state.initialPopulations[id] ?? leader.population;
    const end = leader.population;
    const pctLost = start === 0 ? 0 : ((start - end) / start) * 100;
    return { id, name: leader.name, country: leader.country, start, end, pctLost };
  });
  tollRows.sort((a, b) => a.pctLost - b.pctLost);

  function newGame() { dispatch({ type: 'BACK_TO_SETUP' }); }
  function sameCast() {
    if (!state.lastNewGameOpts) return newGame();
    dispatch({
      type: 'START_GAME',
      opts: { ...state.lastNewGameOpts, seed: Date.now().toString(36) + Math.random().toString(36).slice(2, 8) },
    });
  }

  return (
    <div className={styles.winners}>
      <h1 className={styles.headline}>{headline}</h1>
      <p className={styles.subline}>"{subLine}"</p>

      <h2 className={styles.sectionTitle}>Death Toll</h2>
      <table className={styles.tollTable}>
        <thead>
          <tr>
            <th>Leader</th>
            <th>Start</th>
            <th>End</th>
            <th>% lost</th>
          </tr>
        </thead>
        <tbody>
          {tollRows.map((row) => (
            <tr key={row.id} className={row.id === 'player1' ? styles.playerRow : ''}>
              <td>{row.country.split(' ')[0]} {row.name}{row.id === 'player1' ? ' (you)' : ''}</td>
              <td className={styles.numCell}>{row.start}M</td>
              <td className={styles.numCell}>{row.end}M</td>
              <td className={styles.numCell}>{row.pctLost.toFixed(1)}%</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className={styles.buttonRow}>
        <button type="button" className={styles.button} onClick={newGame}>New Game</button>
        <button type="button" className={`${styles.button} ${styles.secondary}`} onClick={sameCast}>
          Same Cast, Again
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create `Winners.module.css`** (confidence 95 %)

```css
.winners {
  max-width: 520px;
  margin: 0 auto;
  padding: 24px 16px;
  font-family: Georgia, serif;
  background: #1a1a1a;
  color: #f4ede2;
  min-height: 100vh;
  box-sizing: border-box;
  text-align: center;
}

.headline {
  font-size: 36px;
  font-weight: 900;
  letter-spacing: -0.02em;
  margin: 16px 0;
  color: #ffe9c8;
}

.subline {
  font-size: 16px;
  font-style: italic;
  color: #c9b89a;
  margin: 8px 0 32px;
}

.sectionTitle {
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.15em;
  color: #c9b89a;
  margin: 24px 0 8px;
  font-weight: 700;
}

.tollTable {
  width: 100%;
  border-collapse: collapse;
  background: #2a2a2a;
  border-radius: 6px;
  overflow: hidden;
  margin: 8px 0 24px;
}

.tollTable th,
.tollTable td {
  padding: 8px 12px;
  font-size: 13px;
  text-align: left;
  border-bottom: 1px solid #3a3a3a;
}

.tollTable th {
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-size: 11px;
  color: #c9b89a;
  background: #1a1a1a;
}

.tollTable .numCell {
  font-family: ui-monospace, monospace;
  text-align: right;
}

.playerRow { background: #3a2a1a; }

.buttonRow {
  display: flex;
  gap: 8px;
  margin-top: 24px;
}

.button {
  flex: 1;
  padding: 14px;
  font-size: 14px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  background: #8a1a1a;
  color: #fff8eb;
  border: none;
  border-radius: 8px;
  cursor: pointer;
}

.button.secondary {
  background: transparent;
  border: 1px solid #c9b89a;
  color: #c9b89a;
}
```

- [ ] **Step 3: Run typecheck + tests + full E2E smoke** (confidence 92 %)

```
npm run typecheck
npm run test:run
npm run dev
```

In browser: play a complete game to a Winners screen. Verify headline, sub-line, death-toll table (sorted by % lost ASC, player row highlighted). Click "Same Cast, Again" → game restarts with same cast + new seed. Click "New Game" → returns to Setup.

- [ ] **Step 4: Commit**

```
git add src/ui/screens/Winners.tsx src/ui/screens/Winners.module.css
git commit -m "ui: Winners screen with death-toll table and Same Cast Again"
```

---

## Task 11: README — Phase 3 status note

**Confidence: 99 %.** Documentation only.

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Add Phase 3 status section** (confidence 99 %)

Insert this section in `README.md` after the existing `## Phase 2.5 status` section:

```markdown
## Phase 3 status

Phase 3 ships the thin React UI shell — the first playable build in a browser. Six functional screens (Setup, Planning, AI Conferring, Action, Round Summary, Winners) navigable via a screen state machine, mockup-matched CSS via CSS Modules, end-to-end round loop.

What's in:

- `src/ui/` — React 18 + Vite 5 + TypeScript scaffold with CSS Modules per screen
- Setup screen with player profile inputs (default Rufus T. Firefly / 🦆 Freedonia, editable), AI cast picker (2-4 of 6), difficulty radio, optional seed
- Planning screen with own country panel, history strip, leaders table, order form (validated via engine `validateOrder`), order queue, tap-and-hold (600ms) Seal Orders
- AI Conferring beat (1.5s cosmetic delay + pulsing dots)
- Action screen with phase-grouped event cards (no animations, no world map)
- Round Summary with rule-based headline picker, casualty strip, world-reactions list (OBITUARY rows for eliminated leaders)
- Winners with headline by outcome type, sub-line, death-toll table sorted by % lost, New Game / Same Cast Again
- Minimum UI tests (Vitest + jsdom + React Testing Library): OrderForm validation, ApBudget computation
- Engine refactor: `GameState.lastOrders` (P2.5) → per-round `GameState.orderHistory` (positions P4a's replay scrubber + advanced AI lookahead as logic-only changes)

What's NOT in this phase (deferred to P4a / P4b):

- Hotseat Handoff screen (multi-human game flow) — P4a
- Persistence (localStorage save/load + Resume entry point + action log) — P4a
- Replay timeline scrubber UI on Winners screen — P4a (engine data already supports it via orderHistory)
- Animations (Framer Motion, 1.8s/event Action pacing, Fast Resolve toggle, missile arcs, damage badges) — P4a
- Flavor banks (per-leader speech-bubble lines, mood lines on leader cards, tabloid quotes, OBITUARY last-words) — P4a
- Disparage cameo mechanic — P4a
- Masthead rotation pool — P4a
- Audio (`play(name)` wrapper, sfx + ambient music) — P4a
- SVG art (leader portraits, world map, Freedonia flag, mushroom-cloud illustration, ruined-iconography) — P4a
- PWA manifest + service worker — P4a
- Soft-warn validation in Planning — P4a
- AI scoring-weight balance pass + AI-duel balance assertions — P4b
- Approach B / C upgrades to Hard-mode lookahead — P4b
```

- [ ] **Step 2: Commit**

```
git add README.md
git commit -m "docs: Phase 3 status note in README"
```

---

## Done

After Task 11 commits cleanly:

- `npm run typecheck` clean.
- `npm run test:run` green — 161 engine tests (reshaped for `orderHistory`) + 2 new engine tests (validateOrderSequence) + 6 new UI tests = 169 total.
- `npm run dev` launches Vite; browser loads the Setup screen.
- Full E2E flow works: Setup → Planning → seal orders → AI Conferring → Action → Round Summary → (Round N+1 → Plan, or Final Verdict → Winners) → New Game / Same Cast.
- Engine refactor (Task 1) is non-breaking — call sites work; lookahead reads from `orderHistory` instead of `lastOrders`.
- Phase 4a can build on top: replay scrubber consumes `orderHistory` directly; flavor banks wire into existing CSS slots (`.moodSlot` in LeaderCard, sub-line in RoundSummary, `[ mushroom-cloud SVG ]` placeholder, etc.); animations layer over the existing card-per-event structure.
