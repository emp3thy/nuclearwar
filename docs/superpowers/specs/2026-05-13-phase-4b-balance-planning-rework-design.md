# Phase 4b — Balance & Planning Rework design spec

**Date:** 2026-05-13
**Status:** drafted from playtesting brainstorming session; pending user review
**Source of feedback:** playtesting after P4a merge (commit `9c5ac27`). User notes captured in better-memory: AP too tight, defences should be consumable, Planning UI too clunky, weapon costs need to drop.

---

## 1. Overview

Phase 4b reworks the game's economy and the Planning screen. Four interlocking changes:

1. **AP economy doubles**: bigger pool, same costs. Players have real slack to build, attack, woo, and defend in the same round.
2. **Defences become consumable**: shields and AA must be built AND deployed; consumed at round end. Build 4 + Deploy 4 = 8 AP all-in. Defence is a serious commitment, not spam.
3. **Planning screen rewrite**: action-card grid driven by projected inventory. Replaces the order-kind dropdown + queue list with a single tableau showing all valid actions, including per-target launches with mixed yields and deliveries.
4. **Woo + Propaganda simplified**: both flat 1 AP toggles, one per target per round. Drops the points dimension on woo.

**Phase order shift:** original P4b was AI scoring-weight tuning + Approach B/C lookahead upgrades. That work cannot sensibly happen until the rules stop moving, so it slips to P4c. New phase order:

```
P3 ✓ (UI shell) → P4a ✓ (satire+hotseat) → P4b (this) → P4c (AI tuning) → P5 (polish)
```

---

## 2. Scope (4 workstreams)

### 2.1 AP economy — double the pool, keep costs

- `LEADER_PROFILES[*].startAp` doubled across the board:
  - chump: 5 → 10
  - khameneverhere / starmless / carnage / netanyahoo / player1..5: 3 → 6
  - mileigh-hem: 2 → 4
- `FACTORY_AP_RATE`: 0.5 → **1.0** (one AP per factory per round)
- `AP_BANK_CAP`: 2 → **4**
- `ACTION_COSTS` for builds + launches **unchanged** (mathematically equivalent to "halve costs" with the doubled pool — no fractions, simplest code change)

### 2.2 Consumable defences

- `ACTION_COSTS.buildDefence`: 2 → **4**
- New `ACTION_COSTS.deployDefence: 4`
- New order kind: `{ kind: 'deploy-defence'; type: DefenceType }` — moves one shield/AA from inventory to round-scoped deployed pool
- `Leader` gains `deployedShields: number` and `deployedAA: number` — both round-scoped (cleared at end of every resolution)
- `interceptProbability` now reads from `receiver.deployedShields` / `receiver.deployedAA` (not `stockpile.shields/aa`)
- **Lifecycle:** deploy IS consumption. A deployed defence is consumed at round end regardless of whether it intercepted. Misjudging incoming wastes 4 AP.
- **Undeployed inventory persists** across rounds — players can stockpile defences freely until they choose to deploy.

### 2.3 Planning UI rework — action-card grid (Variant B v9)

Replace the order-kind dropdown + OrderForm + queue list with a single grid:

- **Build grid** (3 cols × 2 rows): Factory, Missile, Bomber, Sm/Md/Lg Warhead. Each cell is a stepper bound to a count of that order kind.
- **Defence grid** (3 cols × 1 row): Build Shield, Deploy Shield, Build AA, Deploy AA. Deploy cells show "N owned" and max-out at stockpile.
- **Actions-by-target rows**, one per opponent. Each row contains:
  - Header: flag + name + people/infra toggle. AI mood quote (italic) under the name.
  - Diplomacy strip: 💌 Woo and 📰 Propaganda — both flat 1 AP toggles.
  - Missile launch grid (3 cells): one per yield (small/med/big). Cell shows 💥 + size word + "N left" warhead inventory + stepper.
  - Bomber launch grid (3 cells): same shape. "✈️ bombers · 0 left" label muted when no bomber inventory.
