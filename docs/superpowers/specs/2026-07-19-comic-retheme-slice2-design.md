# nuke — comic-tabloid re-theme, slice 2: Planning + HotseatHandoff + AiConferring

> **Note (2026-07-20):** the `design_handoff_nuke_game/` prototype bundle referenced in this document was a temporary handoff artifact and has been deleted. The implemented code in `src/ui/` is the source of truth; paths below are historical.

**Date:** 2026-07-19
**Status:** draft for review
**Depends on:** `2026-07-19-comic-retheme-slice1-design.md` (tokens.css, fonts, `<Portrait>`, comic primitives incl. `Panel`, `Tag`, `Stamp`, `Btn`, `Stat`, `ApMeter`, `RelBadge`, `HoldButton`, `Ribbon`) — slice 1 must land first.

## 0. Context

Slice 2 re-themes the three mid-loop screens to the handoff design:

- `src/ui/screens/Planning.tsx` (+ `TargetRow`, `BuildGrid`, `DefenceGrid`, `LaunchCell`, `ApBudget`, `SoftWarnPanel`)
- `src/ui/screens/HotseatHandoff.tsx`
- `src/ui/screens/AiConferring.tsx`

Handoff references: `design_handoff_nuke_game/screens-2.jsx` (PlanningScreen), `screens-1.jsx` (HandoffScreen, ConferringScreen), `readme.md` §§3–4 (Planning, AI Conferring) and §2 (Hotseat Handoff), `ui.jsx` (`RoundBadge`).

**Governing rule:** the handoff supplies layout, styling, and copy; **all order/AP/validation behavior and store wiring stays exactly as implemented today** unless a handoff behavior is explicitly adopted below. All numbers shown come from the engine (`ACTION_COSTS`, `AP_BANK_CAP`, live `Leader` state), never from handoff sample data — the handoff's AP costs (shield 2, AA 2, "cap +2") disagree with the engine (`buildDefence` 4, `deployDefence` 4, `AP_BANK_CAP` 4); the engine wins.

## 1. New comic primitive: `RoundBadge`

`src/ui/components/comic/RoundBadge.tsx` — port of `ui.jsx` lines 156–172.

- Props: `{ round: number; label?: string }` (`label` defaults to `"Round"`).
- Ink plaque: inline-flex column, 3px `var(--paper)` border, `var(--ink)` background, `var(--paper)` text, padding 4px 12px, line-height 1. Label row: display font 9px, letter-spacing 0.2em, opacity 0.7. Number row: display font 22px.
- Exported alongside the other slice-1 primitives (same barrel/import convention as slice 1 chose).

## 2. Planning screen

### 2.1 Target files

| File | Change |
|---|---|
| `src/ui/screens/Planning.tsx` + `Planning.module.css` | Rewrite markup/layout to handoff structure; keep all state, hooks, projections, and dispatch wiring |
| `src/ui/components/TargetRow.tsx` + `.module.css` | Restyle as "The Table" opponent card |
| `src/ui/components/BuildGrid.tsx` + `.module.css` | Restyle as Build Yard tiles |
| `src/ui/components/DefenceGrid.tsx` + `.module.css` | Restyle as Build Yard-style tiles (own panel) |
| `src/ui/components/LaunchCell.tsx` + `.module.css` | Restyle as mini comic tile |
| `src/ui/components/ApBudget.tsx` + `.module.css` | Currently orphaned (rendered nowhere); repurpose as the AP block inside "Your Country" (wraps `ApMeter`) and mount it in Planning |
| `src/ui/components/SoftWarnPanel.tsx` + `.module.css` | Restyle as "SOFT WARNINGS" panel; always rendered (adopted, see 2.6) |

### 2.2 Layout & breakpoints (from `screens-2.jsx`)

