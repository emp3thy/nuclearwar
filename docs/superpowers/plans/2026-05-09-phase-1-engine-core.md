# Phase 1: Engine Core — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Date:** 2026-05-09
**Spec:** `docs/superpowers/specs/2026-05-08-nuke-design.md`
**Branch:** `feat/p1-engine-core` (off `main`)

**Goal:** Stand up a TypeScript + Vitest project skeleton and build a fully tested, deterministic, pure-TS game engine that resolves a complete round of nuke headlessly. The engine implements the full action set, all four win conditions, intercepts, propaganda, wooing, Final Retaliation cascades, and AP banking — but has **no AI personalities** (Phase 2) and **no UI** (Phase 3). End-of-phase verification is `npm run test:run` going green; there is no browser demo.

**Architecture:** Pure-TS engine in `src/engine/` with zero React dependencies. Engine surface: `reduce(state, action)`, `resolveRound(state)`, `initialState(opts)`, plus order helpers `apCostOf` / `validateOrder`. RNG state lives inside `GameState.rngState`; resolution is fully deterministic given a seed. The engine never references `Math.random()` or `Date.now()`.

**Tech Stack:** TypeScript 5.4, Vitest 1, Node 20+. Vite + React are intentionally absent — they arrive in Phase 3 when the UI lands.

## Phase plan (this is Phase 1 of 4)

- **Phase 1 (this plan):** Engine core. Scaffold + full deterministic engine + Vitest verification. No UI, no AI personalities.
- Phase 2: AI personalities. Implement `planAi(state, leaderId)` per spec §7 (six per-leader scoring functions, difficulty levels, AI-duel headless test mode). Still no UI.
- Phase 3: UI screens. Add Vite + React, implement the seven mockup-faithful screens (Setup → Hotseat Handoff → Planning → AI Conferring → Action world-map → Round Summary tabloid → Winners). RTL component tests + Playwright end-to-end.
- Phase 4: Polish. Flavour bank wiring, Disparage cameo, masthead rotation, audio, save/replay scrubber, PWA, animations.

## Phase 1 scope — IN

- Project scaffold: TypeScript, Vitest, package scripts (`test`, `test:run`, `typecheck`).
- Engine type surface — full and final for v1: `GameState`, `Leader`, `Stockpile`, `Order` (all 8 kinds), `ResolutionEvent` (all kinds), `Action`, `WinOutcome`, `GameConfig`.
- Balance constants — full set: all 6 leader profiles, all AP costs, all yield damage profiles, propaganda transfer amount, woo decay, dominance threshold, AP banking cap, factory AP rate.
- Seeded mulberry32 RNG with pure-functional state threading.
- Initial state factory supporting any 3-of-6 to 6-of-6 cast configuration.
- Order AP cost (`apCostOf`, `totalApCost`) and per-order validation (`validateOrder`).
- Reducer handling `NEW_GAME`, `SUBMIT_ORDERS`, `RESOLVE_ROUND`, `LOAD_STATE`.
- Combat: `interceptProbability` (per spec §6 overwhelm curve), `peopleDeaths`, `factoriesDestroyed`.
- Defence-build phase (resolves first within a round, per spec §3).
- Other-build phase (factories, missiles, bombers, warheads).
- Propaganda phase: transfer N M population from target to propagandist; `PropagandaTransfer` event.
- Wooing phase: increment target's `favourability[me]`; `WooApplied` event; favourability decays each round.
- Launch phase: deterministic attacker order (leader-id ASC, then order index ASC); intercept rolls per the Nth-incoming curve; people / infrastructure targeting.
- Final Retaliation: when a leader's pop reaches 0 in a round, all their remaining warheads launch at random surviving opponents; cascades correctly when FR kills another leader.
- Win conditions (all four): `survivor`, `pyrrhic`, `apocalypse`, `dominance`.
- Resolution orchestrator (`resolveRound`) implementing spec §3's phase order: **Defences → Builds → Propaganda → Wooing → Launches → Final Retaliations → status update**. Returns `{ state, events }`.
- AP banking + per-leader bonus rules (Chump defence-waste penalty, Mileigh-hem aggression bonus, Netanyahoo launch bonus).
- Determinism property: same seed + same orders → identical events across many runs.
- A scripted-orders test helper used by integration + property tests (lives in `tests/helpers/`, not `src/`).
- README quickstart + phase status.

## Phase 1 scope — OUT (defer to later phases)

- AI personalities / `planAi` / per-leader scoring functions (Phase 2).
- Difficulty levels (Phase 2).
- AI-duel headless test mode (Phase 2).
- Any UI: no Vite, no React, no screens, no components, no styling (Phase 3).
- Setup picker, Hotseat Handoff, Planning screen, Action animations, Round Summary tabloid, Winners replay scrubber (Phase 3).
- Flavour bank wiring, line picking, Disparage cameo, masthead rotation, snap-back lines (Phase 4).
- Audio, persistence to localStorage, replay scrubber, PWA, world-map animations (Phase 4).

---

## Confidence summary

Per the established workflow rule (every task gets a percentage; sub-95% gets inline mitigation; sub-90% must be lifted before execution or surfaced explicitly), here is the matrix after this plan's mitigation passes.

| # | Task | Confidence | Notes |
|---|---|---|---|
| 1 | Project scaffold | 95% | Standard TS+Vitest boilerplate. |
| 2 | Engine types | 97% | Pure declarative; tsc verifies. |
| 3 | Balance constants | 96% | Spec values transcribed; tunables flagged. |
| 4 | Seeded RNG | 92% | mulberry32 canonical; `mix32` test-quality only matters in P2. |
| 5 | Initial state factory | 95% | 3-of-6 cast support tested. |
| 6 | Order AP cost + validation | 94% | Exhaustive switch over 8 order kinds. |
| 7 | Combat (intercepts + damage) | 96% | Spec §6 curve asserted directly. |
| 8 | Build phase | 94% | Defence-first ordering; tested. |
| 9 | Propaganda phase | 93% | Transfer-to-sender convention; tunable amount. |
| 10 | Wooing + decay | 94% | Field exists for P2 AI; tests cover writes + decay. |
| 11 | Launch phase | 94% | **Lifted from 88%** by splitting stock consumption out of `applyLaunches`. |
| 12 | Final Retaliation cascade | 91% | **Lifted from 80%** by removing the push-stock-back kludge. |
| 13 | Win conditions | 95% | Priority order pinned by tests. |
| 14 | Resolution orchestrator | 92% | State-vs-s discipline + sealed-orders read pattern documented inline. |
| 15 | Reducer | 93% | First-failure-rejects-batch contract tested. |
| 16 | Engine public barrel | 97% | Pure re-export. |
| 17 | Scripted-orders + integration | 92% | Heuristic test helper; outcome-reachability test compensates. |
| 18 | Determinism property test | 90% | Full-log equality across 25 seeds; structural guarantees in self-review. |
| 19 | Final verify + README | 99% | Trivial. |

**Pre-execution lift summary:** Tasks 11 and 12 were initially below 90% because `applyLaunches` did stock consumption + intercept + damage in one pass, forcing Final Retaliation to push stock back so it could be re-consumed — fragile and confusing. Splitting `consumeStockFor` out of `applyLaunches` eliminated the kludge and lifted both tasks above 90% before this plan reaches the executor. No tasks remain below 90%; eight tasks (4, 6, 8, 9, 10, 14, 15, 17, 18 plus 11–12) carry inline `step-note` annotations describing residual sub-95 risk and the mitigation already applied.

**Recommendations the executor should NOT skip:**

1. Before merging, run `grep -r "Math.random" src/engine` — must return zero. (Determinism gate.)
2. Before merging, run `grep -r "Date.now" src/engine` — must return zero.
3. Before merging, run `grep -rn "from '../ui'" src/engine` — must return zero. (Engine purity gate.)
4. Confirm the 25-seed determinism test runs in &lt;30s on Windows; if it doesn't, drop to 10 seeds rather than weaken the assertion.

---

## File map

### Project root (Task 1)

- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vitest.config.ts`
- Create: `README.md`

### Engine (Tasks 2–16)

- Create: `src/engine/types.ts`
- Create: `src/engine/balance.ts`
- Create: `src/engine/rng.ts`
- Create: `src/engine/state.ts`
- Create: `src/engine/orders.ts`
- Create: `src/engine/combat.ts`
- Create: `src/engine/builds.ts`
- Create: `src/engine/propaganda.ts`
- Create: `src/engine/diplomacy.ts`
- Create: `src/engine/launches.ts`
- Create: `src/engine/finalRetaliation.ts`
- Create: `src/engine/winConditions.ts`
- Create: `src/engine/resolution.ts`
- Create: `src/engine/reducer.ts`
- Create: `src/engine/index.ts`

### Tests (interleaved with engine tasks)

- Create: `tests/engine/balance.test.ts`
- Create: `tests/engine/rng.test.ts`
- Create: `tests/engine/state.test.ts`
- Create: `tests/engine/orders.test.ts`
- Create: `tests/engine/combat.test.ts`
- Create: `tests/engine/builds.test.ts`
- Create: `tests/engine/propaganda.test.ts`
- Create: `tests/engine/diplomacy.test.ts`
- Create: `tests/engine/launches.test.ts`
- Create: `tests/engine/finalRetaliation.test.ts`
- Create: `tests/engine/winConditions.test.ts`
- Create: `tests/engine/resolution.test.ts`
- Create: `tests/engine/reducer.test.ts`
- Create: `tests/engine/integration.test.ts`
- Create: `tests/engine/determinism.test.ts`
- Create: `tests/helpers/scripted-orders.ts`

---

## Conventions

- **Commit cadence:** one logical commit per task. Test + impl land together.
- **TDD:** every code task starts with a failing test, then minimum code to pass.
- **Imports:** relative paths inside `src/engine/`; tests import from `../../src/engine/...`.
- **Strings:** parody names only (`'chump'`, `'khameneverhere'`, `'starmless'`, `'carnage'`, `'mileigh-hem'`, `'netanyahoo'`).
- **Determinism:** RNG state is part of `GameState`; no `Math.random()` / `Date.now()` in engine code.
- **Phase ordering inside `resolveRound`:** Defences → Builds → Propaganda → Wooing → Launches → Final Retaliations → status update (eliminations, AP refresh, win check). Spec §3 lists Defences→Builds→Propaganda→Launches→FR; wooing is folded into the diplomatic block right after propaganda.
- **Snapshot of starting populations** is taken at the very top of `resolveRound` so pyrrhic-win checks can reference round-start pop after deaths.
- **Eliminated leaders** can still appear as targets of in-flight launches earlier in the same phase block but are skipped by FR (only newly-eliminated leaders trigger FR).

---

## Task 1: Project scaffold

**Confidence: 95%** — standard TS + Vitest boilerplate; the only residual risk is `npm install` failing on transient registry/network issues, which is retryable.

**Files:**
- Create: `package.json`, `tsconfig.json`, `vitest.config.ts`, `README.md`

- [ ] **Step 1.1: Write `package.json`**

```json
{
  "name": "nuke",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "engines": {
    "node": ">=20"
  },
  "scripts": {
    "test": "vitest",
    "test:run": "vitest run",
    "typecheck": "tsc --noEmit"
  },
  "devDependencies": {
    "@types/node": "^20.12.7",
    "typescript": "^5.4.5",
    "vitest": "^1.5.0"
  }
}
```

- [ ] **Step 1.2: Write `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "exactOptionalPropertyTypes": false,
    "skipLibCheck": true,
    "isolatedModules": true,
    "resolveJsonModule": true,
    "noEmit": true,
    "types": ["vitest/globals", "node"]
  },
  "include": ["src", "tests"]
}
```

- [ ] **Step 1.3: Write `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
```

- [ ] **Step 1.4: Write `README.md`**

```markdown
# nuke

Browser-based parody nuclear-war game. See `docs/superpowers/specs/2026-05-08-nuke-design.md` for the full design spec.

## Status

Phase 1 ships the engine core (no UI, no AI personalities). Verification is `npm run test:run`.

## Quickstart

    npm install
    npm test             # vitest watch
    npm run test:run     # vitest single run
    npm run typecheck    # tsc --noEmit
