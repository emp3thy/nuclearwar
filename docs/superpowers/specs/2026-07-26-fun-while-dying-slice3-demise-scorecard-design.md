# nuke — "fun while dying" slice 3: score how you died

**Date:** 2026-07-26
**Status:** approved in brainstorming; pending spec review
**Design frame:** The playability assessment's core legibility failure (C1): a pyrrhic "winner" is just the last leader to die, so the Winners screen crowns a corpse with "X WINS." This slice makes the endgame *honest* and turns the death into the reward — the "fun while dying" payoff at match end. Slice 3 of 3 (slices 1 & 2 shipped, PRs #16/#17).

## 0. Decisions (locked in brainstorming)

- **Comedic awards, no fake number.** Assign tongue-in-cheek superlative titles to leaders, derived from the game log. No composite score, no phony leaderboard — celebrating the death, not inventing a winner.
- **Honest-deadpan pyrrhic headline.** Replace the pyrrhic "X WINS" with a flat statement of the truth (e.g. "LAST TO FALL: X"); the joke is that *this* is the win.
- **UI + a pure derived module only. No engine change** — `checkOutcome` / `WinOutcome` / `scoreState` untouched, so hard-mode lookahead stays stable.

## 1. What's already honest vs the lie

`Winners.tsx` already shows an honest Death Toll table (START / END / % LOST / SURVIVED-or-ELIMINATED) and an honest apocalypse headline ("WINNER: NOBODY"). The **survivor** outcome (one leader alive, rest dead) is a legitimate win — "X WINS" stays. The single lie is the **pyrrhic** headline `${winner} WINS` when everyone, including the "winner", is dead. That's the one reframe; the rest of the slice adds the awards layer.

## 2. Derived module — `src/ui/util/demise.ts` (pure, tested)

`export function deriveAwards(game: GameState, initialPopulations): Award[]` where `Award = { title: string; leaderId: LeaderId; detail: string }`. All awards derive from the cumulative `game.log` (all `ResolutionEvent`s of the match, chronological) + final `game.leaders` + `game.outcome`. Superlative = one winner per category; ties broken by `game.cast` order (deterministic). Omit an award if no leader qualifies (e.g. nobody launched).

Award set (all robustly derivable — no round-boundary data needed):
- **LAST ONE STANDING** (survivor outcome) / **LAST TO FALL** (pyrrhic outcome) → `outcome.winner`; detail notes they outlasted the rest (by a round, for pyrrhic). Omitted for apocalypse.
- **DIED FIRST** → the first `LeaderEliminated` event in log order. Detail: deadpan (e.g. "Set the tone. The tone was 'dead'.").
- **DEADLIEST** → max total people killed = Σ `ImpactPeople.deaths` where `from = leader`. Detail: "XM on their conscience (conscience sold separately)."
- **BIGGEST BANG** → largest single warhead landed (`ImpactPeople`/`ImpactInfrastructure` with `from = leader`, max yield large>medium>small). Detail names the yield.
- **TRIGGER HAPPY** → most `MissileLaunched` with `from = leader`. Detail: "N launches. Subtlety: none."
- **COLD FEET** → among leaders who ended with launch capacity but fired the fewest/zero launches (a nuke leader who barely fired). Detail: deadpan. (Only if it reads meaningfully; else omit.)

Helper `export function humanDemiseLine(game, initialPopulations, humanId): string` — a one-line honest epitaph for the human slot regardless of awards: fate (survived / eliminated / last to fall), pop lost, hits landed vs taken. Used to guarantee the human always gets a personal "how you died" beat.

(Elimination *order* comes from the sequence of `LeaderEliminated` events in the chronological log; exact round numbers are NOT needed and NOT used — keeps this decoupled from any per-round state the engine doesn't expose at match end.)

## 3. Winners.tsx changes

- **Pyrrhic headline** (`pickHeadline`): pyrrhic no longer returns `"${winner} WINS"`. Return honest-deadpan, e.g. `LAST TO FALL: ${winner.toUpperCase()}`. Survivor keeps `"${winner} WINS"`; apocalypse keeps `"WINNER: NOBODY"`. The pyrrhic hero Stamp can read "LAST TO FALL" instead of "PYRRHIC" (or keep PYRRHIC — minor; align with headline).
- **Awards panel:** new `<Panel title="Awards">` (or "Honours (Dishonours)") between the hero and the Death Toll, rendering `deriveAwards(...)`. Each row: award title, the leader (Portrait + name, "(you)" if human), and the detail line. Awards whose `leaderId` is the human slot get a highlight class. Reuse existing comic primitives + Winners.module.css patterns; add minimal CSS.
- **Human epitaph:** show `humanDemiseLine(...)` prominently (e.g. under the hero subline or atop the awards) so the human always gets an honest personal readout even in an all-AI-award game. (If the cast has multiple humans, show player1's; a fuller multi-human treatment is out of scope.)
- Death Toll table, apocalypse handling, New Game / Same Cast buttons, the closing "EVERYBODY PLAYS. NOBODY WINS." — unchanged.

## 4. Testing

- `tests/ui/demise.test.ts` (unit, pure): build small synthetic `GameState`s with crafted `log` + `leaders` + `outcome`, assert each award goes to the right leader (deadliest = highest summed deaths; biggest bang = large-warhead lander; died first = first LeaderEliminated; last to fall = pyrrhic winner; trigger happy = most launches); tie-break by cast order; award omitted when no qualifier (e.g. no launches → no TRIGGER HAPPY, or empty log → only outcome-based/none). `humanDemiseLine` returns the right fate string for survived / eliminated / last-to-fall. All assertions unconditional.
- `tests/ui/Winners.test.tsx`: update the pyrrhic case — assert the headline is the honest-deadpan form (NOT "WINS"); assert an Awards panel renders and the human's award/epitaph appears. Keep survivor/apocalypse assertions.
- `npm run typecheck` clean; `npm run test:run` green.

## 5. Out of scope
- Engine outcome/scoring/win-condition changes (NONE — pure UI + derivation).
- RoundSummary (slice 2, shipped). Character/AI (slice 1, shipped).
- Multi-human per-player scorecards beyond player1's epitaph.
- Persisting scores / cross-game records.

## 6. Constraints
- Every commit typechecks and passes the suite; unconditional test assertions.
- Product emojis (☢ flags) are design language — keep.
- Comedic-award copy in the cast's satirical voice; punch up; no religious markers.
- Awards derive deterministically from game state — no RNG, no Date.
