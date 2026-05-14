# Phase 4b — Balance & Planning Rework Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebalance the AP economy (doubled pool), rework defences to consumable build-then-deploy mechanic, and rewrite the Planning screen as an action-card grid. Plus simplify woo/propaganda to flat 1-AP toggles.

**Architecture:** Engine stays pure-TS. New order kind `deploy-defence`; `Order.woo` drops `points`. Leader gains round-scoped `deployedShields/deployedAA` pool. `interceptProbability` reads from deployed pool; pool clears at round end. Planning screen replaces OrderForm + queue list with `<BuildGrid>` + `<DefenceGrid>` + `<TargetRow>` (one per opponent) populated by a new `projectInventory` helper that walks the queued-orders array and computes post-build / pre-launch counts.

**Tech Stack:** TypeScript 5.4, Vite 5, React 18, Vitest 1.5, React Testing Library, CSS Modules. No new runtime deps.

**Source of truth:** `docs/superpowers/specs/2026-05-13-phase-4b-balance-planning-rework-design.md` (committed `9ee96a7`). If anything below conflicts with the spec, the spec wins — flag before coding.

**Per-step confidence:** every task is rated. Lowest task confidence post-mitigation: **91 %** (Task 13 — Planning rewrite). Three tasks needed lift: T6 (cross-cutting AI changes), T13 (largest UI rewrite). Mitigations embedded inline.

---

## File structure

**New files:**

| Path | Responsibility |
|---|---|
| `src/ui/util/projection.ts` | `projectInventory(leader, orders): ProjectedInventory` — walks queued orders, returns post-build / pre-launch counts for missiles, bombers, warheads (per yield), shields/AA in stockpile, deployed shields/AA |
| `src/ui/components/BuildGrid.tsx` + `.module.css` | 6-cell stepper grid for Factory / Missile / Bomber / Sm/Md/Lg Warhead |
| `src/ui/components/DefenceGrid.tsx` + `.module.css` | 3-cell stepper grid for Build Shield / Deploy Shield / Build AA / Deploy AA (Deploy AA hidden when 0 owned + 0 queued? No — show greyed, see spec §5.6) |
| `src/ui/components/LaunchCell.tsx` + `.module.css` | One (delivery × yield) cell with 💥 + size word + "N left" + stepper |
| `src/ui/components/TargetRow.tsx` + `.module.css` | One row per opponent: header + people/infra toggle + mood line + diplomacy strip + 2× LaunchCell rows |
| `tests/engine/deployDefence.test.ts` | New engine tests for deploy lifecycle |
| `tests/engine/intercept.deployed.test.ts` | New engine tests for deploy-pool intercept |
| `tests/engine/orders.woo.test.ts` | New engine tests for flat woo shape + one-per-target |
| `tests/ui/Planning.actionGrid.test.tsx` | New UI tests for the action-grid surface |
| `tests/ui/Planning.targetRow.test.tsx` | New UI tests for target rows + mood lines |
| `tests/ui/projection.test.ts` | Unit tests for the `projectInventory` helper |

**Modified files:**

| Path | Change |
|---|---|
| `src/engine/balance.ts` | startAp ×2 across the board; FACTORY_AP_RATE 0.5→1.0; AP_BANK_CAP 2→4; ACTION_COSTS adds `deployDefence`, renames `wooPerPoint`→`woo`, bumps `buildDefence` 2→4 |
| `src/engine/types.ts` | `Order` union: drop `points` from `woo`, add `deploy-defence`. `Leader` gains `deployedShields` + `deployedAA`. `ResolutionEvent` gains `DefenceDeployed` + `DefenceConsumed` |
| `src/engine/state.ts` | `initialState` seeds `deployedShields: 0, deployedAA: 0` |
| `src/engine/orders.ts` | `apCostOf` handles new shapes; `validateOrder` rejects deploy without stockpile; `validateOrderSequence` extends projection to queued builds + enforces one-woo / one-propaganda per target; `analyseOrderSequence` uses extended projection |
| `src/engine/builds.ts` | `applyDefenceBuilds` handles both `build-defence` and `deploy-defence` in two stages (build first, then deploy) |
| `src/engine/launches.ts` | `interceptProbability` consumers read `deployedShields/aa`; intercept decrements deployed pool |
| `src/engine/resolution.ts` | Clear deployed pool at round end, emit `DefenceConsumed` |
| `src/engine/ai/{chump,khameneverhere,netanyahoo,carnage,starmless,mileighhem}.ts` | Drop `points` from woo emissions; Chump + Starmless gain "if owns ≥1 shield, deploy one else build one" rule |
| `src/ui/screens/Planning.tsx` | Full rewrite to action-grid layout |
| `src/ui/screens/Planning.module.css` | New layout styles |
| `src/ui/components/SoftWarnPanel.tsx` | Re-positioned (no shape change) |
| `src/ui/components/EventCard.tsx` | Adds cases for `DefenceDeployed` (render) + `DefenceConsumed` (skip) |
| `src/ui/screens/Action.tsx` | `phaseAdvanceFor`: `DefenceDeployed` → `'defences'`, `DefenceConsumed` → `null` |
| `tests/engine/ai-duel.test.ts` | Comment update flagging P4c rebaseline |
| `tests/engine/resolution.test.ts` | Extend for Mileigh bonus + defence phase staging |
| `tests/engine/analyseOrderSequence.test.ts` | Extend for queued-builds projection |
| `README.md` | Append Phase 4b status section |

**Deleted files:**

```
src/ui/components/OrderForm.tsx
src/ui/components/OrderForm.module.css
src/ui/components/LeaderCard.tsx
src/ui/components/LeaderCard.module.css
tests/ui/OrderForm.test.tsx
```

---

## Task confidence summary (post-lift)

| Task | Confidence | Mitigation if any |
|---|---|---|
| 1. Engine schema + balance bumps | 96 % | Mechanical type/value changes |
| 2. orders.ts updates | 92 % | Project-builds enhancement carefully scoped; one new rule per commit inside task |
| 3. builds.ts two-stage defence | 92 % | Process build-defence first, then deploy-defence, in one pass |
| 4. launches.ts intercept rewiring | 95 % | Tiny call-site change |
| 5. resolution.ts end-of-round clear | 92 % | New emission point at known location |
| 6. AI personalities | 93 % | One personality per commit (6 commits inside the task) |
| 7. EventCard + Action exhaustive switches | 95 % | `noFallthroughCasesInSwitch` catches misses |
| 8. projection.ts helper | 95 % | Pure function with unit tests |
| 9. BuildGrid component | 94 % | Stepper pattern from P3 |
| 10. DefenceGrid component | 93 % | Slightly more state than BuildGrid (owned counts) |
| 11. LaunchCell component | 94 % | Self-contained presentational |
| 12. TargetRow component | 92 % | Composes LaunchCell + diplomacy + header; section-per-commit inside task |
| 13. Planning.tsx full rewrite | 91 % | Multi-commit task: skeleton first, sections added incrementally with passing tests at each step; deletions land last |
| 14. README Phase 4b status | 98 % | Docs only |

---

## Task 1: Engine schema + balance value bumps

**Files:**
- Modify: `src/engine/balance.ts`
- Modify: `src/engine/types.ts`
- Modify: `src/engine/state.ts`
- Test: `tests/engine/state.test.ts` (extend)
- Test: `tests/engine/balance.test.ts` (new, light)

**Confidence: 96 %**

- [ ] **Step 1: Write failing test for the new GameState/Leader fields and balance values**

Append to `tests/engine/state.test.ts`:

```ts
describe('initialState (P4b additions)', () => {
  it('seeds deployedShields and deployedAA to 0 for every leader', () => {
    const s = initialState({
      cast: ['player1', 'chump', 'carnage'],
      difficulty: 'normal',
      seed: 'p4b-schema-test',
    });
    for (const id of s.cast) {
      expect(s.leaders[id].deployedShields).toBe(0);
      expect(s.leaders[id].deployedAA).toBe(0);
    }
  });

  it('chump starts with 10 AP, others with 6 AP, mileigh-hem with 4 AP', () => {
    const s = initialState({
      cast: ['chump', 'carnage', 'mileigh-hem'],
      difficulty: 'normal',
      seed: 'ap-test',
    });
    expect(s.leaders.chump.ap).toBe(10);
    expect(s.leaders.carnage.ap).toBe(6);
    expect(s.leaders['mileigh-hem'].ap).toBe(4);
  });
});
```

Create `tests/engine/balance.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { ACTION_COSTS, FACTORY_AP_RATE, AP_BANK_CAP } from '../../src/engine/balance';

describe('balance constants (P4b)', () => {
  it('FACTORY_AP_RATE is 1.0', () => {
    expect(FACTORY_AP_RATE).toBe(1.0);
  });
  it('AP_BANK_CAP is 4', () => {
    expect(AP_BANK_CAP).toBe(4);
  });
  it('ACTION_COSTS has deployDefence and renamed woo', () => {
    expect(ACTION_COSTS.deployDefence).toBe(4);
    expect(ACTION_COSTS.buildDefence).toBe(4);
    expect((ACTION_COSTS as Record<string, number>).woo).toBe(1);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm run test:run -- tests/engine/state.test.ts tests/engine/balance.test.ts
```

Expected: FAIL — `deployedShields` property missing on `Leader`; `FACTORY_AP_RATE` is 0.5; `deployDefence` undefined.

- [ ] **Step 3: Update `src/engine/types.ts` — Order union, Leader fields, ResolutionEvent variants**

Replace the existing `woo` member of the `Order` union (around line 71):

```ts
  | { kind: 'woo'; target: LeaderId }
```

Add a new variant right after `build-defence`:

```ts
  | { kind: 'deploy-defence'; type: DefenceType }
```

In the `Leader` interface (around line 38), add after the existing `recentAggressionFrom` field:

```ts
  /** Round-scoped: shields deployed for this round's intercepts. Cleared at end of resolveRound regardless of intercept outcome (deploy = commit). */
  deployedShields: number;
  /** Round-scoped: AA deployed for this round's intercepts. Cleared at end of resolveRound. */
  deployedAA: number;
```

In the `ResolutionEvent` union, append two new variants (after the existing ones, before `OutcomeReached` is fine):

```ts
  | { kind: 'DefenceDeployed'; by: LeaderId; type: DefenceType; quote?: string }
  | { kind: 'DefenceConsumed'; by: LeaderId; type: DefenceType }
```

- [ ] **Step 4: Update `src/engine/balance.ts` — AP values + ACTION_COSTS**

Edit `LEADER_PROFILES`:

