# Phase 2.5 — Player Slot Design

**Date:** 2026-05-10
**Status:** drafted from brainstorming session 2026-05-10; pending user review
**Phase:** 2.5 (engine-only, between Phase 2 AI Personalities and Phase 3 UI)

A small engine extension that gives the human player their own slot in the cast, separate from the six AI character personalities. The player plays a configurable country (default: Rufus T. Firefly leading Freedonia, after the Marx Brothers' *Duck Soup*) rather than taking over an AI character.

This spec is a snapshot of the brainstorming session 2026-05-10 in which the architecture was decided section-by-section. Implementation plan is the next deliverable; see §11.

---

## 1. Problem statement

Through Phase 2, every leader in the cast is one of six AI personalities (Chump, Khameneverhere, Starmless, Carnage, Mileigh-hem, Netanyahoo). The intended human-play experience requires the player to "pick" one of those leaders — inheriting that leader's name, country, starting stats, and bonus rule.

That conflates two roles: a fixed parody character with a strong personality identity, and the human's free-form play position. The user wants a separate slot — their own country, their own name, distinct from the six AI characters — so the player isn't forced to be Chump or Carnage.

The change must also be forward-compatible: a future hotseat mode with multiple human players (≤5) should require no further engine refactor.

---

## 2. Goals

1. The human player has a dedicated `LeaderId` (`'player1'`) with configurable name and country.
2. Default identity is **Rufus T. Firefly** leading **🦆 Freedonia**, editable in Setup.
3. The architecture pre-supports up to five concurrent human players (`'player1'..'player5'`) without further engine changes.
4. AI personalities react to player actions like any other leader (no player-specific exception rules — the player gets grudges, propaganda, threat scoring, Final Retaliation targeting on the same generic basis).
5. Phase 3 (UI) can build a Setup screen that treats the player slot as a first-class concept from day one.

## 2a. Non-goals

- Production SVG art for the Freedonia flag (Phase 3 art workstream).
- Setup-screen UX for editing player name/country (Phase 3 UI workstream — Phase 2.5 ships only the engine plumbing).
- Hotseat handoff curtain UX between humans (Phase 3 / 4).
- Multi-human balance tuning (Phase 4).
- AI-duel headless tests with humans in the cast (P4; AI-duel test stays AI-only).
- Tests exercising multiple `playerN` slots simultaneously in one cast — P2.5 only exercises `player1`. The `player2..player5` slots are inert architectural reservations until Phase 3+ wires multi-human flows.
- Custom-leader creation, design-your-own-country modes (out of v1 scope entirely).

---

## 3. Architectural overview

Three additions to the engine, all non-breaking to existing P1/P2 behaviour:

1. **`LeaderId` extended** with five literal player slots (`'player1' | 'player2' | 'player3' | 'player4' | 'player5'`).
2. **`GameConfig` gains a `playerProfiles` override**, merged in `initialState()` to let the Setup screen feed user-typed name/country into the engine.
3. **`GameState` gains a `lastOrders` field**, populated by `RESOLVE_ROUND` before it clears `pendingOrders`. Hard-mode lookahead reads this for human opponents instead of treating them as passive — the AI projects "the human will do what they did last round" rather than "the human does nothing".

A tiny derived helper `isHuman(id: LeaderId): boolean` (one line: `id.startsWith('player')`) is added to `src/engine/state.ts` so consumers don't string-match inline. No `controlledBy` field on `Leader` — the human/AI distinction is fully derivable from the id and we don't store derived state.

AI orchestration sites (`dispatch()`, `planAi()`) refuse or throw on human leaders explicitly, with loud errors so a routing bug fails fast. `bestTargetByLookahead()` substitutes the human's last-round orders into the simulated round.

### Approach considered and rejected

**Dynamic `LeaderId` (branded string or plain `string`)** — would give true unbounded humans and forward-compat for custom-leader modes, but loses TS exhaustiveness, requires runtime validation at API boundaries, and refactors all 21 source files / 23 test files that currently use the literal-union pattern. Not justified by current requirements; the cap of 5 matches the game's 3–5 cast size.

**No new slots; generic `controlledBy` on existing leaders** (player picks one of the 6 AI characters and plays them) — rejected on the user's primary requirement: "I want my own country rather than take one of the AI characters."

---

## 4. Data model changes

### 4.1 `LeaderId`

```ts
export type LeaderId =
  | 'chump' | 'khameneverhere' | 'starmless' | 'carnage' | 'mileigh-hem' | 'netanyahoo'
  | 'player1' | 'player2' | 'player3' | 'player4' | 'player5';
```

### 4.2 `GameConfig.playerProfiles`

```ts
export interface GameConfig {
  startPopOverride?: Partial<Record<LeaderId, number>>;
  /** Per-game name/country overrides for player slots. Keys should be 'player1'..'player5'; entries for AI leaders are ignored. Setup screen populates this from user input. */
  playerProfiles?: Partial<Record<LeaderId, { name?: string; country?: string }>>;
  dominanceThreshold: number;
  fastPlay: boolean;
}
```

Mirrors the existing `startPopOverride` pattern. AI character profiles in `LEADER_PROFILES` stay frozen — overrides only apply to player slots semantically, though the engine doesn't enforce that (entries for AI ids are merged but won't be encouraged by the Setup UI).

