# Phase 1: Playable Slice — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Date:** 2026-05-09
**Spec:** `docs/superpowers/specs/2026-05-08-nuke-design.md`
**Branch:** `feat/p1-playable-slice` (off `main`)

**Goal:** Stand up a Vite + React + TypeScript project and ship a *minimum playable browser game*: a 2-leader (Chump vs Carnage) round-based duel where the human player queues orders against a stub-random AI, resolves rounds deterministically, and reaches a survivor or pyrrhic outcome. UI is intentionally placeholder; mockup fidelity arrives in Phase 3.

**Architecture:** Pure-TS engine in `src/engine/` with zero React dependencies. Engine surface: `reduce(state, action)`, `planAi(state, leaderId)`, plus `initialState(opts)` factory. Engine is fully deterministic given a seeded RNG that lives inside `GameState.rngState`. No `Math.random()`, no `Date.now()` inside the engine. UI shell is a single `PlayingScreen` component wrapping `useReducer(reduce, ...)`.

**Tech Stack:** Vite 5, React 18, TypeScript 5.4, Vitest 1, @testing-library/react 14, jsdom 24, Node 20+.

## Phase plan (this is Phase 1 of 4)

- **Phase 1 (this plan):** Playable vertical slice — scaffold + engine subset + minimal placeholder UI.
- Phase 2: Full mechanics (bombers, defences, propaganda, wooing, infra targeting, 6-leader cast, hotseat, all win conditions, Final Retaliation, asymmetric AI, difficulty levels). Still placeholder UI.
- Phase 3: Production UI — replace placeholder with the seven mockup-faithful screens (Setup, Hotseat Handoff, Planning, AI Conferring, Action world-map, Round Summary tabloid, Winners).
- Phase 4: Polish — flavour bank wiring, Disparage cameo, masthead rotation, audio, save/replay scrubber, PWA, animations.

## Phase 1 scope — IN

- Vite + React + TS project scaffold; `npm run dev`, `npm run build`, `npm test`, `npm run typecheck` all pass.
- Engine type surface (full — defined once, even where Phase 1 doesn't exercise it).
- Balance constants (full set — easier to define once than partially).
- Seeded RNG with state inside `GameState`.
- Initial state factory (2-leader cast for P1; written so additional leaders just work).
- Order AP cost + validation (covers all order kinds; only a subset is exposed in the P1 UI).
- Reducer handling `NEW_GAME`, `SUBMIT_ORDERS`, `RESOLVE_ROUND`, `LOAD_STATE`.
- Combat: intercept-probability curve + damage application (no defences in P1 means intercepts never fire, but the function is unit-tested).
- Build phase (factories, missiles, warheads).
- Launch phase (people-targeted only in P1).
- Win conditions: `survivor`, `pyrrhic`, `apocalypse` (no dominance in P1; no Final Retaliation in P1).
- Stub random AI (`planAi`) — picks valid orders within budget; no personality.
- Determinism property test (same seed + same orders → identical events).
- Single placeholder screen with order queue, stockpile readout, resolution log, game-over banner.
- Vitest engine unit tests + React Testing Library play-through test.
- Manual browser smoke test of one full game.

## Phase 1 scope — OUT (defer to later phases)

- Bombers, anti-aircraft defences, missile shields.
- Infrastructure-targeted launches.
- Propaganda, wooing, favourability tracking.
- Final Retaliation cascade.
- Dominance win condition.
- Hotseat handoff.
- Asymmetric AI personalities, difficulty levels.
- Leaders other than Chump and Carnage in the UI (engine supports the full cast).
- Flavour bank, Disparage cameo, masthead rotation.
- Audio, persistence, replay scrubber, PWA, world-map animations.

---

## File map

### Project root (Task 1)

- Create: `package.json`
- Create: `tsconfig.json`
- Create: `tsconfig.node.json`
- Create: `vite.config.ts`
- Create: `index.html`
- Create: `README.md`
- Create: `tests/setup.ts`

### Engine (Tasks 2–14)

- Create: `src/engine/types.ts` — full type surface (`GameState`, `Leader`, `Order`, `Action`, `ResolutionEvent`, etc.)
- Create: `src/engine/balance.ts` — leader profiles + tunable constants
- Create: `src/engine/rng.ts` — seeded RNG (mulberry32, pure functional)
- Create: `src/engine/state.ts` — `initialState(opts)` factory
- Create: `src/engine/orders.ts` — `apCostOf(order)`, `validateOrder(state, leaderId, order)`
- Create: `src/engine/reducer.ts` — `(state, action) => state`
- Create: `src/engine/combat.ts` — `interceptProbability`, `applyDamage`
- Create: `src/engine/builds.ts` — build-phase event reducer
- Create: `src/engine/launches.ts` — launch-phase event reducer
- Create: `src/engine/winConditions.ts` — `checkOutcome(state)`
- Create: `src/engine/resolution.ts` — round orchestrator
- Create: `src/engine/ai/index.ts` — stub random `planAi`
- Create: `src/engine/index.ts` — public barrel

### Tests (interleaved with engine tasks)

- Create: `tests/engine/rng.test.ts`
- Create: `tests/engine/balance.test.ts`
- Create: `tests/engine/state.test.ts`
- Create: `tests/engine/orders.test.ts`
- Create: `tests/engine/reducer.test.ts`
- Create: `tests/engine/combat.test.ts`
- Create: `tests/engine/builds.test.ts`
- Create: `tests/engine/launches.test.ts`
- Create: `tests/engine/winConditions.test.ts`
- Create: `tests/engine/resolution.test.ts`
- Create: `tests/engine/ai-stub.test.ts`
- Create: `tests/engine/determinism.test.ts`

### UI (Tasks 15–18)

- Create: `src/main.tsx`
- Create: `src/App.tsx`
- Create: `src/vite-env.d.ts`
- Create: `src/ui/screens/PlayingScreen.tsx`
- Create: `src/ui/format.ts` — `describeOrder`, `describeEvent`
- Create: `tests/ui/PlayingScreen.test.tsx`

### Final (Task 19–20)

- Modify: `README.md` — quickstart + commands.

---

## Conventions

- **Commit cadence:** one logical commit per task. Test + impl land together.
- **TDD:** every code task starts with a failing test, then minimum code to pass.
- **Imports:** use relative paths (e.g., `'../balance'`) inside `src/engine/`. Tests import from `'../../src/engine/...'` so the engine surface stays inspectable.
- **Strings:** parody names only (`'chump'`, `'khameneverhere'`, `'starmless'`, `'carnage'`, `'mileigh-hem'`, `'netanyahoo'`) per spec §2.
- **Window vs Bash:** the project is on Windows. Run npm commands via PowerShell or Bash; both work. The plan's commands assume a POSIX-ish shell — adjust for `cmd.exe` if running directly there.
- **No `Math.random()` in engine.** RNG state is part of `GameState`; pure functions consume and return state advances.

---

## Task 1: Project scaffold

**Files:**
- Create: `package.json`, `tsconfig.json`, `tsconfig.node.json`, `vite.config.ts`, `index.html`, `tests/setup.ts`, `README.md`

- [ ] **Step 1.1: Write `package.json`**

```json
{
  "name": "nuke",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "test": "vitest",
    "test:run": "vitest run",
    "typecheck": "tsc -b --noEmit"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.4.2",
    "@testing-library/react": "^14.2.2",
    "@testing-library/user-event": "^14.5.2",
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.0",
    "jsdom": "^24.0.0",
    "typescript": "^5.4.5",
    "vite": "^5.2.10",
    "vitest": "^1.5.0"
  }
}
```

- [ ] **Step 1.2: Write `tsconfig.json`**

```json
{
  "files": [],
  "references": [
    { "path": "./tsconfig.app.json" },
    { "path": "./tsconfig.node.json" }
  ]
}
```

- [ ] **Step 1.3: Write `tsconfig.app.json`**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "types": ["vitest/globals", "@testing-library/jest-dom"]
  },
  "include": ["src", "tests"]
}
```

- [ ] **Step 1.4: Write `tsconfig.node.json`**

```json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "noEmit": true
  },
  "include": ["vite.config.ts"]
}
```

- [ ] **Step 1.5: Write `vite.config.ts`**

```ts
/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
  },
});
```

- [ ] **Step 1.6: Write `index.html`**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>nuke</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 1.7: Write `tests/setup.ts`**

```ts
import '@testing-library/jest-dom/vitest';
```

- [ ] **Step 1.8: Write `README.md`**

```markdown
# nuke

Browser-based parody nuclear-war game. Phase 1 ships a 2-leader playable slice (Chump vs Carnage) with a placeholder UI. See `docs/superpowers/specs/2026-05-08-nuke-design.md` for the full design spec.

## Quickstart

    npm install
    npm run dev          # start Vite at http://localhost:5173
    npm test             # vitest watch
    npm run test:run     # vitest single run
    npm run typecheck    # tsc --noEmit
    npm run build        # production build to dist/
```

- [ ] **Step 1.9: Install dependencies**

Run: `npm install`
Expected: install completes; `node_modules/` populated; no high-severity audit issues blocking install.

- [ ] **Step 1.10: Verify typecheck passes (no source files yet — should be a no-op pass)**

Run: `npm run typecheck`
Expected: exit code 0 (the empty references compile cleanly).

- [ ] **Step 1.11: Verify Vitest is wired**

Run: `npm run test:run`
Expected: exit code 0 with "No test files found". (Vitest treats zero tests as a non-fatal pass.)

- [ ] **Step 1.12: Commit**

```bash
git checkout -b feat/p1-playable-slice
git add package.json package-lock.json tsconfig*.json vite.config.ts index.html tests/setup.ts README.md
git commit -m "scaffold: vite + react + ts + vitest project skeleton"
```

---

## Task 2: Engine types

**Files:**
- Create: `src/engine/types.ts`

This single file defines every type the rest of the engine consumes. It's deliberately defined in full once so later tasks don't churn it.

- [ ] **Step 2.1: Write `src/engine/types.ts`**

```ts
export type LeaderId =
  | 'chump'
  | 'khameneverhere'
  | 'starmless'
  | 'carnage'
  | 'mileigh-hem'
  | 'netanyahoo';

export type Difficulty = 'easy' | 'normal' | 'hard';

export type Yield = 'small' | 'medium' | 'large';

export type DeliveryType = 'missile' | 'bomber';

export type DefenceType = 'shield' | 'aa';

export type TargetType = 'people' | 'infra';

export type WinType = 'survivor' | 'pyrrhic' | 'apocalypse' | 'dominance';

export interface Stockpile {
  missiles: number;
  bombers: number;
  warheadsSmall: number;
  warheadsMedium: number;
  warheadsLarge: number;
  shields: number;
  aa: number;
}

export interface Leader {
  id: LeaderId;
  name: string;
  country: string;
  population: number;
  factories: number;
  stockpile: Stockpile;
  ap: number;
  apBanked: number;
  alive: boolean;
  favourability: Partial<Record<LeaderId, number>>;
  grudge: Partial<Record<LeaderId, number>>;
  recentAggressionFrom: Partial<Record<LeaderId, number>>;
  bonusRule?: string;
}