- Screen root: `.paper` background, padding `20px 16px 96px`, content wrapper max-width **1280px** centered.
- **Header bar**: flex, space-between, wrap, gap 14px, `margin-bottom 18px`, `padding-bottom 14px`, bottom border **4px solid var(--ink)**. Left cluster: `<RoundBadge round={game.round} label="Round" />` + block with the active player's name in display font (`clamp(18px, 2.6vw, 26px)`, uppercase) followed by a magenta `·` separator, country name uppercased, and flag emoji. Full `player.name` is shown (not the handoff's `split(' ').pop()` — multi-human names must stay unambiguous).
- **Main grid** (`.planning-grid`):
  - `<800px`: single column, stacked in order left-col → centre-col → orders-col; gap 22px.
  - `800–1179px`: `grid-template-columns: minmax(0,1fr) minmax(0,1.4fr)`; orders column spans full width (`grid-column: 1 / -1`).
  - `≥1180px`: `grid-template-columns: minmax(260px,1.1fr) minmax(420px,1.7fr) minmax(280px,1.1fr)`.

### 2.3 Left column — "Your Country"

`Panel` title "Your Country", tilt −1, cyan halftone (`rgba(29,127,176,0.08)`):

- `<Portrait leaderId={activeId} size={70} />` (human variant: Groucho disguise + per-slot accent + flag badge, per slice 1).
- 2×2 `Stat` grid (gap `12px 18px`), all live from `game.leaders[activeId]`:
  - `POP` → `${population}M`
  - `FACTORIES` → `factories`
  - `ARSENAL` → `${stockpile.missiles} / ${stockpile.bombers}` with sub `miss / bomb · ${warheadsSmall+warheadsMedium+warheadsLarge}W`
  - `DEFENCE` → `${stockpile.shields} / ${stockpile.aa}` with sub `shield / AA`
- `ApBudget` (repurposed): renders `<ApMeter used={apUsed} max={player.ap} />` plus the note line "Banked AP carries over (cap {AP_BANK_CAP})." with, when `player.apBanked > 0`, " Of which banked: {apBanked}." appended. Props become `{ used: number; max: number; banked: number }`. `ApMeter` itself supplies the `{used} / {max} AP` readout and the "OVER BUDGET" / "{n} will bank" right-hand label (slice-1 primitive).
- Below the panel: restyled `SoftWarnPanel` (see 2.6).

Not adopted from the handoff left column: the "Last 3 Rounds" history strip — the engine keeps no cross-round history the UI can query; deferred (see Out of scope).

### 2.4 Centre column — "The Table" + Build Yard + Defence

Heading: display-font `The Table` (24px) with hand-font subtitle "Queue launches, woos, and propaganda per leader." (adapted from handoff — our interaction is in-card steppers, not click-to-target).

**Opponent cards** (`.table-grid`: 1 col <640px, 2 cols ≥640px, gap 14px). Each `TargetRow` becomes a `Panel` (padding 12, alternating tilt −1/+1 by index) keeping every existing control and handler:

