# Phase 4a — Satire + Hotseat Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the second playable build — multi-human hotseat plus full satirical voice (flavor banks wired, Disparage cameo, masthead rotation) plus soft-warn validation. End state is a complete, polished-feeling game minus art/audio/animation/persistence (those are P5).

**Architecture:** Engine stays pure TS; one new screen (HotseatHandoff) plus four reusable components (DisparageCard, DisparageColumn, SoftWarnPanel, …). Engine grows ten new modules under `src/engine/flavor/` plus `cameo.ts` and `masthead.ts`. ResolutionEvent grows in two ways: optional `quote` fields on nine existing variants, and four new variants (`PreRoundMood`, `PostRoundReaction`, `DisparageCameo`, `DisparageColumn`). All flavor selection happens engine-side at resolution time using the existing seeded RNG threaded through `state.rngState`, so replay (P5) stays exact.

**Tech Stack:** TypeScript 5.4, Vite 5, React 18, Vitest 1.5 (already configured in P3), React Testing Library, CSS Modules. No new runtime deps.

**Source of truth:** `docs/superpowers/specs/2026-05-12-phase-4a-satire-hotseat-design.md` (committed `49d2420`). Line content draws from `docs/superpowers/flavour-bank.md` (committed `9dc9aa6`). If anything below conflicts with the spec, the spec wins — flag the discrepancy before coding.

**Per-step confidence:** every task is rated; sub-95 % tasks embed mitigations inline. Lowest task confidence after the lift pass below is **92 %**. Two real risks pre-flagged: (a) `resolveRound`'s in-place rngState threading (Task 6 — concrete mitigation: introduce an `nextRng` helper in resolution.ts and one shared mutation point), (b) UI store buffering/draining logic for multi-human (Task 8 — concrete mitigation: write one reducer transition test per state hop).

---

## File structure (locked before writing tasks)

**New under `src/engine/`:**

| Path | Responsibility |
|---|---|
| `flavor/chump.ts` | Pure data export of Chump's 12-category line bank + snap-back line |
| `flavor/khameneverhere.ts` | Same shape for Khameneverhere |
| `flavor/netanyahoo.ts` | Same shape for Netanyahoo |
| `flavor/carnage.ts` | Same shape for Carnage |
| `flavor/starmless.ts` | Same shape for Starmless (scapegoat-substitution lines use `{scapegoat}` placeholder) |
| `flavor/mileighhem.ts` | Same shape for Mileigh-hem |
| `flavor/disparage.ts` | Different shape: `{ cameo: string[]; columnLines: string[]; footerNotes: string[] }` |
| `flavor/index.ts` | `getBank(leaderId)` lookup + generic-fallback bank |
| `flavor/pick.ts` | `pickLine(bank, category, rngState, opts?): { quote, rngState }` — pure functional, threads RNG state through |
| `cameo.ts` | `shouldRollCameo`, `shouldRollColumn`, `pickColumnNamedLeader` — Disparage trigger logic |
| `masthead.ts` | 15-name pool constant + `shuffleMastheads(rngState)` (Fisher-Yates) + apocalypse override |

**Modified under `src/engine/`:**

| Path | Change |
|---|---|
| `types.ts` | Add `mastheadOrder: string[]` and `lastColumnNamedLeader?: LeaderId` to `GameState`. Add four new ResolutionEvent variants. Add optional `quote` fields to nine existing variants. Add `SoftWarning` type. |
| `state.ts` | `initialState` seeds `mastheadOrder` via `shuffleMastheads(rngState)`; threads new rngState back into state. |
| `resolution.ts` | Emit `PreRoundMood` at round start per living non-human leader (snap-back when applicable); populate quote fields on existing events; emit `DisparageCameo` after each `ImpactPeople`/`ImpactInfrastructure` (probabilistic); emit `DisparageColumn` at end (probabilistic); emit `PostRoundReaction` per living non-human leader at round end; set/clear `lastColumnNamedLeader`. |
| `orders.ts` | Add `analyseOrderSequence` returning `SoftWarning[]`. |

**New under `src/ui/`:**

| Path | Responsibility |
|---|---|
| `screens/HotseatHandoff.tsx` + `.module.css` | Curtain screen (country-forward layout) |
| `components/DisparageCard.tsx` + `.module.css` | Action-stream card variant for `DisparageCameo` events |
| `components/DisparageColumn.tsx` + `.module.css` | RoundSummary sidebar |
| `components/SoftWarnPanel.tsx` + `.module.css` | Planning aside panel |

**Modified under `src/ui/`:**

| Path | Change |
|---|---|
| `store.ts` | `UiState` gains `activeHumanTurn` + `pendingHumanOrders`; `UiAction` gains `BEGIN_PLANNING`; `PLAYER_SUBMIT` reducer logic now buffers and routes to hotseat or drains to engine. |
| `App.tsx` | Add `'hotseat'` ScreenName + route case. |
| `screens/Setup.tsx` | Multi-human roster (1–5 cards with +Add / × remove) replacing single-human profile. |
| `screens/Planning.tsx` | Header shows `state.game.activeHumanTurn`'s name; soft-warn panel between order queue and order form; row highlight on warned orders. |
| `screens/Action.tsx` | Render `event.quote*` fields on existing event cards; render `DisparageCard` for `DisparageCameo` events. |
| `screens/RoundSummary.tsx` | Read masthead from `state.game.mastheadOrder`; populate World Reactions with `PostRoundReaction.quote`; OBITUARY entries for newly-eliminated; render `DisparageColumn` sidebar. |
| `components/LeaderCard.tsx` | Render `preRoundMood.quote` in the existing `.moodSlot`. |
| `README.md` | Add Phase 4a status section. |

---

## Task confidence summary (post-lift)

| Task | Confidence | Notes |
|---|---|---|
| 1. Engine schema | 97 % | Mechanical type addition; existing exhaustive switches will need follow-on updates (caught in later tasks). |
| 2. Flavor leader banks (×6) | 95 % | Mechanical transcription from `flavour-bank.md`; risk is typo / wrong category. Mitigation: each leader file gets its own commit. |
| 3. flavor/disparage + pick + index + tests | 92 % | Substitution + snap-back override paths. Mitigation: separate test cases per path; structured test data. |
| 4. masthead | 96 % | Fisher-Yates is well-known; apocalypse override is one branch. |
| 5. cameo | 94 % | Probabilistic but deterministic via seeded RNG; named-leader-prefers-attackers branch tested separately. |
| 6. Resolution wiring | 92 % | **Threads `state.rngState` through new RNG-consuming code in `resolveRound`.** Mitigation: introduce one `nextRng` mutator helper at top of `resolveRound`, all flavor/cameo calls go through it. One commit per emission point with its own test. |
| 7. analyseOrderSequence | 95 % | Mirrors existing `validateOrderSequence`'s per-order projection loop. |
| 8. UI store multi-human routing | 92 % | **Buffering + drain logic across multiple PLAYER_SUBMIT dispatches.** Mitigation: each reducer transition tested independently (H1→hotseat, H2→drain, solo→ai-conferring). |
| 9. HotseatHandoff screen | 97 % | Standalone screen, tiny component. |
| 10. Setup multi-human roster | 94 % | Array state management with add/remove; standard React pattern. |
| 11. Planning soft-warn + mood | 94 % | Two small wires (SoftWarnPanel + LeaderCard.moodSlot text). |
| 12. Action quote rendering + DisparageCard | 93 % | Modifying P3's exhaustive event switch — high risk of missing a variant. Mitigation: `noFallthroughCasesInSwitch` (already on) catches misses at typecheck. |
| 13. RoundSummary 4-way changes | 92 % | Four separate sub-changes (masthead, reactions, OBITUARY, DisparageColumn). Mitigation: each sub-change is its own step with its own test. |
| 14. README | 98 % | Docs only. |

---

## Task 1: Engine schema additions

**Files:**
- Modify: `src/engine/types.ts`
- Modify: `src/engine/state.ts`
- Test: `tests/engine/state.test.ts`

**Confidence: 97 %**

- [ ] **Step 1: Write failing test for new GameState fields**

Append to `tests/engine/state.test.ts`:

```ts
describe('initialState (P4a additions)', () => {
  it('seeds mastheadOrder with 15 unique names', () => {
    const s = initialState({
      cast: ['player1', 'chump', 'carnage'],
      difficulty: 'normal',
      seed: 'p4a-schema-test',
    });
    expect(s.mastheadOrder).toHaveLength(15);
    expect(new Set(s.mastheadOrder).size).toBe(15);
  });

  it('starts with no lastColumnNamedLeader', () => {
    const s = initialState({
      cast: ['player1', 'chump'],
      difficulty: 'normal',
      seed: 'p4a-schema-test',
    });
    expect(s.lastColumnNamedLeader).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm run test:run -- tests/engine/state.test.ts
```

Expected: FAIL (compiler error: `Property 'mastheadOrder' does not exist on type 'GameState'`). The first failure mode is type-error; that's expected — Step 3 fixes the type, Step 4 wires the seed.

- [ ] **Step 3: Add new fields to GameState + new ResolutionEvent variants + optional quote fields**

Edit `src/engine/types.ts`. Add right after the existing `orderHistory` field:

```ts
  /** 15-name masthead pool, shuffled at NEW_GAME via Fisher-Yates. Indexed by `(round - 1) % 15` on RoundSummary. */
  mastheadOrder: string[];
  /** Set by cameo.ts when a DisparageColumn event names a leader; read by the next round's PreRoundMood emission to fire snap-back. Cleared after the snap-back round. */
  lastColumnNamedLeader?: LeaderId;
```

Add a `SoftWarning` type below `ValidationResult` (line 5 of orders.ts) — but we'll add the type alias to `types.ts` so it's centralized:

```ts
export type SoftWarning =
  | { kind: 'warhead-no-delivery'; orderIndex: number }
  | { kind: 'delivery-no-warhead'; orderIndex: number }
  | { kind: 'woo-non-attacker'; orderIndex: number; target: LeaderId };
```

Add optional `quote` fields to existing ResolutionEvent variants (the variants that have a flavor-relevant moment):

```ts
// Replace the existing ResolutionEvent union with:
export type ResolutionEvent =
  | { kind: 'OrdersSealed'; leaderId: LeaderId; orderCount: number }
  | { kind: 'FactoryBuilt'; by: LeaderId; quote?: string }
  | { kind: 'DeliveryBuilt'; by: LeaderId; type: DeliveryType }
  | { kind: 'WarheadBuilt'; by: LeaderId; yield: Yield }
  | { kind: 'DefenceBuilt'; by: LeaderId; type: DefenceType; quote?: string }
  | {
      kind: 'MissileLaunched';
      from: LeaderId;
      to: LeaderId;
      delivery: DeliveryType;
      warhead: Yield;
      targetType: TargetType;
      attackerQuote?: string;
    }
  | {
      kind: 'MissileIntercepted';
      from: LeaderId;
      to: LeaderId;
      delivery: DeliveryType;
      warhead: Yield;
    }
  | {
      kind: 'ImpactPeople';
      from: LeaderId;
      target: LeaderId;
      warhead: Yield;
      deaths: number;
      targetQuote?: string;
    }
  | {
      kind: 'ImpactInfrastructure';
      from: LeaderId;
      target: LeaderId;
      warhead: Yield;
      factoriesDestroyed: number;
      targetQuote?: string;
    }
  | {
      kind: 'PropagandaTransfer';
      from: LeaderId;
      to: LeaderId;
      amount: number;
      senderQuote?: string;
      receiverQuote?: string;
    }
  | {
      kind: 'WooApplied';
      from: LeaderId;
      to: LeaderId;
      points: number;
      senderQuote?: string;
      receiverQuote?: string;
    }
  | { kind: 'LeaderEliminated'; id: LeaderId; quote?: string }
  | { kind: 'FinalRetaliationTriggered'; by: LeaderId; targets: LeaderId[]; quote?: string }
  | { kind: 'OutcomeReached'; outcome: WinOutcome }
  | { kind: 'PreRoundMood'; leaderId: LeaderId; quote: string; snapBack: boolean }
  | { kind: 'PostRoundReaction'; leaderId: LeaderId; quote: string }
  | { kind: 'DisparageCameo'; afterImpact: { from: LeaderId; to: LeaderId }; quote: string }
  | { kind: 'DisparageColumn'; namedLeader?: LeaderId; quote: string; footer: string };
```

- [ ] **Step 4: Seed mastheadOrder in initialState (stub for now)**

Edit `src/engine/state.ts`. At the top of the file, add a temporary stub so this task can land before Task 4 ships the real `masthead.ts`:

```ts
// Replace the existing return-object construction with:
  // Temporary stub — Task 4 replaces with shuffleMastheads(rngState).
  const mastheadOrder: string[] = [
    'The Grauniad', 'The Torygraph', 'The Daily Wail', 'The Mop and Pail',
    'The Old Gray Lady', 'The Failing New York Times', 'The LA Slimes',
    'McPaper', 'The Granny Herald', 'Pravda',
    'The End Times', 'The Daily Detonator', 'The Doomscroll Daily',
    'The Mushroom Cloud Times', 'The Fallout Express',
  ];
  return {
    round: 1,
    cast: [...opts.cast],
    difficulty: opts.difficulty,
    seed: opts.seed,
    rngState: seedFromString(opts.seed),
    leaders,
    pendingOrders: {},
    orderHistory: [],
    mastheadOrder,
    log: [],
    outcome: null,
    config: {
      dominanceThreshold: DOMINANCE_THRESHOLD_DEFAULT,
      fastPlay: false,
      ...opts.config,
    },
  };
```

Note: `lastColumnNamedLeader` is omitted from the initial state object so it stays `undefined`. The interface marks it optional.

- [ ] **Step 5: Run typecheck**

```bash
npm run typecheck
```

Expected: PASS. All existing code keeps compiling because every new field is either added to existing optional positions or only referenced in unwritten modules.

- [ ] **Step 6: Run test to verify pass**

```bash
npm run test:run -- tests/engine/state.test.ts
```

Expected: PASS. All P3 tests still green; the two new tests pass.

- [ ] **Step 7: Run full suite for regression**

```bash
npm run test:run
```

Expected: PASS at the P3 baseline (169 tests) + 2 new = 171.

- [ ] **Step 8: Commit**

```bash
git add src/engine/types.ts src/engine/state.ts tests/engine/state.test.ts
git commit -m "engine: extend schema for P4a — mastheadOrder, lastColumnNamedLeader, quote fields, new event kinds"
```

---

## Task 2: Flavor leader banks (six pure-data modules)

**Files:**
- Create: `src/engine/flavor/chump.ts`
- Create: `src/engine/flavor/khameneverhere.ts`
- Create: `src/engine/flavor/netanyahoo.ts`
- Create: `src/engine/flavor/carnage.ts`
- Create: `src/engine/flavor/starmless.ts`
- Create: `src/engine/flavor/mileighhem.ts`

**Confidence: 95 %** — mechanical transcription from `docs/superpowers/flavour-bank.md`. Mitigation: one commit per leader file so any mistake is easy to revert; structured shape verified by the picker tests (Task 3).

The bank shape is:

```ts
export interface FlavorBank {
  preRoundMood: string[];
  preRoundMoodSnapBack: string;    // exactly one snap-back line per leader
  launch: string[];
  hit: string[];
  woo: string[];
  beingWooed: string[];
  propagandaSend: string[];
  propagandaReceive: string[];
  buildFactory: string[];
  buildDefence: string[];
  reaction: string[];
  death: string[];
  finalRetaliation: string[];
}
```

Some leaders may have empty arrays for categories where `flavour-bank.md` has no entries (e.g., Khameneverhere has no `wooSend` distinct from `beingWooed`). Empty array → generic fallback handled by `pick.ts` (Task 3).

- [ ] **Step 1: Write the FlavorBank type and Chump's bank**

Create `src/engine/flavor/chump.ts`:

