# Phase 4a — Satire + Hotseat design spec

**Date:** 2026-05-12
**Status:** drafted from brainstorming session; pending user review
**Source of truth:** the original `docs/superpowers/specs/2026-05-08-nuke-design.md` and `docs/superpowers/flavour-bank.md`; this spec is a P4a-scoped consolidation of decisions made in the 2026-05-12 brainstorming session.

---

## 1. Overview

Phase 4a brings the P3 UI shell to a complete, playable, multi-human game with satirical voice. Five workstreams:

1. **Hotseat Handoff** — 2–5 humans on one device with a curtain screen between turns.
2. **Flavor banks wired** — the ~130 lines already authored in `flavour-bank.md` become engine modules, picked deterministically at resolution time and baked into events.
3. **Disparage cameo** — the satirical Nigel Disparage character appears as a text card on Action and a sidebar column on Round Summary, with snap-back lines on named leaders.
4. **Masthead rotation** — 15-name pool shuffled at game start, one per round, apocalypse override.
5. **Soft-warn validation** — three non-blocking advisory warnings on Planning, layered over P3's hard-block.

**Deferred to P5** (after AI tuning lands in P4b): persistence + replay scrubber, action-screen animations, audio, SVG art, PWA manifest. These were re-scoped during this brainstorming session — see §8.

**Deferred to P4b:** AI scoring-weight balance pass, Approach B / C lookahead upgrades.

---

## 2. Scope (5 workstreams)

### 2.1 Hotseat Handoff

- Setup grows a **human roster** of 1–5 entries (Q8 Variant B: `+ Add another human` button, `×` to remove non-P1 cards).
- **Cast-index turn order**, fixed across rounds (Q3): the order humans appear in the roster is the order they plan each round.
- **Country-forward curtain** between humans (Q4 Variant B): dark gradient background, 72px flag emoji, country name (22px bold), leader name (16px), divider, "Previous orders sealed." reassurance, "Tap to begin →" single-tap reveal.
- **Auto-shows on Seal Orders.** No extra confirmation tap — completing the existing 600ms Hold-to-Seal gesture transitions straight to the curtain.
- **Solo skips** (humans count = 1): curtain never reached.

### 2.2 Flavor banks wired

