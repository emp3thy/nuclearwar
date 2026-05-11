# Phase 3 — Thin UI Shell Design

**Date:** 2026-05-11
**Status:** drafted from brainstorming session 2026-05-11; pending user review
**Phase:** 3 (UI-only, ships first playable build)

A thin React UI shell over the existing engine: six functional screens, mockup-matched CSS, no animations / no flavor banks / no audio / no persistence / no replay scrubber / no portrait art / no masthead rotation. The objective is "first playable build" — every screen reachable, the round loop works end-to-end, the player can pick a cast (themselves + 2-4 AI characters), submit orders, see resolution, and reach a Winners screen.

A small engine refactor lands first (Task 1) to extend Phase 2.5's `lastOrders` field into a per-round `orderHistory` array. This positions Phase 4a's replay scrubber + AI lookahead enhancements (Approaches B / C) as pure UI / logic changes against existing data, with no further engine refactor.

---

## 1. Problem statement

Phase 1 shipped the engine core, Phase 2 shipped six AI personalities, and Phase 2.5 introduced the human player slot (`player1` with overridable name / country). Nothing runs in a browser yet. The engine returns `Order[]` and `ResolutionEvent[]` and tracks `GameState`, but a human cannot actually play the game without manually calling `reduce(state, action)` from a test.

Phase 3 bridges that gap: a thin React UI that wraps the existing engine. The UI must be functional (all six relevant screens, end-to-end round loop, win detection, replay) but visually plain — no animations, no flavor lines in speech bubbles, no portrait art, no masthead rotation. Those land in Phase 4a as the "complete game" polish layer.

---

## 2. Goals

