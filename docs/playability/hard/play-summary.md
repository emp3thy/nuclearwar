# Playability Run Summary — hard

Source: `docs/playability/hard/games.jsonl` (100 games), aggregated via `scripts/playability/aggregate.ts`. All numbers below come directly from the aggregate JSON.

## Run scope

- Level: hard
- Games played: 100
- Finished: 100
- Unfinished (hit 60-round cap): 0

## Outcome distribution

- pyrrhic: 100
- survivor: 0
- apocalypse: 0
- unfinished: 0

## Winner distribution

- mileigh-hem: 63
- player1 (human): 37

## Human metrics (player1)

- Win rate: 37%
- Survival rate: 0%
- Win-or-survive rate: 37%
- Average placement: 1 (placement distribution: 1st in 100/100 games)
- Average final population: 0
- Average eliminated round: 17.37
- Average launches made: 6.37
- Average launches received: 20
- Average hits landed: 3.37
- Average hits taken: 19

## Game-level metrics

- Average rounds: 17.37 (median 17, min 17, max 18)
- Average total launches: 74.63
- Average total impacts: 70.63
- Average eliminations per game: 5

## Anomalies

- Every one of the 100 games ended `pyrrhic` — mutually assured destruction with no survivors. There are zero `survivor`, `apocalypse`, or `unfinished` outcomes.
- Human survival rate is 0% despite a 37% win rate: every human "win" is a pyrrhic win (humanWon true, humanSurvived false).
- Average final population is 0 and average eliminations per game is 5, i.e. the entire five-player cast dies in every game.
- Average placement is reported as 1 across all 100 games (placement distribution 100% first place), which reflects the pyrrhic scoring where the last leader standing is ranked first even though it also dies.
- Rounds are tightly clustered (17–18), indicating a consistent end-state rather than variable game lengths.
