# nuke — comic-tabloid re-theme, slice 3: Action screen (world map)

**Date:** 2026-07-19
**Status:** spec for phase 3 of the comic re-theme
**Depends on:** slice 1 (`2026-07-19-comic-retheme-slice1-design.md`) — tokens.css, fonts, `<Portrait>`, and the shared comic primitives in `src/ui/components/comic/` must exist before this slice starts.

## 0. Context

Slice 3 of the four-slice comic-tabloid re-theme (see slice-1 spec §0). This slice rebuilds the Action screen from the static grouped-event list into the handoff's sequential resolution playback on a stylised world map (`design_handoff_nuke_game/screens-3.jsx` `ActionScreen`, readme §5 "Action").

The handoff prototype plays back `SAMPLE_EVENTS` mock data; we drive the identical presentation from the real `ResolutionEvent[]` in `state.events` (`src/ui/store.ts`, populated by `AI_RESOLVE` → `resolveRound`). Nothing in the engine or store changes.

**Adopted handoff behavior (explicit change to existing UX):** the Action screen stops showing all events at once as phase-sectioned cards and instead plays them back one step at a time with auto-advance, pause, fast, skip, and prev/next. This is the point of the slice, per the handoff.

**Not adopted:** the handoff's `Math.random() < 0.5` Disparage cameo. Cameo appearance is already an engine decision (`DisparageCameo` events from `src/engine/cameo.ts`); the UI renders cameos when and only when the engine emitted one.

## 1. Target files

| File | Action |
|---|---|
| `src/ui/screens/Action.tsx` | Rewrite: playback state machine + screen layout |
| `src/ui/screens/Action.module.css` | Rewrite: ink layout, map frame, overlay positioning, breakpoints |
| `src/ui/components/WorldMap.tsx` + `WorldMap.module.css` | New: pure presentational SVG map (continents, country highlights, arcs/trails) |
| `src/ui/util/eventText.ts` | New: `formatEventText(event, game, count)` — the existing `formatEventCard` switch moved verbatim (minus `className`), returning `{ icon, body, quote? } | null` |
| `src/ui/components/DisparageCard.tsx` + `.module.css` | Re-theme: becomes the map's bottom-right cameo overlay card |
| `src/ui/components/comic/RoundBadge.tsx` | New primitive: port `RoundBadge` from `design_handoff_nuke_game/ui.jsx` (3px paper border, ink bg, small letter-spaced label over Anton number). It was not in the slice-1 primitive list |
| `src/ui/components/EventCard.tsx` + `.module.css` | Delete (its only consumer is Action; the formatter logic survives in `eventText.ts`) |
| `src/ui/components/PhaseTracker.tsx` + `.module.css` | Delete (replaced by the slice-1 `PhaseTrack` comic primitive) |
| `src/ui/util/eventGrouping.ts` | Unchanged — still the grouping source of truth |
| `src/ui/store.ts`, `src/engine/**` | Unchanged |

## 2. Playback model (state wiring)

### 2.1 Building the step list

Pure function inside `Action.tsx` (exported for tests): `buildPlaybackSteps(events: ResolutionEvent[]): PlaybackStep[]`.

```ts
interface PlaybackStep {
  phase: Phase;                 // 'DEFENCES' | 'BUILDS' | 'PROPAGANDA' | 'WOOING' | 'LAUNCHES' | 'FINAL_RETALIATIONS'
  event: ResolutionEvent;       // the grouped representative event
  count: number;                // from groupPhaseEvents
  cameo?: Extract<ResolutionEvent, { kind: 'DisparageCameo' }>;
}
```

- Reuse the existing phase-cursor logic from today's `Action.tsx` unchanged: `phaseAdvanceFor` assigns each event to a phase bucket; `isRenderable` filters out `OrdersSealed`, `OutcomeReached`, `DefenceConsumed`, `PreRoundMood`, `PostRoundReaction`, `DisparageColumn`.
- Per phase, run `groupPhaseEvents` (unchanged), then flatten buckets in `PHASE_ORDER` into one flat step list.
- **`DisparageCameo` events do not get their own step.** Remove them from the flat list and attach each one as `cameo` on the impact step it identifies: the first step (in flat order) whose grouped event is `ImpactPeople` or `ImpactInfrastructure` with `event.from === cameo.afterImpact.from && event.target === cameo.afterImpact.to`. Matching by `afterImpact` (not by "the immediately preceding event") is deliberate: `groupPhaseEvents` collapses duplicate `(target, attacker)` impacts into the first occurrence, so the raw event preceding the cameo may no longer exist as its own step — the `afterImpact` pair still resolves to the surviving collapsed step. A cameo with no matching impact step is dropped. The engine emits at most one cameo per round (`src/engine/resolution.ts`, P4c.3 cap), so no step ever carries two.
- `LeaderEliminated` remains a renderable step (it is today), in whatever phase the cursor was in.

