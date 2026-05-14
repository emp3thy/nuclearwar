# Phase 4c slice 1 — Bomber reuse + Carnage bomber bias design spec

**Date:** 2026-05-14
**Status:** drafted from playtesting brainstorming session; pending user review
**Source of feedback:** playtesting after P4b merge (commit `174139a`). User notes captured in conversation: bombers should be reusable (the whole point of bombers); Carnage should value bombers, Netanyahoo should not.

---

## 1. Overview

Phase 4c was originally scoped as "AI scoring-weight balance pass + Approach B/C lookahead upgrades". This slice 1 narrows the first PR to two tightly-coupled changes:

1. **Bombers are reusable** — engine rule. A bomber consumed during a launch returns to the attacker's stockpile if the launch impacts; stays gone if intercepted. Warheads always consumed. One bomber = one mission per round.
2. **Carnage favours bombers** — AI personality tuning. Carnage builds bombers (not missiles) and launches with bombers when available. Netanyahoo unchanged (stays missile-biased).

The wider P4c scope (full AI scoring-weight tuning, Approach B/C lookahead upgrades, threat-aware defence deployment per personality) lands in subsequent slices once we see the duel distribution under the new bomber rule.

Phase order: **P3 ✓ → P4a ✓ → P4b ✓ → P4c.1 (this slice) → P4c.2+ → P5**.

---

## 2. Scope

### 2.1 Bomber reuse engine rule

**Lifecycle:**

