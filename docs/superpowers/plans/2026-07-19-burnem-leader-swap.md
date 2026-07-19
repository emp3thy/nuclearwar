# Burn'em Leader Swap Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Starmless with Burn'em (Andy Burnham parody): full id swap, new handbrake-turn AI personality, new flavour bank, new portrait.

**Architecture:** Mechanical rename first (suite stays green at every commit), then content/behavior swaps in separate commits: flavour bank, planner, portrait/UI copy. Provoked state derives from the existing persistent `grudge` map — no new engine state.

**Tech Stack:** TypeScript 5 engine (pure functions, seeded RNG), vitest, React 18 UI.

**Spec:** `docs/superpowers/specs/2026-07-19-burnem-leader-swap-design.md`
**Research:** `docs/superpowers/research/2026-07-19-burnham-research.md`

## Global Constraints

- Every commit typechecks (`npm run typecheck`) and passes `npm run test:run`.
- No Hillsborough references, no religious markers, no Disraeli "What Manchester does today…" line in any flavour content.
- Flavour register: most lines end in a tag question ("…isn't it?" / "…don't we?" / "…can't it?"); handbrake lines pivot blokey→apocalyptic with no transition.
- After the swap, `grep -ri starmless src/ tests/` returns zero hits. Historical docs/ are not edited.
- Product emojis in UI copy are design language — keep them.
- Tests: no `if (cond) expect(...)` guarded assertions.

## Guardrails (better-memory)

- **[[31c145bf]]** (conf 0.75, 3 evid): multi-consume order batches need a local projection counter; emit producers BEFORE consumers — `buildToward`/`launchSalvo` already institutionalise this; keep `[...build.orders, ...salvo.orders]` ordering.
- **[[0409087f]]** (conf 0.55): never-attack-first planners stall 1v1 endgames — the patience fallback in Task 3 exists because of this; the headless termination test is the tripwire.
- **[[ef7d086e]]** (conf 0.55): planner/behavior changes silently shift lookahead/scoring tests outside the stated file list — run the full engine suite, not just burnem tests.
- **[[063500c1]]** (conf 0.7): unconditional assertions only.
- **[[326f4462]]** (conf 0.55): imports added only in the commit that uses them.

## File Structure

```
Task 1 (rename): src/engine/types.ts, balance.ts, ai/{starmless→burnem}.ts, ai/dispatch.ts,
                 flavor/{starmless→burnem}.ts, flavor/index.ts, flavor/disparage.ts,
                 src/ui/{portraits/*, content/cast.ts, util/newspaper.ts, components/WorldMap.tsx,
                 screens/AiConferring.tsx}, tests/** (33 files, 162 occurrences)
Task 2 (flavour): src/engine/flavor/burnem.ts (rewrite), flavor/disparage.ts, tests/engine/flavor/pick.test.ts
Task 3 (planner): src/engine/ai/burnem.ts (rewrite), src/engine/balance.ts (drop scapegoat weight),
                  tests/engine/ai/burnem.test.ts (rewrite)
Task 4 (portrait/UI): src/ui/portraits/faces.tsx, portraits/index.ts, tokens.css, content/cast.ts,
                  util/newspaper.ts copy
Task 5 (docs+verify): docs/superpowers/flavour-bank.md, full sweep
```

---

### Task 1: Mechanical rename — starmless → burnem, behavior unchanged

**Files:** all 33 files matching `starmless` (case-insensitive) under `src/` and `tests/` (162 occurrences; enumerate with `grep -ril starmless src tests`).

**Interfaces:**
- Produces: `LeaderId` member `'burnem'`; `LEADER_PROFILES.burnem` (name `"Burn'em"`, country `'🇬🇧 UK'`, stats unchanged 25/6/6); `planBurnem` (old Starmless logic, renamed); `burnemBank` (old lines, renamed export); files `src/engine/ai/burnem.ts`, `src/engine/flavor/burnem.ts`, `tests/engine/ai/burnem.test.ts`.

- [ ] **Step 1: Rename files**

```bash
git mv src/engine/ai/starmless.ts src/engine/ai/burnem.ts
git mv src/engine/flavor/starmless.ts src/engine/flavor/burnem.ts
git mv tests/engine/ai/starmless.test.ts tests/engine/ai/burnem.test.ts
```

- [ ] **Step 2: Global token replacements** (in the renamed files and all other hits)

