# AI behaviour findings — warhead mix, hoarding, game length

Follow-up analysis across all 300 games (100 per level), computed by
`scripts/playability/extra.ts` (deterministic replay of the same seeds; AI =
the four computer players, i.e. every cast member except the human `player1`).
Every number below is machine-computed, not eyeballed.

## Q1 — Did the AI mostly use small nukes? Yes, and more so as difficulty rises.

Share of AI warheads **fired**, by yield (built mix is within ~1pt, so they
fire what they build):

| Level  | small | medium | large |
|--------|-------|--------|-------|
| easy   | 71.3% | 16.4%  | 12.4% |
| normal | 89.2% | 7.0%   | 3.8%  |
| hard   | 98.5% | 1.5%   | 0.0%  |

Small warheads dominate everywhere. The trend is monotonic: the *harder* the
level, the *more* the AI concentrates on small warheads (hard is almost purely
small, and never fired a single large warhead in 100 games). Small warheads are
the cheapest, most AP-efficient way to keep a salvo in the air; the tuned
planners converge on them. The large-warhead usage on **easy** is the exception,
and it is a symptom of randomness, not strategy (see the paradox below).

## Q2 — Did they fire evenly or hoard? They fire almost everything, front-loaded — not hoarders.

**Almost no hoarding.** Warheads fired as a percentage of warheads built:

| Level  | fired/built | leftover warheads at game end (all 4 AI, per game) |
|--------|-------------|-----------------------------------------------------|
| easy   | 91.7%       | 3.95 |
| normal | 95.4%       | 2.71 |
| hard   | 95.6%       | 3.11 |

The AI builds warheads to shoot them, not to stockpile. The small leftover
(~3–4 warheads across all four AI combined) sits mostly on leaders who die
before they can fire the last one — and final-retaliation empties even that on
elimination.

**Cadence is front-loaded, not even.** Share of all AI launches by game-third:

| Level  | early | mid  | late |
|--------|-------|------|------|
| easy   | 40.8% | 34.2%| 25.0%|
| normal | 45.5% | 33.9%| 20.6%|
| hard   | 38.1% | 39.6%| 22.4%|

They open aggressively — the early/mid thirds carry ~75–80% of all launches —
and taper in the final third, largely because leaders are dead by then and there
are fewer guns left firing. There is no "build up quietly, then unload" hoarding
pattern; the shooting starts early and thins out as the board empties.

## Q3 — Average game length

| Level  | avg rounds | median | min | max |
|--------|------------|--------|-----|-----|
| easy   | 15.21      | 15     | 6   | 36  |
| normal | 17.47      | 17     | 8   | 34  |
| hard   | 17.37      | 17     | 17  | 18  |

Easy games are the **shortest** (and the widest spread). Hard is almost fixed at
17–18 rounds — a symptom of its near-deterministic script (see the hard
playability report).

## Bonus — why is the human's success lower on easy (8% survival) than normal (18%)?

Counter-intuitive, but the AI-behaviour data explains it. "Easy" injects **30%
random AI moves**; that does not make the AI weaker in a way that helps a
cautious human — it makes them **chaotic and more lethal**:

- easy AI fires **large** warheads 3× as often as normal (12.4% vs 3.8%) — random
  deviation from the tuned small-warhead plan puts bigger, deadlier strikes on
  the board,
- easy games are **shorter** (15.2 vs 17.5 rounds) and far more often end in
  **mutual annihilation** (42% pyrrhic vs 17% — see the per-level reports).

The human proxy is *measured-reactive*: it waits, retaliates, and never opens
fire. Against sharp-but-predictable **normal** AI (mostly small warheads,
consistent targeting), games run longer and resolve to clean single-survivor
endings a patient player can outlast → 18% survival. Against **erratic easy** AI,
big random strikes land unpredictably and the board detonates before any stable
order emerges → the passive human is caught in the crossfire → 8% survival.

**Takeaway:** lowering AI skill *raised outcome variance and lethality*, which
punishes a cautious human more than a competent-but-legible opponent does. If
"easy" is meant to be gentler for new players, the current randomness knob is the
wrong lever — it should reduce AI aggression/targeting quality, not add noise
that manifests as bigger, more chaotic nukes.