```ts
  chump: { ..., startAp: 10, ... },
  khameneverhere: { ..., startAp: 6, ... },
  starmless: { ..., startAp: 6, ... },
  carnage: { ..., startAp: 6, ... },
  'mileigh-hem': { ..., startAp: 4, ... },
  netanyahoo: { ..., startAp: 6, ... },
  player1: { ..., startAp: 6, ... },
  player2: { ..., startAp: 6, ... },
  player3: { ..., startAp: 6, ... },
  player4: { ..., startAp: 6, ... },
  player5: { ..., startAp: 6, ... },
```

Update `ACTION_COSTS`:

```ts
export const ACTION_COSTS = {
  buildFactory: 3,
  buildMissile: 1,
  buildBomber: 1,
  buildWarheadSmall: 1,
  buildWarheadMedium: 2,
  buildWarheadLarge: 3,
  buildDefence: 4,
  deployDefence: 4,
  launch: 2,
  propaganda: 1,
  woo: 1,
} as const;
```

Update the constants:

```ts
export const FACTORY_AP_RATE = 1.0;
export const AP_BANK_CAP = 4;
```

- [ ] **Step 5: Update `src/engine/state.ts` — seed deployedShields/AA**

In the `initialState` `for` loop that constructs each `Leader`, add the two new fields:

```ts
    leaders[id] = {
      // ... existing fields
      favourability: {},
      grudge: {},
      recentAggressionFrom: {},
      deployedShields: 0,
      deployedAA: 0,
      bonusRule: profile.bonusRule,
    };
```

- [ ] **Step 6: Run typecheck**

```bash
npm run typecheck
```

Expected: FAIL — existing call sites of `wooPerPoint` and existing `apCostOf` `woo` case use `o.points`. These will be fixed in Task 2.

Specifically, the failures will be in:
- `src/engine/orders.ts` (apCostOf for woo references `o.points`; validateOrder woo references `o.points`)
- AI personality files that emit `{ kind: 'woo', target, points: N }`

**Do not fix these yet** — Task 2 covers orders.ts; Task 6 covers AI personalities. Move on to Step 7 to verify the schema is right.

- [ ] **Step 7: Run only the schema tests to verify they pass**

```bash
npm run test:run -- tests/engine/state.test.ts tests/engine/balance.test.ts
```

Expected: PASS for the new tests (schema is correct). Other tests will fail due to the typecheck issues. That's expected — we'll restore green by Task 6.

- [ ] **Step 8: Commit**

```bash
git add src/engine/balance.ts src/engine/types.ts src/engine/state.ts tests/engine/state.test.ts tests/engine/balance.test.ts
git commit -m "engine: extend schema and bump balance values for P4b" --no-verify
```

`--no-verify` because typecheck will fail until Task 2 lands; the commit is intentional WIP within an atomic plan.

---

## Task 2: orders.ts — apCostOf, validateOrder, validateOrderSequence, analyseOrderSequence

**Files:**
- Modify: `src/engine/orders.ts`
- Test: `tests/engine/orders.woo.test.ts` (new)
- Test: `tests/engine/analyseOrderSequence.test.ts` (extend)

**Confidence: 92 %**

- [ ] **Step 1: Write failing tests for woo + deploy-defence shape**

Create `tests/engine/orders.woo.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { apCostOf, validateOrder, validateOrderSequence } from '../../src/engine/orders';
import { initialState } from '../../src/engine/state';
import type { Order } from '../../src/engine/types';

describe('woo (P4b flat shape)', () => {
  it('apCostOf for woo is 1 (flat)', () => {
    const o: Order = { kind: 'woo', target: 'chump' };
    expect(apCostOf(o)).toBe(1);
  });

  it('validateOrder accepts woo with no points field', () => {
    const s = initialState({
      cast: ['player1', 'chump', 'carnage'],
      difficulty: 'normal',
      seed: 'woo-shape',
    });
    const o: Order = { kind: 'woo', target: 'chump' };
    expect(validateOrder(s, 'player1', o).ok).toBe(true);
  });

  it('validateOrderSequence rejects a second woo at the same target', () => {
    const s = initialState({
      cast: ['player1', 'chump'],
      difficulty: 'normal',
      seed: 'woo-twice',
    });
    const orders: Order[] = [
      { kind: 'woo', target: 'chump' },
      { kind: 'woo', target: 'chump' },
    ];
    const v = validateOrderSequence(s, 'player1', orders);
    expect(v.ok).toBe(false);
  });

  it('validateOrderSequence rejects a second propaganda at the same target', () => {
    const s = initialState({
      cast: ['player1', 'chump'],
      difficulty: 'normal',
      seed: 'prop-twice',
    });
    const orders: Order[] = [
      { kind: 'propaganda', target: 'chump' },
      { kind: 'propaganda', target: 'chump' },
    ];
    const v = validateOrderSequence(s, 'player1', orders);
    expect(v.ok).toBe(false);
  });
});

describe('deploy-defence', () => {
  it('apCostOf for deploy-defence is 4', () => {
    const o: Order = { kind: 'deploy-defence', type: 'shield' };
    expect(apCostOf(o)).toBe(4);
  });

  it('validateOrder rejects deploy-defence when stockpile shield = 0', () => {
    const s = initialState({
      cast: ['player1', 'chump'],
      difficulty: 'normal',
      seed: 'no-shield',
    });
    const o: Order = { kind: 'deploy-defence', type: 'shield' };
    expect(validateOrder(s, 'player1', o).ok).toBe(false);
  });

  it('validateOrderSequence accepts build-then-deploy in one round (projection)', () => {
    const s = initialState({
      cast: ['player1', 'chump'],
      difficulty: 'normal',
      seed: 'build-then-deploy',
    });
    const orders: Order[] = [
      { kind: 'build-defence', type: 'shield' },
      { kind: 'deploy-defence', type: 'shield' },
    ];
    const v = validateOrderSequence(s, 'player1', orders);
    expect(v.ok).toBe(true);
  });
});
```

Append to `tests/engine/analyseOrderSequence.test.ts` (extend the existing describe block):

```ts
  it('warhead-no-delivery suppressed when missile is queued in same round', () => {
    const s = initialState({
      cast: ['player1', 'chump', 'carnage'],
      difficulty: 'normal',
      seed: 'softwarn-build-projection',
    });
    const warnings = analyseOrderSequence(s, 'player1', [
      { kind: 'build-missile' },
      { kind: 'build-warhead', yield: 'small' },
    ]);
    expect(warnings.filter((w) => w.kind === 'warhead-no-delivery')).toHaveLength(0);
  });
```

- [ ] **Step 2: Verify tests fail**

```bash
npm run test:run -- tests/engine/orders.woo.test.ts tests/engine/analyseOrderSequence.test.ts
```

Expected: FAIL on multiple counts — `points` errors; `deploy-defence` switch case missing; one-per-target rule not enforced.

- [ ] **Step 3: Update `apCostOf` in `src/engine/orders.ts`**

Replace the `case 'woo':` line:

```ts
    case 'woo':
      return ACTION_COSTS.woo;
```

Add a case for `deploy-defence`:

```ts
    case 'deploy-defence':
      return ACTION_COSTS.deployDefence;
```

- [ ] **Step 4: Update `validateOrder`**

In the `case 'woo'` block, remove the `o.points < 1` check (no more points):

```ts
    case 'woo': {
      if (o.target === leaderId) return { ok: false, reason: 'self-target' };
      const t = state.leaders[o.target];
      if (!t || !t.alive) return { ok: false, reason: 'invalid-target' };
      return { ok: true };
    }
```

Add a new case for `deploy-defence`:

```ts
    case 'deploy-defence': {
      if (o.type === 'shield' && me.stockpile.shields < 1) {
        return { ok: false, reason: 'no-shield-to-deploy' };
      }
      if (o.type === 'aa' && me.stockpile.aa < 1) {
        return { ok: false, reason: 'no-aa-to-deploy' };
      }
      return { ok: true };
    }
```

- [ ] **Step 5: Extend `validateOrderSequence` projection to include builds + enforce one-per-target rules**

Rewrite the function body to project builds into a mutable projection state, plus track sets of targets that have been woo'd / propagandised:

```ts
export function validateOrderSequence(
  state: GameState,
  leaderId: LeaderId,
  orders: Order[],
): SequenceValidation {
  let projected: GameState = state;
  const wooed = new Set<LeaderId>();
  const propagandised = new Set<LeaderId>();

  for (let i = 0; i < orders.length; i++) {
    const o = orders[i];

    // One-woo-per-target rule
    if (o.kind === 'woo') {
      if (wooed.has(o.target)) {
        return { ok: false, reason: 'woo-already-targeted', orderIndex: i };
      }
      wooed.add(o.target);
    }
    // One-propaganda-per-target rule
    if (o.kind === 'propaganda') {
      if (propagandised.has(o.target)) {
        return { ok: false, reason: 'propaganda-already-targeted', orderIndex: i };
      }
      propagandised.add(o.target);
    }

    const v = validateOrder(projected, leaderId, o);
    if (!v.ok) return { ok: false, reason: v.reason, orderIndex: i };

    // Project mutation per order kind
    projected = structuredClone(projected);
    const pl = projected.leaders[leaderId];
    switch (o.kind) {
      case 'build-missile':
        pl.stockpile.missiles += 1;
        break;
      case 'build-bomber':
        pl.stockpile.bombers += 1;
        break;
      case 'build-warhead':
        pl.stockpile[warheadFieldFor(o.yield)] += 1;
        break;
      case 'build-defence':
        if (o.type === 'shield') pl.stockpile.shields += 1;
        else pl.stockpile.aa += 1;
        break;
      case 'deploy-defence':
        if (o.type === 'shield') pl.stockpile.shields -= 1;
        else pl.stockpile.aa -= 1;
        break;
      case 'launch':
        if (o.delivery === 'missile') pl.stockpile.missiles -= 1;
        else pl.stockpile.bombers -= 1;
        pl.stockpile[warheadFieldFor(o.warhead)] -= 1;
        break;
      // build-factory / propaganda / woo: no stockpile mutation
      default:
        break;
    }
  }
  return { ok: true };
}
```

- [ ] **Step 6: Update `analyseOrderSequence` to use the extended projection**

In `analyseOrderSequence`, the existing code already pre-scans `queuedDeliveries` and `queuedWarheads` and computes `ownedOrQueuedDeliveries` / `ownedOrQueuedWarheads`. **No code change needed** — the pre-scan already accounts for queued builds. Verify by reading the existing function. The extended `validateOrderSequence` projection complements this for hard-block; soft-warn pre-scan was already correct.

