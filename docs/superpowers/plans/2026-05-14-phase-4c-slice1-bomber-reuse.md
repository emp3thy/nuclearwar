# Phase 4c slice 1 — Bomber reuse + Carnage bomber bias

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bombers return to stockpile on impact (lost only on intercept). Carnage builds + launches with bombers; Netanyahoo stays missile-biased.

**Architecture:** One-line restoration in `applyLaunches` impact branches. Carnage's planner gains a "build a bomber if I don't own one" first-priority + flips launch delivery to bomber when available. Netanyahoo untouched.

**Tech Stack:** TypeScript 5.4, Vitest 1.5. No new runtime deps. Engine-only — no UI changes.

**Source of truth:** `docs/superpowers/specs/2026-05-14-phase-4c-slice1-bomber-reuse-design.md` (committed `813320c`). If anything below conflicts with the spec, the spec wins.

**Per-step confidence:** all 4 tasks rated. Min confidence post-lift: **92 %** (Task 2 — Carnage build/launch bias). Mitigations inline.

---

## File structure

**Modified:**

| Path | Change |
|---|---|
| `src/engine/launches.ts` | `applyLaunches` impact branches restore bomber: `+attacker.stockpile.bombers += 1` |
| `src/engine/ai/carnage.ts` | New "build 1 bomber if owned=0" priority before warhead builds; `canLaunch` accepts bomber-or-missile; launch order delivery flips to 'bomber' when available |
| `tests/engine/launches.test.ts` | Extend with bomber lifecycle tests (impact restores; intercept doesn't; double-queue rejected; missile regression) |
| `tests/engine/ai/carnage.test.ts` | Extend with bomber-bias tests |
| `tests/engine/ai/netanyahoo.test.ts` | Extend with regression test (missile-bias preserved) |
| `tests/engine/ai-duel.test.ts` | Comment update flagging slice 2 rebaseline |
| `README.md` | Phase 4c slice 1 status section |

**New / Deleted:** None.

---

## Task confidence summary

| Task | Confidence | Notes |
|---|---|---|
| 1. Engine bomber-reuse rule | 95 % | Mechanical 2-line addition + 4 tests |
| 2. Carnage build/launch bias | 92 % | Need to add delivery-building (he had none); first-priority bomber build pattern; lift via single-shot conditional rather than loop |
| 3. Netanyahoo regression test | 98 % | Assertion-only |
| 4. Docs (ai-duel comment + README) | 98 % | Text changes |

---

## Task 1: Bomber-reuse rule in `applyLaunches`

**Files:**
- Modify: `src/engine/launches.ts`
- Test: `tests/engine/launches.test.ts` (extend)

**Confidence: 95 %**

### Step 1: Write failing tests

Append to `tests/engine/launches.test.ts` (inside the existing top-level describe, or a new describe block):

```ts
describe('bombers are reusable (P4c slice 1)', () => {
  it('bomber impact (people) restores bomber to attacker stockpile', () => {
    let s = initialState({
      cast: ['chump', 'carnage'],
      difficulty: 'normal',
      seed: 'bomber-people-restore',
    });
    s.leaders.chump.stockpile.bombers = 1;
    s.leaders.chump.stockpile.warheadsSmall = 1;
    s.leaders.chump.ap = 5;
    s.leaders.carnage.deployedShields = 0; // ensure no intercept

    s = reduce(s, {
      type: 'SUBMIT_ORDERS',
      leaderId: 'chump',
      orders: [{ kind: 'launch', target: 'carnage', delivery: 'bomber', warhead: 'small', targetType: 'people' }],
    });
    s = reduce(s, { type: 'SUBMIT_ORDERS', leaderId: 'carnage', orders: [] });
    const r = resolveRound(s);

    const impact = r.events.find((e) => e.kind === 'ImpactPeople');
    expect(impact).toBeDefined();
    expect(r.state.leaders.chump.stockpile.bombers).toBe(1); // restored
    expect(r.state.leaders.chump.stockpile.warheadsSmall).toBe(0); // warhead still consumed
  });

  it('bomber impact (infra) restores bomber to attacker stockpile', () => {
    let s = initialState({
      cast: ['chump', 'carnage'],
      difficulty: 'normal',
      seed: 'bomber-infra-restore',
    });
    s.leaders.chump.stockpile.bombers = 1;
    s.leaders.chump.stockpile.warheadsSmall = 1;
    s.leaders.chump.ap = 5;
    s.leaders.carnage.deployedShields = 0;

    s = reduce(s, {
      type: 'SUBMIT_ORDERS',
      leaderId: 'chump',
      orders: [{ kind: 'launch', target: 'carnage', delivery: 'bomber', warhead: 'small', targetType: 'infra' }],
    });
    s = reduce(s, { type: 'SUBMIT_ORDERS', leaderId: 'carnage', orders: [] });
    const r = resolveRound(s);

    const impact = r.events.find((e) => e.kind === 'ImpactInfrastructure');
    expect(impact).toBeDefined();
    expect(r.state.leaders.chump.stockpile.bombers).toBe(1); // restored
  });

  it('bomber intercept does NOT restore bomber', () => {
    let s = initialState({
      cast: ['chump', 'carnage'],
      difficulty: 'normal',
      seed: 'bomber-intercept-gone',
    });
    s.leaders.chump.stockpile.bombers = 1;
    s.leaders.chump.stockpile.warheadsSmall = 1;
    s.leaders.chump.ap = 5;
    s.leaders.carnage.deployedAA = 5; // ensure 100% intercept (first incoming, defenders >= 1)

    s = reduce(s, {
      type: 'SUBMIT_ORDERS',
      leaderId: 'chump',
      orders: [{ kind: 'launch', target: 'carnage', delivery: 'bomber', warhead: 'small', targetType: 'people' }],
    });
    s = reduce(s, { type: 'SUBMIT_ORDERS', leaderId: 'carnage', orders: [] });
    const r = resolveRound(s);

    const intercepted = r.events.find((e) => e.kind === 'MissileIntercepted');
    expect(intercepted).toBeDefined();
    expect(r.state.leaders.chump.stockpile.bombers).toBe(0); // gone after intercept
  });

  it('missile launch unchanged: missile consumed on impact AND on intercept', () => {
    let s = initialState({
      cast: ['chump', 'carnage'],
      difficulty: 'normal',
      seed: 'missile-regression',
    });
    s.leaders.chump.stockpile.missiles = 2;
    s.leaders.chump.stockpile.warheadsSmall = 2;
    s.leaders.chump.ap = 10;

    s = reduce(s, {
      type: 'SUBMIT_ORDERS',
      leaderId: 'chump',
      orders: [
        { kind: 'launch', target: 'carnage', delivery: 'missile', warhead: 'small', targetType: 'people' },
        { kind: 'launch', target: 'carnage', delivery: 'missile', warhead: 'small', targetType: 'people' },
      ],
    });
    s = reduce(s, { type: 'SUBMIT_ORDERS', leaderId: 'carnage', orders: [] });
    const r = resolveRound(s);

    // Both missiles consumed regardless of outcome
    expect(r.state.leaders.chump.stockpile.missiles).toBe(0);
    expect(r.state.leaders.chump.stockpile.warheadsSmall).toBe(0);
  });
});
```

(Make sure `initialState`, `reduce`, `resolveRound` are imported at the top. They likely already are; if not, add them.)

### Step 2: Run tests to verify they fail

```bash
npm run test:run -- tests/engine/launches.test.ts -t "bombers are reusable"
```

Expected: FAIL — the first two tests fail because `applyLaunches` doesn't restore bombers yet (stockpile.bombers stays 0). The third and fourth tests likely PASS already (no restoration is the current behavior).

### Step 3: Add bomber restoration in `applyLaunches`

Edit `src/engine/launches.ts`. Find the `case 'people'` and `case 'infra'` impact branches inside `applyLaunches` (around lines 133-153 — they currently push `ImpactPeople` / `ImpactInfrastructure` events after applying damage).

For BOTH branches, after the damage is applied and the event is pushed, add a bomber-restoration block. The attacker reference is `next.leaders[l.from]`; restoration is unconditional on attacker liveness (a dead attacker's stockpile is irrelevant, restoration is harmless).

After the existing impact-event push, add:

```ts
      // P4c.1: bomber is reusable — restore on impact (lost only on intercept).
      if (l.delivery === 'bomber') {
        const attacker = next.leaders[l.from];
        if (attacker) attacker.stockpile.bombers += 1;
      }
```

Add this block in both the people-impact branch and the infra-impact branch. The block is identical in both — extract a local helper if you prefer DRY, but two inlined copies of the 4-line block is fine given the surrounding pattern.

### Step 4: Run tests to verify they pass

```bash
npm run test:run -- tests/engine/launches.test.ts -t "bombers are reusable"
```

Expected: PASS (4 tests).

### Step 5: Run full suite

```bash
npm run test:run
npm run typecheck
```

Expected: PASS — 246 + 4 = 250 tests, typecheck clean.

### Step 6: Commit

```bash
git add src/engine/launches.ts tests/engine/launches.test.ts
git commit -m "engine: bombers are reusable — restored on impact, lost on intercept"
```

---

## Task 2: Carnage build/launch bomber bias

**Files:**
- Modify: `src/engine/ai/carnage.ts`
- Test: `tests/engine/ai/carnage.test.ts` (extend)

**Confidence: 92 %**

**Mitigation:** Carnage currently doesn't build any deliveries (only warheads), so `canLaunch` is always false in practice. The spec implies a build-bias swap (missile → bomber) but the literal code has no missile-build. The mitigation: keep the new bomber-build a **single-shot** ("if I own zero bombers AND have budget, build one") rather than a loop, to avoid the projection-vs-validator gotcha from the P4b BugBot finding. Single order = no projection needed.

### Step 1: Write failing tests

Append to `tests/engine/ai/carnage.test.ts` (or create if missing — check first by reading the directory). New describe block:

```ts
describe('Carnage AI bomber bias (P4c.1)', () => {
  it('builds a bomber when none owned and budget allows', () => {
    let s = initialState({
      cast: ['carnage', 'chump'],
      difficulty: 'normal',
      seed: 'carnage-build-bomber',
    });
    s.leaders.carnage.stockpile.bombers = 0;
    s.leaders.carnage.stockpile.missiles = 0;
    s.leaders.carnage.ap = 6; // P4b default

    const orders = planCarnage(s, 'carnage');
    expect(orders.some((o) => o.kind === 'build-bomber')).toBe(true);
    expect(orders.some((o) => o.kind === 'build-missile')).toBe(false); // bias is bombers only
  });

  it('does NOT build a second bomber when one is already owned', () => {
    let s = initialState({
      cast: ['carnage', 'chump'],
      difficulty: 'normal',
      seed: 'carnage-already-has-bomber',
    });
    s.leaders.carnage.stockpile.bombers = 1; // already owns one
    s.leaders.carnage.stockpile.missiles = 0;
    s.leaders.carnage.ap = 6;

    const orders = planCarnage(s, 'carnage');
    expect(orders.filter((o) => o.kind === 'build-bomber')).toHaveLength(0);
  });

  it('launches with delivery=bomber when a bomber is in stockpile', () => {
    let s = initialState({
      cast: ['carnage', 'chump'],
      difficulty: 'normal',
      seed: 'carnage-launch-bomber',
    });
    s.leaders.carnage.stockpile.bombers = 1;
    s.leaders.carnage.stockpile.missiles = 1;
    s.leaders.carnage.stockpile.warheadsSmall = 1;
    s.leaders.carnage.ap = 6;
    // Give Chump arsenal so Carnage's threat score is non-zero (opportunism only is fine too)
    s.leaders.chump.stockpile.missiles = 2;

    const orders = planCarnage(s, 'carnage');
    const launch = orders.find((o) => o.kind === 'launch');
    expect(launch).toBeDefined();
    if (launch && launch.kind === 'launch') {
      expect(launch.delivery).toBe('bomber');
    }
  });

  it('falls back to delivery=missile when no bomber but missile available', () => {
    let s = initialState({
      cast: ['carnage', 'chump'],
      difficulty: 'normal',
      seed: 'carnage-launch-missile-fallback',
    });
    s.leaders.carnage.stockpile.bombers = 0;
    s.leaders.carnage.stockpile.missiles = 1;
    s.leaders.carnage.stockpile.warheadsSmall = 1;
    s.leaders.carnage.ap = 6;
    s.leaders.chump.stockpile.missiles = 2;

    const orders = planCarnage(s, 'carnage');
    const launch = orders.find((o) => o.kind === 'launch');
    if (launch && launch.kind === 'launch') {
      expect(launch.delivery).toBe('missile');
    }
    // It's OK if no launch order is emitted at all in this scenario; the
    // assertion is "IF Carnage launches, delivery is missile". The boolean
    // existence check is asserted in the previous test (with bomber present).
  });
});
```

If `tests/engine/ai/carnage.test.ts` doesn't exist, create it with appropriate imports:

```ts
import { describe, expect, it } from 'vitest';
import { planCarnage } from '../../../src/engine/ai/carnage';
import { initialState } from '../../../src/engine/state';
// (existing tests if file exists)
```

### Step 2: Verify failing

```bash
npm run test:run -- tests/engine/ai/carnage.test.ts -t "P4c.1"
```

Expected: FAIL — Carnage doesn't build bombers (only warheads); launches default to `delivery: 'missile'`.

### Step 3: Update Carnage's planner

Edit `src/engine/ai/carnage.ts`. Two changes:

**Change A: Add bomber-build as first build-budget priority.** Find the build section (around lines 70-83 — the `while (remaining >= 1)` loop that builds small warheads). Insert a **single-shot** bomber build BEFORE the warhead loop:

```ts
  // --- 1. Builds ---
  let remaining = buildBudget;

  // P4c.1: Carnage values bombers (reusable assets). If he owns none,
  // build one as first priority. Single-shot — projection-safe.
  if (me.stockpile.bombers === 0 && remaining >= 1) {
    const o: Order = { kind: 'build-bomber' };
    if (validateOrder(state, leaderId, o).ok) {
      orders.push(o);
      remaining -= 1;
    }
  }

  // Build small warheads with the rest.
  while (remaining >= 1) {
    const o: Order = { kind: 'build-warhead', yield: 'small' };
    if (validateOrder(state, leaderId, o).ok) {
      orders.push(o);
      remaining -= 1;
    } else {
      break;
    }
  }
```

**Change B: Launch with bomber when available; relax `canLaunch` to accept either delivery.** Find the existing `canLaunch` check (around line 54-58) and the launch construction (around line 87-93).

Replace the `canLaunch` block:

```ts
  const hasDelivery = me.stockpile.bombers >= 1 || me.stockpile.missiles >= 1;
  const canLaunch =
    launchTarget !== undefined &&
    hasDelivery &&
    me.stockpile.warheadsSmall >= 1 &&
    budget >= LAUNCH_COST;
```

Replace the launch construction:

```ts
  if (canLaunch && launchTarget !== undefined && budget >= LAUNCH_COST) {
    const delivery: 'bomber' | 'missile' = me.stockpile.bombers >= 1 ? 'bomber' : 'missile';
    const launch: Order = {
      kind: 'launch',
      target: launchTarget,
      delivery,
      warhead: 'small',
      targetType: 'people',
    };
    if (validateOrder(state, leaderId, launch).ok) {
      orders.push(launch);
      budget -= apCostOf(launch);
    }
  }
```

### Step 4: Run tests

```bash
npm run test:run -- tests/engine/ai/carnage.test.ts
```

Expected: PASS — 4 new tests green (plus any pre-existing carnage tests).

### Step 5: Run full suite + typecheck

```bash
npm run test:run
npm run typecheck
```

Expected: typecheck clean, all tests green. The AI-duel test will print a different distribution now (Carnage's win rate likely climbs); no assertion change needed since the duel has no balance assertions.

### Step 6: Commit

```bash
git add src/engine/ai/carnage.ts tests/engine/ai/carnage.test.ts
git commit -m "engine: Carnage AI — bomber build + launch bias

- Single-shot bomber build when stockpile.bombers === 0 (first build priority)
- canLaunch accepts bomber-or-missile delivery
- Launch order uses delivery='bomber' when available, falls back to 'missile'"
```

---

## Task 3: Netanyahoo regression test

**Files:**
- Test: `tests/engine/ai/netanyahoo.test.ts` (extend or create)

**Confidence: 98 %**

### Step 1: Add regression test

Append to `tests/engine/ai/netanyahoo.test.ts` (or create it if missing — check first):

```ts
describe('Netanyahoo missile-bias regression (P4c.1)', () => {
  it('still builds missiles, not bombers — bomber bias does NOT bleed across personalities', () => {
    let s = initialState({
      cast: ['netanyahoo', 'chump'],
      difficulty: 'normal',
      seed: 'netanyahoo-still-missile',
    });
    s.leaders.netanyahoo.stockpile.bombers = 0;
    s.leaders.netanyahoo.stockpile.missiles = 0;
    s.leaders.netanyahoo.ap = 6;

    const orders = planNetanyahoo(s, 'netanyahoo');
    // The personality should not emit any build-bomber orders.
    expect(orders.filter((o) => o.kind === 'build-bomber')).toHaveLength(0);
    // It should emit build-missile (warmonger profile builds missiles).
    expect(orders.some((o) => o.kind === 'build-missile')).toBe(true);
  });
});
```

If the test file doesn't exist, create it with imports:

```ts
import { describe, expect, it } from 'vitest';
import { planNetanyahoo } from '../../../src/engine/ai/netanyahoo';
import { initialState } from '../../../src/engine/state';
```

### Step 2: Verify the test passes (no code change needed)

```bash
npm run test:run -- tests/engine/ai/netanyahoo.test.ts
```

Expected: PASS — Netanyahoo's existing code already builds missiles + small warheads as the warmonger pattern (see `src/engine/ai/netanyahoo.ts` line 62-70). The new test just locks the behavior in place against future drift.

### Step 3: Commit

```bash
git add tests/engine/ai/netanyahoo.test.ts
git commit -m "tests: Netanyahoo regression — still missile-biased (bomber rule doesn't bleed)"
```

---

## Task 4: Docs (ai-duel comment + README)

**Files:**
- Modify: `tests/engine/ai-duel.test.ts`
- Modify: `README.md`

**Confidence: 98 %**

### Step 1: Update the ai-duel test comment

Edit `tests/engine/ai-duel.test.ts`. Find the comment block flagging the P4b baseline as stale. After the existing P4b note, append:

```ts
  // P4c.1 note: bombers are now reusable (return on impact, lost on intercept)
  // and Carnage gains a bomber build/launch bias. Expect Carnage's win rate
  // to climb under the new rule. P4c.2+ uses this new distribution as the
  // tuning baseline for wider AI weight rebalancing.
```

### Step 2: Append Phase 4c.1 status to README

Edit `README.md`. After the existing `## Phase 4b status` section, append:

```markdown
## Phase 4c slice 1 status

Phase 4c is the AI tuning pass. Slice 1 ships two tightly coupled changes from playtesting: bombers are now reusable (return on impact, lost on intercept) and Carnage favours bombers in his build + launch picks. Netanyahoo stays missile-biased. Verification: `npm run test:run` (~252 tests).

What's in this slice:

- **Bombers reusable** — `applyLaunches` restores `attacker.stockpile.bombers` after a successful impact (both people and infra). Intercepted bombers stay gone. Warheads always consumed. One bomber = one mission per round (enforced by the existing `consumeStockFor` decrement).
- **Carnage AI** — single-shot build-bomber when stockpile.bombers === 0 (first build priority); `canLaunch` accepts bomber-or-missile delivery; launch order uses `delivery: 'bomber'` when available.
- **Netanyahoo unchanged** — warmonger profile preserved. Regression test locks it in.

What's NOT in this slice (deferred to P4c slice 2+):

- Wider AI scoring-weight rebalancing (Khameneverhere/Starmless/Mileigh-hem/Chump bomber-awareness)
- Approach B / C lookahead upgrades (sliding-window history; personality-fit modelling)
- Threat-aware defence deployment per personality
- AI-duel balance assertions (still asserts only "no crash"; baseline data informs slice 2)
```

### Step 3: Run full suite for regression

```bash
npm run test:run
npm run typecheck
```

Expected: PASS — 252 tests, typecheck clean.

### Step 4: Commit

```bash
git add tests/engine/ai-duel.test.ts README.md
git commit -m "docs: Phase 4c slice 1 status — bomber reuse + Carnage bias"
```

---

## Self-review checklist (controller runs before handoff)

1. **Spec coverage:**
   - §2.1 Bomber-reuse engine rule → Task 1.
   - §2.2 Carnage AI bomber bias → Task 2.
   - §2.3 Netanyahoo unchanged → Task 3 regression test.
   - §2.4 UI projection unchanged → no task (confirmed unchanged in spec).
   - §2.5 AI duel test comment → Task 4 step 1.
   - §5 Testing → tests embedded in each task; total +6 tests, ending at ~252.

2. **Placeholder scan:** none found.

3. **Type consistency:**
   - `planCarnage` and `planNetanyahoo` function names match existing exports in `src/engine/ai/*.ts`.
   - `delivery: 'bomber' | 'missile'` type is the existing `DeliveryType` from `src/engine/types.ts`.
   - All test imports point at real engine modules; no fabricated symbols.

---

## Execution handoff