```ts
import type { FlavorBank } from './index';

export const chumpBank: FlavorBank = {
  preRoundMood: [
    'Many people are saying we should hit somebody. We won\'t, but we should.',
    'We\'re winning. We\'re winning so much. People are tired of winning.',
    'Bad people. Bad countries. Sad!',
    'Tremendous round. Tremendous.',
    'Lower gas prices. No more wars. Believe me.',
  ],
  preRoundMoodSnapBack: 'Nigel? Tremendous guy. Should be running things over there.',
  launch: [
    'We\'re hitting them. Hard. Like nobody\'s ever been hit. People are saying it\'s the best hit.',
    'Look — they\'re loser countries. They had it coming. Many people are saying that.',
    'This is a tremendous strike. Tremendous. The best strike, frankly.',
    'They don\'t like the word *war*. So we\'ll call it… a military operation.',
  ],
  hit: [
    'FAKE NEWS. These weren\'t even real bombs. We\'re fine. Better than fine. Stronger than ever.',
    'Many people are saying nobody actually hit me.',
    'Sad! These are loser countries hitting a winning country. Doesn\'t make sense.',
    'We were actually *cooling* as a country. Now they want us to think we\'re hot.',
  ],
  woo: [
    'Look, between us, we love this guy. Tremendous guy. The best.',
  ],
  beingWooed: [
    'He\'s a great guy, really tremendous, we love him. We won\'t hit him.',
    'I\'ve always said — and many people are saying — he\'s one of the good ones.',
  ],
  propagandaSend: [
    'Their factories are dirty. Their people unhappy. Many people are saying come over here.',
    'Everyone\'s leaving. EVERYONE. They\'re coming to us. Big league.',
  ],
  propagandaReceive: [
    'FAKE NEWS! Our people love us. They love us so much.',
  ],
  buildFactory: [
    'We\'re building. Beautiful factories. The best factories. People are crying when they see them.',
  ],
  buildDefence: [
    'We have a *dome*. Big beautiful dome. Nobody can get through. NOBODY.',
    'Many people are saying our defences are the strongest defences in history. Tremendous.',
    'If he didn\'t eat junk food, our missile shield would live to 200 years old.',
  ],
  reaction: [
    'Sad. Loser country. We\'re not going to hit them back. We don\'t need to. We\'re winning.',
    'These weren\'t even real bombs. Many people are saying that.',
    'I\'ve been hit by experts. Many experts. Tremendous experts. So this? Nothing.',
  ],
  death: [
    'This is a witch hunt. The biggest witch hunt in history.',
    'I want to say to my supporters: we love you. We\'re going to be back. Bigger.',
  ],
  finalRetaliation: [
    'OK folks, this is going to be tremendous. Watch this. Many people are watching.',
  ],
};
```

- [ ] **Step 2: Commit Chump**

```bash
git add src/engine/flavor/chump.ts
git commit -m "engine: flavor bank for Chump (12-category data)"
```

- [ ] **Step 3: Add Netanyahoo's bank**

Create `src/engine/flavor/netanyahoo.ts`:

```ts
import type { FlavorBank } from './index';

export const netanyahooBank: FlavorBank = {
  preRoundMood: [
    'Eyes the largest arsenal at the table.',
    'Drawing a fresh red line on the bomb diagram.',
    'Peace is purchased from strength. Not weakness. Not unilateral retreats.',
    'I always lose the polls. I always win the round.',
  ],
  preRoundMoodSnapBack: 'Disparage\'s red line is the bar tab.',
  launch: [
    'If it looks like a duck, walks like a duck, quacks like a duck — it\'s a *nuclear duck*.',
    'We are taking decisive action. Now. While we still have the element of decisiveness.',
    'Strength purchases peace. Weakness purchases more weakness.',
    'Strength purchases peace. We\'re going to do a lot of purchasing shortly.',
    '(Bibi adds another red Sharpie line to the bomb diagram.)',
  ],
  hit: [
    'Peace through strength. Strength through more strength. Strength through retaliation.',
    'If they wanted to destroy us, they\'d need more than that. Much more.',
    '(holds up bomb diagram, draws another line) This was a duck. A nuclear duck.',
  ],
  woo: [
    'Chump, my friend. We see things very similarly. Very similarly.',
  ],
  beingWooed: [
    'I receive your wooing. The bomb diagram remains. But I receive it.',
  ],
  propagandaSend: [
    'Donald, you are weak on our enemies. We are strong. Buy more arms.',
    'If America does not lead, we will lead America.',
    'We have eight more cartoon bombs. We can spare one. Reply for delivery details.',
    'America has lost the war on common sense. We have not. Subscribe to our newsletter.',
    'Your country needs more red lines. We have plenty. Bulk discount available.',
  ],
  propagandaReceive: [],
  buildFactory: [],
  buildDefence: [
    'Iron Dome. Iron Dome 2. Iron Dome 3. The Iron is *very* iron.',
  ],
  reaction: [
    '(drawing a fresh red line) If it looks like a target…',
    'Peace was purchased through strength this round. We purchased generously.',
  ],
  death: [
    '*(still drawing on the bomb diagram as he falls)* …almost finished the line…',
  ],
  finalRetaliation: [
    'The duck. The nuclear duck. Was always going to fly.',
  ],
};
```

- [ ] **Step 4: Commit Netanyahoo**

```bash
git add src/engine/flavor/netanyahoo.ts
git commit -m "engine: flavor bank for Netanyahoo"
```

- [ ] **Step 5: Add Khameneverhere's bank**

Create `src/engine/flavor/khameneverhere.ts`:

```ts
import type { FlavorBank } from './index';

export const khameneverhereBank: FlavorBank = {
  preRoundMood: [
    'Khameneverhere has filed orders. The orders are unsigned.',
    'Khameneverhere has filed orders. He may or may not still be alive.',
    'Until they show him, we cannot be sure. Reports cite Schrödinger.',
    'The cardboard cutout has been replaced with a fresh cardboard cutout.',
    'Orders arrive by fax. Origin unverified.',
  ],
  preRoundMoodSnapBack: '(no audio of Khameneverhere is available — his cardboard cutout faces away from the GB News studio.)',
  launch: [
    'Death to America, and to anyone who reorganises kitchen drawers.',
    'The Great Satan — and by extension, all open-plan offices — must be eliminated.',
    'Strike down our enemies. And anyone who programs traffic lights with three-second yellows.',
    'Remove the West from this earth. And remove pineapple from pizza.',
    'We will obliterate our enemies. We will also obliterate self-checkout machines.',
    'Death to capitalism, and to whoever replies-all on a small thread.',
    'Down with imperialism — and with whoever serves brussels sprouts at dinner.',
    '(orders launched. Orders unsigned.)',
  ],
  hit: [
    '(the cardboard cutout tilts but does not respond.)',
    'Khameneverhere has been struck. Or possibly was already struck. Sources unclear.',
  ],
  woo: [
    '(a printed note is delivered. It is unsigned.)',
  ],
  beingWooed: [
    'Wooing attempt directed at empty chair. Effect: indeterminate.',
    '(the cardboard cutout tips slightly forward. Aides interpret this as acceptance.)',
  ],
  propagandaSend: [
    'Pamphlets are dropped. The pamphlets read: \'Your prime minister also reorganises drawers.\'',
  ],
  propagandaReceive: [
    'The cardboard cutout has read your pamphlet.',
  ],
  buildFactory: [
    'Production figures are released. The figures are unsigned.',
    'His office has authorised additional capacity. He could not be reached for confirmation.',
  ],
  buildDefence: [
    'Production figures are released. The figures are unsigned.',
  ],
  reaction: [
    'Death to America, and to whoever reorganises kitchen drawers.',
    'The wolf\'s tail is now severed. We rest.',
    '(orders filed for Khameneverhere. Reaction unsigned.)',
    '(no audio is available. There isn\'t enough recording of him to train an AI deepfake.)',
  ],
  death: [
    'Authorities are unsure if Khameneverhere was already deceased at time of elimination.',
    '(the cardboard cutout finally falls face-down.)',
  ],
  finalRetaliation: [
    'Pre-recorded orders activate. The grudge list is honoured.',
  ],
};
```

- [ ] **Step 6: Commit Khameneverhere**

```bash
git add src/engine/flavor/khameneverhere.ts
git commit -m "engine: flavor bank for Khameneverhere"
```

- [ ] **Step 7: Add Starmless's bank (uses `{scapegoat}` substitution token)**

Create `src/engine/flavor/starmless.ts`:

```ts
import type { FlavorBank } from './index';

// Scapegoat-substitution lines embed `{scapegoat}` — the picker substitutes a
// leader name at call time. Where no scapegoat applies, pick.ts treats the
// raw {scapegoat}-bearing string as ineligible (filtered before random draw).
export const starmlessBank: FlavorBank = {
  preRoundMood: [
    'Long-term decisions. Sound foundations. Working people.',
    'So, let me be very clear…',
    'I\'m going to be a show-up prime minister, not a showman.',
    '(adjusts tie awkwardly)',
  ],
  preRoundMoodSnapBack: 'So, let me be very clear: I\'m not engaging with that.',
  launch: [
    'So, let me be very clear: this is a measured, proportionate response.',
    'My dad was a toolmaker. He used tools. We are now using tools.',
    'So, let me be very clear: intelligence suggests the real threat is **{scapegoat}**.',
    'Look, the simple fact is **{scapegoat}** has been emboldened by recent events.',
    'We must be honest with the British people: **{scapegoat}** is the actual aggressor here.',
  ],
  hit: [
    'So, let me be very clear: this attack will not stand. We will respond proportionately. Probably to {scapegoat}.',
    'Look, the simple fact is, we\'ve been hit. That\'s just a fact.',
  ],
  woo: [
    'We\'ve been to IKEA. The shadow cabinet is now flat-pack. Happy to assist with assembly.',
    'My dad was a toolmaker. I bring you, in friendship, a metaphorical tool.',
  ],
  beingWooed: [
    'I receive your wooing. Look, the simple fact is, friendship matters.',
  ],
  propagandaSend: [
    'We\'ve prepared a cross-government workstream on perception. Working people deserve clarity.',
  ],
  propagandaReceive: [
    'So, let me be very clear: their propaganda is incorrect, and frankly, not very British.',
  ],
  buildFactory: [
    'Long-term decisions. Sound foundations. Investing in our future.',
    'We\'ve broken ground on a new facility. My dad would be proud. He was a toolmaker.',
    'This is the change Britain voted for. Slowly, methodically, with proper costings.',
  ],
  buildDefence: [
    'We have signed a defence procurement agreement. The relevant minister will brief in due course.',
  ],
  reaction: [
    'Long-term decisions. Sound foundations. Working people.',
    'So, let me be very clear: intelligence suggests the real threat was **{scapegoat}** all along.',
  ],
  death: [
    'Look, the simple fact is, this isn\'t ideal. I\'d like to thank — *(static)*',
  ],
  finalRetaliation: [
    'So, let me be very clear: this is the final response. Probably to {scapegoat}.',
  ],
};
```

- [ ] **Step 8: Commit Starmless**

```bash
git add src/engine/flavor/starmless.ts
git commit -m "engine: flavor bank for Starmless (with {scapegoat} substitution token)"
```

- [ ] **Step 9: Add Carnage's bank**

Create `src/engine/flavor/carnage.ts`:

```ts
import type { FlavorBank } from './index';

export const carnageBank: FlavorBank = {
  preRoundMood: [
    'Elbows up.',
    'Nostalgia is not a strategy.',
    'We are masters in our own home.',
    '(adjusts central-banker glasses, calmly)',
  ],
  preRoundMoodSnapBack: 'Elbows up. Pint down.',
  launch: [
    'Elbows up. We don\'t forget.',
    'We will never, ever, in any way, shape or form, be part of {target}.',
    'Nostalgia is not a strategy. Neither is mercy.',
    'It\'s us, not you.',
    'Elbows up — and through. They had their chance.',
    'We will not allow {target} to fester in their current condition. That would be unkind.',
  ],
  hit: [
    'You hit us. Now we are *very* clear about who you are.',
    'Elbows up.',
    '(removes glasses, polishes them)',
  ],
  woo: [
    'Friendship matters. Especially with friends who have arsenals.',
    'I\'m glad you\'ve upgraded yourself to ally.',
  ],
  beingWooed: [
    'Received with diplomatic warmth. We remain masters in our own home.',
  ],
  propagandaSend: [
    'We are circulating accurate factual records. Of {target}\'s recent behaviour.',
    'Negativity isn\'t strength. Their negativity, specifically, is being widely noted.',
  ],
  propagandaReceive: [
    'We are masters in our own home. Their pamphlets fail to reach the doorstep.',
  ],
  buildFactory: [
    'Investing in productive capacity. Negativity won\'t pay the rent.',
    '(announces the build with a small, polite smile)',
  ],
  buildDefence: [
    'Defence is not aggression. Defence is *reasonable*.',
  ],
  reaction: [
    'Elbows up. We don\'t forget.',
    'Elbows up — and through.',
    'We are masters in our own home. Slightly fewer of us, mind, but still masters.',
  ],
  death: [
    'It has been a privilege. Elbows up.',
  ],
  finalRetaliation: [
    'Elbows up, eh.',
  ],
};
```

- [ ] **Step 10: Commit Carnage**

```bash
git add src/engine/flavor/carnage.ts
git commit -m "engine: flavor bank for Carnage"
```

- [ ] **Step 11: Add Mileigh-hem's bank**

Create `src/engine/flavor/mileighhem.ts`:

```ts
import type { FlavorBank } from './index';

export const mileighhemBank: FlavorBank = {
  preRoundMood: [
    '(chainsaw revs, faintly)',
    '¡Viva la libertad, carajo!',
    'Banking. Cooking.',
    'The state is a pedophile in a kindergarten. We will not be like the state.',
  ],
  preRoundMoodSnapBack: 'AFUERA, salesman!',
  launch: [
    '**¡AFUERA!**',
    '**¡AFUERA!** **¡AFUERA!** **¡AFUERA!**',
    'Every state intervention is an act of force. This is our act of force.',
    'We are dynamiting them. Like a Central Bank.',
  ],
  hit: [
    'Every time the state intervenes, it\'s a violent action. They have intervened.',
    '**¡AFUERA!** **¡AFUERA!** **¡AFUERA!**',
  ],
  woo: [
    'We share a love of liberty, my friend. ¡Viva la libertad!',
    'You and I — we are the two true anarcho-capitalists at this table.',
    'Together we will dynamite the things that need dynamiting.',
  ],
  beingWooed: [
    'Your wooing is *received*. ¡Carajo!',
    '(chainsaw lowers slightly)',
  ],
  propagandaSend: [
    'Pamphlets dropped. They read: \'¡AFUERA!\'',
    'Their state is a pedophile in a kindergarten. Spread the word.',
  ],
  propagandaReceive: [
    '(chainsaw revs sharply) **¡AFUERA!**',
    'They have propagandised us. This is an act of force. We respond in kind.',
  ],
  buildFactory: [
    'Productive capacity. Yes. As long as it is not subsidised.',
  ],
  buildDefence: [
    '(no defences. He has chosen offence. He always chooses offence.)',
  ],
  reaction: [
    'Banking. Cooking. ¡Viva la libertad, carajo!',
    '**¡AFUERA!**',
    'Liberty advances. Even slightly. Slightly is something.',
  ],
  death: [
    '¡Viva la liber— (chainsaw silent)',
  ],
  finalRetaliation: [
    '**¡AFUERA!** **¡AFUERA!** **¡AFUERA!**',
  ],
};
```

- [ ] **Step 12: Commit Mileigh-hem**

```bash
git add src/engine/flavor/mileighhem.ts
git commit -m "engine: flavor bank for Mileigh-hem"
```

- [ ] **Step 13: Run typecheck**

```bash
npm run typecheck
```

Expected: FAIL — `FlavorBank` type isn't defined yet. That's fine; Task 3 ships `index.ts` (which exports `FlavorBank`) and unblocks. Bank files alone don't need to compile in isolation.

If you want to commit-on-green, swap Task 2 and Task 3 order: ship `index.ts` first so all six bank files compile.

(Decision: keep this order. The typecheck will go green again at the end of Task 3, Step 1.)

---

