# nuke — "fun while dying" slice 2: newspaper content (adverts + ironic weather)

**Date:** 2026-07-26
**Status:** approved in brainstorming; pending spec review
**Design frame:** In a "nobody wins" game the reward is an entertaining death. The RoundSummary tabloid is the primary fun-while-dying surface — it is also, per the playability assessment (`docs/playability/playability-usability-assessment.md`, C2/C10), the causal-feedback + satisfaction surface. This slice makes it varied and funny. Engine/AI untouched.

Part of a 3-slice effort: (1) characters & difficulty, (2) **this** — newspaper content, (3) score-how-you-died. Slices ship as independent PRs.

## 0. Current state (what exists)

`src/ui/util/newspaper.ts` + `src/ui/screens/RoundSummary.tsx`:
- **Classifieds:** `CLASSIFIEDS` = 4 fixed items; RoundSummary renders **all four every round** (`.map`), so they never change game-to-game or round-to-round.
- **Advert block:** a single hardcoded "NUCLEAR DUCKS" ad in `RoundSummary.tsx` — identical every round.
- **Weather:** `deriveForecast(thisRoundLost)` picks one of four damage tiers (NONE/LIGHT/HEAVY/BIBLICAL) with mostly-static rows; only real variance is by damage. Same damage → identical forecast every time.
- **Corrections:** `CORRECTIONS` = 3 items, rotated by `(round-1) % 3`.

Result: after two or three rounds the paper repeats itself. Low replay fun.

## 1. Goals

- Adverts and classifieds feel fresh across a ~15-round game and across replays.
- The weather forecast is ironic/deadpan and varies round-to-round, while still *reacting* to the round's carnage (keep the damage-tier link — weather commenting on the body count is the joke).
- Deterministic selection (by round number) so output is reproducible and testable; consecutive rounds differ; repeats within one game are rare.
- No engine, AI, or layout changes — content pools + selection helpers + minimal RoundSummary wiring only.

## 2. Design

### 2.1 Adverts (new rotating pool)
- Add `export const ADVERTS: readonly Advert[]` to `newspaper.ts` — ~10 parody spots, each `{ title: string; body: string }`. Include the existing NUCLEAR DUCKS as one entry; add others in the game's voice (fallout-shelter timeshares, discount geiger counters, "Freedonia Tourism — while it lasts", warhead extended warranties, etc.).
- Add `export function pickAdvert(reportedRound: number): Advert` → `ADVERTS[(reportedRound - 1) % ADVERTS.length]`.
- `RoundSummary.tsx`: replace the hardcoded NUCLEAR DUCKS block with `pickAdvert(reportedRound)`, rendering `title` (kept in the existing yellow ad-block styling) + `body`. The block keeps its current classes; only content is dynamic. The title may contain a `\n` for the two-line look — render with the existing `<br/>` treatment or split on `\n`.

### 2.2 Classifieds (expand + rotate a subset)
- Expand `CLASSIFIEDS` to ~16 items (keep the 4 existing, add ~12 in-voice).
- Add `export function pickClassifieds(reportedRound: number, n = 4): Classified[]` — returns `n` items starting at a round-derived offset, wrapping the array, so each round shows a different window. Never returns duplicates within a single call (n ≤ pool length).
- `RoundSummary.tsx`: render `pickClassifieds(reportedRound)` instead of the whole `CLASSIFIEDS` array. Same per-item markup.

### 2.3 Weather (ironic + varied, still damage-reactive)
- Keep `deriveForecast(thisRoundLost)`'s four damage tiers and the UV ladder (do NOT "fix" the documented UV divergence — spec note in the file stays).
- Within each tier, make the flavour rows **rotate by round**: add a per-tier pool of ironic row-sets (Fallout / Visibility / Wind / Outlook lines) and pick one set by round number, so the same damage tier reads differently on round 3 vs round 8. Add more deadpan wasteland lines ("Wind: mushroom-shaped, gusting to apocalyptic"; "UV: put the factor 50 on the survivors"; "Outlook: unseasonably terminal").
- Signature change: `deriveForecast(thisRoundLost: number, reportedRound: number)` gains the round param for rotation. Update the one caller in `RoundSummary.tsx`.
- Keep `outlook`/`temp`/`tempLabel`/`uv` tied to the damage tier (the carnage-reactive spine); only the `rows` flavour rotates.

### 2.4 Corrections (light expansion)
- Expand `CORRECTIONS` from 3 to ~8 in-voice items. `pickCorrection` unchanged (already rotates by round).

## 3. Selection principle
All selection is a pure function of `reportedRound` (already threaded into RoundSummary). Deterministic, reproducible, varies each round, and with pools of ~8–16 vs ~15 rounds, in-game repeats are rare. No RNG, no engine state.

## 4. Testing (`tests/ui/newspaper.test.ts`)
- `ADVERTS`, `CLASSIFIEDS`, `CORRECTIONS` meet minimum pool sizes (≥10 / ≥16 / ≥8) — unconditional asserts.
- `pickAdvert` / `pickClassifieds` / `deriveForecast` return **different** content for two different rounds (rotation works) — assert inequality, not just "defined".
- `pickClassifieds(r, 4)` returns 4 distinct items (no dup within a round).
- `deriveForecast` still maps damage → correct tier outlook/uv (existing behaviour preserved) across all four tiers.
- Existing newspaper tests stay green (update any that asserted the old static 4-classified render or the old `deriveForecast` arity).

## 5. Out of scope
- The NUCLEAR DUCKS visual styling / ad-block layout (reused as-is).
- Market report, box score, obituaries, news stories (unchanged this slice).
- Scoring/outcome changes (slice 3). Character/AI changes (slice 1).

## 6. Constraints
- Product emojis (☢ ▲▼ flags) are design language — keep them.
- Every commit typechecks (`tsc --noEmit`) and passes `npm run test:run`; no guarded assertions.
- Content stays in the cast's satirical voice; no religious markers; punch up (leaders, war, bureaucracy), consistent with the flavour-bank tone rules.