export type Order =
  | { kind: 'build-factory' }
  | { kind: 'build-missile' }
  | { kind: 'build-bomber' }
  | { kind: 'build-warhead'; yield: Yield }
  | { kind: 'build-defence'; type: DefenceType }
  | {
      kind: 'launch';
      target: LeaderId;
      delivery: DeliveryType;
      warhead: Yield;
      targetType: TargetType;
    }
  | { kind: 'propaganda'; target: LeaderId }
  | { kind: 'woo'; target: LeaderId; points: number };

export interface SealedOrders {
  leaderId: LeaderId;
  orders: Order[];
  apSpent: number;
}

export interface GameConfig {
  startPopOverride?: Partial<Record<LeaderId, number>>;
  dominanceThreshold: number;
  fastPlay: boolean;
}

export interface WinOutcome {
  type: WinType;
  winner?: LeaderId;
}

export interface GameState {
  round: number;
  cast: LeaderId[];
  difficulty: Difficulty;
  seed: string;
  rngState: number;
  leaders: Record<LeaderId, Leader>;
  pendingOrders: Partial<Record<LeaderId, SealedOrders>>;
  log: ResolutionEvent[];
  outcome: WinOutcome | null;
  config: GameConfig;
}

export type Action =
  | {
      type: 'NEW_GAME';
      cast: LeaderId[];
      difficulty: Difficulty;
      seed: string;
      config?: Partial<GameConfig>;
    }
  | { type: 'SUBMIT_ORDERS'; leaderId: LeaderId; orders: Order[] }
  | { type: 'RESOLVE_ROUND' }
  | { type: 'LOAD_STATE'; state: GameState };

export type ResolutionEvent =
  | { kind: 'OrdersSealed'; leaderId: LeaderId; orderCount: number }
  | { kind: 'FactoryBuilt'; by: LeaderId }
  | { kind: 'DeliveryBuilt'; by: LeaderId; type: DeliveryType }
  | { kind: 'WarheadBuilt'; by: LeaderId; yield: Yield }
  | { kind: 'DefenceBuilt'; by: LeaderId; type: DefenceType }
  | {
      kind: 'MissileLaunched';
      from: LeaderId;
      to: LeaderId;
      delivery: DeliveryType;
      warhead: Yield;
      targetType: TargetType;
    }
  | {
      kind: 'MissileIntercepted';
      from: LeaderId;
      to: LeaderId;
      delivery: DeliveryType;
      warhead: Yield;
    }
  | {
      kind: 'ImpactPeople';
      from: LeaderId;
      target: LeaderId;
      warhead: Yield;
      deaths: number;
    }
  | {
      kind: 'ImpactInfrastructure';
      from: LeaderId;
      target: LeaderId;
      warhead: Yield;
      factoriesDestroyed: number;
    }
  | { kind: 'PropagandaTransfer'; from: LeaderId; to: LeaderId; amount: number }
  | { kind: 'WooApplied'; from: LeaderId; to: LeaderId; points: number }
  | { kind: 'LeaderEliminated'; id: LeaderId }
  | { kind: 'OutcomeReached'; outcome: WinOutcome };
```

- [ ] **Step 2.2: Verify typecheck**

Run: `npm run typecheck`
Expected: exit code 0.

- [ ] **Step 2.3: Commit**

```bash
git add src/engine/types.ts
git commit -m "engine: define core type surface (state, orders, events)"
```

---

## Task 3: Balance constants

**Files:**
- Create: `src/engine/balance.ts`
- Create: `tests/engine/balance.test.ts`

- [ ] **Step 3.1: Write the failing test**

`tests/engine/balance.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
  LEADER_PROFILES,
  ACTION_COSTS,
  YIELD_DAMAGE,
  FACTORY_AP_RATE,
  AP_BANK_CAP,
  PROPAGANDA_TRANSFER_M,
  DOMINANCE_THRESHOLD_DEFAULT,
} from '../../src/engine/balance';

describe('balance', () => {
  it('defines a profile for every leader id', () => {
    expect(LEADER_PROFILES.chump.startPop).toBe(33);
    expect(LEADER_PROFILES.chump.startFactories).toBe(10);
    expect(LEADER_PROFILES.chump.startAp).toBe(5);
    expect(LEADER_PROFILES.netanyahoo.startPop).toBe(18);
    expect(LEADER_PROFILES['mileigh-hem'].startFactories).toBe(4);
  });

  it('matches spec AP costs', () => {
    expect(ACTION_COSTS.buildFactory).toBe(3);
    expect(ACTION_COSTS.launch).toBe(2);
    expect(ACTION_COSTS.buildWarheadLarge).toBe(3);
    expect(ACTION_COSTS.propaganda).toBe(1);
    expect(ACTION_COSTS.wooPerPoint).toBe(1);
  });

  it('matches spec yield damage profiles', () => {
    expect(YIELD_DAMAGE.small.peopleDeaths).toBe(2);
    expect(YIELD_DAMAGE.small.factoriesDestroyed).toBe(1);
    expect(YIELD_DAMAGE.medium.peopleDeaths).toBe(6);
    expect(YIELD_DAMAGE.large.peopleDeaths).toBe(15);
    expect(YIELD_DAMAGE.large.factoriesDestroyed).toBe(3);
  });

  it('exposes economy constants', () => {
    expect(FACTORY_AP_RATE).toBe(0.5);
    expect(AP_BANK_CAP).toBe(2);
    expect(PROPAGANDA_TRANSFER_M).toBeGreaterThan(0);
    expect(DOMINANCE_THRESHOLD_DEFAULT).toBe(2);
  });
});
```

- [ ] **Step 3.2: Run test, expect FAIL**

Run: `npm run test:run -- tests/engine/balance.test.ts`
Expected: FAIL — module `src/engine/balance.ts` not found.

- [ ] **Step 3.3: Write `src/engine/balance.ts`**

```ts
import type { LeaderId, Yield } from './types';

export const LEADER_PROFILES: Record<
  LeaderId,
  {
    name: string;
    country: string;
    startPop: number;
    startFactories: number;
    startAp: number;
    bonusRule?: string;
  }
> = {
  chump: {
    name: 'Chump',
    country: '🇺🇸 US',
    startPop: 33,
    startFactories: 10,
    startAp: 5,
    bonusRule: 'chump-defence-waste',
  },
  khameneverhere: {
    name: 'Khameneverhere',
    country: '🇮🇷 Iran',
    startPop: 28,
    startFactories: 6,
    startAp: 3,
  },
  starmless: {
    name: 'Starmless',
    country: '🇬🇧 UK',
    startPop: 25,
    startFactories: 6,
    startAp: 3,
  },
  carnage: {
    name: 'Carnage',
    country: '🇨🇦 Canada',
    startPop: 25,
    startFactories: 6,
    startAp: 3,
  },
  'mileigh-hem': {
    name: 'Mileigh-hem',
    country: '🇦🇷 Argentina',
    startPop: 22,
    startFactories: 4,
    startAp: 2,
    bonusRule: 'mileigh-aggression-bonus',
  },
  netanyahoo: {
    name: 'Netanyahoo',
    country: '🇮🇱 Israel',
    startPop: 18,
    startFactories: 6,
    startAp: 3,
    bonusRule: 'netanyahoo-launch-bonus',
  },
};

export const ACTION_COSTS = {
  buildFactory: 3,
  buildMissile: 1,
  buildBomber: 1,
  buildWarheadSmall: 1,
  buildWarheadMedium: 2,
  buildWarheadLarge: 3,
  buildDefence: 2,
  launch: 2,
  propaganda: 1,
  wooPerPoint: 1,
} as const;

export const YIELD_DAMAGE: Record<
  Yield,
  { peopleDeaths: number; factoriesDestroyed: number }
> = {
  small: { peopleDeaths: 2, factoriesDestroyed: 1 },
  medium: { peopleDeaths: 6, factoriesDestroyed: 2 },
  large: { peopleDeaths: 15, factoriesDestroyed: 3 },
};

export const FACTORY_AP_RATE = 0.5;
export const AP_BANK_CAP = 2;
export const PROPAGANDA_TRANSFER_M = 1; // tunable; see spec §18 open question
export const WOO_FAVOURABILITY_DECAY = 1;
export const DOMINANCE_THRESHOLD_DEFAULT = 2;
```

- [ ] **Step 3.4: Run test, expect PASS**

Run: `npm run test:run -- tests/engine/balance.test.ts`
Expected: PASS, 4 tests.

- [ ] **Step 3.5: Commit**

```bash
git add src/engine/balance.ts tests/engine/balance.test.ts
git commit -m "engine: add balance constants and leader profiles"
```

---

## Task 4: Seeded RNG

**Files:**
- Create: `src/engine/rng.ts`
- Create: `tests/engine/rng.test.ts`

The RNG is pure-functional: each call takes a state number and returns the next value plus the next state. State lives in `GameState.rngState`. This makes saves trustworthy and resolution replayable.

- [ ] **Step 4.1: Write the failing test**

`tests/engine/rng.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { nextRandom, seedFromString, mix32 } from '../../src/engine/rng';

describe('rng', () => {
  it('produces deterministic sequence from a fixed seed', () => {
    const a1 = nextRandom(1);
    const a2 = nextRandom(a1.state);
    const a3 = nextRandom(a2.state);
    const b1 = nextRandom(1);
    const b2 = nextRandom(b1.state);
    const b3 = nextRandom(b2.state);
    expect([a1.value, a2.value, a3.value]).toEqual([b1.value, b2.value, b3.value]);
  });

  it('produces different sequences from different seeds', () => {
    const a = nextRandom(1).value;
    const b = nextRandom(2).value;
    expect(a).not.toBe(b);
  });

  it('returns values in [0, 1)', () => {
    let s = 42;
    for (let i = 0; i < 100; i++) {
      const r = nextRandom(s);
      expect(r.value).toBeGreaterThanOrEqual(0);
      expect(r.value).toBeLessThan(1);
      s = r.state;
    }
  });

  it('seedFromString is deterministic', () => {
    expect(seedFromString('hello')).toBe(seedFromString('hello'));
    expect(seedFromString('hello')).not.toBe(seedFromString('world'));
  });

  it('mix32 is deterministic and order-sensitive', () => {
    expect(mix32(1, 2, 3)).toBe(mix32(1, 2, 3));
    expect(mix32(1, 2, 3)).not.toBe(mix32(3, 2, 1));
  });
});
```

- [ ] **Step 4.2: Run test, expect FAIL**

Run: `npm run test:run -- tests/engine/rng.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 4.3: Write `src/engine/rng.ts`**

```ts
// Mulberry32 — small, fast, well-distributed PRNG. Pure-functional API:
// caller threads `state` through; no mutable closures so saves capture rng position cleanly.

export interface RngStep {
  value: number; // [0, 1)
  state: number; // next state
}

export function nextRandom(state: number): RngStep {
  let t = (state + 0x6d2b79f5) >>> 0;
  let r = t;
  r = Math.imul(r ^ (r >>> 15), r | 1);
  r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
  const value = ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  return { value, state: t };
}

export function nextInt(state: number, maxExclusive: number): { value: number; state: number } {
  const r = nextRandom(state);
  return { value: Math.floor(r.value * maxExclusive), state: r.state };
}

// FNV-1a 32-bit string hash → seed
export function seedFromString(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// Order-sensitive integer mixer (xxhash-style avalanche). Used to derive
// per-leader sub-seeds without advancing the main game RNG.
export function mix32(a: number, b: number, c: number): number {
  let h = (a ^ Math.imul(b, 0x9e3779b1) ^ Math.imul(c, 0x85ebca6b)) >>> 0;
  h ^= h >>> 16;
  h = Math.imul(h, 0x7feb352d);
  h ^= h >>> 15;
  h = Math.imul(h, 0x846ca68b);
  h ^= h >>> 16;
  return h >>> 0;
}
```

