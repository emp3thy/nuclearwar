# Phase 4c slice 2 — AI aggression rework + elimination-only endings design spec

**Date:** 2026-05-16
**Status:** drafted from playtesting brainstorming session; pending user review
**Source of feedback:** playtesting after P4c slice 1 merge (PR #8, commit `d8382f7`). User notes captured in conversation: Netanyahoo (warmonger) fired zero shots all game; Carnage barely fired; Starmless never finishes off weakened opponents; the game ended with a living loser (player at 3M population vs Starmless at 23M). "Not much of a nuclear war if nobody is actually firing nukes. People need to be more aggressive."

---

## 1. Overview

Playtesting revealed the AI cast does not fight. Investigation of all six planners, the order validator, and the win conditions showed this is **structural, not a tuning miss**:

- **Netanyahoo never fires (hard bug).** His build loop is `while (remaining >= 1) build-missile`. `build-missile` is uncapped in `validateOrder` (always `ok`), so the loop consumes his entire build budget every round. The warhead-build loop below it never executes. He stockpiles missiles forever but never builds a warhead, so `canLaunch` (which requires `warheadsSmall >= 1`) is never satisfied. The warmonger cannot arm a single missile.
- **Mileigh-hem never fires (hard bug).** `planMileighHem` has no build logic at all — both its modes only spend existing stockpile. Every leader starts with an empty stockpile, so Mileigh-hem never acquires a weapon.
- **Starmless has no kill instinct.** `launchTarget` is only assigned inside `if (isRetaliationRound)`. If never attacked, Starmless never fires — even at an opponent he could trivially finish.
- **The firing AIs are throttled.** Carnage, Khameneverhere, and Chump each reserve exactly one launch per round and only ever build/launch `small` warheads (2 deaths). Eliminating an 18–33M leader needs 9–16 hits; at one hit per round, nobody dies before the game ends.
- **Games end with a living loser.** `checkOutcome`'s dominance rule ends the game when the leading population is `>= dominanceThreshold * runner-up` (default `2`). Starmless 23M vs player 3M → `23 >= 2*3` → instant dominance win while the loser is still alive.

This slice repairs the two broken planners, gives Starmless a kill instinct, raises the whole cast's firing rate (volume **and** yield), and removes the dominance rule so games end by elimination.

Phase order: **P3 ✓ → P4a ✓ → P4b ✓ → P4c.1 ✓ → P4c.2 (this slice) → P4c.3+ → P5**.

### 1.1 Decisions locked during brainstorming

| Decision | Choice |
|---|---|
| Win condition | **Elimination only.** Remove the dominance rule. Games end on survivor / apocalypse / pyrrhic. |
| Aggression model | **Volume + yield.** AIs fire multiple launches per round and build/launch medium and large warheads. |
| Personalities | **Keep the spectrum.** Distinct aggression levels preserved; Starmless and Chump stay defensive but gain a kill instinct. |
| Duel test | **Termination assertion only.** Assert every seeded game reaches an outcome within a round cap. No win-share assertion. |
| Architecture | **Approach B** — two shared helpers (`buildToward`, `launchSalvo`) + per-planner tuning. |

---

## 2. Scope

### 2.1 Win condition — elimination only

`checkOutcome` (`src/engine/winConditions.ts`) keeps three endings and drops one:

- **Survivor** — exactly one leader alive. Kept.
- **Apocalypse** — nobody alive, nobody had population at round start. Kept.
- **Pyrrhic** — nobody alive, but someone had population at round start. Kept.
- **Dominance** — leading population `>= threshold * runner-up`. **Removed.**

Dead-code cleanup that follows from the removal:

- `DOMINANCE_THRESHOLD_DEFAULT` constant — removed from `src/engine/balance.ts`.
- `dominanceThreshold` field — removed from `GameConfig` in `src/engine/types.ts`.
- The `dominanceThreshold` wiring in `initialState` (`src/engine/state.ts`) — removed.

The implementation plan must grep the UI layer (`src/ui/**`) for `dominanceThreshold` / `dominance` before deleting and confirm no consumer reads it. If a UI consumer exists, the plan adjusts it; the spec assumption is that none does (dominance outcomes render through the generic `WinOutcome` discriminated union, which keeps its `dominance` variant only if still referenced — see §4).

There is **no in-game round cap.** Elimination-only means a game runs until `checkOutcome` returns non-null. The duel test's round cap (§5.3) is a test tripwire, not a game rule.

### 2.2 Shared helpers — `src/engine/ai/aggression.ts` (new file)

Two pure functions, no React, deterministic (no RNG unless explicitly threaded). They are the Approach-B core: the mechanical build/launch work lifted out of the six planners so it is written and tested once.

#### 2.2.1 `buildToward`

```ts
export type BuildItem =
  | { item: 'factory' }
  | { item: 'missile' }
  | { item: 'bomber' }
  | { item: 'warhead'; yield: Yield }
  | { item: 'defence'; type: 'shield' | 'aa' };

export interface BuildPlanEntry {
  build: BuildItem;
  /** Build up to this many TOTAL (current stockpile + queued). */
  target: number;
}

export interface BuildResult {
  orders: Order[];
  apSpent: number;
}

export function buildToward(
  state: GameState,
  leaderId: LeaderId,
  plan: BuildPlanEntry[],
  budget: number,
): BuildResult;
```

Behaviour: walk `plan` in order. For each entry, while the leader's current count of that item (counting current stockpile **plus** orders already queued by this call) is below `target` AND `budget` covers the item's AP cost AND `validateOrder` passes, emit the build order and decrement budget. Move to the next entry when the target is met or the budget cannot afford the item. Return the emitted orders and total AP spent.

The `target` cap is what **structurally prevents Netanyahoo's runaway loop** — an unbounded `while` is no longer expressible through this helper.

Count semantics per `BuildItem`:
- `factory` → `leader.factories`
- `missile` → `stockpile.missiles`
- `bomber` → `stockpile.bombers`
- `warhead` of yield Y → `stockpile.warheads{Small,Medium,Large}` for Y
- `defence` shield/aa → `stockpile.shields` / `stockpile.aa`

`buildToward` only emits **build** orders (`build-factory`, `build-missile`, `build-bomber`, `build-warhead`, `build-defence`). It never emits `deploy-defence` — deployment stays in the planners that want it (Starmless, Chump), since it consumes stockpile rather than adding to it.

#### 2.2.2 `launchSalvo`

```ts
export interface LaunchSalvoOpts {
  /** AP available for launches this round. */
  budget: number;
  /** Targets ranked best-first. Must be alive, non-self. */
  rankedTargets: LeaderId[];
  /** Hard cap on launches emitted. Omit for no cap (fire until out of AP/ammo). */
  maxLaunches?: number;
  /** false (default) = focus-fire rankedTargets[0]; true = cycle through rankedTargets. */
  spread?: boolean;
  /** Per-target targetType selector. Default: () => 'people'. */
  targetTypeFor?: (target: LeaderId) => 'people' | 'infra';
}

export interface SalvoResult {
  orders: Order[];
  apSpent: number;
}

export function launchSalvo(
  state: GameState,
  leaderId: LeaderId,
  opts: LaunchSalvoOpts,
): SalvoResult;
```

Behaviour: pair available delivery vehicles with available warheads, **largest yield first** (`large → medium → small`), and emit `launch` orders until any of: `budget` cannot cover `LAUNCH_COST` (2 AP), no delivery+warhead pair remains, `maxLaunches` reached, or `rankedTargets` is empty.

- **Delivery preference:** bomber if `stockpile.bombers >= 1`, else missile. (Bombers are reusable post-P4c.1, so they are the better asset.)
- **Targeting:** `spread === false` (default) sends every launch at `rankedTargets[0]` — concentrate damage to push one leader to 0. `spread === true` cycles `rankedTargets[i % rankedTargets.length]`.
- **Validation:** each launch is validated against a **projected** stockpile (mirroring `validateOrderSequence`'s projection — delivery and warhead decremented per emitted launch) so the salvo never emits more launches than the leader can actually arm.
- `targetTypeFor` defaults to `'people'`.

`launchSalvo` does not pick targets — the planner supplies `rankedTargets` from its personality scoring. This keeps target selection per-personality.

### 2.3 Per-planner rework

Every planner adopts the same shape: **rank targets (personality scoring) → split AP between build and launch → `buildToward` for builds → `launchSalvo` for launches.** Personality is expressed through three per-planner choices, kept as local constants/logic in each planner file (not a global table — Approach B, not C):

1. **Target ranking** — which scoring function orders `rankedTargets`.
2. **Build plan** — the `BuildPlanEntry[]` passed to `buildToward`, including the yield ramp.
3. **AP split + launch cap** — how much AP is reserved for launching vs building, and `maxLaunches`.

Aggression spectrum, hardest-hitting first:

#### Netanyahoo — Warmonger (hardest)

- **Bug fixed.** Missile builds are capped through `buildToward`; the runaway loop is gone.
- **Build plan:** ramp into yield — missiles + small warheads to a baseline, then medium, then large. Example plan: `[{missile, target: 6}, {warhead small, target: 4}, {warhead medium, target: 3}, {warhead large, target: 2}]`. Exact targets tuned during implementation.
- **AP split:** thin build reserve; nearly all AP to `launchSalvo` with **no `maxLaunches` cap** (fire everything armed).
- **Targeting:** focus-fire highest `threatScore`. **Chump-exception preserved** — no launch at Chump until `wasAttackedBy(state, 'netanyahoo', 'chump')`.
- **Propaganda:** exclusively at Chump, unchanged.

#### Khameneverhere — Grudge (very aggressive)

- Existing capped 3+3 build pattern becomes a `buildToward` plan with raised targets and medium warheads added.
- `launchSalvo` focus-fires the **top grudge target** (`topGrudgeTarget`, fallback: first living non-self leader). High `maxLaunches`.

#### Mileigh-hem — Glass cannon (aggressive, swingy)

- **Bug fixed.** Gains build logic via `buildToward`.
- Keeps the two-mode identity gated on `mileighActivationApThreshold`:
  - **Activated:** `buildToward` a cheap fast stockpile (small/medium warheads, minimal/no defence) + `launchSalvo` with `spread: true` (all-out, cycles targets).
  - **Not activated:** diplomatic mode (woo + propaganda) unchanged.

#### Carnage — Rational + Opportunist (aggressive-rational)

- Keeps the P4c.1 bomber bias (build a bomber when none owned; bomber-preferred delivery — `launchSalvo` already prefers bombers).
- `buildToward` bombers + a warhead mix; `launchSalvo` focus-fires the top `threat + opportunism` combined score. Moderate `maxLaunches`.
- Escalation multiplier and attacker-propaganda logic unchanged.

#### Starmless — Cautious + Scapegoat (defensive, new kill instinct)

- **New opportunism path.** A launch target is now chosen when **either**: it is a retaliation round (existing), **or** a finishable opponent exists — an opponent whose population is below a finish threshold (`STARMLESS_FINISH_POP_M`, tuned during implementation; ~8M is the working value). When both apply, retaliation takes precedence for target choice; the scapegoat roll still applies on retaliation rounds.
- Otherwise: defensive building (factories, then defence) as today.
- **Low `maxLaunches`** (1–2). Starmless still builds and defends — he does not barrage.
- Scapegoat roll (`starmlessScapegoatPct`) preserved.

#### Chump — Coward (defensive, opportunistic)

- Existing opportunism-launch path (`opportunismScore > 0 || defenceVisibilityScore === 0`) is routed through `launchSalvo` with a **low `maxLaunches`**.
- Heavy build-defence + propaganda, and the wooing-suppression rule (never launch at a leader with `favourability[t] > 0`), preserved.
- Infra-vs-people targeting preserved via `targetTypeFor`.

Approximate launches/round when armed: **Netanyahoo / Mileigh-hem(all-out) > Khameneverhere > Carnage > Starmless / Chump.**

---

## 3. Round flow

**Unchanged.** `resolveRound`'s phase order (defences → builds → propaganda → wooing → launches → elimination → final retaliation) is untouched. AIs simply emit more `launch` orders and a wider yield mix. The launch phase already handles arbitrary launch counts.

---

## 4. Engine schema changes

- **Removed:** `GameConfig.dominanceThreshold` (`src/engine/types.ts`).
- **`WinOutcome`:** the `dominance` variant of the `WinOutcome` discriminated union is **removed** if and only if no consumer (UI or tests) still references it after the dominance rule is gone. The plan verifies this. If a UI surface displays outcome text by variant, removing the variant is a typed change the compiler will enforce — acceptable.
- No new event kinds. No `Leader` or `Stockpile` field changes. No `Order` shape changes.
- `src/engine/ai/aggression.ts` is a new module; its exported types (`BuildItem`, `BuildPlanEntry`, `BuildResult`, `LaunchSalvoOpts`, `SalvoResult`) are AI-layer types, not engine-state types.

---

## 5. Testing

P4c.1 baseline: 255 tests. This slice adds helper tests, per-planner behavioural tests, and the duel termination assertion; it removes the dominance win-condition tests. Net count is set by the implementation plan. Engine TDD strict.

### 5.1 Helper tests — `tests/engine/ai/aggression.test.ts` (new)

`buildToward`:
- Builds each plan entry up to its `target` and no further (cap respected).
- Walks entries in priority order; stops at budget exhaustion mid-plan.
- Counts already-queued orders toward the target (no over-build within one call).
- Emits nothing when budget is below the cheapest item's cost.

`launchSalvo`:
- Pairs largest-yield-first (large before medium before small).
- Honours `maxLaunches`; omitting it fires until AP/ammo exhausted.
- `spread: false` focus-fires `rankedTargets[0]`; `spread: true` cycles targets.
- Prefers bomber delivery when a bomber is in stockpile; falls back to missile.
- Never emits more launches than the projected stockpile can arm.
- Empty `rankedTargets` → no orders.

### 5.2 Per-planner tests — `tests/engine/ai/*.test.ts` (6 suites updated)

Reworked assertions plus new behavioural tests for the headline fixes:
- **Netanyahoo** actually emits `launch` orders once armed (the bug-fix regression). Still builds missiles, never bombers (P4c.1 regression kept).
- **Mileigh-hem** emits `build-*` orders, then `launch` orders, in activated mode.
- **Starmless** emits a `launch` at a finishable (low-population) opponent with no prior attack on him.
- **Carnage / Khameneverhere / Chump** emit multi-launch salvos when AP and stockpile allow; caps respected.

### 5.3 Duel test — `tests/engine/ai-duel.test.ts`

Replace the "no crash" assertion with a **termination assertion**: run N seeded six-AI games; assert each reaches `outcome !== null` within a round cap (~60 rounds — generous headroom). No win-share assertion (per brainstorming decision — win-share is subjective and would churn with every tweak). If the assertion fires, that is a balance bug to fix within this slice, not a cap to add to the game.

### 5.4 Win-condition tests — `tests/engine/winConditions.test.ts`

Remove the dominance cases. Keep survivor / apocalypse / pyrrhic cases.

### 5.5 What is NOT tested

- Exact AI-duel win distribution (deferred — subjective, no assertion per decision).
- UI behaviour — no UI changes in this slice.
- Approach B/C lookahead — out of scope (§7).

---

## 6. Assumptions (3 buckets)

### 6.1 Real concerns

1. **Game termination under elimination-only.** Removing dominance plus raising aggression should make mutual destruction fast and certain — but a pathological all-defence stall is theoretically possible. Mitigation: the duel termination assertion (§5.3) is the tripwire; the defence AP economy (`build-defence` 4 + `deploy-defence` 4 = 8 AP per intercept-capable unit) makes out-defending sustained large-warhead salvos economically impossible, so a true stall is not expected. If the assertion fires, balance tuning is part of this slice.
2. **`WinOutcome.dominance` variant removal.** If a UI surface switches on the outcome variant, removing `dominance` is a compiler-enforced change. The plan verifies the UI before deciding to remove the variant vs leave it unreferenced.

### 6.2 Verified safe

1. **Engine purity preserved** — `src/engine/ai/aggression.ts` imports no React.
2. **Determinism preserved** — `buildToward` and `launchSalvo` are deterministic; no new RNG consumption. Starmless's existing scapegoat roll is unchanged.
3. **P4c.1 compatibility** — bomber-reuse rule and Carnage bomber bias are untouched and composed with (not replaced by) the new helpers.
4. **No `Order` / `Leader` / `ResolutionEvent` shape changes** — UI consumers see no difference beyond more launch events per round.
5. **TDD posture continues** — engine TDD strict; helper tests drive the helper implementation.

### 6.3 Minor / accepted

1. **No in-game round cap.** Elimination-only means games can, in principle, run long. Accepted — aggression makes long games unlikely, and a cap would contradict the brainstorming decision.
2. **Win-share balance is judged by playtesting**, not assertions. Accepted per decision.
3. **Per-planner build-plan tuning values** (stockpile targets, finish threshold, launch caps) are first-pass in the plan and refined by playtest — same posture as prior phases' "balance-pass" constants.

---

## 7. Out of scope

### 7.1 Deferred to P4c slice 3+

- Approach B / C lookahead upgrades (sliding-window history, personality-fit modelling).
- Threat-aware defence deployment per personality.
- AI-duel win-share / balance assertions (only termination is asserted this slice).

### 7.2 Deferred to P5 (polish)

- Persistence, replay scrubber UI, animations, audio, SVG art, PWA — unchanged from prior specs.

---

## 8. File list

### 8.1 Modified

```
src/engine/winConditions.ts            — remove dominance branch
src/engine/balance.ts                  — remove DOMINANCE_THRESHOLD_DEFAULT
src/engine/types.ts                    — remove GameConfig.dominanceThreshold (+ WinOutcome.dominance if unreferenced)
src/engine/state.ts                    — remove dominanceThreshold wiring in initialState
src/engine/ai/netanyahoo.ts            — buildToward + launchSalvo; missile-loop bug fixed
src/engine/ai/khameneverhere.ts        — buildToward + launchSalvo; raised stockpile targets
src/engine/ai/mileighhem.ts            — buildToward (new build logic); launchSalvo spread mode
src/engine/ai/carnage.ts               — buildToward + launchSalvo; P4c.1 bomber bias retained
src/engine/ai/starmless.ts             — buildToward + launchSalvo; new opportunism finish path
src/engine/ai/chump.ts                 — buildToward + launchSalvo (low cap); defence retained
tests/engine/ai/netanyahoo.test.ts     — reworked + bug-fix regression
tests/engine/ai/khameneverhere.test.ts — reworked
tests/engine/ai/mileighhem.test.ts     — reworked + build-then-fire test
tests/engine/ai/carnage.test.ts        — reworked
tests/engine/ai/starmless.test.ts      — reworked + finish-path test
tests/engine/ai/chump.test.ts          — reworked
tests/engine/ai-duel.test.ts           — termination assertion
tests/engine/winConditions.test.ts     — remove dominance cases
README.md                              — Phase 4c slice 2 status section
```

### 8.2 New files

```
src/engine/ai/aggression.ts            — buildToward + launchSalvo helpers
tests/engine/ai/aggression.test.ts     — helper tests
```

### 8.3 Deleted files

None.

---

## 9. References

- P4c.1 spec: `docs/superpowers/specs/2026-05-14-phase-4c-slice1-bomber-reuse-design.md`
- P4c.1 plan: `docs/superpowers/plans/2026-05-14-phase-4c-slice1-bomber-reuse.md`
- Engine entry points: `src/engine/winConditions.ts` (`checkOutcome`), `src/engine/ai/*.ts` (six planners), `src/engine/ai/scoring.ts` (`threatScore`, `opportunismScore`, `wasAttackedBy`, `topGrudgeTarget`), `src/engine/orders.ts` (`validateOrder`, `apCostOf`).