- **AP banner** at top shows used / total / left.
- **Soft-warn panel** moved to under the AP banner; same 3 warnings as P4a (warhead-no-delivery, delivery-no-warhead, woo-non-attacker), now consolidated rather than per-row.

Layout target: 460px centred column, browser-first (matches P3/P4a).

### 2.4 Woo + Propaganda flat toggles

- `Order` union: `{ kind: 'woo'; target: LeaderId }` (drops `points`)
- `ACTION_COSTS.wooPerPoint` renamed to `woo`, stays flat 1 AP
- `validateOrderSequence` enforces **one woo per target** and **one propaganda per target** per round
- `applyWooing` simplifies: each woo order = single favourability transfer of fixed magnitude. P4c tunes the magnitude.
- AI personalities that emit woo orders drop the `points` field; otherwise unchanged.

---

## 3. Round flow

Unchanged from P4a structurally:

```
Defences (phase) → Builds → Propaganda → Wooing → Launches → FR cascade → Status update
```

Defence phase becomes a **two-stage** subprocess:

```
Defence phase:
  Stage 1: process all `build-defence` orders → stockpile += 1
  Stage 2: process all `deploy-defence` orders → stockpile -= 1, deployedPool += 1
```

A leader can build AND deploy in the same round (8 AP, two separate orders).

After Final Retaliation cascade, at end of round, **clear the deployed pool** for every leader (consumed) and emit `DefenceConsumed` events.

---

## 4. Engine schema changes

### 4.1 `balance.ts`

```ts
LEADER_PROFILES[*].startAp:
  chump        5 → 10
  khameneverhere/starmless/carnage/netanyahoo/players  3 → 6
  mileigh-hem  2 → 4

FACTORY_AP_RATE  0.5 → 1.0
AP_BANK_CAP      2   → 4

ACTION_COSTS = {
  buildFactory:        3,    // unchanged
  buildMissile:        1,    // unchanged
  buildBomber:         1,    // unchanged
  buildWarheadSmall:   1,    // unchanged
  buildWarheadMedium:  2,    // unchanged
  buildWarheadLarge:   3,    // unchanged
  buildDefence:        4,    // ← was 2
  deployDefence:       4,    // ← NEW
  launch:              2,    // unchanged
  propaganda:          1,    // unchanged
  woo:                 1,    // ← was wooPerPoint
}
```

### 4.2 `types.ts`

**`Order` union changes:**

```ts
| { kind: 'woo'; target: LeaderId }                       // ← was { ..., points: number }
| { kind: 'deploy-defence'; type: DefenceType }           // ← NEW
```

**`Leader` gains:**

```ts
interface Leader {
  // ... existing
  deployedShields: number;    // round-scoped; cleared at end of resolution
  deployedAA: number;
}
```

**`ResolutionEvent` union gains:**

```ts
| { kind: 'DefenceDeployed'; by: LeaderId; type: DefenceType; quote?: string }
| { kind: 'DefenceConsumed'; by: LeaderId; type: DefenceType }
```

### 4.3 `state.ts`

`initialState` seeds `deployedShields: 0, deployedAA: 0` on every leader. No other changes.

### 4.4 `launches.ts` — intercept rewiring

```ts
// OLD:
const defenders = l.delivery === 'missile'
  ? receiver.stockpile.shields
  : receiver.stockpile.aa;

// NEW:
const defenders = l.delivery === 'missile'
  ? receiver.deployedShields
  : receiver.deployedAA;

// When an intercept fires (existing path):
if (roll.value < p) {
  // decrement deployed pool
  if (l.delivery === 'missile') receiver.deployedShields -= 1;
  else receiver.deployedAA -= 1;
  events.push({ kind: 'MissileIntercepted', ... });
  continue;
}
```

### 4.5 `builds.ts` — defence handling