Case-sensitive, whole-word-aware, in this order:
1. `'starmless'` → `'burnem'` (id literals)
2. `planStarmless` → `planBurnem`; `starmlessBank` → `burnemBank`; `StarmlessFace` → `BurnemFace`
3. `STARMLESS_` constant prefixes → `BURNEM_`; `starmlessScapegoatPct` → `burnemScapegoatPct` (removed in Task 3, renamed here so the suite stays green)
4. Display strings: `Starmless` → `Burn'em` (LEADER_PROFILES name, UI copy, newspaper/market/obit copy, test assertion strings that check display names)
5. Comments mentioning Starmless in surviving files: update to Burn'em (historical accuracy notes may say "formerly Starmless").

`content/cast.ts` keeps its old profile/mood text this task (Task 4 replaces it). `flavor/burnem.ts` keeps old lines this task (Task 2 replaces them).

- [ ] **Step 3: Verify zero stragglers + suite green**

Run: `grep -ri starmless src tests` — Expected: no output.
Run: `npm run typecheck && npm run test:run` — Expected: clean, all pass (display-name assertions updated in step 2.4).

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "refactor(engine,ui): rename starmless leader id to burnem (Burn'em), behavior unchanged"
```

---

### Task 2: Burn'em flavour bank

**Files:**
- Rewrite: `src/engine/flavor/burnem.ts`
- Modify: `src/engine/flavor/disparage.ts` (snap-back entry for burnem)
- Test: `tests/engine/flavor/pick.test.ts` (only if it asserts specific starmless-era line text)

**Interfaces:**
- Consumes: `FlavorBank` type from `./index` (same shape as current file: `preRoundMood`, `preRoundMoodSnapBack`, `launch`, `hit`, `woo`, `beingWooed`, `propagandaSend`, `propagandaReceive`, `buildFactory`, `buildDefence`, `reaction`, `death`, `finalRetaliation`).
- Produces: `burnemBank: FlavorBank`.
- Note: the `{scapegoat}` substitution token is a Starmless-ism — the new bank does NOT use it (pick.ts filters such lines only when present; absence is fine).

- [ ] **Step 1: Write the new bank** — full replacement of `burnemBank`:

```ts
import type { FlavorBank } from './index';

// Burn'em — King in t' North. Register rules (see spec §3): tag questions on
// most lines; "handbrake turn" lines pivot blokey→apocalyptic with no
// transition; northern grievance + boosterism; bus obsession. Hard exclusions:
// no Hillsborough, no religious markers, no "What Manchester does today…".
export const burnemBank: FlavorBank = {
  preRoundMood: [
    'We need to bring people with us, don\'t we?',
    'The North is back. Big time.',
    'It\'s not arrogance, it\'s just confidence.',
    'The buses run on time now. That\'s how civilisations survive, isn\'t it?',
    'On bended knee, begging for scraps. Well. Not anymore, are we?',
  ],
  preRoundMoodSnapBack:
    'I\'ve heard what he said. We rise above it up here, don\'t we? Anyway, he\'s barred from the tram.',
  launch: [
    'Let me be clear — they carried on, so I\'m using nuclear force. Anyway. How\'s the family?',
    'I\'ve been very patient, haven\'t I? Well. Patience is a renewable resource. This isn\'t.',
    'They didn\'t leave us a choice down in Whitehall— sorry, force of habit. THEY didn\'t leave us a choice.',
    'This one\'s for every town that ever lost its bus route. It\'s fair, that, isn\'t it?',
  ],
  hit: [
    'That\'s a kindness taken for weakness, that. Big mistake. Massive.',
    'We\'ve been hit. The handbrake\'s off now, isn\'t it?',
  ],
  woo: [
    'Come up north. We\'ll do the match, couple of pints, £2 bus home. That\'s diplomacy, that.',
    'I\'m offering you a franchise partnership. Not the buses. The buses are ours.',
  ],
  beingWooed: [
    'That\'s very warm, that. We take friendship seriously up here, don\'t we?',
  ],
  propagandaSend: [
    'We\'ve sent over some leaflets. Just facts about our transport network. Devastating, honest facts.',
  ],
  propagandaReceive: [
    'They\'re calling me a plastic Northerner. From a bunker. In London. You couldn\'t write it, could you?',
  ],
  buildFactory: [
    'New factory. Good growth in every postcode, hope in every heart. And a bus stop right outside.',
    'They didn\'t build this for us down in Whitehall. We built it ourselves, didn\'t we?',
    'To get on in life, I had to head South. Nobody should have to. So we\'re building here.',
  ],
  buildDefence: [
    'We\'re putting a shield up. It\'s not paranoia, it\'s just confidence, isn\'t it?',
  ],
  reaction: [
    'I\'m watching all this very calmly. Very calmly indeed. Aren\'t I?',
    'Everything\'s connected to the buses if you look closely enough, isn\'t it?',
  ],
  death: [
    'Tell them… the North remembers… and tell them the 135 to Bury still runs on ti—',
  ],
  finalRetaliation: [
    'Right. Last orders, everyone. Last orders. It didn\'t have to be like this, did it?',
  ],
};
```

- [ ] **Step 2: Disparage snap-back** — in `flavor/disparage.ts`, replace the burnem-targeted line (renamed in Task 1) with:

```ts
  burnem: 'King in t\' North? He\'s from MERSEYSIDE. I\'ve seen more of Manchester from the airport bar.',
