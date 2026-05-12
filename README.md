# nuke

Browser-based parody nuclear-war game. See `docs/superpowers/specs/2026-05-08-nuke-design.md` for the full design spec.

## Status

Phase 1 ships the engine core (no UI, no AI personalities). Verification is `npm run test:run`.

## Quickstart

    npm install
    npm test             # vitest watch
    npm run test:run     # vitest single run
    npm run typecheck    # tsc --noEmit

## Phase 1 status

The engine core is complete. Verification:

    npm run test:run     # all suites green
    npm run typecheck    # tsc --noEmit clean

What's in `src/engine/`:

- Full action set (factories, missiles, bombers, S/M/L warheads, shields, AA, launches with people/infra targeting, propaganda, wooing).
- Spec §3 phase order: defences → builds → propaganda → wooing → launches → final retaliations → status update.
- Spec §6 overwhelm intercept curve.
- All four win conditions: survivor, pyrrhic, apocalypse, dominance.
- Per-leader AP bonus rules (Netanyahoo launch bonus; Mileigh-hem aggression bonus; Chump defence-waste hooked but inert until P2).
- Determinism: same seed + same orders → identical events (property-tested across 25 seeds).

What's NOT in `src/engine/`:

- Asymmetric AI personalities (`planAi`). Phase 2.
- Difficulty levels. Phase 2.
- AI-duel headless test mode. Phase 2.
- Any UI / Vite / React. Phase 3.
- Flavour bank wiring, Disparage cameo, masthead rotation. Phase 4.
- Audio, persistence, replay scrubber, PWA, animations. Phase 4.

## Phase 2 status

Phase 2 ships AI personalities, difficulty levels, and an AI-duel headless test mode. Verification is `npm run test:run` (146 tests, 25 files).

### What's in `src/engine/ai/`

- Six per-leader scoring modules implementing spec §7 personalities:
  - `chump.ts` — Coward (defence + warhead bias; refuses to launch at leaders wooing him; prefers Infra targeting).
  - `khameneverhere.ts` — Grudge (launches focus on top of grudge list).
  - `netanyahoo.ts` — Warmonger (Chump-exception: no launch at Chump until Chump attacks first; propaganda exclusively at Chump; biases toward largest-arsenal target).
  - `carnage.ts` — Rational + Opportunist (threat = arsenal + recent_aggression; escalation multiplier on attackers).
  - `starmless.ts` — Cautious + Scapegoat (defensive baseline; 35 % scapegoat roll on retaliation).
  - `mileighhem.ts` — Glass cannon (two modes gated by `apBanked + ap >= 4`).
- `scoring.ts` — shared primitives: `threatScore`, `opportunismScore`, `defenceVisibilityScore`, `populationAdvantage`, `wasAttackedBy`, `topGrudgeTarget`.
- `lookahead.ts` — Hard-mode 1-ply expectiminimax (`simulateOneRound`, `scoreState`, `bestTargetByLookahead`). For each candidate launch target, builds a projected next-round state with all other leaders simulated at Normal difficulty (no recursion), then picks the target with the best projected population delta.
- `index.ts` — `planAi(state, leaderId, difficulty?)` dispatcher. Difficulty levels: Easy 30 % random moves, Normal 10 % random, Hard 0 % random + lookahead.

### Engine plumbing added in P2

- Resolution-time grudge / aggression updates (`resolution.ts`): bumps `grudge[from]` (yield-weighted) and `recentAggressionFrom[from]` per impact event, including FR cascade impacts.
- FR target picker switched to grudge-weighted draw with uniform fallback (`finalRetaliation.ts`). Preserves P1 behaviour when grudge map is empty.

### Known balance issues (deferred to P4)

The AI-duel headless test (`tests/engine/ai-duel.test.ts`) runs 100 all-AI games at Normal difficulty and prints the win distribution. The first run produced:

    chump 17 / khameneverhere 0 / starmless 0 / carnage 6 /
    mileigh-hem 0 / netanyahoo 39 / unfinished 38

Two structural imbalances are responsible:

- Mutual shield-saturation in 6-leader games causes ~38 % stalemates within 100 rounds. Raising `maxRounds` to 300 does not change the distribution — the equilibrium is stable, not just slow.
- Reactive personalities (Khameneverhere, Starmless, Mileigh-hem) need an attacker to bootstrap. In a grid of passive or woo-heavy AI, they never fire.

Per the standing convention, AI scoring-weight tuning is deferred to a balance pass after P3 lands and humans can play. The duel test in P2 asserts only that the engine ran 100 games without crashing; balance assertions land in P4.

### What's NOT in `src/engine/ai/`

- Production UI / Vite / React. Phase 3.
- Flavour bank wiring / Disparage cameo / masthead rotation / audio / persistence / replay scrubber / PWA / animations. Phase 4.
- Per-personality scoring weight tuning. Deferred to P4 balance pass.

## Phase 2.5 status

Phase 2.5 adds a separate human player slot. The human plays a configurable country (default: Rufus T. Firefly / 🦆 Freedonia from *Duck Soup*) rather than taking over an AI character.

What's in `src/engine/`:

- `LeaderId` extended with `'player1' | 'player2' | 'player3' | 'player4' | 'player5'`. Forward-compatible to ≤5-human hotseat games without further engine changes.
- `isHuman(id)` derived helper in `state.ts` — one-line predicate, no stored field on `Leader`.
- `GameConfig.playerProfiles` override lets the Setup screen replace the default name/country per player slot at game-start. Mirrors the existing `startPopOverride` pattern.
- `GameState.lastOrders` persists each round's submitted orders. Hard-mode lookahead reads it for human opponents and projects them as repeating last round's orders (better than treating them as passive).
- `planAi()` and `dispatch()` throw when called for human leaders; `bestTargetByLookahead()` substitutes the human's `lastOrders` into the simulated round.

What's NOT in this phase:

- Production SVG art for the Freedonia flag (Phase 3 art workstream — current implementation is the engine-level `🦆 Freedonia` glyph + name string).
- Setup-screen UX for editing player name/country. Phase 3 wires the override through.
- Multi-human hotseat coordination (passing-the-device curtain). Phase 3 / 4 UX work.
- Approach B (sliding-window history) and Approach C (personality-fit modelling) for human prediction — deferred; can be added later without engine refactor.

## Phase 3 status

Phase 3 ships the thin React UI shell — the first playable build in a browser. Six functional screens (Setup, Planning, AI Conferring, Action, Round Summary, Winners) navigable via a screen state machine, mockup-matched CSS via CSS Modules, end-to-end round loop.

What's in:

- `src/ui/` — React 18 + Vite 5 + TypeScript scaffold with CSS Modules per screen
- Setup screen with player profile inputs (default Rufus T. Firefly / 🦆 Freedonia, editable), AI cast picker (2-4 of 6), difficulty radio, optional seed
- Planning screen with own country panel, history strip, leaders table, order form (validated via engine `validateOrder`), order queue, tap-and-hold (600ms) Seal Orders
- AI Conferring beat (1.5s cosmetic delay + pulsing dots)
- Action screen with phase-grouped event cards (no animations, no world map)
- Round Summary with rule-based headline picker, casualty strip, world-reactions list (OBITUARY rows for eliminated leaders)
- Winners with headline by outcome type, sub-line, death-toll table sorted by % lost, New Game / Same Cast Again
- Minimum UI tests (Vitest + jsdom + React Testing Library): OrderForm validation, ApBudget computation
- Engine refactor: `GameState.lastOrders` (P2.5) → per-round `GameState.orderHistory` (positions P4a's replay scrubber + advanced AI lookahead as logic-only changes)

What's NOT in this phase (deferred to P4a / P4b):

- Hotseat Handoff screen (multi-human game flow) — P4a
- Persistence (localStorage save/load + Resume entry point + action log) — P4a
- Replay timeline scrubber UI on Winners screen — P4a (engine data already supports it via orderHistory)
- Animations (Framer Motion, 1.8s/event Action pacing, Fast Resolve toggle, missile arcs, damage badges) — P4a
- Flavor banks (per-leader speech-bubble lines, mood lines on leader cards, tabloid quotes, OBITUARY last-words) — P4a
- Disparage cameo mechanic — P4a
- Masthead rotation pool — P4a
- Audio (`play(name)` wrapper, sfx + ambient music) — P4a
- SVG art (leader portraits, world map, Freedonia flag, mushroom-cloud illustration, ruined-iconography) — P4a
- PWA manifest + service worker — P4a
- Soft-warn validation in Planning — P4a
- AI scoring-weight balance pass + AI-duel balance assertions — P4b
- Approach B / C upgrades to Hard-mode lookahead — P4b

## Phase 4a status

Phase 4a (Satire + Hotseat) ships multi-human hotseat support plus the full satirical voice — flavor banks wired into events, Disparage cameo on Action and Round Summary, masthead rotation, and 3 soft-warns on Planning. Verification: `npm run test:run` (217 tests, 35 files).

What's in this phase:

- **Hotseat Handoff** — 2–5 humans on one device, country-forward curtain between turns, cast-index turn order. Solo (1 human) skips the curtain.
- **Flavor banks** — six leader banks + Disparage bank under `src/engine/flavor/`. Engine picks lines deterministically (seeded RNG) at resolution time, bakes them into existing event variants (`attackerQuote`, `targetQuote`, etc.) and emits new flavor events (`PreRoundMood`, `PostRoundReaction`).
- **Disparage cameo** — `cameo.ts` rolls Action overlays (~17.5 % per impact) and the Round Summary column (~33 % per round). Column-named leader's next-round Planning mood line snap-backs; skipped silently if eliminated.
- **Masthead rotation** — 15-name pool Fisher-Yates shuffled at game start; one per round; apocalypse override.
- **Soft-warn validation** — Planning aside panel with 3 warnings (warhead-no-delivery, delivery-no-warhead, woo-non-attacker). Hidden when no warnings.

What's NOT in this phase (deferred to P4b / P5):

- AI scoring-weight balance pass + AI-duel balance assertions — P4b
- Approach B / C upgrades to Hard-mode lookahead — P4b
- Persistence (localStorage save/load + Resume + action log) — P5
- Replay timeline scrubber UI on Winners — P5
- Animations (Framer Motion, missile arcs, damage badges, Fast Resolve toggle) — P5
- Flavor presentation: speech-bubble animations, mood-line treatment — engine carries the data; P5 prettifies
- Audio (`play(name)` wrapper, sfx + ambient music) — P5
- SVG art (leader portraits, world map, Freedonia flag, mushroom-cloud illustration, ruined-iconography) — P5
- PWA manifest + service worker — P5