### 2.2 Component state and timers

Local `useState` only (no store changes): `idx` (current step), `paused` (bool), `fast` (bool).

- Auto-advance effect keyed on `[idx, paused, fast]`: `setTimeout` of **2700 ms** (fast: **1100 ms**); on fire, `idx + 1` unless already at the last step. Cleanup clears the timeout. Paused: no timer.
- `← PREV` → `max(0, idx − 1)`, disabled at `idx === 0`.
- `NEXT →` → `idx + 1`; on the last step the button instead dispatches `ACTION_DONE`.
- `SKIP →` (header) → dispatches `ACTION_DONE` from anywhere.
- **Empty round guard:** if `buildPlaybackSteps` returns `[]`, render header + PhaseTrack + map (no overlays) + banner text `An eerily quiet round. Nobody did anything.` and the continue button only.

### 2.3 Data sources per visual element

| Visual | Source |
|---|---|
| Round badge number | `game.round − 1` (round has already incremented during resolution — existing behavior kept) |
| PhaseTrack current/done | phase of `steps[idx]`; done = phases of steps before `idx` excluding current |
| Event banner text | `formatEventText(step.event, game, step.count).body`, icon prefixed |
| Map highlights, arcs, portraits | actor/receiver derived per event kind (§5.3) |
| Speech bubble | `formatEventText(...).quote` (already merges attacker/sender/receiver/target quote fields) |
| Detail strip hand-font line | same `quote`, or empty when the event has none |
| DamageBadge | `ImpactPeople.deaths` (label `M`) / `ImpactInfrastructure.factoriesDestroyed` (label `FACT`) — rendered only when the value is `> 0` (§6) |
| Cameo card | `step.cameo.quote` |
| Leader names / flags / countries | `game.leaders[id]` (engine `LEADER_PROFILES` + player overrides) — never handoff sample data |
| Continue | `dispatch({ type: 'ACTION_DONE' })` (unchanged) |

## 3. Layout

Full-viewport ink screen (`background: var(--ink)`, `color: var(--paper)`, `min-height: 100vh`, padding 12, flex column) — matches handoff exactly.

Top to bottom:

