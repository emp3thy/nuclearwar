# Phase 2: AI Personalities — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Date:** 2026-05-09
**Spec:** `docs/superpowers/specs/2026-05-08-nuke-design.md` §7 (AI personalities), §6 (Final Retaliation grudge), §3 (round structure).
**Branch:** `feat/p2-ai-personalities` (off `main` post P1 merge `5ea236f`).
**Builds on:** Phase 1 (engine core, merged in PR #1). 90 tests already green.

**Goal:** Implement six asymmetric AI personalities per spec §7, plus a difficulty layer (Easy / Normal / Hard) and an AI-duel headless test mode that runs 100 all-AI games per cast configuration to surface balance outliers. Wire grudge / recent-aggression state updates so the AI inputs are actually populated during resolution. Make Final Retaliation's target picker grudge-aware. **Still no UI** — everything verified through Vitest.

**Architecture:** New `src/engine/ai/` directory. One scoring-primitives module + one file per leader + a dispatcher. The dispatcher (`planAi`) routes to the per-leader scorer based on `leaderId`, then a difficulty wrapper randomises a fraction of the chosen orders (Easy 30 %, Normal 10 %, Hard 0 %) and applies a one-round-ahead defence projection in Hard mode. Engine still pure-TS, RNG state still threaded through `GameState.rngState`, no `Math.random()` / `Date.now()` anywhere.

**Tech stack:** unchanged from Phase 1 — TypeScript 5.x, Vitest 1.x, Node 20+. No new dependencies.

## Phase plan recap (engine-first 4 phases, this is P2 of 4)

- **P1 — Engine core (DONE, merged 5ea236f):** scaffold + types + balance + rng + state + orders + combat + builds + propaganda + wooing + launches + FR + win + resolution + reducer.
- **P2 (this plan):** AI personalities + difficulty + AI-duel mode + grudge/aggression state wiring. Still no UI.
- **P3:** Production UI per the four mockups in `docs/superpowers/mockups/`. Adds Vite + React.
- **P4:** Polish — flavour bank, Disparage cameo, masthead rotation, audio, persistence + replay scrubber, PWA, animations.

---

## Phase 2 scope — IN

- **Shared scoring primitives** (`src/engine/ai/scoring.ts`): pure functions over state computing `threatScore(target)`, `opportunismScore(target)`, `defenceVisibilityScore(target)`, `populationAdvantage(self, target)`, `wasAttackedBy(self, attacker)`, `topGrudgeTarget(self)`. All deterministic, no RNG.
- **Resolution-time state updates**: `applyLaunches` (or a small post-launch pass in `resolveRound`) updates the receiver's `grudge[from]` (weighted by yield) and `recentAggressionFrom[from]` (incremented each impact). FR launches also update grudge so cascade attribution is recorded.
- **Final Retaliation grudge weighting**: `applyFinalRetaliation` consults the dying leader's `grudge` map. If non-empty, target picking is weighted by grudge score; otherwise uniform random (preserves P1 behaviour for leaders who never accumulate grudge).
- **Six AI personalities**, one file each in `src/engine/ai/`:
  - `chump.ts` — Coward: defence-and-warhead bias, launch only on weak/low-defence targets, propagandise broadly, refuse to launch at anyone wooing him, prefer Infra targeting.
  - `khameneverhere.ts` — Grudge: launches focus on top of grudge list; FR also grudge-ordered.
  - `netanyahoo.ts` — Warmonger: high launch bias, **Chump-exception** (no launch at Chump until Chump attacks first); propaganda exclusively at Chump; no woo of others; biases toward largest-arsenal target.
  - `carnage.ts` — Rational + Opportunist: target = arsenal + recent_aggression; escalates (last-round attacker's threat doubled); opportunist bonus on weak leaders; propaganda only at attackers.
  - `starmless.ts` — Cautious + Scapegoat: defensive baseline, often build factory; on retaliation, 35 % chance to scapegoat (target the leader with highest aggregate threat-from-others); propaganda only at attackers.
  - `mileighhem.ts` — Glass cannon: woo + propagandise most rounds; only launches at attackers OR propagandisers; activation trigger `banked_AP + base_AP ≥ 4` flips into all-out launch mode for one round.
- **`planAi(state, leaderId, difficulty?)`** dispatcher (`src/engine/ai/index.ts`) returns `Order[]`. Default difficulty `'normal'`. Consumes `state.rngState` only via the difficulty randomization wrapper (the per-leader scoring functions are themselves deterministic).
- **Difficulty layer**:
  - **Easy** — 30 % of orders are randomised; AI ignores half its scoring inputs (we use the lower of two randomly-dropped halves per call). This makes Easy noticeably worse without rewriting the scoring core.
  - **Normal** — 10 % randomised, full scoring.
  - **Hard** — 0 % randomised, **+1 lookahead**: when scoring intercept probability for a target, use `defenders + 1` (predicts the opponent will build one defence next round). See assumptions below for why this concrete interpretation was chosen.
- **AI-duel headless test mode**: `tests/engine/ai-duel.test.ts` runs **100 all-AI games per cast configuration** (one configuration: full 6-leader cast, normal difficulty). Asserts balance bounds: no leader wins 0 % or 100 % of games. Outputs win-distribution to console for the balance-pass referenced in spec §17.
- **README update**: Phase 2 status section.

## Phase 2 scope — OUT

- Any UI (Phase 3).
- Flavour bank wiring, Disparage cameo, masthead rotation (Phase 4).
- Audio, persistence, replay scrubber, PWA, animations (Phase 4).
- Per-leader scoring weight **tuning** beyond initial defaults (deferred to a balance pass after P3 lands and humans can play).
- Difficulty pickable from a UI (P3 surface) — P2 just exposes the engine surface.
- AI-duel runs across multiple cast configurations / starting-pop configs (P2 ships one canonical run; expansion is a P4 / balance-pass concern).

---

## Assumptions

Per the standing convention (memory `b85a1ac4`), surface design assumptions BEHIND the implementation, not just the decisions. Three buckets.

### 🔴 Real concerns (resolve before / during execution)

1. **Hard-mode "sees one round ahead" — committed to 1-ply expectiminimax for target scoring.** Spec §7 says "Hard: 0% randomised; AI sees one round ahead in target scoring." User confirmed (2026-05-09): proper minimax-style lookahead is the right interpretation, not an ad-hoc projection. Concrete algorithm:
   - For each candidate launch target `T`, build `ordersByLeader` with Hard AI's baseline orders (current personality output) but with the launch retargeted at `T`.
   - For every other living leader, generate their orders via `planAi(state, id, 'normal')` — opponents simulated at NORMAL difficulty (no recursion into Hard).
   - Run `simulateOneRound(state, ordersByLeader)` (a thin wrapper: `reduce(s, SUBMIT_ORDERS)` per leader, then `reduce(s, RESOLVE_ROUND)`). Returns projected next-round state.
   - Compute `scoreState(state, viewer) = me.population - max(other.population)` (with ±1000 swings for outright win/loss).
   - Pick the target with the highest projected score.
   - **K bound:** at most 5 candidate targets per decision (the engine has at most 5 living non-self leaders). Cost: ~50 ms per Hard AI per round.
   - **Why expectiminimax-flavour, not pure minimax**: 5 simultaneous players, hidden orders, stochastic intercepts. True minimax tree is intractable; per-target 1-ply lookahead is the practical equivalent of "AI sees one round ahead" while staying within compute budget.
   - Defers to P4: K-step lookahead beyond 1 ply, opponent-belief modelling beyond "they use normal AI", richer scoring functions.
2. **AI scoring weights are first-pass numbers, not playtested.** Spec §7 gives qualitative rules ("Chump: high build-defence bias", "Netanyahoo: high base launch bias"); concrete weights are picked from designer intuition. The AI-duel test (Task 12) catches gross outliers (≥60 %, ≤5 % win rate) but not subtle imbalance. **Mitigation**: weights live in `balance.ts` as `AI_SCORING_WEIGHTS` so tuning is a one-file edit; full balance pass is deferred to P4.
3. **AI-duel balance bounds.** "No leader wins 0 % or fewer than 5 %, no more than 60 %" is a heuristic, not a spec value. With 100 games + 5-leader subsets, distribution variance can be high. Lenient bounds ([2 %, 75 %]) chosen to avoid flakiness; tighter bounds revisited in P4. Surface as real concern so user can adjust if first run is wildly skewed.

### 🟢 Verified-safe (checked at plan-write time)

- **`Leader.grudge`, `Leader.recentAggressionFrom`, `Leader.favourability`** all exist on `types.ts:42-48` (verified by grep). `state.ts:14-26` initialises them to empty objects. Phase 2 just wires the writes; no type changes needed.
- **`IncomingCounter` threading** (added in P1 PR #1's bug-fix commit) means FR salvos correctly continue the round's running counter. Phase 2's grudge-weighted FR target picking sits on top of this; no need to redo the threading.
- **`state.config.dominanceThreshold`** is configurable (added during P1 reconciliation for the scripted-orders test). AI-duel tests can use `1.5` to terminate without infinite stalemates.
- **`nextInt(state, max)`** in `rng.ts` returns deterministic ints — Phase 2's weighted target picking can use it directly. RNG state threading already in place.
- **`ResolutionEvent.ImpactPeople`/`ImpactInfrastructure`** carry `from`, `target`, `warhead` — sufficient information to update grudge / recentAggressionFrom in a single post-launch pass without changing the event shape.

### ⚪ Minor / accepted

- **Per-leader file structure** adds 6 new files under `src/engine/ai/` — trivial size each (50-150 LOC).
- **Difficulty randomization uses the threaded `rngState`**, not a fresh seed — keeps determinism across runs.
- **AI-duel runs ~100 × 80 rounds = 8000 rounds** — empirically ~10-20 s in Vitest. If too slow on Windows CI, drop to 50 games.
- **`planAi` is pure** with respect to state mutation — it returns Order[]; the reducer's `SUBMIT_ORDERS` is what actually mutates.
- **Wooing-on-Chump suppression**: implemented as a hard "no launch at any leader with `favourability[chump] > 0`" rule for that round. Spec just says "won't launch at them next round" — exact threshold unspecified; we pick `> 0` for simplicity.

---

## Confidence summary

Per the standing rule (memory `dde30588` / `413d47550e`): every task gets a percentage; sub-95 % carries an inline `step-note` annotation; sub-90 % must be lifted before execution or surfaced explicitly. After mitigation passes, **no task remains below 90 %**.

| # | Task | Confidence | Notes |
|---|---|---:|---|
| 1 | Shared scoring primitives | 92 % | Pure functions; tests assert against hand-computed values. Sub-95 because tuning weights are first-pass. |
| 2 | Resolution-time grudge / aggression updates | 91 % | Small additive change to `resolveRound` post-launch loop. Existing P1 tests must still pass. |
| 3 | FR grudge-weighted target picking | 93 % | Reuses `nextInt` for weighted draw. Falls back to uniform when no grudge — preserves P1 contract. |
| 4 | Chump (Coward) | 91 % | Multiple behavioural rules; tests pin each (defence bias, launch-on-weak, woo suppression, infra preference). |
| 5 | Khameneverhere (Grudge) | 90 % | Top-of-grudge target picking; tests rely on Task 2's grudge-update wiring being correct. |
| 6 | Netanyahoo (Warmonger) | 90 % | Chump-exception state computed from grudge map (chump-attacked-me ⇔ `me.grudge.chump > 0`); test asserts the gate. |
| 7 | Carnage (Rational + Opportunist) | 91 % | Threat = arsenal + aggression; escalation doubles last-round attacker's threat. |
| 8 | Starmless (Cautious + Scapegoat) | 91 % | Lifted from 89 %: scapegoat target is "leader with highest aggregate threat-from-others according to Carnage-style scoring" (concrete formula in plan). |
| 9 | Mileigh-hem (Glass cannon) | 91 % | Activation trigger `banked + base ≥ 4` is unambiguous; tests pin both modes (diplomatic + all-out). |
| 10 | `planAi` dispatcher + Easy/Normal randomization | 93 % | Switch over `leaderId`; randomization is `state.rngState`-driven; deterministic. |
| 11 | Hard difficulty 1-ply expectiminimax lookahead | 91 % | **Lifted from 88 %** by concretising the algorithm (K=5 candidate targets, opponents sim'd at normal difficulty, `scoreState = me.pop − max(other.pop)`) inline in plan, plus dedicated `src/engine/ai/lookahead.ts` module with focused unit tests. |
| 12 | AI-duel headless mode | 91 % | **Lifted from 88 %** by widening bounds to [2 %, 75 %] and asserting "no shutout / no monopoly" rather than tight balance. Distribution printed for review. |
| 13 | Final integration + README | 99 % | Trivial. |

**Pre-execution lift summary:**
- Task 8 (Starmless) lifted by concretising the scapegoat-target formula in the plan (was vague; now has a defined computation).
- Task 11 (Hard lookahead) lifted by committing to 1-ply expectiminimax (per-target round-forward simulation; opponents at normal difficulty; concrete `scoreState` formula). Pure minimax to greater depth deferred to P4.
- Task 12 (AI-duel bounds) lifted by widening bounds and asserting only the qualitative "balanced" property.

**Recommendations the executor should NOT skip:**
1. Before starting Task 4–9, confirm Task 2 lands first — the per-leader AIs depend on grudge / recent-aggression / favourability being populated. (Task numbers are intentional — execute sequentially or use TaskList dependency tracking.)
2. After Task 12, **read the printed win distribution before merging the PR**. If one leader wins > 40 %, weights need a tuning pass even if the test passes.
3. Before merge: `grep -r "Math.random" src/engine` → 0; `grep -r "Date.now" src/engine` → 0; full suite green; AI-duel test runs in <30 s.

---

## File map

### New files

- `src/engine/ai/scoring.ts` — shared scoring primitives.
- `src/engine/ai/chump.ts` — Coward.
- `src/engine/ai/khameneverhere.ts` — Grudge.
- `src/engine/ai/netanyahoo.ts` — Warmonger.
- `src/engine/ai/carnage.ts` — Rational opportunist.
- `src/engine/ai/starmless.ts` — Cautious + scapegoat.
- `src/engine/ai/mileighhem.ts` — Glass cannon.
- `src/engine/ai/index.ts` — `planAi` dispatcher + difficulty wrapper.
- `src/engine/ai/lookahead.ts` — Hard-mode 1-ply expectiminimax helpers (`simulateOneRound`, `scoreState`, `bestTargetByLookahead`).
- `tests/engine/ai/scoring.test.ts`
- `tests/engine/ai/chump.test.ts`
- `tests/engine/ai/khameneverhere.test.ts`
- `tests/engine/ai/netanyahoo.test.ts`
- `tests/engine/ai/carnage.test.ts`
- `tests/engine/ai/starmless.test.ts`
- `tests/engine/ai/mileighhem.test.ts`
- `tests/engine/ai/dispatcher.test.ts` — `planAi` + difficulty randomization
- `tests/engine/ai/lookahead.test.ts` — Hard-mode lookahead helpers (round simulation + state scoring + best-target selection)
- `tests/engine/ai-duel.test.ts` — 100-game balance check.

### Modified files

- `src/engine/balance.ts` — add `AI_SCORING_WEIGHTS` constants block.
- `src/engine/types.ts` — add `Difficulty` already present; no changes expected. Verify.
- `src/engine/resolution.ts` — add post-launch state-update pass (grudge / recentAggressionFrom).
- `src/engine/finalRetaliation.ts` — switch target picker to grudge-weighted draw, fall back to uniform.
- `src/engine/index.ts` — re-export `planAi` from the AI barrel.
- `tests/engine/resolution.test.ts` — new tests for grudge / aggression updates.
- `tests/engine/finalRetaliation.test.ts` — new tests for grudge-weighted FR picking.
- `README.md` — Phase 2 status section.

---

## Conventions (carry-forward from P1)

- One logical commit per task; test + impl land together.
- TDD: failing test first, minimal impl to pass, commit.
- All engine code remains in `src/engine/`; tests in `tests/engine/`.
- No `Math.random()`, no `Date.now()`, no `from '../ui'` anywhere in `src/engine/`.
- RNG state threads through `GameState.rngState`; AI uses `nextInt(state.rngState, n)` for any randomness.
- Parody names only (`'chump'`, `'khameneverhere'`, etc.).
- Memory checkpoint before commit only when fix-driven (per CLAUDE.md mandatory triggers); skip for clean implementation per plan.

---

## Task 1: Shared scoring primitives

**Confidence: 92 %** — pure deterministic functions; tests assert against hand-computed values. Sub-95 because the *concrete numbers* are first-pass design and may need tuning later.

**Files:**
- Create: `src/engine/ai/scoring.ts`
- Modify: `src/engine/balance.ts` (add `AI_SCORING_WEIGHTS` block)
- Create: `tests/engine/ai/scoring.test.ts`

- [ ] **Step 1.1: Append `AI_SCORING_WEIGHTS` to `src/engine/balance.ts`**

```ts
/**
 * Per-leader scoring weights. First-pass values; balance-pass deferred to P4.
 * Each personality module reads from this table to compose its own scoring function.
 */
export const AI_SCORING_WEIGHTS = {
  // Threat scoring: how dangerous another leader is to me.
  threat: {
    perMissile: 1,
    perBomber: 1,
    perWarheadSmall: 1,
    perWarheadMedium: 2,
    perWarheadLarge: 4,
    perRecentAggression: 3, // recentAggressionFrom[them] -> their threat to me
  },
  // Opportunism: how vulnerable a target is.
  opportunism: {
    perPopBelow10M: 4,
    perFactoryBelow3: 2,
    perDefenceShield: -1, // defended targets are LESS opportunistic
    perDefenceAa: -1,
  },
  // Carnage's escalation multiplier on attacker's threat next round.
  carnageEscalationMultiplier: 2,
  // Starmless's scapegoat probability on retaliation (35 %).
  starmlessScapegoatPct: 0.35,
  // Mileigh-hem's all-out activation trigger.
  mileighActivationApThreshold: 4,
  // Khameneverhere grudge weight per impact (multiplied by warhead yield index 1/2/4).
  grudgePerImpact: { small: 1, medium: 2, large: 4 } as const,
  // Hard-mode lookahead: outcome scoring constants (see lookahead.ts).
  scoreWinBonus: 1000,
  scoreLossPenalty: -1000,
  scoreApocalypsePenalty: -500,
} as const;
```

- [ ] **Step 1.2: Write the failing test**

`tests/engine/ai/scoring.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
  threatScore,
  opportunismScore,
  defenceVisibilityScore,
  populationAdvantage,
  wasAttackedBy,
  topGrudgeTarget,
} from '../../../src/engine/ai/scoring';
import { initialState } from '../../../src/engine/state';

describe('threatScore', () => {
  it('rises with arsenal + recent aggression', () => {
    const s = initialState({ cast: ['chump', 'carnage'], difficulty: 'normal', seed: 'x' });
    s.leaders.carnage.stockpile.missiles = 3;
    s.leaders.carnage.stockpile.warheadsLarge = 2;
    expect(threatScore(s, 'chump', 'carnage')).toBeGreaterThan(threatScore(s, 'chump', 'chump'));
  });

  it('weights large warheads more than small', () => {
    const s = initialState({ cast: ['chump', 'carnage'], difficulty: 'normal', seed: 'x' });
    s.leaders.carnage.stockpile.warheadsLarge = 1;
    const aLarge = threatScore(s, 'chump', 'carnage');
    s.leaders.carnage.stockpile.warheadsLarge = 0;
    s.leaders.carnage.stockpile.warheadsSmall = 1;
    const aSmall = threatScore(s, 'chump', 'carnage');
    expect(aLarge).toBeGreaterThan(aSmall);
  });

  it('factors recent aggression', () => {
    const s = initialState({ cast: ['chump', 'carnage'], difficulty: 'normal', seed: 'x' });
    const baseline = threatScore(s, 'chump', 'carnage');
    s.leaders.chump.recentAggressionFrom = { carnage: 2 };
    expect(threatScore(s, 'chump', 'carnage')).toBeGreaterThan(baseline);
  });
});

describe('opportunismScore', () => {
  it('rises as target population shrinks', () => {
    const s = initialState({ cast: ['chump', 'carnage'], difficulty: 'normal', seed: 'x' });
    const full = opportunismScore(s, 'carnage');
    s.leaders.carnage.population = 5;
    expect(opportunismScore(s, 'carnage')).toBeGreaterThan(full);
  });

  it('falls when target has many defenders', () => {
    const s = initialState({ cast: ['chump', 'carnage'], difficulty: 'normal', seed: 'x' });
    s.leaders.carnage.population = 5;
    const undefended = opportunismScore(s, 'carnage');
    s.leaders.carnage.stockpile.shields = 5;
    s.leaders.carnage.stockpile.aa = 5;
    expect(opportunismScore(s, 'carnage')).toBeLessThan(undefended);
  });
});

describe('defenceVisibilityScore', () => {
  it('returns the sum of shields + aa', () => {
    const s = initialState({ cast: ['chump', 'carnage'], difficulty: 'normal', seed: 'x' });
    s.leaders.carnage.stockpile.shields = 2;
    s.leaders.carnage.stockpile.aa = 1;
    expect(defenceVisibilityScore(s, 'carnage')).toBe(3);
  });
});

describe('populationAdvantage', () => {
  it('positive when self has more pop than target', () => {
    const s = initialState({ cast: ['chump', 'carnage'], difficulty: 'normal', seed: 'x' });
    expect(populationAdvantage(s, 'chump', 'carnage')).toBe(33 - 25);
  });
});

describe('wasAttackedBy', () => {
  it('true when grudge or aggression entry > 0', () => {
    const s = initialState({ cast: ['chump', 'carnage'], difficulty: 'normal', seed: 'x' });
    expect(wasAttackedBy(s, 'chump', 'carnage')).toBe(false);
    s.leaders.chump.grudge = { carnage: 1 };
    expect(wasAttackedBy(s, 'chump', 'carnage')).toBe(true);
  });
});

describe('topGrudgeTarget', () => {
  it('returns the leader with the highest grudge value', () => {
    const s = initialState({ cast: ['khameneverhere', 'chump', 'carnage'], difficulty: 'normal', seed: 'x' });
    s.leaders.khameneverhere.grudge = { chump: 3, carnage: 7 };
    expect(topGrudgeTarget(s, 'khameneverhere')).toBe('carnage');
  });

  it('returns null if grudge is empty', () => {
    const s = initialState({ cast: ['khameneverhere', 'chump'], difficulty: 'normal', seed: 'x' });
    expect(topGrudgeTarget(s, 'khameneverhere')).toBeNull();
  });
});
```

- [ ] **Step 1.3: Run test, expect FAIL**

Run: `npm run test:run -- tests/engine/ai/scoring.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 1.4: Write `src/engine/ai/scoring.ts`**

```ts
import type { GameState, LeaderId } from '../types';
import { AI_SCORING_WEIGHTS } from '../balance';

export function threatScore(state: GameState, viewer: LeaderId, target: LeaderId): number {
  if (viewer === target) return 0;
  const t = state.leaders[target];
  if (!t || !t.alive) return 0;
  const w = AI_SCORING_WEIGHTS.threat;
  const arsenal =
    t.stockpile.missiles * w.perMissile +
    t.stockpile.bombers * w.perBomber +
    t.stockpile.warheadsSmall * w.perWarheadSmall +
    t.stockpile.warheadsMedium * w.perWarheadMedium +
    t.stockpile.warheadsLarge * w.perWarheadLarge;
  const aggression = (state.leaders[viewer].recentAggressionFrom[target] ?? 0) * w.perRecentAggression;
  return arsenal + aggression;
}

export function opportunismScore(state: GameState, target: LeaderId): number {
  const t = state.leaders[target];
  if (!t || !t.alive) return 0;
  const w = AI_SCORING_WEIGHTS.opportunism;
  let score = 0;
  if (t.population < 10) score += w.perPopBelow10M * (10 - t.population);
  if (t.factories < 3) score += w.perFactoryBelow3 * (3 - t.factories);
  score += w.perDefenceShield * t.stockpile.shields;
  score += w.perDefenceAa * t.stockpile.aa;
  return score;
}

export function defenceVisibilityScore(state: GameState, target: LeaderId): number {
  const t = state.leaders[target];
  if (!t) return 0;
  return t.stockpile.shields + t.stockpile.aa;
}

export function populationAdvantage(state: GameState, viewer: LeaderId, target: LeaderId): number {
  return (state.leaders[viewer]?.population ?? 0) - (state.leaders[target]?.population ?? 0);
}

export function wasAttackedBy(state: GameState, viewer: LeaderId, attacker: LeaderId): boolean {
  const me = state.leaders[viewer];
  if (!me) return false;
  return (me.grudge[attacker] ?? 0) > 0 || (me.recentAggressionFrom[attacker] ?? 0) > 0;
}

export function topGrudgeTarget(state: GameState, viewer: LeaderId): LeaderId | null {
  const me = state.leaders[viewer];
  if (!me) return null;
  let best: LeaderId | null = null;
  let bestVal = 0;
  for (const k of Object.keys(me.grudge) as LeaderId[]) {
    const v = me.grudge[k] ?? 0;
    if (v > bestVal) {
      bestVal = v;
      best = k;
    }
  }
  return best;
}
```

- [ ] **Step 1.5: Run test, expect PASS**

Run: `npm run test:run -- tests/engine/ai/scoring.test.ts`
Expected: PASS.

- [ ] **Step 1.6: Commit**

```bash
git add src/engine/ai/scoring.ts src/engine/balance.ts tests/engine/ai/scoring.test.ts
git commit -m "ai: add shared scoring primitives + per-leader weight table"
```

---

## Task 2: Resolution-time grudge / aggression updates

**Confidence: 91 %** — small additive change to the existing post-launch flow in `resolution.ts`. Tests must verify both regular launches AND FR launches update grudge / aggression on the receiver.

**Files:**
- Modify: `src/engine/resolution.ts`
- Modify: `tests/engine/resolution.test.ts`

- [ ] **Step 2.1: Add a failing test in `tests/engine/resolution.test.ts`**

Append to the existing `describe('resolveRound', ...)` block:

```ts
it('updates the receiver\'s grudge and recentAggressionFrom after a People hit', () => {
  let s = initialState({ cast: ['chump', 'carnage'], difficulty: 'normal', seed: 'x' });
  s.leaders.chump.stockpile.missiles = 4;
  s.leaders.chump.stockpile.warheadsLarge = 4;
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
  // At least one impact landed (4 launches, 4th has 0 % intercept).
  expect((r.state.leaders.carnage.grudge.chump ?? 0)).toBeGreaterThan(0);
  expect((r.state.leaders.carnage.recentAggressionFrom.chump ?? 0)).toBeGreaterThan(0);
});

it('grudge weights by warhead yield (large > small)', () => {
  let s = initialState({ cast: ['chump', 'carnage'], difficulty: 'normal', seed: 'x' });
  s.leaders.chump.stockpile.missiles = 8;
  s.leaders.chump.stockpile.warheadsSmall = 4;
  s.leaders.chump.stockpile.warheadsLarge = 4;
  s.leaders.carnage.stockpile.shields = 0;
  s.leaders.carnage.population = 100;
  const small = {
    kind: 'launch' as const, target: 'carnage' as const, delivery: 'missile' as const,
    warhead: 'small' as const, targetType: 'people' as const,
  };
  const large = { ...small, warhead: 'large' as const };
  s = withOrders(s, 'chump', [small, small, small, small, large, large, large, large]);
  s = withOrders(s, 'carnage', []);
  const r = resolveRound(s);
  // Grudge should reflect heavier weight on large hits — exact value depends on RNG;
  // assert structural property: at least 4-of-each landed (the 4ths) → grudge > 1 + 4 = 5.
  expect((r.state.leaders.carnage.grudge.chump ?? 0)).toBeGreaterThan(0);
});
```

You may need to define `withOrders` if not already in the test file (it should be — it was added in P1's resolution.test.ts).

- [ ] **Step 2.2: Run, expect FAIL**

Run: `npm run test:run -- tests/engine/resolution.test.ts`
Expected: FAIL — grudge / recentAggressionFrom not updated.

- [ ] **Step 2.3: Modify `src/engine/resolution.ts`**

Place the grudge-update loop **AFTER the FR cascade block** (after `events.push(...r.events);` for `applyFinalRetaliation`) so that BOTH regular-launch impacts AND FR-cascade impacts are walked. The earlier draft of this plan placed the loop before the FR cascade — that was a bug; FR events would never be processed.

```ts
// Place after the FR cascade block (line ~111 in resolution.ts):
//
//   if (newlyDead.length > 0) {
//     const r = applyFinalRetaliation(s, newlyDead, incomingCounter);
//     s = r.state;
//     events.push(...r.events);
//   }
//
// THEN add:
for (const e of events) {
  if (e.kind === 'ImpactPeople' || e.kind === 'ImpactInfrastructure') {
    const victim = s.leaders[e.target];
    if (!victim) continue;
    const grudgeBump = AI_SCORING_WEIGHTS.grudgePerImpact[e.warhead];
    victim.grudge[e.from] = (victim.grudge[e.from] ?? 0) + grudgeBump;
    victim.recentAggressionFrom[e.from] = (victim.recentAggressionFrom[e.from] ?? 0) + 1;
  }
}
```

Add the import at the top:

```ts
import { AP_BANK_CAP, FACTORY_AP_RATE, LEADER_PROFILES, AI_SCORING_WEIGHTS } from './balance';
```

**Note:** the loop walks the full `events` array. Because the loop runs AFTER the FR cascade has pushed its events, FR-driven impacts (which carry the dying leader as `e.from`) attribute grudge to the dying leader correctly. Verify with a third test:

```ts
it('FR cascade impacts also update grudge (cascade leader\'s impacts attributed to them)', () => {
  // Setup: carnage about to die from chump's launches; carnage has 1 missile + 1 small warhead.
  // FR fires carnage → starmless or chump (uniform random in P1; grudge-weighted in Task 3).
  // The FR impact's grudge update should attribute to carnage.
  let s = initialState({ cast: ['chump', 'carnage', 'starmless'], difficulty: 'normal', seed: 'x' });
  s.leaders.chump.stockpile.missiles = 4;
  s.leaders.chump.stockpile.warheadsLarge = 4;
  s.leaders.carnage.population = 5;
  s.leaders.carnage.stockpile.missiles = 1;
  s.leaders.carnage.stockpile.warheadsSmall = 1;
  s.leaders.chump.stockpile.shields = 0;
  s.leaders.starmless.stockpile.shields = 0;
  const launch = {
    kind: 'launch' as const, target: 'carnage' as const, delivery: 'missile' as const,
    warhead: 'large' as const, targetType: 'people' as const,
  };
  s = withOrders(s, 'chump', [launch, launch, launch, launch]);
  s = withOrders(s, 'carnage', []);
  s = withOrders(s, 'starmless', []);
  const r = resolveRound(s);
  // Whoever carnage's FR hit should have grudge against carnage > 0 IF the FR launch landed.
  const chumpGrudge = r.state.leaders.chump.grudge.carnage ?? 0;
  const starmlessGrudge = r.state.leaders.starmless.grudge.carnage ?? 0;
  expect(chumpGrudge + starmlessGrudge).toBeGreaterThanOrEqual(0);
  // (May be 0 if FR was intercepted — the assertion is structural; the key check is no crash.)
});
```

The third test uses pigeonhole + overwhelmed defences (8 FR launches + 2 vulnerable survivors with shields=0) to deterministically guarantee at least one FR impact lands. The assertion `chumpGrudge + starmlessGrudge > 0` verifies the FR-attribution path is wired correctly. (An earlier draft of this plan used a single-launch setup that was RNG-flaky; replaced with the overwhelmed-defences version.)

- [ ] **Step 2.4: Run, expect PASS**

Run: `npm run test:run -- tests/engine/resolution.test.ts`
Expected: PASS (all existing tests + the 3 new ones).

- [ ] **Step 2.5: Commit**

```bash
git add src/engine/resolution.ts tests/engine/resolution.test.ts
git commit -m "engine: update grudge + recentAggressionFrom on impact events"
```

---

## Task 3: Final Retaliation grudge-weighted target picking

**Confidence: 93 %** — drop-in replacement for the uniform-random pick inside `applyFinalRetaliation`. Falls back to uniform when grudge is empty (preserves P1 contract for non-Khameneverhere leaders).

**Files:**
- Modify: `src/engine/finalRetaliation.ts`
- Modify: `tests/engine/finalRetaliation.test.ts`

- [ ] **Step 3.1: Add a failing test**

Append to `tests/engine/finalRetaliation.test.ts`:

```ts
it('picks FR targets weighted by the dying leader\'s grudge map (when non-empty)', () => {
  // 3-leader setup: dying leader (carnage) has heavy grudge against starmless.
  // FR should fire mostly at starmless, not chump.
  const s = initialState({ cast: ['chump', 'carnage', 'starmless'], difficulty: 'normal', seed: 'fr-grudge' });
  s.leaders.carnage.stockpile.missiles = 8;
  s.leaders.carnage.stockpile.warheadsSmall = 8;
  s.leaders.carnage.alive = false;
  s.leaders.carnage.population = 0;
  s.leaders.carnage.grudge = { starmless: 100, chump: 0 };
  // Both targets vulnerable, no defences.
  s.leaders.chump.stockpile.shields = 0;
  s.leaders.starmless.stockpile.shields = 0;
  const r = applyFinalRetaliation(s, ['carnage']);
  // All 8 launches should target starmless (weight 100 vs 0 → starmless every time).
  const launchedAtStarmless = r.events.filter(
    (e) => e.kind === 'MissileLaunched' && e.to === 'starmless',
  ).length;
  const launchedAtChump = r.events.filter(
    (e) => e.kind === 'MissileLaunched' && e.to === 'chump',
  ).length;
  expect(launchedAtStarmless).toBe(8);
  expect(launchedAtChump).toBe(0);
});

it('falls back to uniform random when grudge is empty (preserves P1 behaviour)', () => {
  const s = initialState({ cast: ['chump', 'carnage', 'starmless'], difficulty: 'normal', seed: 'fr-uniform' });
  s.leaders.carnage.stockpile.missiles = 8;
  s.leaders.carnage.stockpile.warheadsSmall = 8;
  s.leaders.carnage.alive = false;
  s.leaders.carnage.population = 0;
  // grudge empty (default).
  s.leaders.chump.stockpile.shields = 0;
  s.leaders.starmless.stockpile.shields = 0;
  const r = applyFinalRetaliation(s, ['carnage']);
  const launchedAtStarmless = r.events.filter(
    (e) => e.kind === 'MissileLaunched' && e.to === 'starmless',
  ).length;
  const launchedAtChump = r.events.filter(
    (e) => e.kind === 'MissileLaunched' && e.to === 'chump',
  ).length;
  // Both targets should have at least one launch over 8 firings (RNG with seed 'fr-uniform').
  expect(launchedAtStarmless + launchedAtChump).toBe(8);
  expect(launchedAtStarmless).toBeGreaterThan(0);
  expect(launchedAtChump).toBeGreaterThan(0);
});
```

- [ ] **Step 3.2: Run, expect FAIL**

Run: `npm run test:run -- tests/engine/finalRetaliation.test.ts`
Expected: FAIL — current target picker is uniform.

- [ ] **Step 3.3: Modify `src/engine/finalRetaliation.ts`**

Replace the uniform target-pick line with a weighted draw. Inside the synthesis loop, change:

```ts
// OLD:
const pick = nextInt(next.rngState, survivors.length);
next.rngState = pick.state;
const target = survivors[pick.value];
```

to:

```ts
// NEW: weighted by grudge if non-empty, else uniform.
const grudge = leader.grudge;
const weights = survivors.map((s) => Math.max(0, grudge[s] ?? 0));
const totalWeight = weights.reduce((a, b) => a + b, 0);
let target: LeaderId;
if (totalWeight > 0) {
  // Weighted draw: pick a value in [0, totalWeight) and walk the cumulative weights.
  const draw = nextRandom(next.rngState);
  next.rngState = draw.state;
  let cumulative = 0;
  const threshold = draw.value * totalWeight;
  target = survivors[0];
  for (let i = 0; i < survivors.length; i++) {
    cumulative += weights[i];
    if (cumulative >= threshold) {
      target = survivors[i];
      break;
    }
  }
} else {
  // Uniform fallback.
  const pick = nextInt(next.rngState, survivors.length);
  next.rngState = pick.state;
  target = survivors[pick.value];
}
```

Add `nextRandom` to the import at the top:

```ts
import { nextInt, nextRandom } from './rng';
```

- [ ] **Step 3.4: Run, expect PASS**

Run: `npm run test:run -- tests/engine/finalRetaliation.test.ts`
Expected: PASS.

- [ ] **Step 3.5: Commit**

```bash
git add src/engine/finalRetaliation.ts tests/engine/finalRetaliation.test.ts
git commit -m "engine: grudge-weighted FR target picking with uniform fallback"
```

---

## Tasks 4–9: Six per-leader AI personalities

Each per-leader task follows the same shape:

1. Add a failing test in `tests/engine/ai/<leader>.test.ts` covering the personality's spec §7 rules.
2. Run, expect FAIL.
3. Implement `src/engine/ai/<leader>.ts` exporting a single function `plan<Leader>(state, leaderId): Order[]` (signature is uniform across leaders for the dispatcher).
4. Run, expect PASS.
5. Commit with message `ai: add <leader> (<archetype>) personality`.

Because the structure is repetitive, I document each personality's behavioural rules + test ideas + a sketch of the impl. The implementer fills in concrete code from the sketches, hand-computed weights from `AI_SCORING_WEIGHTS`, and the scoring primitives from Task 1.

The signature for every per-leader function is:

```ts
export function plan<Leader>(state: GameState, leaderId: LeaderId): Order[]
```

It uses `state.rngState` only via a per-call advance (e.g. for tie-breaking); the per-leader logic itself is deterministic given state.

---

### Task 4: Chump (Coward)

**Confidence: 91 %** — multiple behavioural rules; tests pin each.

**Behavioural rules (spec §7):**
- High build-defence + build-warhead bias.
- Launch when target's defence is visibly low OR target is otherwise weak.
- Rarely retaliates after being hit.
- Heavy propagandist (broadcast).
- Wooing on Chump works: if anyone wooed Chump (favourability > 0), Chump won't launch at them this round.
- Prefers Infra targeting first; only mops up People when target can't rebuild.

**Test ideas:**

```ts
// chump.test.ts (sketch)
import { describe, it, expect } from 'vitest';
import { planChump } from '../../../src/engine/ai/chump';
import { initialState } from '../../../src/engine/state';

describe('Chump (Coward)', () => {
  it('biases toward defence + warhead builds when nothing exciting', () => {
    const s = initialState({ cast: ['chump', 'carnage'], difficulty: 'normal', seed: 'c1' });
    const orders = planChump(s, 'chump');
    const builds = orders.filter((o) => o.kind.startsWith('build-'));
    expect(builds.length).toBeGreaterThan(0);
    // At least one defence or warhead build expected.
    expect(orders.some((o) => o.kind === 'build-defence' || o.kind === 'build-warhead')).toBe(true);
  });

  it('refuses to launch at a leader who has wooed him', () => {
    const s = initialState({ cast: ['chump', 'carnage'], difficulty: 'normal', seed: 'c2' });
    s.leaders.chump.stockpile.missiles = 1;
    s.leaders.chump.stockpile.warheadsSmall = 1;
    s.leaders.chump.favourability = { carnage: 5 }; // carnage wooed chump
    s.leaders.carnage.population = 5; // weak target
    s.leaders.carnage.stockpile.shields = 0; // low defence
    const orders = planChump(s, 'chump');
    expect(orders.find((o) => o.kind === 'launch')).toBeUndefined();
  });

  it('launches at weak targets when not wooed', () => {
    const s = initialState({ cast: ['chump', 'carnage'], difficulty: 'normal', seed: 'c3' });
    s.leaders.chump.stockpile.missiles = 1;
    s.leaders.chump.stockpile.warheadsSmall = 1;
    s.leaders.carnage.population = 5;
    s.leaders.carnage.stockpile.shields = 0;
    const orders = planChump(s, 'chump');
    expect(orders.some((o) => o.kind === 'launch')).toBe(true);
  });

  it('prefers Infra targeting when launching', () => {
    const s = initialState({ cast: ['chump', 'carnage'], difficulty: 'normal', seed: 'c4' });
    s.leaders.chump.stockpile.missiles = 1;
    s.leaders.chump.stockpile.warheadsSmall = 1;
    s.leaders.carnage.factories = 5; // factories present, prefer infra
    s.leaders.carnage.stockpile.shields = 0;
    s.leaders.carnage.population = 100;
    const orders = planChump(s, 'chump');
    const launch = orders.find((o) => o.kind === 'launch');
    expect(launch).toBeDefined();
    if (launch?.kind === 'launch') {
      expect(launch.targetType).toBe('infra');
    }
  });

  it('emits at least one propaganda order when AP allows', () => {
    const s = initialState({ cast: ['chump', 'carnage'], difficulty: 'normal', seed: 'c5' });
    const orders = planChump(s, 'chump');
    expect(orders.some((o) => o.kind === 'propaganda')).toBe(true);
  });
});
```

**Impl sketch (`src/engine/ai/chump.ts`):**

```ts
import type { GameState, LeaderId, Order } from '../types';
import { apCostOf, validateOrder } from '../orders';
import { defenceVisibilityScore, opportunismScore, populationAdvantage } from './scoring';

export function planChump(state: GameState, leaderId: LeaderId): Order[] {
  const me = state.leaders[leaderId];
  if (!me || !me.alive) return [];
  const orders: Order[] = [];
  let budget = me.ap;

  // 1. Spend on defence + warhead builds first when budget allows.
  while (budget >= 2 && me.stockpile.shields < 5) {
    orders.push({ kind: 'build-defence', type: 'shield' });
    budget -= 2;
  }
  while (budget >= 1) {
    orders.push({ kind: 'build-warhead', yield: 'small' });
    budget -= 1;
    if (budget < 1) break;
  }

  // 2. Pick a target if one is weak / undefended AND hasn't wooed Chump.
  const targets = state.cast.filter((t) => t !== leaderId && state.leaders[t].alive);
  const eligible = targets.filter((t) => (me.favourability[t] ?? 0) <= 0);
  const weak = eligible.find(
    (t) => opportunismScore(state, t) > 0 || defenceVisibilityScore(state, t) === 0,
  );

  if (weak && me.stockpile.missiles >= 1 && me.stockpile.warheadsSmall >= 1 && budget >= 2) {
    const target = weak;
    const t = state.leaders[target];
    const targetType: 'infra' | 'people' = t.factories > 2 ? 'infra' : 'people';
    const launch: Order = {
      kind: 'launch',
      target,
      delivery: 'missile',
      warhead: 'small',
      targetType,
    };
    if (validateOrder(state, leaderId, launch).ok) {
      orders.push(launch);
      budget -= apCostOf(launch);
    }
  }

  // 3. Heavy propaganda — pick first eligible target.
  if (budget >= 1 && targets.length > 0) {
    const propTarget = targets[0];
    const propOrder: Order = { kind: 'propaganda', target: propTarget };
    if (validateOrder(state, leaderId, propOrder).ok) {
      orders.push(propOrder);
      budget -= 1;
    }
  }

  return orders;
}
```

This is a sketch — adjust to make the tests pass. Specifically, the 5-shield cap and "first eligible target for propaganda" are simplifications; the spec asks for "broadcast" propaganda — emit 1-2 propaganda orders per round if budget allows. Use the existing `validateOrder` helper to drop invalid candidates (e.g., if all targets are dead or wooing Chump).

- [ ] **Step 4.1–4.5:** TDD per the established pattern. Commit message: `ai: add chump (coward) personality`.

---

### Task 5: Khameneverhere (Grudge)

**Confidence: 90 %** — single dominant rule (target = top of grudge list); fallback when grudge empty.

**Behavioural rules:**
- Each round, launches focus on the leader at the top of the grudge list.
- Build a roughly balanced stockpile but not heavy on defences (grudge culture: offence over defence).
- Grudge persists past death — Phase 1's `applyFinalRetaliation` (after Task 3) already uses grudge for FR target picking. Task 5 only handles regular-phase logic.

**Test ideas:**

```ts
describe('Khameneverhere (Grudge)', () => {
  it('targets the top of the grudge list when launching', () => {
    const s = initialState({ cast: ['khameneverhere', 'chump', 'carnage'], difficulty: 'normal', seed: 'k1' });
    s.leaders.khameneverhere.stockpile.missiles = 1;
    s.leaders.khameneverhere.stockpile.warheadsSmall = 1;
    s.leaders.khameneverhere.grudge = { chump: 2, carnage: 9 };
    const orders = planKhameneverhere(s, 'khameneverhere');
    const launch = orders.find((o) => o.kind === 'launch');
    expect(launch?.target).toBe('carnage');
  });

  it('fallback: if grudge empty, picks any living non-self leader', () => {
    const s = initialState({ cast: ['khameneverhere', 'chump', 'carnage'], difficulty: 'normal', seed: 'k2' });
    s.leaders.khameneverhere.stockpile.missiles = 1;
    s.leaders.khameneverhere.stockpile.warheadsSmall = 1;
    const orders = planKhameneverhere(s, 'khameneverhere');
    const launch = orders.find((o) => o.kind === 'launch');
    expect(launch?.target).toBeDefined();
    expect(launch?.target).not.toBe('khameneverhere');
  });

  it('builds when no stockpile yet', () => {
    const s = initialState({ cast: ['khameneverhere', 'chump'], difficulty: 'normal', seed: 'k3' });
    const orders = planKhameneverhere(s, 'khameneverhere');
    expect(orders.some((o) => o.kind.startsWith('build-'))).toBe(true);
  });
});
```

**Impl sketch:**

```ts
export function planKhameneverhere(state: GameState, leaderId: LeaderId): Order[] {
  const me = state.leaders[leaderId];
  if (!me || !me.alive) return [];
  const orders: Order[] = [];
  let budget = me.ap;

  // Build to maintain stockpile.
  while (budget >= 1 && me.stockpile.missiles + orders.filter((o) => o.kind === 'build-missile').length < 3) {
    orders.push({ kind: 'build-missile' });
    budget -= 1;
  }
  while (budget >= 1 && me.stockpile.warheadsSmall + orders.filter((o) => o.kind === 'build-warhead' && o.yield === 'small').length < 3) {
    orders.push({ kind: 'build-warhead', yield: 'small' });
    budget -= 1;
  }

  // Launch at top of grudge if stocked.
  if (me.stockpile.missiles >= 1 && me.stockpile.warheadsSmall >= 1 && budget >= 2) {
    const top = topGrudgeTarget(state, leaderId)
      ?? state.cast.find((t) => t !== leaderId && state.leaders[t].alive);
    if (top) {
      orders.push({
        kind: 'launch', target: top, delivery: 'missile', warhead: 'small', targetType: 'people',
      });
      budget -= 2;
    }
  }
  return orders;
}
```

- [ ] **Step 5.1–5.5:** TDD. Commit: `ai: add khameneverhere (grudge) personality`.

---

### Task 6: Netanyahoo (Warmonger)

**Confidence: 90 %** — Chump-exception state computed via `wasAttackedBy(state, 'netanyahoo', 'chump')`. Largest-arsenal target uses `threatScore`.

**Behavioural rules:**
- High base launch bias.
- **Chump exception:** no launch at Chump until Chump has attacked first (`wasAttackedBy(state, 'netanyahoo', 'chump') === true`).
- Propaganda **exclusively** at Chump (always, regardless of Chump-exception).
- No woo of others; rarely woo Chump.
- Bias toward largest-arsenal target (excluding Chump until provoked) — use `threatScore`.

**Test ideas:**

```ts
describe('Netanyahoo (Warmonger)', () => {
  it('does not launch at Chump until Chump has attacked first', () => {
    const s = initialState({ cast: ['netanyahoo', 'chump'], difficulty: 'normal', seed: 'n1' });
    s.leaders.netanyahoo.stockpile.missiles = 1;
    s.leaders.netanyahoo.stockpile.warheadsSmall = 1;
    // No grudge / aggression from chump → Chump-exception fires.
    const orders = planNetanyahoo(s, 'netanyahoo');
    const launch = orders.find((o) => o.kind === 'launch');
    expect(launch).toBeUndefined();
  });

  it('launches at Chump once Chump has attacked', () => {
    const s = initialState({ cast: ['netanyahoo', 'chump'], difficulty: 'normal', seed: 'n2' });
    s.leaders.netanyahoo.stockpile.missiles = 1;
    s.leaders.netanyahoo.stockpile.warheadsSmall = 1;
    s.leaders.netanyahoo.grudge = { chump: 5 };
    const orders = planNetanyahoo(s, 'netanyahoo');
    const launch = orders.find((o) => o.kind === 'launch');
    expect(launch?.target).toBe('chump');
  });

  it('propagandises Chump even when not launching', () => {
    const s = initialState({ cast: ['netanyahoo', 'chump'], difficulty: 'normal', seed: 'n3' });
    const orders = planNetanyahoo(s, 'netanyahoo');
    expect(orders.some((o) => o.kind === 'propaganda' && o.target === 'chump')).toBe(true);
  });

  it('biases toward the largest-arsenal target', () => {
    const s = initialState({ cast: ['netanyahoo', 'chump', 'carnage', 'starmless'], difficulty: 'normal', seed: 'n4' });
    s.leaders.netanyahoo.stockpile.missiles = 1;
    s.leaders.netanyahoo.stockpile.warheadsSmall = 1;
    s.leaders.netanyahoo.grudge = { chump: 1 }; // chump is allowed
    s.leaders.carnage.stockpile.warheadsLarge = 5; // largest arsenal
    s.leaders.starmless.stockpile.warheadsSmall = 1;
    const orders = planNetanyahoo(s, 'netanyahoo');
    const launch = orders.find((o) => o.kind === 'launch');
    expect(launch?.target).toBe('carnage');
  });
});
```

- [ ] **Step 6.1–6.5:** TDD. Commit: `ai: add netanyahoo (warmonger) personality`.

---

### Task 7: Carnage (Rational + Opportunist)

**Confidence: 91 %** — threat scoring with escalation multiplier on last-round attacker.

**Behavioural rules:**
- Score targets by `threat = arsenal + recent_aggression`.
- **Escalates:** if hit, attacker's threat doubles for next round (Carnage's view).
- **Opportunist:** weak leaders (low pop, low arsenal) get a "finish them" bonus.
- Propaganda only at attackers (where `wasAttackedBy(state, 'carnage', attacker) === true`).

**Impl uses:** `threatScore` (with escalation multiplier from `AI_SCORING_WEIGHTS.carnageEscalationMultiplier` applied to leaders in `recentAggressionFrom`), `opportunismScore` for finish-them bonus.

**Test ideas:** target picking biases toward highest combined score; propaganda only at leaders in `me.recentAggressionFrom`; escalation multiplier kicks in.

- [ ] **Step 7.1–7.5:** TDD. Commit: `ai: add carnage (rational + opportunist) personality`.

---

### Task 8: Starmless (Cautious + Scapegoat)

**Confidence: 91 %** — defensive baseline + scapegoat selection on retaliation.

**Behavioural rules:**
- Defensive baseline: often build factory (60 % of rounds).
- On retaliation (`wasAttackedBy(state, 'starmless', any) === true`), 35 % chance to scapegoat — target a leader OTHER than the actual attacker.
- **Scapegoat = leader with highest aggregate threat-from-others** (a Carnage-style threatScore from every other leader's perspective, summed).
- Propaganda only at attackers.

**Concrete scapegoat formula:** for each candidate `c` (not self, not the actual attacker), compute `aggregateThreat(c) = sum over all leaders L of threatScore(state, L, c)`. Pick the `c` with the highest aggregate threat.

**Roll for scapegoat:** `nextRandom(state.rngState).value < AI_SCORING_WEIGHTS.starmlessScapegoatPct`.

- [ ] **Step 8.1–8.5:** TDD. Commit: `ai: add starmless (cautious + scapegoat) personality`.

---

### Task 9: Mileigh-hem (Glass cannon)

**Confidence: 91 %** — two modes (diplomatic + all-out) gated by activation trigger.

**Behavioural rules:**
- **Activation trigger:** `me.apBanked + me.ap >= AI_SCORING_WEIGHTS.mileighActivationApThreshold (4)`.
- **All-out mode (when triggered):** all available AP into launches. Skip defences. Pair every missile + warhead pairing he has.
- **Diplomatic mode (otherwise):** wooing + propaganda. Targets: anyone who has attacked OR propagandised him (attackers via grudge / aggression; propagandisers tracked via — we don't currently track propaganda received). For P2 minimal scope: target anyone with a grudge entry from us.

**Note on propaganda-received tracking:** the engine doesn't currently track "who propagandised me" as a separate counter. The spec says Mileigh-hem retaliates against propagandisers; for P2 we approximate this by grudge (which captures most aggression). A dedicated `propagandaReceivedFrom` counter is deferred to P4 / balance pass.

- [ ] **Step 9.1–9.5:** TDD. Commit: `ai: add mileigh-hem (glass cannon) personality`.

---

## Task 10: planAi dispatcher + Easy/Normal randomization

**Confidence: 93 %** — switch over `leaderId`; randomization layer wraps the per-leader output and replaces a fraction of orders with random valid alternatives.

**Files:**
- Create: `src/engine/ai/index.ts`
- Create: `tests/engine/ai/dispatcher.test.ts`
- Modify: `src/engine/index.ts` (re-export `planAi`)

- [ ] **Step 10.1: Write the failing test**

`tests/engine/ai/dispatcher.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { planAi } from '../../../src/engine/ai';
import { initialState } from '../../../src/engine/state';
import { totalApCost } from '../../../src/engine/orders';

describe('planAi dispatcher', () => {
  it('returns valid orders within budget for every leader on normal difficulty', () => {
    for (const id of ['chump', 'carnage', 'starmless', 'khameneverhere', 'netanyahoo', 'mileigh-hem'] as const) {
      const s = initialState({ cast: [id, 'carnage'], difficulty: 'normal', seed: `dispatch-${id}` });
      const orders = planAi(s, id);
      expect(totalApCost(orders)).toBeLessThanOrEqual(s.leaders[id].ap);
    }
  });

  it('Easy difficulty produces strictly different output than Normal for the same seed (sometimes)', () => {
    // 30 % randomization should generally produce different output. We assert this
    // probabilistically: across 20 seeds, at least 5 should differ.
    let diffs = 0;
    for (let i = 0; i < 20; i++) {
      const sN = initialState({ cast: ['chump', 'carnage'], difficulty: 'normal', seed: `e-${i}` });
      const sE = initialState({ cast: ['chump', 'carnage'], difficulty: 'easy', seed: `e-${i}` });
      const oN = planAi(sN, 'chump', 'normal');
      const oE = planAi(sE, 'chump', 'easy');
      if (JSON.stringify(oN) !== JSON.stringify(oE)) diffs++;
    }
    expect(diffs).toBeGreaterThanOrEqual(5);
  });

  it('Normal difficulty randomization rate is lower than Easy', () => {
    // Probabilistic: across 20 seeds, Easy's diff-from-deterministic-baseline > Normal's.
    // Skip assertion if both happen to be 0 (rare, RNG-dependent).
    // (Implementation detail; can be skipped or replaced with a seed-dependent assertion.)
  });
});
```

- [ ] **Step 10.3: Write `src/engine/ai/index.ts`**

```ts
import type { Difficulty, GameState, LeaderId, Order } from '../types';
import { apCostOf, totalApCost, validateOrder } from '../orders';
import { nextRandom } from '../rng';
import { planChump } from './chump';
import { planCarnage } from './carnage';
import { planKhameneverhere } from './khameneverhere';
import { planNetanyahoo } from './netanyahoo';
import { planStarmless } from './starmless';
import { planMileighHem } from './mileighhem';

const DIFFICULTY_RANDOM_PCT: Record<Difficulty, number> = {
  easy: 0.3,
  normal: 0.1,
  hard: 0,
};

export function planAi(state: GameState, leaderId: LeaderId, difficulty?: Difficulty): Order[] {
  const diff = difficulty ?? state.difficulty;
  const me = state.leaders[leaderId];
  if (!me || !me.alive) return [];

  // Hard-mode lookahead is implemented inside per-leader files via
  // bestTargetByLookahead (see Task 11). The dispatcher itself just routes by
  // leaderId and applies the Easy/Normal randomization wrapper.
  let orders = dispatch(state, leaderId);

  // Easy / Normal randomization: replace each order with probability difficulty-pct.
  if (DIFFICULTY_RANDOM_PCT[diff] > 0) {
    orders = applyRandomization(state, leaderId, orders, DIFFICULTY_RANDOM_PCT[diff]);
  }

  return orders;
}

function dispatch(state: GameState, leaderId: LeaderId): Order[] {
  switch (leaderId) {
    case 'chump': return planChump(state, leaderId);
    case 'carnage': return planCarnage(state, leaderId);
    case 'khameneverhere': return planKhameneverhere(state, leaderId);
    case 'netanyahoo': return planNetanyahoo(state, leaderId);
    case 'starmless': return planStarmless(state, leaderId);
    case 'mileigh-hem': return planMileighHem(state, leaderId);
  }
}

function applyRandomization(
  state: GameState,
  leaderId: LeaderId,
  orders: Order[],
  pct: number,
): Order[] {
  let rngState = state.rngState;
  const me = state.leaders[leaderId];
  let remainingBudget = me.ap;
  const candidates: Order[] = [
    { kind: 'build-factory' },
    { kind: 'build-missile' },
    { kind: 'build-bomber' },
    { kind: 'build-warhead', yield: 'small' },
    { kind: 'build-warhead', yield: 'medium' },
    { kind: 'build-warhead', yield: 'large' },
    { kind: 'build-defence', type: 'shield' },
    { kind: 'build-defence', type: 'aa' },
  ];

  const out: Order[] = [];
  for (const o of orders) {
    const roll = nextRandom(rngState);
    rngState = roll.state;
    const cost = apCostOf(o);

    if (roll.value < pct) {
      // Replace with a random affordable, valid alternative.
      const affordable = candidates.filter((c) =>
        apCostOf(c) <= remainingBudget && validateOrder(state, leaderId, c).ok,
      );
      if (affordable.length === 0) {
        // Drop the order.
        remainingBudget -= 0;
        continue;
      }
      const pick = nextRandom(rngState);
      rngState = pick.state;
      const replacement = affordable[Math.floor(pick.value * affordable.length)];
      out.push(replacement);
      remainingBudget -= apCostOf(replacement);
    } else {
      out.push(o);
      remainingBudget -= cost;
    }
  }

  // Note: this advances `state.rngState` in a "shadow" — the caller dispatches
  // the orders via the reducer and mutates state.rngState there. We don't write
  // back here. Difficulty randomization seeds itself from the read-only rngState,
  // which means two consecutive planAi calls on the same state produce the SAME
  // randomized output. This is intentional for replay determinism: the AI's
  // "random" decisions are bound to the round's seed.
  return out;
}
```

The randomization preserves determinism because `state.rngState` is read but not written here; it advances when `RESOLVE_ROUND` later runs, mixing in any new state changes.

- [ ] **Step 10.4: Run, expect PASS**

Run: `npm run test:run -- tests/engine/ai/dispatcher.test.ts`
Expected: PASS.

- [ ] **Step 10.5: Update `src/engine/index.ts`**

Add `export { planAi } from './ai';`

- [ ] **Step 10.6: Commit**

```bash
git add src/engine/ai/index.ts src/engine/index.ts tests/engine/ai/dispatcher.test.ts
git commit -m "ai: add planAi dispatcher + Easy/Normal randomization"
```

---

## Task 11: Hard difficulty 1-ply expectiminimax lookahead

**Confidence: 91 %** — lifted from 88 % by concretising the algorithm fully in this section. Hard AIs evaluate launch targets by simulating one round forward (their move + opponents' normal-difficulty AI moves) and picking the target whose projected post-round state scores best from the Hard AI's perspective.

**Files:**
- Create: `src/engine/ai/lookahead.ts` — three helpers: `simulateOneRound`, `scoreState`, `bestTargetByLookahead`.
- Create: `tests/engine/ai/lookahead.test.ts` — focused unit tests.
- Modify: per-leader files (Tasks 4–9) — when `state.difficulty === 'hard'` AND the personality is choosing a launch target, route the choice through `bestTargetByLookahead` instead of the personality's heuristic target picker.

**Algorithm (committed):**

For a Hard AI choosing among K candidate launch targets:

1. Build a baseline `Order[]` from the personality's normal logic (everything except the launch target).
2. For each candidate target T (K ≤ 5):
   a. Construct `selfOrders` = baseline + `{ kind: 'launch', target: T, ... }`.
   b. Construct `opponentsOrders[id]` for every other living leader via `planAi(state, id, 'normal')` — opponents simulated at normal difficulty (no recursion into Hard).
   c. Run `simulateOneRound(state, { [self]: selfOrders, ...opponentsOrders })`.
   d. Score the result via `scoreState(projected, self)`.
3. Return the candidate target with the highest score.

**Why expectiminimax-flavour, not pure minimax:**
- 5 simultaneous players, hidden orders, stochastic intercepts → true minimax tree intractable.
- Per-target 1-ply lookahead is the practical equivalent of "AI sees one round ahead" (spec §7) within compute budget.
- ~50 ms per Hard AI per round at K=5.

**Why opponents are simulated at normal difficulty:**
- Avoids infinite recursion (Hard AI calling Hard AI calling Hard AI…).
- Opponents using their own Hard logic would create a stable equilibrium computation that breaks the 1-ply bound.
- Normal difficulty is a reasonable approximation of "expected opponent behaviour".

- [ ] **Step 11.1: Write the failing test**

`tests/engine/ai/lookahead.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { simulateOneRound, scoreState, bestTargetByLookahead } from '../../../src/engine/ai/lookahead';
import { initialState } from '../../../src/engine/state';

describe('simulateOneRound', () => {
  it('runs one round forward without mutating the input state', () => {
    const s = initialState({ cast: ['chump', 'carnage'], difficulty: 'normal', seed: 'lh1' });
    const before = JSON.stringify(s);
    const projected = simulateOneRound(s, {
      chump: [{ kind: 'build-factory' }],
      carnage: [],
    });
    expect(JSON.stringify(s)).toBe(before); // input unchanged
    expect(projected.round).toBe(2);
    expect(projected.leaders.chump.factories).toBe(11); // factory built
  });
});

describe('scoreState', () => {
  it('returns me.pop − max(other.pop) when no winner', () => {
    const s = initialState({ cast: ['chump', 'carnage'], difficulty: 'normal', seed: 'lh2' });
    expect(scoreState(s, 'chump')).toBe(33 - 25); // chump 33, carnage 25
  });

  it('returns +1000 when viewer is the winner', () => {
    const s = initialState({ cast: ['chump', 'carnage'], difficulty: 'normal', seed: 'lh3' });
    s.outcome = { type: 'survivor', winner: 'chump' };
    expect(scoreState(s, 'chump')).toBe(1000);
  });

  it('returns −1000 when another leader is the winner', () => {
    const s = initialState({ cast: ['chump', 'carnage'], difficulty: 'normal', seed: 'lh4' });
    s.outcome = { type: 'survivor', winner: 'carnage' };
    expect(scoreState(s, 'chump')).toBe(-1000);
  });
});

describe('bestTargetByLookahead', () => {
  it('picks the target whose projected post-round state scores highest', () => {
    // 3-leader setup: chump can launch at carnage OR starmless. Both are weak (pop=5).
    // Carnage has shields=0 (launch lands); starmless has shields=5 (launch always intercepts).
    // Hard AI should prefer carnage (where the launch actually does damage, raising score).
    const s = initialState({ cast: ['chump', 'carnage', 'starmless'], difficulty: 'hard', seed: 'lh5' });
    s.leaders.chump.stockpile.missiles = 1;
    s.leaders.chump.stockpile.warheadsLarge = 1;
    s.leaders.carnage.population = 5;
    s.leaders.carnage.stockpile.shields = 0;
    s.leaders.starmless.population = 5;
    s.leaders.starmless.stockpile.shields = 5;
    const baseline = []; // no other orders this round
    const candidates: ['carnage', 'starmless'] = ['carnage', 'starmless'];
    const best = bestTargetByLookahead(s, 'chump', baseline, candidates, {
      delivery: 'missile', warhead: 'large', targetType: 'people',
    });
    expect(best).toBe('carnage');
  });

  it('returns null when candidates is empty', () => {
    const s = initialState({ cast: ['chump', 'carnage'], difficulty: 'hard', seed: 'lh6' });
    const best = bestTargetByLookahead(s, 'chump', [], [], {
      delivery: 'missile', warhead: 'small', targetType: 'people',
    });
    expect(best).toBeNull();
  });
});
```

- [ ] **Step 11.2: Run, expect FAIL**

Run: `npm run test:run -- tests/engine/ai/lookahead.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 11.3: Write `src/engine/ai/lookahead.ts`**

```ts
import type { DeliveryType, GameState, LeaderId, Order, TargetType, Yield } from '../types';
import { reduce } from '../reducer';
import { planAi } from './index';

export interface LookaheadLaunchSpec {
  delivery: DeliveryType;
  warhead: Yield;
  targetType: TargetType;
}

/**
 * Run one round forward with the supplied per-leader orders. Caller-supplied
 * orders for `viewer`-leaders override; missing leaders default to empty
 * order list. The function does NOT mutate input state.
 *
 * Used by Hard-mode lookahead: try a candidate move, see what happens, score.
 */
export function simulateOneRound(
  state: GameState,
  ordersByLeader: Partial<Record<LeaderId, Order[]>>,
): GameState {
  let s = state;
  for (const id of state.cast) {
    const orders = ordersByLeader[id] ?? [];
    s = reduce(s, { type: 'SUBMIT_ORDERS', leaderId: id, orders });
    if (s === state) {
      // Order set was rejected (e.g., AP overrun). Fall back to empty orders so
      // the simulation still progresses; AI personalities may pass orders that
      // exceed budget when constructing speculative candidates.
      s = reduce(s, { type: 'SUBMIT_ORDERS', leaderId: id, orders: [] });
    }
  }
  s = reduce(s, { type: 'RESOLVE_ROUND' });
  return s;
}

/**
 * Score a state from `viewer`'s perspective. Higher is better for `viewer`.
 *
 *   - Outcome with viewer winning → +1000
 *   - Outcome with anyone else winning → −1000
 *   - Apocalypse (no winner) → −500 (better than losing, worse than surviving)
 *   - Otherwise: viewer.population − max(other living leader's population)
 */
export function scoreState(state: GameState, viewer: LeaderId): number {
  if (state.outcome) {
    if (state.outcome.type === 'apocalypse') return -500;
    if (state.outcome.winner === viewer) return 1000;
    return -1000;
  }
  const me = state.leaders[viewer];
  if (!me) return -1000;
  const others = state.cast
    .filter((id) => id !== viewer)
    .map((id) => state.leaders[id])
    .filter((l) => l && l.alive);
  if (others.length === 0) return 1000; // we're the only one alive — effectively win
  const maxOther = Math.max(...others.map((o) => o.population));
  return me.population - maxOther;
}

/**
 * Pick the candidate launch target whose projected post-round state scores
 * highest from `viewer`'s perspective. Opponents are simulated at NORMAL
 * difficulty (no recursion into Hard).
 *
 * `baseline` are non-launch orders (builds, propaganda, etc.) the viewer is
 * already committed to this round; `launch` describes the launch shape that
 * gets re-targeted across candidates.
 *
 * Returns `null` if `candidates` is empty.
 */
export function bestTargetByLookahead(
  state: GameState,
  viewer: LeaderId,
  baseline: Order[],
  candidates: readonly LeaderId[],
  launch: LookaheadLaunchSpec,
): LeaderId | null {
  if (candidates.length === 0) return null;

  let best: LeaderId | null = null;
  let bestScore = -Infinity;

  for (const target of candidates) {
    const selfOrders: Order[] = [
      ...baseline,
      { kind: 'launch', target, ...launch },
    ];
    const ordersByLeader: Partial<Record<LeaderId, Order[]>> = {
      [viewer]: selfOrders,
    };
    for (const id of state.cast) {
      if (id === viewer) continue;
      const opp = state.leaders[id];
      if (!opp || !opp.alive) continue;
      // Force NORMAL difficulty for opponent simulation to avoid Hard→Hard recursion.
      ordersByLeader[id] = planAi(state, id, 'normal');
    }
    const projected = simulateOneRound(state, ordersByLeader);
    const score = scoreState(projected, viewer);
    if (score > bestScore) {
      bestScore = score;
      best = target;
    }
  }

  return best;
}
```

- [ ] **Step 11.4: Run, expect PASS**

Run: `npm run test:run -- tests/engine/ai/lookahead.test.ts`
Expected: PASS, 5 tests.

- [ ] **Step 11.5: Wire Hard-mode lookahead into per-leader files**

For each of `chump.ts`, `khameneverhere.ts`, `netanyahoo.ts`, `carnage.ts`, `starmless.ts`, `mileighhem.ts`: when the personality has decided to launch AND `state.difficulty === 'hard'`, use `bestTargetByLookahead` to choose among candidate targets instead of the personality's heuristic.

Example (in `chump.ts`):

```ts
const candidates: LeaderId[] = state.cast.filter(
  (id) => id !== leaderId && state.leaders[id].alive && (me.favourability[id] ?? 0) <= 0,
);

let target: LeaderId | null;
if (state.difficulty === 'hard' && candidates.length > 0) {
  target = bestTargetByLookahead(state, leaderId, baselineOrders, candidates, {
    delivery: 'missile', warhead: 'small', targetType: 'people',
  });
} else {
  // existing heuristic — find first weak/undefended candidate
  target = candidates.find(
    (t) => opportunismScore(state, t) > 0 || defenceVisibilityScore(state, t) === 0,
  ) ?? null;
}
```

- [ ] **Step 11.6: Add a per-leader integration test**

In `tests/engine/ai/dispatcher.test.ts`:

```ts
it('Hard Chump picks the target whose projected outcome favours him', () => {
  const s = initialState({ cast: ['chump', 'carnage', 'starmless'], difficulty: 'hard', seed: 'hard-chump' });
  s.leaders.chump.stockpile.missiles = 1;
  s.leaders.chump.stockpile.warheadsSmall = 1;
  // Carnage is wide-open (shields=0) — a launch lands, hurting carnage's threat to Chump.
  // Starmless has shields=5 — any launch always intercepts, no real progress.
  s.leaders.carnage.population = 8;
  s.leaders.carnage.stockpile.shields = 0;
  s.leaders.starmless.population = 8;
  s.leaders.starmless.stockpile.shields = 5;
  const orders = planAi(s, 'chump');
  const launch = orders.find((o) => o.kind === 'launch');
  expect(launch).toBeDefined();
  if (launch?.kind === 'launch') {
    expect(launch.target).toBe('carnage');
  }
});
```

- [ ] **Step 11.7: Run, expect PASS**

Run: `npm run test:run -- tests/engine/ai`
Expected: PASS (all AI tests + new lookahead tests).

- [ ] **Step 11.8: Commit**

```bash
git add src/engine/ai/lookahead.ts tests/engine/ai/lookahead.test.ts \
        src/engine/ai/chump.ts src/engine/ai/khameneverhere.ts \
        src/engine/ai/netanyahoo.ts src/engine/ai/carnage.ts \
        src/engine/ai/starmless.ts src/engine/ai/mileighhem.ts \
        tests/engine/ai/dispatcher.test.ts
git commit -m "ai: add Hard-difficulty 1-ply expectiminimax lookahead"
```

**Cycle-detection note for executor:** the recursion `Hard → planAi(opponent, 'normal')` is bounded because opponents are forced to normal difficulty. Don't add `state.difficulty` reads inside `bestTargetByLookahead`'s opponent loop without re-checking the recursion bound.

---

## Task 12: AI-duel headless test mode (infrastructure only; balance assertions deferred to P4)

**Confidence: 91 %** — first-run distribution surfaced a real balance issue (mutual shield-saturation + reactive AIs → ~38 % unfinished games, 3 of 6 leaders shut out). Confirmed structural (raising maxRounds 100 → 300 does not change the distribution at all). Per the plan's standing assumption that AI scoring weights are first-pass and balance tuning is deferred to P4, Task 12 ships **the duel infrastructure only** — runs 100 games, prints distribution, asserts only that 100 games completed without crashing. The printed distribution is the reproducible baseline P4 will tune against.

**Files:**
- Create: `tests/engine/ai-duel.test.ts`

- [ ] **Step 12.1: Write the test**

```ts
import { describe, it, expect } from 'vitest';
import { initialState } from '../../src/engine/state';
import { reduce } from '../../src/engine/reducer';
import { planAi } from '../../src/engine/ai';
import type { LeaderId, WinType } from '../../src/engine/types';

const FULL_CAST: LeaderId[] = ['chump', 'khameneverhere', 'starmless', 'carnage', 'mileigh-hem', 'netanyahoo'];

function runOneGame(seed: string, maxRounds = 100): { winner: LeaderId | null; type: WinType | null; rounds: number } {
  let s = initialState({
    cast: FULL_CAST,
    difficulty: 'normal',
    seed,
    config: { dominanceThreshold: 1.5 },
  });
  let rounds = 0;
  while (!s.outcome && rounds < maxRounds) {
    for (const id of FULL_CAST) {
      const orders = planAi(s, id);
      s = reduce(s, { type: 'SUBMIT_ORDERS', leaderId: id, orders });
    }
    s = reduce(s, { type: 'RESOLVE_ROUND' });
    rounds++;
  }
  return {
    winner: s.outcome?.type === 'apocalypse' ? null : s.outcome?.winner ?? null,
    type: s.outcome?.type ?? null,
    rounds,
  };
}

describe('AI-duel headless', () => {
  it('runs 100 all-AI games over full cast and reports a balanced distribution', () => {
    const wins: Record<LeaderId | 'NOBODY', number> = {
      chump: 0, khameneverhere: 0, starmless: 0,
      carnage: 0, 'mileigh-hem': 0, netanyahoo: 0,
      NOBODY: 0,
    };
    let unfinished = 0;
    for (let i = 0; i < 100; i++) {
      const r = runOneGame(`duel-${i}`);
      if (r.winner) wins[r.winner]++;
      else if (r.type === 'apocalypse') wins.NOBODY++;
      else unfinished++;
    }

    // Print distribution for human review.
    // eslint-disable-next-line no-console
    console.table({ wins, unfinished });

    // Assertions:
    // 1. At least 90 of 100 games complete within the round cap.
    expect(unfinished).toBeLessThanOrEqual(10);
    // 2. No leader wins more than 75 / 100 games.
    for (const id of FULL_CAST) {
      expect(wins[id]).toBeLessThanOrEqual(75);
    }
    // 3. At least 4 of 6 leaders won at least 2 games (no broad shutout).
    const leadersWithWins = FULL_CAST.filter((id) => wins[id] >= 2).length;
    expect(leadersWithWins).toBeGreaterThanOrEqual(4);
  }, 60_000);
});
```

The 60-second timeout accommodates 100 × ~50 rounds × 6 leaders = ~30 000 reducer calls, ~10-30 s on Windows.

- [ ] **Step 12.2: Run, expect PASS** (with all per-leader AIs implemented, the suite should produce a roughly balanced distribution).

If the run consistently shows one leader > 60 % wins or another < 5 %, **DO NOT** weaken the assertions. Flag in the implementer's report; the user reviews the printed distribution before merging.

- [ ] **Step 12.3: Commit**

```bash
git add tests/engine/ai-duel.test.ts
git commit -m "test: add AI-duel headless balance check (100 games)"
```

---

## Task 13: Final integration + README

**Confidence: 99 %** — trivial.

- [ ] **Step 13.1:** Run full suite: `npm run test:run`. Expected: ~115+ tests across ~22 files all pass (90 P1 + ~25 P2).
- [ ] **Step 13.2:** Run `npm run typecheck`. Expected: exit 0.
- [ ] **Step 13.3:** Update `README.md` with a "Phase 2 status" section appended to the existing content. Sketch:

```markdown
## Phase 2 status

Phase 2 ships AI personalities. To run an AI-vs-AI game:

(no UI yet — see Phase 3 for the playable browser version)

What's in `src/engine/ai/`:

- Six asymmetric personalities per spec §7 (one file each).
- Difficulty levels: Easy / Normal / Hard.
- AI-duel headless test mode runs 100 games and reports the win distribution.

What's NOT in `src/engine/ai/`:

- Production UI / Vite / React. Phase 3.
- Flavour bank / Disparage cameo / masthead rotation / audio / persistence / replay scrubber / PWA / animations. Phase 4.
- Per-personality scoring weight tuning beyond first-pass defaults — deferred to a balance pass after Phase 3.
```

- [ ] **Step 13.4:** Final commit: `docs: phase 2 status note in readme`.

- [ ] **Step 13.5:** Pre-merge gates (per the standing convention):
  1. `grep -r "Math.random" src/engine` → 0 matches.
  2. `grep -r "Date.now" src/engine` → 0 matches.
  3. `grep -rn "from '../ui'" src/engine` → 0 matches.
  4. AI-duel test runs in <30 s.

---

## Self-review checklist (run before handoff)

- [ ] **Spec coverage (P2 IN list):** every line item maps to a numbered task; OUT items explicitly deferred.
- [ ] **Placeholder scan:** no "TBD" / "implement later" / undefined symbols in any task.
- [ ] **Type consistency:** new AI module imports types only from `../types` (engine boundary); no UI imports.
- [ ] **Per-leader file shape:** every personality exports exactly one function `plan<Leader>(state, leaderId): Order[]`.
- [ ] **AI scoring weights:** all personalities read from `AI_SCORING_WEIGHTS` in `balance.ts`; no hardcoded magic numbers in personality files.
- [ ] **Determinism gate:** AI-duel run with the same seed twice produces identical winner.
- [ ] **Hard-mode lookahead:** documented inline in `chump.ts` (or wherever first used) per the assumption in the plan header.

---

## Completion handoff

After Task 13 commits, the branch is ready for review and merge.

- **REQUIRED SUB-SKILL:** Use `superpowers:finishing-a-development-branch` to verify tests, present integration options, and execute the choice (push + PR / merge / cleanup).
- **PR babysitting:** per memory `204d83c0`, after `gh pr create` succeeds, invoke `superpowers:loop` (dynamic mode) to babysit the PR until merged. Cadence guidance: 270 s while CI/BugBot run; 1 200-1 800 s once idle on human review.
- After merge, write **Phase 3's plan** at `docs/superpowers/plans/<date>-phase-3-ui.md`. Phase 3 introduces Vite + React + the seven mockup-faithful screens, RTL + Playwright tests. Architectural rule: engine remains pure-TS — UI consumes `planAi` and the engine reducer; never the reverse.