1. **Vite + React + TypeScript scaffold** under `src/ui/`, separate from the engine, sharing only the engine's exported surface (`initialState`, `reduce`, `planAi`, `resolveRound`, types).
2. **Six functional screens** (Setup, Planning, AI Conferring, Action, Round Summary, Winners) navigable via a screen state machine in `useReducer`.
3. **First-class player slot affordance** in Setup — name + country editable, defaults from Phase 2.5 (`Rufus T. Firefly` / `🦆 Freedonia`).
4. **Card-per-event Action screen** using country-flag emoji as portrait substitutes — no world-map SVG, no animations.
5. **Engine refactor** (Task 1): replace `lastOrders` (P2.5's single-round snapshot) with `orderHistory` (per-round array). Sets up Phase 4a's replay scrubber + advanced AI lookahead without further engine churn.
6. **Mockup-matched CSS** via CSS Modules — the existing `planning-screen.html`, `action-screen.html`, `round-summary.html` are visual specs; thin P3 ports their styles minus animation infrastructure.
7. **Minimum UI tests** — Vitest + jsdom + React Testing Library on `OrderForm` (validation logic) and `ApBudget` (budget computation). Other components untested in thin P3.

## 2a. Non-goals (deferred)

**Deferred to P4a (complete-game polish):**

- Hotseat Handoff screen (§9.2 of original spec) — multi-human game flow, pass-the-device curtain
- Persistence (localStorage save/load, Resume entry point, action log for replay determinism)
- Replay scrubber UI on Winners screen (data shape provided by Task 1's `orderHistory`)
- Animations (Framer Motion variants, 1.8s/event Action pacing, Fast Resolve toggle, missile arcs, damage badges floating, country pulses)
- Flavor banks (`src/engine/flavor/<leader>.ts`) wired into speech bubbles, tabloid quotes, mood lines, OBITUARY last-words
- Disparage cameo mechanic (engine + UI hookup)
- Masthead rotation pool (15 mastheads, Fisher-Yates per game) and "Failing New York Times" Chump easter egg
- Audio (`play(name)` wrapper, sfx + ambient music, prefers-reduced-motion mute)
- SVG art: leader caricature portraits, stylised world map, Freedonia flag, mushroom-cloud illustration, ruined-iconography for Winners
- PWA manifest + service worker
- Soft-warn validation in Planning (wooing non-attackers, warhead-without-delivery hints)

**Deferred to P4b (tuning):**

- AI scoring-weight balance pass
- AI-duel headless test balance assertions (currently asserts only "100 games ran without crash")
- Approach B / C upgrades to Hard-mode lookahead (data is in place via Task 1)

**Out of v1 entirely (per spec §16):** i18n, custom leader creation / mods, achievements, voice acting, Capacitor mobile builds, online multiplayer, spectator mode, procedural world events.

---

## 3. Architectural overview

### 3.1 Tooling

New devDependencies:

- `react@^18`, `react-dom@^18`, `@types/react`, `@types/react-dom`
- `vite@^5`, `@vitejs/plugin-react`
- `@testing-library/react`, `@testing-library/jest-dom`, `jsdom`

New scripts in `package.json`:

- `"dev": "vite"` — Vite dev server with hot reload
- `"build": "tsc --noEmit && vite build"` — typecheck + static `dist/` output

Existing scripts (`test`, `test:run`, `typecheck`) unchanged. Vitest gains a `jsdom` environment via `vite.config.ts`.

### 3.2 Folder layout

```
src/ui/
├── App.tsx                  ← top-level shell, useReducer + screen switch
├── store.ts                 ← UI reducer + action types
├── main.tsx                 ← React 18 createRoot entry
├── screens/
│   ├── Setup.tsx + .module.css
│   ├── Planning.tsx + .module.css
│   ├── AiConferring.tsx + .module.css
│   ├── Action.tsx + .module.css
│   ├── RoundSummary.tsx + .module.css
│   └── Winners.tsx + .module.css
└── components/
    ├── LeaderCard.tsx + .module.css
    ├── OrderForm.tsx + .module.css
    ├── ApBudget.tsx + .module.css
    ├── EventCard.tsx + .module.css
    └── PhaseTracker.tsx + .module.css
```

New top-level files:

- `vite.config.ts` (React plugin + Vitest jsdom env + `setupFiles`)
- `index.html` at project root, mounts `<div id="root"></div>`, imports `src/ui/main.tsx`
- `tsconfig.json` updated with `"jsx": "react-jsx"` + DOM lib

No `animation/`, `audio/`, `persistence.ts` from spec §10 — those land in P4a per the agreed phase split.

### 3.3 State shape

```ts
// src/ui/store.ts
type ScreenName = 'setup' | 'planning' | 'aiConferring' | 'action' | 'roundSummary' | 'winners';

interface UiState {
  screen: ScreenName;
  game: GameState | null;                            // null until START_GAME
  events: ResolutionEvent[];                          // last round's events (drives Action screen)
  prevPopulations: Partial<Record<LeaderId, number>>; // snapshot before resolveRound (drives RoundSummary deltas)
  initialPopulations: Partial<Record<LeaderId, number>>; // snapshot at START_GAME (drives Winners %-lost)
  lastNewGameOpts: NewGameOpts | null;               // for "Same Cast, Again"
}
```

Section 3's earlier proposal of a separate `roundLog: ResolutionEvent[][]` field is removed; Planning's history strip derives from engine state directly (via `orderHistory.length` + the engine's `state.log` filtered by round boundaries).

### 3.4 Screen flow

```
Setup → (NEW_GAME) → Planning → (player Seal) → AiConferring → (1.5s timer) → Action
                                                                                  │
                                                                                  ▼
                                                                       outcome === null?
                                                                          yes ─ RoundSummary → (Round N+1) → Planning
                                                                          no  ─ Winners → (New Game / Same Cast) → Setup
```

No React Router. State machine lives in the reducer.

### 3.5 UI actions

```ts
type UiAction =
  | { type: 'START_GAME'; opts: NewGameOpts }
  | { type: 'PLAYER_SUBMIT'; orders: Order[] }
  | { type: 'AI_RESOLVE' }
  | { type: 'ACTION_DONE' }
  | { type: 'NEXT_ROUND' }
  | { type: 'BACK_TO_SETUP' };
```

The reducer composes engine calls: `initialState`, `reduce`, `planAi`, `resolveRound`, `isHuman`. Engine stays zero-React, fully deterministic.

---

## 4. Engine refactor (Task 1, before any UI work)

### 4.1 What changes

`GameState.lastOrders: Partial<Record<LeaderId, Order[]>>` (P2.5's single-round snapshot) → `GameState.orderHistory: Partial<Record<LeaderId, Order[]>>[]` (per-round array, one entry per completed round).

`initialState()` seeds `orderHistory: []` (in place of `lastOrders: {}`).

`resolveRound()` appends a snapshot of this round's submitted orders to `s.orderHistory` BEFORE clearing `pendingOrders` (replaces the equivalent `s.lastOrders = {...}` block from P2.5).

`bestTargetByLookahead()` reads the most recent entry: `state.orderHistory[state.orderHistory.length - 1]?.[id] ?? []` (in place of `state.lastOrders[id] ?? []`).

### 4.2 Why now (not P4a)

The data shape is the same — the only question is whether we accept the single-round snapshot for Phase 3 and refactor in P4a, OR refactor once at the start of Phase 3 so all downstream consumers (replay scrubber UI in P4a, advanced AI lookahead in P4a/P4b, save/load JSON-round-trip in P4a) speak the same shape from day one.

**Cost in P3:** ~30 lines of engine code change + ~30 lines of test reshape.
**Saved in P4a:** the same refactor + a separate `src/engine/replay.ts` module + lookahead Approach B/C as new logic (vs. just data-window changes).

### 4.3 Tests reshaped

- `tests/engine/state.test.ts:97-103` — `expect(s.lastOrders).toEqual({})` → `expect(s.orderHistory).toEqual([])`
- `tests/engine/resolution.test.ts` "lastOrders persistence" describe block — assertions become `state.orderHistory[0]` / `state.orderHistory[1]` indexing instead of `state.lastOrders` map access
- `tests/engine/integration.test.ts` mixed-cast e2e — final assertion `expect(s.lastOrders.player1).toEqual(playerOrders)` → `expect(s.orderHistory[s.orderHistory.length - 1]?.player1).toEqual(playerOrders)`
- `tests/engine/ai/lookahead.test.ts` "with-history" sub-case — pre-populates `s.orderHistory = [{ player1: [...] }]` instead of `s.lastOrders = { player1: [...] }`

161 engine tests stay green after the refactor; no behavioural change.

---

## 5. Setup screen

The only screen with substantial drift from spec §9.1 (player slot didn't exist when the spec was written).

### 5.1 Layout (top → bottom)

1. **Header** — "New Game"
2. **Player slot panel** (new):
   - Name input — text field, default `"Rufus T. Firefly"`, editable
   - Country input — text field, default `"🦆 Freedonia"`, editable (plain string; no separate emoji picker in thin P3)
3. **AI cast picker** — six tappable cards (one per AI character) showing country glyph + name + start-pop. User toggles 2-4 ON
4. **Difficulty** — three radio buttons: Easy / Normal / Hard
5. **Seed** — optional text input; empty → generated default
6. **"New Game" button** — disabled until cast picker has 2-4 AI selected

### 5.2 Tap dispatches

```ts
dispatch({
  type: 'START_GAME',
  opts: {
    cast: ['player1', ...selectedAi],
    difficulty,
    seed: seedInput || generateSeed(),
    config: {
      playerProfiles: {
        player1: { name: nameInput, country: countryInput },
      },
    },
  },
});
```

Reducer calls `initialState(opts)`, captures `initialPopulations` and `lastNewGameOpts`, transitions to `'planning'`.

### 5.3 No Resume button

Persistence is P4a. Setup shows only "New Game".

---

## 6. Planning screen

The most complex screen. Mockup `planning-screen.html` is the canonical visual; thin P3 ports its CSS via CSS Modules.

### 6.1 Component tree

```
<Planning>
  <Header round={state.game.round} />          ← no save / fast-resolve buttons (P4a)
  <OwnCountryPanel leader={state.game.leaders.player1} />
    └─ <AssetCounter />  (per stockpile asset)
    └─ <ApBudget />
  <HistoryStrip orderHistory={...} log={...} />
  <LeadersTable>                                ← 2×2 grid (or 2×3 for 5-cast)
    └─ <LeaderCard /> × N                        ← AI characters only
  </LeadersTable>
  <OrderQueue orders={localOrders}>             ← player's pending orders (local React state)
    └─ <OrderRow /> × N
  </OrderQueue>
  <OrderForm onAdd={...} />                     ← "+Add Order" — kind + params
  <SealOrdersButton onSeal={...} />             ← tap-and-hold (600ms) confirms
</Planning>
```

### 6.2 State flow

- `state.game.leaders.player1` → `OwnCountryPanel`. Other leaders → `LeaderCard` (filtered by `!isHuman(id)`).
- Player composes orders via `OrderForm` → into local component state (`useState<Order[]>`), shown in `OrderQueue`.
- Tap-and-hold "Seal Orders" → dispatches `PLAYER_SUBMIT` UI action → reducer calls `reduce({ type: 'SUBMIT_ORDERS', leaderId: 'player1', orders })`, transitions to `'aiConferring'`.

### 6.3 OrderForm

Kind picker shows the 10 order types (build-factory, build-missile, build-bomber, build-warhead × 3 yields, build-defence × 2 types, launch, propaganda, woo). Each kind reveals its required parameters: launch shows target + delivery + warhead + targetType; build-factory shows no extras. "Add" button validates via `validateOrder(state, 'player1', order)` from `src/engine/orders` — same predicate the engine uses — and surfaces `{ ok: false, reason }` inline if rejected.

### 6.4 Validation

- **Hard-block** (UI prevents commit): launch without delivery+warhead, AP overrun, stockpile constraint violations — engine's `validateOrder` rejects, UI surfaces reason
- **Soft-warn** (per spec §9.3): wooing non-attackers, warhead-without-delivery — **deferred to P4a**

### 6.5 LeaderCard content

- Country flag + name + key stats (pop, factories, arsenal totals)
- Relationship badges: `hit-you` (recentAggressionFrom > 0), `wooing-you` (favourability against player > 0), `you-wooed` (player's favourability against them > 0), `grudge` (grudge against player > 0)
- **No mood line** — flavor (P4a). CSS reserves the space; thin P3 leaves it empty.

### 6.6 Tap-and-hold "Seal Orders"

Pointer-down starts a 600ms timer with a CSS `transform: scaleX(progress)` filling overlay. Release before 600ms cancels. Reaching 600ms dispatches `PLAYER_SUBMIT`. Mockup CSS already has the button shape; thin P3 adds the progress overlay + JS timer.

### 6.7 HistoryStrip

Renders last 3 rounds' impactful events from `state.game.log` as horizontal-scroll chips: launches as "🇨🇦 → 🇮🇷" with attack styling, builds elided (too noisy). Round count derived from `state.game.orderHistory.length`. Events grouped to rounds by walking the log alongside resolveRound boundaries.

---

## 7. AI Conferring beat

### 7.1 Component

`<AiConferring>` — single centered text element ("AI players are filing orders…"), CSS pulsing dots, no input.

### 7.2 Behaviour

```ts
useEffect(() => {
  const timer = setTimeout(() => dispatch({ type: 'AI_RESOLVE' }), 1500);
  return () => clearTimeout(timer);
}, []);
```

The `AI_RESOLVE` reducer case:

```ts
case 'AI_RESOLVE': {
  let game = state.game!;
  const prevPopulations: Partial<Record<LeaderId, number>> = {};
  for (const id of game.cast) prevPopulations[id] = game.leaders[id].population;

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
```

### 7.3 Timing rationale

`planAi` + `resolveRound` runs in microseconds for a 5-leader cast. The 1.5s timer is purely cosmetic — gives the player a moment between sealing orders and seeing resolution. P4a may add a Fast Resolve toggle that drops it to ~500ms.

---

## 8. Action screen (card-per-event)

Card-per-event with country flag emoji as portrait substitute. No world-map SVG, no animations.

### 8.1 Layout

Events grouped under phase-headers (top-to-bottom). Skip `OrdersSealed` events (meta noise). Special-case `LeaderEliminated` (renders inline at end of the phase that killed them) and `OutcomeReached` (drives Continue button text).

```
DEFENCES   → DefenceBuilt events
BUILDS     → FactoryBuilt, DeliveryBuilt, WarheadBuilt events
PROPAGANDA → PropagandaTransfer events
WOOING     → WooApplied events
LAUNCHES   → MissileLaunched, MissileIntercepted, ImpactPeople, ImpactInfrastructure events
FINAL RETALIATIONS → FinalRetaliationTriggered + cascading impacts
```

### 8.2 EventCard

Helper `formatEventCard(event, leaders): { icon, body }` returns the visual content per event kind:

| Event kind | Icon | Card body |
|---|---|---|
| `FactoryBuilt` | ⚙ | `<flag> <name> builds 1 factory` |
| `DeliveryBuilt` | 🚀 / 🛩 | `<flag> <name> builds 1 missile/bomber` |
| `WarheadBuilt` | ☢ | `<flag> <name> builds 1 <yield> warhead` |
| `DefenceBuilt` | 🛡 | `<flag> <name> builds 1 shield/AA` |
| `PropagandaTransfer` | 📰 | `<flag> <from> → <flag> <to> · <n>M transferred` |
| `WooApplied` | 🤝 | `<flag> <from> woos <flag> <to> · <n> points` |
| `MissileLaunched` | 🚀 | `<flag> <from> → <flag> <to> (<yield> · <targetType>)` |
| `MissileIntercepted` | 🛡✗ | `<from>'s <delivery> to <to> intercepted` |
| `ImpactPeople` | ☠️ | `<flag> <target> ─ <n>M deaths (from <flag> <from>)` |
| `ImpactInfrastructure` | 🏭✗ | `<flag> <target> ─ <n> factories destroyed` |
| `LeaderEliminated` | ⬛ | `<name> eliminated` (rendered with `.obituary` class) |
| `FinalRetaliationTriggered` | 💥 | `<flag> <by> launches Final Retaliation at <targets>` |

### 8.3 Continue button

- `outcome === null` → "Continue → Round Summary" → transitions to `roundSummary`
- `outcome !== null` → "View Final Verdict" → transitions to `winners`

### 8.4 No sequential reveal

All events visible immediately as a scrollable feed. Spec §9.5's "~1.8s per event" pacing + Fast Resolve toggle are animation infrastructure → P4a.

---

## 9. Round Summary screen

### 9.1 Layout

```
─── THE NUKE TIMES ───  R 3
        <HEADLINE>
        <subhead>
[ casualty strip placeholder ]
WORLD REACTIONS
  <flag> <name>   <pop-delta>  <state-badge>
  ...
[ Round N+1 → Plan ] or [ Final Verdict ]
```

### 9.2 Component decomposition

```
<RoundSummary>
  <Masthead />              ← static "THE NUKE TIMES" (P4a adds rotation)
  <Headline events leaders prevPopulations />
  <Subhead events leaders />
  <CasualtyStrip casualties={...} />
  <WorldReactions leaders prevPopulations />
    └─ <ReactionRow eliminated? />
  <ContinueButton outcome={state.game.outcome} />
</RoundSummary>
```

### 9.3 Headline algorithm (placeholder, P4a wires flavor)

```ts
function pickHeadline(events, leaders, prevPopulations): string {
  const elims = events.filter(e => e.kind === 'LeaderEliminated');
  if (elims.length > 0) return `${leaders[elims[0].id].name.toUpperCase()} ELIMINATED`;

  let worstId: LeaderId | null = null;
  let worstDelta = 0;
  for (const id in prevPopulations) {
    const delta = leaders[id].population - prevPopulations[id]!;
    if (delta < worstDelta) { worstDelta = delta; worstId = id; }
  }
  if (worstDelta <= -10) return `${leaders[worstId!].name.toUpperCase()} CLOBBERED`;
  if (worstDelta <= -3) return `${leaders[worstId!].name.toUpperCase()} STRUCK`;

  return `ROUND ${round - 1} SETTLES`;
}
```

### 9.4 Special variants

- **Apocalypse** (`outcome.type === 'apocalypse'`): headline `**THE END.**`, casualty strip `"Total casualties: 100%"`
- **OBITUARY for eliminated leaders**: `ReactionRow` renders with `.obituary` class (greyed portrait area, black border, "OBITUARY:" prefix). **No last-words quote** (flavor, P4a)
- **"Failing New York Times" easter egg**: P4a only (depends on masthead rotation)

### 9.5 ContinueButton

- `outcome === null` → "Round N → Plan" → dispatches `NEXT_ROUND`, transitions to `'planning'`
- `outcome !== null` → "Final Verdict" → transitions to `'winners'`

---

## 10. Winners screen

### 10.1 Component decomposition

```
<Winners>
  <WinHeadline outcome={state.game.outcome} leaders={...} />
  <SubLine outcome={...} leaders={...} initialPopulations={...} />
  <DeathTollTable leaders={...} initialPopulations={...} />
  <NewGameButtons />
</Winners>
```

### 10.2 WinHeadline

| outcome.type | Headline |
|---|---|
| `survivor` | `<winnerName.toUpperCase()> WINS` |
| `pyrrhic` | `<winnerName.toUpperCase()> WINS` |
| `apocalypse` | `WINNER: NOBODY` |
| `dominance` | `<winnerName.toUpperCase()> WINS` |

### 10.3 SubLine (algorithmic placeholder, P4a wires flavor)

- `survivor`: `"<name> rules over <currPop>M. The rest are ash."`
- `pyrrhic`: `"<name> had <initialPop>M when the bombs flew. They have 0M now. So does everyone else. Briefly, they had more."`
- `apocalypse`: `"Total casualties: 100% of starting population. The board is dark."`
- `dominance`: `"<name> rules over <currPop>M. The next-largest has <secondPop>M."`

### 10.4 DeathTollTable

- Rows: one per cast member
- Columns: Name, Start pop, End pop, % lost
- `% lost = (start - end) / start * 100`, formatted to 1 dp
- Sort by `% lost` ascending — winners' rows first, losers' last

### 10.5 NewGameButtons

- `"New Game"` → `dispatch({ type: 'BACK_TO_SETUP' })` → reducer clears all transient UI state, transitions to `'setup'`
- `"Same Cast, Again"` → `dispatch({ type: 'START_GAME', opts: { ...state.lastNewGameOpts!, seed: generateSeed() } })` → reuses cast + difficulty + playerProfiles with fresh seed

### 10.6 No replay scrubber

Spec §9.7's scrubber is P4a. Thin P3 reaches Winners → user reads death-toll → starts over.

---

## 11. Component library

Shared components in `src/ui/components/`:

| Component | Used by | Thin P3 props |
|---|---|---|
| `LeaderCard` | Planning, RoundSummary | leader, badges, no mood-line |
| `OrderForm` | Planning | onAdd callback, validates via engine `validateOrder` |
| `ApBudget` | Planning | leader.ap, leader.apBanked, computed total |
| `EventCard` | Action | event + leaders lookup; emits icon + body via `formatEventCard` |
| `PhaseTracker` | Action | renders 6 phase header labels (Defences / Builds / Propaganda / Wooing / Launches / Final Retaliations) — pure layout, no progress-bar state |

---

## 12. Testing strategy

**Engine tests stay as-is** (161 existing). Task 1's `orderHistory` refactor reshapes ~7 assertions across `resolution.test.ts`, `state.test.ts`, `integration.test.ts`, and `ai/lookahead.test.ts` — minor.

**UI tests (Vitest + jsdom + RTL minimum):**

| File | Component | Coverage |
|---|---|---|
| `tests/ui/OrderForm.test.tsx` | `<OrderForm>` | Validation paths: launch without delivery+warhead blocked; AP overrun blocked; engine `validateOrder.reason` surfaced inline |
| `tests/ui/ApBudget.test.tsx` | `<ApBudget>` | Budget computation: `available = floor(factories * 0.5) + banked + bonus`; over-budget detection; banked-cap of 2 honoured |

Setup form, Action card rendering, RoundSummary headline algorithm, Winners death-toll table — **all untested in thin P3**. P4a may add more.

Test runner config (`vite.config.ts`):

```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/ui/setup.ts'],
    globals: true,
  },
});
```

`tests/ui/setup.ts` imports `@testing-library/jest-dom` for the extra matchers.

---

## 13. Assumptions surfaced

### Real concerns (decision required before coding)

1. **Cast picker simplification.** Spec §2 says "smaller-cast games drop the lowest-pop leaders first by default (configurable in Setup)" — implying a cast-size selector with auto-default. Thin P3 ships per-character toggles only (user manually picks 2-4 AI). UX outcome identical, model simpler. *Decision: simplified UX in P3; revisit in P4a if the auto-default UX is preferred.*
2. **Headline + sub-line algorithms are rule-based, not flavor-driven.** P4a's flavor banks will replace these with per-leader tabloid headlines. Thin P3 ships functional but bland text. *Decision: accept blandness for thin P3.*

### Verified-safe (checked at design time)

- `LEADER_PROFILES` exports the 6 AI character profiles + 5 player slots; iterating only the AI subset (filter `!isHuman(id)`) gives the Setup picker its rows.
- `validateOrder` is the canonical order validator — `OrderForm` calls it directly, no UI-side duplication.
- `ResolutionEvent` types are exhaustive (`types.ts:123-162`) — TS exhaustiveness on `formatEventCard` switch catches any future event kind.
- `WinOutcome` is exhaustive — `WinHeadline` + `SubLine` switches catch any future variant.
- `dispatch()` (engine) and `planAi()` throw on humans; `AI_RESOLVE` filters via `isHuman` before calling planAi (verified by P2.5 integration test pattern).
- `playerProfiles` override is the documented P2.5 path; `initialState` merges name + country at construction.

### Minor / accepted

- Country flag emoji as portrait substitute — looks intentional in CSS but not literal portrait art. `🦆 Freedonia` for the player slot is mildly weird but consistent with the engine glyph convention.
- No mood line on LeaderCards — visual gap that P4a's flavor bank fills.
- `pickHeadline` thresholds (`-10`, `-3`) are tuned by eye; P4a may revise.
- 5-leader cast Planning table layout is `2×2 grid + 1 trailing card` — accepted asymmetry.
- "Same Cast, Again" gets a fresh seed (deterministic-rerun seekers can type the seed manually in Setup).

---

## 14. Risks & open questions

| Risk | Mitigation |
|---|---|
| Mockup CSS port misses subtle interactions (e.g., tap-and-hold timing, scroll behaviours). | Smoke-test in browser before committing each screen task; per-screen task in writing-plans includes a manual-verification step. |
| React 18 → 19 migration eventually (19 is GA but ecosystem stability lags). | Pinned at 18 for v1; revisit at P4a. |
| `useReducer` for screen state machine may grow unwieldy as P4a adds Hotseat Handoff + persistence + replay. | Acceptable at thin P3 scope. P4a refactor if it gets noisy (might extract a state-machine library or split reducers). |
| Engine refactor (Task 1) inadvertently breaks Phase 2.5's lookahead test fixture. | TS exhaustiveness + the existing P2.5 tests catch the call-site changes; reshape ~7 assertions deterministically. |
| Action screen's flat all-events-at-once feed feels less narrative than mockup. | Accepted — P4a's per-event reveal + animation is the remedy. Thin P3 user can scroll at their own pace. |

---

## 15. Success criteria

1. `npm run typecheck` clean.
2. `npm run test:run` green — 161 existing engine tests (reshaped for `orderHistory`) + ~4 new UI tests.
3. `npm run dev` launches Vite; browser loads the Setup screen.
4. End-to-end flow: Setup → Planning → AI Conferring → Action → Round Summary → (Round N+1 → Plan, or Final Verdict → Winners) → New Game / Same Cast.
5. Engine refactor (Task 1) is non-breaking — call sites continue to work; lookahead reads from `orderHistory` instead of `lastOrders`.
6. Player can fully configure their identity (name + country) in Setup, pick 2-4 AI characters, set difficulty + seed, play a complete game to a Winners screen.

---

## 16. References

- **Original design spec:** `docs/superpowers/specs/2026-05-08-nuke-design.md` — §9 (Screens & UX flow), §10 (Architecture), §16 (v1 scope)
- **Phase 2.5 design spec:** `docs/superpowers/specs/2026-05-10-phase-2-5-player-slot-design.md` — `playerProfiles`, `isHuman`, `lastOrders` (which this phase refactors to `orderHistory`)
- **Mockups:** `docs/superpowers/mockups/planning-screen.html`, `action-screen.html`, `round-summary.html` — visual specs ported via CSS Modules
- **Phase 2.5 implementation plan:** `docs/superpowers/plans/2026-05-10-phase-2-5-player-slot.md` — established the per-step confidence + TDD pattern this phase's plan will continue

---

## 17. Approval

This spec was developed section-by-section in the 2026-05-11 brainstorming session, with per-section approval at each step (Sections 1-8 + the engine-refactor scope decision). Pending user review of the written file before transition to `superpowers:writing-plans`. If changes are needed, this doc is updated in place and re-reviewed.