1. **Header** — flex row, `border-bottom: 2px solid var(--paper)`, wraps (`flex-wrap: wrap; gap: 8px`). Left: `<RoundBadge round={game.round - 1} label="ROUND" />` + `ACTION` in Anton 22px, letter-spacing 0.04em. Right: three `.ctrl-btn` controls (Anton 11px, 0.12em tracking, transparent bg, 2px paper border, hover inverts to paper/ink, disabled opacity 0.3).
2. **PhaseTrack** (slice-1 primitive) — six segments (engine truth; the handoff's five-segment track is extended with WOOING):
   `DEFENCE · BUILDS · PROPAGANDA · WOOING · LAUNCHES · FINAL RETAL.`
   Current phase magenta with the yellow underline bar; done phases ink; pending paper.
3. **Event banner** — magenta strip (`padding 8px 12px`, 2px ink borders top/bottom, paper text, Work Sans 13px). Contents: `<Tag color="yellow">NOW {PHASE LABEL}</Tag>` followed by the banner text.
4. **The map** — `flex: 1`, `position: relative`, `min-height: 360px`, `border: 3px solid var(--paper)`, `overflow: hidden`. Background: cyan sea with dot-grid + vertical gradient, verbatim from handoff:
   `radial-gradient(rgba(0,0,0,0.3) 1px, transparent 1.4px), linear-gradient(180deg, #2a8eb4 0%, #1d7fb0 50%, #16527a 100%)`, `background-size: 6px 6px, 100% 100%`. Overlays per §5.
5. **Detail strip** — `background: var(--ink-soft)`, 2px paper border (no top), padding `10px 14px`. Row of progress dots (8px circles: past = `--paper-edge`, current = `--magenta`, future = `--ink-soft`, 1px paper border). Below: hand-font (Patrick Hand 16px) quote line. Below: `← PREV` / `NEXT →` ctrl-btns + right-aligned mono counter.

**Breakpoint ≤600px** (verbatim from handoff): actor/receiver portrait wrappers `transform: scale(0.7)`; actor repositioned `top: 60%; left: 4%`; receiver `top: 12%; right: 4%`; impact badge `right: 8%; top: 8%; scale(0.85)`; bubble `left: 4%; top: 92%; max-width: 60%`.

## 4. Copy (verbatim)

| Element | Copy |
|---|---|
| Round badge label | `ROUND` |
| Screen title | `ACTION` |
| Pause toggle | `⏸ PAUSE` / `▶ RESUME` |
| Fast toggle | `⏭ FAST 3×` / `1×` |
| Skip | `SKIP →` |
| Banner tag | `NOW DEFENCE` / `NOW BUILDS` / `NOW PROPAGANDA` / `NOW WOOING` / `NOW LAUNCHES` / `NOW FINAL RETAL.` |
| Prev / Next | `← PREV` / `NEXT →` |
| Last-step next, no outcome | `TO THE NEWS →` |
| Last-step next, `game.outcome` set | `TO THE VERDICT →` |
| Counter | `Event {idx+1} of {steps.length}` |
| Cameo tag | `🍺 FROM CLACTON` (existing 🍺 kept; tag styling from handoff) |
| Empty-round banner | `An eerily quiet round. Nobody did anything.` |
| Damage badge labels | `M` (deaths) / `FACT` (factories) |
| Bursts | `BOOM!` (ImpactPeople) / `WHAM!` (ImpactInfrastructure) / `INTERCEPTED!` (MissileIntercepted) / `EVERYTHING!` (FinalRetaliationTriggered) |
| Elimination stamp | `ELIMINATED` |

Banner/quote body text is generated by `formatEventText` from engine data — its existing strings (e.g. `"🇺🇸 Chump builds 2 factories"`) are kept as-is; product icons (⚙ 🚀 🛩 ☢ 🛡 📰 🤝 ☠️ 🏭 💥) are design language and stay.

## 5. The world map (`WorldMap.tsx`)

### 5.1 SVG frame

- `viewBox="0 0 100 85"`, `preserveAspectRatio="none"`, absolutely filling the map div. The handoff uses `0 0 100 60`, which clips the South-American continent path and the ARG marker (content extends to y≈80) — extending the viewBox is a deliberate fix, paths themselves are **copied verbatim** from `screens-3.jsx` (all seven continent `<path>`s including the separate UK island, `fill var(--paper)`, `stroke var(--ink)` 0.4, plus the faint `UK` Anton label).

### 5.2 Country positions

`COUNTRY_POS: Record<LeaderId, { cx: number; cy: number; label?: string }>` — AI positions and labels verbatim from the handoff; human slots 2–5 are new fixed ocean positions (invented "Freedonia archipelago"; no landmass drawn, matching how the handoff treats player1). The handoff's `tilt` field is **dropped**: no rendering rule in this spec consumes it, and the handoff's own render code never reads it either — carrying an unused field into the declared interface would leave an implementer unable to complete it (the handoff has no tilt values for player2–5).

| id | cx, cy | label |
|---|---|---|
| `chump` | 23, 36 | `USA` |
| `carnage` | 24, 24 | `CANADA` |
| `starmless` | 44, 13 | `UK` |
| `netanyahoo` | 58, 40 | `ISR` |
| `khameneverhere` | 64, 38 | `IRAN` |
| `mileigh-hem` | 33, 78 | `ARG` |
| `player1` | 22, 50 | derived |
| `player2` | 10, 62 | derived |
| `player3` | 84, 18 | derived |
| `player4` | 90, 68 | derived |
| `player5` | 44, 66 | derived |

AI ids carry the `label` shown above; human slots omit `label` — their labels are derived from live state at render, not hardcoded: `game.leaders[id].country` with the leading flag/emoji token stripped (slice-1 `stripFlag`), uppercased (default player1 → `FREEDONIA`). Only leaders in `game.cast` are rendered.

### 5.3 Highlights, actor/receiver derivation

Each cast member gets an ellipse (`rx 6 / ry 3.4`; UK special-cases `rx 3 / ry 2`) + Anton label beneath, exactly as the handoff. Fill:

- actor → `var(--green)`, opacity 0.85
- receiver → `var(--magenta)`, opacity 0.85
- otherwise, AI leader → the leader's signature color from slice-1's `PORTRAIT_META[id]` (the hex value, the codebase's equivalent of the handoff's `LEADER_MAP[id].color`), opacity 0.5. **Do not interpolate `var(--c-<leaderId>)`:** tokens.css defines only abbreviated tokens (`--c-khamen`, `--c-netan`, `--c-starm`, `--c-mileigh` — not `--c-khameneverhere` / `--c-netanyahoo` / `--c-starmless` / `--c-mileigh-hem`), so a literal id interpolation yields undefined custom properties and black ellipses for 4 of the 6 AI leaders. `PORTRAIT_META` is the single id→color source of truth; no new mapping table.
- otherwise, human slot → the per-slot accent CSS var, all of which exist in tokens.css (player1 `var(--cyan)`, player2 `var(--green)`, player3 `var(--yellow-soft)`, player4 `var(--magenta-deep)`, player5 `var(--ink-soft)`), opacity 0.5

Actor/receiver per event kind:

| Kind | Actor | Receiver(s) |
|---|---|---|
| FactoryBuilt / DeliveryBuilt / WarheadBuilt / DefenceBuilt / DefenceDeployed | `by` | — |
| PropagandaTransfer / WooApplied / MissileLaunched / MissileIntercepted | `from` | `to` |
| ImpactPeople / ImpactInfrastructure | `from` | `target` |
| LeaderEliminated | — | `id` |
| FinalRetaliationTriggered | `by` | every id in `targets` (all highlighted magenta) |

### 5.4 Per-kind map overlays

- **MissileLaunched / ImpactPeople / ImpactInfrastructure:** quadratic arc from actor to receiver (control point: midX, `min(cy) − 18`) — yellow 0.6 dashed `1.5 1` over magenta 0.3, 🚀 (or 🛩 when `delivery === 'bomber'`; impacts always 🚀) fontSize 5 at the apex; concentric magenta dashed impact ellipses on the receiver (`9×5` @0.85, `11.5×7` @0.5); green firing pulse circle r5 on the actor. Verbatim geometry from the handoff.
- **MissileIntercepted:** same arc, but 🛡 at the apex instead of the rocket, no impact rings; green pulse on the *receiver* (the defence worked).
- **PropagandaTransfer:** cyan 0.4 dashed `0.8 0.6` quadratic trail (control point midY − 6) with 📃 fontSize 3.6 at midpoint — verbatim.
- **WooApplied:** the propaganda trail re-stroked `var(--green)` with 🤝 at midpoint.
- **Builds/defence (`by`-only kinds):** no trail; the event's icon (⚙ 🚀 🛩 ☢ 🛡) rendered fontSize 4 just above the actor's country ellipse with the `pop` keyframe.
- **FinalRetaliationTriggered:** one launch arc from `by` to each target + impact rings on every target.
- **LeaderEliminated:** no arc; receiver highlight + eliminated portrait treatment (§6).

## 6. Overlay chrome (HTML, absolutely positioned over the map)

All keyed on `idx` so entrances re-run per step (`pop`/`fadein` keyframes from tokens.css — no Framer Motion).

| Slot | Component / size | Position |
|---|---|---|
| Actor portrait | `<Portrait leaderId size={110} />` + name pill (`game.leaders[id].name.toUpperCase()`, Anton 11px, ink bg, 2px paper border) | top-left 14px |
| Receiver portrait | `<Portrait leaderId size={110} />` + name pill; for `LeaderEliminated`, add a rotated magenta `<Stamp>ELIMINATED</Stamp>` across it | top-right 14px |
| Speech bubble | `<Bubble tail="bl">` with the step quote (Patrick Hand); omitted when no quote | bottom-left 14px, max-width 60% |
| Burst + damage badge | `<Burst color="yellow" rotate={-6} size={28}>` over `<DamageBadge rotate={-8}>` — only on ImpactPeople / ImpactInfrastructure (badge) and the burst kinds in §4; `INTERCEPTED!` burst uses `color="cyan"`, `EVERYTHING!` uses `color="magenta"`. **Zero-damage guard (adopted from the handoff):** on impact kinds, the badge renders only when its value is `> 0` — the engine can emit `ImpactInfrastructure` with `factoriesDestroyed: 0` (clamped by `receiver.factories` in `src/engine/launches.ts`), and the handoff suppresses the badge in that case. The impact `Burst` is suppressed together with the badge (in the handoff both live inside the same `deaths > 0 \|\| factories > 0` conditional), so a zero-damage impact shows neither burst nor badge; the arc, impact rings, and portraits still render. The guard applies per grouped step, after `groupPhaseEvents` sums duplicate pairs. Non-impact bursts (`INTERCEPTED!`, `EVERYTHING!`) are unaffected | right 14%, top 6% |
| Disparage cameo | re-themed `DisparageCard`: paper bg, 3px ink border, `box-shadow: 3px 3px 0 var(--magenta)`, max-width 280px; inside: `<Portrait leaderId="disparage" size={56} />` + yellow `🍺 FROM CLACTON` tag + hand-font quote from the event. Shown for the whole dwell of the step it is attached to | bottom-right 12px |

Portrait sizes on this screen: actor/receiver **110px**, cameo **56px**. Human portraits are the Groucho variant with slot accent + flag badge, exactly as slice 1 defines — no per-screen variation.

## 7. Behaviors preserved vs adopted

**Preserved from the existing implementation:**
- Event grouping (`groupPhaseEvents`) and phase-cursor assignment, including WOOING as a first-class phase.
- Renderability rules: `OrdersSealed`, `OutcomeReached`, `DefenceConsumed`, `PreRoundMood`, `PostRoundReaction`, `DisparageColumn` never appear on Action.
- Round display = `game.round − 1`.
- Outcome-aware exit: existing "final verdict vs round summary" distinction survives as the `TO THE VERDICT →` / `TO THE NEWS →` label split; either way `ACTION_DONE` is the only dispatch.
- Engine-driven Disparage cameos and their quotes.
- Multi-human cast (player1–player5) fully supported on the map.

**Adopted from the handoff:**
- Sequential single-event playback replacing the static list.
- Auto-advance timings (2700/1100 ms), pause, fast, skip, prev/next, progress dots, event counter.
- Ink screen, PhaseTrack, magenta banner, cyan halftone map, arcs/trails/rings, portrait pins with name pills, burst + damage badge, cameo overlay card, ≤600px repositioning.

## 8. Testing & verification

- Vitest + testing-library, `vi.useFakeTimers()` for playback. No guarded assertions (`if (x) expect(...)` forbidden).
- **`buildPlaybackSteps` (pure):** phase assignment matches the old bucketing; non-renderables excluded; builds grouped with counts; `DisparageCameo` attached to the impact step matching its `afterImpact` pair, never a step itself — including the collapse case, where the cameo followed a later duplicate `(target, attacker)` impact that `groupPhaseEvents` folded into the first occurrence; a cameo whose `afterImpact` pair matches no step is dropped.
- **`formatEventText` (pure):** existing per-kind strings unchanged; exhaustive switch still compile-checked (`noFallthroughCasesInSwitch`).
- **Action playback:** renders step 0 banner from a real resolved game state; advances after 2700 ms, 1100 ms in fast, halts when paused; `← PREV` disabled at 0; `NEXT →` steps; last step shows `TO THE NEWS →` and clicking it dispatches `ACTION_DONE`; `SKIP →` dispatches `ACTION_DONE` mid-playback; outcome games show `TO THE VERDICT →`; empty step list shows the quiet-round copy.
- **WorldMap:** cast-only markers; actor green / receiver magenta; non-actor AI ellipse fill equals the `PORTRAIT_META` hex (assert the rendered `fill` attribute is a concrete hex, not an undefined `var(--c-…)`); human label derived from live country string.
- **Zero-damage guard:** a step whose grouped `ImpactInfrastructure` has `factoriesDestroyed: 0` renders neither `DamageBadge` nor `Burst` (query by absence, unconditionally — no guarded assertions); a `deaths > 0` step renders both.
- **DisparageCard:** renders tag + engine quote + 56px Disparage portrait.
- Every commit: `tsc --noEmit` (noUnusedLocals) + `npm run test:run` green. Existing suites (`eventGrouping.test.ts`, store/round-summary tests) must stay green untouched.
- Visual check: `npm run dev` side-by-side with `design_handoff_nuke_game/index.html` on the Action screen.

## 9. Out of scope

- RoundSummary (fake newspaper) and Winners re-themes — slice 4.
- Framer Motion / any animation library — separate future phase; tokens.css keyframes only.
- The handoff DEV NAV — never ported.
- Engine or store changes of any kind (no new events, no playback state in the store).
- Planning-screen components (`BuildGrid`, `DefenceGrid`, `LaunchCell`, `TargetRow`, `ApBudget`, `SoftWarnPanel`) and `DisparageColumn` (RoundSummary's) — untouched.
- Replay scrubber / per-round history UI (P4a note in `types.ts`) — not this slice.
- Sound effects, real geography, commissioned map art.