## Task 3: Flavor picker, Disparage bank, index/lookup, tests

**Files:**
- Create: `src/engine/flavor/disparage.ts`
- Create: `src/engine/flavor/pick.ts`
- Create: `src/engine/flavor/index.ts`
- Test: `tests/engine/flavor/pick.test.ts`

**Confidence: 92 %** — substitution and snap-back override paths. Mitigation: separate test cases per code path; structured fixture data.

- [ ] **Step 1: Write `flavor/index.ts` with the FlavorBank type and getBank lookup**

Create `src/engine/flavor/index.ts`:

```ts
import type { LeaderId } from '../types';
import { chumpBank } from './chump';
import { khameneverhereBank } from './khameneverhere';
import { netanyahooBank } from './netanyahoo';
import { carnageBank } from './carnage';
import { starmlessBank } from './starmless';
import { mileighhemBank } from './mileighhem';

export interface FlavorBank {
  preRoundMood: string[];
  preRoundMoodSnapBack: string;
  launch: string[];
  hit: string[];
  woo: string[];
  beingWooed: string[];
  propagandaSend: string[];
  propagandaReceive: string[];
  buildFactory: string[];
  buildDefence: string[];
  reaction: string[];
  death: string[];
  finalRetaliation: string[];
}

export type FlavorCategory = Exclude<keyof FlavorBank, 'preRoundMoodSnapBack'>;

const BANKS: Partial<Record<LeaderId, FlavorBank>> = {
  chump: chumpBank,
  khameneverhere: khameneverhereBank,
  netanyahoo: netanyahooBank,
  carnage: carnageBank,
  starmless: starmlessBank,
  'mileigh-hem': mileighhemBank,
};

// Generic fallback — used when a leader has no bank entry or a category is empty.
export const genericFallback: Record<FlavorCategory, string[]> = {
  preRoundMood: ['({leader} has filed orders.)'],
  launch: ['({leader} launches.)'],
  hit: ['({leader} took {damage}M casualties.)'],
  woo: ['({leader} sends a friendship overture.)'],
  beingWooed: ['({leader} receives a friendship overture.)'],
  propagandaSend: ['({leader} drops pamphlets.)'],
  propagandaReceive: ['({leader} reads pamphlets.)'],
  buildFactory: ['({leader} breaks ground.)'],
  buildDefence: ['({leader} reinforces defences.)'],
  reaction: ['({leader} responds.)'],
  death: ['({leader} has been eliminated.)'],
  finalRetaliation: ['({leader} launches Final Retaliation.)'],
};

export function getBank(leaderId: LeaderId): FlavorBank | undefined {
  return BANKS[leaderId];
}
```

- [ ] **Step 2: Write `flavor/disparage.ts`**

Create `src/engine/flavor/disparage.ts`:

```ts
export interface DisparageBank {
  cameo: string[];        // Action-screen one-liners (~15-20% per impact)
  columnLines: string[];  // RoundSummary column body lines (~1-in-3 per round)
  footerNotes: string[];  // Rotated absentee-MP footer notes
}

export const disparageBank: DisparageBank = {
  cameo: [
    'If I were in charge, this wouldn\'t be happening. Probably.',
    'Disgraceful. Anyway, off to America again.',
    'All the charisma of a damp rag and the diplomatic skills of a low-grade bank clerk.',
    'We want our country back. From all this.',
    'I told you. I told them all. Now look.',
    'Two-tier policing. No further comment. Yet.',
    'Frit. The lot of them.',
  ],
  columnLines: [
    'I\'d have done this much better if I were leader. Pint?',
    'We love war. We just hate the wars run by other people.',
    'I haven\'t had time for a constituent surgery — I\'ve been shouting about this on television. Priorities.',
    'Disgusting. Disgraceful. I\'d have got our country back. Faster. Without all this. Anyway, off to America.',
    'Make no mistake: this is what happens when you don\'t elect me. Pints.',
    'The Establishment did this. The Blob. The Quango. The Whoever. Not me.',
    'I told them. They didn\'t listen. They\'re paying for it now. So am I, in pints.',
  ],
  footerNotes: [
    'Mr Disparage was unavailable for follow-up; he was photographing himself at a pub.',
    'Mr Disparage\'s office referred us to GB News, where he was on air for the eighth time this week.',
    'Mr Disparage was scheduled for a constituent surgery, but is currently in Florida.',
    'Mr Disparage\'s voting record this Parliament is grade E. He could not be reached for comment.',
    'This column was filed from outside the House of Commons, where Mr Disparage has not been seen since Tuesday.',
  ],
};
```

- [ ] **Step 3: Write the picker with a deterministic test first**

Create `tests/engine/flavor/pick.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { pickLine } from '../../../src/engine/flavor/pick';
import { getBank } from '../../../src/engine/flavor/index';
import { seedFromString } from '../../../src/engine/rng';

describe('pickLine', () => {
  it('is deterministic for the same rngState', () => {
    const bank = getBank('chump')!;
    const r1 = pickLine(bank, 'launch', seedFromString('seed-a'));
    const r2 = pickLine(bank, 'launch', seedFromString('seed-a'));
    expect(r1.quote).toBe(r2.quote);
  });

  it('produces different quotes on different rngStates (sampling)', () => {
    const bank = getBank('chump')!;
    const seeds = ['a', 'b', 'c', 'd', 'e'].map(seedFromString);
    const quotes = new Set(seeds.map((s) => pickLine(bank, 'launch', s).quote));
    expect(quotes.size).toBeGreaterThan(1);
  });

  it('returns the snap-back line when opts.snapBack is true', () => {
    const bank = getBank('chump')!;
    const r = pickLine(bank, 'preRoundMood', seedFromString('any'), { snapBack: true });
    expect(r.quote).toBe(bank.preRoundMoodSnapBack);
  });

  it('threads rngState forward (state changes after a pick)', () => {
    const bank = getBank('chump')!;
    const before = seedFromString('thread-test');
    const r = pickLine(bank, 'launch', before);
    expect(r.rngState).not.toBe(before);
  });

  it('falls back to generic template when category is empty', () => {
    const bank = getBank('netanyahoo')!; // propagandaReceive is []
    const r = pickLine(bank, 'propagandaReceive', seedFromString('any'), {
      substitutions: { leader: 'Netanyahoo' },
    });
    expect(r.quote).toContain('Netanyahoo');
  });

  it('substitutes {target} tokens', () => {
    const bank = getBank('carnage')!;
    const r = pickLine(bank, 'propagandaSend', seedFromString('sub'), {
      substitutions: { target: 'Chump' },
    });
    // carnageBank.propagandaSend includes "{target}'s recent behaviour"
    expect(r.quote).not.toContain('{target}');
  });

  it('filters out lines containing untracked substitution tokens', () => {
    // starmlessBank.launch has lines with {scapegoat}. With no scapegoat substitution,
    // the picker must filter those lines out before drawing.
    const bank = getBank('starmless')!;
    for (const seed of ['x', 'y', 'z'].map(seedFromString)) {
      const r = pickLine(bank, 'launch', seed); // no substitutions
      expect(r.quote).not.toContain('{scapegoat}');
    }
  });
});
```

- [ ] **Step 4: Run the test to verify it fails (compile error)**

```bash
npm run test:run -- tests/engine/flavor/pick.test.ts
```

Expected: FAIL with "Cannot find module '.../flavor/pick'".

- [ ] **Step 5: Implement `pick.ts`**

Create `src/engine/flavor/pick.ts`:

```ts
import { nextInt } from '../rng';
import { genericFallback } from './index';
import type { FlavorBank, FlavorCategory } from './index';

export interface PickResult {
  quote: string;
  rngState: number;
}

export interface PickOptions {
  /** When true, returns the snap-back line for preRoundMood without drawing. */
  snapBack?: boolean;
  /** {token} → value substitutions applied to the chosen line. Tokens not in this map cause their host line to be filtered before drawing. */
  substitutions?: Record<string, string>;
}

const TOKEN_RE = /\{(\w+)\}/g;

function applySubstitutions(line: string, subs: Record<string, string>): string {
  return line.replace(TOKEN_RE, (_, key) => (key in subs ? subs[key] : `{${key}}`));
}

function eligible(line: string, subs: Record<string, string>): boolean {
  // A line is eligible if every token it contains is in subs.
  for (const match of line.matchAll(TOKEN_RE)) {
    if (!(match[1] in subs)) return false;
  }
  return true;
}

export function pickLine(
  bank: FlavorBank,
  category: FlavorCategory,
  rngState: number,
  opts: PickOptions = {},
): PickResult {
  if (category === 'preRoundMood' && opts.snapBack) {
    return { quote: bank.preRoundMoodSnapBack, rngState };
  }
  const subs = opts.substitutions ?? {};
  const candidates = bank[category].filter((l) => eligible(l, subs));
  if (candidates.length === 0) {
    // Generic fallback. Generic templates may have a {leader} token; substitute if present.
    const fallback = genericFallback[category][0];
    return { quote: applySubstitutions(fallback, subs), rngState };
  }
  const step = nextInt(rngState, candidates.length);
  const chosen = candidates[step.value];
  return { quote: applySubstitutions(chosen, subs), rngState: step.state };
}
```

- [ ] **Step 6: Run tests to verify pass**

```bash
npm run test:run -- tests/engine/flavor/pick.test.ts
```

Expected: PASS (7 tests).

- [ ] **Step 7: Run typecheck for regression**

```bash
npm run typecheck
```

Expected: PASS — bank files from Task 2 now compile because `FlavorBank` exists.

- [ ] **Step 8: Run full suite**

```bash
npm run test:run
```

Expected: PASS — P3 baseline (169) + Task 1 (2) + Task 3 (7) = 178.

- [ ] **Step 9: Commit**

```bash
git add src/engine/flavor/disparage.ts src/engine/flavor/pick.ts src/engine/flavor/index.ts tests/engine/flavor/pick.test.ts
git commit -m "engine: flavor picker, Disparage bank, FlavorBank type + index lookup"
```

---

## Task 4: Masthead module

**Files:**
- Create: `src/engine/masthead.ts`
- Test: `tests/engine/masthead.test.ts`
- Modify: `src/engine/state.ts` (replace the stub mastheadOrder constant from Task 1)

**Confidence: 96 %** — Fisher-Yates is mechanical.

- [ ] **Step 1: Write failing test**

Create `tests/engine/masthead.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { MASTHEAD_POOL, shuffleMastheads, pickMasthead } from '../../src/engine/masthead';
import { seedFromString } from '../../src/engine/rng';

describe('masthead', () => {
  it('pool has 15 unique entries', () => {
    expect(MASTHEAD_POOL).toHaveLength(15);
    expect(new Set(MASTHEAD_POOL).size).toBe(15);
  });

  it('shuffleMastheads returns all 15 names exactly once', () => {
    const r = shuffleMastheads(seedFromString('any'));
    expect(r.order).toHaveLength(15);
    expect(new Set(r.order).size).toBe(15);
    for (const name of MASTHEAD_POOL) expect(r.order).toContain(name);
  });

  it('same seed = same shuffle order', () => {
    const a = shuffleMastheads(seedFromString('repeat'));
    const b = shuffleMastheads(seedFromString('repeat'));
    expect(a.order).toEqual(b.order);
  });

  it('different seeds usually produce different orders', () => {
    const a = shuffleMastheads(seedFromString('seed-a'));
    const b = shuffleMastheads(seedFromString('seed-b'));
    expect(a.order).not.toEqual(b.order);
  });

  it('threads rngState forward', () => {
    const before = seedFromString('thread');
    const r = shuffleMastheads(before);
    expect(r.rngState).not.toBe(before);
  });

  it('pickMasthead returns apocalypse override when outcome.type === "apocalypse"', () => {
    const order = MASTHEAD_POOL;
    expect(pickMasthead(order, 0, { type: 'apocalypse' })).toBe('THE END TIMES — FINAL EDITION');
    expect(pickMasthead(order, 5, { type: 'apocalypse' })).toBe('THE END TIMES — FINAL EDITION');
  });

  it('pickMasthead returns order[(round-1) % 15] otherwise', () => {
    const order = MASTHEAD_POOL;
    expect(pickMasthead(order, 1, null)).toBe(order[0]);
    expect(pickMasthead(order, 16, null)).toBe(order[0]);
    expect(pickMasthead(order, 17, null)).toBe(order[1]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm run test:run -- tests/engine/masthead.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement `masthead.ts`**

Create `src/engine/masthead.ts`:

```ts
import type { WinOutcome } from './types';
import { nextInt } from './rng';

export const MASTHEAD_POOL: readonly string[] = [
  'The Grauniad',
  'The Torygraph',
  'The Daily Wail',
  'The Mop and Pail',
  'The Old Gray Lady',
  'The Failing New York Times',
  'The LA Slimes',
  'McPaper',
  'The Granny Herald',
  'Pravda',
  'The End Times',
  'The Daily Detonator',
  'The Doomscroll Daily',
  'The Mushroom Cloud Times',
  'The Fallout Express',
];

export const APOCALYPSE_MASTHEAD = 'THE END TIMES — FINAL EDITION';

export interface ShuffleResult {
  order: string[];
  rngState: number;
}

/** Fisher-Yates shuffle, threaded through the seeded RNG. */
export function shuffleMastheads(rngState: number): ShuffleResult {
  const order = [...MASTHEAD_POOL];
  let s = rngState;
  for (let i = order.length - 1; i > 0; i--) {
    const step = nextInt(s, i + 1);
    s = step.state;
    const j = step.value;
    [order[i], order[j]] = [order[j], order[i]];
  }
  return { order, rngState: s };
}

export function pickMasthead(
  order: string[],
  round: number,
  outcome: WinOutcome | null,
): string {
  if (outcome?.type === 'apocalypse') return APOCALYPSE_MASTHEAD;
  return order[(round - 1) % order.length];
}
```

- [ ] **Step 4: Run tests to verify pass**

```bash
npm run test:run -- tests/engine/masthead.test.ts
```

Expected: PASS (7 tests).

- [ ] **Step 5: Replace the stub in `state.ts` with the real shuffle**

Edit `src/engine/state.ts`:

```ts
// Add to imports at top:
import { shuffleMastheads } from './masthead';

// Replace the temporary stub block from Task 1 (lines that begin with
// "// Temporary stub — Task 4 replaces with shuffleMastheads(rngState).")
// with this proper seeding flow:

  const seedState = seedFromString(opts.seed);
  const mh = shuffleMastheads(seedState);

  return {
    round: 1,
    cast: [...opts.cast],
    difficulty: opts.difficulty,
    seed: opts.seed,
    rngState: mh.rngState,
    leaders,
    pendingOrders: {},
    orderHistory: [],
    mastheadOrder: mh.order,
    log: [],
    outcome: null,
    config: {
      dominanceThreshold: DOMINANCE_THRESHOLD_DEFAULT,
      fastPlay: false,
      ...opts.config,
    },
  };
```

- [ ] **Step 6: Run state tests for regression**

```bash
npm run test:run -- tests/engine/state.test.ts
```

Expected: PASS — `mastheadOrder` now has 15 unique entries (still satisfies Task 1's assertion) and is deterministic per-seed (which Task 1 didn't assert; the previous stub would have produced the same constant order every game).

Tighten the existing test to confirm shuffle is happening — replace one of Task 1's assertions:

```ts
  it('shuffles mastheadOrder per seed (not the pool order)', () => {
    const a = initialState({ cast: ['player1', 'chump'], difficulty: 'normal', seed: 'seed-a' });
    const b = initialState({ cast: ['player1', 'chump'], difficulty: 'normal', seed: 'seed-b' });
    expect(a.mastheadOrder).not.toEqual(b.mastheadOrder);
  });
