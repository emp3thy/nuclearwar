# easy — Trend Analysis

*Source: `scripts/playability/aggregate.ts easy` over 100 games (`docs/playability/easy/games.jsonl`). Every number below is from that aggregate JSON; example seeds are cited from `games.md`.*

## Headline

At "easy" the human dies in **82 of 100 games** and takes roughly **twice the damage it deals** (10.37 hits taken vs 5.02 landed). Games resolve cleanly — no apocalypse, no round-cap stalls — but nearly half (42%) end in mutual destruction, and the win column is owned by two AIs (chump + mileigh-hem = 76 wins) while the other two are early fodder. This does not read as an "easy" difficulty curve for the player.

## How games END — outcome mix

| Outcome | Count | Meaning |
|---|---|---|
| survivor | 58 | one leader left standing, others dead |
| pyrrhic | 42 | the "winner" also died — mutually assured destruction |
| apocalypse | 0 | — |
| unfinished (60-round cap) | 0 | — |

Two things stand out. First, **games always conclude**: 100/100 finished, zero hit the round cap, zero ended with the whole board dead. The engine drives every match to a decision. Second, **42% of decisions are pyrrhic** — the winner blows itself up landing the final blow. This is a very high mutual-destruction rate: on almost half the board the last exchange kills the striker too. The endgame is decided by whoever throws the last punch, not by who is left standing, which is why so many "wins" are corpses (e.g. easy-63 r9: 21 launches wipe four leaders at once; easy-65 r6: 22 launches kill all five simultaneously).

## Game-length distribution and escalation

- Rounds: min **6**, median **15**, avg **15.21**, max **36**.
- Per game: avg **50.51** launches, **46.5** impacts, **4.42** eliminations (of 5 leaders).

The median 15-round game is healthy, but the distribution has a **long degenerate tail**. The escalation trajectory is front-loaded: a heavy opening burst around rounds 4–8 knocks out the weak leaders (carnage and netanyahoo almost always die in this window — see easy-5 r5, easy-19 r4, easy-66 r5), then the survivors trade down. When the board narrows to 2–3 leaders with depleted arsenals, matches degrade into a **1-launch-per-round, 0-impact stalemate** that limps for 10–25 rounds before a final burst resolves it. easy-54 is the extreme: 36 rounds, of which ~20 are single-launch rounds landing nothing (r16–r33), before the human finally dies. easy-3 (31r), easy-31 (31r), easy-84 (31r), easy-86 (32r) show the same lobbing tail. So escalation is bimodal: a decisive early crescendo, then either a fast finish or a slow attritional drip.

## The human's typical trajectory

- Win rate: **18%** — of which **8 games** are clean survival (human alive at the end) and **10 games** are pyrrhic (human wins but dies: easy-1, 13, 14, 20, 31, 43, 50, 60, 67, 84).
- Survival rate: **8%** — the human walks away alive in only 8 of 100 games.
- Eliminated in the other **82 games**; **27 of those deaths land by round 8** (the opening burst).
- Avg eliminated round: **12.33**; avg final population **0.85M** (i.e. the human ends on zero in ~92% of games).
- Combat: launches **7.15** made / **11.13** received; hits **5.02** landed / **10.37** taken.

The through-line: the human is **out-launched (~11 vs 7) and out-hit 2-to-1**, dies before the median game ends, and finishes on zero population in all but the 8 clean wins. The measured-reactive policy (never open with a first strike, always retaliate) means the human spends the game absorbing more than it returns. When the human does win cleanly it is because it landed a big early volley and reached the endgame with population intact — easy-61 (final pop 20M), easy-42 (17M), easy-74 (17M), easy-11 (12M) all feature 8–13 human launches concentrated early. Those are the exception, not the pattern.

### Placement is a degenerate metric — ignore it

The aggregate reports avgPlacement **1.5** with a placement distribution of **{1: 50, 2: 50}** — the human never ranks below 2nd. This is **not** a signal of human strength. Placement is defined (`runner.ts:143`) as rank by final population, with eliminated leaders scored at 0 and ties broken by cast order (player1 is listed first). In the 42 pyrrhic games everyone ends at 0, so the human tie-breaks to rank 1; add the 8 clean-survival wins and that is exactly the 50 first-place finishes. The other 50 are survivor games won by an AI, where that AI has positive population and the human (0) tie-breaks to rank 2. The 50/50 split is a cast-ordering artifact of everyone dying, not a placement the player earned. **Read win-rate (18%) and survival-rate (8%), not placement.**

## Who actually wins — and what it says about the cast

| Winner | Wins |
|---|---|
| chump | 40 |
| mileigh-hem | 36 |
| player1 (human) | 18 |
| netanyahoo | 3 |
| carnage | 3 |

The cast is **badly lopsided**. chump and mileigh-hem take **76%** of all games; carnage and netanyahoo win **3 each** and are almost always the first two eliminated (they die together in the round 4–8 opening burst across easy-5, 6, 10, 19, 22, 23, 52, 59, 66, 75, 88, 89…). They function as early fodder, not competitors. So "easy" is not a uniformly gentle field — it is two dominant AIs, two punching bags, and a human that finishes third.

## Degenerate patterns to flag

1. **Human loses 82% of games at the easiest setting** — win 18%, clean survival 8%. The difficulty label and the player experience disagree.
2. **42% pyrrhic** — the endgame rewards throwing the last punch over surviving; nearly half of all wins are suicides.
3. **Cast dominance** — chump + mileigh-hem = 76 wins; carnage + netanyahoo = 6 wins and reliably die first. The field is not balanced within itself.
4. **Long attritional tail** — once down to 2–3 leaders, games drip 1 launch / 0 impacts per round for 10–25 rounds (easy-54 at 36r is the worst). Median pacing is fine; the tail is not.
5. **Placement metric is meaningless** here (cast-order tie-break among zero-pop leaders) and should not be surfaced as a player-performance number.