- [ ] **Step 4.4: Run test, expect PASS**

Run: `npm run test:run -- tests/engine/rng.test.ts`
Expected: PASS, 5 tests.

- [ ] **Step 4.5: Commit**

```bash
git add src/engine/rng.ts tests/engine/rng.test.ts
git commit -m "engine: add seeded mulberry32 rng with pure-functional state"
```

---

## Task 5: Initial state factory

**Files:**
- Create: `src/engine/state.ts`
- Create: `tests/engine/state.test.ts`

- [ ] **Step 5.1: Write the failing test**

`tests/engine/state.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { initialState } from '../../src/engine/state';

describe('initialState', () => {
  it('seeds Chump and Carnage with their spec values', () => {
    const s = initialState({
      cast: ['chump', 'carnage'],
      difficulty: 'normal',
      seed: 'p1-demo',
    });
    expect(s.round).toBe(1);
    expect(s.outcome).toBeNull();
    expect(s.cast).toEqual(['chump', 'carnage']);
    expect(s.leaders.chump.population).toBe(33);
    expect(s.leaders.chump.factories).toBe(10);
    expect(s.leaders.chump.ap).toBe(5);
    expect(s.leaders.chump.alive).toBe(true);
    expect(s.leaders.carnage.population).toBe(25);
    expect(s.leaders.carnage.factories).toBe(6);
    expect(s.leaders.carnage.ap).toBe(3);
  });

  it('seeds an empty stockpile and zeroed relations', () => {
    const s = initialState({ cast: ['chump', 'carnage'], difficulty: 'normal', seed: 'x' });
    expect(s.leaders.chump.stockpile.missiles).toBe(0);
    expect(s.leaders.chump.stockpile.warheadsSmall).toBe(0);
    expect(s.leaders.chump.favourability).toEqual({});
    expect(s.leaders.chump.grudge).toEqual({});
  });

  it('only includes leaders in the cast', () => {
    const s = initialState({ cast: ['chump', 'carnage'], difficulty: 'normal', seed: 'x' });
    expect(Object.keys(s.leaders)).toEqual(['chump', 'carnage']);
  });

  it('derives rngState deterministically from seed', () => {
    const a = initialState({ cast: ['chump', 'carnage'], difficulty: 'normal', seed: 'abc' });
    const b = initialState({ cast: ['chump', 'carnage'], difficulty: 'normal', seed: 'abc' });
    const c = initialState({ cast: ['chump', 'carnage'], difficulty: 'normal', seed: 'xyz' });
    expect(a.rngState).toBe(b.rngState);
    expect(a.rngState).not.toBe(c.rngState);
  });

  it('defaults config dominanceThreshold to 2 and fastPlay to false', () => {
    const s = initialState({ cast: ['chump', 'carnage'], difficulty: 'normal', seed: 'x' });
    expect(s.config.dominanceThreshold).toBe(2);
    expect(s.config.fastPlay).toBe(false);
  });
});
```

- [ ] **Step 5.2: Run test, expect FAIL**

Run: `npm run test:run -- tests/engine/state.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 5.3: Write `src/engine/state.ts`**

```ts
import type { Difficulty, GameConfig, GameState, Leader, LeaderId } from './types';
import { LEADER_PROFILES, DOMINANCE_THRESHOLD_DEFAULT } from './balance';
import { seedFromString } from './rng';

