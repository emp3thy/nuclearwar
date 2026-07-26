# easy — Playability Outcome Report

## Verdict: PUNISHING

At the difficulty setting labelled "easy", a competent, measured human policy **wins 18% of games, survives just 8%, and is dead in 82%** — while being out-damaged roughly two-to-one (10.37 hits taken vs 5.02 landed). The game is coherent and always resolves, and a skilled opening *can* win, but the label promises the opposite of what the player gets. "Easy" here plays as the hardest thing a casual player will meet, not the gentlest.

*All figures from `scripts/playability/aggregate.ts easy` (100 games). Example seeds cited from `docs/playability/easy/games.md`.*

---

## Is it FUN / FAIR / WINNABLE?

**Winnable: yes, but barely, and mostly the wrong way.** The human takes the game in 18 of 100 seeds. But 10 of those 18 are **pyrrhic** — the human wins and dies in the same exchange (easy-1, 13, 14, 20, 31, 43, 50, 60, 67, 84). Only **8 games** end with the human actually alive and holding the board (easy-11, 12, 42, 52, 61, 71, 74, 76). So the "you win and walk away" experience — the thing a player would call a win — happens **8% of the time on the easiest setting.**

**Fair: no, for a level called "easy."** Difficulty is the only independent variable across levels (fixed cast, fixed human policy), so the comparison is clean, and at the bottom of the ladder the human still: dies in 82% of games, dies before the median game ends (avg eliminated round 12.33 vs median 15), and finishes on zero population in ~92% of games (avg final pop 0.85M). 27 of 100 games are already lost for the human by **round 8** — before the player has meaningfully acted. A first-time player on the "easy" level would lose four out of five games, most of them quickly. That is not a fair on-ramp.

**Fun: mixed.** The good news is the engine never breaks — 0 apocalypse, 0 round-cap stalls, every game reaches a decision, and there is genuine outcome variety (58 survivor / 42 pyrrhic). The bad news is two structural drags on enjoyment: the 42% mutual-destruction rate means half your "wins" are deaths, and the attritional long tail (below) turns roughly a fifth of games into a boring lob-fest.

---

## Player agency: thin, front-loaded, and often overridden

Agency exists but it is narrow. The clearest signal: **every clean human win is built on a concentrated early volley.** easy-61 (final pop 20M, won), easy-42 (17M), easy-74 (17M), easy-11 (12M) all show the human landing 8–13 launches in the first handful of rounds and reaching the endgame with population banked. When the human hits hard and early, it wins and lives. That is real agency.

But it is swamped by the AI melee for three reasons:

1. **The opening burst is not under the human's control.** carnage and netanyahoo die in a round 4–8 crossfire in the overwhelming majority of games regardless of what the human does (easy-5, 6, 10, 19, 22, 23, 66, 75, 88, 89…). The human is frequently caught in that same burst — 27 games end in human death by round 8.
2. **The measured-reactive posture structurally loses.** Never-first-strike + always-retaliate means the human is perpetually a step behind: out-launched 11.13 to 7.15 and out-hit 10.37 to 5.02. A policy that only ever answers cannot out-trade attackers who open. At an "easy" level a patient, reasonable player should be rewarded, not punished 2:1.
3. **The endgame is a coin-flip on who swings last.** With 42% of games pyrrhic, the deciding factor in the final exchange is timing of the last salvo, not accumulated skill — the human can play a clean game and still die in the mutual-destruction finish (easy-20, easy-67: human wins and dies in the final round alongside mileigh-hem).

Net: the human meaningfully affects *whether it wins big early*, but the *base rate* of the game — early carnage, 2:1 damage deficit, MAD endgame — is set by the AI cast, not the player.

---

## Difficulty feel

- **Pacing.** Median 15 rounds is fine. The problem is the tail: once the board narrows to 2–3 depleted leaders, matches degrade into single-launch, zero-impact rounds that drip for 10–25 turns before a final burst. easy-54 runs **36 rounds with ~20 of them landing nothing** (r16–r33 are all 1-launch/0-impact); easy-3, 31, 84, 86 show the same limp. This is the main frustration point — not lethal, just tedious.
- **Snowballing.** Front-loaded rather than snowballing. The heavy early exchange (rounds 4–8) does most of the killing (4.42 of 5 leaders eliminated per game); whoever emerges from it with population banked tends to close it out. There is no runaway-leader snowball, but there *is* an early-elimination cliff the human frequently falls off.
- **Dominant strategy.** For the human, the only strategy that clearly works is **hit hard and early** — the opposite of the measured-reactive policy under test. The passive retaliate-only posture is dominated. For the AI, chump and mileigh-hem's approach (76 combined wins) dominates carnage and netanyahoo's (6 wins), so the "easy" field is really two strong AIs plus fodder.
- **Frustration points.** (a) Dying by round 8 with little input (27 games). (b) Winning and dying anyway (10 of 18 wins). (c) The 20-round lob-fest tail. (d) Being out-damaged 2:1 on the *easiest* setting.

---

## Recommendations (prioritised)

1. **Dial down AI aggression / launch volume at easy (highest impact).** The human is out-hit 10.37 to 5.02. At the easiest setting the target should be rough parity or a human advantage. Reduce AI launches-per-turn or AI targeting priority on the human specifically so hits-taken ≈ hits-landed. This is the single lever most likely to move win-rate from 18% toward a level-appropriate 50%+.

2. **Cut the pyrrhic rate (currently 42%).** The endgame rewards the last swing over survival. Introduce an endgame survival incentive — cheaper/stronger shields in the final phase, damage falloff as leader count drops, or an AP tax on all-in final salvos — so a decisive last strike doesn't reliably kill the striker. Goal: push pyrrhic well below 25% so "winning" usually means "surviving."

3. **Rebalance the AI cast, or make "easy" gentle across the board.** chump (40) + mileigh-hem (36) win 76%; carnage (3) + netanyahoo (3) are fodder that die rounds 4–8. Either the "easy" setting should suppress the two dominant AIs (not just create early victims), or the four AIs should be brought toward parity so the human isn't effectively fighting two bosses.

4. **Fix the attritional tail.** Once ≤3 leaders remain with depleted arsenals, games drip 1-launch/0-impact for up to ~30 rounds (easy-54). Add escalating AP over time, a soft round-count pressure that raises stakes late, or improved targeting so a trailing leader can't limp indefinitely. Median pacing is good; only the tail needs surgery.

5. **Stop surfacing `avgPlacement` as a player metric.** It reads 1.5 (dist {1:50, 2:50}) but is a cast-order tie-break among zero-population leaders (see `runner.ts:143`), not earned rank — it makes the human look like it's placing top-2 every game while it actually dies 82% of the time. Report win-rate and survival-rate; drop or relabel placement.

6. **Reconsider the intended human baseline for "easy."** The policy under test is deliberately measured (never first-strike). If the design intent is that a reasonable, non-aggressive player should comfortably clear the easiest level, the AI must be gentle enough that pure retaliation wins the majority. Today retaliation loses 82%, so either the AI is too hot for the label or the level should be renamed to reflect its real difficulty.
