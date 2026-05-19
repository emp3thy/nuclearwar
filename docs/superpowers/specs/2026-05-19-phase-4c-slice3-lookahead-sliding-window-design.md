# Phase 4c slice 3 — Hard-mode lookahead: sliding-window human projection — Design

> Status: design approved, ready for implementation plan.

## 1. Overview

Hard-mode AI uses one round of lookahead to choose its launch target: `bestTargetByLookahead` simulates a round for each candidate target and picks the highest-scoring projected state. Inside that simulation every non-viewer leader needs projected orders. AI opponents are re-planned via `dispatch`; a **human** opponent is projected from order history.

Today that projection is **Approach A** — replay the human's *last* round verbatim:

```ts
const lastRound = state.orderHistory[state.orderHistory.length - 1];
ordersByLeader[id] = lastRound?.[id] ?? [];
```

**Problem:** if the human passed last round (submitted `[]`), Approach A projects them as passive — even if they launched in every prior round. The lookahead then under-estimates retaliation risk and can pick a reckless target.

This slice implements **Approach B (sliding-window history)** in its minimal form: project the human by their **most recent non-empty round within a window of the last 5 rounds**. A recent pass no longer reads as passivity; a non-empty round older than the window is treated as stale.

This is the smallest of the deferred "Approach B/C lookahead upgrades" (slice 2 design §7.1). Approach C (personality-fit modelling) is **not** in scope.

## 2. Decisions

| Question | Decision |
|----------|----------|
| Which upgrade | Approach B only — sliding-window history. Approach C deferred. |
| Window-collapse rule | **Most recent non-empty round** within the window. Not modal, not most-active. |
| Window size | **5 rounds.** A named constant. The phase-2.5 design named 3; widened to 5 so a human who builds quietly for several rounds before striking still projects their last real move. |
| "Non-empty" | The history entry for the leader exists and has `length > 0`. `undefined` and `[]` are skipped. |
| Scope of change | One file — `src/engine/ai/lookahead.ts`. AI-opponent projection (`dispatch`) untouched. |
| Determinism | Unaffected — the projection is a pure history read, no RNG. |

## 3. The change

### 3.1 New helper — `recentHumanOrders`

Added to `src/engine/ai/lookahead.ts`, exported (so it is unit-testable in isolation):

```ts
/** How many recent rounds the human projection looks back over. */
const LOOKAHEAD_HISTORY_WINDOW = 5;

/**
 * Project a human opponent for Hard-mode lookahead: the orders from the most
 * recent round, within the last LOOKAHEAD_HISTORY_WINDOW rounds, that has a
 * non-empty order list for `leaderId`.
 *
 * A recent pass (`[]`) no longer reads as passivity — the projection walks
 * back to the human's last real move. A non-empty round older than the window
 * is treated as stale and ignored (the human is projected as passive `[]`).
 */
export function recentHumanOrders(
  orderHistory: Partial<Record<LeaderId, Order[]>>[],
  leaderId: LeaderId,
): Order[] {
  const stop = Math.max(0, orderHistory.length - LOOKAHEAD_HISTORY_WINDOW);
  for (let r = orderHistory.length - 1; r >= stop; r--) {
    const orders = orderHistory[r]?.[leaderId];
    if (orders && orders.length > 0) return orders;
  }
  return [];
}
```

### 3.2 Call-site change

In `bestTargetByLookahead`, the human branch changes from the inline last-round
read to a call to the helper:

```ts
if (isHuman(id)) {
  ordersByLeader[id] = recentHumanOrders(state.orderHistory, id);
  continue;
}
```

No other code changes. `bestTargetByLookahead` is the only site that projects a
human from history (verified: `orderHistory` is read for projection only here;
`ai/index.ts` invokes `bestTargetByLookahead` once, in hard mode only).

## 4. Behaviour

| History (most recent last) | Projected orders |
|---|---|
| Human acted last round | That round — identical to Approach A. |
| Human passed last round, acted 1–2 rounds before | The most recent acted round. |
| Human passed all of the last 5 rounds | `[]` — passive (same as Approach A). |
| No history (round 1) | `[]` — passive (same as Approach A). |
| Human's only non-empty round is older than 5 rounds back | `[]` — treated as stale. |

The change is a strict superset of Approach A's correct cases: whenever the
human acted last round, behaviour is unchanged. The only new behaviour is
recovering a recent move when the last round was a pass.

### 4.1 Staleness safety net (unchanged)

`simulateOneRound` already re-validates projected orders and gracefully drops
any the leader can no longer afford — e.g. a launch order from 2 rounds ago when
the human's stockpile is now empty collapses to passive within the simulation.
Projecting a slightly older round therefore introduces no new staleness hazard.

## 5. Testing

### 5.1 Unit tests — `recentHumanOrders` (`tests/engine/ai/lookahead.test.ts`)

- Empty history → `[]`.
- Last round non-empty → that round's orders.
- Last round `[]`, prior round non-empty → the prior round's orders.
- All rounds within the window empty/`[]` → `[]`.
- A non-empty round positioned one round *outside* the window → `[]` (not picked).
- History entry `undefined` for the leader → skipped (treated as empty).

### 5.2 Behavioural test — `bestTargetByLookahead`

One test: a human who passed last round but launched at the Hard-mode viewer two
rounds ago is projected as launching — verified by the viewer's target choice
reflecting the projected retaliation (contrast: under Approach A the same setup
projects the human as passive).

### 5.3 Regression

Full suite + `tsc --noEmit` stay green. Determinism tests are unaffected (no RNG
change). Existing `lookahead.test.ts` tests hold — Approach A behaviour is
preserved whenever the human acted last round.

## 6. Out of scope

- Approach C — personality-fit modelling (classify the human as the closest AI
  personality and project via that planner). Deferred.
- Any change to AI-opponent projection (`dispatch`), `scoreState`, or
  `simulateOneRound`.
- Window size as a runtime/config setting — it is a compile-time constant.
- Multi-round (depth > 1) lookahead.

## 7. Risks

| Risk | Mitigation |
|------|------------|
| An older projection (up to 5 rounds back) is itself a pivot the human has since abandoned. | Accepted: still strictly better than projecting a pass as passivity; the window caps staleness at 5 rounds; `simulateOneRound` drops now-unaffordable orders. |
| `recentHumanOrders` returns a reference into `state.orderHistory`. | `bestTargetByLookahead` / `simulateOneRound` treat order lists as read-only (existing contract — Approach A already passed the same reference). No mutation; no copy needed. |