- **Launch (consumeStockFor)** — bomber decremented from `attacker.stockpile.bombers` exactly as today. Warhead also decremented. This enforces "one mission per bomber per round" naturally — a second `launch` order with the same `delivery: 'bomber'` validates against `bombers === 0` and fails.
- **Intercept (applyLaunches intercept branch)** — bomber stays gone. The existing intercept-decrement of `receiver.deployedShields/deployedAA` is unaffected.
- **Impact (applyLaunches impact branches)** — for `ImpactPeople` AND `ImpactInfrastructure`, if `l.delivery === 'bomber'`, restore the bomber: `attacker.stockpile.bombers += 1`. Restoration is unconditional on attacker liveness (a dead attacker's stockpile is irrelevant; restoration is harmless).
- **Final Retaliation** — FR cascade reuses `applyLaunches`, so dying-leader bomber-impacts technically restore the bomber to a dead leader's stockpile. Harmless — nothing reads dead-leader stockpile after death.

### 2.2 Carnage AI bomber bias

Two narrow changes in `src/engine/ai/carnage.ts`:

- **Build bias** — where Carnage currently emits `{ kind: 'build-missile' }`, emit `{ kind: 'build-bomber' }` instead. Warhead pairing unchanged.
- **Launch bias** — when constructing a launch order: if `me.stockpile.bombers >= 1`, set `delivery: 'bomber'`; else fall back to `'missile'`.

Existing threat scoring, opportunism scoring, Chump-exception, target-eligibility logic — all untouched.

### 2.3 Netanyahoo unchanged

No code change. Netanyahoo continues to build missiles + launch with missiles. The regression test (§5) confirms.

### 2.4 UI projection unchanged

`src/ui/util/projection.ts`'s `projectInventory` already subtracts bomber for a queued launch — matches consume-during-round semantics. The post-impact restoration happens AFTER `resolveRound`, so it's already next round's inventory and outside the projection's scope.

### 2.5 AI duel test comment

`tests/engine/ai-duel.test.ts` — append a one-line note that the bomber rule + Carnage tuning shift the distribution again; P4c slice 2+ uses the new distribution.

---

## 3. Round flow

**Unchanged** structurally. The launch phase already runs:

```
collectLaunches → consumeStockFor → applyLaunches
```

The only delta is inside `applyLaunches`: after damage application, a single line per impact branch restores the bomber.

---

## 4. Engine schema changes

**None.** No new event kinds, no new fields on `Leader` or `GameState`, no `Order` shape changes. `ResolutionEvent` variants stay as P4b left them. This is a behaviour change only.

---

## 5. Testing

P4b baseline: 246 tests. Target end-state: **~252 tests**.

### 5.1 Engine tests

```
tests/engine/launches.test.ts (extend, ~3 tests)
  ↳ bomber impact (people) restores bomber to attacker stockpile
  ↳ bomber impact (infra) restores bomber
  ↳ bomber intercept does NOT restore (intercepted bomber stays gone)
  ↳ same-round double-launch with 1 bomber rejected (validation guard works)

tests/engine/launches.test.ts (extend, regression)
  ↳ missile launch behaviour unchanged: missile gone on impact AND on intercept

tests/engine/ai/carnage.test.ts (extend, ~2 tests)
  ↳ Carnage builds bomber when AP allows (verify queued orders contain build-bomber, not build-missile)
  ↳ Carnage launches with delivery='bomber' when bombers >= 1 in stockpile

tests/engine/ai/netanyahoo.test.ts (extend, ~1 test)
  ↳ Netanyahoo still builds missiles (regression — bomber bias does NOT bleed across personalities)
```

### 5.2 What is NOT tested

- Exact AI-duel win distribution under the new rule (deferred to P4c slice 2 tuning pass).
- UI behavior — `projectInventory` requires no change so existing tests cover it.
- Cross-leader bomber semantics — no shared bomber pool exists.

---

## 6. Assumptions (3 buckets)

### 6.1 Real concerns

1. **AI duel under the new bomber rule may shift in surprising ways.** Carnage with bombers + reusability becomes much more durable per-AP. Expect his win rate to increase noticeably. Acceptable — slice 2 tunes against the new baseline. AI-duel test continues to assert only "no crash".

### 6.2 Verified safe

1. **Engine purity preserved.** No React imports under `src/engine/**`.
2. **Determinism preserved.** No new RNG consumption. The bomber-restore is deterministic (always restores on impact, never restores on intercept).
3. **P4b backward compatibility.** `Order` shape unchanged; `Leader` shape unchanged; `ResolutionEvent` shape unchanged. Existing UI consumers see no difference.
4. **CSS Modules pattern continues** — no UI changes.
5. **TDD posture continues** — engine TDD strict; the four new test cases drive the implementation.

### 6.3 Minor / accepted

1. **Dead-leader bomber restoration on FR impact** is a harmless no-op. Not worth special-casing.
2. **Carnage threat scoring of OPPONENT bombers** stays unchanged for now. If it turns out he undervalues opponents with bomber-heavy arsenals, that's a slice 2 tuning question.
3. **Slice 1 doesn't touch other personalities.** Khameneverhere, Starmless, Mileigh-hem may also "logically" benefit from bombers under the new rule. Their tuning lives in slice 2.

---

## 7. Out of scope

### 7.1 Deferred to P4c slice 2+

- Full AI scoring-weight balance pass against the new rules (Khameneverhere/Starmless/Mileigh-hem revisited; mutual-shield-saturation imbalance from P2 known-issues)
- Approach B / C lookahead upgrades (sliding-window history; personality-fit modelling)
- Threat-aware defence deployment per personality
- Opponent-bomber threat weighting reconsideration

### 7.2 Deferred to P5 (polish)

- Persistence, replay scrubber UI, animations, audio, SVG art, PWA — unchanged from P4b spec.

---

## 8. File list

### 8.1 Modified

```
src/engine/launches.ts                     — applyLaunches restores bomber in 2 impact branches
src/engine/ai/carnage.ts                   — build-bomber instead of build-missile; launch delivery='bomber' when available
tests/engine/launches.test.ts              — extend with bomber lifecycle tests + missile regression
tests/engine/ai/carnage.test.ts            — extend with bomber-bias tests
tests/engine/ai/netanyahoo.test.ts         — extend with regression test
tests/engine/ai-duel.test.ts               — one-line comment update
README.md                                  — Phase 4c slice 1 status section
```

### 8.2 New files

None.

### 8.3 Deleted files

None.

---

## 9. References

- P4b spec: `docs/superpowers/specs/2026-05-13-phase-4b-balance-planning-rework-design.md`
- P4b plan: `docs/superpowers/plans/2026-05-13-phase-4b-balance-planning-rework.md`
- Engine entry points: `src/engine/launches.ts` (consumeStockFor + applyLaunches), `src/engine/ai/carnage.ts`
