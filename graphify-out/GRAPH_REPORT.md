# Graph Report - nuke  (2026-07-20)

## Corpus Check
- 143 files · ~189,196 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 502 nodes · 836 edges · 29 communities detected
- Extraction: 78% EXTRACTED · 22% INFERRED · 0% AMBIGUOUS · INFERRED: 183 edges (avg confidence: 0.82)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `9285f03e`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 40|Community 40]]
- [[_COMMUNITY_Community 41|Community 41]]
- [[_COMMUNITY_Community 42|Community 42]]
- [[_COMMUNITY_Community 76|Community 76]]
- [[_COMMUNITY_Community 77|Community 77]]
- [[_COMMUNITY_Community 78|Community 78]]
- [[_COMMUNITY_Community 79|Community 79]]
- [[_COMMUNITY_Community 80|Community 80]]
- [[_COMMUNITY_Community 81|Community 81]]
- [[_COMMUNITY_Community 82|Community 82]]
- [[_COMMUNITY_Community 83|Community 83]]

## God Nodes (most connected - your core abstractions)
1. `initialState()` - 70 edges
2. `resolveRound()` - 28 edges
3. `validateOrder()` - 27 edges
4. `dispatch()` - 26 edges
5. `apCostOf()` - 23 edges
6. `reduce()` - 21 edges
7. `isHuman()` - 21 edges
8. `buildToward()` - 20 edges
9. `nextRandom()` - 18 edges
10. `launchSalvo()` - 17 edges

## Surprising Connections (you probably didn't know these)
- `BugBot fix: circular ESM dependency (dispatch.ts extracted from index.ts)` --rationale_for--> `dispatch()`  [INFERRED]
  docs/superpowers/plans/2026-05-09-phase-2-ai-personalities.md → src/engine/ai/dispatch.ts
- `makeBase()` --calls--> `initialState()`  [INFERRED]
  tests/engine/ai/lookahead.test.ts → src/engine/state.ts
- `makeGame()` --calls--> `initialState()`  [INFERRED]
  tests/ui/newspaper.test.ts → src/engine/state.ts
- `makeGame()` --calls--> `initialState()`  [INFERRED]
  tests/ui/WorldMap.test.tsx → src/engine/state.ts
- `BugBot fix: FR cumulative >= threshold boundary bug (zero-weight survivor)` --rationale_for--> `applyFinalRetaliation`  [INFERRED]
  docs/superpowers/plans/2026-05-09-phase-2-ai-personalities.md → src/engine/finalRetaliation.ts

## Hyperedges (group relationships)
- **P2 personality dispatch fan-out (all six plan* functions routed via dispatch)** — ai_dispatch_dispatch, ai_chump_planChump, ai_carnage_planCarnage, ai_khameneverhere_planKhameneverhere, ai_netanyahoo_planNetanyahoo, ai_starmless_planStarmless, ai_mileighhem_planMileighHem [EXTRACTED 1.00]
- **Scoring substrate (shared primitives consumed across personality planners)** — ai_scoring_threatScore, ai_scoring_opportunismScore, ai_scoring_wasAttackedBy, ai_scoring_defenceVisibilityScore, ai_scoring_topGrudgeTarget, ai_carnage_planCarnage, ai_chump_planChump, ai_netanyahoo_planNetanyahoo, ai_starmless_planStarmless, ai_khameneverhere_planKhameneverhere, ai_mileighhem_planMileighHem [INFERRED 0.95]
- **PR #3 BugBot fix iteration (three caught bugs: FR boundary, circular ESM, randomization bounds)** — plan_p2_bugfix_fr_boundary, plan_p2_bugfix_circular_esm, plan_p2_bugfix_randomization_bounds, finalRetaliation_applyFinalRetaliation, ai_dispatch_dispatch, ai_index_applyRandomization [INFERRED 0.95]

## Communities (84 total, 13 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.06
Nodes (28): buildOrder(), tryAdd(), runOneGame(), state(), setup(), runGame(), totalApCost(), validateOrderSequence() (+20 more)

### Community 1 - "Community 1"
Cohesion: 0.08
Nodes (30): applyDefenceBuilds(), applyOtherBuilds(), pickColumnNamedLeader(), shouldRollCameo(), shouldRollColumn(), factoriesDestroyed(), interceptProbability(), peopleDeaths() (+22 more)

### Community 2 - "Community 2"
Cohesion: 0.18
Nodes (26): buildOrderFor(), buildToward(), currentCount(), launchSalvo(), pickStrongestRival(), planBurnem(), planCarnage(), planChump() (+18 more)

### Community 3 - "Community 3"
Cohesion: 0.09
Nodes (15): formatEventCard(), name(), actorOf(), LaunchArc(), launchArcPath(), receiversOf(), buildPlaybackSteps(), isRenderable() (+7 more)

### Community 4 - "Community 4"
Cohesion: 0.08
Nodes (25): Flavour Bank â€” Six-Leader Cast Table, Newspaper Masthead Rotation Pool, Action / Resolution Screen Mockup (World Map), Action Screen â€” Damage Badge (comic-tilted red stamp), Action Screen â€” Phase Tracker (Defence/Builds/Propaganda/Launches/Final Retal.), Action Screen â€” Actor/Receiver Portraits with Speech Bubbles, Action Screen â€” Stylised World Map (SVG), Planning Screen Mockup (+17 more)