### 4.3 `GameState.lastOrders`

```ts
export interface GameState {
  // ...existing fields...
  /** The most recent round's submitted orders for each leader. Populated by RESOLVE_ROUND before pendingOrders is cleared. Used by Hard-mode lookahead to project human opponents' likely behaviour from history. Tracked for all leaders (humans + AI) for symmetry; AI lookahead reads it only for human opponents. */
  lastOrders: Partial<Record<LeaderId, Order[]>>;
}
```

The field is tracked for **all leaders, not just humans**, for symmetry — a small storage cost (≤8 orders × N leaders) for a clean uniform data shape. Lookahead consumes it only for the human opponents' branch. Empty `{}` at game start; one round behind everywhere else.

---

## 5. State lifecycle wiring (`initialState` + round resolution)

### 5.1 `LEADER_PROFILES` extension

Five new entries added to `LEADER_PROFILES` in `src/engine/balance.ts`. All five share the same starting stats (`startPop: 25`, `startFactories: 6`, `startAp: 3` — matches Carnage and Starmless mid-pack); none have a `bonusRule`. Defaults are tunable in P4's balance pass without further engine refactor.

```ts
player1: { name: 'Rufus T. Firefly', country: '🦆 Freedonia', startPop: 25, startFactories: 6, startAp: 3 },
player2: { name: 'Player 2', country: '🦆 Freedonia 2', startPop: 25, startFactories: 6, startAp: 3 },
player3: { name: 'Player 3', country: '🦆 Freedonia 3', startPop: 25, startFactories: 6, startAp: 3 },
player4: { name: 'Player 4', country: '🦆 Freedonia 4', startPop: 25, startFactories: 6, startAp: 3 },
player5: { name: 'Player 5', country: '🦆 Freedonia 5', startPop: 25, startFactories: 6, startAp: 3 },
```

The `Player N` / `🦆 Freedonia N` placeholders for `player2..player5` exist so a future test or default-cast scenario doesn't crash; the Setup screen overwrites them at game-start.

### 5.2 `initialState()` override merge + lastOrders seed + `isHuman()` helper

```ts
// New small exported helper:
export function isHuman(id: LeaderId): boolean {
  return id.startsWith('player');
}

// In initialState():
for (const id of opts.cast) {
  const profile = LEADER_PROFILES[id];
  const startPop = opts.config?.startPopOverride?.[id] ?? profile.startPop;
  const playerOverride = opts.config?.playerProfiles?.[id];
  leaders[id] = {
    id,
    name: playerOverride?.name ?? profile.name,
    country: playerOverride?.country ?? profile.country,
    population: startPop,
    // ...other fields unchanged...
  };
}
return {
  // ...other fields...
  pendingOrders: {},
  lastOrders: {},   // ← seeded empty; populated by RESOLVE_ROUND
  // ...
};
```

Merge semantics: **override → profile default**. The `??` only falls back on `null` / `undefined`, so a `name: ''` empty-string override would still take precedence — input validation is the Setup screen's responsibility, not the engine's.

