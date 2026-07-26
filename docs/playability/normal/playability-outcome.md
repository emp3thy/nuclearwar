# Playability Outcome — normal

## Verdict: FAIR

Normal is the most balanced, contested level in the set: the human wins **28%** of games — above the 20% fair share for a five-player free-for-all — finishes **1st or 2nd in every single game**, and no AI runs away with it (top AI chump at 32%). Games always resolve (0 unfinished, 0 apocalypse) at a healthy median 17 rounds. It is genuinely winnable and player skill clearly matters. It is docked from "great" by three real blemishes: victory almost always means dying too (survival 18% vs win 28%), one cast member is dead weight, and long games rot into a boring missile-whiff stalemate.

_All figures from `scripts/playability/aggregate.ts normal`; examples from `docs/playability/normal/games.md`._

## Is it fun / fair / winnable?

**Winnable: yes.** 28% win rate beats random share, and the ceiling is real and satisfying — `normal-30` ends with the human on 17M population, `normal-80` on 14M, and there are clean, decisive survivor wins throughout (`normal-9`, `normal-63`, `normal-34`, `normal-40`). A human who plays the measured-reactive line reaches the endgame every time.

**Fair: yes.** The winner distribution (chump 32 / player1 28 / mileigh-hem 21 / carnage 19) is well-spread, so no opponent feels unbeatable and the human is the second-strongest agent at the table. The human is never a cull victim — it is always in the final two.

**Fun: mostly, with a sour aftertaste.** The problem is emotional payoff. The human's average final population is **1.16M**, and 10 of every 28 wins are pyrrhic — you press the winning button and die in the same breath (`normal-25`, `normal-85`, `normal-89`). Even outright wins usually leave you a smoking ruin. And because placement is strictly 1st-or-2nd with 2nd always meaning dead, there is no satisfying "I fought well and survived in second" outcome — it is total victory or a corpse.

## Player agency

**Agency is real, not decided by the AI melee.** The strongest evidence: across 100 games the human never once places worse than 2nd. A passive or badly-played seat in a 5-way brawl would land 3rd–5th regularly; the human never does. The measured-reactive policy — invest early, hold a shield, retaliate, never open with a first strike — reliably carries the player past the opening cull (which reliably eats netanyahoo and often carnage) and into the deciding exchange. The player's choices determine whether they arrive at the endgame healthy (`normal-30`, `normal-80`: won with 14–17M) or on fumes.

The ceiling on agency is the trade ratio. The human takes **11.64** hits for every **6.84** it lands and receives more launches (12.53) than it sends (10.83). So the player controls _reaching_ the endgame far more than _surviving_ it — the final duel is often a coin-flip decided by who has population left, and the human frequently arrives with too little. That is where agency hands off to variance.

## Difficulty feel

- **Pacing:** Good in the median — 14–21 rounds is a satisfying arc. But the long tail is broken: `normal-2` runs 34 rounds with `1 launch, 0 impacts` from r10 to r33; `normal-95` (25 rounds) and `normal-59` (23 rounds) show the same dead-air whiff-fest between two crippled survivors. When normal runs long it is tedium, not tension.
- **Snowballing:** Mild and healthy at the game level — the early salvos cull the weak, then volume tapers. No single AI snowballs across the run.
- **Frustration points:** (1) The pyrrhic win — landing the kill and dying anyway feels like a bug, not a victory (17% of all games). (2) Occasional abrupt deaths from concentrated early fire — eliminated round 4 in `normal-6`/`normal-44`/`normal-81`, a round-5 triple-KO in `normal-60`, 16 hits taken by round 9 in `normal-33`. These feel like getting focus-fired with no counterplay. (3) netanyahoo as a free kill flattens the opening — every game starts by everyone dogpiling the same doomed seat.
- **Dominant strategy:** The measured-reactive line is clearly correct (it guarantees top-2), but it is under-rewarded on survival. There is no strategic lever that converts "reach the endgame" into "win the endgame clean" — the player can't meaningfully out-defend the incoming volume.

## Recommendations (prioritised)

1. **Fix netanyahoo (highest impact, lowest risk).** 0 wins in 100 games and near-always first to die makes 20% of the cast a scripted punching bag and homogenises every opening. Raise its aggression/defence to competitive parity so the early game isn't a foregone dogpile. This alone diversifies opening dynamics across the whole run.
2. **Close the pyrrhic gap — make winning survivable.** Survival (18%) trailing wins (28%) means victory usually costs the human its life. Nudge the **defence economy** so a player who invested in shields can actually absorb the final exchange: cheaper/stronger late-game defence, or a small damage-falloff when a target is already near-dead. Target: pull survival rate up toward the win rate so clean wins outnumber pyrrhic ones.
3. **Kill the stalemate tail.** Games of 24–34 rounds are single-missile whiff-fests, not drama. Add an escalation/pressure mechanic in the late game (rising damage, shrinking defence, or a soft round-pressure that forces resolution) so two crippled survivors resolve within a few rounds instead of lobbing misses for 20. Keeps the median arc intact while removing the dead air.
4. **Soften early focus-fire spikes (lower priority).** Round-4/5 eliminations (`normal-6`, `normal-60`, `normal-81`) come from concentrated opening volleys with no counterplay. Consider a small early-game defence floor or a cap on how much fire one seat can take in the first few rounds, so the game is decided by play rather than by who the AIs happen to gang up on first.

Overall: normal is a keeper baseline — fair, winnable, contested. The work is not rebalancing difficulty but polishing the _texture_ of winning (survivable victories) and the _shape_ of the cast (retire the punching bag, cut the stalemate tail).