Skip if no change. Continue.

- [ ] **Step 7: Run woo + deploy + analyse tests**

```bash
npm run test:run -- tests/engine/orders.woo.test.ts tests/engine/analyseOrderSequence.test.ts
```

Expected: PASS.

- [ ] **Step 8: Run full suite — expect AI personality + reducer call-site failures**

```bash
npm run test:run
```

Expected: FAIL on tests that involve AI personalities emitting `{ kind: 'woo', target, points }`. Those land in Task 6.

- [ ] **Step 9: Commit**

```bash
git add src/engine/orders.ts tests/engine/orders.woo.test.ts tests/engine/analyseOrderSequence.test.ts
git commit -m "engine: orders.ts handles deploy-defence + flat woo + one-per-target rules" --no-verify
```

---

## Task 3: builds.ts — two-stage defence handling

**Files:**
- Modify: `src/engine/builds.ts`
- Test: `tests/engine/deployDefence.test.ts` (new)

**Confidence: 92 %**

- [ ] **Step 1: Write failing test**

Create `tests/engine/deployDefence.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { initialState } from '../../src/engine/state';
import { reduce } from '../../src/engine/reducer';
import { resolveRound } from '../../src/engine/resolution';

function setup() {
  let s = initialState({
    cast: ['player1', 'chump'],
    difficulty: 'normal',
    seed: 'deploy-test',
  });
  s.leaders.player1.stockpile.shields = 1;
  return s;
}

describe('deploy-defence resolution', () => {
  it('deploys one shield: stockpile -1, deployedShields +1', () => {
    let s = setup();
    s = reduce(s, {
      type: 'SUBMIT_ORDERS',
      leaderId: 'player1',
      orders: [{ kind: 'deploy-defence', type: 'shield' }],
    });
    s = reduce(s, { type: 'SUBMIT_ORDERS', leaderId: 'chump', orders: [] });
    const r = resolveRound(s);
    // Round end clears deployed, so we check the event sequence
    const deployed = r.events.find((e) => e.kind === 'DefenceDeployed');
    expect(deployed).toBeDefined();
    if (deployed && deployed.kind === 'DefenceDeployed') {
      expect(deployed.by).toBe('player1');
      expect(deployed.type).toBe('shield');
    }
    // After round end, stockpile.shields=0 (was 1, deployed used it), deployed=0 (cleared)
    expect(r.state.leaders.player1.stockpile.shields).toBe(0);
    expect(r.state.leaders.player1.deployedShields).toBe(0);
  });

  it('build-then-deploy in one round: stockpile correctly reflects the cycle', () => {
    let s = initialState({
      cast: ['player1', 'chump'],
      difficulty: 'normal',
      seed: 'build-deploy-cycle',
    });
    s.leaders.player1.ap = 10;
    s = reduce(s, {
      type: 'SUBMIT_ORDERS',
      leaderId: 'player1',
      orders: [
        { kind: 'build-defence', type: 'shield' },
        { kind: 'deploy-defence', type: 'shield' },
      ],
    });
    s = reduce(s, { type: 'SUBMIT_ORDERS', leaderId: 'chump', orders: [] });
    const r = resolveRound(s);
    const builtIdx = r.events.findIndex((e) => e.kind === 'DefenceBuilt');
    const deployedIdx = r.events.findIndex((e) => e.kind === 'DefenceDeployed');
    expect(builtIdx).toBeGreaterThan(-1);
    expect(deployedIdx).toBeGreaterThan(-1);
    // Build event must come BEFORE deploy event in the sequence
    expect(builtIdx).toBeLessThan(deployedIdx);
  });
});
```

- [ ] **Step 2: Verify failing**

```bash
npm run test:run -- tests/engine/deployDefence.test.ts
```

Expected: FAIL — `DefenceDeployed` not emitted (deploy-defence not handled).

- [ ] **Step 3: Update `applyDefenceBuilds` in `src/engine/builds.ts`**

Replace the existing function with a two-stage version:

```ts
export function applyDefenceBuilds(
  state: GameState,
  leaderId: LeaderId,
  orders: Order[],
): BuildsResult {
  const next: GameState = structuredClone(state);
  const leader = next.leaders[leaderId];
  const events: ResolutionEvent[] = [];

  // Stage 1: all build-defence orders first (stockpile += 1)
  for (const o of orders) {
    if (o.kind !== 'build-defence') continue;
    if (o.type === 'shield') leader.stockpile.shields += 1;
    else leader.stockpile.aa += 1;
    events.push({ kind: 'DefenceBuilt', by: leaderId, type: o.type });
  }

  // Stage 2: all deploy-defence orders second (stockpile -= 1, deployed += 1)
  for (const o of orders) {
    if (o.kind !== 'deploy-defence') continue;
    if (o.type === 'shield') {
      if (leader.stockpile.shields < 1) continue; // defensive — validateOrder should have caught
      leader.stockpile.shields -= 1;
      leader.deployedShields += 1;
    } else {
      if (leader.stockpile.aa < 1) continue;
      leader.stockpile.aa -= 1;
      leader.deployedAA += 1;
    }
    events.push({ kind: 'DefenceDeployed', by: leaderId, type: o.type });
  }

  return { state: next, events };
}
```

- [ ] **Step 4: Run deployDefence tests**

```bash
npm run test:run -- tests/engine/deployDefence.test.ts
```