`lastOrders` starts as an empty object. It will populate on the first `RESOLVE_ROUND`, so first-round Hard-mode lookahead has no human history yet — the simulated human submits `[]` for that one round, then real history takes over.

The `isHuman` helper is consumed by §6.2 (`planAi` guard) and §6.3 (lookahead opponent loop). It's a one-line predicate, not a stored field.

### 5.3 `RESOLVE_ROUND` populates `lastOrders` (resolution.ts)

Inside `resolveRound`, just before the existing `s.pendingOrders = {};` line that clears the round's orders, capture them into `lastOrders`:

```ts
// Persist this round's orders for next round's planAi (Hard-mode lookahead
// reads lastOrders[humanId] for human opponents; AI opponents are still
// re-planned via dispatch). Read from the original `state` parameter to
// match the existing pattern in this function (s.pendingOrders may have
// been cleared mid-function in future refactors).
s.lastOrders = {};
for (const id of s.cast) {
  const sealed = state.pendingOrders[id];
  if (sealed) s.lastOrders[id] = sealed.orders;
}
// Clear pending, advance round.
s.pendingOrders = {};
```

A leader who didn't submit (eliminated, passed) gets no entry. Lookahead reads `state.lastOrders[id] ?? []` and naturally falls back to empty.

**Why it's safe:** `simulateOneRound` already gracefully handles invalid orders — if a human's last-round launch order can't validate against the projected next-round state (e.g., they have no missile any more), `reduce()` returns the same state and the existing fallback at `lookahead.ts:25-32` substitutes empty orders. We get re-validation for free.

---

## 6. AI orchestration guards

Three call sites in `src/engine/ai/` need special handling for human leaders. The pattern: **humans submit orders via `SUBMIT_ORDERS`; they never reach the AI dispatcher or planner.** `dispatch()` and `planAi()` throw loudly on humans (so a routing bug fails fast). `bestTargetByLookahead()` substitutes the human's last-round orders into the simulated round so Hard-mode AI can project realistic human behaviour rather than treating them as passive.

### 6.1 `dispatch()` (`src/engine/ai/dispatch.ts`)

The existing exhaustive switch over `LeaderId` gets fall-through cases for the five player slots:

```ts
case 'player1':
case 'player2':
case 'player3':
case 'player4':
case 'player5':
  throw new Error(
    `dispatch() called for human player slot '${leaderId}'. ` +
    `Human leaders submit orders via SUBMIT_ORDERS, not via the AI dispatcher.`,
  );
```

This is the only switch in the codebase that exhaustively discriminates on `LeaderId` — verified by grep at design time. TS exhaustiveness gives a free guarantee no other site needs touching.

### 6.2 `planAi()` (`src/engine/ai/index.ts`)

Guard at the top of `planAi()`, before any AI work:

```ts
const me = state.leaders[leaderId];
if (!me || !me.alive) return [];
if (isHuman(leaderId)) {
  throw new Error(
    `planAi() called for human leader '${leaderId}'. ` +
    `Human leaders submit orders via SUBMIT_ORDERS, not via the AI planner.`,
  );
}
```

Callers (Phase 3 UI orchestrator, AI-duel test) are expected to filter out humans before calling. The throw catches mistakes; it isn't a soft no-op return.

### 6.3 `bestTargetByLookahead()` (`src/engine/ai/lookahead.ts`)

Hard-mode lookahead simulates one round forward by asking each opponent's AI for their move. For humans, substitute their **last-round orders** from `state.lastOrders[id]` instead — predicting they will repeat what they just did:

```ts
for (const id of state.cast) {
  if (id === viewer) continue;
  const opp = state.leaders[id];
  if (!opp || !opp.alive) continue;
  if (isHuman(id)) {
    // Project the human as repeating last round's orders. Falls back to []
    // for the first round (no history yet) or if they passed last round.
    // simulateOneRound re-validates and gracefully drops invalid orders
    // (e.g., a launch order from last round when their stockpile is now empty).
    ordersByLeader[id] = state.lastOrders[id] ?? [];
    continue;
  }
  ordersByLeader[id] = opponentPlanner(state, id);
}
```