```

- [ ] **Step 1.5: Install dependencies**

Run: `npm install`
Expected: install completes; `node_modules/` populated; `package-lock.json` written.

- [ ] **Step 1.6: Verify typecheck (no source files yet — pass with no errors)**

Run: `npm run typecheck`
Expected: exit code 0.

- [ ] **Step 1.7: Verify Vitest is wired**

Run: `npm run test:run`
Expected: exit code 0 with "No test files found" (Vitest treats zero tests as a non-fatal pass).

- [ ] **Step 1.8: Create the implementation branch and commit**

```bash
git checkout -b feat/p1-engine-core
git add package.json package-lock.json tsconfig.json vitest.config.ts README.md
git commit -m "scaffold: typescript + vitest project skeleton (engine-only)"
```

---

## Task 2: Engine types

**Confidence: 97%** — pure declarative TypeScript, verified by `tsc --noEmit`. No runtime risk. Only failure mode is a typo discovered when a downstream module tries to import.

**Files:**
- Create: `src/engine/types.ts`

The full type surface for v1 lands once. Later phases consume these types unchanged (or add to them — never rewrite).

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

export type BonusRule = 'chump-defence-waste' | 'mileigh-aggression-bonus' | 'netanyahoo-launch-bonus';

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
  /** how friendly *they* feel toward me; raised by my wooing */
  favourability: Partial<Record<LeaderId, number>>;
  /** Khameneverhere grudge counter; raised when *they* hit me */
  grudge: Partial<Record<LeaderId, number>>;
  /** Carnage threat-doubling input; rounds since *they* hit me */
  recentAggressionFrom: Partial<Record<LeaderId, number>>;
  bonusRule?: BonusRule;
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

/**
 * A resolved launch passed to `applyLaunches`. Stripped-down variant of the
 * launch order without the `kind` discriminator. Shared between the regular
 * launch phase (`collectLaunches` → `consumeStockFor` → `applyLaunches`) and
 * Final Retaliation (synthesises Launch[] from a dead leader's stockpile).
 */
export interface Launch {
  from: LeaderId;
  to: LeaderId;
  delivery: DeliveryType;
  warhead: Yield;
  targetType: TargetType;
}

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

export type WinOutcome =
  | { type: 'apocalypse' }
  | { type: 'survivor' | 'pyrrhic' | 'dominance'; winner: LeaderId };

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
  | { kind: 'FinalRetaliationTriggered'; by: LeaderId; targets: LeaderId[] }
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

**Confidence: 96%** — values transcribed from spec §2 / §4 / §6 and asserted in test. Residual risk: a tunable like `PROPAGANDA_TRANSFER_M=1` may turn out to be wrong for game balance, but that's a design tuning concern surfaced in P2 / P4 playtesting, not a P1 correctness risk.

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
  WOO_FAVOURABILITY_DECAY,
  DOMINANCE_THRESHOLD_DEFAULT,
} from '../../src/engine/balance';

describe('LEADER_PROFILES', () => {
  it('defines a profile for every leader id', () => {
    const ids = Object.keys(LEADER_PROFILES).sort();
    expect(ids).toEqual(
      ['carnage', 'chump', 'khameneverhere', 'mileigh-hem', 'netanyahoo', 'starmless'].sort(),
    );
  });

  it('matches spec starting values', () => {
    expect(LEADER_PROFILES.chump.startPop).toBe(33);
    expect(LEADER_PROFILES.chump.startFactories).toBe(10);
    expect(LEADER_PROFILES.chump.startAp).toBe(5);
    expect(LEADER_PROFILES.khameneverhere.startPop).toBe(28);
    expect(LEADER_PROFILES.starmless.startPop).toBe(25);
    expect(LEADER_PROFILES.carnage.startPop).toBe(25);
    expect(LEADER_PROFILES['mileigh-hem'].startPop).toBe(22);
    expect(LEADER_PROFILES['mileigh-hem'].startFactories).toBe(4);
    expect(LEADER_PROFILES['mileigh-hem'].startAp).toBe(2);
    expect(LEADER_PROFILES.netanyahoo.startPop).toBe(18);
  });

  it('attaches bonus rule keys for the three leaders that have them', () => {
    expect(LEADER_PROFILES.chump.bonusRule).toBe('chump-defence-waste');
    expect(LEADER_PROFILES['mileigh-hem'].bonusRule).toBe('mileigh-aggression-bonus');
    expect(LEADER_PROFILES.netanyahoo.bonusRule).toBe('netanyahoo-launch-bonus');
    expect(LEADER_PROFILES.carnage.bonusRule).toBeUndefined();
  });
});

describe('ACTION_COSTS', () => {
  it('matches spec §4 costs', () => {
    expect(ACTION_COSTS.buildFactory).toBe(3);
    expect(ACTION_COSTS.buildMissile).toBe(1);
    expect(ACTION_COSTS.buildBomber).toBe(1);
    expect(ACTION_COSTS.buildWarheadSmall).toBe(1);
    expect(ACTION_COSTS.buildWarheadMedium).toBe(2);
    expect(ACTION_COSTS.buildWarheadLarge).toBe(3);
    expect(ACTION_COSTS.buildDefence).toBe(2);
    expect(ACTION_COSTS.launch).toBe(2);
    expect(ACTION_COSTS.propaganda).toBe(1);
    expect(ACTION_COSTS.wooPerPoint).toBe(1);
  });
});

describe('YIELD_DAMAGE', () => {
  it('matches spec §6 damage profiles', () => {
    expect(YIELD_DAMAGE.small).toEqual({ peopleDeaths: 2, factoriesDestroyed: 1 });
    expect(YIELD_DAMAGE.medium).toEqual({ peopleDeaths: 6, factoriesDestroyed: 2 });
    expect(YIELD_DAMAGE.large).toEqual({ peopleDeaths: 15, factoriesDestroyed: 3 });
  });
});

describe('economy constants', () => {
  it('matches spec values', () => {
    expect(FACTORY_AP_RATE).toBe(0.5);
    expect(AP_BANK_CAP).toBe(2);
    expect(PROPAGANDA_TRANSFER_M).toBeGreaterThan(0);
    expect(WOO_FAVOURABILITY_DECAY).toBeGreaterThan(0);
    expect(DOMINANCE_THRESHOLD_DEFAULT).toBe(2);
  });
});
```

- [ ] **Step 3.2: Run test, expect FAIL**

Run: `npm run test:run -- tests/engine/balance.test.ts`
Expected: FAIL — module not found.

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
    bonusRule?: BonusRule;
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
/** Population (in millions) transferred from victim to propagandist per propaganda order. Tunable. */
export const PROPAGANDA_TRANSFER_M = 1;
/** Favourability points decayed per round per relationship. Tunable. */
export const WOO_FAVOURABILITY_DECAY = 1;
export const DOMINANCE_THRESHOLD_DEFAULT = 2;
```

- [ ] **Step 3.4: Run test, expect PASS**

Run: `npm run test:run -- tests/engine/balance.test.ts`
Expected: PASS.

- [ ] **Step 3.5: Commit**

```bash
git add src/engine/balance.ts tests/engine/balance.test.ts
git commit -m "engine: add balance constants and 6-leader profiles"
```

---

## Task 4: Seeded RNG

**Confidence: 92%** — mulberry32 + FNV-1a are canonical and well-tested patterns; my impl matches the textbook versions. Residual risk: `mix32` is xxhash-style and only used for derived sub-seeds (not in P1's hot path). If it has a subtle bias, the failure surfaces in P2's `planAi` where mix32 derives per-leader sub-seeds. Mitigation: P1 doesn't depend on `mix32`'s distribution quality — its only test asserts determinism + order-sensitivity, both of which pass for any non-degenerate hash.

**Files:**
- Create: `src/engine/rng.ts`
- Create: `tests/engine/rng.test.ts`

Pure-functional mulberry32. Each call takes a state number and returns the next value plus the next state. State threads through `GameState.rngState`.

- [ ] **Step 4.1: Write the failing test**

`tests/engine/rng.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { nextRandom, nextInt, seedFromString, mix32 } from '../../src/engine/rng';

describe('nextRandom', () => {
  it('produces deterministic sequence from a fixed seed', () => {
    let s = 1;
    const seq: number[] = [];
    for (let i = 0; i < 5; i++) {
      const r = nextRandom(s);
      seq.push(r.value);
      s = r.state;
    }
    let s2 = 1;
    const seq2: number[] = [];
    for (let i = 0; i < 5; i++) {
      const r = nextRandom(s2);
      seq2.push(r.value);
      s2 = r.state;
    }
    expect(seq).toEqual(seq2);
  });

  it('produces different sequences from different seeds', () => {
    expect(nextRandom(1).value).not.toBe(nextRandom(2).value);
  });

  it('returns values in [0, 1)', () => {
    let s = 42;
    for (let i = 0; i < 200; i++) {
      const r = nextRandom(s);
      expect(r.value).toBeGreaterThanOrEqual(0);
      expect(r.value).toBeLessThan(1);
      s = r.state;
    }
  });
});

describe('nextInt', () => {
  it('returns integers in [0, max)', () => {
    let s = 7;
    for (let i = 0; i < 200; i++) {
      const r = nextInt(s, 5);
      expect(Number.isInteger(r.value)).toBe(true);
      expect(r.value).toBeGreaterThanOrEqual(0);
      expect(r.value).toBeLessThan(5);
      s = r.state;
    }
  });
});

describe('seedFromString', () => {
  it('is deterministic and order-sensitive', () => {
    expect(seedFromString('hello')).toBe(seedFromString('hello'));
    expect(seedFromString('hello')).not.toBe(seedFromString('world'));
    expect(seedFromString('abc')).not.toBe(seedFromString('cba'));
  });
});