```

- [ ] **Step 7: Run full suite**

```bash
npm run test:run
```

Expected: PASS — P3 (169) + Task 1 (2) + Task 3 (7) + Task 4 (7) + 1 new state assertion = 186.

- [ ] **Step 8: Commit**

```bash
git add src/engine/masthead.ts src/engine/state.ts tests/engine/masthead.test.ts tests/engine/state.test.ts
git commit -m "engine: masthead pool + Fisher-Yates shuffle; state seeds mastheadOrder via RNG"
```

---

## Task 5: Disparage cameo trigger logic

**Files:**
- Create: `src/engine/cameo.ts`
- Test: `tests/engine/cameo.test.ts`

**Confidence: 94 %** — probabilities are deterministic via seeded RNG.

- [ ] **Step 1: Write failing test**

Create `tests/engine/cameo.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  CAMEO_PROB,
  COLUMN_PROB,
  shouldRollCameo,
  shouldRollColumn,
  pickColumnNamedLeader,
} from '../../src/engine/cameo';
import { seedFromString } from '../../src/engine/rng';
import type { LeaderId, ResolutionEvent } from '../../src/engine/types';

describe('cameo', () => {
  it('probabilities are 0.175 (cameo) and 1/3 (column) per spec', () => {
    expect(CAMEO_PROB).toBeCloseTo(0.175, 3);
    expect(COLUMN_PROB).toBeCloseTo(1 / 3, 3);
  });

  it('shouldRollCameo is deterministic per seed', () => {
    const seed = seedFromString('cameo-det');
    expect(shouldRollCameo(seed)).toEqual(shouldRollCameo(seed));
  });

  it('shouldRollCameo threads rngState forward', () => {
    const before = seedFromString('thread');
    const r = shouldRollCameo(before);
    expect(r.rngState).not.toBe(before);
  });

  it('shouldRollCameo produces a mix of fire/skip across seeds', () => {
    const fires = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p']
      .map((s) => shouldRollCameo(seedFromString(s)).fire);
    expect(fires.some((f) => f)).toBe(true);
    expect(fires.some((f) => !f)).toBe(true);
  });

  it('pickColumnNamedLeader prefers a leader who attacked this round', () => {
    const events: ResolutionEvent[] = [
      { kind: 'MissileLaunched', from: 'chump', to: 'carnage', delivery: 'missile', warhead: 'small', targetType: 'people' },
    ];
    const livingLeaders: LeaderId[] = ['chump', 'carnage', 'starmless'];
    const r = pickColumnNamedLeader(events, livingLeaders, seedFromString('pick'));
    expect(r.namedLeader).toBe('chump');
  });

  it('pickColumnNamedLeader falls back to uniform pick among living leaders when nobody attacked', () => {
    const events: ResolutionEvent[] = [];
    const livingLeaders: LeaderId[] = ['chump', 'carnage', 'starmless'];
    const r = pickColumnNamedLeader(events, livingLeaders, seedFromString('fallback'));
    expect(livingLeaders).toContain(r.namedLeader);
  });

  it('pickColumnNamedLeader returns undefined when no living leaders', () => {
    const r = pickColumnNamedLeader([], [], seedFromString('empty'));
    expect(r.namedLeader).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm run test:run -- tests/engine/cameo.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement `cameo.ts`**

Create `src/engine/cameo.ts`:

```ts
import type { LeaderId, ResolutionEvent } from './types';
import { nextRandom, nextInt } from './rng';

/** ~17.5% per ImpactPeople/ImpactInfrastructure event (spec Q5 trigger). */
export const CAMEO_PROB = 0.175;
/** ~33% per round (spec §2.3). */
export const COLUMN_PROB = 1 / 3;

export interface RollResult {
  fire: boolean;
  rngState: number;
}

export function shouldRollCameo(rngState: number): RollResult {
  const r = nextRandom(rngState);
  return { fire: r.value < CAMEO_PROB, rngState: r.state };
}

export function shouldRollColumn(rngState: number): RollResult {
  const r = nextRandom(rngState);
  return { fire: r.value < COLUMN_PROB, rngState: r.state };
}

export interface PickResult {
  namedLeader: LeaderId | undefined;
  rngState: number;
}

/**
 * Pick a leader for the Disparage column to criticise. Prefers a leader who
 * launched a missile this round; falls back to uniform random among living leaders.
 * Returns undefined if there are no living leaders.
 */
export function pickColumnNamedLeader(
  events: ResolutionEvent[],
  livingLeaders: LeaderId[],
  rngState: number,
): PickResult {
  if (livingLeaders.length === 0) {
    return { namedLeader: undefined, rngState };
  }

  const attackers = new Set<LeaderId>();
  for (const e of events) {
    if (e.kind === 'MissileLaunched' && livingLeaders.includes(e.from)) {
      attackers.add(e.from);
    }
  }

  const pool = attackers.size > 0
    ? [...attackers]
    : livingLeaders;

  const step = nextInt(rngState, pool.length);
  return { namedLeader: pool[step.value], rngState: step.state };
}
```

- [ ] **Step 4: Run tests to verify pass**

```bash
npm run test:run -- tests/engine/cameo.test.ts
```

Expected: PASS (7 tests).

- [ ] **Step 5: Run full suite**

```bash
npm run test:run
```

Expected: PASS — running total ~193.

- [ ] **Step 6: Commit**

```bash
git add src/engine/cameo.ts tests/engine/cameo.test.ts
git commit -m "engine: cameo module — Disparage trigger probabilities + named-leader picker"
```

---

## Task 6: Resolution wiring (the big one)

**Files:**
- Modify: `src/engine/resolution.ts`
- Test: `tests/engine/resolution.test.ts` (extend existing)

**Confidence: 92 %** — most invasive task. Mitigation: introduce one `advanceRng` helper at top of `resolveRound`; threading goes through one place. One commit per emission point with its own test, so any regression is small.

**Architectural shape:** the existing `resolveRound` returns `{ state, events }`. We thread `state.rngState` through the new code by reading `s.rngState` before each draw and writing back after.

- [ ] **Step 1: Write failing test for PreRoundMood emission**

Append to `tests/engine/resolution.test.ts`:

```ts
import { initialState } from '../../src/engine/state';
import { reduce } from '../../src/engine/reducer';

describe('resolveRound — P4a flavor events', () => {
  it('emits PreRoundMood per living non-human leader at round start', () => {
    let s = initialState({
      cast: ['player1', 'chump', 'carnage'],
      difficulty: 'normal',
      seed: 'mood-test',
    });
    // Seal empty orders for each
    s = reduce(s, { type: 'SUBMIT_ORDERS', leaderId: 'player1', orders: [] });
    s = reduce(s, { type: 'SUBMIT_ORDERS', leaderId: 'chump', orders: [] });
    s = reduce(s, { type: 'SUBMIT_ORDERS', leaderId: 'carnage', orders: [] });
    const r = resolveRound(s);

    const moodEvents = r.events.filter((e) => e.kind === 'PreRoundMood');
    expect(moodEvents).toHaveLength(2); // chump + carnage; player1 excluded
    expect(moodEvents.map((e) => e.kind === 'PreRoundMood' ? e.leaderId : '').sort())
      .toEqual(['carnage', 'chump']);
    for (const e of moodEvents) {
      if (e.kind === 'PreRoundMood') {
        expect(e.quote.length).toBeGreaterThan(0);
        expect(e.snapBack).toBe(false);
      }
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm run test:run -- tests/engine/resolution.test.ts -t "PreRoundMood"
```

Expected: FAIL — no PreRoundMood events emitted.

- [ ] **Step 3: Add PreRoundMood emission at top of resolveRound**

Edit `src/engine/resolution.ts`. Add to imports:

```ts
import { getBank } from './flavor/index';
import { pickLine } from './flavor/pick';
import { isHuman } from './state';
```

Inside `resolveRound`, after `let s: GameState = structuredClone(state);` and before `const startOfRoundPop`, add the PreRoundMood block:

```ts
  // P4a: emit PreRoundMood per living non-human leader. Snap-back if Disparage's
  // column named this leader last round (and they're still alive).
  for (const id of [...s.cast].sort()) {
    if (isHuman(id)) continue;
    if (!s.leaders[id].alive) continue;
    const bank = getBank(id);
    if (!bank) continue;
    const snapBack = s.lastColumnNamedLeader === id;
    const r = pickLine(bank, 'preRoundMood', s.rngState, { snapBack });
    s.rngState = r.rngState;
    events.push({ kind: 'PreRoundMood', leaderId: id, quote: r.quote, snapBack });
  }
  // Clear snap-back flag after emission.
  s.lastColumnNamedLeader = undefined;
```

- [ ] **Step 4: Run test to verify pass**

```bash
npm run test:run -- tests/engine/resolution.test.ts -t "PreRoundMood"
```

Expected: PASS.

- [ ] **Step 5: Commit PreRoundMood emission**

```bash
git add src/engine/resolution.ts tests/engine/resolution.test.ts
git commit -m "engine: emit PreRoundMood per living non-human leader at round start"
```

- [ ] **Step 6: Add failing test for PostRoundReaction emission**

Append to the same describe block:

```ts
  it('emits PostRoundReaction per living non-human leader at round end', () => {
    let s = initialState({
      cast: ['player1', 'chump', 'carnage'],
      difficulty: 'normal',
      seed: 'reaction-test',
    });
    s = reduce(s, { type: 'SUBMIT_ORDERS', leaderId: 'player1', orders: [] });
    s = reduce(s, { type: 'SUBMIT_ORDERS', leaderId: 'chump', orders: [] });
    s = reduce(s, { type: 'SUBMIT_ORDERS', leaderId: 'carnage', orders: [] });
    const r = resolveRound(s);

    const reactions = r.events.filter((e) => e.kind === 'PostRoundReaction');
    expect(reactions).toHaveLength(2);
    expect(reactions.map((e) => e.kind === 'PostRoundReaction' ? e.leaderId : '').sort())
      .toEqual(['carnage', 'chump']);
  });
```

- [ ] **Step 7: Verify it fails**

```bash
npm run test:run -- tests/engine/resolution.test.ts -t "PostRoundReaction"
```

Expected: FAIL.

- [ ] **Step 8: Add PostRoundReaction emission**

Edit `src/engine/resolution.ts`. Find the section near the end after "Decay relationships" and before "AP refresh", and insert before the AP refresh block:

```ts
  // P4a: emit PostRoundReaction per living non-human leader.
  for (const id of [...s.cast].sort()) {
    if (isHuman(id)) continue;
    if (!s.leaders[id].alive) continue;
    const bank = getBank(id);
    if (!bank) continue;
    const r = pickLine(bank, 'reaction', s.rngState);
    s.rngState = r.rngState;
    events.push({ kind: 'PostRoundReaction', leaderId: id, quote: r.quote });
  }
```

- [ ] **Step 9: Verify pass**

```bash
npm run test:run -- tests/engine/resolution.test.ts -t "PostRoundReaction"
```

Expected: PASS.

- [ ] **Step 10: Commit PostRoundReaction**

```bash
git add src/engine/resolution.ts tests/engine/resolution.test.ts
git commit -m "engine: emit PostRoundReaction per living non-human leader at round end"
```

- [ ] **Step 11: Add failing test for DisparageColumn emission + snap-back wiring**

Append:

```ts
  it('emits DisparageColumn for at least some seeds; sets lastColumnNamedLeader', () => {
    // Try multiple seeds to find one where the column fires (probabilistic).
    let fired = false;
    for (const seedStr of ['seed-a', 'seed-b', 'seed-c', 'seed-d', 'seed-e', 'seed-f']) {
      let s = initialState({
        cast: ['player1', 'chump', 'carnage'],
        difficulty: 'normal',
        seed: seedStr,
      });
      s = reduce(s, { type: 'SUBMIT_ORDERS', leaderId: 'player1', orders: [] });
      s = reduce(s, { type: 'SUBMIT_ORDERS', leaderId: 'chump', orders: [] });
      s = reduce(s, { type: 'SUBMIT_ORDERS', leaderId: 'carnage', orders: [] });
      const r = resolveRound(s);
      const columns = r.events.filter((e) => e.kind === 'DisparageColumn');
      if (columns.length > 0) {
        fired = true;
        const col = columns[0];
        if (col.kind === 'DisparageColumn') {
          expect(col.quote.length).toBeGreaterThan(0);
          expect(col.footer.length).toBeGreaterThan(0);
        }
        if (col.kind === 'DisparageColumn' && col.namedLeader) {
          expect(r.state.lastColumnNamedLeader).toBe(col.namedLeader);
        }
        break;
      }
    }
    expect(fired).toBe(true);
  });
```

- [ ] **Step 12: Verify it fails**

```bash
npm run test:run -- tests/engine/resolution.test.ts -t "DisparageColumn"
```

Expected: FAIL.

- [ ] **Step 13: Add DisparageColumn emission**

Edit `src/engine/resolution.ts`. Add to imports:

```ts
import { shouldRollColumn, pickColumnNamedLeader } from './cameo';
import { disparageBank } from './flavor/disparage';
```

Insert at the very end of `resolveRound`, immediately before `s.log = [...s.log, ...events]`:

```ts
  // P4a: Disparage column roll. Fires probabilistically; if it does, pick a
  // named leader (preferring attackers), draw a column line + footer, set
  // lastColumnNamedLeader so the next round's PreRoundMood can snap back.
  {
    const roll = shouldRollColumn(s.rngState);
    s.rngState = roll.rngState;
    if (roll.fire) {
      const livingLeaders = s.cast.filter((id) => s.leaders[id].alive);
      const picked = pickColumnNamedLeader(events, livingLeaders, s.rngState);
      s.rngState = picked.rngState;

      const linePick = nextRoundLine(disparageBank.columnLines, s.rngState);
      s.rngState = linePick.rngState;

      const footerIndex = (s.round - 1) % disparageBank.footerNotes.length;
      const footer = disparageBank.footerNotes[footerIndex];

      events.push({
        kind: 'DisparageColumn',
        namedLeader: picked.namedLeader,
        quote: linePick.line,
        footer,
      });

      if (picked.namedLeader) {
        s.lastColumnNamedLeader = picked.namedLeader;
      }
    }
  }
```

Add a small helper at the bottom of the file (after `leaderBonusAp`):

```ts
import { nextInt } from './rng';

function nextRoundLine(pool: string[], rngState: number): { line: string; rngState: number } {
  const step = nextInt(rngState, pool.length);
  return { line: pool[step.value], rngState: step.state };
}
```

Note: if `nextInt` is already imported at top of file, omit the duplicate import.

- [ ] **Step 14: Verify pass**

```bash
npm run test:run -- tests/engine/resolution.test.ts -t "DisparageColumn"
```

Expected: PASS.

- [ ] **Step 15: Commit DisparageColumn**

```bash
git add src/engine/resolution.ts tests/engine/resolution.test.ts
git commit -m "engine: emit DisparageColumn at end of resolution; set lastColumnNamedLeader"
```

- [ ] **Step 16: Add failing test for DisparageCameo emission after impacts**

Append:

```ts
  it('emits DisparageCameo after some ImpactPeople/ImpactInfrastructure events', () => {
    let fired = false;
    for (const seedStr of ['c-a', 'c-b', 'c-c', 'c-d', 'c-e', 'c-f', 'c-g', 'c-h']) {
      // Need a state where chump can launch — give them an arsenal directly.
      let s = initialState({
        cast: ['chump', 'carnage'],
        difficulty: 'normal',
        seed: seedStr,
      });
      s.leaders.chump.stockpile.missiles = 1;
      s.leaders.chump.stockpile.warheadsSmall = 1;
      s.leaders.chump.ap = 5;

      s = reduce(s, {
        type: 'SUBMIT_ORDERS',
        leaderId: 'chump',
        orders: [{ kind: 'launch', target: 'carnage', delivery: 'missile', warhead: 'small', targetType: 'people' }],
      });
      s = reduce(s, { type: 'SUBMIT_ORDERS', leaderId: 'carnage', orders: [] });
      const r = resolveRound(s);
      const cameos = r.events.filter((e) => e.kind === 'DisparageCameo');
      if (cameos.length > 0) {
        fired = true;
        // Cameo events should appear AFTER the impact they comment on.
        const impactIdx = r.events.findIndex(
          (e) => e.kind === 'ImpactPeople' || e.kind === 'ImpactInfrastructure',
        );
        const cameoIdx = r.events.findIndex((e) => e.kind === 'DisparageCameo');
        if (impactIdx !== -1 && cameoIdx !== -1) {
          expect(cameoIdx).toBeGreaterThan(impactIdx);
        }
        break;
      }
    }
    expect(fired).toBe(true);
  });
```

- [ ] **Step 17: Verify it fails**

```bash
npm run test:run -- tests/engine/resolution.test.ts -t "DisparageCameo"
```

Expected: FAIL.

- [ ] **Step 18: Add DisparageCameo emission**

The cameo fires *after* each ImpactPeople / ImpactInfrastructure event. Easiest place to wire this is to walk the `events` array after the launch phase has settled and inject cameo events at the right positions. Edit `src/engine/resolution.ts`.

Add to imports:

```ts
import { shouldRollCameo } from './cameo';
```

After the FR cascade block (after `events.push(...r.events)` for FR) and before "Update grudge / recentAggressionFrom on receivers", insert:

```ts
  // P4a: Disparage cameo. For each ImpactPeople/ImpactInfrastructure event,
  // probabilistically inject a DisparageCameo event immediately after it.
  {
    const expanded: ResolutionEvent[] = [];
    for (const e of events) {
      expanded.push(e);
      if (e.kind === 'ImpactPeople' || e.kind === 'ImpactInfrastructure') {
        const roll = shouldRollCameo(s.rngState);
        s.rngState = roll.rngState;
        if (roll.fire) {
          const linePick = nextRoundLine(disparageBank.cameo, s.rngState);
          s.rngState = linePick.rngState;
          expanded.push({
            kind: 'DisparageCameo',
            afterImpact: { from: e.from, to: e.target },
            quote: linePick.line,
          });
        }
      }
    }
    // Replace events array in place.
    events.length = 0;
    events.push(...expanded);
  }
```

- [ ] **Step 19: Verify pass**

```bash
npm run test:run -- tests/engine/resolution.test.ts -t "DisparageCameo"
```

Expected: PASS.

- [ ] **Step 20: Commit DisparageCameo**

```bash
git add src/engine/resolution.ts tests/engine/resolution.test.ts
git commit -m "engine: emit DisparageCameo after impacts (probabilistic)"
```

- [ ] **Step 21: Add failing tests for quote-field population on existing events**

Append:

```ts
  it('populates attackerQuote on MissileLaunched + targetQuote on ImpactPeople', () => {
    let s = initialState({ cast: ['chump', 'carnage'], difficulty: 'normal', seed: 'quote-test' });
    s.leaders.chump.stockpile.missiles = 1;
    s.leaders.chump.stockpile.warheadsSmall = 1;
    s.leaders.chump.ap = 5;

    s = reduce(s, {
      type: 'SUBMIT_ORDERS',
      leaderId: 'chump',
      orders: [{ kind: 'launch', target: 'carnage', delivery: 'missile', warhead: 'small', targetType: 'people' }],
    });
    s = reduce(s, { type: 'SUBMIT_ORDERS', leaderId: 'carnage', orders: [] });
    const r = resolveRound(s);

    const launch = r.events.find((e) => e.kind === 'MissileLaunched');
    expect(launch).toBeDefined();
    if (launch && launch.kind === 'MissileLaunched') {
      expect(launch.attackerQuote).toBeDefined();
      expect(launch.attackerQuote!.length).toBeGreaterThan(0);
    }

    // Either an impact landed (then targetQuote should be set) or it was intercepted.
    const impact = r.events.find(
      (e) => e.kind === 'ImpactPeople' || e.kind === 'ImpactInfrastructure',
    );
    if (impact && (impact.kind === 'ImpactPeople' || impact.kind === 'ImpactInfrastructure')) {
      expect(impact.targetQuote).toBeDefined();
    }
  });
```

- [ ] **Step 22: Verify it fails**

```bash
npm run test:run -- tests/engine/resolution.test.ts -t "populates attackerQuote"
```

Expected: FAIL — quote fields are still undefined.

- [ ] **Step 23: Populate quote fields on existing events**

This requires editing the modules that emit those events. The cleanest pattern: **post-process** the events array in `resolveRound` after all phases have produced their events, attaching quotes by event kind.

Edit `src/engine/resolution.ts`. Insert after the DisparageCameo block (Step 18) and before "Update grudge":

```ts
  // P4a: populate quote fields on existing events. Single pass; uses the
  // seeded RNG threaded through s.rngState. Quotes are optional, so callers
  // can skip them without breaking the type system.
  for (let i = 0; i < events.length; i++) {
    const e = events[i];
    switch (e.kind) {
      case 'MissileLaunched': {
        const bank = isHuman(e.from) ? undefined : getBank(e.from);
        if (!bank) break;
        const p = pickLine(bank, 'launch', s.rngState, { substitutions: { target: s.leaders[e.to].name } });
        s.rngState = p.rngState;
        events[i] = { ...e, attackerQuote: p.quote };
        break;
      }
      case 'ImpactPeople':
      case 'ImpactInfrastructure': {
        const bank = isHuman(e.target) ? undefined : getBank(e.target);
        if (!bank) break;
        const p = pickLine(bank, 'hit', s.rngState, { substitutions: { leader: s.leaders[e.target].name } });
        s.rngState = p.rngState;
        events[i] = { ...e, targetQuote: p.quote };
        break;
      }
      case 'PropagandaTransfer': {
        const senderBank = isHuman(e.from) ? undefined : getBank(e.from);
        const receiverBank = isHuman(e.to) ? undefined : getBank(e.to);
        let senderQuote: string | undefined;
        let receiverQuote: string | undefined;
        if (senderBank) {
          const p = pickLine(senderBank, 'propagandaSend', s.rngState, { substitutions: { target: s.leaders[e.to].name } });
          s.rngState = p.rngState;
          senderQuote = p.quote;
        }
        if (receiverBank) {
          const p = pickLine(receiverBank, 'propagandaReceive', s.rngState);
          s.rngState = p.rngState;
          receiverQuote = p.quote;
        }
        events[i] = { ...e, senderQuote, receiverQuote };
        break;
      }
      case 'WooApplied': {
        const senderBank = isHuman(e.from) ? undefined : getBank(e.from);
        const receiverBank = isHuman(e.to) ? undefined : getBank(e.to);
        let senderQuote: string | undefined;
        let receiverQuote: string | undefined;
        if (senderBank) {
          const p = pickLine(senderBank, 'woo', s.rngState);
          s.rngState = p.rngState;
          senderQuote = p.quote;
        }
        if (receiverBank) {
          const p = pickLine(receiverBank, 'beingWooed', s.rngState);
          s.rngState = p.rngState;
          receiverQuote = p.quote;
        }
        events[i] = { ...e, senderQuote, receiverQuote };
        break;
      }
      case 'FactoryBuilt': {
        const bank = isHuman(e.by) ? undefined : getBank(e.by);
        if (!bank) break;
        const p = pickLine(bank, 'buildFactory', s.rngState);
        s.rngState = p.rngState;
        events[i] = { ...e, quote: p.quote };
        break;
      }
      case 'DefenceBuilt': {
        const bank = isHuman(e.by) ? undefined : getBank(e.by);
        if (!bank) break;
        const p = pickLine(bank, 'buildDefence', s.rngState);
        s.rngState = p.rngState;
        events[i] = { ...e, quote: p.quote };
        break;
      }
      case 'LeaderEliminated': {
        const bank = isHuman(e.id) ? undefined : getBank(e.id);
        if (!bank) break;
        const p = pickLine(bank, 'death', s.rngState);
        s.rngState = p.rngState;
        events[i] = { ...e, quote: p.quote };
        break;
      }
      case 'FinalRetaliationTriggered': {
        const bank = isHuman(e.by) ? undefined : getBank(e.by);
        if (!bank) break;
        const p = pickLine(bank, 'finalRetaliation', s.rngState);
        s.rngState = p.rngState;
        events[i] = { ...e, quote: p.quote };
        break;
      }
      // No quote fields on: OrdersSealed, DeliveryBuilt, WarheadBuilt,
      // MissileIntercepted, OutcomeReached, PreRoundMood (already has quote),
      // PostRoundReaction (already has quote), DisparageCameo (already has quote),
      // DisparageColumn (already has quote).
      default:
        break;
    }
  }
```

- [ ] **Step 24: Verify pass**

```bash
npm run test:run -- tests/engine/resolution.test.ts -t "populates attackerQuote"
```

Expected: PASS.

- [ ] **Step 25: Run the full suite for regression**

```bash
npm run test:run
```

Expected: PASS — running total ~200. Investigate any breakage; the most likely cause is that an existing test asserts an exact event count and didn't anticipate PreRoundMood/PostRoundReaction; bump those expected counts as needed.

- [ ] **Step 26: Commit quote-field population**

```bash
git add src/engine/resolution.ts tests/engine/resolution.test.ts
git commit -m "engine: populate quote fields on MissileLaunched / Impact* / Propaganda / Woo / FactoryBuilt / DefenceBuilt / LeaderEliminated / FinalRetaliationTriggered"
```

---

## Task 7: Soft-warn helper

**Files:**
- Modify: `src/engine/orders.ts`
- Test: `tests/engine/analyseOrderSequence.test.ts`

**Confidence: 95 %** — mirrors existing `validateOrderSequence`.

- [ ] **Step 1: Write failing test**

Create `tests/engine/analyseOrderSequence.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { analyseOrderSequence } from '../../src/engine/orders';
import { initialState } from '../../src/engine/state';

describe('analyseOrderSequence', () => {
  function state() {
    return initialState({
      cast: ['player1', 'chump', 'carnage'],
      difficulty: 'normal',
      seed: 'softwarn-test',
    });
  }

  it('flags warhead-no-delivery when no delivery is owned or queued', () => {
    const s = state();
    const warnings = analyseOrderSequence(s, 'player1', [
      { kind: 'build-warhead', yield: 'small' },
    ]);
    expect(warnings).toHaveLength(1);
    expect(warnings[0].kind).toBe('warhead-no-delivery');
    expect(warnings[0].orderIndex).toBe(0);
  });

  it('does NOT flag warhead-no-delivery when a missile is queued before it', () => {
    const s = state();
    const warnings = analyseOrderSequence(s, 'player1', [
      { kind: 'build-missile' },
      { kind: 'build-warhead', yield: 'small' },
    ]);
    expect(warnings.filter((w) => w.kind === 'warhead-no-delivery')).toHaveLength(0);
  });

  it('flags delivery-no-warhead when no warhead is owned or queued', () => {
    const s = state();
    const warnings = analyseOrderSequence(s, 'player1', [
      { kind: 'build-missile' },
    ]);
    expect(warnings.filter((w) => w.kind === 'delivery-no-warhead')).toHaveLength(1);
  });

  it('flags woo-non-attacker when target has no aggression and non-negative favourability', () => {
    const s = state();
    const warnings = analyseOrderSequence(s, 'player1', [
      { kind: 'woo', target: 'chump', points: 1 },
    ]);
    expect(warnings.filter((w) => w.kind === 'woo-non-attacker')).toHaveLength(1);
  });

  it('does NOT flag woo-non-attacker when target has recently attacked', () => {
    const s = state();
    s.leaders.chump.recentAggressionFrom.player1 = 1;
    const warnings = analyseOrderSequence(s, 'player1', [
      { kind: 'woo', target: 'chump', points: 1 },
    ]);
    expect(warnings.filter((w) => w.kind === 'woo-non-attacker')).toHaveLength(0);
  });

  it('returns empty for a clean plan', () => {
    const s = state();
    s.leaders.player1.stockpile.missiles = 1;
    s.leaders.player1.stockpile.warheadsSmall = 1;
    const warnings = analyseOrderSequence(s, 'player1', [
      { kind: 'build-factory' },
    ]);
    expect(warnings).toEqual([]);
  });
});
```

- [ ] **Step 2: Verify it fails**

```bash
npm run test:run -- tests/engine/analyseOrderSequence.test.ts
```

Expected: FAIL — `analyseOrderSequence` not exported.

- [ ] **Step 3: Implement analyseOrderSequence**

Edit `src/engine/orders.ts`. Add at the bottom (and import `SoftWarning` from types):

```ts
import type { SoftWarning } from './types';

/**
 * Emit non-blocking advisory warnings for an order sequence. Same per-order
 * projection logic as validateOrderSequence; returns empty array for a clean plan.
 */
export function analyseOrderSequence(
  state: GameState,
  leaderId: LeaderId,
  orders: Order[],
): SoftWarning[] {
  const warnings: SoftWarning[] = [];
  const me = state.leaders[leaderId];
  if (!me || !me.alive) return warnings;

  // Project stockpile + queued builds across the sequence.
  let missiles = me.stockpile.missiles;
  let bombers = me.stockpile.bombers;
  let warheads = me.stockpile.warheadsSmall + me.stockpile.warheadsMedium + me.stockpile.warheadsLarge;

  // Pre-scan: count delivery+warhead builds in the queue so each order can
  // ask "is there any delivery/warhead in this sequence (already owned + queued)?"
  let queuedDeliveries = 0;
  let queuedWarheads = 0;
  for (const o of orders) {
    if (o.kind === 'build-missile' || o.kind === 'build-bomber') queuedDeliveries++;
    if (o.kind === 'build-warhead') queuedWarheads++;
  }
  const ownedOrQueuedDeliveries = missiles + bombers + queuedDeliveries;
  const ownedOrQueuedWarheads = warheads + queuedWarheads;

  for (let i = 0; i < orders.length; i++) {
    const o = orders[i];

    if (o.kind === 'build-warhead') {
      // Owned-or-queued deliveries minus the ones already consumed by prior launches in this sequence.
      if (ownedOrQueuedDeliveries === 0) {
        warnings.push({ kind: 'warhead-no-delivery', orderIndex: i });
      }
    }

    if (o.kind === 'build-missile' || o.kind === 'build-bomber') {
      if (ownedOrQueuedWarheads === 0) {
        warnings.push({ kind: 'delivery-no-warhead', orderIndex: i });
      }
    }

    if (o.kind === 'woo') {
      const target = state.leaders[o.target];
      if (!target) continue;
      const aggression = target.recentAggressionFrom[leaderId] ?? 0;
      const fav = target.favourability[leaderId] ?? 0;
      if (aggression === 0 && fav >= 0) {
        warnings.push({ kind: 'woo-non-attacker', orderIndex: i, target: o.target });
      }
    }

    // Project launch consumption (mirrors validateOrderSequence; cheap copy).
    if (o.kind === 'launch') {
      if (o.delivery === 'missile' && missiles > 0) missiles -= 1;
      else if (o.delivery === 'bomber' && bombers > 0) bombers -= 1;
      if (warheads > 0) warheads -= 1;
    }
  }

  return warnings;
}
```

- [ ] **Step 4: Verify pass**

```bash
npm run test:run -- tests/engine/analyseOrderSequence.test.ts
```

Expected: PASS (6 tests).

- [ ] **Step 5: Run full suite**

```bash
npm run test:run
```

Expected: PASS — running total ~206.

- [ ] **Step 6: Commit**

```bash
git add src/engine/orders.ts tests/engine/analyseOrderSequence.test.ts
git commit -m "engine: analyseOrderSequence soft-warn helper (3 warnings)"
```

---

## Task 8: UI store — multi-human routing

**Files:**
- Modify: `src/ui/store.ts`
- Test: `tests/ui/store.multihuman.test.ts`

**Confidence: 92 %** — buffering + drain logic. Mitigation: separate test cases per state hop.

- [ ] **Step 1: Write failing test**

Create `tests/ui/store.multihuman.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { uiReducer, initialUiState } from '../../src/ui/store';
import type { UiState } from '../../src/ui/store';

function bootedTwoHumans(): UiState {
  return uiReducer(initialUiState, {
    type: 'START_GAME',
    opts: {
      cast: ['player1', 'player2', 'chump', 'carnage'],
      difficulty: 'normal',
      seed: 'multi-human-test',
      config: {
        playerProfiles: {
          player1: { name: 'Alice', country: '🦆 Freedonia' },
          player2: { name: 'Bob', country: '🐢 Sylvania' },
        },
      },
    },
  });
}

describe('store multi-human routing', () => {
  it('START_GAME with 2 humans goes to planning with player1 as activeHumanTurn', () => {
    const s = bootedTwoHumans();
    expect(s.screen).toBe('planning');
    expect(s.activeHumanTurn).toBe('player1');
    expect(s.pendingHumanOrders).toEqual({});
  });

  it('PLAYER_SUBMIT for H1 buffers and routes to hotseat with H2 active', () => {
    let s = bootedTwoHumans();
    s = uiReducer(s, { type: 'PLAYER_SUBMIT', leaderId: 'player1', orders: [] });
    expect(s.screen).toBe('hotseat');
    expect(s.activeHumanTurn).toBe('player2');
    expect(s.pendingHumanOrders.player1).toEqual([]);
  });

  it('BEGIN_PLANNING from hotseat returns to planning with the active human', () => {
    let s = bootedTwoHumans();
    s = uiReducer(s, { type: 'PLAYER_SUBMIT', leaderId: 'player1', orders: [] });
    s = uiReducer(s, { type: 'BEGIN_PLANNING', leaderId: 'player2' });
    expect(s.screen).toBe('planning');
    expect(s.activeHumanTurn).toBe('player2');
  });

  it('PLAYER_SUBMIT for last human drains buffer and routes to aiConferring', () => {
    let s = bootedTwoHumans();
    s = uiReducer(s, { type: 'PLAYER_SUBMIT', leaderId: 'player1', orders: [] });
    s = uiReducer(s, { type: 'BEGIN_PLANNING', leaderId: 'player2' });
    s = uiReducer(s, { type: 'PLAYER_SUBMIT', leaderId: 'player2', orders: [] });
    expect(s.screen).toBe('aiConferring');
    expect(s.activeHumanTurn).toBeUndefined();
    expect(s.pendingHumanOrders).toEqual({});
  });

  it('solo (1 human) skips hotseat — PLAYER_SUBMIT routes directly to aiConferring', () => {
    let s = uiReducer(initialUiState, {
      type: 'START_GAME',
      opts: {
        cast: ['player1', 'chump', 'carnage'],
        difficulty: 'normal',
        seed: 'solo-test',
      },
    });
    expect(s.activeHumanTurn).toBe('player1');
    s = uiReducer(s, { type: 'PLAYER_SUBMIT', leaderId: 'player1', orders: [] });
    expect(s.screen).toBe('aiConferring');
  });
});
```

- [ ] **Step 2: Verify failing**

```bash
npm run test:run -- tests/ui/store.multihuman.test.ts
```

Expected: FAIL (compile error on `activeHumanTurn` field).

- [ ] **Step 3: Update store.ts**

Edit `src/ui/store.ts`. Replace the contents with:

```ts
import type { GameState, LeaderId, Order, ResolutionEvent } from '../engine/types';
import type { NewGameOpts } from '../engine/state';
import { initialState, isHuman } from '../engine/state';
import { reduce } from '../engine/reducer';
import { planAi } from '../engine/ai';
import { resolveRound } from '../engine/resolution';

export type ScreenName =
  | 'setup'
  | 'planning'
  | 'hotseat'
  | 'aiConferring'
  | 'action'
  | 'roundSummary'
  | 'winners';

export interface UiState {
  screen: ScreenName;
  game: GameState | null;
  events: ResolutionEvent[];
  prevPopulations: Partial<Record<LeaderId, number>>;
  initialPopulations: Partial<Record<LeaderId, number>>;
  lastNewGameOpts: NewGameOpts | null;
  /** Multi-human hotseat: which human is currently planning. Undefined in solo, between rounds, or once all humans have sealed. */
  activeHumanTurn?: LeaderId;
  /** Buffered orders from each human this round, drained into engine SUBMIT_ORDERS once the last human seals. */
  pendingHumanOrders: Partial<Record<LeaderId, Order[]>>;
}

export type UiAction =
  | { type: 'START_GAME'; opts: NewGameOpts }
  | { type: 'PLAYER_SUBMIT'; leaderId: LeaderId; orders: Order[] }
  | { type: 'BEGIN_PLANNING'; leaderId: LeaderId }
  | { type: 'AI_RESOLVE' }
  | { type: 'ACTION_DONE' }
  | { type: 'NEXT_ROUND' }
  | { type: 'BACK_TO_SETUP' };

export const initialUiState: UiState = {
  screen: 'setup',
  game: null,
  events: [],
  prevPopulations: {},
  initialPopulations: {},
  lastNewGameOpts: null,
  pendingHumanOrders: {},
};

function nextHumanAfter(cast: LeaderId[], current: LeaderId): LeaderId | undefined {
  const humans = cast.filter(isHuman);
  const idx = humans.indexOf(current);
  if (idx === -1) return undefined;
  return humans[idx + 1];
}

export function uiReducer(state: UiState, action: UiAction): UiState {
  switch (action.type) {
    case 'START_GAME': {
      const game = initialState(action.opts);
      const initialPopulations: Partial<Record<LeaderId, number>> = {};
      for (const id of game.cast) initialPopulations[id] = game.leaders[id].population;
      const firstHuman = game.cast.find(isHuman);
      return {
        screen: 'planning',
        game,
        events: [],
        prevPopulations: {},
        initialPopulations,
        lastNewGameOpts: action.opts,
        activeHumanTurn: firstHuman,
        pendingHumanOrders: {},
      };
    }
    case 'PLAYER_SUBMIT': {
      if (!state.game) return state;
      const pendingHumanOrders = { ...state.pendingHumanOrders, [action.leaderId]: action.orders };
      const next = nextHumanAfter(state.game.cast, action.leaderId);
      if (next) {
        return { ...state, screen: 'hotseat', activeHumanTurn: next, pendingHumanOrders };
      }
      // All humans done — drain buffer into engine SUBMIT_ORDERS per human, then advance.
      let game = state.game;
      for (const [leaderId, orders] of Object.entries(pendingHumanOrders) as [LeaderId, Order[]][]) {
        game = reduce(game, { type: 'SUBMIT_ORDERS', leaderId, orders });
      }
      return {
        ...state,
        screen: 'aiConferring',
        game,
        activeHumanTurn: undefined,
        pendingHumanOrders: {},
      };
    }
    case 'BEGIN_PLANNING': {
      return { ...state, screen: 'planning', activeHumanTurn: action.leaderId };
    }
    case 'AI_RESOLVE': {
      if (!state.game) return state;
      const prevPopulations: Partial<Record<LeaderId, number>> = {};
      for (const id of state.game.cast) prevPopulations[id] = state.game.leaders[id].population;
      let game = state.game;
      for (const id of game.cast) {
        if (isHuman(id)) continue;
        if (!game.leaders[id].alive) continue;
        const orders = planAi(game, id);
        game = reduce(game, { type: 'SUBMIT_ORDERS', leaderId: id, orders });
      }
      const result = resolveRound(game);
      return {
        ...state,
        screen: 'action',
        game: result.state,
        events: result.events,
        prevPopulations,
      };
    }
    case 'ACTION_DONE': {
      if (!state.game) return state;
      const next: ScreenName = state.game.outcome ? 'winners' : 'roundSummary';
      return { ...state, screen: next };
    }
    case 'NEXT_ROUND': {
      if (!state.game) return state;
      if (state.game.outcome) return { ...state, screen: 'winners' };
      const firstHuman = state.game.cast.find(isHuman);
      return { ...state, screen: 'planning', activeHumanTurn: firstHuman };
    }
    case 'BACK_TO_SETUP':
      return initialUiState;
  }
}
```

- [ ] **Step 4: Update P3 callers of PLAYER_SUBMIT (Planning.tsx passes `leaderId`)**

Edit `src/ui/screens/Planning.tsx` — find the `dispatch({ type: 'PLAYER_SUBMIT', orders })` line (around line 30 in P3) and change to:

```ts
dispatch({ type: 'PLAYER_SUBMIT', leaderId: state.activeHumanTurn ?? 'player1', orders });
```

Also, the existing `state.game!.leaders.player1` reference at the top of Planning.tsx needs to read the active human:

```ts
const game = state.game!;
const activeId = state.activeHumanTurn ?? 'player1';
const player = game.leaders[activeId];
```

(Full Planning.tsx changes land in Task 11; this is a minimal compile-fix here.)

- [ ] **Step 5: Run UI tests + typecheck**

```bash
npm run typecheck
npm run test:run -- tests/ui/store.multihuman.test.ts
```

Expected: typecheck PASS, store tests PASS.

- [ ] **Step 6: Run full suite for regression**

```bash
npm run test:run
```

Expected: PASS — running total ~211. Investigate any breakage on P3 UI tests; most likely fix is updating any test that dispatches `PLAYER_SUBMIT` without a `leaderId` (P3's `OrderForm.test.tsx` doesn't dispatch; UI tests that do should add `leaderId: 'player1'`).

- [ ] **Step 7: Commit**

```bash
git add src/ui/store.ts src/ui/screens/Planning.tsx tests/ui/store.multihuman.test.ts
git commit -m "ui: store routes multi-human PLAYER_SUBMIT through buffer + hotseat screen"
```

---

## Task 9: HotseatHandoff screen

**Files:**
- Create: `src/ui/screens/HotseatHandoff.tsx`
- Create: `src/ui/screens/HotseatHandoff.module.css`
- Modify: `src/ui/App.tsx`
- Test: `tests/ui/HotseatHandoff.test.tsx`

**Confidence: 97 %**

- [ ] **Step 1: Write failing test**

Create `tests/ui/HotseatHandoff.test.tsx`:

```tsx
import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import HotseatHandoff from '../../src/ui/screens/HotseatHandoff';
import { initialState } from '../../src/engine/state';
import type { UiState } from '../../src/ui/store';

function makeState(): UiState {
  const game = initialState({
    cast: ['player1', 'player2', 'chump'],
    difficulty: 'normal',
    seed: 'hotseat-test',
    config: {
      playerProfiles: {
        player2: { name: 'Bob', country: '🐢 Sylvania' },
      },
    },
  });
  return {
    screen: 'hotseat',
    game,
    events: [],
    prevPopulations: {},
    initialPopulations: {},
    lastNewGameOpts: null,
    activeHumanTurn: 'player2',
    pendingHumanOrders: { player1: [] },
  };
}

describe('<HotseatHandoff>', () => {
  it('renders the next leader\'s country and name', () => {
    render(<HotseatHandoff state={makeState()} dispatch={vi.fn()} />);
    expect(screen.getByText(/Sylvania/i)).toBeInTheDocument();
    expect(screen.getByText(/Bob/i)).toBeInTheDocument();
    expect(screen.getByText(/previous orders sealed/i)).toBeInTheDocument();
  });

  it('tap dispatches BEGIN_PLANNING with the active human', () => {
    const dispatch = vi.fn();
    render(<HotseatHandoff state={makeState()} dispatch={dispatch} />);
    fireEvent.click(screen.getByRole('button', { name: /tap to begin/i }));
    expect(dispatch).toHaveBeenCalledWith({ type: 'BEGIN_PLANNING', leaderId: 'player2' });
  });
});
```

- [ ] **Step 2: Verify failing**

```bash
npm run test:run -- tests/ui/HotseatHandoff.test.tsx
```

Expected: FAIL — file missing.

- [ ] **Step 3: Create HotseatHandoff.tsx**

Create `src/ui/screens/HotseatHandoff.tsx`:

```tsx
import type { ScreenProps } from '../App';
import styles from './HotseatHandoff.module.css';

export default function HotseatHandoff({ state, dispatch }: ScreenProps) {
  const game = state.game!;
  const id = state.activeHumanTurn!;
  const leader = game.leaders[id];

  // Country string is e.g. "🦆 Freedonia"; split into flag (first segment) and name (rest).
  const [flag, ...rest] = leader.country.split(' ');
  const countryName = rest.join(' ');

  function begin() {
    dispatch({ type: 'BEGIN_PLANNING', leaderId: id });
  }

  return (
    <div className={styles.curtain}>
      <div className={styles.passLabel}>Pass the device</div>
      <div className={styles.flag}>{flag}</div>
      <div className={styles.country}>{countryName}</div>
      <div className={styles.leaderName}>{leader.name}</div>
      <div className={styles.divider} />
      <div className={styles.sealed}>Previous orders sealed.</div>
      <button type="button" className={styles.tapBtn} onClick={begin}>Tap to begin →</button>
    </div>
  );
}
```

- [ ] **Step 4: Create HotseatHandoff.module.css**

Create `src/ui/screens/HotseatHandoff.module.css`:

```css
.curtain {
  min-height: 100vh;
  background: linear-gradient(180deg, #1a1a2e 0%, #16213e 100%);
  color: #fff;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px;
  text-align: center;
  max-width: 480px;
  margin: 0 auto;
}

.passLabel {
  font-size: 11px;
  letter-spacing: 0.2em;
  opacity: 0.5;
  text-transform: uppercase;
  margin-bottom: 32px;
}

.flag { font-size: 96px; line-height: 1; margin-bottom: 16px; }
.country { font-size: 28px; font-weight: 700; margin-bottom: 8px; }
.leaderName { font-size: 18px; opacity: 0.8; margin-bottom: 32px; }

.divider {
  width: 50%;
  height: 1px;
  background: rgba(255,255,255,0.2);
  margin: 0 auto 32px;
}

.sealed { font-size: 12px; opacity: 0.5; margin-bottom: 24px; }

.tapBtn {
  background: transparent;
  color: #fff;
  border: 1px solid rgba(255,255,255,0.4);
  border-radius: 32px;
  padding: 14px 28px;
  font-size: 14px;
  cursor: pointer;
  letter-spacing: 0.04em;
}
.tapBtn:hover { background: rgba(255,255,255,0.05); }
```

- [ ] **Step 5: Route hotseat screen in App.tsx**

Edit `src/ui/App.tsx`. Add the import:

```ts
import HotseatHandoff from './screens/HotseatHandoff';
```

Add the case to the screen switch (after `'planning'`):

```tsx
case 'hotseat':       return <HotseatHandoff state={state} dispatch={dispatch} />;
```

- [ ] **Step 6: Run tests**

```bash
npm run test:run -- tests/ui/HotseatHandoff.test.tsx
```

Expected: PASS (2 tests).

- [ ] **Step 7: Run typecheck + full suite**

```bash
npm run typecheck
npm run test:run
```

Expected: typecheck PASS, full suite PASS — running total ~213.

- [ ] **Step 8: Commit**

```bash
git add src/ui/screens/HotseatHandoff.tsx src/ui/screens/HotseatHandoff.module.css src/ui/App.tsx tests/ui/HotseatHandoff.test.tsx
git commit -m "ui: HotseatHandoff curtain screen (country-forward layout)"
```

---

## Task 10: Setup multi-human roster

**Files:**
- Modify: `src/ui/screens/Setup.tsx`
- Modify: `src/ui/screens/Setup.module.css` (add human-roster styles)
- Test: `tests/ui/Setup.multihuman.test.tsx`

**Confidence: 94 %**

- [ ] **Step 1: Write failing test**

Create `tests/ui/Setup.multihuman.test.tsx`:

```tsx
import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Setup from '../../src/ui/screens/Setup';
import { initialUiState } from '../../src/ui/store';

describe('<Setup> multi-human roster', () => {
  it('renders one human card (P1) by default', () => {
    render(<Setup state={initialUiState} dispatch={vi.fn()} />);
    expect(screen.getAllByRole('textbox', { name: /name/i })).toHaveLength(1);
  });

  it('+ Add appends humans up to 5', () => {
    render(<Setup state={initialUiState} dispatch={vi.fn()} />);
    const addBtn = screen.getByRole('button', { name: /add another human/i });
    for (let i = 0; i < 4; i++) fireEvent.click(addBtn);
    expect(screen.getAllByRole('textbox', { name: /name/i })).toHaveLength(5);
    // Disabled at 5
    expect(addBtn).toBeDisabled();
  });

  it('× removes a non-P1 human card', () => {
    render(<Setup state={initialUiState} dispatch={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /add another human/i }));
    expect(screen.getAllByRole('textbox', { name: /name/i })).toHaveLength(2);
    // P2's remove button (not P1's — P1 has no remove)
    const removes = screen.getAllByRole('button', { name: /remove/i });
    expect(removes).toHaveLength(1);
    fireEvent.click(removes[0]);
    expect(screen.getAllByRole('textbox', { name: /name/i })).toHaveLength(1);
  });

  it('Start button label reflects roster size', () => {
    const dispatch = vi.fn();
    render(<Setup state={initialUiState} dispatch={dispatch} />);
    // Pick 2 AI to make canStart true (current Setup requires 2-4 AI).
    fireEvent.click(screen.getByRole('button', { name: /chump/i }));
    fireEvent.click(screen.getByRole('button', { name: /carnage/i }));
    expect(screen.getByRole('button', { name: /start.*1 human.*2 ai/i })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Verify failing**

```bash
npm run test:run -- tests/ui/Setup.multihuman.test.tsx
```

Expected: FAIL — Setup.tsx currently has no roster, no add button.

- [ ] **Step 3: Update Setup.tsx with human roster**

Replace the contents of `src/ui/screens/Setup.tsx` with:

```tsx
import { useState } from 'react';
import type { ScreenProps } from '../App';
import type { Difficulty, LeaderId } from '../../engine/types';
import { LEADER_PROFILES } from '../../engine/balance';
import { isHuman } from '../../engine/state';
import styles from './Setup.module.css';

const AI_IDS: LeaderId[] = (Object.keys(LEADER_PROFILES) as LeaderId[]).filter(
  (id) => !isHuman(id),
);
const HUMAN_IDS: LeaderId[] = ['player1', 'player2', 'player3', 'player4', 'player5'];

interface HumanRow {
  id: LeaderId;
  name: string;
  country: string;
}

function generateSeed(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export default function Setup({ dispatch }: ScreenProps) {
  const [humans, setHumans] = useState<HumanRow[]>([
    { id: 'player1', name: 'Rufus T. Firefly', country: '🦆 Freedonia' },
  ]);
  const [selectedAi, setSelectedAi] = useState<LeaderId[]>([]);
  const [difficulty, setDifficulty] = useState<Difficulty>('normal');
  const [seedInput, setSeedInput] = useState('');

  const canStart = selectedAi.length >= 2 && selectedAi.length <= 4;

  function addHuman() {
    if (humans.length >= 5) return;
    const nextId = HUMAN_IDS[humans.length];
    setHumans((prev) => [...prev, { id: nextId, name: '', country: '' }]);
  }

  function removeHuman(idx: number) {
    if (idx === 0) return; // P1 cannot be removed
    setHumans((prev) => {
      const without = prev.filter((_, i) => i !== idx);
      // Re-key by index so we don't have holes in player1..playerN
      return without.map((h, i) => ({ ...h, id: HUMAN_IDS[i] }));
    });
  }

  function updateHuman(idx: number, field: 'name' | 'country', value: string) {
    setHumans((prev) => prev.map((h, i) => (i === idx ? { ...h, [field]: value } : h)));
  }

  function toggleAi(id: LeaderId) {
    setSelectedAi((current) =>
      current.includes(id) ? current.filter((x) => x !== id) : [...current, id],
    );
  }

  function start() {
    if (!canStart) return;
    const playerProfiles: Partial<Record<LeaderId, { name: string; country: string }>> = {};
    for (const h of humans) {
      playerProfiles[h.id] = { name: h.name, country: h.country };
    }
    dispatch({
      type: 'START_GAME',
      opts: {
        cast: [...humans.map((h) => h.id), ...selectedAi],
        difficulty,
        seed: seedInput || generateSeed(),
        config: { playerProfiles },
      },
    });
  }

  return (
    <div className={styles.setup}>
      <h1 className={styles.title}>New Game</h1>

      <section className={styles.humanRoster}>
        <h2 className={styles.sectionTitle}>Humans (1–5)</h2>
        {humans.map((h, idx) => (
          <div key={h.id} className={styles.humanCard}>
            <span className={styles.humanLabel}>P{idx + 1}</span>
            <input
              type="text"
              aria-label={`Name for P${idx + 1}`}
              value={h.name}
              onChange={(e) => updateHuman(idx, 'name', e.target.value)}
              placeholder="Name"
            />
            <input
              type="text"
              aria-label={`Country for P${idx + 1}`}
              value={h.country}
              onChange={(e) => updateHuman(idx, 'country', e.target.value)}
              placeholder="🌐 Country"
            />
            {idx > 0 && (
              <button
                type="button"
                aria-label={`Remove P${idx + 1}`}
                className={styles.removeBtn}
                onClick={() => removeHuman(idx)}
              >
                ×
              </button>
            )}
          </div>
        ))}
        <button
          type="button"
          className={styles.addBtn}
          onClick={addHuman}
          disabled={humans.length >= 5}
        >
          + Add another human {humans.length >= 5 && '(max 5)'}
        </button>
      </section>

      <section className={styles.castPicker}>
        <h2 className={styles.sectionTitle}>AI cast (pick 2–4)</h2>
        {AI_IDS.map((id) => {
          const profile = LEADER_PROFILES[id];
          const selected = selectedAi.includes(id);
          return (
            <button
              key={id}
              type="button"
              aria-pressed={selected}
              className={`${styles.castCard} ${selected ? styles.selected : ''}`}
              onClick={() => toggleAi(id)}
            >
              <span className={styles.castFlag}>{profile.country}</span>
              <span className={styles.castName}>{profile.name}</span>
              <span className={styles.castPop}>{profile.startPop}M</span>
            </button>
          );
        })}
      </section>

      <section className={styles.difficulty}>
        <h2 className={styles.sectionTitle}>Difficulty</h2>
        {(['easy', 'normal', 'hard'] as const).map((d) => (
          <label key={d} className={styles.diffRadio}>
            <input
              type="radio"
              name="difficulty"
              value={d}
              checked={difficulty === d}
              onChange={() => setDifficulty(d)}
            />
            {d.charAt(0).toUpperCase() + d.slice(1)}
          </label>
        ))}
      </section>

      <section className={styles.seed}>
        <label>
          Seed (optional)
          <input
            type="text"
            value={seedInput}
            onChange={(e) => setSeedInput(e.target.value)}
            placeholder="(random)"
          />
        </label>
      </section>

      <button
        type="button"
        disabled={!canStart}
        onClick={start}
        className={styles.newGameButton}
      >
        Start ({humans.length} human{humans.length === 1 ? '' : 's'} + {selectedAi.length} AI)
      </button>
    </div>
  );
}
```

- [ ] **Step 4: Add roster styles to Setup.module.css**

Append to `src/ui/screens/Setup.module.css`:

```css
.humanRoster { margin-bottom: 20px; }

.humanCard {
  position: relative;
  background: #fff8e1;
  border-left: 3px solid #f59f00;
  padding: 8px 12px 8px 36px;
  border-radius: 6px;
  margin-bottom: 6px;
}

.humanLabel {
  position: absolute;
  left: 10px;
  top: 12px;
  font-weight: 700;
  color: #856404;
  font-size: 10px;
  letter-spacing: 0.05em;
}

.humanCard input[type='text'] {
  display: block;
  width: 100%;
  padding: 4px 6px;
  margin-bottom: 4px;
  border: 1px solid #d0c8b8;
  border-radius: 4px;
  font-size: 13px;
}

.removeBtn {
  position: absolute;
  top: 4px;
  right: 6px;
  background: transparent;
  border: none;
  color: #b02a37;
  font-size: 18px;
  font-weight: 700;
  cursor: pointer;
}

.addBtn {
  display: block;
  width: 100%;
  background: transparent;
  color: #198754;
  border: 1px dashed #198754;
  padding: 8px;
  font-size: 12px;
  border-radius: 4px;
  cursor: pointer;
}
.addBtn:disabled { color: #adb5bd; border-color: #dee2e6; cursor: not-allowed; }
```

- [ ] **Step 5: Run tests**

```bash
npm run test:run -- tests/ui/Setup.multihuman.test.tsx
```

Expected: PASS (4 tests).

- [ ] **Step 6: Run full suite**

```bash
npm run test:run
```

Expected: PASS — running total ~217.

- [ ] **Step 7: Commit**

```bash
git add src/ui/screens/Setup.tsx src/ui/screens/Setup.module.css tests/ui/Setup.multihuman.test.tsx
git commit -m "ui: Setup multi-human roster — add/remove up to 5 humans"
```

---

## Task 11: Planning soft-warn panel + LeaderCard mood lines

**Files:**
- Create: `src/ui/components/SoftWarnPanel.tsx` + `.module.css`
- Modify: `src/ui/screens/Planning.tsx`
- Modify: `src/ui/components/LeaderCard.tsx`
- Test: `tests/ui/Planning.softwarn.test.tsx`

**Confidence: 94 %**

- [ ] **Step 1: Write failing test**

Create `tests/ui/Planning.softwarn.test.tsx`:

```tsx
import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Planning from '../../src/ui/screens/Planning';
import { initialState } from '../../src/engine/state';
import type { UiState } from '../../src/ui/store';

function makeState(): UiState {
  const game = initialState({
    cast: ['player1', 'chump', 'carnage'],
    difficulty: 'normal',
    seed: 'softwarn-planning-test',
  });
  return {
    screen: 'planning',
    game,
    events: [],
    prevPopulations: {},
    initialPopulations: {},
    lastNewGameOpts: null,
    activeHumanTurn: 'player1',
    pendingHumanOrders: {},
  };
}

describe('<Planning> soft-warn panel', () => {
  it('hides the panel when no warnings', () => {
    render(<Planning state={makeState()} dispatch={vi.fn()} />);
    expect(screen.queryByText(/suggestions/i)).not.toBeInTheDocument();
  });

  it('shows the panel after adding a warhead with no delivery owned', () => {
    render(<Planning state={makeState()} dispatch={vi.fn()} />);
    // Use the order form to add a build-warhead. P1 has 5 AP and no missiles/bombers/warheads.
    fireEvent.change(screen.getByLabelText(/order kind/i), { target: { value: 'build-warhead' } });
    fireEvent.click(screen.getByRole('button', { name: /add/i }));
    expect(screen.getByText(/suggestions/i)).toBeInTheDocument();
    expect(screen.getByText(/no delivery/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Verify failing**

```bash
npm run test:run -- tests/ui/Planning.softwarn.test.tsx
```

Expected: FAIL — panel doesn't exist yet.

- [ ] **Step 3: Create SoftWarnPanel component**

Create `src/ui/components/SoftWarnPanel.tsx`:

```tsx
import type { GameState, Order, SoftWarning } from '../../engine/types';
import styles from './SoftWarnPanel.module.css';

interface Props {
  warnings: SoftWarning[];
  orders: Order[];
  game: GameState;
}

export default function SoftWarnPanel({ warnings, orders, game }: Props) {
  if (warnings.length === 0) return null;
  return (
    <div className={styles.panel}>
      <div className={styles.title}>⚠ Suggestions</div>
      <ul className={styles.list}>
        {warnings.map((w, i) => (
          <li key={i}>{describe(w, orders, game)}</li>
        ))}
      </ul>
    </div>
  );
}

function describe(w: SoftWarning, orders: Order[], game: GameState): string {
  const o = orders[w.orderIndex];
  switch (w.kind) {
    case 'warhead-no-delivery':
      return `Warhead #${w.orderIndex + 1}: no missile or bomber owned, none queued.`;
    case 'delivery-no-warhead':
      return `Delivery #${w.orderIndex + 1}: no warhead owned, none queued.`;
    case 'woo-non-attacker': {
      const target = game.leaders[w.target];
      return `Woo ${target.name}: hasn't attacked you and already likes you.`;
    }
  }
}
```

Create `src/ui/components/SoftWarnPanel.module.css`:

```css
.panel {
  background: #fff8e1;
  border-left: 3px solid #f59f00;
  padding: 10px 12px;
  border-radius: 0 4px 4px 0;
  margin: 8px 0;
}

.title {
  font-size: 10px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #856404;
  font-weight: 600;
  margin-bottom: 6px;
}

.list {
  margin: 0;
  padding-left: 18px;
  font-size: 12px;
  color: #5a4400;
}
.list li { margin-bottom: 2px; }
```

- [ ] **Step 4: Wire SoftWarnPanel into Planning**

Edit `src/ui/screens/Planning.tsx`. Add to imports:

```ts
import { analyseOrderSequence } from '../../engine/orders';
import SoftWarnPanel from '../components/SoftWarnPanel';
```

Inside the component, after `const apTotal = …`, compute warnings:

```ts
const softWarnings = analyseOrderSequence(game, activeId, orders);
const warnedIndices = new Set(softWarnings.map((w) => w.orderIndex));
```

Where the order list renders each row, apply the warning class:

```tsx
{orders.map((o, i) => (
  <div
    key={i}
    className={`${styles.orderRow} ${warnedIndices.has(i) ? styles.warned : ''}`}
  >
    <span className={styles.orderLabel}>{formatOrder(o, game)}</span>
    <button type="button" className={styles.removeBtn} onClick={() => removeOrder(i)}>×</button>
  </div>
))}
```

Insert the panel right after the order list and before the AP summary:

```tsx
<SoftWarnPanel warnings={softWarnings} orders={orders} game={game} />
```

Add to `Planning.module.css`:

```css
.orderRow.warned { background: #fff8e1; border-color: #f59f00; }
```

Also update the header to show whose turn it is:

```tsx
<header className={styles.header}>
  Round {game.round}{state.activeHumanTurn ? ` · ${player.name}` : ''}
</header>
```

- [ ] **Step 5: Run soft-warn test**

```bash
npm run test:run -- tests/ui/Planning.softwarn.test.tsx
```

Expected: PASS (2 tests).

- [ ] **Step 6: Wire mood lines into LeaderCard**

Edit `src/ui/components/LeaderCard.tsx`. Add a `mood?: string` prop:

```tsx
interface LeaderCardProps {
  leader: Leader;
  playerHits: number;
  playerFav: number;
  myFav: number;
  playerGrudge: number;
  mood?: string;
}
```

Render the mood line inside the existing `.moodSlot` div:

```tsx
<div className={styles.moodSlot}>
  {mood && <span className={styles.moodLine}>{mood}</span>}
</div>
```

Add a style to `LeaderCard.module.css`:

```css
.moodLine {
  font-size: 10px;
  color: #5a4a3a;
  font-style: italic;
}
```

- [ ] **Step 7: Pass mood from Planning to LeaderCard**

Edit `src/ui/screens/Planning.tsx`. Look up the most recent PreRoundMood quote per leader from `state.events`:

```ts
const moodByLeader: Partial<Record<string, string>> = {};
for (const e of state.events) {
  if (e.kind === 'PreRoundMood') moodByLeader[e.leaderId] = e.quote;
}
```

Pass into each LeaderCard:

```tsx
<LeaderCard
  key={id}
  leader={leader}
  playerHits={leader.recentAggressionFrom.player1 ?? 0}
  playerFav={leader.favourability.player1 ?? 0}
  myFav={player.favourability[id] ?? 0}
  playerGrudge={leader.grudge.player1 ?? 0}
  mood={moodByLeader[id]}
/>
```

- [ ] **Step 8: Run full suite + typecheck**

```bash
npm run typecheck
npm run test:run
```

Expected: PASS — running total ~219.

- [ ] **Step 9: Commit**

```bash
git add src/ui/components/SoftWarnPanel.tsx src/ui/components/SoftWarnPanel.module.css src/ui/screens/Planning.tsx src/ui/screens/Planning.module.css src/ui/components/LeaderCard.tsx src/ui/components/LeaderCard.module.css tests/ui/Planning.softwarn.test.tsx
git commit -m "ui: Planning soft-warn panel + LeaderCard mood-line rendering"
```

---

## Task 12: Action quote rendering + DisparageCard

**Files:**
- Create: `src/ui/components/DisparageCard.tsx` + `.module.css`
- Modify: `src/ui/components/EventCard.tsx`
- Modify: `src/ui/screens/Action.tsx`

**Confidence: 93 %** — modifying P3's exhaustive event switch. `noFallthroughCasesInSwitch` is on (P3 enabled it), so typecheck catches missed variants.

- [ ] **Step 1: Add DisparageCard component**

Create `src/ui/components/DisparageCard.tsx`:

```tsx
import type { ResolutionEvent } from '../../engine/types';
import styles from './DisparageCard.module.css';

interface Props {
  event: Extract<ResolutionEvent, { kind: 'DisparageCameo' }>;
}

export default function DisparageCard({ event }: Props) {
  return (
    <div className={styles.card}>
      <div className={styles.header}>🍺 FROM CLACTON</div>
      <div className={styles.quote}>{event.quote}</div>
    </div>
  );
}
```

Create `src/ui/components/DisparageCard.module.css`:

```css
.card {
  background: #fff8e1;
  border: 1px solid #f59f00;
  border-left: 4px solid #f59f00;
  border-radius: 4px;
  padding: 10px 12px;
  margin-bottom: 6px;
}

.header {
  font-size: 10px;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  color: #856404;
  font-weight: 700;
  margin-bottom: 6px;
}

.quote {
  font-size: 13px;
  font-style: italic;
  color: #5a4400;
  line-height: 1.4;
}
```

- [ ] **Step 2: Update EventCard.tsx to render quote fields and route DisparageCameo to DisparageCard**

Edit `src/ui/components/EventCard.tsx`. Add cases for the 4 new event kinds; render quote fields on the existing variants as italic text.

This file's central function in P3 is `formatEventCard(event: ResolutionEvent): { headline: string; sub?: string; ... }`. Extend it to also return an optional `quote` field for italic display, and add a new variant for `'DisparageCameo'`:

The required shape:

```ts
import type { ResolutionEvent } from '../../engine/types';
import DisparageCard from './DisparageCard';
import styles from './EventCard.module.css';

interface Props {
  event: ResolutionEvent;
  leaderName: (id: string) => string;
}

export default function EventCard({ event, leaderName }: Props) {
  // Route DisparageCameo to its own component.
  if (event.kind === 'DisparageCameo') return <DisparageCard event={event} />;
  // PreRoundMood and PostRoundReaction never render on Action.
  if (event.kind === 'PreRoundMood' || event.kind === 'PostRoundReaction') return null;
  // DisparageColumn renders on RoundSummary, not Action.
  if (event.kind === 'DisparageColumn') return null;

  const formatted = format(event, leaderName);
  if (!formatted) return null;
  return (
    <div className={styles.card}>
      <div className={styles.headline}>{formatted.headline}</div>
      {formatted.sub && <div className={styles.sub}>{formatted.sub}</div>}
      {formatted.quote && <div className={styles.quote}>{formatted.quote}</div>}
    </div>
  );
}

function format(
  e: Exclude<ResolutionEvent, { kind: 'DisparageCameo' | 'PreRoundMood' | 'PostRoundReaction' | 'DisparageColumn' }>,
  ln: (id: string) => string,
): { headline: string; sub?: string; quote?: string } | null {
  switch (e.kind) {
    case 'OrdersSealed':         return null;
    case 'OutcomeReached':       return null;
    case 'FactoryBuilt':         return { headline: `${ln(e.by)} builds a factory.`, quote: e.quote };
    case 'DeliveryBuilt':        return { headline: `${ln(e.by)} builds a ${e.type}.` };
    case 'WarheadBuilt':         return { headline: `${ln(e.by)} builds a ${e.yield} warhead.` };
    case 'DefenceBuilt':         return { headline: `${ln(e.by)} builds a ${e.type === 'shield' ? 'shield' : 'AA'}.`, quote: e.quote };
    case 'MissileLaunched':     return {
      headline: `${ln(e.from)} → ${ln(e.to)} (${e.warhead}, ${e.targetType})`,
      quote: e.attackerQuote,
    };
    case 'MissileIntercepted':   return { headline: `${ln(e.to)} intercepts ${ln(e.from)}'s ${e.warhead}.` };
    case 'ImpactPeople':         return {
      headline: `${ln(e.target)}: ${e.deaths}M dead`,
      quote: e.targetQuote,
    };
    case 'ImpactInfrastructure': return {
      headline: `${ln(e.target)}: ${e.factoriesDestroyed} factory destroyed`,
      quote: e.targetQuote,
    };
    case 'PropagandaTransfer':   return {
      headline: `${ln(e.from)} propaganda → ${ln(e.to)} (${e.amount}M moved)`,
      quote: e.senderQuote ?? e.receiverQuote,
    };
    case 'WooApplied':           return {
      headline: `${ln(e.from)} wooes ${ln(e.to)} (×${e.points})`,
      quote: e.senderQuote ?? e.receiverQuote,
    };
    case 'LeaderEliminated':     return { headline: `${ln(e.id)} ELIMINATED`, quote: e.quote };
    case 'FinalRetaliationTriggered': return {
      headline: `${ln(e.by)} launches FINAL RETALIATION on ${e.targets.map(ln).join(', ')}`,
      quote: e.quote,
    };
  }
}
```

Add `.quote` style to `EventCard.module.css`:

```css
.quote {
  font-size: 11px;
  font-style: italic;
  color: #5a4a3a;
  margin-top: 4px;
}
```

- [ ] **Step 3: Update Action.tsx if its event-filter excludes the new kinds**

Edit `src/ui/screens/Action.tsx`. P3's existing `phaseAdvanceFor` returns `null` for OrdersSealed/OutcomeReached/LeaderEliminated. Verify the renderable filter and phase grouping accept `DisparageCameo` as a render-only card (no phase advance). Sample patch:

```ts
function isRenderable(e: ResolutionEvent): boolean {
  switch (e.kind) {
    case 'OrdersSealed':
    case 'OutcomeReached':
    case 'PreRoundMood':
    case 'PostRoundReaction':
    case 'DisparageColumn':
      return false;
    default:
      return true;
  }
}

function phaseAdvanceFor(e: ResolutionEvent): Phase | null {
  switch (e.kind) {
    case 'DefenceBuilt': return 'defences';
    case 'FactoryBuilt':
    case 'DeliveryBuilt':
    case 'WarheadBuilt': return 'builds';
    case 'PropagandaTransfer': return 'propaganda';
    case 'WooApplied': return 'wooing';
    case 'MissileLaunched':
    case 'MissileIntercepted':
    case 'ImpactPeople':
    case 'ImpactInfrastructure': return 'launches';
    case 'FinalRetaliationTriggered': return 'finalRetaliation';
    case 'LeaderEliminated':
    case 'OrdersSealed':
    case 'OutcomeReached':
    case 'PreRoundMood':
    case 'PostRoundReaction':
    case 'DisparageCameo':
    case 'DisparageColumn':
      return null;
  }
}
```

- [ ] **Step 4: Run typecheck (catches any missed variant)**

```bash
npm run typecheck
```

Expected: PASS. If a switch is missing a kind, typecheck emits TS2366 (`Function lacks ending return statement`) or fallthrough — fix by adding the missing kind explicitly.

- [ ] **Step 5: Run full suite**

```bash
npm run test:run
```

Expected: PASS — no new tests added in this task beyond what the existing Action tests cover. Running total ~219.

- [ ] **Step 6: Commit**

```bash
git add src/ui/components/DisparageCard.tsx src/ui/components/DisparageCard.module.css src/ui/components/EventCard.tsx src/ui/components/EventCard.module.css src/ui/screens/Action.tsx
git commit -m "ui: Action renders event quotes; DisparageCard for cameo events; exhaustive switch updated"
```

---

## Task 13: RoundSummary masthead + reactions + OBITUARY + DisparageColumn

**Files:**
- Create: `src/ui/components/DisparageColumn.tsx` + `.module.css`
- Modify: `src/ui/screens/RoundSummary.tsx`

**Confidence: 92 %** — four sub-changes. Mitigation: each gets its own step.

- [ ] **Step 1: Wire masthead from state**

Edit `src/ui/screens/RoundSummary.tsx`. Add imports:

```ts
import { pickMasthead } from '../../engine/masthead';
```

Replace the current static masthead string with:

```tsx
<header className={styles.masthead}>
  {pickMasthead(game.mastheadOrder, game.round - 1, game.outcome)}
</header>
```

(Note: `game.round` is the *next* round number after resolveRound advances it; the masthead applies to the round just summarised, hence `round - 1`.)

- [ ] **Step 2: Populate World Reactions with PostRoundReaction quotes**

In RoundSummary.tsx, find the existing World Reactions section (or empty placeholder) and replace with:

```tsx
<section className={styles.worldReactions}>
  <h2 className={styles.sectionTitle}>World Reactions</h2>
  {game.cast.map((id) => {
    const leader = game.leaders[id];
    if (!leader.alive) return null;
    const prev = state.prevPopulations[id] ?? leader.population;
    const delta = leader.population - prev;
    const reaction = state.events.find(
      (e) => e.kind === 'PostRoundReaction' && e.leaderId === id,
    );
    const quote = reaction?.kind === 'PostRoundReaction' ? reaction.quote : undefined;
    return (
      <div key={id} className={styles.reactionRow}>
        <span className={styles.reactionFlag}>{leader.country.split(' ')[0]}</span>
        <span className={styles.reactionName}>{leader.name}</span>
        <span className={styles.reactionDelta}>{delta >= 0 ? `+${delta}` : delta}M</span>
        {quote && <span className={styles.reactionQuote}>"{quote}"</span>}
      </div>
    );
  })}
</section>
```

- [ ] **Step 3: OBITUARY entries for newly-eliminated**

In RoundSummary.tsx, after the World Reactions section, add:

```tsx
<section className={styles.obituaries}>
  {game.cast.map((id) => {
    const leader = game.leaders[id];
    const prev = state.prevPopulations[id];
    // Eliminated this round = alive=false AND prev > 0
    if (leader.alive || prev === undefined || prev <= 0) return null;
    const death = state.events.find(
      (e) => e.kind === 'LeaderEliminated' && e.id === id,
    );
    const quote = death?.kind === 'LeaderEliminated' ? death.quote : undefined;
    return (
      <div key={`obit-${id}`} className={styles.obit}>
        <div className={styles.obitHeader}>OBITUARY: {leader.name}</div>
        {quote && <div className={styles.obitQuote}>"{quote}"</div>}
      </div>
    );
  })}
</section>
```

- [ ] **Step 4: DisparageColumn sidebar**

Create `src/ui/components/DisparageColumn.tsx`:

```tsx
import type { ResolutionEvent } from '../../engine/types';
import styles from './DisparageColumn.module.css';

interface Props {
  event: Extract<ResolutionEvent, { kind: 'DisparageColumn' }>;
}

export default function DisparageColumn({ event }: Props) {
  return (
    <aside className={styles.column}>
      <header className={styles.header}>
        THE DISPARAGE COLUMN
        <span className={styles.subhead}>From his Clacton office (allegedly)</span>
      </header>
      <p className={styles.body}>{event.quote}</p>
      <footer className={styles.footer}>{event.footer}</footer>
    </aside>
  );
}
```

Create `src/ui/components/DisparageColumn.module.css`:

```css
.column {
  background: #fff;
  border: 1px solid #d0c8b8;
  border-top: 4px solid #b02a37;
  padding: 12px 14px;
  margin: 16px 0;
}

.header {
  font-family: 'Times New Roman', serif;
  font-size: 14px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.02em;
  color: #1a1a1a;
  margin-bottom: 8px;
}

.subhead {
  display: block;
  font-size: 10px;
  font-weight: 400;
  text-transform: none;
  color: #6c757d;
  font-style: italic;
  margin-top: 2px;
}

.body {
  font-size: 13px;
  line-height: 1.5;
  color: #1a1a1a;
  margin: 0 0 8px;
}

.footer {
  font-size: 10px;
  color: #6c757d;
  font-style: italic;
  border-top: 1px dotted #d0c8b8;
  padding-top: 6px;
}
```

Wire into RoundSummary.tsx — add import:

```ts
import DisparageColumn from '../components/DisparageColumn';
```

Render before the bottom button:

```tsx
{(() => {
  const col = state.events.find((e) => e.kind === 'DisparageColumn');
  if (col?.kind === 'DisparageColumn') return <DisparageColumn event={col} />;
  return null;
})()}
```

- [ ] **Step 5: Add styles for World Reactions and OBITUARY in RoundSummary.module.css**

Append to `src/ui/screens/RoundSummary.module.css`:

```css
.worldReactions { margin: 16px 0; }
.reactionRow {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border-bottom: 1px dotted #d0c8b8;
  font-size: 12px;
}
.reactionFlag { font-size: 16px; }
.reactionName { font-weight: 600; min-width: 90px; }
.reactionDelta { font-family: 'Consolas', monospace; color: #b02a37; min-width: 40px; }
.reactionQuote { font-style: italic; color: #5a4a3a; font-size: 11px; }

.obituaries { margin: 16px 0; }
.obit { background: #f4f4f4; border-left: 4px solid #1a1a1a; padding: 10px 12px; margin-bottom: 6px; }
.obitHeader { font-weight: 700; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em; color: #1a1a1a; }
.obitQuote { font-style: italic; font-size: 12px; color: #5a4a3a; margin-top: 4px; }
```

- [ ] **Step 6: Run full suite**

```bash
npm run test:run
npm run typecheck
```

Expected: PASS — running total ~219 (no new test files; existing RoundSummary tests still pass).

- [ ] **Step 7: Commit**

```bash
git add src/ui/components/DisparageColumn.tsx src/ui/components/DisparageColumn.module.css src/ui/screens/RoundSummary.tsx src/ui/screens/RoundSummary.module.css
git commit -m "ui: RoundSummary — masthead from state, populated reactions, OBITUARY entries, Disparage column"
```

---

## Task 14: README Phase 4a status note

**Files:**
- Modify: `README.md`

**Confidence: 98 %**

- [ ] **Step 1: Append the Phase 4a section**

Edit `README.md`. After the existing "## Phase 3 status" section (ends around line 133), append:

```markdown
## Phase 4a status

Phase 4a (Satire + Hotseat) ships multi-human hotseat support plus the full satirical voice — flavor banks wired into events, Disparage cameo on Action and Round Summary, masthead rotation, and 3 soft-warns on Planning. Verification: `npm run test:run` (~219 tests, ~46 files).

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
```

- [ ] **Step 2: Run full suite + typecheck**

```bash
npm run typecheck
npm run test:run
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs: Phase 4a status note in README"
```

---

## Self-review checklist (run before handoff)

1. **Spec coverage:**
   - §2.1 Hotseat Handoff → Tasks 8 + 9 + 10 (store routing + screen + Setup roster).
   - §2.2 Flavor banks → Tasks 2 + 3 + 6 (banks + picker + resolution wiring).
   - §2.3 Disparage cameo → Tasks 5 + 6 + 12 + 13 (cameo trigger + resolution emission + Action card + RoundSummary column).
   - §2.4 Masthead rotation → Task 4 + Task 13 step 1 (engine + UI).
   - §2.5 Soft-warn validation → Tasks 7 + 11 (engine helper + UI panel).
   - §4.2 ResolutionEvent schema growth → Task 1 + Task 6 (types + emission).
   - §4.3 GameState additions → Task 1.
   - §4.5 UI store changes → Task 8.
   - §4.6 Setup form → Task 10.
   - §5.1–5.4 UI rendering → Tasks 9 + 11 + 12 + 13.
   - §6 Testing → tests embedded in each task; running total ~219.
   - §7.1 Snap-back skip when eliminated → Task 6 (`if (!s.leaders[id].alive) continue` in PreRoundMood emission already drops the leader).

2. **Placeholder scan:** none found on review.

3. **Type consistency:**
   - `FlavorBank` is defined once in `flavor/index.ts` and imported by all bank files + `pick.ts`.
   - `SoftWarning` defined in `types.ts` (Task 1), imported by `orders.ts` (Task 7) and `SoftWarnPanel.tsx` (Task 11).
   - `ResolveResult` and the existing engine API surface stays unchanged.

---

## Execution handoff