`applyDefenceBuilds` now handles both order kinds:
- `build-defence`: `me.stockpile.shields/aa += 1`, emit `DefenceBuilt` (existing)
- `deploy-defence`: `me.stockpile.shields/aa -= 1; me.deployedShields/deployedAA += 1`, emit `DefenceDeployed`

Validation: `deploy-defence` order is invalid if the leader's projected stockpile (post-build) has 0 of that defence type.

Ordering rule: within the defence phase, all `build-defence` orders process first, then all `deploy-defence`. This enables build-then-deploy in one round.

### 4.6 `resolution.ts` — deployed pool clear

After the Final Retaliation cascade and after grudge updates, before AP refresh, clear the deployed pool for every leader:

```ts
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

### 4.7 `orders.ts`

- `apCostOf`: `woo` returns `ACTION_COSTS.woo` (flat); new `deploy-defence` returns `ACTION_COSTS.deployDefence`.
- `validateOrder`: rejects `deploy-defence` when leader's stockpile of that type is 0.
- `validateOrderSequence` projection: **extended to include queued builds** (currently projects only launch consumption). This lets the UI offer build-then-launch and build-then-deploy in the same round consistently with engine semantics. Also enforces one-woo-per-target and one-propaganda-per-target per round.
- `analyseOrderSequence` (soft-warn): three rules unchanged in spirit, but the projection now correctly accounts for queued builds.

### 4.8 `ai/*.ts` — personality fallout

- Every personality's `woo` emission drops the `points` field.
- Each personality that currently builds defences (Chump, Starmless) gains a **simple deploy rule**: "if I own ≥ 1 shield, queue one `deploy-defence` order; else queue one `build-defence` order". No threat-reading. P4c tunes.
- **Mileigh-hem aggression bonus** (`+2 AP if every order is launch or propaganda`): `deploy-defence` counts as defensive, breaks the bonus. Already locked in design — matches glass-cannon personality. Implementation: `leaderBonusAp` in `resolution.ts` checks `thisRoundsOrders.every(o => o.kind === 'launch' || o.kind === 'propaganda')`. Adding `deploy-defence` to that order set causes the `every` check to fail — no code change needed; it's automatic from the existing rule.

---

## 5. UI changes

### 5.1 New components

```
src/ui/components/BuildGrid.tsx + .module.css
src/ui/components/DefenceGrid.tsx + .module.css
src/ui/components/TargetRow.tsx + .module.css
src/ui/components/LaunchCell.tsx + .module.css
```

### 5.2 Modified

```
src/ui/screens/Planning.tsx       — full rewrite (action-card grid)
src/ui/screens/Planning.module.css — new layout styles
src/ui/components/SoftWarnPanel.tsx — repositioned under AP banner; otherwise unchanged
```

### 5.3 Retired (delete)

```
src/ui/components/OrderForm.tsx
src/ui/components/OrderForm.module.css
src/ui/components/LeaderCard.tsx        — orphaned; can resurrect via git later
src/ui/components/LeaderCard.module.css
tests/ui/OrderForm.test.tsx
```

### 5.4 `Planning.tsx` data flow

```ts
function Planning({ state, dispatch }) {
  const game = state.game!;
  const activeId = state.activeHumanTurn ?? 'player1';
  const player = game.leaders[activeId];

  const [orders, setOrders] = useState<Order[]>([]);
  const [targetTypes, setTargetTypes] = useState<Record<LeaderId, TargetType>>({});

  const projection = projectInventory(player, orders);
  // { missiles, bombers, warheadsSmall, warheadsMedium, warheadsLarge,
  //   shieldsInStockpile, aaInStockpile, deployedShields, deployedAA }

  const apUsed = totalApCost(orders);
  const softWarnings = analyseOrderSequence(game, activeId, orders);
  const moodByLeader = buildMoodLookup(state.events);
}
```

### 5.5 Layout structure (460px column)

```jsx
<Header roundNumber={game.round} activeHumanName={player.name} />
<ApBanner used={apUsed} total={player.ap} />
<SoftWarnPanel warnings={softWarnings} game={game} />
<BuildGrid orders={orders} setOrders={setOrders} projection={projection} apRemaining={...} />
<DefenceGrid orders={orders} setOrders={setOrders} projection={projection}
             ownedShields={player.stockpile.shields} ownedAA={player.stockpile.aa} />
<SectionTitle>Actions by target</SectionTitle>
{aiLeaders.map(id => (
  <TargetRow
    key={id}
    target={game.leaders[id]}
    mood={moodByLeader[id]}
    targetType={targetTypes[id] ?? 'people'}
    onTargetTypeChange={...}
    orders={orders}
    setOrders={setOrders}
    projection={projection}
  />
))}
<SealBar onSeal={() => dispatch({type:'PLAYER_SUBMIT', leaderId: activeId, orders})} />
```

### 5.6 Cell-level projection rules

- **Build cell `+`** enables when `ap_remaining >= cost` (no projection — builds are always permissible)
- **Launch cell `+`** enables when `projection.delivery_count > 0 && projection.warhead_of_yield_count > 0 && ap_remaining >= launchCost`
- **Deploy cell `+`** enables when `projection.shields_or_aa_in_stockpile > 0 && ap_remaining >= deployCost`
- **Woo / Propaganda toggle** enables when no existing order of that kind/target exists

### 5.7 Mood lines

Each `TargetRow` reads the most recent `PreRoundMood.quote` for that leader from `state.events`. Renders as italic line under the target name (`Chump · "Many people are saying we should hit somebody..."`). Empty mood quote = no line rendered.

### 5.8 Helper module

```
src/ui/util/projection.ts
  ↳ projectInventory(leader, orders): ProjectedInventory
    Walks the orders array, adding queued builds and subtracting queued
    launches / deploys. Returns post-build / pre-launch counts for all
    inventory dimensions.
```

### 5.9 Action-screen knock-on

`src/ui/components/EventCard.tsx` exhaustive switch gains two new cases:

```ts
case 'DefenceDeployed':  return { headline: `${ln(e.by)} deploys ${e.type === 'shield' ? 'a shield' : 'AA'}.`, quote: e.quote };
case 'DefenceConsumed':  return null;  // not rendered on Action (round-end housekeeping event)
```

`Action.tsx` `phaseAdvanceFor`: `DefenceDeployed` → 'defences'; `DefenceConsumed` → `null` (housekeeping, no phase advance).

---

## 6. AI personality changes

- All AI personalities drop `points` from their woo emissions: `{ kind: 'woo', target }`.
- Chump and Starmless gain "if I own ≥ 1 shield, deploy one; else build one" logic. Mileigh-hem unchanged (never builds defence).
- All other personality logic (threat scoring, opportunism, lookahead) unchanged.
- AI-duel test (`tests/engine/ai-duel.test.ts`) keeps running. Comment updated to note the printed baseline is now stale and that P4c will rebaseline.
- `AI_SCORING_WEIGHTS` and `lookahead.ts` unchanged.

---

## 7. Testing

P4a baseline: 217 tests. Target end-state: **~251 tests**.

### 7.1 Engine tests (new + extended)

```
tests/engine/deployDefence.test.ts (new, ~8 tests)
  ↳ deploy-defence consumes stockpile, adds to deployed pool
  ↳ build-then-deploy in one round works (stages ordering)
  ↳ deploy-defence rejected when stockpile = 0 and no queued build
  ↳ deployed pool clears to 0 at round end regardless of intercept
  ↳ DefenceDeployed + DefenceConsumed events emitted at correct points

tests/engine/intercept.deployed.test.ts (new, ~4 tests)
  ↳ interceptProbability reads from deployedShields / deployedAA
  ↳ on intercept, deployed count decrements; stockpile unchanged
  ↳ shieldless target (deployed = 0) loses intercept guarantee

tests/engine/orders.woo.test.ts (new, ~4 tests)
  ↳ woo Order shape has no points
  ↳ ACTION_COSTS.woo flat 1 AP applied
  ↳ second woo to same target rejected by validateOrderSequence

tests/engine/resolution.test.ts (extend)
  ↳ Mileigh-hem aggression bonus breaks when a deploy-defence is queued
  ↳ defence phase: all builds resolve before any deploys

tests/engine/analyseOrderSequence.test.ts (extend, ~3 tests)
  ↳ warhead-no-delivery suppressed when missile is queued in same round
  ↳ delivery-no-warhead suppressed when warhead is queued
  ↳ woo-non-attacker rule unchanged with no-points woo orders
```

### 7.2 UI tests (delete + new)

```
DELETE: tests/ui/OrderForm.test.tsx

NEW: tests/ui/Planning.actionGrid.test.tsx (~6 tests)
  ↳ Build cell + dispatches build order; queue increments
  ↳ AP banner sums orders correctly; over-budget when exceeded
  ↳ Soft-warn panel renders under AP banner when warnings present
  ↳ Woo toggle one-shot per target; second tap removes
  ↳ Launch cell stepper respects projection; max bounded by inventory
  ↳ Inventory row label updates as launches queue across targets

NEW: tests/ui/Planning.targetRow.test.tsx (~4 tests)
  ↳ Mood quote renders under target name when PreRoundMood present
  ↳ People/infra toggle updates targetType on subsequent launches
  ↳ Bomber row label says "0 left" when projection.bombers = 0
  ↳ Cells disabled appropriately when arsenal can't support combo

NEW: tests/ui/projection.test.ts (~6 tests, unit)
  ↳ projectInventory adds queued builds
  ↳ projectInventory subtracts queued launches
  ↳ projectInventory subtracts queued deploys
  ↳ projection handles empty order list
  ↳ projection handles full order list with all order kinds
  ↳ projection clamps at 0 (no negative inventory)
```

### 7.3 What is NOT tested

- Exact AP magnitudes (the doubled values are tunable; tests assert relative behaviour)
- AI personality balance distribution (P4c)
- Visual fidelity vs mockup (manual)

### 7.4 Engine-purity check

Unchanged — no React under `src/engine/**`. Enforced by CI typecheck.

---

## 8. Assumptions (3 buckets)

### 8.1 Real concerns

1. **AI feel before P4c tuning.** Doubled pool + cheaper-relative combat + new defence rules will produce a significantly more aggressive AI than P4a. AI-duel test still passes (asserts only "no crash"), but the human game experience between P4b merge and P4c may be unbalanced. Accepted: shipping rule changes ahead of tuning is the explicit phase order, and the user wants to playtest the new rules to inform P4c.

2. **`analyseOrderSequence` projection change.** Extending projection to include queued builds may shift the soft-warn fire conditions slightly. Existing P4a tests should still pass (the logical outcome is the same), but verify during implementation.

3. **`LeaderCard.tsx` deletion.** It's orphaned by the Planning rework. Decision: delete in this PR. Easy to resurrect from git if a P5 hover-detail or roster-summary needs it.

### 8.2 Verified safe

1. **Engine purity preserved** — no React imports under `src/engine/**`.
2. **Determinism preserved** — no new RNG consumption added in this phase.
3. **ResolutionEvent additions additive** — P4a's EventCard exhaustive switch needs 2 new cases; `noFallthroughCasesInSwitch` catches at compile time.
4. **CSS Modules pattern continues** — new components follow per-screen / per-component convention.
5. **TDD posture continues** — engine TDD strict; UI minimum-surface (action grid, target row, projection helper).
6. **P4a backward compatibility N/A** — no persistence to migrate.

### 8.3 Minor / accepted

1. **AI duel distribution baseline** stale. README + ai-duel.test.ts comment updated to flag P4c rebaselining.
2. **Mileigh-hem rarely builds defence** anyway; bonus-breaking-on-deploy is largely academic for his line.
3. **Dense Planning grid at 460px** — usable but tight; polish deferred (P5 or beyond).
4. **No save migration** needed (no persistence yet).
5. **AI defence logic in P4b is rudimentary** ("own one? deploy. else? build."). P4c does proper threat-aware tuning.

---

## 9. Out of scope

### 9.1 Deferred to P4c (AI tuning, now renumbered)

- AI scoring-weight balance pass against the new rules baseline.
- Approach B / C lookahead upgrades (sliding-window history; personality-fit modelling).
- Threat-aware defence deployment decisions per personality.

### 9.2 Deferred to P5 (polish)

- Persistence (localStorage save/load + Resume + action log)
- Replay timeline scrubber UI on Winners
- Animations (Framer Motion, missile arcs, damage badges, Fast Resolve toggle)
- Audio
- SVG art (leader portraits, world map, mushroom cloud, ruined iconography)
- PWA manifest + service worker

### 9.3 Beyond P5

- Capacitor mobile wrap
- AI personality additions / cast rotation

---

## 10. File list

### 10.1 New files

```
src/ui/components/BuildGrid.tsx
src/ui/components/BuildGrid.module.css
src/ui/components/DefenceGrid.tsx
src/ui/components/DefenceGrid.module.css
src/ui/components/TargetRow.tsx
src/ui/components/TargetRow.module.css
src/ui/components/LaunchCell.tsx
src/ui/components/LaunchCell.module.css
src/ui/util/projection.ts

tests/engine/deployDefence.test.ts
tests/engine/intercept.deployed.test.ts
tests/engine/orders.woo.test.ts
tests/ui/Planning.actionGrid.test.tsx
tests/ui/Planning.targetRow.test.tsx
tests/ui/projection.test.ts
```

### 10.2 Modified files

```
src/engine/balance.ts            — AP values, ACTION_COSTS changes
src/engine/types.ts              — Order union, Leader fields, ResolutionEvent variants
src/engine/state.ts              — initialState seeds deployedShields/AA
src/engine/orders.ts             — apCostOf, validateOrder, validateOrderSequence, analyseOrderSequence
src/engine/builds.ts             — applyDefenceBuilds handles both kinds
src/engine/launches.ts           — interceptProbability reads deployed pool; intercept decrements
src/engine/resolution.ts         — defence-phase two-stage ordering; end-of-round deployed-pool clear
src/engine/ai/chump.ts           — drop points from woo; deploy-or-build defence rule
src/engine/ai/starmless.ts       — drop points from woo; deploy-or-build defence rule
src/engine/ai/khameneverhere.ts  — drop points from woo
src/engine/ai/carnage.ts         — drop points from woo
src/engine/ai/netanyahoo.ts      — drop points from woo
src/engine/ai/mileighhem.ts      — drop points from woo
src/ui/screens/Planning.tsx      — full rewrite
src/ui/screens/Planning.module.css — new layout styles
src/ui/components/SoftWarnPanel.tsx — re-positioned, no other changes
src/ui/components/EventCard.tsx  — 2 new event-kind cases
src/ui/screens/Action.tsx        — phaseAdvanceFor handles new event kinds

tests/engine/ai-duel.test.ts     — comment update flagging P4c rebaseline
tests/engine/resolution.test.ts  — extended for Mileigh bonus + defence phase ordering
tests/engine/analyseOrderSequence.test.ts — extended for queued-builds projection
README.md                        — Phase 4b status section
```

### 10.3 Deleted files

```
src/ui/components/OrderForm.tsx
src/ui/components/OrderForm.module.css
src/ui/components/LeaderCard.tsx
src/ui/components/LeaderCard.module.css
tests/ui/OrderForm.test.tsx
```

---

## 11. References

- Original full design: `docs/superpowers/specs/2026-05-08-nuke-design.md`
- P4a (just-merged predecessor): `docs/superpowers/specs/2026-05-12-phase-4a-satire-hotseat-design.md`
- Better-memory observations from playtesting captured 2026-05-13 under `component: balance` / `component: combat` / `component: planning-ui` / `theme: user-feedback`
