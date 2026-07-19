# nuke — Burn'em leader swap (Starmless → Burn'em)

**Date:** 2026-07-19
**Status:** approved in brainstorming session
**Research basis:** `docs/superpowers/research/2026-07-19-burnham-research.md` (deep-research, 23 verified findings)
**Premise:** Keir Starmer has been replaced as UK PM by Andy Burnham (July 2026). The UK cast slot follows suit: Starmless is fully replaced by **Burn'em**, a "King in t' North" caricature.

## 1. Identity — full replace

`'starmless'` → `'burnem'` in every reference. Starmless ceases to exist in the codebase.

- `src/engine/types.ts` — `LeaderId` union member renamed.
- `src/engine/balance.ts` — `LEADER_PROFILES.burnem = { name: "Burn'em", country: '🇬🇧 UK', startPop: 25, startFactories: 6, startAp: 6 }` (stats unchanged from Starmless; no bonusRule).
- `src/engine/flavor/starmless.ts` → `src/engine/flavor/burnem.ts` — all-new lines (§3); `flavor/index.ts` re-export renamed.
- `src/engine/flavor/disparage.ts` — Starmless snap-back entry replaced by a Burn'em one.
- `src/engine/ai/starmless.ts` → `src/engine/ai/burnem.ts` — new planner (§2); `ai/dispatch.ts` case renamed.
- All tests referencing `starmless` (including the AI-duel per-leader win breakdown and any flavor/dispatch tests) updated.
- UI: `portraits/faces.tsx` (BurnemFace replaces StarmlessFace), `portraits/index.ts` (`FACES.burnem`, `PORTRAIT_META.burnem`), `tokens.css` (`--c-starm` → `--c-burnem`, value `#8a1729` kept), `content/cast.ts`, any newspaper/masthead copy naming Starmless.
- Docs: `docs/superpowers/flavour-bank.md` cast table updated. Historical specs/plans are NOT edited.

## 2. AI personality — the handbrake turn (`planBurnem`)

Two-state planner, replacing Cautious+Scapegoat:

**Placid state (default).** Never launches first. Priorities per round: woo the leader with the lowest relationship toward him; build factories, then defence; bank remaining AP. Uses the shared scoring primitives (`threatScore`, `wasAttackedBy`, etc.) and the projected-stockpile conventions of the other planners (producers before consumers; local projection counter for multi-consume orders).

**Provoked state (permanent once entered).** Full aggression against the primary provoker: build toward warheads + delivery every round, launch maximum affordable salvos at the provoker; if the provoker is eliminated, redirect to the current top grudge target. State derives from existing resolution-time grudge/aggression tracking — no new persistent state shape unless the existing one cannot express "was ever attacked", in which case extend the AI state minimally.

**Patience fallback (deadlock guard).** Treated as provoked (against the strongest surviving rival by threat score) when either: (a) round ≥ 6 and he has never been attacked, or (b) only 2 leaders survive. Prevents the known never-attack-first 1v1 stall (cf. the Netanyahoo endgame fix).

**Difficulty interaction.** Same randomization/lookahead wrappers as the rest of the cast — `planAi` orchestration unchanged.

**Balance gates.** `npm run test:run` green including: headless all-AI termination test, 80-seed AI-duel with per-leader win breakdown (Burn'em must neither dominate nor flatline — same soft expectations the suite already encodes), and new planner unit tests (§5).

## 3. Flavour bank (`flavor/burnem.ts`)

Same line-bank schema as the other leaders. Register rules:

- **Tag questions:** the signature tic — the large majority of lines end in "…isn't it?" / "…don't we?" / "…can't it?" or similar.
- **Placid-state material:** northern grievance and boosterism — "on bended knee, begging for scraps", "The North is back. Big time.", "It's not arrogance, it's just confidence.", "They didn't do it for us down in Whitehall. We did this ourselves, didn't we?", "To get on in life, I had to head South.", giving people "hope back", "ordinary people", bus obsession (Bee Network, £2 fares, "the buses run on time now"), King in t' North self-styling, Woolly Backer / more-Scouse-than-Manc authenticity gags, thousands-of-CVs origin story.
- **Handbrake-turn material:** the friendly-to-apocalyptic pivot in one line — blokey opener, grave nuclear pronouncement, no transition, still ends warmly or with a tag question. ("Let me be clear — they carry on like this, I will use nuclear force. Anyway. How's the family?", "I've been very patient, haven't I?")
- **Hard exclusions:** no Hillsborough references (the tragedy is never the joke); no religious markers (existing cast rule); the refuted Disraeli line ("What Manchester does today…") is not used as a stock phrase.
- Disparage snap-back line for Burn'em added to `flavor/disparage.ts`.

## 4. Portrait + UI content

**BurnemFace** (geometric SVG, modeled on the "VOTE ANDY FOR US" campaign placard caricature the user supplied): long pale face; flat dark side-swept hair; very thick black rectangular eyebrows; black rectangular glasses; stern flat mouth; black casual zip-up crew-neck (no suit, no tie). Corner prop in the cast tradition (Disparage's pint, Mileigh's chainsaw): a mini red placard with white/yellow block text "FOR US". Signature color `--c-burnem: #8a1729` (inherits the renamed `--c-starm` token).

**Cast copy** (`src/ui/content/cast.ts`): profile "King in t' North", mood "We need to bring people with us, don't we?". Setup tile catch/tag copy: "IT'S NOT ARROGANCE. IT'S CONFIDENCE."

Any UI copy naming Starmless (newspaper sections, obituaries content, market tickers) renames to Burn'em with ticker/sym updates as needed.

## 5. Testing

- **Rename ripple:** full suite stays green after the id swap (search for `starmless` case-insensitively across src/ tests/ must return zero hits post-change, excluding docs/).
- **New planner unit tests** (`tests/engine/ai/burnem.test.ts` or the suite's existing per-planner layout): (1) placid state emits no launches when unprovoked; (2) attack on Burn'em → provoked state → launches target the provoker and persist in later rounds; (3) patience fallback: unattacked at round 6 → provoked vs strongest rival; 2-survivor game → provoked; (4) producers-before-consumers order in emitted batches. Assertions unconditional (no `if (x) expect(...)`).
- **Balance:** termination + AI-duel seed tests pass; if the handbrake behavior shifts the win distribution outside the suite's expectations, rebalance the planner's placid-state build priorities (not the test thresholds) first.
- **UI:** Portrait test updated for `burnem`; Setup renders the new tile.

## 6. Out of scope

- Any other cast changes; commissioned art; Framer Motion; changes to the handbrake concept for other leaders.
- Editing historical specs/plans that mention Starmless.