**Modelling rationale (Approach A):** Of the three approaches surfaced in design (A: repeat last-round orders / B: pick from last 3 rounds / C: map to closest AI personality), A is the simplest plumbing fit for Phase 2.5. Strictly better than passive for any human past round 1. B and C remain available as future enhancements without locking the engine in.

**Limitations:**
- First-round humans look passive (no history yet — pure Phase-3 UX concern, has no impact on a real human game's first round since the player already gets a "free" first round before the AI starts attacking them anyway).
- A one-off odd round biases the next round's prediction. Acceptable for v1; B (sliding window) or C (personality-fit) can replace later if the imbalance is noticeable.
- Does NOT account for the human pivoting strategy mid-game. The lookahead reflects "what they did most recently," which is the cheapest useful prediction.

### 6.4 No changes needed elsewhere

AI personality scoring functions (`chump.ts`, `carnage.ts`, `khameneverhere.ts`, `netanyahoo.ts`, `starmless.ts`, `mileighhem.ts`) iterate `state.cast.filter(t => t !== leaderId && state.leaders[t]?.alive)` and treat all leaders as candidate targets. Player gets grudges, propaganda, threat scoring, and Final Retaliation targeting like any other leader — no exception rules. Verified by reading each file at design time.

---

## 7. Testing strategy

Vitest, mirroring the existing test layout. Six test files touched, all by extension (no new files needed). ~9 new test cases, 1 existing test updated. Total suite goes from 146 → ~155 tests.

### 7.1 Existing test that must be updated

`tests/engine/balance.test.ts:14-19` asserts that `Object.keys(LEADER_PROFILES)` equals exactly the six AI character ids. Adding `player1..player5` makes this test fail. Update the expected list to include the player slots, plus add a small sanity-check that `player1` defaults to Firefly / Freedonia.

### 7.2 New tests for the data model and override flow

Extend `tests/engine/state.test.ts`:

- `initialState` with `cast: ['player1', 'chump']` produces `leaders.player1` with default Firefly / 🦆 Freedonia / 25-pop / 6-factories / 3-AP / no `bonusRule`.
- `isHuman('player1')` returns `true`; `isHuman('chump')` returns `false` (helper sanity check).
- `initialState` with `playerProfiles: { player1: { name: 'Tony', country: '🇮🇹 Italy' } }` overrides those fields.
- Partial override (e.g., only `name`) leaves the unset field at its profile default.
- `initialState` produces `lastOrders` as an empty object `{}`.

### 7.3 New tests for `lastOrders` persistence

Extend `tests/engine/resolution.test.ts`:

- After `RESOLVE_ROUND`, `state.lastOrders[id]` equals the orders submitted that round for each leader who submitted. Leaders who didn't submit have no entry.
- After two consecutive rounds, `state.lastOrders` reflects the **second** round's orders, not the first (proves it's overwritten, not accumulated).

### 7.4 New tests for AI orchestration guards

- `tests/engine/ai/dispatcher.test.ts`: `planAi(state, 'player1')` throws with a "human" error message.
- `tests/engine/ai/lookahead.test.ts`: a Hard-mode call with a mixed cast (`chump` viewer + `carnage` AI rival + `player1` human) returns a target without throwing. Two sub-cases:
  - **No history**: `state.lastOrders[player1]` empty → simulation treats human as passive (current passive-default behaviour preserved when no data is available).
  - **With history**: pre-set `state.lastOrders[player1] = [{kind: 'launch', target: 'chump', delivery: 'missile', warhead: 'small', targetType: 'people'}]` plus a stockpile that supports the launch → the simulated round produces a `MissileLaunched` event from `player1`.

### 7.5 New end-to-end integration test

Extend `tests/engine/integration.test.ts`. Mixed cast (`['player1', 'chump', 'carnage']`) runs one round end-to-end:

- `player1` orders submitted via `SUBMIT_ORDERS` action directly (simulating the Setup-screen → reducer flow that Phase 3 will wire).
- `chump` and `carnage` orders generated via `planAi`.
- `RESOLVE_ROUND` dispatches without throwing; round counter advances; `pendingOrders` clears; `lastOrders[player1]` reflects the player's submitted orders.

