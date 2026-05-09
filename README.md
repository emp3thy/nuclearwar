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