- `<Portrait leaderId={target.id} size={56} />` (replaces the bare flag emoji).
- Header row: name in display font 17px; country string in mono 10px right-aligned; the existing **people / infra** segmented toggle restyled as a mono two-segment control (selected segment: ink bg, paper text). `onTargetTypeChange` retarget-all-queued-launches behavior unchanged.
- Live stat line (mono 10px): `POP {population}M · ⚙ {factories}` from `game.leaders[id]` — no arsenal/defence intel (the handoff's `sample` arsenal/defence/rel strings are mock data; not adopted).
- Mood quote: hand font, 2-line clamp, quotes — from `PreRoundMood` events in `state.events` (existing `moodByLeader` wiring; absent on round 1, render nothing).
- Diplomacy row: existing Woo / Propaganda **toggle** buttons restyled as `.mini-btn` (display font, 2px ink border; toggled-on state: ink bg, paper text): `🤝 WOO · {ACTION_COSTS.woo} AP`, `📃 PROP · {ACTION_COSTS.propaganda} AP`. Toggle semantics and AP gating unchanged. (Handoff's `↯ HIT` append-button is **not** adopted — it can't express delivery/yield/targetType.)
- Launch rows unchanged in behavior: `🚀 missiles · {projection.missiles} left` and `✈️ bombers · {projection.bombers} left` labels, each followed by the three-`LaunchCell` grid (small/med/big). `LaunchCell` restyled as a mini tile: 2px ink border, `var(--paper-bright)` bg, 💥 icon, display-font size label, mono `{warheadsLeft} left`, stepper `− {count} +`. States: `on` (count>0): yellow-soft bg; `off` (no warheads, count 0): 40% opacity.

**Build Yard**: `Panel` title "Build Yard", tilt −1, containing `BuildGrid` restyled: `repeat(auto-fit, minmax(110px,1fr))` grid, gap 8px; each cell a `.build-tile` (2.5px ink border, `paper-bright` bg, `2px 2px 0` ink shadow; hover `translate(-1px,-1px)` + `3px 3px 0 var(--magenta)` shadow): emoji 26px, display-font label, mono magenta `{cost} AP` from `ACTION_COSTS`, plus the existing `− {count} +` stepper (steppers are kept — handoff tiles were append-only; decrement must survive). Cells/order kinds unchanged (Factory, Missile, Bomber, Sm/Md/Lg Warhead).

**Defence**: `Panel` title "Civil Defence", tilt +1, containing `DefenceGrid` restyled in the identical tile language. All four cells (Build Shield 🛡️, Deploy Shield 🛡️↑, Build AA 📡, Deploy AA 📡↑), costs from `ACTION_COSTS.buildDefence`/`deployDefence`, `· {n} owned` hint and `canAddMore` stockpile gating unchanged. (The handoff has no deploy mechanic; the engine's is kept as-is.)

### 2.5 Right column — "Your Orders" + masthead teaser

`Panel` title "Your Orders", tilt +1, min-height 320px. **Adopted handoff behavior:** an explicit order-queue list is added (pure view over the existing `orders` array; steppers and the queue always agree because both derive from it).

- Empty state (hand font, centered): "No orders yet. Banking is fine. (Cap {AP_BANK_CAP}.)"
- One `.order-row` per element of `orders` (2px ink border, `2px 2px 0` ink shadow): icon, label, mono magenta `{ap} AP` (per-order cost from `ACTION_COSTS`), and an `×` remove button (`aria-label="remove"`) that removes **that array index** — equivalent to the stepper decrement, AP totals recompute as today. Icon/label mapping (labels use live leader names for targeted orders):

| Order kind | Icon | Label |
|---|---|---|
| `build-factory` | 🏭 | `Build factory` |
| `build-missile` | 🚀 | `Build missile` |
| `build-bomber` | ✈️ | `Build bomber` |
| `build-warhead` | 💥 | `Build {small/medium/large} warhead` |
| `build-defence` | 🛡️ / 📡 | `Build {shield/AA}` |
| `deploy-defence` | 🛡️↑ / 📡↑ | `Deploy {shield/AA}` |
| `launch` | ↯ | `Launch on {name} · {missile/bomber} · {small/med/big} · {people/infra}` |
| `propaganda` | 📃 | `Propaganda → {name}` |
| `woo` | 🤝 | `Woo {name}` |

- Subtotal block (2px dashed ink top border): display-font "SUBTOTAL" left; mono `{apUsed} / {player.ap} AP` right, magenta when `overBudget`. When over: hand-font magenta-deep line "Over budget by {apUsed − player.ap}. Drop something. Or don't, and panic."
- **Seal control — adopted handoff interaction:** the plain `sealBtn` is replaced by slice-1's `<HoldButton duration={600}>` labelled "SEAL ORDERS — HOLD ↯" (full width, 22px), caption below "Hold 0.6s. Irreversible." `onComplete` dispatches the existing `{ type: 'PLAYER_SUBMIT', leaderId: activeId, orders }`. **Preserved existing validation:** the button is `disabled` while `overBudget` (hold cannot start); handoff had no such guard. Sealing with zero orders (banking) stays legal.
- Below: masthead teaser — `Panel` tilt −1, ink bg / paper text: display-font kicker "TONIGHT'S MASTHEAD", tabloid 900 title from `pickMasthead(game.mastheadOrder, game.round, null)` (the edition that will report this round), hand-font subline `"Vol. IV · Round {game.round} · Morning Edition"` (Vol. IV is static gag copy; round is live).

Not adopted: the header's `SAVE` / `FAST RESOLVE` tags (no such features exist) and the `"Hail Freedonia…"` header subline (hardcoded to one country; wrong for custom rosters).

### 2.6 SoftWarnPanel

Restyled as the handoff's warnings panel and **adopts the always-visible variant**: `Panel` tilt 0, display-font header "SOFT WARNINGS"; when `warnings.length === 0` it renders the hand-font fallback "Nothing obviously stupid. Yet." instead of returning `null`. Warning lines keep the existing `describe()` messages verbatim (they are engine-accurate, unlike the handoff's single sample warning), rendered in hand font, `var(--magenta-deep)`, with a leading ⚠.

## 3. HotseatHandoff screen

Rewrite `HotseatHandoff.tsx` + module to the handoff curtain (`screens-1.jsx` HandoffScreen). Wiring unchanged: reads `state.activeHumanTurn`, button dispatches `{ type: 'BEGIN_PLANNING', leaderId: id }`.

- Full-viewport `var(--ink)` background, `var(--paper)` text, centered column max-width 640px, padding `32px 24px 96px`.
- Dot-grid overlay (`aria-hidden`): `radial-gradient(rgba(255,255,255,0.08) 1px, transparent 1.4px)`, `background-size: 8px 8px`, opacity 0.4.
- Content, top to bottom:
  - Yellow `Tag` "HOTSEAT HANDOFF" (12px, padding 5px 12px).
  - Giant flag emoji `clamp(72px, 16vw, 180px)` — first whitespace-separated token of `leader.country` (existing split logic kept; the flag is the chosen country's, per the human-portrait rule).
  - Display-font kicker "PASS TO" (18px, letter-spacing 0.3em, opacity 0.7).
  - Leader name headline: display font, `clamp(40px, 6.5vw, 72px)`, `var(--yellow)`, uppercase, `text-wrap: balance`.
  - Hand-font line "Previous orders sealed. Don't peek." (18px, opacity 0.8).
  - `<Btn variant="primary" size="xl">BEGIN MY TURN</Btn>`.
- Adopted handoff simplification: the separate country-name text line is dropped (flag carries it). Everything else about the flow (when the screen appears, who it names) is unchanged.

## 4. AiConferring screen

Rewrite `AiConferring.tsx` + module to the handoff intermission (`screens-1.jsx` ConferringScreen). Still dispatches `{ type: 'AI_RESOLVE' }` exactly once when the beat ends.

- **Adopted handoff timing** (replaces the current flat 1500ms): total stagger window `TOTAL = 2400`ms; AI row *i* (0-based, over the living AI leaders) flips to "filed" at `(i + 1) * TOTAL / n`; `AI_RESOLVE` dispatched at `TOTAL + 500`ms. Dots cycle 1→2→3 every 320ms. All timers cleared on unmount.
- Layout: `.paper` screen, centered column max-width 520px.
  - Centered header: ink `Tag` "INTERMISSION"; display-font headline "AI IS FILING ORDERS" (52px) with 1–3 trailing dots; hand-font subline "Don't look. They can sense it."
  - One `Panel` (tilt 0, padding 12) per **living AI leader in `game.cast`** (`!isHuman(id) && leaders[id].alive` — same filter Planning uses): `<Portrait leaderId={id} size={48} />`, display-font `leader.name` (16px, live name from state), hand-font flavour line `"{name} {line}"`, right-hand status: three pulsing dots (`pulsedot`, 150ms stagger) until filed, then green `Tag` "FILED ✓".
- Flavour lines, lifted verbatim from the handoff, keyed by `LeaderId` (module-level const; fallback `"is conferring."`):

| id | line |
|---|---|
| `chump` | is on the phone yelling at his generals. |
| `khameneverhere` | has filed orders. The orders are unsigned. |
| `starmless` | is consulting his shadow cabinet, slowly. |
| `carnage` | polishes his glasses. Files orders calmly. |
| `mileigh-hem` | is revving something offscreen. |
| `netanyahoo` | is adding a fresh red line to the bomb diagram. |

## 5. State wiring summary

| Visual element | Data source |
|---|---|
| Round badge, masthead teaser round | `game.round` |
| Header name/country/flag; handoff curtain name/flag | `game.leaders[activeId].name` / `.country` (respects `playerProfiles` overrides) |
| Your Country stats | `game.leaders[activeId]` (`population`, `factories`, `stockpile.*`) |
| AP meter used/max, subtotal, over-budget | `totalApCost(orders)` vs `player.ap` (existing) |
| Banked note | `player.apBanked`, `AP_BANK_CAP` |
| All displayed AP costs | `ACTION_COSTS` |
| Opponent card roster; conferring rows | `game.cast` filtered `!isHuman && alive` |
| Opponent stats | `game.leaders[id].population` / `.factories` |
| Mood quotes | `PreRoundMood` events in `state.events` |
| Launch-cell / deploy availability | `projectInventory(player, orders)` (existing) |
| Soft warnings | `analyseOrderSequence(game, activeId, orders)` (existing) |
| Masthead title | `pickMasthead(game.mastheadOrder, game.round, null)` |
| Seal / begin-turn / conferring-end | existing dispatches: `PLAYER_SUBMIT`, `BEGIN_PLANNING`, `AI_RESOLVE` — unchanged |

`src/ui/store.ts` is not modified in this slice.

## 6. Testing & verification

- Every commit: `npx tsc --noEmit` clean (noUnusedLocals) and `npm run test:run` green. No guarded assertions anywhere (`if (x) expect(...)` forbidden).
- **Updated** (markup changed; queries move to role/label/text, never class names): `tests/ui/Planning.actionGrid.test.tsx`, `Planning.targetRow.test.tsx`, `Planning.softwarn.test.tsx` (now asserts the always-rendered panel + "Nothing obviously stupid. Yet." empty state), `HotseatHandoff.test.tsx` (asserts "PASS TO", leader name, "BEGIN MY TURN" dispatch), `ApBudget.test.tsx` (new props: used/max/banked).
- **New**:
  - Orders queue: queuing via stepper shows a row with correct label + AP; clicking `×` removes exactly that order and updates the subtotal; empty state shows the banking copy.
  - Seal: holding the seal button (fake timers / rAF mock per slice-1's HoldButton tests) dispatches `PLAYER_SUBMIT` with the queued orders; while over budget the button is disabled and cannot complete.
  - AiConferring: with fake timers, rows flip to "FILED ✓" in cast order at the staggered times and `AI_RESOLVE` is dispatched exactly once at 2900ms; unmount clears timers (no dispatch after unmount).
  - RoundBadge: renders label + round number.
- `tests/ui/store.multihuman.test.ts` must pass untouched — proof the store wiring didn't move.
- Visual verification: `npm run dev` side-by-side with `design_handoff_nuke_game/index.html` (Planning, Handoff, Conferring via its DEV NAV).

## 7. Out of scope

- **"Last 3 Rounds" history strip** — engine exposes no per-round history; needs an engine/store feature first (candidate for slice 4 alongside newspaper data).
- **Relationship badges on opponent cards** (`RelBadge` "hit you R3" / "wooing you" etc.) — deriving live badges from `favourability`/`grudge`/`recentAggressionFrom` is new product logic, not a re-theme. `RelBadge` (slice 1) stays available for the Action/Summary slices.
- Handoff's click-to-append `↯ HIT / 📃 PROP / 🤝 WOO` order model — existing steppers/toggles keep full delivery/yield/targetType expressiveness.
- Header `SAVE` / `FAST RESOLVE` tags; `"Hail Freedonia…"` header subline.
- Action screen, RoundSummary, Winners (slices 3–4); Framer Motion (separate phase); DEV NAV (never); `data.jsx` imports (never — copy lifted verbatim only where stated above).