### Community 5 - "Community 5"
Cohesion: 0.11
Nodes (23): Carnage â€” Flavour Lines (Rational Escalator / Canada), Chump â€” Flavour Lines (Coward / US), Khameneverhere â€” Flavour Lines (Grudge / Iran), Mileigh-hem â€” Flavour Lines (Glass Cannon / Argentina), Netanyahoo â€” Flavour Lines (Warmonger / Israel), Flavour Bank Line Schema (src/engine/flavor/{leader}.ts), Starmless â€” Flavour Lines (Cautious+Scapegoat / UK), P1 Task 7 â€” Combat (interceptProbability, overwhelm curve) (+15 more)

### Community 6 - "Community 6"
Cohesion: 0.15
Nodes (15): bestTargetByLookahead(), recentHumanOrders(), scoreState(), simulateOneRound(), makeBase(), isHuman(), extractFlag(), flagFor() (+7 more)

### Community 7 - "Community 7"
Cohesion: 0.13
Nodes (21): applyRandomization (Easy/Normal noise), planAi (difficulty-aware orchestrator), bestTargetByLookahead (1-ply expectiminimax), scoreState, simulateOneRound, applyFinalRetaliation, AI-duel balance assertions deferred to P4 (infrastructure-only in P2), Phase 2 AI Personalities Implementation Plan (+13 more)

### Community 8 - "Community 8"
Cohesion: 0.16
Nodes (11): stripFlag(), pickSubhead(), makeGame(), deriveBoxScore(), deriveForecast(), deriveMarket(), derivePhotoCaption(), deriveStories() (+3 more)

### Community 9 - "Community 9"
Cohesion: 0.13
Nodes (20): planCarnage (Rational + Opportunist), planChump (Coward), planKhameneverhere (Grudge), planMileighHem (Glass cannon), planNetanyahoo (Warmonger), defenceVisibilityScore, opportunismScore, threatScore (+12 more)

### Community 10 - "Community 10"
Cohesion: 0.13
Nodes (3): canLaunch(), warheadsLeftFor(), findLastIndexMatching()

### Community 12 - "Community 12"
Cohesion: 0.33
Nodes (9): BurnemFace(), CarnageFace(), ChumpFace(), DisparageFace(), GrouchoFace(), KhameneverhereFace(), MileighFace(), NetanyahooFace() (+1 more)

### Community 13 - "Community 13"
Cohesion: 0.24
Nodes (3): analyseOrderSequence(), Planning(), projectInventory()

### Community 18 - "Community 18"
Cohesion: 0.5
Nodes (4): P2 Rationale â€” 1-ply Expectiminimax over pure minimax (K=5 targets, opponents at Normal), P2 Task 11 â€” Hard Mode 1-ply Expectiminimax Lookahead (lookahead.ts), P2 Task 10 â€” planAi Dispatcher + Difficulty Wrapper (index.ts), Spec â€” Difficulty Model Easy/Normal/Hard (Â§7)

### Community 22 - "Community 22"
Cohesion: 0.67
Nodes (3): P1 Task 12 â€” Final Retaliation Cascade, P2 Task 2 â€” Resolution-time Grudge/Aggression State Wiring, Spec â€” Final Retaliation Cascade Mechanic (Â§6)

### Community 23 - "Community 23"
Cohesion: 0.67
Nodes (3): Nigel Disparage â€” Cameo Flavour Lines (non-playable), Disparage Snap-back Lines (per-leader preRoundMood), Spec â€” Nigel Disparage Cameo Mechanic (Â§8)

## Knowledge Gaps
- **45 isolated node(s):** `nuke â€” Browser Parody Nuclear-War Game`, `Phase 1: Engine Core (completed)`, `Phase 2: AI Personalities (completed)`, `AI-Duel Balance Issues (deferred to P4)`, `Disparage Snap-back Lines (per-leader preRoundMood)` (+40 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **13 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `initialState()` connect `Community 0` to `Community 1`, `Community 2`, `Community 3`, `Community 6`, `Community 8`?**
  _High betweenness centrality (0.137) - this node is a cross-community bridge._
- **Why does `isHuman()` connect `Community 6` to `Community 0`, `Community 1`, `Community 2`, `Community 3`, `Community 8`, `Community 13`, `Community 15`?**
  _High betweenness centrality (0.115) - this node is a cross-community bridge._
- **Why does `dispatch()` connect `Community 2` to `Community 6`, `Community 7`, `Community 9`, `Community 15`, `Community 21`?**
  _High betweenness centrality (0.103) - this node is a cross-community bridge._
- **Are the 23 inferred relationships involving `initialState()` (e.g. with `reduce()` and `seedFromString()`) actually correct?**
  _`initialState()` has 23 INFERRED edges - model-reasoned connections that need verification._
- **Are the 19 inferred relationships involving `resolveRound()` (e.g. with `reduce()` and `isHuman()`) actually correct?**
  _`resolveRound()` has 19 INFERRED edges - model-reasoned connections that need verification._
- **Are the 11 inferred relationships involving `validateOrder()` (e.g. with `buildToward()` and `launchSalvo()`) actually correct?**
  _`validateOrder()` has 11 INFERRED edges - model-reasoned connections that need verification._
- **Are the 13 inferred relationships involving `dispatch()` (e.g. with `planChump()` and `planCarnage()`) actually correct?**
  _`dispatch()` has 13 INFERRED edges - model-reasoned connections that need verification._