# hard — Trend Analysis

**Headline: `hard` is degenerate.** All 100 games end the same way — mutually assured destruction (`pyrrhic`) in 17 or 18 rounds, with the entire five-player cast dead every time. There are only **two distinct game shapes** in the whole run, and which one occurs decides whether the human is nominally the "winner" or not. Nothing the human does changes the fact that everyone dies.

All numbers below come from `scripts/playability/aggregate.ts hard docs/playability`.

## Outcome mix — how games END

| Outcome | Count |
|---|---|
| pyrrhic | 100 |
| survivor | 0 |
| apocalypse | 0 |
| unfinished | 0 |

Every single game is `pyrrhic`: a leader is nominally credited with the win but also dies. `avgFinalPop` is **0** and `avgEliminations` is **5** (the full cast) in every game. There is no survivor outcome, no game reaches the 60-round cap, and no game ends with the board wiped and no winner. The end-state is fixed: total annihilation, with the last leader to die being stamped the winner.

## Game-length distribution and escalation

| Metric | Value |
|---|---|
| avgRounds | 17.37 |
| medianRounds | 17 |
| minRounds | 17 |
| maxRounds | 18 |
| avgTotalLaunches | 74.63 |
| avgTotalImpacts | 70.63 |

Game length is effectively a two-valued constant: **17 rounds (63 games) or 18 rounds (37 games)**, nothing else. Escalation is heavy and front-loaded — ~75 launches and ~71 impacts per game across ~17 rounds is roughly 4.3 launches landing per round. The per-round trajectory is byte-for-byte identical across all games through round 16 (e.g. r4 always 8 launches/8 impacts, r10 always 7/6, r16 always 5/5 killing netanyahoo). The eliminations always fall in the same order: **chump (r12) → netanyahoo (r16) → carnage + mileigh-hem + player1 together in the final round**. The only branch is whether the human absorbs the fatal salvo in r17 (loss) or trades one more round and dies in r18 (win).

## Human trajectory

| Metric | Value |
|---|---|
| winRatePct | 37 |
| survivalRatePct | **0** |
| winOrSurviveRatePct | 37 |
| avgPlacement | 1 |
| placementDist | 1st: 100/100 |
| avgEliminatedRound | 17.37 |
| avgLaunchesMade | 6.37 |
| avgLaunchesReceived | 20 |
| avgHitsLanded | 3.37 |
| avgHitsTaken | 19 |

The human **never survives** — survival rate is 0%. The 37% "win rate" is entirely pyrrhic: `humanWon` is true but `humanSurvived` is false in all 37 cases. `avgPlacement` reads as a flat 1st across all 100 games, which is an artifact of the pyrrhic scoring (last leader standing ranks first even though it dies) and should not be read as the human dominating. The human is a punching bag: it takes **19 hits** while landing only **3.37**, and receives **20 launches** while making **6.37** — a ~3:1 disadvantage on both offense and defense. It dies at round 17.37 on average, i.e. in the final round of the game, every game.

## Who actually wins

| Winner | Count |
|---|---|
| mileigh-hem | 63 |
| player1 (human) | 37 |

Only two entities are ever credited with a win: **mileigh-hem (63)** and the human (37). chump, carnage, and netanyahoo never win — they are always eliminated earlier (chump first at r12, netanyahoo at r16). The "win" is not a strategic victory; it is simply who happens to be the last leader to die in the final simultaneous salvo. In the 17-round shape mileigh-hem outlives the human by an instant; in the 18-round shape the human outlives mileigh-hem by an instant. It is a coin-flip on a tie-break, not a contest.

## Degenerate patterns (call-outs)

1. **100% pyrrhic — no variance in outcome type.** Every game is mutually assured destruction. The game has no "win" state that a human can actually reach alive.
2. **Zero human survival.** Across 100 games the human dies 100 times.
3. **Only two game shapes exist.** 63 identical 17-round games and 37 identical 18-round games. The simulation is essentially deterministic given the fixed cast and policy; the run has no meaningful diversity.
4. **Placement/win metrics are misleading artifacts.** "1st place, 100/100" and "37% win rate" both describe corpses. Any consumer of these numbers must read them against `survivalRatePct = 0`.
5. **Overwhelming incoming fire.** The human takes ~19 hits and gives ~3 — offense is nearly irrelevant to the result; the board simply detonates everyone.
