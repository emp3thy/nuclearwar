# Human strategy comparison — 3 play-styles vs AI, per difficulty

Each cell is **100 games of one human strategy (player1) against the same four
AI** (chump, carnage, netanyahoo, mileigh-hem) — the humans do **not** play each
other. 900 games total. Numbers are machine-computed by
`scripts/playability/aggregate.ts`; per-game records live in
`docs/playability/strategies/<policy>/<level>/`.

The three human strategies:
- **cautious** — measured reactive: never first-strikes; on being hit it defends and retaliates (low escalation); finishes an already-wounded rival.
- **balanced** — economy + defence + measured offence: retaliates hard and pushes to eliminate a *reasonable* attacker; pre-empts the weakest rival; keeps investing.
- **aggressive** — all-in: first strike round 1, unloads every round at the strongest rival; no defence, no diplomacy.

Shared rule (per design): a hit player defends and tries to eliminate the
attacker when it is a reasonable fight — applied to cautious and balanced;
aggressive is already attacking everyone.

## Results

| Strategy | Level | Win% | Survive% | Avg placement (of 5) | Avg elim round | Avg rounds | Avg launches | Avg hits taken |
|---|---|---|---|---|---|---|---|---|
| cautious | easy | 6 | 6 | 1.55 | 12.3 | 15.8 | 4.0 | 9.2 |
| cautious | normal | 5 | 4 | 1.84 | 14.1 | 18.5 | 4.4 | 11.4 |
| cautious | hard | 0 | 0 | 1.75 | 12.0 | 14.3 | 5.0 | 16.0 |
| balanced | easy | 7 | 2 | 1.57 | 11.6 | 15.4 | 4.2 | 10.1 |
| balanced | normal | 5 | 4 | 1.79 | 14.3 | 19.3 | 5.2 | 11.2 |
| balanced | hard | **5** | 0 | **1.44** | **15.7** | 17.2 | 7.3 | 10.2 |
| aggressive | easy | 1 | 0 | 1.50 | **6.9** | 12.0 | 7.7 | 10.5 |
| aggressive | normal | 0 | 0 | 1.80 | 6.8 | 14.7 | 7.4 | 13.5 |
| aggressive | hard | 0 | 0 | 1.63 | 8.7 | 15.6 | 7.0 | 13.5 |

## Does play-style help a human against the AI?

**Yes — the ranking is consistent: balanced ≥ cautious ≫ aggressive.** But the
ceiling is low: even the best line wins ≤7% and survives ≤6%. Against four AI on
this cast the human is an underdog no matter what — strategy shifts the odds, it
doesn't flip them.

- **Aggressive (all-in) is the worst by a wide margin.** It never survives, wins
  ≤1%, and — most tellingly — **dies roughly twice as fast** (eliminated round
  ~7 vs ~13–16 for the others). Opening fire spreads grudges across the whole AI
  board at once and draws concentrated return fire before the human has an
  economy or defence. "Let them have it" gets *you* had. Going loud is a trap.
- **Balanced is the best all-rounder and the only strategy that scores on hard.**
  It posts the best average placement at every level, the longest survival on
  hard (elim round 15.7 vs 12.0 cautious), and the only non-zero hard win rate
  (5%). Investing in economy + defence while retaliating selectively lets it
  outlast the AI melee further than pure caution.
- **Cautious is a close second on easy/normal but folds on hard.** Slightly
  higher easy survival (6%) than balanced, comparable on normal, but 0% win/
  survive on hard where it also takes the most hits (16/game) — passivity lets
  the deterministic hard AI grind it down.

## Interaction with difficulty

- **Hard crushes passivity, rewards the balanced war economy.** Cautious and
  aggressive both go to 0% wins on hard; only balanced (which actually builds up)
  wins 5% and places best (1.44). Hard's higher lethality punishes both doing
  nothing and doing everything — the middle line survives longest.
- **The easy paradox persists across strategies.** As in the base study, easy is
  *not* the gentlest for a human: its 30% AI randomness makes games shorter and
  more pyrrhic, so survival on easy is not reliably better than normal for any
  strategy (cautious 6%→4%, balanced 2%→4%). Difficulty label ≠ difficulty
  experienced.
- **Harder retaliation is counter-productive for survival.** This study's cautious
  uses the escalating "eliminate the attacker" rule; its normal-level survival
  (4%) is well below the *18%* the simpler measured-reactive cautious scored in
  the base study (`docs/playability/normal/`). Chasing kills on your attacker
  buys more grudges than it removes threats — a real signal that the "defend +
  eliminate attacker" instinct, while intuitive, hurts a human's odds here.

## Recommendations

1. **The human is too weak vs four AI regardless of strategy** (≤7% win). If the
   game is meant to be winnable solo, cut opponent count for the default game or
   give the human slot an economic/defensive edge — strategy alone can't close a
   7% ceiling.
2. **Make aggression viable, or signal that it isn't.** All-in is strictly
   dominated and dies fastest. Either add a first-mover payoff (e.g. eliminating
   a rival early should reduce incoming, not multiply it) or surface to players
   that unprovoked aggression paints a target on them.
3. **Reward defence on hard.** Balanced wins on hard *because* it builds; cautious
   dies taking 16 hits/game. If defence mattered more (stronger/cheaper shields),
   the reactive lines would have a survivable path instead of collapsing to 0%.
4. **Reconsider the retaliation instinct.** Escalating to eliminate an attacker
   lowered survival vs simple measured retaliation — worth tuning AI grudge
   accrual so proportionate response isn't self-defeating.
5. **Fix the "easy" knob** (carried from the base study): randomness makes easy
   more chaotic/lethal, not gentler. Easy should lower AI aggression/targeting
   quality, not add noise.