### 7.6 Tests deliberately not added in this phase

- AI-duel-style balance tests with a human in the cast — Phase 4. AI-duel headless test stays AI-only.
- UI-level tests for the Setup screen's player-slot affordance — Phase 3.
- Property tests for determinism with a human in the cast — the human path introduces no new randomness, so the existing determinism property tests cover engine behaviour adequately.
- Tests for Approach B (sliding-window history) or Approach C (personality-fit modelling) — those approaches are deliberately out of scope.

---

## 8. Sequencing rationale

Phase 3 (UI) needs to know which leaders are human-controlled to:

1. Drive the Hotseat handoff curtain (only between humans).
2. Route order submission through the Planning screen (humans) vs `planAi` (AI).
3. Display the player-slot affordance in Setup (name + country fields).

Doing the engine work as a small Phase 2.5 first means:

1. Phase 3 can treat the player slot as a first-class concept from day one rather than retrofitting after layout decisions are baked.
2. The engine surface stabilises before UI work starts (Phase 3 builds against fixed `playerProfiles`, `lastOrders`, and `isHuman` shapes).
3. P2.5 is small enough (~1.5-2 days of engine work, including the `lastOrders` persistence and human-modelling lookahead changes) to ship as a discrete commit cycle without delaying Phase 3.

---

## 9. Risks & open questions

| Risk | Mitigation |
|---|---|
| Starting stats `25 / 6 / 3` may not be balanced against the AI-character cast in mixed games. | Explicit P4 balance pass; tune the constants in `LEADER_PROFILES` without engine refactor. |
| Forward-compat ceiling at 5 humans. | Accepted: matches the game's 3-5 cast size; if a future networked-multiplayer mode wants more, that's a Phase 5+ refactor. |
| Hard-mode lookahead repeats the human's last-round orders verbatim, which can mis-project when the human pivots strategy mid-game. | Modelling assumption (Approach A). Approaches B (sliding-window) and C (personality-fit) remain available as P4 enhancements without engine refactor. |
| First-round Hard-mode lookahead has no `lastOrders` history for the human → falls back to passive `[]`. | Acceptable: the player gets a "free" first round before AI starts launching, so the projection-quality loss has no real-game impact. |

---

## 10. Success criteria

1. `npm run typecheck` clean.
2. `npm run test:run` green — all 146 existing tests + ~9 new tests.
3. A Phase 3 author can write
   ```ts
   initialState({
     cast: ['player1', 'chump', 'carnage'],
     difficulty: 'normal',
     seed: '...',
     config: { playerProfiles: { player1: { name: 'Tony', country: '🇮🇹 Italy' } } },
   })
   ```
   and get a valid game state with the human's chosen identity.
4. Calling `planAi(state, 'player1')` throws a clear "human routed to AI" error.
5. Hard-mode AI plays normally with a human in the cast (no crashes, no skipped rounds).
6. After `RESOLVE_ROUND` runs, `state.lastOrders[id]` reflects each leader's submitted orders for that round — humans included. On the next round's Hard-mode lookahead, the AI projects the human as repeating those orders.

---

## 11. References

- **Brainstorming session:** 2026-05-10 (this document is the snapshot).
- **Phase 1 plan:** `docs/superpowers/plans/2026-05-09-phase-1-engine-core.md`
- **Phase 2 plan:** `docs/superpowers/plans/2026-05-09-phase-2-ai-personalities.md`
- **Original design spec:** `docs/superpowers/specs/2026-05-08-nuke-design.md` — see §2 (Cast), §10 (Architecture).
- **Existing engine source code:** verified at design time — only `src/engine/ai/dispatch.ts:16` exhaustively switches on `LeaderId`; AI personality scoring loops generic across cast.

---

## 12. Approval

This spec was developed section-by-section in the 2026-05-10 brainstorming session, with per-section approval at each step. Pending user review of the written file before transition to `superpowers:writing-plans`. If changes are needed, this doc is updated in place and re-reviewed.
