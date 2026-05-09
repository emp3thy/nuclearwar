# nuke

Browser-based parody nuclear-war game. See `docs/superpowers/specs/2026-05-08-nuke-design.md` for the full design spec.

## Status

Phase 1 ships the engine core (no UI, no AI personalities). Verification is `npm run test:run`.

## Quickstart

    npm install
    npm test             # vitest watch
    npm run test:run     # vitest single run
    npm run typecheck    # tsc --noEmit