describe('mix32', () => {
  it('is deterministic and order-sensitive', () => {
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
// caller threads `state` through; no mutable closures so saves capture rng
// position cleanly.

export interface RngStep {
  value: number;
  state: number;
}

export function nextRandom(state: number): RngStep {
  const t = (state + 0x6d2b79f5) >>> 0;
  let r = t;
  r = Math.imul(r ^ (r >>> 15), r | 1);
  r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
  return {
    value: ((r ^ (r >>> 14)) >>> 0) / 4294967296,
    state: t,
  };
}

export function nextInt(state: number, maxExclusive: number): RngStep {
  const r = nextRandom(state);
  return { value: Math.floor(r.value * maxExclusive), state: r.state };
}

// FNV-1a 32-bit string hash → seed.
export function seedFromString(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// Order-sensitive integer mixer (xxhash-style avalanche). Useful for deriving
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
Expected: PASS.

- [ ] **Step 4.5: Commit**

```bash
git add src/engine/rng.ts tests/engine/rng.test.ts
git commit -m "engine: add seeded mulberry32 rng with pure-functional state"
```

---

## Task 5: Initial state factory

**Confidence: 95%** — straightforward struct construction from `LEADER_PROFILES`. Tests cover 2/3/5-leader cast configurations and `startPopOverride`. Residual risk: spread/clone semantics of `Partial<GameConfig>` merge with defaults; the test asserts dominanceThreshold/fastPlay defaults explicitly.

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
  });

  it('supports a 3-leader cast', () => {
    const s = initialState({
      cast: ['chump', 'carnage', 'starmless'],
      difficulty: 'normal',
      seed: 'x',
    });
    expect(s.cast).toEqual(['chump', 'carnage', 'starmless']);
    expect(Object.keys(s.leaders).sort()).toEqual(['carnage', 'chump', 'starmless']);
    expect(s.leaders.starmless.population).toBe(25);
  });

  it('supports a 5-leader cast', () => {
    const s = initialState({
      cast: ['chump', 'carnage', 'starmless', 'netanyahoo', 'mileigh-hem'],
      difficulty: 'normal',
      seed: 'x',
    });
    expect(s.cast).toHaveLength(5);
  });

  it('seeds an empty stockpile and zeroed relations', () => {
    const s = initialState({ cast: ['chump', 'carnage'], difficulty: 'normal', seed: 'x' });
    expect(s.leaders.chump.stockpile).toEqual({
      missiles: 0,
      bombers: 0,
      warheadsSmall: 0,
      warheadsMedium: 0,
      warheadsLarge: 0,
      shields: 0,
      aa: 0,
    });
    expect(s.leaders.chump.favourability).toEqual({});
    expect(s.leaders.chump.grudge).toEqual({});
    expect(s.leaders.chump.recentAggressionFrom).toEqual({});
  });

  it('honours startPopOverride from config', () => {
    const s = initialState({
      cast: ['chump', 'carnage'],
      difficulty: 'normal',
      seed: 'x',
      config: { startPopOverride: { chump: 10 } },
    });
    expect(s.leaders.chump.population).toBe(10);
    expect(s.leaders.carnage.population).toBe(25);
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
import { DOMINANCE_THRESHOLD_DEFAULT, LEADER_PROFILES } from './balance';
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
Expected: PASS.

- [ ] **Step 5.5: Commit**

```bash
git add src/engine/state.ts tests/engine/state.test.ts
git commit -m "engine: add initialState factory supporting 3-6 cast"
```

---

## Task 6: Order AP cost + validation

**Confidence: 94%** — exhaustive switch over the 8-kind `Order` union; tests cover every kind, plus self-target / dead-target / no-stock edge cases. Residual risk: a future addition to the `Order` union will cause TS exhaustiveness checking to flag the missing case — failure surfaces at compile time, not runtime.

**Files:**
- Create: `src/engine/orders.ts`
- Create: `tests/engine/orders.test.ts`

- [ ] **Step 6.1: Write the failing test**

`tests/engine/orders.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { apCostOf, totalApCost, validateOrder } from '../../src/engine/orders';
import { initialState } from '../../src/engine/state';

describe('apCostOf', () => {
  it('matches spec costs', () => {
    expect(apCostOf({ kind: 'build-factory' })).toBe(3);
    expect(apCostOf({ kind: 'build-missile' })).toBe(1);
    expect(apCostOf({ kind: 'build-bomber' })).toBe(1);
    expect(apCostOf({ kind: 'build-warhead', yield: 'small' })).toBe(1);
    expect(apCostOf({ kind: 'build-warhead', yield: 'medium' })).toBe(2);
    expect(apCostOf({ kind: 'build-warhead', yield: 'large' })).toBe(3);
    expect(apCostOf({ kind: 'build-defence', type: 'shield' })).toBe(2);
    expect(apCostOf({ kind: 'build-defence', type: 'aa' })).toBe(2);
    expect(
      apCostOf({
        kind: 'launch',
        target: 'carnage',
        delivery: 'missile',
        warhead: 'small',
        targetType: 'people',
      }),
    ).toBe(2);
    expect(apCostOf({ kind: 'propaganda', target: 'carnage' })).toBe(1);
    expect(apCostOf({ kind: 'woo', target: 'carnage', points: 3 })).toBe(3);
  });
});

describe('totalApCost', () => {
  it('sums costs across an order list', () => {
    expect(
      totalApCost([
        { kind: 'build-factory' },
        { kind: 'build-missile' },
        { kind: 'build-warhead', yield: 'small' },
      ]),
    ).toBe(5);
  });

  it('returns 0 for empty list', () => {
    expect(totalApCost([])).toBe(0);
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

  it('rejects self-targeted launches', () => {
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

  it('rejects launches at dead targets', () => {
    const s = structuredClone(baseState);
    s.leaders.chump.stockpile.missiles = 1;
    s.leaders.chump.stockpile.warheadsSmall = 1;
    s.leaders.carnage.alive = false;
    const r = validateOrder(s, 'chump', {
      kind: 'launch',
      target: 'carnage',
      delivery: 'missile',
      warhead: 'small',
      targetType: 'people',
    });
    expect(r.ok).toBe(false);
  });

  it('rejects woo orders with non-positive points', () => {
    const r = validateOrder(baseState, 'chump', {
      kind: 'woo',
      target: 'carnage',
      points: 0,
    });
    expect(r.ok).toBe(false);
  });

  it('accepts build orders unconditionally', () => {
    expect(validateOrder(baseState, 'chump', { kind: 'build-factory' }).ok).toBe(true);
    expect(validateOrder(baseState, 'chump', { kind: 'build-defence', type: 'shield' }).ok).toBe(true);
  });
});
```

- [ ] **Step 6.2: Run test, expect FAIL**

Run: `npm run test:run -- tests/engine/orders.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 6.3: Write `src/engine/orders.ts`**

```ts
import type { GameState, LeaderId, Order, Stockpile, Yield } from './types';
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
      if (warheadStock(me.stockpile, o.warhead) < 1) {
        return { ok: false, reason: 'no-warhead' };
      }
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

function warheadStock(s: Stockpile, y: Yield): number {
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
Expected: PASS.

- [ ] **Step 6.5: Commit**

```bash
git add src/engine/orders.ts tests/engine/orders.test.ts
git commit -m "engine: add order ap-cost + per-order validation"
```

---

## Task 7: Combat — intercept curve + damage

**Confidence: 96%** — three small pure functions; tests assert spec §6 curve values directly (1.0 → 0.75 → 0.5 → 0.25 → 0) plus damage caps. Trivial to verify by inspection.

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

  it('handles zero defenders (overflow=N)', () => {
    expect(interceptProbability(1, 0)).toBe(0.75);
    expect(interceptProbability(2, 0)).toBe(0.5);
    expect(interceptProbability(3, 0)).toBe(0.25);
    expect(interceptProbability(4, 0)).toBe(0);
  });
});

describe('peopleDeaths', () => {
  it('returns spec damage and caps at current population', () => {
    expect(peopleDeaths('small', 100)).toBe(2);
    expect(peopleDeaths('medium', 100)).toBe(6);
    expect(peopleDeaths('large', 100)).toBe(15);
    expect(peopleDeaths('large', 5)).toBe(5);
    expect(peopleDeaths('small', 1)).toBe(1);
    expect(peopleDeaths('small', 0)).toBe(0);
  });
});

describe('factoriesDestroyed', () => {
  it('returns spec damage and caps at current factories', () => {
    expect(factoriesDestroyed('small', 5)).toBe(1);
    expect(factoriesDestroyed('medium', 5)).toBe(2);
    expect(factoriesDestroyed('large', 5)).toBe(3);
    expect(factoriesDestroyed('large', 1)).toBe(1);
    expect(factoriesDestroyed('large', 0)).toBe(0);
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

// Spec §6 overwhelm curve: N <= S → 1.0; overflow N-S → 0.75 / 0.5 / 0.25 / 0.
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
Expected: PASS.

- [ ] **Step 7.5: Commit**

```bash
git add src/engine/combat.ts tests/engine/combat.test.ts
git commit -m "engine: add intercept curve and damage cap helpers"
```

---

## Task 8: Build phase

**Confidence: 94%** — straightforward switch over build kinds; tests assert each yield variant + defence variant lands in the right `Stockpile` field. Residual risk: ordering inside `applyOtherBuilds` matters for event-stream determinism; tests assert the order matches submission.

**Files:**
- Create: `src/engine/builds.ts`
- Create: `tests/engine/builds.test.ts`

Spec §3 has Defences resolving before other builds, so this module exposes two functions: `applyDefenceBuilds` (defence-build orders only) and `applyOtherBuilds` (everything else). Both ignore non-build orders so they're safe to call with the full order list.

- [ ] **Step 8.1: Write the failing test**

`tests/engine/builds.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { applyDefenceBuilds, applyOtherBuilds } from '../../src/engine/builds';
import { initialState } from '../../src/engine/state';
import type { Order } from '../../src/engine/types';

describe('applyDefenceBuilds', () => {
  it('only applies defence builds', () => {
    const s = initialState({ cast: ['chump', 'carnage'], difficulty: 'normal', seed: 'x' });
    const orders: Order[] = [
      { kind: 'build-factory' },
      { kind: 'build-defence', type: 'shield' },
      { kind: 'build-defence', type: 'aa' },
    ];
    const r = applyDefenceBuilds(s, 'chump', orders);
    expect(r.state.leaders.chump.stockpile.shields).toBe(1);
    expect(r.state.leaders.chump.stockpile.aa).toBe(1);
    expect(r.state.leaders.chump.factories).toBe(10); // unchanged
    expect(r.events.map((e) => e.kind)).toEqual(['DefenceBuilt', 'DefenceBuilt']);
  });
});

describe('applyOtherBuilds', () => {
  it('applies a build-factory order', () => {
    const s = initialState({ cast: ['chump', 'carnage'], difficulty: 'normal', seed: 'x' });
    const r = applyOtherBuilds(s, 'chump', [{ kind: 'build-factory' }]);
    expect(r.state.leaders.chump.factories).toBe(11);
    expect(r.events).toEqual([{ kind: 'FactoryBuilt', by: 'chump' }]);
  });

  it('applies stockpile builds in submitted order', () => {
    const s = initialState({ cast: ['chump', 'carnage'], difficulty: 'normal', seed: 'x' });
    const orders: Order[] = [
      { kind: 'build-missile' },
      { kind: 'build-bomber' },
      { kind: 'build-warhead', yield: 'small' },
      { kind: 'build-warhead', yield: 'medium' },
      { kind: 'build-warhead', yield: 'large' },
    ];
    const r = applyOtherBuilds(s, 'chump', orders);
    const sp = r.state.leaders.chump.stockpile;
    expect(sp.missiles).toBe(1);
    expect(sp.bombers).toBe(1);
    expect(sp.warheadsSmall).toBe(1);
    expect(sp.warheadsMedium).toBe(1);
    expect(sp.warheadsLarge).toBe(1);
    expect(r.events.map((e) => e.kind)).toEqual([
      'DeliveryBuilt',
      'DeliveryBuilt',
      'WarheadBuilt',
      'WarheadBuilt',
      'WarheadBuilt',
    ]);
  });

  it('ignores defence builds (handled in applyDefenceBuilds)', () => {
    const s = initialState({ cast: ['chump', 'carnage'], difficulty: 'normal', seed: 'x' });
    const r = applyOtherBuilds(s, 'chump', [{ kind: 'build-defence', type: 'shield' }]);
    expect(r.state.leaders.chump.stockpile.shields).toBe(0);
    expect(r.events).toHaveLength(0);
  });

  it('ignores non-build orders', () => {
    const s = initialState({ cast: ['chump', 'carnage'], difficulty: 'normal', seed: 'x' });
    const r = applyOtherBuilds(s, 'chump', [
      { kind: 'launch', target: 'carnage', delivery: 'missile', warhead: 'small', targetType: 'people' },
      { kind: 'propaganda', target: 'carnage' },
    ]);
    expect(r.events).toHaveLength(0);
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

export function applyDefenceBuilds(
  state: GameState,
  leaderId: LeaderId,
  orders: Order[],
): BuildsResult {
  const next: GameState = structuredClone(state);
  const leader = next.leaders[leaderId];
  const events: ResolutionEvent[] = [];
  for (const o of orders) {
    if (o.kind !== 'build-defence') continue;
    if (o.type === 'shield') leader.stockpile.shields += 1;
    else leader.stockpile.aa += 1;
    events.push({ kind: 'DefenceBuilt', by: leaderId, type: o.type });
  }
  return { state: next, events };
}

export function applyOtherBuilds(
  state: GameState,
  leaderId: LeaderId,
  orders: Order[],
): BuildsResult {
  const next: GameState = structuredClone(state);
  const leader = next.leaders[leaderId];
  const events: ResolutionEvent[] = [];
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
        else if (o.yield === 'medium') leader.stockpile.warheadsMedium += 1;
        else leader.stockpile.warheadsLarge += 1;
        events.push({ kind: 'WarheadBuilt', by: leaderId, yield: o.yield });
        break;
      // build-defence handled in applyDefenceBuilds
      // launch / propaganda / woo handled in their own phases
      default:
        break;
    }
  }
  return { state: next, events };
}
```

- [ ] **Step 8.4: Run test, expect PASS**

Run: `npm run test:run -- tests/engine/builds.test.ts`
Expected: PASS.

- [ ] **Step 8.5: Commit**

```bash
git add src/engine/builds.ts tests/engine/builds.test.ts
git commit -m "engine: add defence-first build phase resolvers"
```

---

## Task 9: Propaganda phase

**Confidence: 93%** — spec §4 is ambiguous on whether propaganda transfers population to the propagandist or just kills it; I picked transfer-to-sender per the word "steals". Tests cover cap-at-victim-pop, dead-target skip, deterministic id-ASC ordering. Residual risk: design intent for propaganda may differ; tunable via `PROPAGANDA_TRANSFER_M` and the transfer/destroy convention can flip in P2 playtesting without disrupting the engine surface.

**Files:**
- Create: `src/engine/propaganda.ts`
- Create: `tests/engine/propaganda.test.ts`

Spec §4: propaganda transfers `PROPAGANDA_TRANSFER_M` population from victim to propagandist. Event semantics: `from` = the propagandist (initiator of the action), `to` = the victim (loser of population), `amount` = millions transferred.

- [ ] **Step 9.1: Write the failing test**

`tests/engine/propaganda.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { applyPropaganda } from '../../src/engine/propaganda';
import { initialState } from '../../src/engine/state';
import { PROPAGANDA_TRANSFER_M } from '../../src/engine/balance';
import type { Order } from '../../src/engine/types';

describe('applyPropaganda', () => {
  it('transfers PROPAGANDA_TRANSFER_M from victim to propagandist', () => {
    const s = initialState({ cast: ['chump', 'carnage'], difficulty: 'normal', seed: 'x' });
    const orders: Partial<Record<'chump' | 'carnage', Order[]>> = {
      chump: [{ kind: 'propaganda', target: 'carnage' }],
      carnage: [],
    };
    const r = applyPropaganda(s, orders);
    expect(r.state.leaders.chump.population).toBe(33 + PROPAGANDA_TRANSFER_M);
    expect(r.state.leaders.carnage.population).toBe(25 - PROPAGANDA_TRANSFER_M);
    expect(r.events).toEqual([
      { kind: 'PropagandaTransfer', from: 'chump', to: 'carnage', amount: PROPAGANDA_TRANSFER_M },
    ]);
  });

  it('caps transfer at victim’s remaining population', () => {
    const s = initialState({ cast: ['chump', 'carnage'], difficulty: 'normal', seed: 'x' });
    s.leaders.carnage.population = 0;
    const orders = {
      chump: [{ kind: 'propaganda' as const, target: 'carnage' as const }],
      carnage: [],
    };
    const r = applyPropaganda(s, orders);
    expect(r.events).toHaveLength(0);
    expect(r.state.leaders.chump.population).toBe(33);
  });

  it('skips orders against dead targets', () => {
    const s = initialState({ cast: ['chump', 'carnage'], difficulty: 'normal', seed: 'x' });
    s.leaders.carnage.alive = false;
    s.leaders.carnage.population = 0;
    const orders = {
      chump: [{ kind: 'propaganda' as const, target: 'carnage' as const }],
      carnage: [],
    };
    const r = applyPropaganda(s, orders);
    expect(r.events).toHaveLength(0);
  });

  it('processes propagandists in deterministic id-ASC order', () => {
    const s = initialState({ cast: ['carnage', 'chump'], difficulty: 'normal', seed: 'x' });
    const orders = {
      chump: [{ kind: 'propaganda' as const, target: 'carnage' as const }],
      carnage: [{ kind: 'propaganda' as const, target: 'chump' as const }],
    };
    const r = applyPropaganda(s, orders);
    expect(r.events[0]).toMatchObject({ from: 'carnage', to: 'chump' });
    expect(r.events[1]).toMatchObject({ from: 'chump', to: 'carnage' });
  });
});
```

- [ ] **Step 9.2: Run test, expect FAIL**

Run: `npm run test:run -- tests/engine/propaganda.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 9.3: Write `src/engine/propaganda.ts`**

```ts
import type { GameState, LeaderId, Order, ResolutionEvent } from './types';
import { PROPAGANDA_TRANSFER_M } from './balance';

export interface PropagandaResult {
  state: GameState;
  events: ResolutionEvent[];
}

export function applyPropaganda(
  state: GameState,
  ordersByLeader: Partial<Record<LeaderId, Order[]>>,
): PropagandaResult {
  const next: GameState = structuredClone(state);
  const events: ResolutionEvent[] = [];
  const propagandists = Object.keys(ordersByLeader).sort() as LeaderId[];
  for (const id of propagandists) {
    const orders = ordersByLeader[id] ?? [];
    for (const o of orders) {
      if (o.kind !== 'propaganda') continue;
      const me = next.leaders[id];
      const target = next.leaders[o.target];
      if (!me || !me.alive || !target || !target.alive) continue;
      const amount = Math.min(PROPAGANDA_TRANSFER_M, target.population);
      if (amount <= 0) continue;
      target.population -= amount;
      me.population += amount;
      events.push({ kind: 'PropagandaTransfer', from: id, to: o.target, amount });
    }
  }
  return { state: next, events };
}
```

- [ ] **Step 9.4: Run test, expect PASS**

Run: `npm run test:run -- tests/engine/propaganda.test.ts`
Expected: PASS.

- [ ] **Step 9.5: Commit**

```bash
git add src/engine/propaganda.ts tests/engine/propaganda.test.ts
git commit -m "engine: add propaganda phase (capped pop transfer)"
```

---

## Task 10: Wooing phase + favourability decay

**Confidence: 94%** — symmetric to propaganda but on a `Partial<Record<LeaderId, number>>` field; tests cover accumulation, dead-target skip, and decay floor. Residual risk: the favourability field exists for AI personalities (P2) — its current behaviour is exercise-only in P1 (no AI consumer reads it).

**Files:**
- Create: `src/engine/diplomacy.ts`
- Create: `tests/engine/diplomacy.test.ts`

Wooing increments `target.favourability[me]` (the target's friendliness toward me). At round-end, all favourability values decay by `WOO_FAVOURABILITY_DECAY` (floor at 0).

- [ ] **Step 10.1: Write the failing test**

`tests/engine/diplomacy.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { applyWooing, decayFavourability } from '../../src/engine/diplomacy';
import { initialState } from '../../src/engine/state';
import { WOO_FAVOURABILITY_DECAY } from '../../src/engine/balance';
import type { Order } from '../../src/engine/types';

describe('applyWooing', () => {
  it('adds woo points to target.favourability[sender]', () => {
    const s = initialState({ cast: ['chump', 'carnage'], difficulty: 'normal', seed: 'x' });
    const orders: Partial<Record<'chump' | 'carnage', Order[]>> = {
      chump: [{ kind: 'woo', target: 'carnage', points: 3 }],
      carnage: [],
    };
    const r = applyWooing(s, orders);
    expect(r.state.leaders.carnage.favourability.chump).toBe(3);
    expect(r.events).toEqual([{ kind: 'WooApplied', from: 'chump', to: 'carnage', points: 3 }]);
  });

  it('accumulates across multiple woo orders', () => {
    const s = initialState({ cast: ['chump', 'carnage'], difficulty: 'normal', seed: 'x' });
    s.leaders.carnage.favourability.chump = 2;
    const orders = {
      chump: [{ kind: 'woo' as const, target: 'carnage' as const, points: 4 }],
      carnage: [],
    };
    const r = applyWooing(s, orders);
    expect(r.state.leaders.carnage.favourability.chump).toBe(6);
  });

  it('skips wooing dead targets', () => {
    const s = initialState({ cast: ['chump', 'carnage'], difficulty: 'normal', seed: 'x' });
    s.leaders.carnage.alive = false;
    const orders = {
      chump: [{ kind: 'woo' as const, target: 'carnage' as const, points: 3 }],
      carnage: [],
    };
    const r = applyWooing(s, orders);
    expect(r.events).toHaveLength(0);
  });
});

describe('decayFavourability', () => {
  it('reduces every favourability entry by WOO_FAVOURABILITY_DECAY, floored at 0', () => {
    const s = initialState({ cast: ['chump', 'carnage'], difficulty: 'normal', seed: 'x' });
    s.leaders.carnage.favourability.chump = 5;
    s.leaders.chump.favourability.carnage = 1;
    const r = decayFavourability(s);
    expect(r.leaders.carnage.favourability.chump).toBe(5 - WOO_FAVOURABILITY_DECAY);
    expect(r.leaders.chump.favourability.carnage).toBe(0);
  });
});
```

- [ ] **Step 10.2: Run test, expect FAIL**

Run: `npm run test:run -- tests/engine/diplomacy.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 10.3: Write `src/engine/diplomacy.ts`**

```ts
import type { GameState, LeaderId, Order, ResolutionEvent } from './types';
import { WOO_FAVOURABILITY_DECAY } from './balance';

export interface WooingResult {
  state: GameState;
  events: ResolutionEvent[];
}

export function applyWooing(
  state: GameState,
  ordersByLeader: Partial<Record<LeaderId, Order[]>>,
): WooingResult {
  const next: GameState = structuredClone(state);
  const events: ResolutionEvent[] = [];
  const senders = Object.keys(ordersByLeader).sort() as LeaderId[];
  for (const id of senders) {
    const orders = ordersByLeader[id] ?? [];
    for (const o of orders) {
      if (o.kind !== 'woo') continue;
      const me = next.leaders[id];
      const target = next.leaders[o.target];
      if (!me || !me.alive || !target || !target.alive) continue;
      const current = target.favourability[id] ?? 0;
      target.favourability[id] = current + o.points;
      events.push({ kind: 'WooApplied', from: id, to: o.target, points: o.points });
    }
  }
  return { state: next, events };
}

export function decayFavourability(state: GameState): GameState {
  const next: GameState = structuredClone(state);
  for (const id of next.cast) {
    const f = next.leaders[id].favourability;
    for (const k of Object.keys(f) as LeaderId[]) {
      const v = f[k] ?? 0;
      f[k] = Math.max(0, v - WOO_FAVOURABILITY_DECAY);
    }
  }
  return next;
}
```

- [ ] **Step 10.4: Run test, expect PASS**

Run: `npm run test:run -- tests/engine/diplomacy.test.ts`
Expected: PASS.

- [ ] **Step 10.5: Commit**

```bash
git add src/engine/diplomacy.ts tests/engine/diplomacy.test.ts
git commit -m "engine: add wooing phase + favourability decay"
```

---

## Task 11: Launch phase

**Confidence: 94%** — refactored from 88% by splitting stock consumption out of `applyLaunches`. Caller (regular launches phase or Final Retaliation) handles stock validation and consumption via `consumeStockFor`; `applyLaunches` is then a pure intercept-roll + damage-applier that doesn't care whether the attacker is alive (so FR firing from a corpse works without a kludge).

**Files:**
- Create: `src/engine/launches.ts`
- Create: `tests/engine/launches.test.ts`

Cross-leader phase. Three exports:

1. **`collectLaunches(orders)`** — pure: walks orders in attacker-id-ASC order, builds a `Launch[]`. No state, no validation.
2. **`consumeStockFor(state, launches)`** — validates each launch (attacker+receiver alive, stock available) and consumes stock for valid launches. Returns updated state and the filtered `Launch[]`.
3. **`applyLaunches(state, launches)`** — assumes stock has been pre-consumed by the caller. Rolls per-receiver Nth-incoming intercepts (RNG-driven), applies damage, emits events. Doesn't gate on attacker.alive (FR fires from a corpse).

Final Retaliation (Task 12) consumes stock during launch synthesis (because it pairs algorithmically) and then calls `applyLaunches` directly.

- [ ] **Step 11.1: Write the failing test**

`tests/engine/launches.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { applyLaunches, collectLaunches, consumeStockFor } from '../../src/engine/launches';
import { initialState } from '../../src/engine/state';
import type { Launch, Order } from '../../src/engine/types';

const smallLaunch: Launch = {
  from: 'chump',
  to: 'carnage',
  delivery: 'missile',
  warhead: 'small',
  targetType: 'people',
};

describe('collectLaunches', () => {
  it('emits launches in attacker id-ASC order', () => {
    const orders = {
      chump: [{
        kind: 'launch' as const,
        target: 'carnage' as const,
        delivery: 'missile' as const,
        warhead: 'small' as const,
        targetType: 'people' as const,
      }],
      carnage: [{
        kind: 'launch' as const,
        target: 'chump' as const,
        delivery: 'missile' as const,
        warhead: 'small' as const,
        targetType: 'people' as const,
      }],
    };
    const launches = collectLaunches(orders);
    expect(launches[0].from).toBe('carnage'); // 'carnage' < 'chump' alphabetically
    expect(launches[1].from).toBe('chump');
  });

  it('skips non-launch orders', () => {
    const orders: Partial<Record<'chump' | 'carnage', Order[]>> = {
      chump: [{ kind: 'build-factory' }, { kind: 'propaganda', target: 'carnage' }],
    };
    expect(collectLaunches(orders)).toHaveLength(0);
  });
});

describe('consumeStockFor', () => {
  it('consumes one missile + one warhead-S per valid launch and returns it', () => {
    const s = initialState({ cast: ['chump', 'carnage'], difficulty: 'normal', seed: 'x' });
    s.leaders.chump.stockpile.missiles = 1;
    s.leaders.chump.stockpile.warheadsSmall = 1;
    const r = consumeStockFor(s, [smallLaunch]);
    expect(r.state.leaders.chump.stockpile.missiles).toBe(0);
    expect(r.state.leaders.chump.stockpile.warheadsSmall).toBe(0);
    expect(r.validLaunches).toHaveLength(1);
  });

  it('drops launches when attacker has no delivery and does not consume stock', () => {
    const s = initialState({ cast: ['chump', 'carnage'], difficulty: 'normal', seed: 'x' });
    s.leaders.chump.stockpile.warheadsSmall = 1;
    // no missile
    const r = consumeStockFor(s, [smallLaunch]);
    expect(r.validLaunches).toHaveLength(0);
    expect(r.state.leaders.chump.stockpile.warheadsSmall).toBe(1);
  });

  it('drops launches when attacker has no warhead', () => {
    const s = initialState({ cast: ['chump', 'carnage'], difficulty: 'normal', seed: 'x' });
    s.leaders.chump.stockpile.missiles = 1;
    const r = consumeStockFor(s, [smallLaunch]);
    expect(r.validLaunches).toHaveLength(0);
    expect(r.state.leaders.chump.stockpile.missiles).toBe(1);
  });

  it('drops launches at dead targets', () => {
    const s = initialState({ cast: ['chump', 'carnage'], difficulty: 'normal', seed: 'x' });
    s.leaders.chump.stockpile.missiles = 1;
    s.leaders.chump.stockpile.warheadsSmall = 1;
    s.leaders.carnage.alive = false;
    const r = consumeStockFor(s, [smallLaunch]);
    expect(r.validLaunches).toHaveLength(0);
    expect(r.state.leaders.chump.stockpile.missiles).toBe(1); // not consumed
  });
});

describe('applyLaunches (assumes stock pre-consumed)', () => {
  it('intercepts when defenders fully cover incoming (always intercepted)', () => {
    const s = initialState({ cast: ['chump', 'carnage'], difficulty: 'normal', seed: 'x' });
    s.leaders.carnage.stockpile.shields = 5;
    const r = applyLaunches(s, [smallLaunch]);
    expect(r.state.leaders.carnage.population).toBe(25);
    expect(r.events.map((e) => e.kind)).toEqual(['MissileLaunched', 'MissileIntercepted']);
  });

  it('the 4th incoming with S=0 is guaranteed to land (overflow=4 → 0%) and applies 2M small-warhead deaths', () => {
    const s = initialState({ cast: ['chump', 'carnage'], difficulty: 'normal', seed: 'x' });
    s.leaders.carnage.stockpile.shields = 0;
    s.leaders.carnage.population = 100;
    const r = applyLaunches(s, [smallLaunch, smallLaunch, smallLaunch, smallLaunch]);
    const impacts = r.events.filter((e) => e.kind === 'ImpactPeople');
    expect(impacts.length).toBeGreaterThanOrEqual(1);
    // every recorded impact uses the small-warhead damage profile
    for (const e of impacts) {
      if (e.kind === 'ImpactPeople') {
        expect(e.deaths).toBe(2);
        expect(e.warhead).toBe('small');
      }
    }
  });

  it('infrastructure targeting destroys factories instead of people (4 launches with S=0)', () => {
    const s = initialState({ cast: ['chump', 'carnage'], difficulty: 'normal', seed: 'x' });
    s.leaders.carnage.stockpile.shields = 0;
    s.leaders.carnage.factories = 10;
    const launch: Launch = {
      from: 'chump',
      to: 'carnage',
      delivery: 'missile',
      warhead: 'large',
      targetType: 'infra',
    };
    const r = applyLaunches(s, [launch, launch, launch, launch]);
    expect(r.events.some((e) => e.kind === 'ImpactInfrastructure')).toBe(true);
    expect(r.events.some((e) => e.kind === 'ImpactPeople')).toBe(false);
  });

  it('skips launches at dead receivers (no MissileLaunched event)', () => {
    const s = initialState({ cast: ['chump', 'carnage'], difficulty: 'normal', seed: 'x' });
    s.leaders.carnage.alive = false;
    s.leaders.carnage.population = 0;
    const r = applyLaunches(s, [smallLaunch]);
    expect(r.events).toHaveLength(0);
  });

  it('advances rngState when an intercept roll is made', () => {
    const s = initialState({ cast: ['chump', 'carnage'], difficulty: 'normal', seed: 'x' });
    const before = s.rngState;
    const r = applyLaunches(s, [smallLaunch]);
    expect(r.state.rngState).not.toBe(before);
  });

  it('does not require attacker to be alive (FR fires from a corpse)', () => {
    // Critical for Final Retaliation: applyLaunches MUST NOT gate on attacker.alive,
    // since FR's `from` leader is dead by definition.
    const s = initialState({ cast: ['chump', 'carnage'], difficulty: 'normal', seed: 'x' });
    s.leaders.chump.alive = false;
    s.leaders.chump.population = 0;
    s.leaders.carnage.stockpile.shields = 5; // force intercept so deterministic
    const r = applyLaunches(s, [smallLaunch]);
    expect(r.events.map((e) => e.kind)).toEqual(['MissileLaunched', 'MissileIntercepted']);
  });
});
```

- [ ] **Step 11.2: Run test, expect FAIL**

Run: `npm run test:run -- tests/engine/launches.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 11.3: Write `src/engine/launches.ts`**

```ts
import type {
  GameState,
  Launch,
  LeaderId,
  Order,
  ResolutionEvent,
  Yield,
} from './types';
import { factoriesDestroyed, interceptProbability, peopleDeaths } from './combat';
import { nextRandom } from './rng';

export interface LaunchesResult {
  state: GameState;
  events: ResolutionEvent[];
}

/**
 * Pure: walk orders in attacker-id-ASC order and emit a Launch[]. Does no
 * validation — bad targets and missing stock are filtered by `consumeStockFor`.
 */
export function collectLaunches(
  ordersByLeader: Partial<Record<LeaderId, Order[]>>,
): Launch[] {
  const launches: Launch[] = [];
  const attackers = Object.keys(ordersByLeader).sort() as LeaderId[];
  for (const id of attackers) {
    for (const o of ordersByLeader[id] ?? []) {
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
  return launches;
}

/**
 * Validates each launch against current state (attacker + receiver alive,
 * stock available) and consumes the delivery + warhead from valid attackers.
 * Returns the mutated state and the filtered Launch[] ready for `applyLaunches`.
 *
 * Used by the regular launch phase. Final Retaliation has its own consumption
 * loop because it pairs warheads with deliveries algorithmically.
 */
export function consumeStockFor(
  state: GameState,
  launches: Launch[],
): { state: GameState; validLaunches: Launch[] } {
  const next: GameState = structuredClone(state);
  const valid: Launch[] = [];
  for (const l of launches) {
    const attacker = next.leaders[l.from];
    const receiver = next.leaders[l.to];
    if (!attacker || !attacker.alive) continue;
    if (!receiver || !receiver.alive) continue;
    if (l.delivery === 'missile' && attacker.stockpile.missiles < 1) continue;
    if (l.delivery === 'bomber' && attacker.stockpile.bombers < 1) continue;
    const wf = warheadFieldFor(l.warhead);
    if (attacker.stockpile[wf] < 1) continue;

    if (l.delivery === 'missile') attacker.stockpile.missiles -= 1;
    else attacker.stockpile.bombers -= 1;
    attacker.stockpile[wf] -= 1;
    valid.push(l);
  }
  return { state: next, validLaunches: valid };
}

/**
 * Resolves intercept rolls and applies damage for an already-validated,
 * already-stock-consumed Launch[]. Does NOT touch attacker stock and does NOT
 * gate on attacker.alive — Final Retaliation fires from a dead leader, and we
 * still want those launches to resolve.
 *
 * Receiver still must be alive: dead-target launches collapse into a no-op.
 */
export function applyLaunches(state: GameState, launches: Launch[]): LaunchesResult {
  const next: GameState = structuredClone(state);
  const events: ResolutionEvent[] = [];
  const incoming: Record<LeaderId, { missile: number; bomber: number }> = {} as Record<
    LeaderId,
    { missile: number; bomber: number }
  >;
  for (const id of next.cast) incoming[id] = { missile: 0, bomber: 0 };

  for (const l of launches) {
    const receiver = next.leaders[l.to];
    if (!receiver || !receiver.alive) continue;

    events.push({
      kind: 'MissileLaunched',
      from: l.from,
      to: l.to,
      delivery: l.delivery,
      warhead: l.warhead,
      targetType: l.targetType,
    });

    incoming[l.to][l.delivery] += 1;
    const nth = incoming[l.to][l.delivery];
    const defenders = l.delivery === 'missile' ? receiver.stockpile.shields : receiver.stockpile.aa;
    const p = interceptProbability(nth, defenders);
    const roll = nextRandom(next.rngState);
    next.rngState = roll.state;
    if (roll.value < p) {
      events.push({
        kind: 'MissileIntercepted',
        from: l.from,
        to: l.to,
        delivery: l.delivery,
        warhead: l.warhead,
      });
      continue;
    }

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

export function warheadFieldFor(y: Yield): 'warheadsSmall' | 'warheadsMedium' | 'warheadsLarge' {
  if (y === 'small') return 'warheadsSmall';
  if (y === 'medium') return 'warheadsMedium';
  return 'warheadsLarge';
}
```

- [ ] **Step 11.4: Run test, expect PASS**

Run: `npm run test:run -- tests/engine/launches.test.ts`
Expected: PASS.

- [ ] **Step 11.5: Commit**

```bash
git add src/engine/launches.ts tests/engine/launches.test.ts
git commit -m "engine: add launch phase with deterministic intercept rolls"
```

---

## Task 12: Final Retaliation cascade

**Confidence: 91%** — refactored from 80% by killing the push-stock-back kludge. FR now consumes stock once during launch synthesis (greedy: largest warhead first, paired with available delivery, missile preferred) and hands the resulting `Launch[]` directly to the refactored `applyLaunches` (which expects pre-consumed launches and doesn't gate on `attacker.alive`). Single consumption point; symmetric with the regular launch phase.

**Files:**
- Create: `src/engine/finalRetaliation.ts`
- Create: `tests/engine/finalRetaliation.test.ts`

Per spec §6: when a leader's pop reaches 0, all their remaining warheads automatically launch at random surviving opponents. Cascades when an FR launch kills another leader.

In Phase 1 there's no grudge weighting (Khameneverhere's grudge map exists in state but is empty until AI personalities populate it in P2). Targets are drawn uniformly from the surviving non-self alive set, RNG-driven for determinism.

- [ ] **Step 12.1: Write the failing test**

`tests/engine/finalRetaliation.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { applyFinalRetaliation } from '../../src/engine/finalRetaliation';
import { initialState } from '../../src/engine/state';

describe('applyFinalRetaliation', () => {
  it('does nothing when no leader has just died', () => {
    const s = initialState({ cast: ['chump', 'carnage', 'starmless'], difficulty: 'normal', seed: 'x' });
    const r = applyFinalRetaliation(s, []);
    expect(r.events).toHaveLength(0);
  });

  it('fires every remaining warhead pairing from a freshly-dead leader', () => {
    const s = initialState({ cast: ['chump', 'carnage', 'starmless'], difficulty: 'normal', seed: 'x' });
    // Carnage has just been eliminated. They had 2 missiles and 2 small warheads.
    s.leaders.carnage.stockpile.missiles = 2;
    s.leaders.carnage.stockpile.warheadsSmall = 2;
    s.leaders.carnage.alive = false;
    s.leaders.carnage.population = 0;
    const r = applyFinalRetaliation(s, ['carnage']);
    const fired = r.events.filter((e) => e.kind === 'MissileLaunched');
    expect(fired).toHaveLength(2);
    // FR triggered event present
    expect(r.events.some((e) => e.kind === 'FinalRetaliationTriggered')).toBe(true);
  });

  it('cascades — when warhead-rich death overwhelms vulnerable survivors, ≥2 FR triggers fire', () => {
    // Pigeonhole guarantee: 8 launches uniformly distributed over 2 survivors
    // means one gets ≥4 → 4th has 0% intercept (overflow=4) → guaranteed land.
    // With Large=15M deaths and pop=5, that target dies and fires its own FR.
    const s = initialState({ cast: ['chump', 'carnage', 'starmless'], difficulty: 'normal', seed: 'fr-cascade' });
    s.leaders.carnage.stockpile.missiles = 8;
    s.leaders.carnage.stockpile.warheadsLarge = 8;
    s.leaders.carnage.alive = false;
    s.leaders.carnage.population = 0;
    // Both surviving leaders are vulnerable AND have stock so their FR will fire.
    s.leaders.chump.population = 5;
    s.leaders.chump.stockpile.shields = 0;
    s.leaders.chump.stockpile.missiles = 1;
    s.leaders.chump.stockpile.warheadsSmall = 1;
    s.leaders.starmless.population = 5;
    s.leaders.starmless.stockpile.shields = 0;
    s.leaders.starmless.stockpile.missiles = 1;
    s.leaders.starmless.stockpile.warheadsSmall = 1;
    const r = applyFinalRetaliation(s, ['carnage']);
    const triggers = r.events.filter((e) => e.kind === 'FinalRetaliationTriggered');
    expect(triggers.length).toBeGreaterThanOrEqual(2);
  });

  it('skips when the dead leader had no remaining stockpile', () => {
    const s = initialState({ cast: ['chump', 'carnage', 'starmless'], difficulty: 'normal', seed: 'x' });
    s.leaders.carnage.alive = false;
    s.leaders.carnage.population = 0;
    const r = applyFinalRetaliation(s, ['carnage']);
    expect(r.events.filter((e) => e.kind === 'MissileLaunched')).toHaveLength(0);
  });
});
```

- [ ] **Step 12.2: Run test, expect FAIL**

Run: `npm run test:run -- tests/engine/finalRetaliation.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 12.3: Write `src/engine/finalRetaliation.ts`**

```ts
import type {
  DeliveryType,
  GameState,
  Launch,
  LeaderId,
  ResolutionEvent,
  Yield,
} from './types';
import { applyLaunches, warheadFieldFor } from './launches';
import { nextInt } from './rng';

export interface FinalRetaliationResult {
  state: GameState;
  events: ResolutionEvent[];
}

export function applyFinalRetaliation(
  state: GameState,
  newlyDead: LeaderId[],
): FinalRetaliationResult {
  let next: GameState = structuredClone(state);
  const events: ResolutionEvent[] = [];
  const queue = [...newlyDead];
  const fired = new Set<LeaderId>();

  while (queue.length > 0) {
    const id = queue.shift()!;
    if (fired.has(id)) continue;
    fired.add(id);

    const leader = next.leaders[id];
    if (!leader) continue;
    const survivors = next.cast.filter(
      (other) => other !== id && next.leaders[other].alive,
    );
    if (survivors.length === 0) break;

    // Synthesise + consume in one pass: largest warhead first, paired with the
    // cheapest available delivery (missile preferred). Stock is consumed here,
    // not by applyLaunches — the refactored applyLaunches assumes pre-consumed
    // launches, which lets us hand off without a push-back kludge.
    const synthesised: Launch[] = [];
    const yields: Yield[] = ['large', 'medium', 'small'];
    for (const y of yields) {
      const wf = warheadFieldFor(y);
      while (leader.stockpile[wf] > 0) {
        let delivery: DeliveryType | null = null;
        if (leader.stockpile.missiles > 0) delivery = 'missile';
        else if (leader.stockpile.bombers > 0) delivery = 'bomber';
        if (!delivery) break;

        if (delivery === 'missile') leader.stockpile.missiles -= 1;
        else leader.stockpile.bombers -= 1;
        leader.stockpile[wf] -= 1;

        // Uniform-random target. P2 layers grudge weighting.
        const pick = nextInt(next.rngState, survivors.length);
        next.rngState = pick.state;
        const target = survivors[pick.value];

        synthesised.push({
          from: id,
          to: target,
          delivery,
          warhead: y,
          targetType: 'people',
        });
      }
    }

    if (synthesised.length === 0) continue;
    events.push({
      kind: 'FinalRetaliationTriggered',
      by: id,
      targets: synthesised.map((l) => l.to),
    });

    // Stock is already consumed; applyLaunches just rolls intercepts + damage.
    const lr = applyLaunches(next, synthesised);
    next = lr.state;
    events.push(...lr.events);

    // Cascade: any leader newly killed by this FR enters the queue.
    for (const other of next.cast) {
      const ol = next.leaders[other];
      if (ol.alive && ol.population <= 0) {
        ol.alive = false;
        ol.population = 0;
        events.push({ kind: 'LeaderEliminated', id: other });
        if (!fired.has(other)) queue.push(other);
      }
    }
  }

  return { state: next, events };
}
```

- [ ] **Step 12.4: Run test, expect PASS**

Run: `npm run test:run -- tests/engine/finalRetaliation.test.ts`
Expected: PASS.

- [ ] **Step 12.5: Commit**

```bash
git add src/engine/finalRetaliation.ts tests/engine/finalRetaliation.test.ts
git commit -m "engine: add final retaliation cascade (uniform targeting)"
```

---

## Task 13: Win conditions

**Confidence: 95%** — four cases, one priority order, exhaustive tests. The "survivor takes priority over dominance" test pins behaviour when both could fire.

**Files:**
- Create: `src/engine/winConditions.ts`
- Create: `tests/engine/winConditions.test.ts`

All four conditions checked in priority order: survivor → pyrrhic → apocalypse → dominance.

- [ ] **Step 13.1: Write the failing test**

`tests/engine/winConditions.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { checkOutcome } from '../../src/engine/winConditions';
import { initialState } from '../../src/engine/state';

describe('checkOutcome', () => {
  const base = initialState({ cast: ['chump', 'carnage', 'starmless'], difficulty: 'normal', seed: 'x' });

  it('returns null while multiple leaders are alive and no dominance', () => {
    expect(checkOutcome(base, { chump: 33, carnage: 25, starmless: 25 })).toBeNull();
  });

  it('returns survivor when exactly one leader has pop > 0', () => {
    const s = structuredClone(base);
    s.leaders.carnage.population = 0;
    s.leaders.carnage.alive = false;
    s.leaders.starmless.population = 0;
    s.leaders.starmless.alive = false;
    expect(checkOutcome(s, { chump: 33, carnage: 25, starmless: 25 })).toEqual({
      type: 'survivor',
      winner: 'chump',
    });
  });

  it('returns pyrrhic when every leader died this round', () => {
    const s = structuredClone(base);
    for (const id of ['chump', 'carnage', 'starmless'] as const) {
      s.leaders[id].population = 0;
      s.leaders[id].alive = false;
    }
    expect(checkOutcome(s, { chump: 33, carnage: 25, starmless: 25 })).toEqual({
      type: 'pyrrhic',
      winner: 'chump',
    });
  });

  it('returns apocalypse when nobody had population entering the round', () => {
    const s = structuredClone(base);
    for (const id of ['chump', 'carnage', 'starmless'] as const) {
      s.leaders[id].population = 0;
      s.leaders[id].alive = false;
    }
    expect(checkOutcome(s, { chump: 0, carnage: 0, starmless: 0 })).toEqual({ type: 'apocalypse' });
  });

  it('returns dominance when one leader has 2× the next-highest population', () => {
    const s = structuredClone(base);
    s.leaders.chump.population = 30;
    s.leaders.carnage.population = 14;
    s.leaders.starmless.population = 10;
    expect(checkOutcome(s, { chump: 33, carnage: 25, starmless: 25 })).toEqual({
      type: 'dominance',
      winner: 'chump',
    });
  });

  it('does not return dominance when ratio is below threshold', () => {
    const s = structuredClone(base);
    s.leaders.chump.population = 30;
    s.leaders.carnage.population = 16; // 30 / 16 = 1.87 < 2
    s.leaders.starmless.population = 10;
    expect(checkOutcome(s, { chump: 33, carnage: 25, starmless: 25 })).toBeNull();
  });

  it('survivor takes priority over dominance', () => {
    const s = structuredClone(base);
    s.leaders.carnage.population = 0;
    s.leaders.carnage.alive = false;
    s.leaders.starmless.population = 0;
    s.leaders.starmless.alive = false;
    s.leaders.chump.population = 100;
    expect(checkOutcome(s, { chump: 33, carnage: 25, starmless: 25 })).toEqual({
      type: 'survivor',
      winner: 'chump',
    });
  });
});
```

- [ ] **Step 13.2: Run test, expect FAIL**

Run: `npm run test:run -- tests/engine/winConditions.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 13.3: Write `src/engine/winConditions.ts`**

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

  // 3) Dominance — leading population >= threshold * second-highest.
  const sortedByPop = [...alive].sort(
    (a, b) => state.leaders[b].population - state.leaders[a].population,
  );
  if (sortedByPop.length >= 2) {
    const lead = state.leaders[sortedByPop[0]].population;
    const next = state.leaders[sortedByPop[1]].population;
    if (next > 0 && lead >= state.config.dominanceThreshold * next) {
      return { type: 'dominance', winner: sortedByPop[0] };
    }
  }

  return null;
}
```

- [ ] **Step 13.4: Run test, expect PASS**

Run: `npm run test:run -- tests/engine/winConditions.test.ts`
Expected: PASS.

- [ ] **Step 13.5: Commit**

```bash
git add src/engine/winConditions.ts tests/engine/winConditions.test.ts
git commit -m "engine: add survivor / pyrrhic / apocalypse / dominance check"
```

---

## Task 14: Resolution orchestrator

**Confidence: 92%** — large surface area but each phase is delegated to a tested module; the orchestrator's only logic is sequencing + status update + AP refresh + bonus-rule application + win check. Sub-95 risks:

- *State-vs-s discipline*: the orchestrator reads sealed orders from the **input** `state` parameter (so they're available even after `s.pendingOrders` is cleared). Mitigation: explicit comment in the AP-refresh block and a test that asserts Netanyahoo's launch bonus reads from sealed orders, not next-round empty `pendingOrders`.
- *AP banking edge case*: negative AP from test fixtures is floored to 0 via `Math.max(0, Math.floor(l.ap))`. Mitigation: covered by the "banks unspent AP up to AP_BANK_CAP" test.

**Files:**
- Create: `src/engine/resolution.ts`
- Create: `tests/engine/resolution.test.ts`

Glues every phase together in spec §3 order: Defences → Builds → Propaganda → Wooing → Launches → Final Retaliations → status update (mark eliminations, FR cascade, decay favourability, AP refresh, win check).

- [ ] **Step 14.1: Write the failing test**

`tests/engine/resolution.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { resolveRound } from '../../src/engine/resolution';
import { initialState } from '../../src/engine/state';
import { totalApCost } from '../../src/engine/orders';
import type { LeaderId, Order } from '../../src/engine/types';

function withOrders(
  state: ReturnType<typeof initialState>,
  who: LeaderId,
  orders: Order[],
) {
  const next = structuredClone(state);
  const cost = totalApCost(orders);
  next.leaders[who].ap -= cost;
  next.pendingOrders[who] = { leaderId: who, orders, apSpent: cost };
  return next;
}

describe('resolveRound', () => {
  it('advances round counter and clears pending orders', () => {
    let s = initialState({ cast: ['chump', 'carnage'], difficulty: 'normal', seed: 'x' });
    s = withOrders(s, 'chump', []);
    s = withOrders(s, 'carnage', []);
    const r = resolveRound(s);
    expect(r.state.round).toBe(2);
    expect(r.state.pendingOrders).toEqual({});
  });

  it('runs phases in order: defences → builds → propaganda → wooing → launches', () => {
    let s = initialState({ cast: ['chump', 'carnage'], difficulty: 'normal', seed: 'x' });
    s.leaders.chump.stockpile.missiles = 1;
    s.leaders.chump.stockpile.warheadsSmall = 1;
    s = withOrders(s, 'chump', [
      { kind: 'build-defence', type: 'shield' },
      { kind: 'build-factory' },
      { kind: 'propaganda', target: 'carnage' },
    ]);
    s = withOrders(s, 'carnage', [
      { kind: 'launch', target: 'chump', delivery: 'missile', warhead: 'small', targetType: 'people' },
    ]);
    s.leaders.carnage.stockpile.missiles = 1;
    s.leaders.carnage.stockpile.warheadsSmall = 1;
    const r = resolveRound(s);
    const kinds = r.events.map((e) => e.kind);
    const idxDefence = kinds.indexOf('DefenceBuilt');
    const idxFactory = kinds.indexOf('FactoryBuilt');
    const idxProp = kinds.indexOf('PropagandaTransfer');
    const idxLaunch = kinds.indexOf('MissileLaunched');
    expect(idxDefence).toBeLessThan(idxFactory);
    expect(idxFactory).toBeLessThan(idxProp);
    expect(idxProp).toBeLessThan(idxLaunch);
  });

  it('applies AP refresh: floor(factories * 0.5) + banked + bonus', () => {
    let s = initialState({ cast: ['chump', 'carnage'], difficulty: 'normal', seed: 'x' });
    // Chump submits no orders → 5 AP unspent → bank capped at 2.
    s = withOrders(s, 'chump', []);
    s = withOrders(s, 'carnage', []);
    const r = resolveRound(s);
    expect(r.state.leaders.chump.apBanked).toBe(2);
    expect(r.state.leaders.chump.ap).toBe(5 + 2);
  });

  it('grants Netanyahoo +1 AP when their orders include a launch', () => {
    let s = initialState({
      cast: ['netanyahoo', 'carnage'],
      difficulty: 'normal',
      seed: 'x',
    });
    s.leaders.netanyahoo.stockpile.missiles = 1;
    s.leaders.netanyahoo.stockpile.warheadsSmall = 1;
    s = withOrders(s, 'netanyahoo', [
      { kind: 'launch', target: 'carnage', delivery: 'missile', warhead: 'small', targetType: 'people' },
    ]);
    s = withOrders(s, 'carnage', []);
    const r = resolveRound(s);
    // After resolution, factories=6 → floor(6*0.5)=3, banked=min(2, 3-2=1)=1, bonus=1.
    expect(r.state.leaders.netanyahoo.ap).toBe(3 + 1 + 1);
  });

  it('eliminates a leader and triggers Final Retaliation cascade', () => {
    let s = initialState({ cast: ['chump', 'carnage', 'starmless'], difficulty: 'normal', seed: 'x' });
    // Chump fires 4 Large warheads at Carnage with 0 shields → 4th guaranteed to land.
    s.leaders.chump.stockpile.missiles = 4;
    s.leaders.chump.stockpile.warheadsLarge = 4;
    s.leaders.carnage.population = 5;
    s.leaders.carnage.stockpile.shields = 0;
    // Carnage's parting shot — 1 missile + 1 small warhead on launch from FR.
    s.leaders.carnage.stockpile.missiles = 1;
    s.leaders.carnage.stockpile.warheadsSmall = 1;
    const launch = {
      kind: 'launch' as const,
      target: 'carnage' as const,
      delivery: 'missile' as const,
      warhead: 'large' as const,
      targetType: 'people' as const,
    };
    s = withOrders(s, 'chump', [launch, launch, launch, launch]);
    s = withOrders(s, 'carnage', []);
    s = withOrders(s, 'starmless', []);
    const r = resolveRound(s);
    expect(r.state.leaders.carnage.alive).toBe(false);
    const kinds = r.events.map((e) => e.kind);
    expect(kinds).toContain('LeaderEliminated');
    expect(kinds).toContain('FinalRetaliationTriggered');
  });

  it('reaches a survivor outcome when only one leader remains alive', () => {
    let s = initialState({ cast: ['chump', 'carnage'], difficulty: 'normal', seed: 'x' });
    s.leaders.chump.stockpile.missiles = 4;
    s.leaders.chump.stockpile.warheadsLarge = 4;
    s.leaders.carnage.population = 5;
    s.leaders.carnage.stockpile.shields = 0;
    const launch = {
      kind: 'launch' as const,
      target: 'carnage' as const,
      delivery: 'missile' as const,
      warhead: 'large' as const,
      targetType: 'people' as const,
    };
    s = withOrders(s, 'chump', [launch, launch, launch, launch]);
    s = withOrders(s, 'carnage', []);
    const r = resolveRound(s);
    expect(r.state.outcome).toEqual({ type: 'survivor', winner: 'chump' });
    expect(r.events[r.events.length - 1]).toEqual({
      kind: 'OutcomeReached',
      outcome: { type: 'survivor', winner: 'chump' },
    });
  });

  it('decays favourability at end of round', () => {
    let s = initialState({ cast: ['chump', 'carnage'], difficulty: 'normal', seed: 'x' });
    s.leaders.carnage.favourability.chump = 5;
    s = withOrders(s, 'chump', []);
    s = withOrders(s, 'carnage', []);
    const r = resolveRound(s);
    expect(r.state.leaders.carnage.favourability.chump).toBe(4);
  });
});
```

- [ ] **Step 14.2: Run test, expect FAIL**

Run: `npm run test:run -- tests/engine/resolution.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 14.3: Write `src/engine/resolution.ts`**

```ts
import type { GameState, LeaderId, Order, ResolutionEvent } from './types';
import { applyDefenceBuilds, applyOtherBuilds } from './builds';
import { applyPropaganda } from './propaganda';
import { applyWooing, decayFavourability } from './diplomacy';
import { applyLaunches, collectLaunches, consumeStockFor } from './launches';
import { applyFinalRetaliation } from './finalRetaliation';
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

  // OrdersSealed events first (cast id-ASC).
  for (const id of [...s.cast].sort()) {
    const sealed = s.pendingOrders[id];
    if (sealed) {
      events.push({ kind: 'OrdersSealed', leaderId: id, orderCount: sealed.orders.length });
    }
  }

  // Phase: Defences (defence builds resolve first so this round's shields/AA count).
  for (const id of [...s.cast].sort()) {
    const sealed = s.pendingOrders[id];
    if (!sealed) continue;
    const r = applyDefenceBuilds(s, id, sealed.orders);
    s = r.state;
    events.push(...r.events);
  }

  // Phase: other Builds.
  for (const id of [...s.cast].sort()) {
    const sealed = s.pendingOrders[id];
    if (!sealed) continue;
    const r = applyOtherBuilds(s, id, sealed.orders);
    s = r.state;
    events.push(...r.events);
  }

  // Phase: Propaganda.
  const allOrders: Partial<Record<LeaderId, Order[]>> = {};
  for (const id of s.cast) allOrders[id] = s.pendingOrders[id]?.orders ?? [];
  {
    const r = applyPropaganda(s, allOrders);
    s = r.state;
    events.push(...r.events);
  }

  // Phase: Wooing.
  {
    const r = applyWooing(s, allOrders);
    s = r.state;
    events.push(...r.events);
  }

  // Phase: Launches. Three-step flow per Task 11 split:
  //   collectLaunches → consumeStockFor (validates + consumes) → applyLaunches.
  // Final Retaliation has its own consumption loop (Task 12) but lands in the
  // same `applyLaunches` so intercepts and damage stay symmetric.
  const launches = collectLaunches(allOrders);
  {
    const consumed = consumeStockFor(s, launches);
    s = consumed.state;
    const r = applyLaunches(s, consumed.validLaunches);
    s = r.state;
    events.push(...r.events);
  }

  // Status: mark newly-eliminated leaders.
  const newlyDead: LeaderId[] = [];
  for (const id of s.cast) {
    const l = s.leaders[id];
    if (l.alive && l.population <= 0) {
      l.alive = false;
      l.population = 0;
      events.push({ kind: 'LeaderEliminated', id });
      newlyDead.push(id);
    }
  }

  // Phase: Final Retaliation cascade.
  if (newlyDead.length > 0) {
    const r = applyFinalRetaliation(s, newlyDead);
    s = r.state;
    events.push(...r.events);
  }

  // Decay relationships.
  s = decayFavourability(s);

  // AP refresh + banking + bonuses (survivors only).
  for (const id of s.cast) {
    const l = s.leaders[id];
    if (!l.alive) continue;
    const banked = Math.min(AP_BANK_CAP, Math.max(0, Math.floor(l.ap)));
    l.apBanked = banked;
    const factoryAp = Math.floor(l.factories * FACTORY_AP_RATE);
    const bonus = leaderBonusAp(l.id, state.pendingOrders[id]?.orders ?? []);
    l.ap = factoryAp + banked + bonus;
  }

  // Clear pending, advance round.
  s.pendingOrders = {};
  s.round += 1;

  // Win check.
  const outcome = checkOutcome(s, startOfRoundPop);
  if (outcome) {
    s.outcome = outcome;
    events.push({ kind: 'OutcomeReached', outcome });
  }

  // Append to persistent log.
  s.log = [...s.log, ...events];

  return { state: s, events };
}

function leaderBonusAp(id: LeaderId, thisRoundsOrders: Order[]): number {
  const profile = LEADER_PROFILES[id];
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

- [ ] **Step 14.4: Run test, expect PASS**

Run: `npm run test:run -- tests/engine/resolution.test.ts`
Expected: PASS.

- [ ] **Step 14.5: Commit**

```bash
git add src/engine/resolution.ts tests/engine/resolution.test.ts
git commit -m "engine: add round resolution orchestrator (full phase order)"
```

---

## Task 15: Reducer

**Confidence: 93%** — small switch over the 4 action types; tests cover validation rejection (unchanged-state return), AP-budget rejection, RESOLVE_ROUND delegation, LOAD_STATE pass-through. Residual risk: the validation loop runs `validateOrder` but doesn't accumulate errors — first failure rejects the entire batch. That's the documented contract; tests pin it.

**Files:**
- Create: `src/engine/reducer.ts`
- Create: `tests/engine/reducer.test.ts`

- [ ] **Step 15.1: Write the failing test**

`tests/engine/reducer.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { reduce } from '../../src/engine/reducer';
import { initialState } from '../../src/engine/state';

describe('reduce — NEW_GAME', () => {
  it('replaces state with a fresh game', () => {
    const a = initialState({ cast: ['chump', 'carnage'], difficulty: 'normal', seed: 'first' });
    a.round = 5;
    const b = reduce(a, {
      type: 'NEW_GAME',
      cast: ['chump', 'carnage', 'starmless'],
      difficulty: 'easy',
      seed: 'second',
    });
    expect(b.round).toBe(1);
    expect(b.difficulty).toBe('easy');
    expect(b.seed).toBe('second');
    expect(b.cast).toEqual(['chump', 'carnage', 'starmless']);
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

  it('rejects an invalid order (launch with no missile)', () => {
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

- [ ] **Step 15.2: Run test, expect FAIL**

Run: `npm run test:run -- tests/engine/reducer.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 15.3: Write `src/engine/reducer.ts`**

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

- [ ] **Step 15.4: Run test, expect PASS**

Run: `npm run test:run -- tests/engine/reducer.test.ts`
Expected: PASS.

- [ ] **Step 15.5: Commit**

```bash
git add src/engine/reducer.ts tests/engine/reducer.test.ts
git commit -m "engine: add top-level reducer (submit / resolve / load / new-game)"
```

---

## Task 16: Engine public barrel

**Confidence: 97%** — pure re-export file. Verified by `npm run typecheck`. Trivial.

**Files:**
- Create: `src/engine/index.ts`

- [ ] **Step 16.1: Write `src/engine/index.ts`**

```ts
export * from './types';
export { initialState } from './state';
export { reduce } from './reducer';
export { resolveRound } from './resolution';
export { apCostOf, totalApCost, validateOrder } from './orders';
export {
  LEADER_PROFILES,
  ACTION_COSTS,
  YIELD_DAMAGE,
  FACTORY_AP_RATE,
  AP_BANK_CAP,
  PROPAGANDA_TRANSFER_M,
  WOO_FAVOURABILITY_DECAY,
  DOMINANCE_THRESHOLD_DEFAULT,
} from './balance';
```

- [ ] **Step 16.2: Verify typecheck + tests still pass**

Run: `npm run typecheck && npm run test:run`
Expected: both exit 0.

- [ ] **Step 16.3: Commit**

```bash
git add src/engine/index.ts
git commit -m "engine: add public barrel export"
```

---

## Task 17: Scripted-orders helper + integration snapshot test

**Confidence: 92%** — `scriptedOrders` is heuristic (picks an entire pattern then trims to AP and drops invalid orders) but lives in `tests/` so any oddity stays test-local. The integration test asserts the typed event-stream remains within the known event-kind set and that an outcome is reachable within 100 rounds. Sub-95 risk: a bug in `scriptedOrders` that always returns empty orders would still pass the round-counter assertion (≥2) — mitigation is the second test asserting outcome reachability across 3 sample seeds.

**Files:**
- Create: `tests/helpers/scripted-orders.ts`
- Create: `tests/engine/integration.test.ts`

The scripted-orders helper is a deterministic order generator (cycle through build/launch patterns) used by integration + property tests. It lives in `tests/` and is **not** part of the engine surface — Phase 2 replaces it with `planAi` for personality-driven simulation.

- [ ] **Step 17.1: Write the helper**

`tests/helpers/scripted-orders.ts`:

```ts
import type { GameState, LeaderId, Order } from '../../src/engine/types';
import { totalApCost, validateOrder } from '../../src/engine/orders';

// Deterministic order picker: each round, each leader cycles through a fixed
// build/launch pattern keyed on (round, leader). Always respects AP budget and
// drops invalid orders.
export function scriptedOrders(state: GameState, leaderId: LeaderId): Order[] {
  const me = state.leaders[leaderId];
  if (!me || !me.alive) return [];
  const target = state.cast.find((id) => id !== leaderId && state.leaders[id].alive);
  const patterns: Order[][] = [
    [{ kind: 'build-missile' }, { kind: 'build-warhead', yield: 'small' }],
    [{ kind: 'build-factory' }],
    [{ kind: 'build-defence', type: 'shield' }],
    target
      ? [
          {
            kind: 'launch',
            target,
            delivery: 'missile',
            warhead: 'small',
            targetType: 'people',
          },
        ]
      : [],
    target
      ? [{ kind: 'propaganda', target }]
      : [],
    target
      ? [{ kind: 'woo', target, points: 1 }]
      : [],
  ];

  const idx = (state.round + leaderHash(leaderId)) % patterns.length;
  const candidate = patterns[idx];
  // Drop orders that fail validation in the current state, and trim to AP.
  const filtered: Order[] = [];
  for (const o of candidate) {
    if (!validateOrder(state, leaderId, o).ok) continue;
    if (totalApCost([...filtered, o]) > me.ap) break;
    filtered.push(o);
  }
  return filtered;
}

function leaderHash(id: LeaderId): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h;
}
```

- [ ] **Step 17.2: Write the integration test**

`tests/engine/integration.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { reduce } from '../../src/engine/reducer';
import { initialState } from '../../src/engine/state';
import { scriptedOrders } from '../helpers/scripted-orders';

describe('integration — three-leader scripted game', () => {
  it('runs at least 5 rounds without error and produces a typed event stream', () => {
    let s = initialState({
      cast: ['chump', 'carnage', 'starmless'],
      difficulty: 'normal',
      seed: 'integration-1',
    });
    for (let round = 0; round < 5 && !s.outcome; round++) {
      for (const id of s.cast) {
        const orders = scriptedOrders(s, id);
        s = reduce(s, { type: 'SUBMIT_ORDERS', leaderId: id, orders });
      }
      s = reduce(s, { type: 'RESOLVE_ROUND' });
    }
    expect(s.round).toBeGreaterThanOrEqual(2);
    expect(Array.isArray(s.log)).toBe(true);
    // Every event must be one of the known kinds.
    const known = new Set([
      'OrdersSealed',
      'FactoryBuilt',
      'DeliveryBuilt',
      'WarheadBuilt',
      'DefenceBuilt',
      'MissileLaunched',
      'MissileIntercepted',
      'ImpactPeople',
      'ImpactInfrastructure',
      'PropagandaTransfer',
      'WooApplied',
      'LeaderEliminated',
      'FinalRetaliationTriggered',
      'OutcomeReached',
    ]);
    for (const e of s.log) {
      expect(known.has(e.kind)).toBe(true);
    }
  });

  it('reaches an outcome within 100 rounds for sample seeds', () => {
    for (const seed of ['s1', 's2', 's3']) {
      let s = initialState({
        cast: ['chump', 'carnage', 'starmless'],
        difficulty: 'normal',
        seed,
      });
      let rounds = 0;
      while (!s.outcome && rounds < 100) {
        for (const id of s.cast) {
          const orders = scriptedOrders(s, id);
          s = reduce(s, { type: 'SUBMIT_ORDERS', leaderId: id, orders });
        }
        s = reduce(s, { type: 'RESOLVE_ROUND' });
        rounds++;
      }
      expect(s.outcome).not.toBeNull();
    }
  });
});
```

- [ ] **Step 17.3: Run test, expect PASS**

Run: `npm run test:run -- tests/engine/integration.test.ts`
Expected: PASS.

- [ ] **Step 17.4: Commit**

```bash
git add tests/helpers/scripted-orders.ts tests/engine/integration.test.ts
git commit -m "engine: add scripted-orders helper + 3-leader integration test"
```

---

## Task 18: Determinism property test

**Confidence: 90%** — full-log equality on 25 random seeds, two runs each, is a strong safety net. Sub-95 risks:

- *The test catches divergence but cannot prove its absence.* Confidence in determinism comes structurally: no `Math.random()` in `src/engine/`, no `Date.now()`, RNG state lives inside `GameState` and threads pure-functionally. Mitigation: the self-review checklist (handoff section) lists `grep -r "Math.random" src/engine` as an explicit verification step.
- *25 seeds × 2 runs × ~50 rounds × ~5 events ≈ 12,500 events compared.* If full-log equality is too slow on Windows CI, drop to 10 seeds without losing meaningful coverage. Tested locally first.

**Files:**
- Create: `tests/engine/determinism.test.ts`

- [ ] **Step 18.1: Write the test**

`tests/engine/determinism.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { reduce } from '../../src/engine/reducer';
import { initialState } from '../../src/engine/state';
import { scriptedOrders } from '../helpers/scripted-orders';
import type { GameState, LeaderId } from '../../src/engine/types';

function runGame(seed: string, cast: LeaderId[], maxRounds = 80): GameState {
  let s = initialState({ cast, difficulty: 'normal', seed });
  while (!s.outcome && s.round <= maxRounds) {
    for (const id of cast) {
      const orders = scriptedOrders(s, id);
      s = reduce(s, { type: 'SUBMIT_ORDERS', leaderId: id, orders });
    }
    s = reduce(s, { type: 'RESOLVE_ROUND' });
  }
  return s;
}

describe('determinism', () => {
  it('produces identical state for identical seed across two runs (3-leader)', () => {
    const cast: LeaderId[] = ['chump', 'carnage', 'starmless'];
    const a = runGame('alpha', cast);
    const b = runGame('alpha', cast);
    expect(a).toEqual(b);
  });

  it('produces different final state for different seeds', () => {
    const cast: LeaderId[] = ['chump', 'carnage', 'starmless'];
    const a = runGame('alpha', cast);
    const b = runGame('beta', cast);
    expect(a).not.toEqual(b);
  });

  it('property: 25 random seeds are each deterministic across two runs', () => {
    const cast: LeaderId[] = ['chump', 'carnage', 'starmless'];
    for (let i = 0; i < 25; i++) {
      const seed = `prop-${i}`;
      const a = runGame(seed, cast);
      const b = runGame(seed, cast);
      // Full-log equality: any divergence in event payloads (deaths, intercepts,
      // pop deltas, RNG-driven targets) shows up immediately.
      expect(a.log).toEqual(b.log);
      expect(a.outcome).toEqual(b.outcome);
      expect(a.round).toBe(b.round);
    }
  }, 30_000);
});
```

- [ ] **Step 18.2: Run test, expect PASS**

Run: `npm run test:run -- tests/engine/determinism.test.ts`
Expected: PASS.

- [ ] **Step 18.3: Commit**

```bash
git add tests/engine/determinism.test.ts
git commit -m "engine: add determinism property test (25 random seeds)"
```

---

## Task 19: Final verification + README handoff

**Confidence: 99%** — `npm run test:run && npm run typecheck` and a README append. Risk-free unless an earlier task left a failing test, in which case the executor stops here and reports back.

**Files:**
- Modify: `README.md`

- [ ] **Step 19.1: Run the full suite**

Run: `npm run test:run && npm run typecheck`
Expected: both exit 0.

- [ ] **Step 19.2: Append phase-1 status to `README.md`**

Add after the Quickstart section:

```markdown
## Phase 1 status

The engine core is complete. Verification:

    npm run test:run     # all suites green
    npm run typecheck    # tsc --noEmit clean

What's in `src/engine/`:

- Full action set (factories, missiles, bombers, S/M/L warheads, shields, AA, launches with people/infra targeting, propaganda, wooing).
- Spec §3 phase order: defences → builds → propaganda → wooing → launches → final retaliations → status update.
- Spec §6 overwhelm intercept curve.
- All four win conditions: survivor, pyrrhic, apocalypse, dominance.
- Per-leader AP bonus rules (Netanyahoo launch bonus; Mileigh-hem aggression bonus; Chump defence-waste hooked but inert until P2).
- Determinism: same seed + same orders → identical events (property-tested across 25 seeds).

What's NOT in `src/engine/`:

- Asymmetric AI personalities (`planAi`). Phase 2.
- Difficulty levels. Phase 2.
- AI-duel headless test mode. Phase 2.
- Any UI / Vite / React. Phase 3.
- Flavour bank wiring, Disparage cameo, masthead rotation. Phase 4.
- Audio, persistence, replay scrubber, PWA, animations. Phase 4.
```

- [ ] **Step 19.3: Final commit**

```bash
git add README.md
git commit -m "docs: phase 1 status note in readme"
```

---

## Self-review checklist (run before handoff)

- [ ] **Spec coverage (P1 IN list)**: every line item in scope-IN maps to a numbered task. Items in scope-OUT are explicitly deferred.
- [ ] **Placeholder scan**: no "TBD" / "implement later" / undefined symbols in any task.
- [ ] **Type consistency**: `LeaderId` strings match across all tasks; `Order.kind` discriminants and `ResolutionEvent.kind` discriminants match between `types.ts` and the modules consuming them.
- [ ] **No `Math.random` outside `rng.ts`**: grep `src/engine` to confirm.
- [ ] **No React / Vite / DOM imports**: grep `src/engine` to confirm zero matches.
- [ ] **Determinism gate**: Task 18 runs same-seed games to identical event-stream; 25 seeds.

---

## Completion handoff

After Task 19 commits, the branch is ready for review and merge.

- **REQUIRED SUB-SKILL:** Use `superpowers:finishing-a-development-branch` to verify tests, present integration options, and execute the choice (merge to main / open PR / cleanup).
- After merge, write **Phase 2's plan** before starting any P2 implementation. The next plan file should live at `docs/superpowers/plans/<date>-phase-2-ai-personalities.md` and follow the same format. Phase 2 builds `src/engine/ai/` with six per-leader scoring functions per spec §7, difficulty levels, and the AI-duel headless test mode — still no UI.
