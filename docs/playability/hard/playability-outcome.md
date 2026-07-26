# hard — Playability Outcome

## Verdict: **BROKEN**

`hard` is not a difficulty level a human can play — it is a scripted mutual annihilation. **All 100 games end `pyrrhic`: the entire five-player cast dies every time, and the human's survival rate is 0%.** The 37% "win rate" is a scoreboard artifact (last leader to die is stamped the winner); it describes which corpse is on top, not a victory a player can feel. The level fails the most basic playability test — there is no reachable win-alive state — so the verdict is *broken*, not merely *punishing*.

Every claim below is grounded in the aggregate JSON (`aggregate.ts hard`) and the narratives in `games.md`.

## Is it FUN / FAIR / WINNABLE?

- **Winnable: no.** `survivalRatePct = 0`, `avgFinalPop = 0`, `avgEliminations = 5` in 100/100 games. You cannot win alive. The best possible human result the run ever produced is a pyrrhic win — e.g. `hard-0` and `hard-9`: `WON (pyrrhic)`, human final pop 0M, dead in round 18 alongside carnage and mileigh-hem. That is the *ceiling*, and it is still a total loss of your own population.
- **Fair: no.** The human takes **19 hits** and lands **3.37**; it receives **20 launches** and makes **6.37** (roughly 3:1 against on both axes). It is outgunned regardless of play.
- **Fun: no.** There are only two possible games (see below). A human replaying `hard` sees the identical escalation and the identical funeral every time. Deaths are always ordered chump (r12) → netanyahoo (r16) → everyone else in the last round.

## Player agency: effectively zero

The outcome is decided by the AI melee, not by the human. Evidence:

- The per-round launch/impact sequence is **identical across all 100 games** through round 16 (`games.md`: r4 always 8/8, r10 always 7/6, r16 always 5/5 killing netanyahoo). The simulation is essentially deterministic under the fixed cast + measured-reactive policy.
- The only branch is a one-round tie-break in the final salvo: either the human eats the fatal volley in **r17** (63 games, mileigh-hem "wins" — e.g. `hard-1`, `hard-2`) or trades one extra round and dies in **r18** (37 games, human "wins" — e.g. `hard-0`, `hard-3`). Same annihilation either way.
- The human's own offense barely registers: it lands 3.37 hits into a board that absorbs ~71 impacts per game. Its shots do not change who dies or when.

The player is a spectator to a fixed detonation.

## Difficulty feel

- **Pacing:** short and flat — 17–18 rounds every game (`min 17, max 18`). No slow builds, no comebacks, no long stalemates (zero `unfinished`). The game is over almost the moment the shooting starts scaling.
- **Snowballing:** severe and unrecoverable. ~75 launches land ~71 impacts across ~17 rounds; incoming fire on the human (19–20) so far exceeds outgoing (6) that there is no defensive economy that survives it.
- **Frustration points:** (1) death is guaranteed — the human dies at round ~17.37 in 100/100 games; (2) the "win" is hollow — `humanWon` true while `humanSurvived` false; (3) the scoreboard lies — `avgPlacement 1`, `1st: 100/100` reads like dominance but is a pyrrhic-scoring artifact.
- **Dominant strategy:** none exists for the human. Among the AI, only mileigh-hem ever converts to a "win" (63), and only by outlasting the human by a single round. carnage, netanyahoo, and chump never win at all.

## Recommendations (prioritised)

1. **Make a win-alive state reachable — top priority.** The core defect is that damage output on the board vastly exceeds any survivable defense: ~71 impacts/game with the human taking 19 hits. Reduce global aggression and/or increase defensive value so that at least one leader can plausibly finish with population > 0. Target: drive `pyrrhic` from 100% down and get `survivorRatePct` meaningfully above 0.
2. **Fix the defence economy so shields matter.** The human follows a shield-keeping policy yet still takes 19 hits. Either shields are too weak or too scarce relative to salvo volume. Buff mitigation or make defensive investment out-pace the incoming ~20 launches so that surviving is a viable line of play.
3. **Throttle AI aggression / launch volume.** ~4.3 impacts landing per round leaves no room for recovery. Lowering AI launch cadence (especially the r2–r10 burst that is identical every game) would open decision space and break the deterministic script.
4. **Introduce variance so the level isn't two scripted games.** Only two game shapes exist across 100 runs. Add stochasticity to targeting/timing (or per-leader behaviour) so replays diverge — otherwise "difficulty" is indistinguishable from a fixed animation.
5. **Fix pyrrhic scoring / reporting.** Stop crediting a dead leader as 1st-place winner, or at minimum separate "win-alive" from "last-to-die". As-is, `winRatePct` and `avgPlacement` actively mislead about playability; they must be read against `survivalRatePct = 0`.
6. **Lengthen the recoverable window (secondary).** Games end in 17–18 rounds with no `unfinished`. Once aggression is throttled, a longer arc gives the human room to retaliate and comeback mechanics room to matter.
