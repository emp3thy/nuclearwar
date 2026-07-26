# Slice 3 — Demise scorecard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Make the Winners screen honest and turn death into the reward — reframe the pyrrhic "X WINS" lie to an honest-deadpan headline, and add comedic "how you died" awards derived from the game log. UI + one pure module; no engine change.

**Architecture:** New pure `src/ui/util/demise.ts` derives awards + a human epitaph from `game.log` + final `leaders` + `outcome`. `Winners.tsx` consumes it: honest pyrrhic headline, an Awards panel, a human epitaph line. `checkOutcome`/`WinOutcome`/`scoreState` untouched.

**Tech Stack:** React 18 + TS + CSS modules, vitest.

**Spec:** `docs/superpowers/specs/2026-07-26-fun-while-dying-slice3-demise-scorecard-design.md`

## Global Constraints

- Every commit: `npm run typecheck` clean AND `npm run test:run` green. Unconditional test assertions.
- No engine win-condition/scoring change. Deterministic derivation (no RNG/Date).
- Product emojis kept; award copy in the satirical voice, no religious markers.

## Guardrails (better-memory)

- Derive elimination ORDER from the sequence of `LeaderEliminated` events in the chronological cumulative `game.log`; do NOT invent round numbers (the engine doesn't expose per-round data at match end).
- Superlatives need deterministic tie-breaks (cast order) or tests flake.
- Winners.test.tsx uses a `makeState(outcome)` helper — the awards panel must render gracefully when `game.log` is sparse/empty (outcome-based awards only); confirm the helper's log shape before asserting award rows.

## File Structure

```
src/ui/util/demise.ts            (new: Award type, deriveAwards, humanDemiseLine)
src/ui/screens/Winners.tsx       (modify: pyrrhic headline; Awards panel; human epitaph)
src/ui/screens/Winners.module.css(modify: minimal award-row + highlight styles)
tests/ui/demise.test.ts          (new: unit tests, synthetic logs)
tests/ui/Winners.test.tsx        (modify: pyrrhic headline honest; awards panel renders)
```

---

### Task 1: `demise.ts` derivation module

**Files:** Create `src/ui/util/demise.ts`; Test `tests/ui/demise.test.ts`.

**Interfaces produced:**
- `export interface Award { title: string; leaderId: LeaderId; detail: string }`
- `export function deriveAwards(game: GameState, initialPopulations: Partial<Record<LeaderId, number>>): Award[]`
- `export function humanDemiseLine(game: GameState, initialPopulations: Partial<Record<LeaderId, number>>, humanId: LeaderId): string`

- [ ] **Step 1: Write failing tests** — `tests/ui/demise.test.ts`. Build minimal `GameState` objects (reuse the shape from `initialState` or a local factory) with a crafted `log: ResolutionEvent[]`, `leaders`, `cast`, `outcome`. Cover:
  - DEADLIEST → leader with highest summed `ImpactPeople.deaths` as `from`.
  - BIGGEST BANG → leader who landed the largest-yield impact (large > medium > small).
  - TRIGGER HAPPY → most `MissileLaunched` as `from`.
  - DIED FIRST → `id` of the first `LeaderEliminated` in log order.
  - LAST TO FALL → `outcome.winner` for a pyrrhic outcome; LAST ONE STANDING for survivor; neither present for apocalypse.
  - Tie-break: two leaders equal on a metric → award goes to the earlier one in `game.cast`.
  - Omission: no `MissileLaunched` in log → no TRIGGER HAPPY award; empty log + apocalypse → no log-derived awards (array may be empty or outcome-only).
  - `humanDemiseLine`: returns a string containing the human's fate for (a) survived, (b) eliminated, (c) pyrrhic last-to-fall, referencing pop lost + hits.
  Assertions unconditional (assert the exact `leaderId` per award; guard "award present" with a find + `toBeDefined()` before reading it).

- [ ] **Step 2: Run — expect FAIL** (`npx vitest run tests/ui/demise.test.ts`).

- [ ] **Step 3: Implement `demise.ts`.** Single pass over `game.log` accumulating per-leader: `deathsCaused` (Σ ImpactPeople.deaths from=leader), `biggestYield` (max yield of any impact from=leader, rank large=3/medium=2/small=1), `launches` (MissileLaunched from=leader), `hitsLanded`, `hitsTaken` (impacts with target=leader); and `eliminationOrder` = LeaderEliminated ids in encounter order. Build awards with a small helper `superlative(metricMap, {title, detailFn})` that picks the max with cast-order tie-break and returns undefined if the max is 0/none; push only defined awards. Add the outcome-based LAST TO FALL / LAST ONE STANDING. `humanDemiseLine` composes fate from `leaders[humanId].alive`, `outcome`, initial vs final pop, hitsLanded/Taken. Keep copy deadpan-satirical.

- [ ] **Step 4: Run — expect PASS.** Then `npm run typecheck`.

---

### Task 2: Winners.tsx — honest headline + awards + epitaph

**Files:** Modify `src/ui/screens/Winners.tsx`, `Winners.module.css`; Test `tests/ui/Winners.test.tsx`.

- [ ] **Step 1: Update tests first** — in `tests/ui/Winners.test.tsx`: add a pyrrhic case asserting the headline is the honest-deadpan form and is NOT `"… WINS"` (e.g. `getByText(/LAST TO FALL/i)`, and `queryByText(/WINS/)` for the pyrrhic winner is absent from the headline); assert an Awards panel/section renders. Keep the survivor "CARNAGE WINS", apocalypse, and death-toll tests. If `makeState` produces an empty `game.log`, ensure the pyrrhic case still shows LAST TO FALL (outcome-based) and the test doesn't depend on log-derived awards. Unconditional asserts.

- [ ] **Step 2: Run — expect FAIL.**

- [ ] **Step 3: Implement Winners.tsx:**
  - `pickHeadline`: `case 'pyrrhic': return 'LAST TO FALL: ' + leaders[outcome.winner].name.toUpperCase();` (survivor + apocalypse unchanged).
  - Optionally set the pyrrhic hero Stamp text to "LAST TO FALL" (keep magenta).
  - Compute `const awards = deriveAwards(game, state.initialPopulations);` and `const epitaph = humanDemiseLine(game, state.initialPopulations, 'player1');`.
  - Render `epitaph` under the hero subline (a `.epitaph` line).
  - Add an `<Panel title="Honours (Dishonours)">` above Death Toll listing `awards`: each row = title, `<Portrait leaderId size={36} flag=…>` + name (+ " (you)" for human), detail; add `styles.awardRow` and a `styles.awardMine` highlight when `isHuman(award.leaderId)`. If `awards` is empty, omit the panel.
  - Imports: `deriveAwards`, `humanDemiseLine` from `../util/demise`.

- [ ] **Step 4: Minimal CSS** in `Winners.module.css` — `.awardRow` (flex, ink-on-paper like deathRow), `.awardTitle`, `.awardMine` (magenta accent), `.epitaph` (italic subline). Match existing panel/table styling.

- [ ] **Step 5: Full verify** — `npm run typecheck` clean; `npm run test:run` green.

- [ ] **Step 6: Visual check** — `npm run dev`, reach a pyrrhic and a survivor ending (dev-nav or play); confirm honest headline + awards + human epitaph read well. (Sanity, not a gate.)

- [ ] **Step 7: Commit** (single commit, branch `feat/demise-scorecard`):

```bash
git add src/ui/util/demise.ts src/ui/screens/Winners.tsx src/ui/screens/Winners.module.css tests/ui/demise.test.ts tests/ui/Winners.test.tsx
git commit -m "feat(ui): honest demise scorecard — deadpan pyrrhic headline + comedic awards"
```

---

## Self-Review Notes

- Spec coverage: §2 module → Task 1; §3 Winners → Task 2; §4 tests → both.
- No engine touch — `checkOutcome`/`WinOutcome`/`scoreState` untouched; hard-mode lookahead unaffected; survivor + apocalypse framing preserved; only the pyrrhic lie is corrected.
- Determinism (cast-order tie-break) is the flake risk — pinned in Task 1 tests.
- The only cross-file dependency is Winners → demise; the module ships first (Task 1) so Task 2 compiles against real exports.