```

(Match the file's existing per-leader snap-back structure — key renamed in Task 1, text replaced here.)

- [ ] **Step 3: Run flavour tests**

Run: `npx vitest run tests/engine/flavor` — Expected: PASS. If `pick.test.ts` asserted old Starmless line text or `{scapegoat}` behavior via the starmless bank, repoint those assertions at a bank that still uses `{scapegoat}` (khameneverhere) or at the new burnem lines.

- [ ] **Step 4: Full suite + commit**

Run: `npm run typecheck && npm run test:run` — Expected: clean / all pass.

```bash
git add src/engine/flavor tests/engine/flavor
git commit -m "feat(engine): Burn'em flavour bank — tag questions and handbrake turns"
```

---

### Task 3: Handbrake-turn planner

**Files:**
- Rewrite: `src/engine/ai/burnem.ts`
- Modify: `src/engine/balance.ts` (delete `burnemScapegoatPct` from `AI_SCORING_WEIGHTS`), `tests/engine/balance.test.ts` (if it asserts that weight)
- Rewrite: `tests/engine/ai/burnem.test.ts`

**Interfaces:**
- Consumes: `threatScore(state, viewer, target)`, from `./scoring`; `buildToward(state, leaderId, plan, budget)`, `launchSalvo(state, leaderId, {budget, rankedTargets, maxLaunches})` from `./aggression`; `validateOrder` from `../orders`; `Leader.grudge` (persistent, bumped only by landed impacts — resolution.ts:249-260).
- Produces: `planBurnem(state: GameState, leaderId: LeaderId): Order[]` — same signature dispatch.ts already calls.

- [ ] **Step 1: Rewrite the test file first** — `tests/engine/ai/burnem.test.ts`. Reuse the state-builder helpers the old starmless test used (read the Task-1-renamed file before deleting its body; other per-planner tests, e.g. `tests/engine/ai/netanyahoo.test.ts`, use the same pattern). Cases:

1. **Placid, unprovoked (round < 6, 3+ alive):** no `grudge` entries against anyone → orders contain zero `launch` orders; contain at least one `woo` order targeting the other leader with the lowest `favourability` value on Burn'em's record; may contain `build-*` orders.
2. **Provoked by impact:** set `state.leaders.burnem.grudge.chump = 2`, give Burn'em stockpiled missiles+warheads → orders contain at least one launch, and EVERY launch order targets `'chump'`. Assert `orders.filter(o => o.kind === 'launch').length >= 1` unconditionally, then assert all targets.
3. **Provocation is permanent + redirects:** grudge vs chump but chump dead → launches target the top surviving grudge/threat target instead; assert launches exist and target the expected survivor.
4. **Patience fallback (round):** round = 6, no grudges, 3 alive, armed → launches exist, targeting the highest-`threatScore` rival.
5. **Patience fallback (2 survivors):** round 2, no grudges, only Burn'em + one other alive, armed → launches exist.
6. **Producers before consumers:** in any provoked-state order list containing both `build-*` and `launch` orders, the last `build-*` index < first `launch` index. Assert both indices > -1 first (no vacuous pass).

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/engine/ai/burnem.test.ts`
Expected: FAIL (old Cautious+Scapegoat logic doesn't match).

- [ ] **Step 3: Implement `planBurnem`** — full replacement:

```ts
import type { GameState, LeaderId, Order } from '../types';
import { apCostOf, validateOrder } from '../orders';
import { threatScore } from './scoring';
import { buildToward, launchSalvo, type BuildPlanEntry } from './aggression';

/**
 * Burn'em — the Handbrake Turn (spec 2026-07-19 §2).
 *
 * Placid by default: woos, builds factories and defence, banks AP, never
 * launches first. The first landed hit on him (persistent grudge > 0) flips
 * him permanently into full aggression against the provoker. Patience
 * fallback (round >= 6 unprovoked, or 2 survivors) prevents the
 * never-attack-first 1v1 stall (cf. Netanyahoo endgame fix).
 */
const DEPLOY_COST = 4;
const BURNEM_PATIENCE_ROUND = 6;
const BURNEM_MAX_LAUNCHES = 4;

const PLACID_BUILD_PLAN: BuildPlanEntry[] = [
  { build: { item: 'factory' }, target: 8 },
  { build: { item: 'defence', type: 'shield' }, target: 2 },
];

// Missile before warheads: delivery-first avoids the armed-but-undeliverable
// zero-fire failure. Producers precede consumers in the emitted batch.
const PROVOKED_BUILD_PLAN: BuildPlanEntry[] = [
  { build: { item: 'missile' }, target: 3 },
  { build: { item: 'warhead', yield: 'medium' }, target: 2 },
  { build: { item: 'warhead', yield: 'small' }, target: 2 },
  { build: { item: 'factory' }, target: 7 },
];

export function planBurnem(state: GameState, leaderId: LeaderId): Order[] {
  const me = state.leaders[leaderId];
  if (!me || !me.alive) return [];

  let budget = me.ap;
  const others = state.cast.filter((t) => t !== leaderId && state.leaders[t]?.alive);

  // --- Provocation: any surviving leader who ever landed a hit (grudge persists). ---
  const provokers = others.filter((t) => (me.grudge[t] ?? 0) > 0);
  let target: LeaderId | undefined;
  if (provokers.length > 0) {
    target = provokers.reduce((best, t) =>
      (me.grudge[t] ?? 0) > (me.grudge[best] ?? 0) ? t : best,
    );
  } else if (me.grudge && Object.entries(me.grudge).some(([id, g]) => (g ?? 0) > 0)) {
    // Provoker(s) dead: stay provoked, redirect to the strongest survivor.
    target = pickStrongestRival(state, leaderId, others);
  } else if (state.round >= BURNEM_PATIENCE_ROUND || others.length === 1) {
    // Patience fallback — deadlock guard.
    target = pickStrongestRival(state, leaderId, others);
  }

  const orders: Order[] = [];

  if (target !== undefined) {
    // --- Provoked: handbrake off. ---
    const build = buildToward(state, leaderId, PROVOKED_BUILD_PLAN, budget);
    const salvo = launchSalvo(state, leaderId, {
      budget: budget - build.apSpent,
      rankedTargets: [target],
      maxLaunches: BURNEM_MAX_LAUNCHES,
    });
    budget -= build.apSpent + salvo.apSpent;
    orders.push(...build.orders, ...salvo.orders);
  } else {
    // --- Placid: friendliest man in the apocalypse. ---
    const wooTarget = others.reduce((best, t) =>
      (me.favourability[t] ?? 0) < (me.favourability[best] ?? 0) ? t : best,
    others[0]);
    if (wooTarget !== undefined) {
      const woo: Order = { kind: 'woo', target: wooTarget };
      if (budget >= apCostOf(woo) && validateOrder(state, leaderId, woo).ok) {
        orders.push(woo);
        budget -= apCostOf(woo);
      }
    }
    const build = buildToward(state, leaderId, PLACID_BUILD_PLAN, budget);
    budget -= build.apSpent;
    orders.push(...build.orders);
    if (me.stockpile.shields >= 1 && budget >= DEPLOY_COST) {
      const deploy: Order = { kind: 'deploy-defence', type: 'shield' };
      if (validateOrder(state, leaderId, deploy).ok) {
        orders.push(deploy);
        budget -= DEPLOY_COST;
      }
    }
    // Remaining AP banks implicitly.
  }

  return orders;
}

function pickStrongestRival(
  state: GameState, viewer: LeaderId, others: LeaderId[],
): LeaderId | undefined {
  if (others.length === 0) return undefined;
  return others.reduce((best, t) =>
    threatScore(state, viewer, t) > threatScore(state, viewer, best) ? t : best,
  );
}
```

Adjust `Order` literal shapes (`woo`, `deploy-defence`, build kinds) to the exact union in `src/engine/orders.ts`/`types.ts` — copy the shapes the other planners emit; do not invent kinds. If `state.round` is named differently, use the actual field.

- [ ] **Step 4: Remove the scapegoat weight**

Delete `burnemScapegoatPct` from `AI_SCORING_WEIGHTS` in `balance.ts`; fix `balance.test.ts` if it enumerates weights.

- [ ] **Step 5: Run the new planner tests**

Run: `npx vitest run tests/engine/ai/burnem.test.ts` — Expected: PASS (6 tests).

- [ ] **Step 6: Full engine suite — watch the blast radius**

Run: `npm run test:run` — Expected: all pass. Pay attention to: `ai-duel.test.ts` (80-seed win breakdown), termination/integration tests, `lookahead.test.ts`, `dispatcher.test.ts`. If the duel distribution breaks its soft expectations, tune `PROVOKED_BUILD_PLAN` targets / `BURNEM_MAX_LAUNCHES` / `BURNEM_PATIENCE_ROUND` — do NOT loosen test thresholds.

- [ ] **Step 7: Commit**

```bash
git add src/engine/ai/burnem.ts src/engine/balance.ts tests/engine/ai/burnem.test.ts tests/engine/balance.test.ts
git commit -m "feat(engine): Burn'em handbrake-turn planner with patience fallback"
```

---

### Task 4: Portrait + UI content

**Files:**
- Modify: `src/ui/portraits/faces.tsx` (replace `BurnemFace` body), `src/ui/portraits/index.ts` (PORTRAIT_META color), `src/ui/tokens.css` (`--c-starm` → `--c-burnem`), `src/ui/content/cast.ts`, `src/ui/util/newspaper.ts` (any remaining display copy), `src/ui/components/WorldMap.tsx` (country label stays UK — verify only)
- Test: `tests/ui/Portrait.test.tsx` (add/adjust a burnem case if it enumerated leaders)

**Interfaces:**
- Consumes: `FACES`/`PORTRAIT_META` records from slice-1; token `--c-burnem`.
- Produces: `BurnemFace(): JSX.Element` keyed as `FACES.burnem`.

- [ ] **Step 1: tokens.css** — rename `--c-starm: #8a1729;` to `--c-burnem: #8a1729;` (Task 1 may have already renamed the var name; ensure value unchanged and no `--c-starm` references remain: `grep -r "c-starm" src`).

- [ ] **Step 2: Replace `BurnemFace`** in `faces.tsx` (modeled on the "VOTE ANDY FOR US" placard caricature: long pale face, flat dark side-sweep, heavy rectangular brows, rectangular glasses, stern flat mouth, black zip-up, mini placard prop):

```tsx
export function BurnemFace() {
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
      {/* black zip-up crew-neck — only suit-less cast member besides Mileigh */}
      <path d="M 5 102 L 12 76 L 88 76 L 95 102 Z" fill="#1c1a1c" stroke="#141214" strokeWidth="2.5" strokeLinejoin="round"/>
      {/* zip line + pull */}
      <line x1="50" y1="78" x2="50" y2="100" stroke="#5a5a5a" strokeWidth="2"/>
      <rect x="48.6" y="80" width="2.8" height="5" fill="#8a8a8a" stroke="#141214" strokeWidth="1"/>
      {/* crew-neck collar */}
      <path d="M 40 76 Q 50 84 60 76" fill="none" stroke="#141214" strokeWidth="2.2"/>
      {/* neck */}
      <rect x="42" y="66" width="16" height="12" fill="#ecd0b4" stroke="#141214" strokeWidth="2.2"/>
      {/* long pale face */}
      <path d="M 28 26 L 28 56 Q 30 70 40 73 L 60 73 Q 70 70 72 56 L 72 26 Q 50 22 28 26 Z"
        fill="#f2d8bc" stroke="#141214" strokeWidth="2.5" strokeLinejoin="round"/>
      {/* flat dark hair, side sweep */}
      <path d="M 24 28 Q 25 12 50 10 Q 75 12 76 28 L 76 22 Q 62 14 40 17 Q 28 19 24 26 Z"
        fill="#241f1d" stroke="#141214" strokeWidth="2.5" strokeLinejoin="round"/>
      {/* very thick rectangular brows */}
      <rect x="31" y="36" width="15" height="5" fill="#241f1d" stroke="#141214" strokeWidth="1.6"/>
      <rect x="54" y="36" width="15" height="5" fill="#241f1d" stroke="#141214" strokeWidth="1.6"/>
      {/* rectangular glasses */}
      <rect x="30" y="43" width="17" height="11" rx="1.5" fill="none" stroke="#141214" strokeWidth="2.4"/>
      <rect x="53" y="43" width="17" height="11" rx="1.5" fill="none" stroke="#141214" strokeWidth="2.4"/>
      <line x1="47" y1="48" x2="53" y2="48" stroke="#141214" strokeWidth="2.4"/>
      {/* eyes — famous lashes rendered as slightly heavy upper lids */}
      <path d="M 34 48 Q 38 46 42 48" fill="none" stroke="#141214" strokeWidth="2.6" strokeLinecap="round"/>
      <path d="M 58 48 Q 62 46 66 48" fill="none" stroke="#141214" strokeWidth="2.6" strokeLinecap="round"/>
      <circle cx="38" cy="49" r="1.6" fill="#141214"/>
      <circle cx="62" cy="49" r="1.6" fill="#141214"/>
      {/* stern flat mouth */}
      <line x1="42" y1="64" x2="58" y2="64" stroke="#141214" strokeWidth="2.4" strokeLinecap="round"/>
      {/* mini campaign placard prop, corner (cast-prop tradition) */}
      <g transform="translate(80 78) rotate(8)">
        <rect x="-1.2" y="0" width="2.4" height="22" fill="#a47a3e" stroke="#141214" strokeWidth="1.2"/>
        <rect x="-13" y="-16" width="26" height="18" fill="#c8283c" stroke="#141214" strokeWidth="1.8"/>
        <text x="0" y="-8.5" textAnchor="middle" fill="#f1e6cc" fontFamily="Anton, sans-serif" fontSize="6.5" letterSpacing="0.5">VOTE</text>
        <text x="0" y="-1.5" textAnchor="middle" fill="#f3c318" fontFamily="Anton, sans-serif" fontSize="6.5" letterSpacing="0.5">FOR US</text>
      </g>
    </svg>
  );
}
```

- [ ] **Step 3: `content/cast.ts`** — replace the burnem entry:

```ts
  burnem: { profile: "King in t' North", mood: "We need to bring people with us, don't we?" },
```

- [ ] **Step 4: Sweep remaining display copy**

`grep -rn "Burn'em\|burnem" src/ui` — verify newspaper market ticker/obit copy reads naturally with the new name (ticker sym e.g. `BRN`), Setup tile shows "UK · KING IN T' NORTH". Adjust `tests/ui/Portrait.test.tsx` if it enumerated cast ids.

- [ ] **Step 5: Verify + commit**

Run: `npm run typecheck && npm run test:run` — Expected: clean / all pass.
Run `npm run dev` and eyeball the Setup tile + an Action event with Burn'em.

```bash
git add src/ui tests/ui
git commit -m "feat(ui): Burn'em portrait (campaign-placard caricature) and cast copy"
```

---

### Task 5: Docs + final sweep

- [ ] **Step 1:** Update `docs/superpowers/flavour-bank.md` cast table: Starmless row → Burn'em (Cautious+Scapegoat → "Handbrake Turn — placid until provoked, then total"), note the register rules (tag questions, handbrake pivot, Hillsborough exclusion).
- [ ] **Step 2:** `grep -ri starmless src tests` → zero hits. `npm run test:run && npm run typecheck && npm run build` → green.
- [ ] **Step 3:** `graphify update .`
- [ ] **Step 4:** Commit:

```bash
git add docs/superpowers/flavour-bank.md
git commit -m "docs: flavour-bank cast table — Burn'em replaces Starmless"
```

---

## Self-Review Notes

- Spec coverage: §1 rename → Task 1; §2 planner → Task 3; §3 flavour → Task 2; §4 portrait/UI → Task 4; §5 testing → embedded per task; §6 docs → Task 5.
- Type consistency: `planBurnem` signature matches dispatch.ts call; `burnemBank` matches `FlavorBank`; `BurnemFace` slots into the `FACES` record from slice 1. Order-literal shapes flagged for verification against the real union rather than guessed.
- Flavour content pre-checked against exclusions: no Hillsborough, no religious markers, no Disraeli line; tag-question density satisfied; `{scapegoat}` token absent by design.