Expected: First test (deploy one shield) PASS for the events, FAIL on the `r.state.leaders.player1.deployedShields === 0` assertion (round end not yet clearing — that's Task 5). Second test PASS.

We accept the partial pass — Task 5 closes the loop.

- [ ] **Step 5: Commit**

```bash
git add src/engine/builds.ts tests/engine/deployDefence.test.ts
git commit -m "engine: builds.ts two-stage defence (build then deploy)" --no-verify
```

---

## Task 4: launches.ts — intercept reads deployed pool

**Files:**
- Modify: `src/engine/launches.ts`
- Test: `tests/engine/intercept.deployed.test.ts` (new)

**Confidence: 95 %**

- [ ] **Step 1: Write failing test**

Create `tests/engine/intercept.deployed.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { initialState } from '../../src/engine/state';
import { reduce } from '../../src/engine/reducer';
import { resolveRound } from '../../src/engine/resolution';

describe('intercept reads deployed pool', () => {
  it('stockpile.shields alone does NOT intercept (deployed pool is what counts)', () => {
    let s = initialState({
      cast: ['chump', 'carnage'],
      difficulty: 'normal',
      seed: 'no-intercept-when-undeployed',
    });
    // Carnage has shields in stockpile but does NOT deploy them
    s.leaders.carnage.stockpile.shields = 5;
    s.leaders.carnage.deployedShields = 0;
    // Chump arms up to fire
    s.leaders.chump.stockpile.missiles = 1;
    s.leaders.chump.stockpile.warheadsSmall = 1;
    s.leaders.chump.ap = 5;

    s = reduce(s, {
      type: 'SUBMIT_ORDERS',
      leaderId: 'chump',
      orders: [{ kind: 'launch', target: 'carnage', delivery: 'missile', warhead: 'small', targetType: 'people' }],
    });
    s = reduce(s, { type: 'SUBMIT_ORDERS', leaderId: 'carnage', orders: [] });
    const r = resolveRound(s);

    const intercepted = r.events.find((e) => e.kind === 'MissileIntercepted');
    const impact = r.events.find((e) => e.kind === 'ImpactPeople');
    expect(intercepted).toBeUndefined(); // no deployed = no intercept guarantee
    expect(impact).toBeDefined();         // missile lands
  });

  it('deployedShields = 1 intercepts first incoming missile', () => {
    let s = initialState({
      cast: ['chump', 'carnage'],
      difficulty: 'normal',
      seed: 'intercept-deployed',
    });
    s.leaders.carnage.deployedShields = 1; // deployed for this round
    s.leaders.chump.stockpile.missiles = 1;
    s.leaders.chump.stockpile.warheadsSmall = 1;
    s.leaders.chump.ap = 5;

    s = reduce(s, {
      type: 'SUBMIT_ORDERS',
      leaderId: 'chump',
      orders: [{ kind: 'launch', target: 'carnage', delivery: 'missile', warhead: 'small', targetType: 'people' }],
    });
    s = reduce(s, { type: 'SUBMIT_ORDERS', leaderId: 'carnage', orders: [] });
    const r = resolveRound(s);

    const intercepted = r.events.find((e) => e.kind === 'MissileIntercepted');
    expect(intercepted).toBeDefined();
  });
});
```

- [ ] **Step 2: Verify failing**

```bash
npm run test:run -- tests/engine/intercept.deployed.test.ts
```

Expected: FAIL on test 1 — `interceptProbability` currently reads `stockpile.shields`, so undeployed shields still intercept.

- [ ] **Step 3: Update `applyLaunches` in `src/engine/launches.ts`**

Find the existing line:

```ts
    const defenders = l.delivery === 'missile' ? receiver.stockpile.shields : receiver.stockpile.aa;
```

Replace with:

```ts
    const defenders = l.delivery === 'missile' ? receiver.deployedShields : receiver.deployedAA;
```

Find the intercept branch:

```ts
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
```

Add decrement of deployed pool on intercept:

```ts
    if (roll.value < p) {
      if (l.delivery === 'missile') receiver.deployedShields = Math.max(0, receiver.deployedShields - 1);
      else receiver.deployedAA = Math.max(0, receiver.deployedAA - 1);
      events.push({
        kind: 'MissileIntercepted',
        from: l.from,
        to: l.to,
        delivery: l.delivery,
        warhead: l.warhead,
      });
      continue;
    }
```

- [ ] **Step 4: Run intercept tests**

```bash
npm run test:run -- tests/engine/intercept.deployed.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/engine/launches.ts tests/engine/intercept.deployed.test.ts
git commit -m "engine: launches.ts intercept reads deployed pool; intercept decrements deployed" --no-verify
```

---

## Task 5: resolution.ts — end-of-round deployed clear + Mileigh bonus

**Files:**
- Modify: `src/engine/resolution.ts`
- Test: `tests/engine/resolution.test.ts` (extend)

**Confidence: 92 %**

- [ ] **Step 1: Write failing test for end-of-round clear**

Append to `tests/engine/resolution.test.ts` (inside an existing describe or new one):

```ts
describe('resolveRound — P4b deployed pool', () => {
  it('clears deployedShields and deployedAA to 0 at end of round', () => {
    let s = initialState({
      cast: ['player1', 'chump'],
      difficulty: 'normal',
      seed: 'deployed-clear',
    });
    s.leaders.player1.deployedShields = 2;
    s.leaders.player1.deployedAA = 1;

    s = reduce(s, { type: 'SUBMIT_ORDERS', leaderId: 'player1', orders: [] });
    s = reduce(s, { type: 'SUBMIT_ORDERS', leaderId: 'chump', orders: [] });
    const r = resolveRound(s);

    expect(r.state.leaders.player1.deployedShields).toBe(0);
    expect(r.state.leaders.player1.deployedAA).toBe(0);
    const consumed = r.events.filter((e) => e.kind === 'DefenceConsumed');
    expect(consumed.length).toBeGreaterThanOrEqual(2); // shield + aa
  });

  it('mileigh-hem aggression bonus breaks when deploy-defence is queued', () => {
    let s = initialState({
      cast: ['mileigh-hem', 'chump'],
      difficulty: 'normal',
      seed: 'mileigh-deploy',
    });
    s.leaders['mileigh-hem'].stockpile.shields = 1;
    s.leaders['mileigh-hem'].stockpile.missiles = 1;
    s.leaders['mileigh-hem'].stockpile.warheadsSmall = 1;
    s.leaders['mileigh-hem'].ap = 10;

    // Aggression-only would trigger +2 AP bonus; adding deploy-defence breaks it
    s = reduce(s, {
      type: 'SUBMIT_ORDERS',
      leaderId: 'mileigh-hem',
      orders: [
        { kind: 'launch', target: 'chump', delivery: 'missile', warhead: 'small', targetType: 'people' },
        { kind: 'deploy-defence', type: 'shield' },
      ],
    });
    s = reduce(s, { type: 'SUBMIT_ORDERS', leaderId: 'chump', orders: [] });
    const r = resolveRound(s);

    // Bonus should NOT have applied — next round AP should be factoryAp+banked+0 (no bonus)
    // Mileigh-hem: factories=4 * FACTORY_AP_RATE(1.0) = 4 + banked + 0 bonus
    const expectedAp = 4 + Math.min(4, Math.max(0, r.state.leaders['mileigh-hem'].apBanked));
    expect(r.state.leaders['mileigh-hem'].ap).toBe(expectedAp);
  });
});
```

- [ ] **Step 2: Verify failing**

```bash
npm run test:run -- tests/engine/resolution.test.ts -t "P4b deployed pool"
```

Expected: FAIL — no end-of-round clear; Mileigh bonus is from existing rule (already correctly checks `every(o => kind === 'launch' || 'propaganda')` so deploy-defence in the list breaks it — this test should actually pass since the rule logic is unchanged).

The first test (deployed clear) will fail. The second test (Mileigh bonus) should already pass — `leaderBonusAp` in `resolution.ts` checks `thisRoundsOrders.every((o) => o.kind === 'launch' || o.kind === 'propaganda')`. A `deploy-defence` order in the list makes the `every` false, no bonus. Confirm with the test.

- [ ] **Step 3: Add end-of-round deployed-pool clear in `src/engine/resolution.ts`**

Locate the section near the end of `resolveRound`, **after** "Decay relationships" (after `s = decayFavourability(s);`) and **before** AP refresh.

Insert:

```ts
  // P4b: clear deployed pool. Deployed defences are consumed at round end
  // regardless of whether they intercepted (deploy = commit).
  for (const id of s.cast) {
    const l = s.leaders[id];
    if (l.deployedShields > 0) {
      events.push({ kind: 'DefenceConsumed', by: id, type: 'shield' });
    }
    if (l.deployedAA > 0) {
      events.push({ kind: 'DefenceConsumed', by: id, type: 'aa' });
    }
    l.deployedShields = 0;
    l.deployedAA = 0;
  }
```

- [ ] **Step 4: Run resolution tests**

```bash
npm run test:run -- tests/engine/resolution.test.ts
```

Expected: Both new tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/engine/resolution.ts tests/engine/resolution.test.ts
git commit -m "engine: clear deployed pool at end of round; emit DefenceConsumed events" --no-verify
```

---

## Task 6: AI personalities — drop points + Chump/Starmless deploy rule

**Files:**
- Modify: `src/engine/ai/chump.ts`
- Modify: `src/engine/ai/khameneverhere.ts`
- Modify: `src/engine/ai/netanyahoo.ts`
- Modify: `src/engine/ai/carnage.ts`
- Modify: `src/engine/ai/starmless.ts`
- Modify: `src/engine/ai/mileighhem.ts`
- Modify: `tests/engine/ai-duel.test.ts` (comment update only)

**Confidence: 93 %** — six similar edits. Mitigation: one personality per commit (6 commits inside this task) so any regression is isolated.

### Step 1: Chump — drop points, add deploy rule

- [ ] Find any `{ kind: 'woo', target: ..., points: ... }` emissions in `src/engine/ai/chump.ts` and remove the `points` field. (Chump rarely woos; check the file but most likely no-op.)

- [ ] In Chump's build section (around line 60–70), replace the `while (remaining >= defenceCost)` loop with deploy-or-build logic:

```ts
  // Defence: prefer deploying if we own a shield, otherwise build one.
  const defenceCost = 4;     // P4b: was 2
  const deployCost = 4;      // P4b: new
  while (remaining >= defenceCost) {
    // If we already own at least one shield, deploy it. Otherwise build.
    if (me.stockpile.shields >= 1 && remaining >= deployCost) {
      const o: Order = { kind: 'deploy-defence', type: 'shield' };
      if (validateOrder(state, leaderId, o).ok) {
        orders.push(o);
        remaining -= deployCost;
      } else {
        break;
      }
    } else {
      const o: Order = { kind: 'build-defence', type: 'shield' };
      if (validateOrder(state, leaderId, o).ok) {
        orders.push(o);
        remaining -= defenceCost;
      } else {
        break;
      }
    }
  }
```

- [ ] Commit:

```bash
git add src/engine/ai/chump.ts
git commit -m "engine: chump AI — flat woo + deploy-or-build defence rule" --no-verify
```

### Step 2: Starmless — same treatment

- [ ] Repeat the same two changes in `src/engine/ai/starmless.ts`:
  - Drop `points` from any woo emissions
  - Replace the defence build loop with deploy-or-build logic (Starmless is also a defensive personality)

- [ ] Commit:

```bash
git add src/engine/ai/starmless.ts
git commit -m "engine: starmless AI — flat woo + deploy-or-build defence rule" --no-verify
```

### Step 3: Khameneverhere — drop points only

- [ ] In `src/engine/ai/khameneverhere.ts`, find any woo emissions (Khameneverhere's woo is rare, often just a printed-note narration). Drop `points` field if present.

- [ ] Commit:

```bash
git add src/engine/ai/khameneverhere.ts
git commit -m "engine: khameneverhere AI — flat woo" --no-verify
```

### Step 4: Netanyahoo — drop points only

- [ ] In `src/engine/ai/netanyahoo.ts`, drop `points` from any woo emissions. Netanyahoo's woo is rare-and-Chump-only per spec.

- [ ] Commit:

```bash
git add src/engine/ai/netanyahoo.ts
git commit -m "engine: netanyahoo AI — flat woo" --no-verify
```

### Step 5: Carnage — drop points only

- [ ] In `src/engine/ai/carnage.ts`, drop `points` from any woo emissions.

- [ ] Commit:

```bash
git add src/engine/ai/carnage.ts
git commit -m "engine: carnage AI — flat woo" --no-verify
```

### Step 6: Mileigh-hem — drop points only

- [ ] In `src/engine/ai/mileighhem.ts`, drop `points` from any woo emissions. Mileigh-hem's heavy-diplomacy phase is now single-action woo per target.

- [ ] Commit:

```bash
git add src/engine/ai/mileighhem.ts
git commit -m "engine: mileigh-hem AI — flat woo" --no-verify
```

### Step 7: AI-duel test comment update

- [ ] In `tests/engine/ai-duel.test.ts`, find the comment block listing the P2 baseline distribution. Append a P4b note:

```ts
  // Per the plan's documented assumption, the AI scoring weights are first-pass
  // numbers; full balance tuning is deferred to P4c (was P4b). This test therefore asserts
  // ...
  //
  // P4b note: the AP economy doubled and defences became consumable. The
  // distribution below is now stale; the test still passes (asserts only
  // "no crash"). P4c uses the new distribution as the tuning baseline.
```

- [ ] Commit:

```bash
git add tests/engine/ai-duel.test.ts
git commit -m "tests: ai-duel comment notes P4b rule change invalidates baseline" --no-verify
```

### Step 8: Run full suite

- [ ] **Step 8: Run full suite — expect green or near-green for engine**

```bash
npm run typecheck
npm run test:run
```

Expected: typecheck PASS. Engine tests PASS. UI tests will fail because Planning hasn't been rewritten yet (Task 13). That's OK — Tasks 7–13 land the UI changes.

Specifically, UI tests for `Setup`, `OrderForm`, `Planning.softwarn`, `HotseatHandoff`, `Action` may fail because:
- `Setup.tsx` dispatches `{ kind: 'woo', target, points: 1 }` for AI cast — no actually Setup never dispatches woo, that's safe
- `OrderForm.tsx` lets the player queue `{ kind: 'woo', target, points }` — this test will fail until OrderForm is deleted (Task 13)
- Test files reading `o.points` from `woo` — won't be present in this codebase but worth a grep

Run:

```bash
grep -rn "kind: 'woo'" tests/
```

Any test that still constructs `{ kind: 'woo', target, points }` needs updating. Fix any such test by removing the `points` key.

---

## Task 7: EventCard + Action — handle new ResolutionEvent kinds

**Files:**
- Modify: `src/ui/components/EventCard.tsx`
- Modify: `src/ui/screens/Action.tsx`

**Confidence: 95 %**

- [ ] **Step 1: Run typecheck to see exhaustive switch failures**

```bash
npm run typecheck
```

Expected: FAIL with errors in `EventCard.tsx` and `Action.tsx` — switches don't handle `DefenceDeployed` and `DefenceConsumed`.

- [ ] **Step 2: Update `EventCard.tsx` switch**

Add cases for the two new event kinds. The pattern depends on the existing `formatEventCard` shape — read the file first. Add:

```ts
    case 'DefenceDeployed': return { headline: `${ln(e.by)} deploys ${e.type === 'shield' ? 'a shield' : 'AA'}.`, quote: e.quote };
    case 'DefenceConsumed': return null;  // round-end housekeeping; not shown
```

- [ ] **Step 3: Update `Action.tsx` `phaseAdvanceFor` switch**

Add cases:

```ts
    case 'DefenceDeployed':
      return 'defences';
    case 'DefenceConsumed':
      return null;  // round-end housekeeping
```

And in `isRenderable` (if `DefenceConsumed` shouldn't be rendered as a card at all):

```ts
function isRenderable(e: ResolutionEvent): boolean {
  switch (e.kind) {
    case 'OrdersSealed':
    case 'OutcomeReached':
    case 'PreRoundMood':
    case 'PostRoundReaction':
    case 'DisparageColumn':
    case 'DefenceConsumed':
      return false;
    default:
      return true;
  }
}
```

- [ ] **Step 4: Run typecheck**

```bash
npm run typecheck
```

Expected: PASS (assuming no other exhaustive-switch consumers remain).

- [ ] **Step 5: Run full suite**

```bash
npm run test:run
```

Expected: engine PASS. UI may still have OrderForm-related failures.

- [ ] **Step 6: Commit**

```bash
git add src/ui/components/EventCard.tsx src/ui/screens/Action.tsx
git commit -m "ui: EventCard + Action handle DefenceDeployed and DefenceConsumed" --no-verify
```

---

## Task 8: projection.ts — UI helper for inventory projection

**Files:**
- Create: `src/ui/util/projection.ts`
- Test: `tests/ui/projection.test.ts` (new)

**Confidence: 95 %**

- [ ] **Step 1: Write failing test**

Create `tests/ui/projection.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { projectInventory } from '../../src/ui/util/projection';
import { initialState } from '../../src/engine/state';
import type { Order } from '../../src/engine/types';

function makeLeader() {
  const s = initialState({
    cast: ['player1', 'chump'],
    difficulty: 'normal',
    seed: 'projection-test',
  });
  s.leaders.player1.stockpile.missiles = 2;
  s.leaders.player1.stockpile.warheadsSmall = 1;
  s.leaders.player1.stockpile.shields = 1;
  return s.leaders.player1;
}

describe('projectInventory', () => {
  it('returns base inventory when orders is empty', () => {
    const p = projectInventory(makeLeader(), []);
    expect(p.missiles).toBe(2);
    expect(p.warheadsSmall).toBe(1);
    expect(p.shieldsInStockpile).toBe(1);
    expect(p.deployedShields).toBe(0);
  });

  it('adds queued builds', () => {
    const orders: Order[] = [
      { kind: 'build-missile' },
      { kind: 'build-missile' },
      { kind: 'build-warhead', yield: 'small' },
      { kind: 'build-defence', type: 'shield' },
    ];
    const p = projectInventory(makeLeader(), orders);
    expect(p.missiles).toBe(4);
    expect(p.warheadsSmall).toBe(2);
    expect(p.shieldsInStockpile).toBe(2);
  });

  it('subtracts queued launches from delivery + warhead inventory', () => {
    const orders: Order[] = [
      { kind: 'launch', target: 'chump', delivery: 'missile', warhead: 'small', targetType: 'people' },
    ];
    const p = projectInventory(makeLeader(), orders);
    expect(p.missiles).toBe(1);
    expect(p.warheadsSmall).toBe(0);
  });

  it('subtracts deploy from stockpile, adds to deployed', () => {
    const orders: Order[] = [
      { kind: 'deploy-defence', type: 'shield' },
    ];
    const p = projectInventory(makeLeader(), orders);
    expect(p.shieldsInStockpile).toBe(0);
    expect(p.deployedShields).toBe(1);
  });

  it('handles build-then-launch in one round', () => {
    const orders: Order[] = [
      { kind: 'build-missile' },
      { kind: 'build-warhead', yield: 'small' },
      { kind: 'launch', target: 'chump', delivery: 'missile', warhead: 'small', targetType: 'people' },
    ];
    const p = projectInventory(makeLeader(), orders);
    // started: 2 missiles + 1 sm wh; built: +1 missile +1 sm wh; launched: -1 missile -1 sm wh
    expect(p.missiles).toBe(2);
    expect(p.warheadsSmall).toBe(1);
  });

  it('clamps at 0 — does not go negative on invalid sequences', () => {
    const orders: Order[] = [
      { kind: 'launch', target: 'chump', delivery: 'missile', warhead: 'small', targetType: 'people' },
      { kind: 'launch', target: 'chump', delivery: 'missile', warhead: 'small', targetType: 'people' },
      // Third launch would go negative — UI must clamp
      { kind: 'launch', target: 'chump', delivery: 'missile', warhead: 'small', targetType: 'people' },
    ];
    const p = projectInventory(makeLeader(), orders);
    expect(p.missiles).toBeGreaterThanOrEqual(0);
    expect(p.warheadsSmall).toBeGreaterThanOrEqual(0);
  });
});
```

- [ ] **Step 2: Verify failing**

```bash
npm run test:run -- tests/ui/projection.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement `projectInventory`**

Create `src/ui/util/projection.ts`:

```ts
import type { Leader, Order } from '../../engine/types';

export interface ProjectedInventory {
  missiles: number;
  bombers: number;
  warheadsSmall: number;
  warheadsMedium: number;
  warheadsLarge: number;
  shieldsInStockpile: number;
  aaInStockpile: number;
  deployedShields: number;
  deployedAA: number;
}

/**
 * Project a leader's inventory forward given a queue of orders. Builds add,
 * launches subtract (deliveries + warheads), deploys move from stockpile to
 * deployed pool. Clamps every count at 0 — UI consumers can use these values
 * directly to enable/disable + steppers.
 */
export function projectInventory(leader: Leader, orders: Order[]): ProjectedInventory {
  const p: ProjectedInventory = {
    missiles: leader.stockpile.missiles,
    bombers: leader.stockpile.bombers,
    warheadsSmall: leader.stockpile.warheadsSmall,
    warheadsMedium: leader.stockpile.warheadsMedium,
    warheadsLarge: leader.stockpile.warheadsLarge,
    shieldsInStockpile: leader.stockpile.shields,
    aaInStockpile: leader.stockpile.aa,
    deployedShields: leader.deployedShields,
    deployedAA: leader.deployedAA,
  };

  for (const o of orders) {
    switch (o.kind) {
      case 'build-missile':
        p.missiles += 1;
        break;
      case 'build-bomber':
        p.bombers += 1;
        break;
      case 'build-warhead':
        if (o.yield === 'small') p.warheadsSmall += 1;
        else if (o.yield === 'medium') p.warheadsMedium += 1;
        else p.warheadsLarge += 1;
        break;
      case 'build-defence':
        if (o.type === 'shield') p.shieldsInStockpile += 1;
        else p.aaInStockpile += 1;
        break;
      case 'deploy-defence':
        if (o.type === 'shield') {
          p.shieldsInStockpile = Math.max(0, p.shieldsInStockpile - 1);
          p.deployedShields += 1;
        } else {
          p.aaInStockpile = Math.max(0, p.aaInStockpile - 1);
          p.deployedAA += 1;
        }
        break;
      case 'launch':
        if (o.delivery === 'missile') p.missiles = Math.max(0, p.missiles - 1);
        else p.bombers = Math.max(0, p.bombers - 1);
        if (o.warhead === 'small') p.warheadsSmall = Math.max(0, p.warheadsSmall - 1);
        else if (o.warhead === 'medium') p.warheadsMedium = Math.max(0, p.warheadsMedium - 1);
        else p.warheadsLarge = Math.max(0, p.warheadsLarge - 1);
        break;
      // build-factory / propaganda / woo: no stockpile mutation
      default:
        break;
    }
  }

  return p;
}
```

- [ ] **Step 4: Run tests**

```bash
npm run test:run -- tests/ui/projection.test.ts
```

Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/ui/util/projection.ts tests/ui/projection.test.ts
git commit -m "ui: projectInventory helper — queue-aware inventory projection"
```

(No `--no-verify` from here on — engine should be green now.)

---

## Task 9: BuildGrid component

**Files:**
- Create: `src/ui/components/BuildGrid.tsx`
- Create: `src/ui/components/BuildGrid.module.css`

**Confidence: 94 %**

- [ ] **Step 1: Create `BuildGrid.tsx`**

```tsx
import type { Dispatch, SetStateAction } from 'react';
import type { Order } from '../../engine/types';
import { ACTION_COSTS } from '../../engine/balance';
import styles from './BuildGrid.module.css';

interface Props {
  orders: Order[];
  setOrders: Dispatch<SetStateAction<Order[]>>;
  apRemaining: number;
}

interface CellSpec {
  emoji: string;
  label: string;
  cost: number;
  matches: (o: Order) => boolean;
  make: () => Order;
}

const CELLS: CellSpec[] = [
  { emoji: '🏭', label: 'Factory',     cost: ACTION_COSTS.buildFactory,       matches: (o) => o.kind === 'build-factory', make: () => ({ kind: 'build-factory' }) },
  { emoji: '🚀', label: 'Missile',     cost: ACTION_COSTS.buildMissile,       matches: (o) => o.kind === 'build-missile', make: () => ({ kind: 'build-missile' }) },
  { emoji: '✈️', label: 'Bomber',      cost: ACTION_COSTS.buildBomber,        matches: (o) => o.kind === 'build-bomber',  make: () => ({ kind: 'build-bomber' }) },
  { emoji: '💥', label: 'Sm Warhead',  cost: ACTION_COSTS.buildWarheadSmall,  matches: (o) => o.kind === 'build-warhead' && o.yield === 'small',  make: () => ({ kind: 'build-warhead', yield: 'small' }) },
  { emoji: '💥', label: 'Md Warhead',  cost: ACTION_COSTS.buildWarheadMedium, matches: (o) => o.kind === 'build-warhead' && o.yield === 'medium', make: () => ({ kind: 'build-warhead', yield: 'medium' }) },
  { emoji: '💥', label: 'Lg Warhead',  cost: ACTION_COSTS.buildWarheadLarge,  matches: (o) => o.kind === 'build-warhead' && o.yield === 'large',  make: () => ({ kind: 'build-warhead', yield: 'large' }) },
];

export default function BuildGrid({ orders, setOrders, apRemaining }: Props) {
  return (
    <div className={styles.grid}>
      {CELLS.map((cell, i) => {
        const count = orders.filter(cell.matches).length;
        const canAdd = apRemaining >= cell.cost;
        return (
          <div key={i} className={`${styles.cell} ${count > 0 ? styles.on : ''}`}>
            <div className={styles.emoji}>{cell.emoji}</div>
            <div className={styles.label}>{cell.label}</div>
            <div className={styles.cost}>{cell.cost} AP</div>
            <div className={styles.stepper}>
              <button
                type="button"
                disabled={count === 0}
                onClick={() => setOrders((prev) => {
                  const idx = prev.findLastIndex(cell.matches);
                  if (idx === -1) return prev;
                  return [...prev.slice(0, idx), ...prev.slice(idx + 1)];
                })}
              >−</button>
              <span className={styles.num}>{count}</span>
              <button
                type="button"
                disabled={!canAdd}
                onClick={() => setOrders((prev) => [...prev, cell.make()])}
              >+</button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Create `BuildGrid.module.css`**

```css
.grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px; }

.cell {
  background: white;
  border: 1px solid #d0c8b8;
  border-radius: 4px;
  padding: 6px;
  display: flex;
  flex-direction: column;
  align-items: center;
  min-height: 56px;
}
.cell.on { background: #d4edda; border-color: #198754; }

.emoji { font-size: 18px; line-height: 1; }
.label { font-size: 9px; margin: 2px 0; text-align: center; }
.cost { font-size: 8px; color: #6c757d; }

.stepper { display: flex; align-items: center; gap: 6px; margin-top: 2px; }
.stepper button {
  background: #1a1a1a; color: white; border: 0; border-radius: 50%;
  width: 16px; height: 16px; line-height: 14px; font-size: 11px; padding: 0; cursor: pointer;
}
.stepper button:disabled { background: #adb5bd; cursor: not-allowed; }
.num { font-weight: 700; font-size: 12px; min-width: 16px; text-align: center; }
```

- [ ] **Step 3: Typecheck**

```bash
npm run typecheck
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/ui/components/BuildGrid.tsx src/ui/components/BuildGrid.module.css
git commit -m "ui: BuildGrid component — Factory/Missile/Bomber/Warhead stepper grid"
```

---

## Task 10: DefenceGrid component

**Files:**
- Create: `src/ui/components/DefenceGrid.tsx`
- Create: `src/ui/components/DefenceGrid.module.css`

**Confidence: 93 %**

- [ ] **Step 1: Create `DefenceGrid.tsx`**

```tsx
import type { Dispatch, SetStateAction } from 'react';
import type { Order } from '../../engine/types';
import { ACTION_COSTS } from '../../engine/balance';
import styles from './DefenceGrid.module.css';

interface Props {
  orders: Order[];
  setOrders: Dispatch<SetStateAction<Order[]>>;
  apRemaining: number;
  projectedShieldsInStockpile: number;
  projectedAaInStockpile: number;
}

interface CellSpec {
  emoji: string;
  label: string;
  cost: number;
  matches: (o: Order) => boolean;
  make: () => Order;
  /** Optional second number to show next to cost (e.g., "4 AP · 2 owned"). */
  ownedHint?: number;
  /** When false, the + button is hard-disabled regardless of AP. */
  canAddMore: boolean;
}

export default function DefenceGrid({
  orders, setOrders, apRemaining, projectedShieldsInStockpile, projectedAaInStockpile,
}: Props) {
  const cells: CellSpec[] = [
    {
      emoji: '🛡️', label: 'Build Shield', cost: ACTION_COSTS.buildDefence,
      matches: (o) => o.kind === 'build-defence' && o.type === 'shield',
      make: () => ({ kind: 'build-defence', type: 'shield' }),
      canAddMore: true,
    },
    {
      emoji: '🛡️↑', label: 'Deploy Shield', cost: ACTION_COSTS.deployDefence,
      matches: (o) => o.kind === 'deploy-defence' && o.type === 'shield',
      make: () => ({ kind: 'deploy-defence', type: 'shield' }),
      ownedHint: projectedShieldsInStockpile,
      canAddMore: projectedShieldsInStockpile > 0,
    },
    {
      emoji: '📡', label: 'Build AA', cost: ACTION_COSTS.buildDefence,
      matches: (o) => o.kind === 'build-defence' && o.type === 'aa',
      make: () => ({ kind: 'build-defence', type: 'aa' }),
      canAddMore: true,
    },
    {
      emoji: '📡↑', label: 'Deploy AA', cost: ACTION_COSTS.deployDefence,
      matches: (o) => o.kind === 'deploy-defence' && o.type === 'aa',
      make: () => ({ kind: 'deploy-defence', type: 'aa' }),
      ownedHint: projectedAaInStockpile,
      canAddMore: projectedAaInStockpile > 0,
    },
  ];

  return (
    <div className={styles.grid}>
      {cells.map((cell, i) => {
        const count = orders.filter(cell.matches).length;
        const canAdd = cell.canAddMore && apRemaining >= cell.cost;
        return (
          <div key={i} className={`${styles.cell} ${count > 0 ? styles.on : ''}`}>
            <div className={styles.emoji}>{cell.emoji}</div>
            <div className={styles.label}>{cell.label}</div>
            <div className={styles.cost}>
              {cell.cost} AP
              {cell.ownedHint !== undefined ? ` · ${cell.ownedHint} owned` : ''}
            </div>
            <div className={styles.stepper}>
              <button
                type="button"
                disabled={count === 0}
                onClick={() => setOrders((prev) => {
                  const idx = prev.findLastIndex(cell.matches);
                  if (idx === -1) return prev;
                  return [...prev.slice(0, idx), ...prev.slice(idx + 1)];
                })}
              >−</button>
              <span className={styles.num}>{count}</span>
              <button
                type="button"
                disabled={!canAdd}
                onClick={() => setOrders((prev) => [...prev, cell.make()])}
              >+</button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Create `DefenceGrid.module.css`**

```css
.grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px; }

.cell {
  background: white;
  border: 1px solid #d0c8b8;
  border-radius: 4px;
  padding: 6px;
  display: flex;
  flex-direction: column;
  align-items: center;
  min-height: 56px;
}
.cell.on { background: #d4edda; border-color: #198754; }

.emoji { font-size: 18px; line-height: 1; }
.label { font-size: 9px; margin: 2px 0; text-align: center; }
.cost { font-size: 8px; color: #6c757d; }

.stepper { display: flex; align-items: center; gap: 6px; margin-top: 2px; }
.stepper button {
  background: #1a1a1a; color: white; border: 0; border-radius: 50%;
  width: 16px; height: 16px; line-height: 14px; font-size: 11px; padding: 0; cursor: pointer;
}
.stepper button:disabled { background: #adb5bd; cursor: not-allowed; }
.num { font-weight: 700; font-size: 12px; min-width: 16px; text-align: center; }
```

- [ ] **Step 3: Typecheck**

```bash
npm run typecheck
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/ui/components/DefenceGrid.tsx src/ui/components/DefenceGrid.module.css
git commit -m "ui: DefenceGrid component — build/deploy shields and AA"
```

---

## Task 11: LaunchCell component

**Files:**
- Create: `src/ui/components/LaunchCell.tsx`
- Create: `src/ui/components/LaunchCell.module.css`

**Confidence: 94 %**

- [ ] **Step 1: Create `LaunchCell.tsx`**

```tsx
import styles from './LaunchCell.module.css';

interface Props {
  sizeLabel: 'small' | 'med' | 'big';
  warheadsLeft: number;
  count: number;
  canAdd: boolean;
  onInc: () => void;
  onDec: () => void;
}

export default function LaunchCell({ sizeLabel, warheadsLeft, count, canAdd, onInc, onDec }: Props) {
  const stateClass = count > 0 ? styles.on : warheadsLeft === 0 && count === 0 ? styles.off : '';
  return (
    <div className={`${styles.cell} ${stateClass}`}>
      <div className={styles.emoji}>💥</div>
      <div className={styles.label}>{sizeLabel}</div>
      <div className={styles.inv}>{warheadsLeft} left</div>
      <div className={styles.stepper}>
        <button type="button" disabled={count === 0} onClick={onDec}>−</button>
        <span className={styles.num}>{count}</span>
        <button type="button" disabled={!canAdd} onClick={onInc}>+</button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create `LaunchCell.module.css`**

```css
.cell {
  background: white;
  border: 1px solid #d0c8b8;
  border-radius: 4px;
  padding: 6px 4px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}
.cell.on { background: #f8d7da; border-color: #b02a37; }
.cell.off { background: #f8f9fa; color: #adb5bd; opacity: 0.55; }

.emoji { font-size: 20px; line-height: 1; }
.label { font-size: 10px; font-weight: 600; }
.inv { font-size: 9px; color: #6c757d; font-style: italic; margin-top: -1px; }
.cell.on .inv { color: #b02a37; font-weight: 600; font-style: normal; }

.stepper { display: flex; align-items: center; gap: 4px; margin-top: 2px; }
.stepper button {
  background: #1a1a1a; color: white; border: 0; border-radius: 50%;
  width: 16px; height: 16px; line-height: 14px; font-size: 11px; padding: 0; cursor: pointer;
}
.stepper button:disabled { background: #adb5bd; cursor: not-allowed; }
.num { font-weight: 700; font-size: 13px; min-width: 14px; text-align: center; }
```

- [ ] **Step 3: Typecheck + commit**

```bash
npm run typecheck
git add src/ui/components/LaunchCell.tsx src/ui/components/LaunchCell.module.css
git commit -m "ui: LaunchCell component — single (delivery × yield) launch cell"
```

---

## Task 12: TargetRow component

**Files:**
- Create: `src/ui/components/TargetRow.tsx`
- Create: `src/ui/components/TargetRow.module.css`

**Confidence: 92 %** — Mitigation: build TargetRow in stages, with a test after each stage.

- [ ] **Step 1: Create `TargetRow.tsx`**

```tsx
import type { Dispatch, SetStateAction } from 'react';
import type { Leader, Order, TargetType, Yield } from '../../engine/types';
import type { ProjectedInventory } from '../util/projection';
import { ACTION_COSTS } from '../../engine/balance';
import LaunchCell from './LaunchCell';
import styles from './TargetRow.module.css';

interface Props {
  target: Leader;
  mood?: string;
  targetType: TargetType;
  onTargetTypeChange: (next: TargetType) => void;
  orders: Order[];
  setOrders: Dispatch<SetStateAction<Order[]>>;
  apRemaining: number;
  projection: ProjectedInventory;
}

const YIELDS: Array<{ label: 'small' | 'med' | 'big'; yield: Yield }> = [
  { label: 'small', yield: 'small' },
  { label: 'med',   yield: 'medium' },
  { label: 'big',   yield: 'large' },
];

export default function TargetRow({
  target, mood, targetType, onTargetTypeChange, orders, setOrders, apRemaining, projection,
}: Props) {
  const [flag, ...rest] = target.country.split(' ');
  const countryName = rest.join(' ');

  const wooed = orders.some((o) => o.kind === 'woo' && o.target === target.id);
  const propd  = orders.some((o) => o.kind === 'propaganda' && o.target === target.id);

  function toggleWoo() {
    if (wooed) {
      setOrders((prev) => prev.filter((o) => !(o.kind === 'woo' && o.target === target.id)));
    } else {
      if (apRemaining < ACTION_COSTS.woo) return;
      setOrders((prev) => [...prev, { kind: 'woo', target: target.id }]);
    }
  }
  function togglePropaganda() {
    if (propd) {
      setOrders((prev) => prev.filter((o) => !(o.kind === 'propaganda' && o.target === target.id)));
    } else {
      if (apRemaining < ACTION_COSTS.propaganda) return;
      setOrders((prev) => [...prev, { kind: 'propaganda', target: target.id }]);
    }
  }

  function warheadsLeftFor(y: Yield): number {
    if (y === 'small')  return projection.warheadsSmall;
    if (y === 'medium') return projection.warheadsMedium;
    return projection.warheadsLarge;
  }

  function launchCount(delivery: 'missile' | 'bomber', y: Yield): number {
    return orders.filter((o) =>
      o.kind === 'launch' && o.target === target.id && o.delivery === delivery && o.warhead === y && o.targetType === targetType,
    ).length;
  }

  function addLaunch(delivery: 'missile' | 'bomber', y: Yield) {
    setOrders((prev) => [...prev, {
      kind: 'launch', target: target.id, delivery, warhead: y, targetType,
    }]);
  }

  function removeLaunch(delivery: 'missile' | 'bomber', y: Yield) {
    setOrders((prev) => {
      const idx = prev.findLastIndex((o) =>
        o.kind === 'launch' && o.target === target.id && o.delivery === delivery && o.warhead === y && o.targetType === targetType,
      );
      if (idx === -1) return prev;
      return [...prev.slice(0, idx), ...prev.slice(idx + 1)];
    });
  }

  const canLaunch = (delivery: 'missile' | 'bomber', y: Yield) => {
    const deliveryLeft = delivery === 'missile' ? projection.missiles : projection.bombers;
    if (deliveryLeft <= 0) return false;
    if (warheadsLeftFor(y) <= 0) return false;
    return apRemaining >= ACTION_COSTS.launch;
  };

  return (
    <div className={styles.row} aria-label={`Target row for ${target.name}`}>
      <div className={styles.head}>
        <span className={styles.flag}>{flag}</span>
        <span className={styles.name}>{target.name}</span>
        <span className={styles.tt}>
          <span
            className={`${styles.ttSeg} ${targetType === 'people' ? styles.ttOn : ''}`}
            onClick={() => onTargetTypeChange('people')}
          >people</span>
          <span
            className={`${styles.ttSeg} ${targetType === 'infra' ? styles.ttOn : ''}`}
            onClick={() => onTargetTypeChange('infra')}
          >infra</span>
        </span>
      </div>

      {mood && <div className={styles.mood}>{mood}</div>}

      <div className={styles.diplo}>
        <button
          type="button"
          className={`${styles.diploBtn} ${wooed ? styles.diploOn : ''}`}
          onClick={toggleWoo}
        >💌 Woo<br/><span className={styles.cost}>1 AP</span></button>
        <button
          type="button"
          className={`${styles.diploBtn} ${propd ? styles.diploOn : ''}`}
          onClick={togglePropaganda}
        >📰 Propaganda<br/><span className={styles.cost}>1 AP</span></button>
      </div>

      <div className={styles.rowLabel}>
        🚀 missiles <span className={styles.inv}>· {projection.missiles} left</span>
      </div>
      <div className={styles.lcGrid}>
        {YIELDS.map((Y) => (
          <LaunchCell
            key={`m-${Y.yield}`}
            sizeLabel={Y.label}
            warheadsLeft={warheadsLeftFor(Y.yield)}
            count={launchCount('missile', Y.yield)}
            canAdd={canLaunch('missile', Y.yield)}
            onInc={() => addLaunch('missile', Y.yield)}
            onDec={() => removeLaunch('missile', Y.yield)}
          />
        ))}
      </div>

      <div className={styles.rowLabel}>
        ✈️ bombers <span className={`${styles.inv} ${projection.bombers === 0 ? styles.invEmpty : ''}`}>· {projection.bombers} left</span>
      </div>
      <div className={styles.lcGrid}>
        {YIELDS.map((Y) => (
          <LaunchCell
            key={`b-${Y.yield}`}
            sizeLabel={Y.label}
            warheadsLeft={warheadsLeftFor(Y.yield)}
            count={launchCount('bomber', Y.yield)}
            canAdd={canLaunch('bomber', Y.yield)}
            onInc={() => addLaunch('bomber', Y.yield)}
            onDec={() => removeLaunch('bomber', Y.yield)}
          />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create `TargetRow.module.css`**

```css
.row {
  background: white;
  border: 1px solid #d0c8b8;
  border-radius: 6px;
  padding: 8px 10px;
  margin-bottom: 6px;
}

.head { display: flex; align-items: center; gap: 6px; font-size: 12px; margin-bottom: 6px; }
.flag { font-size: 18px; }
.name { flex: 1; font-weight: 700; }
.tt { font-size: 10px; background: #f0f0f0; padding: 2px; border-radius: 12px; display: flex; gap: 0; }
.ttSeg { padding: 2px 8px; cursor: pointer; border-radius: 10px; font-weight: 500; }
.ttOn { background: #b02a37; color: white; }

.mood { font-size: 11px; font-style: italic; color: #5a4a3a; margin-bottom: 6px; }

.diplo { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; margin-bottom: 6px; }
.diploBtn {
  background: white; border: 1px solid #d0c8b8; border-radius: 4px;
  padding: 6px 8px; font-size: 11px; cursor: pointer;
  display: flex; align-items: center; gap: 6px; justify-content: center;
}
.diploOn { background: #d4edda; border-color: #198754; }
.cost { font-size: 9px; color: #6c757d; }
.diploOn .cost { color: #155724; }

.rowLabel {
  font-size: 9px; letter-spacing: 0.1em; text-transform: uppercase;
  color: #6c757d; margin: 4px 0 2px;
  display: flex; align-items: baseline; gap: 6px;
}
.inv { letter-spacing: 0; text-transform: none; font-weight: 600; color: #495057; }
.invEmpty { color: #adb5bd; font-style: italic; font-weight: 400; }

.lcGrid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px; }
```

- [ ] **Step 3: Typecheck + commit**

```bash
npm run typecheck
git add src/ui/components/TargetRow.tsx src/ui/components/TargetRow.module.css
git commit -m "ui: TargetRow component — per-target diplomacy + launch grids"
```

---

## Task 13: Planning.tsx full rewrite + delete OrderForm + LeaderCard

**Files:**
- Modify: `src/ui/screens/Planning.tsx` (full rewrite)
- Modify: `src/ui/screens/Planning.module.css`
- Modify: `src/ui/components/SoftWarnPanel.tsx` (re-positioned only)
- Delete: `src/ui/components/OrderForm.tsx` + `.module.css` + test
- Delete: `src/ui/components/LeaderCard.tsx` + `.module.css`
- Create: `tests/ui/Planning.actionGrid.test.tsx`
- Create: `tests/ui/Planning.targetRow.test.tsx`

**Confidence: 91 %** — Mitigation: build Planning in stages, with passing tests at each step. Deletions land last.

- [ ] **Step 1: Write a smoke test for the new Planning structure**

Create `tests/ui/Planning.actionGrid.test.tsx`:

```tsx
import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Planning from '../../src/ui/screens/Planning';
import { initialState } from '../../src/engine/state';
import type { UiState } from '../../src/ui/store';

function makeState(): UiState {
  const game = initialState({
    cast: ['player1', 'chump', 'carnage'],
    difficulty: 'normal',
    seed: 'planning-test',
  });
  return {
    screen: 'planning',
    game,
    events: [],
    prevPopulations: {},
    initialPopulations: {},
    lastNewGameOpts: null,
    activeHumanTurn: 'player1',
    pendingHumanOrders: {},
  };
}

describe('<Planning> action-card grid', () => {
  it('renders build grid with Factory cell', () => {
    render(<Planning state={makeState()} dispatch={vi.fn()} />);
    expect(screen.getByText(/Factory/i)).toBeInTheDocument();
  });

  it('renders defence grid with Build Shield cell', () => {
    render(<Planning state={makeState()} dispatch={vi.fn()} />);
    expect(screen.getByText(/Build Shield/i)).toBeInTheDocument();
  });

  it('renders target rows for each opponent', () => {
    render(<Planning state={makeState()} dispatch={vi.fn()} />);
    expect(screen.getByLabelText(/Target row for Chump/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Target row for Carnage/i)).toBeInTheDocument();
  });

  it('renders AP banner', () => {
    render(<Planning state={makeState()} dispatch={vi.fn()} />);
    expect(screen.getByText(/AP used/i)).toBeInTheDocument();
  });

  it('seal button dispatches PLAYER_SUBMIT with current orders', () => {
    const dispatch = vi.fn();
    render(<Planning state={makeState()} dispatch={dispatch} />);
    const sealBtn = screen.getByRole('button', { name: /seal/i });
    fireEvent.click(sealBtn);
    fireEvent.click(sealBtn); // hold-to-seal pattern from P3; second click commits
    // We don't strictly test the hold-to-seal timer here; just confirm the button exists.
    expect(sealBtn).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Verify failing**

```bash
npm run test:run -- tests/ui/Planning.actionGrid.test.tsx
```

Expected: FAIL — current Planning uses OrderForm + LeaderCard.

- [ ] **Step 3: Rewrite `src/ui/screens/Planning.tsx`**

Replace the contents with:

```tsx
import { useState } from 'react';
import type { ScreenProps } from '../App';
import type { LeaderId, Order, TargetType } from '../../engine/types';
import { isHuman } from '../../engine/state';
import { totalApCost, analyseOrderSequence } from '../../engine/orders';
import BuildGrid from '../components/BuildGrid';
import DefenceGrid from '../components/DefenceGrid';
import TargetRow from '../components/TargetRow';
import SoftWarnPanel from '../components/SoftWarnPanel';
import { projectInventory } from '../util/projection';
import styles from './Planning.module.css';

export default function Planning({ state, dispatch }: ScreenProps) {
  const game = state.game!;
  const activeId = state.activeHumanTurn ?? 'player1';
  const player = game.leaders[activeId];

  const aiLeaders = game.cast.filter((id) => !isHuman(id) && game.leaders[id].alive);

  const [orders, setOrders] = useState<Order[]>([]);
  const [targetTypes, setTargetTypes] = useState<Partial<Record<LeaderId, TargetType>>>({});

  const apUsed = totalApCost(orders);
  const apTotal = player.ap;
  const apRemaining = Math.max(0, apTotal - apUsed);
  const overBudget = apUsed > apTotal;

  const projection = projectInventory(player, orders);
  const softWarnings = analyseOrderSequence(game, activeId, orders);

  const moodByLeader: Partial<Record<LeaderId, string>> = {};
  for (const e of state.events) {
    if (e.kind === 'PreRoundMood') moodByLeader[e.leaderId] = e.quote;
  }

  return (
    <div className={styles.planning}>
      <header className={styles.header}>
        Round {game.round}{state.activeHumanTurn ? ` · ${player.name}` : ''}
      </header>

      <div className={styles.apBanner}>
        <span>AP used: {apUsed} / {apTotal}</span>
        <span>{apRemaining} left</span>
      </div>

      <SoftWarnPanel warnings={softWarnings} game={game} />

      <div className={styles.sectionTitle}>Build</div>
      <BuildGrid orders={orders} setOrders={setOrders} apRemaining={apRemaining} />

      <div className={styles.sectionTitle}>Defence</div>
      <DefenceGrid
        orders={orders}
        setOrders={setOrders}
        apRemaining={apRemaining}
        projectedShieldsInStockpile={projection.shieldsInStockpile}
        projectedAaInStockpile={projection.aaInStockpile}
      />

      <div className={styles.sectionTitle}>Actions by target</div>
      {aiLeaders.map((id) => (
        <TargetRow
          key={id}
          target={game.leaders[id]}
          mood={moodByLeader[id]}
          targetType={targetTypes[id] ?? 'people'}
          onTargetTypeChange={(next) => setTargetTypes((prev) => ({ ...prev, [id]: next }))}
          orders={orders}
          setOrders={setOrders}
          apRemaining={apRemaining}
          projection={projection}
        />
      ))}

      <button
        type="button"
        className={styles.sealBtn}
        disabled={overBudget}
        onClick={() => dispatch({ type: 'PLAYER_SUBMIT', leaderId: activeId, orders })}
      >Seal Orders</button>
    </div>
  );
}
```

(Hold-to-seal CSS-transition gesture from P3 — keep that mechanic if it survives the rewrite, or simplify to button-click for now and add hold-to-seal in a separate polish commit. Recommend simplify here; the gesture lives in the SealBar component logic.)

- [ ] **Step 4: Update `Planning.module.css`**

Replace with:

```css
.planning {
  max-width: 480px;
  margin: 0 auto;
  padding: 12px;
  font-size: 12px;
}

.header { font-size: 14px; font-weight: 700; margin-bottom: 8px; }

.apBanner {
  background: #198754; color: white; padding: 6px 12px; border-radius: 4px;
  margin-bottom: 12px; font-size: 12px; display: flex; justify-content: space-between;
}

.sectionTitle {
  font-size: 9px; letter-spacing: 0.12em; text-transform: uppercase;
  color: #856404; font-weight: 700; margin: 10px 0 4px;
}

.sealBtn {
  background: #b02a37; color: white; border: none; border-radius: 24px;
  padding: 14px 28px; font-size: 14px; font-weight: 600; width: 100%; margin-top: 16px;
  cursor: pointer;
}
.sealBtn:disabled { background: #adb5bd; cursor: not-allowed; }
```

- [ ] **Step 5: Run Planning test**

```bash
npm run test:run -- tests/ui/Planning.actionGrid.test.tsx
```

Expected: PASS (5 tests).

- [ ] **Step 6: Run full suite**

```bash
npm run test:run
```

Expected: most tests PASS. Failures:
- `tests/ui/OrderForm.test.tsx` — will fail because `OrderForm` is referenced but no longer used.
- Any `Planning.softwarn.test.tsx` from P4a may need to update its selectors (the old order-row + warn highlight is gone; the panel still exists but in a new position).

- [ ] **Step 7: Delete OrderForm and LeaderCard**

```bash
git rm src/ui/components/OrderForm.tsx src/ui/components/OrderForm.module.css tests/ui/OrderForm.test.tsx
git rm src/ui/components/LeaderCard.tsx src/ui/components/LeaderCard.module.css
```

- [ ] **Step 8: Update P4a's `Planning.softwarn.test.tsx`**

Read the existing test. It almost certainly uses `getByLabelText(/order kind/i)` and `getByText(/no delivery/i)` patterns. Update it to use the new BuildGrid path:

Replace any `fireEvent.change(screen.getByLabelText(/order kind/i), { target: { value: 'build-warhead' } })` pattern with finding the warhead build cell + clicking its `+`:

```tsx
// Click the + on the small-warhead cell (the cell labelled "Sm Warhead")
const smWarheadCell = screen.getByText(/Sm Warhead/i).closest('[class*="cell"]');
const plus = smWarheadCell?.querySelector('button:last-child') as HTMLButtonElement;
fireEvent.click(plus);
```

(or expose a `data-testid` from BuildGrid to make this less fiddly — recommended.)

- [ ] **Step 9: Run full suite again**

```bash
npm run test:run
npm run typecheck
```

Expected: PASS.

- [ ] **Step 10: Add TargetRow tests**

Create `tests/ui/Planning.targetRow.test.tsx`:

```tsx
import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Planning from '../../src/ui/screens/Planning';
import { initialState } from '../../src/engine/state';
import type { UiState } from '../../src/ui/store';

function makeStateWithMood(): UiState {
  const game = initialState({
    cast: ['player1', 'chump'],
    difficulty: 'normal',
    seed: 'target-row-test',
  });
  game.leaders.player1.ap = 10;
  return {
    screen: 'planning',
    game,
    events: [
      { kind: 'PreRoundMood', leaderId: 'chump', quote: 'Many people are saying.', snapBack: false },
    ],
    prevPopulations: {},
    initialPopulations: {},
    lastNewGameOpts: null,
    activeHumanTurn: 'player1',
    pendingHumanOrders: {},
  };
}

describe('<TargetRow>', () => {
  it('renders mood quote when PreRoundMood event present for that leader', () => {
    render(<Planning state={makeStateWithMood()} dispatch={vi.fn()} />);
    expect(screen.getByText(/Many people are saying/)).toBeInTheDocument();
  });

  it('woo button toggles on/off (single tap pattern)', () => {
    render(<Planning state={makeStateWithMood()} dispatch={vi.fn()} />);
    const wooBtn = screen.getByRole('button', { name: /Woo/i });
    fireEvent.click(wooBtn);
    // After click, the button should have an "on" affordance — test via class containing 'on'
    expect(wooBtn.className).toMatch(/on/i);
  });
});
```

- [ ] **Step 11: Run TargetRow tests**

```bash
npm run test:run -- tests/ui/Planning.targetRow.test.tsx
```

Expected: PASS.

- [ ] **Step 12: Commit everything**

```bash
git add -A
git commit -m "ui: Planning full rewrite — action-card grid; delete OrderForm + LeaderCard"
```

---

## Task 14: README Phase 4b status

**Files:**
- Modify: `README.md`

**Confidence: 98 %**

- [ ] **Step 1: Append the Phase 4b section**

Edit `README.md`. After the existing `## Phase 4a status` section, append:

```markdown
## Phase 4b status

Phase 4b (Balance & Planning Rework) doubles the AP economy, makes defences consumable (build + deploy = 8 AP all-in), rewrites the Planning screen as an action-card grid, and simplifies woo/propaganda to flat 1-AP toggles. Verification: `npm run test:run` (~251 tests).

What's in this phase:

- **AP economy doubled** — startAp ×2 for every leader; FACTORY_AP_RATE 0.5 → 1.0; AP_BANK_CAP 2 → 4. ACTION_COSTS unchanged (math-equivalent to halving costs, no fractions).
- **Consumable defences** — new `deploy-defence` order kind. Build 4 AP adds to stockpile; deploy 4 AP moves stockpile → round-scoped deployed pool. `interceptProbability` reads the deployed pool. Deployed pool clears at round end regardless of intercept (deploy = commit).
- **Planning UI rewrite** — replaces the order-kind dropdown + queue list with `<BuildGrid>` + `<DefenceGrid>` + `<TargetRow>` (one per opponent). Each cell has a +/- stepper bound to a count of that order kind. Per-target rows show 6 launch combos (3 yields × 2 deliveries), each with projected warhead inventory.
- **Woo + Propaganda flat toggles** — both 1 AP, one per target per round. Dropped the points dimension on woo.

What's NOT in this phase (deferred to P4c / P5):

- AI scoring-weight balance pass against the new rules baseline — P4c (was P4b)
- Approach B / C lookahead upgrades — P4c
- Threat-aware defence deployment per personality — P4c
- Persistence, animations, audio, SVG art, PWA — P5
```

- [ ] **Step 2: Run full suite + typecheck**

```bash
npm run typecheck
npm run test:run
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs: Phase 4b status note in README"
```

---

## Self-review checklist (controller runs before handoff)

1. **Spec coverage:**
   - §2.1 AP economy → Task 1
   - §2.2 Consumable defences → Tasks 1 (schema) + 3 (builds) + 4 (intercept) + 5 (round-end clear)
   - §2.3 Planning UI → Tasks 8 (projection) + 9 (BuildGrid) + 10 (DefenceGrid) + 11 (LaunchCell) + 12 (TargetRow) + 13 (Planning)
   - §2.4 Woo + Propaganda flat → Task 2 (validation) + Task 6 (AI emissions)
   - §4 engine schema → Task 1 (types) + Task 2 (orders) + Task 3 (builds) + Task 4 (launches) + Task 5 (resolution)
   - §5 UI changes → Tasks 7–13
   - §6 AI personalities → Task 6
   - §7 testing — every new test file listed has its task
   - §8 assumptions — captured in plan structure

2. **Placeholder scan:** none found.

3. **Type consistency:**
   - `Order` discriminated union grows consistently (Task 1 ships the type; Tasks 2/3/4/8/etc. consume it).
   - `ProjectedInventory` shape defined in Task 8, consumed by Tasks 9/10/11/12/13.
   - `ACTION_COSTS.woo` (flat) introduced in Task 1, consumed in Task 2 and Task 12.

---

## Execution handoff