- **Engine emits chosen lines**, baked into events (Q2 Recommended): one new module per leader exports the line bank as pure data; `flavor/pick.ts` picks via seeded RNG; `resolveRound` attaches chosen lines to `ResolutionEvent` quote fields and emits new flavor-only events (`PreRoundMood`, `PostRoundReaction`).
- **Twelve categories per leader**, matching `flavour-bank.md`: `preRoundMood`, `launch`, `hit`, `woo`, `beingWooed`, `propagandaSend`, `propagandaReceive`, `buildFactory`, `buildDefence`, `reaction`, `death`, `finalRetaliation`.
- **Snap-back** is a special variant in `preRoundMood`: when Disparage's column named this leader last round, `pick.ts` returns the dedicated snap-back line instead of a random mood.
- **Generic tabloid fallback** when a category bank is empty for a leader (per `flavour-bank.md`'s rule).

### 2.3 Disparage cameo

- **Both surfaces wired** (Q5 Recommended), text-only in P4a (portrait + animation defer to P5).
- **Action card variant** — when the engine rolls a cameo on a launch impact, a styled text card ("🍺 FROM CLACTON" header, quote body) is inserted into the event-card stream immediately after the impact event.
- **Round Summary column** — `<DisparageColumn>` sidebar appears beside the World Reactions list when a `DisparageColumn` event fires for the round. Heading "THE DISPARAGE COLUMN — From his Clacton office (allegedly)", body = quote, footer = rotating absentee-MP note.
- **Trigger probabilities** (deterministic, seeded RNG): cameo on Action ~17.5% per `ImpactPeople`/`ImpactInfrastructure`; column on Round Summary ~33% per round.
- **`namedLeader` selection** for the column: prefers a leader who attacked this round; falls back to a uniform random pick from living non-Disparage leaders.
- **Snap-back** lands on the named leader's next-round `PreRoundMood` (`pick.ts` returns the dedicated snap-back line). Skip-silently if the named leader is eliminated this round (§7.1).

### 2.4 Masthead rotation

- **15-name pool** from the design's authored list (10 real-world parodies + 5 nuke-themed originals).
- **Fisher-Yates shuffle** at `NEW_GAME` using the game seed; result stored as `GameState.mastheadOrder: string[]`.
- **Selection by round:** `mastheadOrder[round % 15]`. With typical 8–14 round games, the pool effectively rotates without repeating.
- **Apocalypse override:** if `state.outcome?.type === 'apocalypse'`, force "THE END TIMES — FINAL EDITION" regardless of round.

### 2.5 Soft-warn validation in Planning

- **Three warnings only** (Q6 Spec MVP):
  - `warhead-no-delivery` — building any warhead when the player owns 0 missiles and 0 bombers and has none queued.
  - `delivery-no-warhead` — building a missile or bomber when the player owns 0 warheads and has none queued.
  - `woo-non-attacker` — wooing a leader who has never recorded aggression against you (`leader.recentAggressionFrom[playerId] === undefined`) and whose favourability toward you is already ≥ 0.
- **Aside-panel placement** (Q7 Variant B): a single `<SoftWarnPanel>` between the order queue and the order form. Each warned order row also gets a warm-yellow row highlight. Panel hides entirely when no warnings — zero noise on clean plans.
- **Recompute trigger:** same lifecycle as the existing hard-block validation — re-runs on every order add/remove.
- **Implementation:** new engine helper `analyseOrderSequence(state, playerId, orders): SoftWarning[]`, parallel to `validateOrderSequence`. Pure function, runs the per-order stockpile projection and emits the three warnings as a typed list.

---

## 3. Round flow

```
P3:    Setup → Planning(player1) → AiConferring → Action → RoundSummary → next round | Winners

P4a:   Setup → Planning(H1) → Curtain(H1→H2) → Planning(H2) → ... → Planning(Hn)
                                                                  → AiConferring
                                                                  → Action
                                                                  → RoundSummary
                                                                  → next round | Winners

Solo:  identical to P3 — humans count = 1, curtain never reached.
```

- **Hotseat curtain** appears only between two consecutive human Planning turns.
- **AI Conferring fires once per round**, after the last human seals (not interleaved per-human).
- **Round transitions:** RoundSummary → Planning(H1) of the next round, restarting the human cycle.

---

## 4. Architecture

### 4.1 Engine modules (new)

```
src/engine/flavor/
  chump.ts                — 12 categories × ~3-6 lines per category (data)
  khameneverhere.ts
  netanyahoo.ts
  carnage.ts
  starmless.ts
  mileighhem.ts
  disparage.ts            — column lines, footer notes, action-cameo one-liners
  pick.ts                 — pickLine(leaderId, category, rng, opts?: { snapBack?: boolean }): string
  index.ts                — leaderId → bank module lookup; generic fallback
src/engine/cameo.ts       — Disparage trigger logic (column 1/3 per round, overlay 17.5% per impact, named-leader prefers attackers)
src/engine/masthead.ts    — 15-name pool + Fisher-Yates shuffle + apocalypse override
```

### 4.2 ResolutionEvent schema growth

**Existing variants** gain optional `quote` fields. None of these break P3 callers (all optional):

```ts
MissileLaunched           { ..., attackerQuote?: string }
ImpactPeople              { ..., targetQuote?: string }
ImpactInfrastructure      { ..., targetQuote?: string }
WooApplied                { ..., senderQuote?: string, receiverQuote?: string }
PropagandaTransfer        { ..., senderQuote?: string, receiverQuote?: string }
FactoryBuilt              { ..., quote?: string }
DefenceBuilt              { ..., quote?: string }
LeaderEliminated          { ..., quote?: string }       // death line
FinalRetaliationTriggered { ..., quote?: string }
```

**New event kinds:**

```ts
PreRoundMood     { kind: 'PreRoundMood';     leaderId: LeaderId; quote: string; snapBack: boolean }
PostRoundReaction { kind: 'PostRoundReaction'; leaderId: LeaderId; quote: string }
DisparageCameo   { kind: 'DisparageCameo';   afterImpact: { from: LeaderId; to: LeaderId }; quote: string }
DisparageColumn  { kind: 'DisparageColumn';  namedLeader?: LeaderId; quote: string; footer: string }
```

Emission rules:
- `PreRoundMood` — one per living **non-human** leader at round start. Humans don't get auto-quotes (their voice is their orders).
- `PostRoundReaction` — one per living **non-human** leader at round end. Same rule.
- `DisparageCameo` — emitted immediately after the `ImpactPeople`/`ImpactInfrastructure` event it comments on (so the event-card stream renders it in the right place).
- `DisparageColumn` — emitted at end of round resolution (after `OutcomeReached`).

### 4.3 GameState additions

```ts
GameState gains:
  mastheadOrder: string[];                // 15-element shuffled pool
  lastColumnNamedLeader?: LeaderId;       // for snap-back next round
```

`mastheadOrder` is seeded once at `NEW_GAME` and never mutates. `lastColumnNamedLeader` is set by `cameo.ts` when a `DisparageColumn` event fires, read by `pick.ts` on the next round's `PreRoundMood` emission, then cleared.

### 4.4 UI modules (new)

```
src/ui/screens/HotseatHandoff.tsx + HotseatHandoff.module.css
src/ui/components/DisparageCard.tsx + DisparageCard.module.css     (Action-screen card variant)
src/ui/components/DisparageColumn.tsx + DisparageColumn.module.css (RoundSummary sidebar)
src/ui/components/SoftWarnPanel.tsx + SoftWarnPanel.module.css     (Planning aside)
```

### 4.5 UI store changes

```ts
UiState gains:
  activeHumanTurn?: LeaderId;                              // who's planning this beat (undefined for solo)
  pendingHumanOrders: Partial<Record<LeaderId, Order[]>>;  // buffer until all humans seal

UiAction gains:
  | { type: 'BEGIN_PLANNING'; leaderId: LeaderId }         // from HotseatHandoff tap
// PLAYER_SUBMIT existing, but reducer logic changes (below)
```

**`PLAYER_SUBMIT` reducer logic** (P4a):

```
on PLAYER_SUBMIT { leaderId, orders }:
  pendingHumanOrders[leaderId] = orders
  next = nextHumanInCastIndex(state.game.cast, leaderId)
  if next exists:
    screen = 'hotseat'
    activeHumanTurn = next
  else:
    drain pendingHumanOrders into engine SUBMIT_ORDERS per leaderId
    screen = 'ai-conferring'
    activeHumanTurn = undefined
    pendingHumanOrders = {}
```

**`BEGIN_PLANNING` reducer logic:**

```
on BEGIN_PLANNING { leaderId }:
  assert state.activeHumanTurn === leaderId
  screen = 'planning'
```

### 4.6 Setup form (variant B from Q8)

`Setup.tsx` gains a `<HumanRoster>` section above the existing AI cast picker:

- Renders `humans: { name: string; country: string }[]`, length 1–5.
- **P1** keeps existing defaults (Rufus T. Firefly / 🦆 Freedonia, both editable). P1 cannot be removed.
- **`+ Add another human`** button: appends a new empty entry. Disabled at length = 5.
- **`×`** on every non-P1 card: removes that entry and closes the gap.
- **Cast IDs auto-assigned by index**: humans[0] → `player1`, humans[1] → `player2`, etc.
- **"Start (N humans + M AI)"** button label is dynamic.

`START_GAME` action grows: `opts.cast` now contains the human IDs in roster order followed by the AI cast (e.g. `['player1', 'player2', 'chump', 'carnage']` for 2 humans + 2 AI).

---

## 5. UI rendering

### 5.1 Action screen

- Existing event cards from P3 render unchanged, **plus** render `event.quote` fields as italic speech-bubble text under the headline. e.g. `MissileLaunched` card shows attacker → target headline plus `attackerQuote` in italics; `ImpactPeople` card shows damage badge plus `targetQuote`.
- **`<DisparageCard>` variant** for `DisparageCameo` events: warm yellow border (#f59f00), "🍺 FROM CLACTON" header (small, uppercase, letter-spaced), quote body in italics, no portrait. Distinguishable from regular event cards at a glance.
- `PreRoundMood` and `PostRoundReaction` events are NOT rendered on Action — those belong to Planning and RoundSummary respectively.

### 5.2 Planning screen

- **Header** reads `state.game.activeHumanTurn` for multi-human games — e.g. "Round 3 · Carnage planning". Single-human games unchanged.
- **Leader cards** — the `.moodSlot` already reserved by P3 renders `PreRoundMood.quote` for that leader. When `PreRoundMood.snapBack === true`, the slot still renders the same `quote` string — the snap-back distinction is invisible to the UI (engine handled the line selection).
- **Player's own card** has no mood line (their card shows their stats, and they speak through their orders).
- **`<SoftWarnPanel>`** sits between the order-queue list and the `<OrderForm>`. Renders nothing when `softWarnings.length === 0`; otherwise renders a single panel with each warning as a list item naming the order it's about.
- **Row highlighting:** order rows whose orders have an associated `SoftWarning` get a warm-yellow background (`#fff8e1`). Combined with the panel, gives both "which row" and "why".

### 5.3 Round Summary

- **Masthead** reads from `state.game.mastheadOrder[round % 15]`, or "THE END TIMES — FINAL EDITION" when `state.outcome?.type === 'apocalypse'`.
- **World Reactions** (previously empty in P3): one entry per living leader showing their name, monospace pop-delta, italic `PostRoundReaction.quote`, and existing state-change badges. Humans get no quote — their entry omits the italic line entirely.
- **OBITUARY** entries for leaders eliminated this round: greyed placeholder portrait (text-only in P4a — no SVG), black border, "OBITUARY:" prefix, last-words quote from `LeaderEliminated.quote`.
- **`<DisparageColumn>` sidebar** rendered when `state.events` includes a `DisparageColumn` event for this round. Heading "THE DISPARAGE COLUMN — From his Clacton office (allegedly)", body = `event.quote`, footer = `event.footer`.

### 5.4 Hotseat Handoff

- **Layout** (Q4 Variant B, 480px centred column to match the rest of P3's screens; browser is the primary target through P4a — mobile responsive lives with PWA in P5):
  - Background: `linear-gradient(180deg, #1a1a2e 0%, #16213e 100%)`
  - Centered column, vertically centered
  - 11px uppercase "PASS THE DEVICE" pre-banner
  - 72px flag emoji (from `state.game.leaders[activeHumanTurn].country`)
  - 22px bold country name (stripped flag — just the text portion)
  - 16px regular leader name at 0.8 opacity
  - 50%-width 1px white-translucent divider
  - 11px "Previous orders sealed." reassurance
  - 13px "Tap to begin →" caption
- **Tap target:** the entire `<HotseatHandoff>` root element. `onClick={() => dispatch({ type: 'BEGIN_PLANNING', leaderId: activeHumanTurn })}`.
- Single tap only — Hold-to-confirm gesture is for irreversible commits (Seal Orders); curtain reveal is reversible (the player can just tap again).

---

## 6. Testing

Same posture as P3: engine-side TDD strict, UI minimum-surface.

### 6.1 Engine tests (Vitest, pure-TS)

- **`flavor/pick.test.ts`** — `pickLine(leaderId, category, rng)` deterministic on identical seeds; covers fallback to generic tabloid template when bank category is empty; covers snap-back override path (returns the dedicated snap-back line when `opts.snapBack === true`).
- **`cameo.test.ts`** — Disparage column rolls fire across many seeds with the right rough distribution (assert "fires for some seeds, not others, deterministically per seed" rather than measuring percentages); cameo overlay similarly; `namedLeader` prefers attackers; snap-back flag is set on next round's `PreRoundMood` for the named leader.
- **`masthead.test.ts`** — Fisher-Yates produces all 15 names exactly once per shuffle; same seed = same order; apocalypse override returns "THE END TIMES — FINAL EDITION" regardless of round.
- **`resolution.test.ts`** (extend existing) — `PreRoundMood` event emitted per living non-human leader at round start; `PostRoundReaction` per living non-human leader at round end; quote fields populated on flavor-relevant events (one targeted test per affected variant); `DisparageCameo` events appear in the right ordinal position (after the impact they comment on); `DisparageColumn` appears at end of resolution.
- **`analyseOrderSequence.test.ts`** (new) — each of the three soft-warns fires when expected and stays silent otherwise.

### 6.2 UI tests (Vitest + jsdom + RTL)

- **`HotseatHandoff.test.tsx`** — renders the next leader's country flag + name; tap dispatches `BEGIN_PLANNING` with the right leaderId; solo flow (humans count = 1) never routes to `hotseat` screen.
- **`Setup.multihuman.test.tsx`** — `+ Add` appends a human up to 5 (button disabled at 5); `×` removes a non-P1 card and shifts subsequent entries up; P1's `×` is absent; "Start (N humans + M AI)" label updates with roster changes.
- **`Planning.softwarn.test.tsx`** — `<SoftWarnPanel>` renders when warnings present, hidden when none; row gets yellow highlight class when its warning fires; clean plan = no panel, no highlights.
- **`store.multihuman.test.ts`** — `PLAYER_SUBMIT` for H1 (of 2) buffers the orders and advances `screen` to `'hotseat'` with `activeHumanTurn = H2`; second `PLAYER_SUBMIT` (for H2) drains the buffer into engine `SUBMIT_ORDERS` per human, advances screen to `'ai-conferring'`, clears buffer + activeHumanTurn; solo flow (humans count = 1) never sets `screen = 'hotseat'`.

### 6.3 Expected total

P3 baseline: 169 tests. P4a adds ~25–30 (engine ~18, UI ~10). Target: **~195–200 tests** at end of P4a.

### 6.4 What is NOT tested

- **Exact quote text** — flavor banks are data; tests assert "a quote was emitted for category X", not specific strings (otherwise the suite breaks every time a line is edited).
- **Cameo probability hits 17.5% / 33% precisely** — tests assert "fires in some seeds, not in others, deterministically per seed". Distribution sweeps are slow and flaky for this use case.
- **Visual appearance of Disparage cards / mood slots / curtain** — RTL renders, asserts presence + role, doesn't check CSS.

### 6.5 Engine-purity check

Same as P3: no React imports anywhere under `src/engine/**`. Enforced by CI typecheck (the engine modules don't depend on the UI package's React types).

---

## 7. Assumptions (3 buckets)

### 7.1 Real concerns

1. **Snap-back when the named leader is eliminated this round.** Resolution: skip silently. If `state.lastColumnNamedLeader === id` and `state.leaders[id].alive === false` at end of resolution, the next round's `PreRoundMood` emission omits leader `id` entirely (they're dead, no mood) and `lastColumnNamedLeader` is cleared. Implementation cost: one extra `alive` check in the `PreRoundMood` emission loop. Decided in this brainstorming session.

### 7.2 Verified safe

1. **Engine purity preserved.** All new P4a engine modules are pure-TS data + pure functions. No React imports under `src/engine/**`.
2. **Determinism preserved.** Every flavor pick, cameo roll, masthead shuffle uses the seeded `Rng` already threaded through `resolveRound`. Replay (P5) stays exact when wired.
3. **P3 backward compatibility.** Single-human flow routes correctly with the curtain skipped. Flavor `quote` fields are optional — pre-flavor event creation paths still typecheck. Soft-warn panel hidden when empty — no visual regression on clean plans.
4. **CSS Modules pattern continues.** New screen + components follow P3's per-screen / per-component file convention.
5. **TDD posture carries over.** Engine TDD strict; UI minimum-surface (HotseatHandoff routing, Setup roster, soft-warn panel, store transitions).

### 7.3 Minor / accepted

1. **Setup with 5 humans + AI cast + difficulty + seed will scroll vertically within the 480px column.** Acceptable — variant B from Q8 already lets the form grow vertically.
2. **Disparage column footer notes** are pulled from a small bank (~5 entries) by round-index modulo. They will repeat within a 15-round game. Accepted; the bank is easy to grow later.
3. **Snap-back fires at most once per "named" event** (the immediate next round). No multi-round grudge tracking through Disparage. Accepted per spec.
4. **Mid-round persistence** (save mid-Planning when some humans have submitted but not all) is out of scope. P5 problem.
5. **Masthead pool is fixed at 15 names** from the design's authored list. No per-game customisation in P4a.

---

## 8. Out of scope

### 8.1 Deferred to P5 (post-tuning polish)

- **Persistence** — localStorage save/load + Resume entry point + parallel action log.
- **Replay timeline scrubber UI on Winners** — engine `orderHistory` (from P3) already supports it; only the UI is missing.
- **Action-screen animations** — Framer Motion variants, missile arcs on a world map, damage badges, Fast Resolve toggle (3× speed).
- **Audio** — `play(soundName)` wrapper, launch beep, impact boom, intercept fizzle, propaganda jingle, wooing chime, round-summary stinger, Winners trumpet, ambient war-room hum loop, `prefers-reduced-motion` mute.
- **SVG art** — six leader portraits, Disparage portrait, world map, Freedonia flag, mushroom-cloud illustration, ruined-iconography per leader for Winners.
- **PWA manifest + service worker** — installable to home screen. Capacitor mobile wrap is post-v1.

### 8.2 Deferred to P4b (AI tuning)

- **AI scoring-weight balance pass** — convert the duel test from "engine didn't crash" to actual balance assertions; address the documented mutual-shield-saturation stalemate and reactive-personality bootstrap issue.
- **Approach B / C upgrades** to Hard-mode lookahead — sliding-window history (B) and personality-fit modelling (C).

---

## 9. File list

### 9.1 New files

```
src/engine/flavor/chump.ts
src/engine/flavor/khameneverhere.ts
src/engine/flavor/netanyahoo.ts
src/engine/flavor/carnage.ts
src/engine/flavor/starmless.ts
src/engine/flavor/mileighhem.ts
src/engine/flavor/disparage.ts
src/engine/flavor/pick.ts
src/engine/flavor/index.ts
src/engine/cameo.ts
src/engine/masthead.ts
src/ui/screens/HotseatHandoff.tsx
src/ui/screens/HotseatHandoff.module.css
src/ui/components/DisparageCard.tsx
src/ui/components/DisparageCard.module.css
src/ui/components/DisparageColumn.tsx
src/ui/components/DisparageColumn.module.css
src/ui/components/SoftWarnPanel.tsx
src/ui/components/SoftWarnPanel.module.css
tests/engine/flavor/pick.test.ts
tests/engine/cameo.test.ts
tests/engine/masthead.test.ts
tests/engine/analyseOrderSequence.test.ts
tests/ui/HotseatHandoff.test.tsx
tests/ui/Setup.multihuman.test.tsx
tests/ui/Planning.softwarn.test.tsx
tests/ui/store.multihuman.test.ts
```

### 9.2 Modified files

```
src/engine/types.ts            — new event kinds, optional quote fields on existing variants, GameState gains mastheadOrder + lastColumnNamedLeader
src/engine/state.ts            — initialState seeds mastheadOrder via Fisher-Yates
src/engine/resolution.ts       — emit PreRoundMood / PostRoundReaction / DisparageCameo / DisparageColumn; populate quote fields on existing events
src/engine/orders.ts           — add analyseOrderSequence helper
src/ui/App.tsx                 — route 'hotseat' screen
src/ui/store.ts                — UiState + UiAction extensions; PLAYER_SUBMIT routing logic
src/ui/screens/Setup.tsx       — human roster (1-5)
src/ui/screens/Planning.tsx    — header shows activeHumanTurn; SoftWarnPanel; mood lines
src/ui/screens/Action.tsx      — render quote fields; DisparageCard variant
src/ui/screens/RoundSummary.tsx — masthead from state; reactions populated; OBITUARY; DisparageColumn sidebar
src/ui/components/LeaderCard.tsx — render PreRoundMood quote in moodSlot
README.md                      — Phase 4a status section (additive, mirrors P2.5 / P3 pattern)
```

---

## 10. References

- `docs/superpowers/specs/2026-05-08-nuke-design.md` — original full design; this spec is a P4a-scoped consolidation.
- `docs/superpowers/flavour-bank.md` — the ~130 lines that get serialised into `src/engine/flavor/*.ts` modules.
- `docs/superpowers/specs/2026-05-11-phase-3-ui-design.md` — P3 design; this spec extends what P3 left as deferred.
- `README.md` — Phase 3 status (will gain a Phase 4a status section after this lands).