export interface NewGameOpts {
  cast: LeaderId[];
  difficulty: Difficulty;
  seed: string;
  config?: Partial<GameConfig>;
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

- [ ] **Step 5.4: Run test, expect PASS**

Run: `npm run test:run -- tests/engine/state.test.ts`
Expected: PASS, 5 tests.

- [ ] **Step 5.5: Commit**

```bash
git add src/engine/state.ts tests/engine/state.test.ts
git commit -m "engine: add initialState factory with leader profile seeding"
```

---

## Task 6: Order AP cost + validation

**Files:**
- Create: `src/engine/orders.ts`
- Create: `tests/engine/orders.test.ts`

- [ ] **Step 6.1: Write the failing test**

`tests/engine/orders.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { apCostOf, totalApCost, validateOrder } from '../../src/engine/orders';
import { initialState } from '../../src/engine/state';
import type { Order } from '../../src/engine/types';

describe('apCostOf', () => {
  it('matches spec costs', () => {
    expect(apCostOf({ kind: 'build-factory' })).toBe(3);
    expect(apCostOf({ kind: 'build-missile' })).toBe(1);
    expect(apCostOf({ kind: 'build-warhead', yield: 'small' })).toBe(1);
    expect(apCostOf({ kind: 'build-warhead', yield: 'medium' })).toBe(2);
    expect(apCostOf({ kind: 'build-warhead', yield: 'large' })).toBe(3);
    expect(apCostOf({ kind: 'build-defence', type: 'shield' })).toBe(2);
    expect(apCostOf({
      kind: 'launch',
      target: 'carnage',
      delivery: 'missile',
      warhead: 'small',
      targetType: 'people',
    })).toBe(2);
    expect(apCostOf({ kind: 'propaganda', target: 'carnage' })).toBe(1);
    expect(apCostOf({ kind: 'woo', target: 'carnage', points: 3 })).toBe(3);
  });
});

describe('totalApCost', () => {
  it('sums costs across an order list', () => {
    const orders: Order[] = [
      { kind: 'build-factory' },
      { kind: 'build-missile' },
      { kind: 'build-warhead', yield: 'small' },
    ];
    expect(totalApCost(orders)).toBe(5);
  });
});

describe('validateOrder', () => {
  const baseState = initialState({
    cast: ['chump', 'carnage'],
    difficulty: 'normal',
    seed: 'x',
  });

  it('rejects launches with no missile in stockpile', () => {
    const r = validateOrder(baseState, 'chump', {
      kind: 'launch',
      target: 'carnage',
      delivery: 'missile',
      warhead: 'small',
      targetType: 'people',
    });
    expect(r.ok).toBe(false);
  });

  it('rejects launches with no warhead in stockpile', () => {
    const s = structuredClone(baseState);
    s.leaders.chump.stockpile.missiles = 1;
    const r = validateOrder(s, 'chump', {
      kind: 'launch',
      target: 'carnage',
      delivery: 'missile',
      warhead: 'small',
      targetType: 'people',
    });
    expect(r.ok).toBe(false);
  });

  it('accepts a launch when delivery and warhead are stocked', () => {
    const s = structuredClone(baseState);
    s.leaders.chump.stockpile.missiles = 1;
    s.leaders.chump.stockpile.warheadsSmall = 1;
    const r = validateOrder(s, 'chump', {
      kind: 'launch',
      target: 'carnage',
      delivery: 'missile',
      warhead: 'small',
      targetType: 'people',
    });
    expect(r.ok).toBe(true);
  });

  it('rejects a launch at self', () => {
    const s = structuredClone(baseState);
    s.leaders.chump.stockpile.missiles = 1;
    s.leaders.chump.stockpile.warheadsSmall = 1;
    const r = validateOrder(s, 'chump', {
      kind: 'launch',
      target: 'chump',
      delivery: 'missile',
      warhead: 'small',
      targetType: 'people',
    });
    expect(r.ok).toBe(false);
  });

  it('accepts a build-factory order unconditionally', () => {
    const r = validateOrder(baseState, 'chump', { kind: 'build-factory' });
    expect(r.ok).toBe(true);
  });
});
```

- [ ] **Step 6.2: Run test, expect FAIL**

Run: `npm run test:run -- tests/engine/orders.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 6.3: Write `src/engine/orders.ts`**

```ts
import type { GameState, LeaderId, Order, Yield } from './types';
import { ACTION_COSTS } from './balance';

export type ValidationResult = { ok: true } | { ok: false; reason: string };

export function apCostOf(o: Order): number {
  switch (o.kind) {
    case 'build-factory':
      return ACTION_COSTS.buildFactory;
    case 'build-missile':
      return ACTION_COSTS.buildMissile;
    case 'build-bomber':
      return ACTION_COSTS.buildBomber;
    case 'build-warhead':
      return warheadCost(o.yield);
    case 'build-defence':
      return ACTION_COSTS.buildDefence;
    case 'launch':
      return ACTION_COSTS.launch;
    case 'propaganda':
      return ACTION_COSTS.propaganda;
    case 'woo':
      return ACTION_COSTS.wooPerPoint * o.points;
  }
}

function warheadCost(y: Yield): number {
  switch (y) {
    case 'small':
      return ACTION_COSTS.buildWarheadSmall;
    case 'medium':
      return ACTION_COSTS.buildWarheadMedium;
    case 'large':
      return ACTION_COSTS.buildWarheadLarge;
  }
}

export function totalApCost(orders: Order[]): number {
  return orders.reduce((sum, o) => sum + apCostOf(o), 0);
}

export function validateOrder(
  state: GameState,
  leaderId: LeaderId,
  o: Order,
): ValidationResult {
  const me = state.leaders[leaderId];
  if (!me) return { ok: false, reason: 'unknown-leader' };
  if (!me.alive) return { ok: false, reason: 'dead-leader' };

  switch (o.kind) {
    case 'build-factory':
    case 'build-missile':
    case 'build-bomber':
    case 'build-warhead':
    case 'build-defence':
      return { ok: true };

    case 'launch': {
      if (o.target === leaderId) return { ok: false, reason: 'self-target' };
      const target = state.leaders[o.target];
      if (!target || !target.alive) return { ok: false, reason: 'invalid-target' };
      if (o.delivery === 'missile' && me.stockpile.missiles < 1) {
        return { ok: false, reason: 'no-missile' };
      }
      if (o.delivery === 'bomber' && me.stockpile.bombers < 1) {
        return { ok: false, reason: 'no-bomber' };
      }
      const have = warheadStock(me.stockpile, o.warhead);
      if (have < 1) return { ok: false, reason: 'no-warhead' };
      return { ok: true };
    }

    case 'propaganda': {
      if (o.target === leaderId) return { ok: false, reason: 'self-target' };
      const t = state.leaders[o.target];
      if (!t || !t.alive) return { ok: false, reason: 'invalid-target' };
      return { ok: true };
    }

    case 'woo': {
      if (o.target === leaderId) return { ok: false, reason: 'self-target' };
      if (o.points < 1) return { ok: false, reason: 'non-positive-points' };
      const t = state.leaders[o.target];
      if (!t || !t.alive) return { ok: false, reason: 'invalid-target' };
      return { ok: true };
    }
  }
}

function warheadStock(s: GameState['leaders'][LeaderId]['stockpile'], y: Yield): number {
  switch (y) {
    case 'small':
      return s.warheadsSmall;
    case 'medium':
      return s.warheadsMedium;
    case 'large':
      return s.warheadsLarge;
  }
}
```

- [ ] **Step 6.4: Run test, expect PASS**

Run: `npm run test:run -- tests/engine/orders.test.ts`
Expected: PASS, all tests.

- [ ] **Step 6.5: Commit**

```bash
git add src/engine/orders.ts tests/engine/orders.test.ts
git commit -m "engine: add order ap-cost + per-order validation"
```

---

## Task 7: Combat — intercept curve + damage

**Files:**
- Create: `src/engine/combat.ts`
- Create: `tests/engine/combat.test.ts`

- [ ] **Step 7.1: Write the failing test**

`tests/engine/combat.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { interceptProbability, peopleDeaths, factoriesDestroyed } from '../../src/engine/combat';

describe('interceptProbability', () => {
  it('returns 1.0 for the Nth incoming when N <= S', () => {
    expect(interceptProbability(1, 3)).toBe(1.0);
    expect(interceptProbability(3, 3)).toBe(1.0);
  });

  it('degrades on overflow (75 / 50 / 25 / 0)', () => {
    expect(interceptProbability(4, 3)).toBe(0.75);
    expect(interceptProbability(5, 3)).toBe(0.5);
    expect(interceptProbability(6, 3)).toBe(0.25);
    expect(interceptProbability(7, 3)).toBe(0);
    expect(interceptProbability(99, 3)).toBe(0);
  });

  it('handles zero defenders correctly', () => {
    expect(interceptProbability(1, 0)).toBe(0.75);
    expect(interceptProbability(2, 0)).toBe(0.5);
    expect(interceptProbability(3, 0)).toBe(0.25);
    expect(interceptProbability(4, 0)).toBe(0);
  });
});

describe('peopleDeaths', () => {
  it('caps deaths at current population', () => {
    expect(peopleDeaths('large', 5)).toBe(5);
    expect(peopleDeaths('large', 100)).toBe(15);
    expect(peopleDeaths('small', 1)).toBe(1);
  });
});

describe('factoriesDestroyed', () => {
  it('caps destruction at current factory count', () => {
    expect(factoriesDestroyed('large', 1)).toBe(1);
    expect(factoriesDestroyed('large', 10)).toBe(3);
    expect(factoriesDestroyed('small', 0)).toBe(0);
  });
});
```

- [ ] **Step 7.2: Run test, expect FAIL**

Run: `npm run test:run -- tests/engine/combat.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 7.3: Write `src/engine/combat.ts`**

```ts
import type { Yield } from './types';
import { YIELD_DAMAGE } from './balance';

// Spec §6: probability the Nth incoming attack of a given type is intercepted,
// given S defenders of that type. N <= S → 1.0; then 0.75 / 0.5 / 0.25 / 0 as
// overflow grows.
export function interceptProbability(nthIncoming: number, defenders: number): number {
  if (nthIncoming <= defenders) return 1.0;
  const overflow = nthIncoming - defenders;
  if (overflow === 1) return 0.75;
  if (overflow === 2) return 0.5;
  if (overflow === 3) return 0.25;
  return 0;
}

export function peopleDeaths(y: Yield, currentPop: number): number {
  return Math.min(YIELD_DAMAGE[y].peopleDeaths, currentPop);
}

export function factoriesDestroyed(y: Yield, currentFactories: number): number {
  return Math.min(YIELD_DAMAGE[y].factoriesDestroyed, currentFactories);
}
```

- [ ] **Step 7.4: Run test, expect PASS**

Run: `npm run test:run -- tests/engine/combat.test.ts`
Expected: PASS, all tests.

- [ ] **Step 7.5: Commit**

```bash
git add src/engine/combat.ts tests/engine/combat.test.ts
git commit -m "engine: add intercept curve and damage cap helpers"
```

---

## Task 8: Build phase

**Files:**
- Create: `src/engine/builds.ts`
- Create: `tests/engine/builds.test.ts`

This module applies all `build-*` orders for a given leader, producing a `{ state, events }` step. It does not deduct AP — AP was deducted at SUBMIT_ORDERS time.

- [ ] **Step 8.1: Write the failing test**

`tests/engine/builds.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { applyBuilds } from '../../src/engine/builds';
import { initialState } from '../../src/engine/state';
import type { Order } from '../../src/engine/types';

describe('applyBuilds', () => {
  const base = initialState({ cast: ['chump', 'carnage'], difficulty: 'normal', seed: 'x' });

  it('applies a build-factory order', () => {
    const orders: Order[] = [{ kind: 'build-factory' }];
    const r = applyBuilds(base, 'chump', orders);
    expect(r.state.leaders.chump.factories).toBe(11);
    expect(r.events).toHaveLength(1);
    expect(r.events[0]).toEqual({ kind: 'FactoryBuilt', by: 'chump' });
  });

  it('applies multiple stockpile builds in order', () => {
    const orders: Order[] = [
      { kind: 'build-missile' },
      { kind: 'build-warhead', yield: 'small' },
      { kind: 'build-warhead', yield: 'medium' },
      { kind: 'build-defence', type: 'shield' },
    ];
    const r = applyBuilds(base, 'chump', orders);
    expect(r.state.leaders.chump.stockpile.missiles).toBe(1);
    expect(r.state.leaders.chump.stockpile.warheadsSmall).toBe(1);
    expect(r.state.leaders.chump.stockpile.warheadsMedium).toBe(1);
    expect(r.state.leaders.chump.stockpile.shields).toBe(1);
    expect(r.events.map((e) => e.kind)).toEqual([
      'DeliveryBuilt',
      'WarheadBuilt',
      'WarheadBuilt',
      'DefenceBuilt',
    ]);
  });

  it('ignores non-build orders', () => {
    const orders: Order[] = [
      { kind: 'launch', target: 'carnage', delivery: 'missile', warhead: 'small', targetType: 'people' },
      { kind: 'build-factory' },
    ];
    const r = applyBuilds(base, 'chump', orders);
    expect(r.state.leaders.chump.factories).toBe(11);
    expect(r.events).toHaveLength(1);
  });
});
```

- [ ] **Step 8.2: Run test, expect FAIL**

Run: `npm run test:run -- tests/engine/builds.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 8.3: Write `src/engine/builds.ts`**

```ts
import type { GameState, LeaderId, Order, ResolutionEvent } from './types';

export interface BuildsResult {
  state: GameState;
  events: ResolutionEvent[];
}

export function applyBuilds(
  state: GameState,
  leaderId: LeaderId,
  orders: Order[],
): BuildsResult {
  const events: ResolutionEvent[] = [];
  const next: GameState = structuredClone(state);
  const leader = next.leaders[leaderId];

  for (const o of orders) {
    switch (o.kind) {
      case 'build-factory':
        leader.factories += 1;
        events.push({ kind: 'FactoryBuilt', by: leaderId });
        break;
      case 'build-missile':
        leader.stockpile.missiles += 1;
        events.push({ kind: 'DeliveryBuilt', by: leaderId, type: 'missile' });
        break;
      case 'build-bomber':
        leader.stockpile.bombers += 1;
        events.push({ kind: 'DeliveryBuilt', by: leaderId, type: 'bomber' });
        break;
      case 'build-warhead':
        if (o.yield === 'small') leader.stockpile.warheadsSmall += 1;
        if (o.yield === 'medium') leader.stockpile.warheadsMedium += 1;
        if (o.yield === 'large') leader.stockpile.warheadsLarge += 1;
        events.push({ kind: 'WarheadBuilt', by: leaderId, yield: o.yield });
        break;
      case 'build-defence':
        if (o.type === 'shield') leader.stockpile.shields += 1;
        if (o.type === 'aa') leader.stockpile.aa += 1;
        events.push({ kind: 'DefenceBuilt', by: leaderId, type: o.type });
        break;
      default:
        // non-build orders ignored at this phase
        break;
    }
  }
  return { state: next, events };
}
```

- [ ] **Step 8.4: Run test, expect PASS**

Run: `npm run test:run -- tests/engine/builds.test.ts`
Expected: PASS, all tests.

- [ ] **Step 8.5: Commit**

```bash
git add src/engine/builds.ts tests/engine/builds.test.ts
git commit -m "engine: add build phase resolver"
```

---

## Task 9: Launch phase

**Files:**
- Create: `src/engine/launches.ts`
- Create: `tests/engine/launches.test.ts`

The launch phase processes every launch order across every leader. Within a round, attacks resolve in deterministic order: by attacker leader-id ASC, then by order index ASC. Defences are tracked per receiver as a running count of incoming missiles / bombers.

For Phase 1 there are no defences, but the function is written generically so Phase 2 can wire up shields/AA without changes here.

- [ ] **Step 9.1: Write the failing test**

`tests/engine/launches.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { applyLaunches } from '../../src/engine/launches';
import { initialState } from '../../src/engine/state';
import type { Order } from '../../src/engine/types';

function setStockpile(state: ReturnType<typeof initialState>, id: 'chump' | 'carnage', overrides: Partial<typeof state.leaders.chump.stockpile>) {
  Object.assign(state.leaders[id].stockpile, overrides);
}

describe('applyLaunches', () => {
  it('applies a single small-warhead launch killing 2M people', () => {
    const s = initialState({ cast: ['chump', 'carnage'], difficulty: 'normal', seed: 'x' });
    setStockpile(s, 'chump', { missiles: 1, warheadsSmall: 1 });
    const orders: Record<'chump' | 'carnage', Order[]> = {
      chump: [{ kind: 'launch', target: 'carnage', delivery: 'missile', warhead: 'small', targetType: 'people' }],
      carnage: [],
    };
    const r = applyLaunches(s, orders);
    expect(r.state.leaders.carnage.population).toBe(25 - 2);
    expect(r.state.leaders.chump.stockpile.missiles).toBe(0);
    expect(r.state.leaders.chump.stockpile.warheadsSmall).toBe(0);
    const kinds = r.events.map((e) => e.kind);
    expect(kinds).toContain('MissileLaunched');
    expect(kinds).toContain('ImpactPeople');
  });

  it('skips invalid launches (no stock)', () => {
    const s = initialState({ cast: ['chump', 'carnage'], difficulty: 'normal', seed: 'x' });
    const orders: Record<'chump' | 'carnage', Order[]> = {
      chump: [{ kind: 'launch', target: 'carnage', delivery: 'missile', warhead: 'small', targetType: 'people' }],
      carnage: [],
    };
    const r = applyLaunches(s, orders);
    expect(r.state.leaders.carnage.population).toBe(25);
    expect(r.events).toHaveLength(0);
  });

  it('intercepts when defenders cover incoming (rng-deterministic)', () => {
    const s = initialState({ cast: ['chump', 'carnage'], difficulty: 'normal', seed: 'x' });
    setStockpile(s, 'chump', { missiles: 1, warheadsSmall: 1 });
    s.leaders.carnage.stockpile.shields = 5; // way more than needed
    const orders: Record<'chump' | 'carnage', Order[]> = {
      chump: [{ kind: 'launch', target: 'carnage', delivery: 'missile', warhead: 'small', targetType: 'people' }],
      carnage: [],
    };
    const r = applyLaunches(s, orders);
    expect(r.state.leaders.carnage.population).toBe(25);
    const kinds = r.events.map((e) => e.kind);
    expect(kinds).toContain('MissileIntercepted');
    expect(kinds).not.toContain('ImpactPeople');
  });

  it('attackers fire in deterministic order (chump before carnage)', () => {
    const s = initialState({ cast: ['carnage', 'chump'], difficulty: 'normal', seed: 'x' });
    setStockpile(s, 'chump', { missiles: 1, warheadsSmall: 1 });
    setStockpile(s, 'carnage', { missiles: 1, warheadsSmall: 1 });
    const orders: Record<'chump' | 'carnage', Order[]> = {
      chump: [{ kind: 'launch', target: 'carnage', delivery: 'missile', warhead: 'small', targetType: 'people' }],
      carnage: [{ kind: 'launch', target: 'chump', delivery: 'missile', warhead: 'small', targetType: 'people' }],
    };
    const r = applyLaunches(s, orders);
    const launches = r.events.filter((e) => e.kind === 'MissileLaunched');
    expect(launches[0]).toMatchObject({ from: 'carnage' }); // 'carnage' < 'chump' alphabetically
    expect(launches[1]).toMatchObject({ from: 'chump' });
  });
});
```

- [ ] **Step 9.2: Run test, expect FAIL**

Run: `npm run test:run -- tests/engine/launches.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 9.3: Write `src/engine/launches.ts`**

```ts
import type {
  DeliveryType,
  GameState,
  LeaderId,
  Order,
  ResolutionEvent,
  Yield,
} from './types';
import { interceptProbability, peopleDeaths, factoriesDestroyed } from './combat';
import { nextRandom } from './rng';

export interface LaunchesResult {
  state: GameState;
  events: ResolutionEvent[];
}

interface Launch {
  from: LeaderId;
  to: LeaderId;
  delivery: DeliveryType;
  warhead: Yield;
  targetType: 'people' | 'infra';
}

export function applyLaunches(
  state: GameState,
  ordersByLeader: Partial<Record<LeaderId, Order[]>>,
): LaunchesResult {
  const next: GameState = structuredClone(state);
  const events: ResolutionEvent[] = [];

  // Collect launches in deterministic order: attacker id ASC, then order index.
  const launches: Launch[] = [];
  const attackers = Object.keys(ordersByLeader).sort() as LeaderId[];
  for (const id of attackers) {
    const list = ordersByLeader[id] ?? [];
    for (const o of list) {
      if (o.kind !== 'launch') continue;
      launches.push({
        from: id,
        to: o.target,
        delivery: o.delivery,
        warhead: o.warhead,
        targetType: o.targetType,
      });
    }
  }

  // Track Nth-incoming counters per receiver per delivery type.
  const incoming = {} as Record<LeaderId, { missile: number; bomber: number }>;
  for (const id of next.cast) incoming[id] = { missile: 0, bomber: 0 };

  for (const l of launches) {
    const attacker = next.leaders[l.from];
    const receiver = next.leaders[l.to];
    if (!attacker || !receiver || !attacker.alive || !receiver.alive) continue;

    // Validate stock at fire time (cheaper than re-running validateOrder here).
    if (l.delivery === 'missile' && attacker.stockpile.missiles < 1) continue;
    if (l.delivery === 'bomber' && attacker.stockpile.bombers < 1) continue;
    const warheadField = warheadFieldFor(l.warhead);
    if (attacker.stockpile[warheadField] < 1) continue;

    // Consume.
    if (l.delivery === 'missile') attacker.stockpile.missiles -= 1;
    else attacker.stockpile.bombers -= 1;
    attacker.stockpile[warheadField] -= 1;

    events.push({
      kind: 'MissileLaunched',
      from: l.from,
      to: l.to,
      delivery: l.delivery,
      warhead: l.warhead,
      targetType: l.targetType,
    });

    // Intercept roll.
    incoming[l.to][l.delivery] += 1;
    const nth = incoming[l.to][l.delivery];
    const defenders = l.delivery === 'missile' ? receiver.stockpile.shields : receiver.stockpile.aa;
    const p = interceptProbability(nth, defenders);
    const roll = nextRandom(next.rngState);
    next.rngState = roll.state;
    const intercepted = roll.value < p;
    if (intercepted) {
      events.push({
        kind: 'MissileIntercepted',
        from: l.from,
        to: l.to,
        delivery: l.delivery,
        warhead: l.warhead,
      });
      continue;
    }

    // Damage.
    if (l.targetType === 'people') {
      const deaths = peopleDeaths(l.warhead, receiver.population);
      receiver.population -= deaths;
      events.push({
        kind: 'ImpactPeople',
        from: l.from,
        target: l.to,
        warhead: l.warhead,
        deaths,
      });
    } else {
      const destroyed = factoriesDestroyed(l.warhead, receiver.factories);
      receiver.factories -= destroyed;
      events.push({
        kind: 'ImpactInfrastructure',
        from: l.from,
        target: l.to,
        warhead: l.warhead,
        factoriesDestroyed: destroyed,
      });
    }
  }

  return { state: next, events };
}

function warheadFieldFor(y: Yield): 'warheadsSmall' | 'warheadsMedium' | 'warheadsLarge' {
  if (y === 'small') return 'warheadsSmall';
  if (y === 'medium') return 'warheadsMedium';
  return 'warheadsLarge';
}
```

- [ ] **Step 9.4: Run test, expect PASS**

Run: `npm run test:run -- tests/engine/launches.test.ts`
Expected: PASS, all tests.

- [ ] **Step 9.5: Commit**

```bash
git add src/engine/launches.ts tests/engine/launches.test.ts
git commit -m "engine: add launch phase with deterministic intercept rolls"
```

---

## Task 10: Win conditions

**Files:**
- Create: `src/engine/winConditions.ts`
- Create: `tests/engine/winConditions.test.ts`

Phase 1 only checks `survivor`, `pyrrhic`, and `apocalypse`. Phase 2 layers on `dominance`. The function takes a `priorPopAtRoundStart` snapshot so pyrrhic can identify the highest-pop leader at start of the round.

- [ ] **Step 10.1: Write the failing test**

`tests/engine/winConditions.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { checkOutcome } from '../../src/engine/winConditions';
import { initialState } from '../../src/engine/state';

describe('checkOutcome', () => {
  const base = initialState({ cast: ['chump', 'carnage'], difficulty: 'normal', seed: 'x' });

  it('returns null while multiple leaders are alive', () => {
    expect(checkOutcome(base, { chump: 33, carnage: 25 })).toBeNull();
  });

  it('returns survivor when exactly one leader has pop > 0', () => {
    const s = structuredClone(base);
    s.leaders.carnage.population = 0;
    s.leaders.carnage.alive = false;
    expect(checkOutcome(s, { chump: 33, carnage: 25 })).toEqual({
      type: 'survivor',
      winner: 'chump',
    });
  });

  it('returns pyrrhic when all leaders died this round (highest start pop wins)', () => {
    const s = structuredClone(base);
    s.leaders.chump.population = 0;
    s.leaders.chump.alive = false;
    s.leaders.carnage.population = 0;
    s.leaders.carnage.alive = false;
    expect(checkOutcome(s, { chump: 33, carnage: 25 })).toEqual({
      type: 'pyrrhic',
      winner: 'chump',
    });
  });

  it('returns apocalypse only when prior populations were all 0 (impossible from initial state but covered)', () => {
    const s = structuredClone(base);
    s.leaders.chump.population = 0;
    s.leaders.chump.alive = false;
    s.leaders.carnage.population = 0;
    s.leaders.carnage.alive = false;
    expect(checkOutcome(s, { chump: 0, carnage: 0 })).toEqual({ type: 'apocalypse' });
  });
});
```

- [ ] **Step 10.2: Run test, expect FAIL**

Run: `npm run test:run -- tests/engine/winConditions.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 10.3: Write `src/engine/winConditions.ts`**

```ts
import type { GameState, LeaderId, WinOutcome } from './types';

export function checkOutcome(
  state: GameState,
  startOfRoundPop: Partial<Record<LeaderId, number>>,
): WinOutcome | null {
  const alive = state.cast.filter((id) => state.leaders[id].population > 0);
  if (alive.length > 1) return null;
  if (alive.length === 1) {
    return { type: 'survivor', winner: alive[0] };
  }
  // alive.length === 0 — pyrrhic if anyone had pop > 0 at round start, else apocalypse.
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
```

- [ ] **Step 10.4: Run test, expect PASS**

Run: `npm run test:run -- tests/engine/winConditions.test.ts`
Expected: PASS, 4 tests.

- [ ] **Step 10.5: Commit**

```bash
git add src/engine/winConditions.ts tests/engine/winConditions.test.ts
git commit -m "engine: add win-condition check (survivor / pyrrhic / apocalypse)"
```

---

## Task 11: Round resolution orchestrator

**Files:**
- Create: `src/engine/resolution.ts`
- Create: `tests/engine/resolution.test.ts`

`resolveRound(state)` runs the configured phase order: **Builds → Launches → status update**. Phase 2 will insert Defences (a no-op until shields/AA matter), Propaganda, Wooing, Final Retaliations.

- [ ] **Step 11.1: Write the failing test**

`tests/engine/resolution.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { resolveRound } from '../../src/engine/resolution';
import { initialState } from '../../src/engine/state';
import { totalApCost } from '../../src/engine/orders';
import type { Order } from '../../src/engine/types';

function withSubmittedOrders(
  s: ReturnType<typeof initialState>,
  who: 'chump' | 'carnage',
  orders: Order[],
) {
  const next = structuredClone(s);
  const cost = totalApCost(orders);
  next.leaders[who].ap -= cost;
  next.pendingOrders[who] = { leaderId: who, orders, apSpent: cost };
  return next;
}

describe('resolveRound', () => {
  it('advances round counter and clears pending orders', () => {
    const s = initialState({ cast: ['chump', 'carnage'], difficulty: 'normal', seed: 'x' });
    const r = resolveRound(s);
    expect(r.state.round).toBe(2);
    expect(r.state.pendingOrders).toEqual({});
  });

  it('builds factories before launches resolve, but build-this-round factories do NOT generate AP for this round', () => {
    let s = initialState({ cast: ['chump', 'carnage'], difficulty: 'normal', seed: 'x' });
    s = withSubmittedOrders(s, 'chump', [{ kind: 'build-factory' }]);
    s = withSubmittedOrders(s, 'carnage', []);
    const r = resolveRound(s);
    expect(r.state.leaders.chump.factories).toBe(11);
    // AP for new round comes from new factory count (11 × 0.5 = 5.5) plus banked.
    // Chump's starting AP was 5, spent 3 on build-factory → 2 unspent → bank capped at 2.
    // New AP = floor(11*0.5) = 5 + banked = 7.
    expect(r.state.leaders.chump.ap).toBe(7);
  });

  it('eliminates a leader whose population reaches 0 and emits LeaderEliminated', () => {
    // Carnage has 0 shields. Per spec §6, the Nth incoming with S=0 intercepts at
    // 0.75 / 0.5 / 0.25 / 0%. The 4th launch is GUARANTEED to land (overflow=4 → 0%),
    // so this test is deterministic regardless of seed-driven intercept rolls.
    let s = initialState({ cast: ['chump', 'carnage'], difficulty: 'normal', seed: 'x' });
    s.leaders.chump.stockpile.missiles = 4;
    s.leaders.chump.stockpile.warheadsLarge = 4;
    s.leaders.carnage.population = 5; // small enough to die from any single Large hit
    s.leaders.carnage.stockpile.shields = 0;
    const launch = {
      kind: 'launch' as const,
      target: 'carnage' as const,
      delivery: 'missile' as const,
      warhead: 'large' as const,
      targetType: 'people' as const,
    };
    // withSubmittedOrders bypasses the reducer's AP check, so it's fine that
    // 4 launches cost 8 AP versus Chump's starting 5 — the helper just records
    // the orders and adjusts AP.
    s = withSubmittedOrders(s, 'chump', [launch, launch, launch, launch]);
    s = withSubmittedOrders(s, 'carnage', []);
    const r = resolveRound(s);
    expect(r.state.leaders.carnage.alive).toBe(false);
    expect(r.state.leaders.carnage.population).toBe(0);
    expect(r.state.outcome).toEqual({ type: 'survivor', winner: 'chump' });
    const kinds = r.events.map((e) => e.kind);
    expect(kinds).toContain('LeaderEliminated');
    expect(kinds[kinds.length - 1]).toBe('OutcomeReached');
  });

  it('banks unspent AP up to AP_BANK_CAP', () => {
    let s = initialState({ cast: ['chump', 'carnage'], difficulty: 'normal', seed: 'x' });
    // Chump starts with 5 AP, no orders submitted → banks 2 (capped).
    s = withSubmittedOrders(s, 'chump', []);
    s = withSubmittedOrders(s, 'carnage', []);
    const r = resolveRound(s);
    // Round 2 AP = floor(10 * 0.5) + apBanked.
    expect(r.state.leaders.chump.apBanked).toBe(2);
    expect(r.state.leaders.chump.ap).toBe(5 + 2);
  });
});
```

- [ ] **Step 11.2: Run test, expect FAIL**

Run: `npm run test:run -- tests/engine/resolution.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 11.3: Write `src/engine/resolution.ts`**

```ts
import type { GameState, LeaderId, Order, ResolutionEvent } from './types';
import { applyBuilds } from './builds';
import { applyLaunches } from './launches';
import { checkOutcome } from './winConditions';
import { AP_BANK_CAP, FACTORY_AP_RATE, LEADER_PROFILES } from './balance';

export interface ResolveResult {
  state: GameState;
  events: ResolutionEvent[];
}

export function resolveRound(state: GameState): ResolveResult {
  const events: ResolutionEvent[] = [];
  let s: GameState = structuredClone(state);

  const startOfRoundPop: Partial<Record<LeaderId, number>> = {};
  for (const id of s.cast) startOfRoundPop[id] = s.leaders[id].population;

  // Sealed-orders summary events (fixed order).
  for (const id of [...s.cast].sort()) {
    const sealed = s.pendingOrders[id];
    if (sealed) events.push({ kind: 'OrdersSealed', leaderId: id, orderCount: sealed.orders.length });
  }

  // Phase: Builds (each leader, in cast order so deterministic).
  for (const id of [...s.cast].sort()) {
    const sealed = s.pendingOrders[id];
    if (!sealed) continue;
    const r = applyBuilds(s, id, sealed.orders);
    s = r.state;
    events.push(...r.events);
  }

  // Phase: Launches (cross-leader, attacker id ASC).
  const ordersByLeader: Partial<Record<LeaderId, Order[]>> = {};
  for (const id of s.cast) {
    ordersByLeader[id] = s.pendingOrders[id]?.orders ?? [];
  }
  const lr = applyLaunches(s, ordersByLeader);
  s = lr.state;
  events.push(...lr.events);

  // Status update: mark eliminated leaders.
  for (const id of s.cast) {
    const l = s.leaders[id];
    if (l.alive && l.population <= 0) {
      l.alive = false;
      l.population = 0;
      events.push({ kind: 'LeaderEliminated', id });
    }
  }

  // Bank unspent AP for survivors, then refresh AP for next round.
  for (const id of s.cast) {
    const l = s.leaders[id];
    if (!l.alive) continue;
    const banked = Math.min(AP_BANK_CAP, Math.max(0, Math.floor(l.ap)));
    l.apBanked = banked;
    const factoryAp = Math.floor(l.factories * FACTORY_AP_RATE);
    const bonus = leaderBonusAp(l, sealedOrdersOf(state, id));
    l.ap = factoryAp + banked + bonus;
  }

  // Clear sealed orders, advance round.
  s.pendingOrders = {};
  s.round += 1;

  // Win check.
  const outcome = checkOutcome(s, startOfRoundPop);
  if (outcome) {
    s.outcome = outcome;
    events.push({ kind: 'OutcomeReached', outcome });
  }

  // Append events to the persistent log too.
  s.log = [...s.log, ...events];

  return { state: s, events };
}

function sealedOrdersOf(state: GameState, id: LeaderId): Order[] {
  return state.pendingOrders[id]?.orders ?? [];
}

function leaderBonusAp(
  leader: GameState['leaders'][LeaderId],
  thisRoundsOrders: Order[],
): number {
  const profile = LEADER_PROFILES[leader.id];
  switch (profile.bonusRule) {
    case 'netanyahoo-launch-bonus':
      return thisRoundsOrders.some((o) => o.kind === 'launch') ? 1 : 0;
    case 'mileigh-aggression-bonus': {
      if (thisRoundsOrders.length === 0) return 0;
      const aggressive = thisRoundsOrders.every(
        (o) => o.kind === 'launch' || o.kind === 'propaganda',
      );
      return aggressive ? 2 : 0;
    }
    case 'chump-defence-waste':
      // Phase 2 implements the -1 penalty when defences pile beyond useful depth.
      return 0;
    default:
      return 0;
  }
}
```

- [ ] **Step 11.4: Run test, expect PASS**

Run: `npm run test:run -- tests/engine/resolution.test.ts`
Expected: PASS, all tests.

- [ ] **Step 11.5: Commit**

```bash
git add src/engine/resolution.ts tests/engine/resolution.test.ts
git commit -m "engine: add round resolution orchestrator (builds + launches + ap)"
```

---

## Task 12: Reducer

**Files:**
- Create: `src/engine/reducer.ts`
- Create: `tests/engine/reducer.test.ts`

The reducer is the engine's single entry point for state transitions. `RESOLVE_ROUND` delegates to `resolveRound`; `SUBMIT_ORDERS` validates orders, deducts AP, and parks them in `pendingOrders`.

- [ ] **Step 12.1: Write the failing test**

`tests/engine/reducer.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { reduce } from '../../src/engine/reducer';
import { initialState } from '../../src/engine/state';

describe('reduce — NEW_GAME', () => {
  it('replaces state with a fresh game', () => {
    const a = initialState({ cast: ['chump', 'carnage'], difficulty: 'normal', seed: 'first' });
    a.round = 5; // mutate to prove NEW_GAME resets
    const b = reduce(a, {
      type: 'NEW_GAME',
      cast: ['chump', 'carnage'],
      difficulty: 'easy',
      seed: 'second',
    });
    expect(b.round).toBe(1);
    expect(b.difficulty).toBe('easy');
    expect(b.seed).toBe('second');
  });
});

describe('reduce — SUBMIT_ORDERS', () => {
  it('records orders and deducts AP', () => {
    const s0 = initialState({ cast: ['chump', 'carnage'], difficulty: 'normal', seed: 'x' });
    const s1 = reduce(s0, {
      type: 'SUBMIT_ORDERS',
      leaderId: 'chump',
      orders: [{ kind: 'build-factory' }],
    });
    expect(s1.leaders.chump.ap).toBe(s0.leaders.chump.ap - 3);
    expect(s1.pendingOrders.chump?.orders).toHaveLength(1);
    expect(s1.pendingOrders.chump?.apSpent).toBe(3);
  });

  it('rejects orders that exceed AP budget (state unchanged)', () => {
    const s0 = initialState({ cast: ['chump', 'carnage'], difficulty: 'normal', seed: 'x' });
    const s1 = reduce(s0, {
      type: 'SUBMIT_ORDERS',
      leaderId: 'chump',
      orders: [{ kind: 'build-factory' }, { kind: 'build-factory' }], // 6 AP, only 5 available
    });
    expect(s1).toBe(s0);
  });

  it('rejects an invalid order (e.g., launch with no missile)', () => {
    const s0 = initialState({ cast: ['chump', 'carnage'], difficulty: 'normal', seed: 'x' });
    const s1 = reduce(s0, {
      type: 'SUBMIT_ORDERS',
      leaderId: 'chump',
      orders: [
        { kind: 'launch', target: 'carnage', delivery: 'missile', warhead: 'small', targetType: 'people' },
      ],
    });
    expect(s1).toBe(s0);
  });
});

describe('reduce — RESOLVE_ROUND', () => {
  it('delegates to resolveRound and advances state', () => {
    const s0 = initialState({ cast: ['chump', 'carnage'], difficulty: 'normal', seed: 'x' });
    const s1 = reduce(s0, { type: 'SUBMIT_ORDERS', leaderId: 'chump', orders: [] });
    const s2 = reduce(s1, { type: 'SUBMIT_ORDERS', leaderId: 'carnage', orders: [] });
    const s3 = reduce(s2, { type: 'RESOLVE_ROUND' });
    expect(s3.round).toBe(2);
  });
});

describe('reduce — LOAD_STATE', () => {
  it('returns the loaded state verbatim', () => {
    const s0 = initialState({ cast: ['chump', 'carnage'], difficulty: 'normal', seed: 'x' });
    const target = { ...s0, round: 7 };
    expect(reduce(s0, { type: 'LOAD_STATE', state: target })).toBe(target);
  });
});
```

- [ ] **Step 12.2: Run test, expect FAIL**

Run: `npm run test:run -- tests/engine/reducer.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 12.3: Write `src/engine/reducer.ts`**

```ts
import type { Action, GameState } from './types';
import { initialState } from './state';
import { totalApCost, validateOrder } from './orders';
import { resolveRound } from './resolution';

export function reduce(state: GameState, action: Action): GameState {
  switch (action.type) {
    case 'NEW_GAME':
      return initialState({
        cast: action.cast,
        difficulty: action.difficulty,
        seed: action.seed,
        config: action.config,
      });

    case 'SUBMIT_ORDERS': {
      const me = state.leaders[action.leaderId];
      if (!me || !me.alive) return state;
      // Validate every order.
      for (const o of action.orders) {
        const v = validateOrder(state, action.leaderId, o);
        if (!v.ok) return state;
      }
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

    case 'RESOLVE_ROUND':
      return resolveRound(state).state;

    case 'LOAD_STATE':
      return action.state;
  }
}
```

- [ ] **Step 12.4: Run test, expect PASS**

Run: `npm run test:run -- tests/engine/reducer.test.ts`
Expected: PASS, all tests.

- [ ] **Step 12.5: Commit**

```bash
git add src/engine/reducer.ts tests/engine/reducer.test.ts
git commit -m "engine: add top-level reducer wrapping submit/resolve/load"
```

---

## Task 13: Stub random AI

**Files:**
- Create: `src/engine/ai/index.ts`
- Create: `tests/engine/ai-stub.test.ts`

Phase 1's AI is intentionally simple: it picks valid orders within budget at random, slightly biased toward launches when it has the stockpile. Personalities arrive in Phase 2.

- [ ] **Step 13.1: Write the failing test**

`tests/engine/ai-stub.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { planAi } from '../../src/engine/ai';
import { initialState } from '../../src/engine/state';
import { totalApCost } from '../../src/engine/orders';

describe('planAi (stub random)', () => {
  it('returns deterministic orders given identical state', () => {
    const s = initialState({ cast: ['chump', 'carnage'], difficulty: 'normal', seed: 'x' });
    const a = planAi(s, 'carnage');
    const b = planAi(s, 'carnage');
    expect(a).toEqual(b);
  });

  it('never exceeds the leader’s AP budget', () => {
    const s = initialState({ cast: ['chump', 'carnage'], difficulty: 'normal', seed: 'x' });
    for (let i = 0; i < 20; i++) {
      const variant = structuredClone(s);
      variant.rngState ^= i; // perturb without changing the type
      const orders = planAi(variant, 'carnage');
      expect(totalApCost(orders)).toBeLessThanOrEqual(variant.leaders.carnage.ap);
    }
  });

  it('returns only valid orders (no launch without stock)', () => {
    const s = initialState({ cast: ['chump', 'carnage'], difficulty: 'normal', seed: 'x' });
    const orders = planAi(s, 'carnage');
    for (const o of orders) {
      if (o.kind === 'launch') {
        // carnage starts with empty stockpile, so this should never happen.
        throw new Error('AI returned a launch with no stock');
      }
    }
  });

  it('prefers a launch when carnage has stock', () => {
    const s = initialState({ cast: ['chump', 'carnage'], difficulty: 'normal', seed: 'x' });
    s.leaders.carnage.stockpile.missiles = 5;
    s.leaders.carnage.stockpile.warheadsSmall = 5;
    const orders = planAi(s, 'carnage');
    expect(orders.some((o) => o.kind === 'launch')).toBe(true);
  });
});
```

- [ ] **Step 13.2: Run test, expect FAIL**

Run: `npm run test:run -- tests/engine/ai-stub.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 13.3: Write `src/engine/ai/index.ts`**

```ts
import type { GameState, LeaderId, Order } from '../types';
import { apCostOf, validateOrder } from '../orders';
import { mix32, nextInt, seedFromString } from '../rng';

// Stub AI: chooses among the cheapest legal moves at random within budget,
// biased toward launches when delivery + warhead are stocked. Determinism
// comes from a per-(leader, round) sub-seed derived from state.rngState.
// Phase 2 replaces this with personality-driven scoring per spec §7.
export function planAi(state: GameState, leaderId: LeaderId): Order[] {
  const me = state.leaders[leaderId];
  if (!me || !me.alive) return [];
  let rngState = mix32(state.rngState, seedFromString(leaderId), state.round);
  let budget = me.ap;
  const orders: Order[] = [];

  // 1) If we have a missile + small warhead, launch at the first living non-self leader.
  const target = state.cast.find((id) => id !== leaderId && state.leaders[id].alive);
  if (
    target &&
    me.stockpile.missiles >= 1 &&
    me.stockpile.warheadsSmall >= 1 &&
    budget >= 2
  ) {
    const launch: Order = {
      kind: 'launch',
      target,
      delivery: 'missile',
      warhead: 'small',
      targetType: 'people',
    };
    if (validateOrder(state, leaderId, launch).ok) {
      orders.push(launch);
      budget -= apCostOf(launch);
    }
  }

  // 2) Fill remaining budget with random legal builds.
  const candidates: Order[] = [
    { kind: 'build-missile' },
    { kind: 'build-warhead', yield: 'small' },
    { kind: 'build-factory' },
  ];

  while (budget > 0) {
    const affordable = candidates.filter((c) => apCostOf(c) <= budget);
    if (affordable.length === 0) break;
    const pick = nextInt(rngState, affordable.length);
    rngState = pick.state;
    const choice = affordable[pick.value];
    orders.push(choice);
    budget -= apCostOf(choice);
  }

  return orders;
}
```

- [ ] **Step 13.4: Run test, expect PASS**

Run: `npm run test:run -- tests/engine/ai-stub.test.ts`
Expected: PASS, all tests.

- [ ] **Step 13.5: Commit**

```bash
git add src/engine/ai/index.ts tests/engine/ai-stub.test.ts
git commit -m "engine: add stub random ai with deterministic per-leader seed"
```

---

## Task 14: Engine public barrel + determinism property test

**Files:**
- Create: `src/engine/index.ts`
- Create: `tests/engine/determinism.test.ts`

- [ ] **Step 14.1: Write `src/engine/index.ts`**

```ts
export * from './types';
export { initialState } from './state';
export { reduce } from './reducer';
export { resolveRound } from './resolution';
export { planAi } from './ai';
export { apCostOf, totalApCost, validateOrder } from './orders';
export { LEADER_PROFILES, ACTION_COSTS, YIELD_DAMAGE } from './balance';
```

- [ ] **Step 14.2: Write the determinism test**

`tests/engine/determinism.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { reduce, initialState, planAi } from '../../src/engine';

function runGame(seed: string, maxRounds = 30) {
  let s = initialState({ cast: ['chump', 'carnage'], difficulty: 'normal', seed });
  while (!s.outcome && s.round <= maxRounds) {
    const chumpOrders = planAi(s, 'chump');
    const carnageOrders = planAi(s, 'carnage');
    s = reduce(s, { type: 'SUBMIT_ORDERS', leaderId: 'chump', orders: chumpOrders });
    s = reduce(s, { type: 'SUBMIT_ORDERS', leaderId: 'carnage', orders: carnageOrders });
    s = reduce(s, { type: 'RESOLVE_ROUND' });
  }
  return s;
}

describe('determinism', () => {
  it('produces identical state for identical seed across two runs', () => {
    const a = runGame('alpha');
    const b = runGame('alpha');
    expect(a).toEqual(b);
  });

  it('produces different state for different seeds', () => {
    const a = runGame('alpha');
    const b = runGame('beta');
    expect(a).not.toEqual(b);
  });

  it('reaches an outcome within 30 AI-vs-AI rounds for sample seeds', () => {
    for (const seed of ['s1', 's2', 's3', 's4', 's5']) {
      const final = runGame(seed, 50);
      expect(final.outcome).not.toBeNull();
    }
  });
});
```

- [ ] **Step 14.3: Run all engine tests**

Run: `npm run test:run -- tests/engine`
Expected: PASS, all engine suites green.

- [ ] **Step 14.4: Commit**

```bash
git add src/engine/index.ts tests/engine/determinism.test.ts
git commit -m "engine: barrel export + ai-vs-ai determinism property test"
```

---

## Task 15: UI placeholder — main + App scaffolding

**Files:**
- Create: `src/main.tsx`
- Create: `src/App.tsx`
- Create: `src/vite-env.d.ts`

- [ ] **Step 15.1: Write `src/vite-env.d.ts`**

```ts
/// <reference types="vite/client" />
```

- [ ] **Step 15.2: Write `src/main.tsx`**

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
```

- [ ] **Step 15.3: Write `src/App.tsx` (placeholder — the screen lands in Task 17)**

```tsx
import { PlayingScreen } from './ui/screens/PlayingScreen';

export function App() {
  return <PlayingScreen />;
}
```

- [ ] **Step 15.4: Verify typecheck — expect ONE error (PlayingScreen doesn't exist yet)**

Run: `npm run typecheck`
Expected: FAIL — `Cannot find module './ui/screens/PlayingScreen'`. This proves the wiring is in place; Task 17 fixes it.

- [ ] **Step 15.5: Commit**

```bash
git add src/vite-env.d.ts src/main.tsx src/App.tsx
git commit -m "ui: add main entry and App shell (placeholder until task 17)"
```

---

## Task 16: UI format helpers

**Files:**
- Create: `src/ui/format.ts`

- [ ] **Step 16.1: Write `src/ui/format.ts`**

```ts
import type { Order, ResolutionEvent } from '../engine/types';
import { LEADER_PROFILES } from '../engine/balance';
import { apCostOf } from '../engine/orders';

const yieldShort = { small: 'S', medium: 'M', large: 'L' } as const;

export function describeOrder(o: Order): string {
  const cost = `(${apCostOf(o)})`;
  switch (o.kind) {
    case 'build-factory':
      return `Build factory ${cost}`;
    case 'build-missile':
      return `Build missile ${cost}`;
    case 'build-bomber':
      return `Build bomber ${cost}`;
    case 'build-warhead':
      return `Build warhead-${yieldShort[o.yield]} ${cost}`;
    case 'build-defence':
      return `Build defence (${o.type}) ${cost}`;
    case 'launch':
      return `Launch ${o.delivery}+${yieldShort[o.warhead]} → ${LEADER_PROFILES[o.target].name} (${o.targetType}) ${cost}`;
    case 'propaganda':
      return `Propaganda → ${LEADER_PROFILES[o.target].name} ${cost}`;
    case 'woo':
      return `Woo ${LEADER_PROFILES[o.target].name} (${o.points}pts) ${cost}`;
  }
}

export function describeEvent(e: ResolutionEvent): string {
  const n = (id: keyof typeof LEADER_PROFILES) => LEADER_PROFILES[id].name;
  switch (e.kind) {
    case 'OrdersSealed':
      return `Sealed ${e.orderCount} orders for ${n(e.leaderId)}`;
    case 'FactoryBuilt':
      return `${n(e.by)} built a factory`;
    case 'DeliveryBuilt':
      return `${n(e.by)} built a ${e.type}`;
    case 'WarheadBuilt':
      return `${n(e.by)} built a ${e.yield} warhead`;
    case 'DefenceBuilt':
      return `${n(e.by)} built ${e.type} defence`;
    case 'MissileLaunched':
      return `${n(e.from)} launched ${e.delivery}+${yieldShort[e.warhead]} at ${n(e.to)} (${e.targetType})`;
    case 'MissileIntercepted':
      return `INTERCEPTED ${n(e.from)}→${n(e.to)}`;
    case 'ImpactPeople':
      return `${n(e.target)} loses ${e.deaths}M to ${n(e.from)}`;
    case 'ImpactInfrastructure':
      return `${n(e.target)} loses ${e.factoriesDestroyed} factories to ${n(e.from)}`;
    case 'PropagandaTransfer':
      return `${n(e.from)} propagandised ${n(e.to)} (-${e.amount}M)`;
    case 'WooApplied':
      return `${n(e.from)} wooed ${n(e.to)} (+${e.points})`;
    case 'LeaderEliminated':
      return `*** ${n(e.id)} eliminated ***`;
    case 'OutcomeReached':
      return `OUTCOME: ${e.outcome.type}${e.outcome.winner ? ` (${n(e.outcome.winner)})` : ''}`;
  }
}
```

- [ ] **Step 16.2: Verify typecheck**

Run: `npm run typecheck`
Expected: PASS for `src/ui/format.ts` (still FAILs because PlayingScreen.tsx is missing — that's fixed in Task 17).

- [ ] **Step 16.3: Commit**

```bash
git add src/ui/format.ts
git commit -m "ui: add order + event format helpers"
```

---

## Task 17: PlayingScreen component

**Files:**
- Create: `src/ui/screens/PlayingScreen.tsx`

- [ ] **Step 17.1: Write `src/ui/screens/PlayingScreen.tsx`**

```tsx
import { useReducer, useState } from 'react';
import { initialState, reduce, planAi, totalApCost } from '../../engine';
import type { LeaderId, Order } from '../../engine/types';
import { describeEvent, describeOrder } from '../format';

const PLAYER: LeaderId = 'chump';
const OPPONENT: LeaderId = 'carnage';
const DEMO_SEED = 'p1-demo';

const QUICK_ORDERS: Array<{ label: string; build: () => Order }> = [
  { label: 'Build factory', build: () => ({ kind: 'build-factory' }) },
  { label: 'Build missile', build: () => ({ kind: 'build-missile' }) },
  { label: 'Build warhead-S', build: () => ({ kind: 'build-warhead', yield: 'small' }) },
  {
    label: 'Launch missile+S at Carnage',
    build: () => ({
      kind: 'launch',
      target: OPPONENT,
      delivery: 'missile',
      warhead: 'small',
      targetType: 'people',
    }),
  },
];

export function PlayingScreen() {
  const [state, dispatch] = useReducer(reduce, undefined, () =>
    initialState({ cast: [PLAYER, OPPONENT], difficulty: 'normal', seed: DEMO_SEED }),
  );
  const [queue, setQueue] = useState<Order[]>([]);

  const player = state.leaders[PLAYER];
  const opp = state.leaders[OPPONENT];
  const apSpentInQueue = totalApCost(queue);
  const apOver = apSpentInQueue > player.ap;

  function add(o: Order) {
    setQueue([...queue, o]);
  }

  function removeAt(i: number) {
    setQueue(queue.filter((_, idx) => idx !== i));
  }

  function newGame() {
    dispatch({
      type: 'NEW_GAME',
      cast: [PLAYER, OPPONENT],
      difficulty: 'normal',
      seed: `${DEMO_SEED}-${Date.now()}`,
    });
    setQueue([]);
  }

  function resolveRound() {
    if (apOver) return;
    let s = state;
    s = reduce(s, { type: 'SUBMIT_ORDERS', leaderId: PLAYER, orders: queue });
    const aiOrders = planAi(s, OPPONENT);
    s = reduce(s, { type: 'SUBMIT_ORDERS', leaderId: OPPONENT, orders: aiOrders });
    s = reduce(s, { type: 'RESOLVE_ROUND' });
    dispatch({ type: 'LOAD_STATE', state: s });
    setQueue([]);
  }

  if (state.outcome) {
    return (
      <main style={{ fontFamily: 'system-ui', padding: 24, maxWidth: 720, margin: '0 auto' }}>
        <h1>Game over</h1>
        <p data-testid="outcome">
          {state.outcome.type}
          {state.outcome.winner ? ` — ${state.leaders[state.outcome.winner].name} wins.` : ' — nobody wins.'}
        </p>
        <button onClick={newGame}>New game</button>
        <h3>Final log</h3>
        <ul>
          {state.log.map((e, i) => (
            <li key={i}>{describeEvent(e)}</li>
          ))}
        </ul>
      </main>
    );
  }

  return (
    <main style={{ fontFamily: 'system-ui', padding: 24, maxWidth: 720, margin: '0 auto' }}>
      <header>
        <h1>nuke — Round {state.round}</h1>
      </header>

      <section data-testid="player-panel">
        <h2>You — {player.name}</h2>
        <p>
          Pop: <strong data-testid="player-pop">{player.population}M</strong> · Factories:{' '}
          <strong>{player.factories}</strong> · AP: <strong>{player.ap}</strong> (banked{' '}
          {player.apBanked})
        </p>
        <p>
          Stockpile — missiles {player.stockpile.missiles}, warheads-S{' '}
          {player.stockpile.warheadsSmall}
        </p>
      </section>

      <section data-testid="opponent-panel">
        <h2>Opponent — {opp.name}</h2>
        <p>
          Pop: <strong data-testid="opp-pop">{opp.population}M</strong> · Factories:{' '}
          <strong>{opp.factories}</strong> · AP: <strong>{opp.ap}</strong>
        </p>
        <p>
          Stockpile — missiles {opp.stockpile.missiles}, warheads-S{' '}
          {opp.stockpile.warheadsSmall}
        </p>
      </section>

      <section>
        <h3>
          Order queue — AP {apSpentInQueue}/{player.ap} {apOver ? '(over budget!)' : ''}
        </h3>
        <ul data-testid="queue">
          {queue.map((o, i) => (
            <li key={i}>
              {describeOrder(o)}{' '}
              <button aria-label={`remove order ${i}`} onClick={() => removeAt(i)}>
                ×
              </button>
            </li>
          ))}
        </ul>
        <div role="group" aria-label="add order">
          {QUICK_ORDERS.map((q) => (
            <button key={q.label} onClick={() => add(q.build())}>
              {q.label}
            </button>
          ))}
        </div>
        <div style={{ marginTop: 12 }}>
          <button data-testid="resolve" disabled={apOver} onClick={resolveRound}>
            Resolve round
          </button>
        </div>
      </section>

      <section>
        <h3>Last events</h3>
        <ul data-testid="log">
          {state.log.slice(-12).map((e, i) => (
            <li key={i}>{describeEvent(e)}</li>
          ))}
        </ul>
      </section>
    </main>
  );
}
```

- [ ] **Step 17.2: Verify typecheck passes**

Run: `npm run typecheck`
Expected: exit code 0.

- [ ] **Step 17.3: Commit**

```bash
git add src/ui/screens/PlayingScreen.tsx
git commit -m "ui: add PlayingScreen — order queue + resolve loop + game-over banner"
```

---

## Task 18: RTL play-through test

**Files:**
- Create: `tests/ui/PlayingScreen.test.tsx`

- [ ] **Step 18.1: Write the test**

`tests/ui/PlayingScreen.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PlayingScreen } from '../../src/ui/screens/PlayingScreen';

describe('PlayingScreen', () => {
  it('renders round 1, player Chump, opponent Carnage', () => {
    render(<PlayingScreen />);
    expect(screen.getByRole('heading', { name: /Round 1/ })).toBeInTheDocument();
    expect(screen.getByTestId('player-pop')).toHaveTextContent('33M');
    expect(screen.getByTestId('opp-pop')).toHaveTextContent('25M');
  });

  it('queues an order and removes it', async () => {
    const user = userEvent.setup();
    render(<PlayingScreen />);
    await user.click(screen.getByRole('button', { name: 'Build factory' }));
    expect(within(screen.getByTestId('queue')).getAllByRole('listitem')).toHaveLength(1);
    await user.click(screen.getByRole('button', { name: /remove order 0/ }));
    expect(within(screen.getByTestId('queue')).queryAllByRole('listitem')).toHaveLength(0);
  });

  it('advances rounds when resolve is clicked', async () => {
    const user = userEvent.setup();
    render(<PlayingScreen />);
    await user.click(screen.getByTestId('resolve'));
    expect(screen.getByRole('heading', { name: /Round 2/ })).toBeInTheDocument();
  });

  it('plays through to a game-over outcome within bounded clicks', async () => {
    const user = userEvent.setup();
    render(<PlayingScreen />);
    // Click resolve up to 60 rounds; AI-vs-AI determinism guarantees an outcome quickly.
    for (let i = 0; i < 60; i++) {
      const banner = screen.queryByTestId('outcome');
      if (banner) break;
      await user.click(screen.getByTestId('resolve'));
    }
    expect(screen.getByTestId('outcome')).toBeInTheDocument();
  }, 20_000);
});
```

- [ ] **Step 18.2: Run test, expect PASS**

Run: `npm run test:run -- tests/ui/PlayingScreen.test.tsx`
Expected: PASS, 4 tests.

- [ ] **Step 18.3: Commit**

```bash
git add tests/ui/PlayingScreen.test.tsx
git commit -m "ui: add RTL play-through test reaching a game-over outcome"
```

---

## Task 19: Manual browser smoke

**Files:** none (manual verification)

- [ ] **Step 19.1: Run the full test suite**

Run: `npm run test:run`
Expected: all engine + UI suites PASS.

- [ ] **Step 19.2: Run the dev server**

Run: `npm run dev`
Expected: Vite prints `Local: http://localhost:5173/`. Open it in a browser.

- [ ] **Step 19.3: Play one game**

In the browser:

1. Verify Round 1 header, Chump pop=33M, Carnage pop=25M.
2. Click "Build factory" — order queue shows the order, AP counter reflects the cost.
3. Click "× (remove order 0)" — queue empties.
4. Click "Build missile" then "Build warhead-S" then "Resolve round" — round advances to 2; log shows the build events.
5. After Chump has stocked missile + warhead-S, click "Launch missile+S at Carnage" + "Resolve round" — log shows MissileLaunched + ImpactPeople (or MissileIntercepted on subsequent rounds once Carnage's AI builds shields, though in P1 the AI doesn't build defences so this won't happen).
6. Continue until "Game over" banner appears with `survivor` or `pyrrhic` outcome.
7. Click "New game" — round counter resets to 1 with a fresh seed.

If any of these steps fails or the UI throws in the console, STOP — capture the error in a new GitHub issue (or local note) and decide whether to fix in this phase or punt to Phase 2.

- [ ] **Step 19.4: Stop the dev server**

Press `Ctrl+C` in the dev-server terminal.

- [ ] **Step 19.5: No commit (manual verification only)**

---

## Task 20: README + handoff commit

**Files:**
- Modify: `README.md`

- [ ] **Step 20.1: Append a "Phase 1 status" section to `README.md`**

Add after the Quickstart section:

```markdown
## Phase 1 status

Phase 1 ships a 2-leader playable slice with placeholder UI. To play:

1. `npm install`
2. `npm run dev`
3. Open `http://localhost:5173`. You play Chump against AI Carnage.

What works in Phase 1:

- Build factory / missile / small warhead.
- Launch a missile-plus-small-warhead at Carnage (kills 2M people).
- Round resolution with deterministic seeded RNG.
- Survivor / pyrrhic / apocalypse win conditions.
- Stub random AI for Carnage.

What lands in later phases (`docs/superpowers/plans/`):

- Phase 2: bombers, defences, infra targeting, propaganda, wooing, full 6-leader cast, hotseat, asymmetric AI personalities, all win conditions including dominance, Final Retaliation.
- Phase 3: production UI per the four mockups in `docs/superpowers/mockups/`.
- Phase 4: flavour bank, Disparage cameo, masthead rotation, audio, persistence, replay scrubber, PWA, world-map animations.
```

- [ ] **Step 20.2: Verify all tests still pass**

Run: `npm run test:run && npm run typecheck`
Expected: both exit 0.

- [ ] **Step 20.3: Final commit**

```bash
git add README.md
git commit -m "docs: phase 1 status note in readme"
```

---

## Self-review checklist (run before handoff)

- [ ] **Spec coverage (P1 scope only)**: Every item in "Phase 1 scope — IN" has a task that implements it. Items in "Phase 1 scope — OUT" are explicitly deferred.
- [ ] **Placeholder scan**: No "TBD", "implement later", or undefined symbols in any task. (None expected — all code blocks are concrete.)
- [ ] **Type consistency**: `LeaderId` strings match across all tasks; `Order` kinds and `ResolutionEvent` kinds match between `types.ts` and the modules consuming them. `'mileigh-hem'` is the canonical id throughout.
- [ ] **No engine→ui imports**: search engine code for `from '../ui'` — should be zero results.
- [ ] **No `Math.random` in engine**: search engine code — should be zero results outside `rng.ts`.
- [ ] **Determinism gate**: Task 14's determinism test runs same-seed games to identical state.

---

## Completion handoff

After Task 20 commits, the branch is ready for review and merge.

- **REQUIRED SUB-SKILL:** Use `superpowers:finishing-a-development-branch` to verify tests, present integration options, and execute the choice (merge to main / open PR / cleanup).
- After merge, write **Phase 2's plan** before starting any P2 implementation. The next plan file should live at `docs/superpowers/plans/<date>-phase-2-full-mechanics.md` and follow the same format.
