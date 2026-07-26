# Trend Analysis — normal

_Source: `scripts/playability/aggregate.ts normal` over 100 games (`docs/playability/normal/games.jsonl`). Every number below is from that aggregate JSON; narrative examples cite `games.md`._

## Headline

Normal games are decisive, high-tempo brawls that always resolve — 83% end with a lone survivor, 17% end pyrrhic, and none ever hit the round cap or wipe out entirely. The human (player1) is a genuine contender: they finish 1st or 2nd in **every** game and win 28% (above the 20% fair share for a 5-player free-for-all), but almost always end in rubble (avg final population 1.16M). One cast member, netanyahoo, is dead weight — 0 wins in 100 games and near-always the first to die.

## How games END (outcome mix)

| Outcome | Count |
|---|---|
| survivor (one leader left) | 83 |
| pyrrhic (winner also dies) | 17 |
| apocalypse (all dead, no winner) | 0 |
| unfinished (hit 60-round cap) | 0 |

Every game finishes on its own and produces a result. The dominant ending is a clean survivor (83%), but roughly 1 in 6 games collapses into mutually-assured destruction where the "winner" dies in the same exchange — e.g. `normal-25`, `normal-85`, and `normal-89`, where player1 lands the final blow and is killed in the same round (`r16: 7 launches, 7 impacts [☠ mileigh-hem, chump, player1]`). With `avgEliminations` at 4.17 of 5 players, survivor games kill exactly 4 and pyrrhic games kill all 5 — so the norm is near-total attrition regardless of who "wins".

## Game-length distribution & escalation

- Rounds: min **8**, median **17**, avg **17.47**, max **34**.
- Per game: **66.99** total launches, **60.87** total impacts — roughly 3.8 launches/round landing at a ~91% hit rate.

The distribution is tight and healthy around the median (most games run 14–21 rounds), but a long tail exists and it is degenerate. The longest games are not close fights — they are one-on-one stalemates where a wounded survivor lobs a single missile that keeps missing for a dozen-plus rounds. `normal-2` (34 rounds) is the canonical case: from r10 to r33 it reads `1 launches, 0 impacts` almost every round before a final r34 double-KO. `normal-59`, `normal-65`, `normal-82`, and `normal-95` (25 rounds) show the same "1 launch / 0 impacts" grind tail. When normal runs long, it is boring, not tense.

Escalation trajectory within a game is front-loaded: the opening rounds (r2–r8) are the bloodbath, typically featuring one or two 8–13-launch salvos that clear out the weak (netanyahoo, then usually carnage) — e.g. `normal-43 r5: 13 launches, 13 impacts [☠ netanyahoo]`, `normal-90 r4: 13 launches, 13 impacts`. After the early cull, volume tapers and the game either resolves quickly or drifts into the attrition tail.

## The human's typical trajectory

- Win rate: **28%** · Survival rate: **18%** · Win-or-survive: **28%**
- Avg placement **1.65** — placements are **1st ×35, 2nd ×65**, and _never_ 3rd–5th.
- Avg eliminated round: **14.85** (median game is 17 rounds) — the human usually dies late, in the endgame.
- Combat: launches made **10.83**, received **12.53**; hits landed **6.84**, taken **11.64**. Avg final population **1.16M**.

The human is always in the final two, which is strong evidence the measured-reactive policy works — it is never one of the early cull victims by design (invests early, holds a shield, never opens with a first strike). But the human is out-traded: they take ~12 hits for every ~7 they land, and receive more launches than they send. That imbalance is why the human so often reaches the endgame only to lose it or win it pyrrhically.

Critically, **survival and winning are the same event for the human**: all 18 survivals sit inside the 28 wins, so the human never once survived without also winning. The 28 wins split into ~18 clean survivor wins and ~10 pyrrhic wins (won the game, still died). The other 72 games are outright losses where the human is eliminated — usually around round 15. There is no "come 2nd and live" outcome; you either take the whole board or you die.

Best-case games show the ceiling is real and satisfying: `normal-30` (WON, 17M final pop), `normal-80` (WON, 14M), `normal-9` / `normal-63` / `normal-34` / `normal-40` (clean survivor wins ending 8–9M). Worst-case games are abrupt: eliminated round 4 in `normal-6`, `normal-44`, `normal-81`; a round-5 triple-KO in `normal-60`; and `normal-33`, where the human takes 16 hits and dies round 9.

## Who actually wins (winner distribution)

| Winner | Wins |
|---|---|
| chump | 32 |
| player1 (human) | 28 |
| mileigh-hem | 21 |
| carnage | 19 |
| netanyahoo | 0 |

No single AI runs away with it — chump leads at 32% but is not dominant, and the human's 28% slots second, ahead of two of the four AIs. The spread across chump/player1/mileigh-hem/carnage (32/28/21/19) is the healthiest sign in the dataset: outcomes are genuinely contested. The glaring exception is **netanyahoo, which won 0 of 100 and is the first elimination in nearly every game** (`normal-*` r5–r10, e.g. `normal-33 r5 [☠ netanyahoo]`, `normal-88 r7`, `normal-93 r6`). Effectively the cast is 4 real competitors plus a punching bag.

## Degenerate patterns to flag

1. **netanyahoo is non-competitive** — 0 wins, near-always first to die. One-fifth of the cast contributes nothing but a free early kill for everyone else.
2. **The attrition tail is dead air** — long games (24–34 rounds) devolve into single-missile whiffs between two survivors (`normal-2`, `normal-59`, `normal-95`). Length here signals a broken stalemate, not drama.
3. **Winning ≈ dying** — the human's survival rate (18%) trails its win rate (28%): 10 of every 28 wins are pyrrhic, and even clean wins end at ~1M population. Victory rarely feels clean.
4. **No middle ground for the human** — placement is strictly 1st or 2nd, and 2nd always means dead. The human either wins the board or is eliminated; there is no survive-in-second-place result.
