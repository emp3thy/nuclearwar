# nuke — comic-tabloid re-theme, slice 4: RoundSummary newspaper + Winners

> **Note (2026-07-20):** the `design_handoff_nuke_game/` prototype bundle referenced in this document was a temporary handoff artifact and has been deleted. The implemented code in `src/ui/` is the source of truth; paths below are historical.

**Date:** 2026-07-19
**Status:** approved for implementation
**Depends on:** slice 1 (`2026-07-19-comic-retheme-slice1-design.md` — tokens.css, fonts, `<Portrait>`, comic primitives), slices 2–3 (Planning/Handoff/Conferring, Action). This slice assumes those deliverables are merged: `src/ui/tokens.css`, `src/ui/components/Portrait.tsx`, `src/ui/components/comic/*` (`Panel`, `Halftone`, `Tag`, `Stamp`, `Btn`, `RelBadge`, `Burst`, …) all exist.

## 0. Context

Final slice of the four-slice comic re-theme. Re-themes the two post-resolution screens to the handoff's most detailed designs (`design_handoff_nuke_game/screens-3.jsx` — `SummaryScreen`, `WinnersScreen`; `readme.md` §§6–7):

- **RoundSummary** becomes the fake tabloid front page: masthead, giant headline, mushroom-cloud "photo", casualty strip, full news stories, data-driven sidebar sections, corrections footer.
- **Winners** becomes the ironic final page: hero with 200px winner portrait + stamp, death-toll table, closing tagline.

The handoff's `NEWS_*` arrays and `SAMPLE_REACTIONS` in `data.jsx` are **shape and copy reference only** — every visual element on both screens is driven from live game state (`src/ui/store.ts` `UiState`: `game`, `events`, `prevPopulations`, `initialPopulations`) and engine data. `data.jsx` is never imported.

## 1. Target files

| File | Change |
|---|---|
| `src/ui/screens/RoundSummary.tsx` | Rewrite render to tabloid layout. **Keep** `pickHeadline` (private) and `pickSubhead` (exported, tested) logic unchanged. |
| `src/ui/screens/RoundSummary.module.css` | Rewrite (tabloid layout, from `screens-3.jsx` inline styles). |
| `src/ui/util/newspaper.ts` | **New.** Pure derivation module: typed section models (stories, forecast, market, box score, obits, corrections index, photo caption) computed from `GameState` + `ResolutionEvent[]` + `prevPopulations`. No React. |
| `src/ui/components/MushroomCloudPhoto.tsx` | **New.** The stylised mushroom-cloud SVG "photo" frame (SVG lifted from `screens-3.jsx`), props: `stampText?: string`, `caption: string`. |
| `src/ui/components/DisparageColumn.tsx` + `.module.css` | Restyle as a `.side-sec` sidebar section; add `<Portrait leaderId="disparage" size={52} />`. Props/event wiring unchanged. |
| `src/ui/screens/Winners.tsx` + `Winners.module.css` | Rewrite render to hero + death-toll layout. **Keep** `pickHeadline`, `pickSubLine`, `tollRows` computation/sort, `newGame`/`sameCast` handlers unchanged. |
| `tests/ui/newspaper.test.ts` | **New** — derivation tests (§7). |
| `tests/ui/roundSummary.test.ts` | Unchanged; must stay green. |

No engine changes. `src/engine/masthead.ts` is consumed as-is.

## 2. RoundSummary — layout

Ink desk background (`--ink`), padding `20px 12px 96px`. The paper sheet: `.paper` class, max-width 1100px centered, padding `28px 28px 16px`, `4px solid var(--ink)` border, `8px 8px 0 var(--magenta)` offset shadow.

Inside the sheet, top to bottom:

1. **Masthead** (centered): magenta kicker `EXTRA · EXTRA · EXTRA` (Anton 10px, letter-spacing 0.28em); masthead title (Playfair 900, `clamp(48px, 9vw, 96px)`, line-height 0.9, uppercase via CSS `text-transform`); rule line (1.5px ink top+bottom borders, Anton 11px, space-between, wraps) with three spans: `VOL. IV · ROUND {reportedRound}` / `MORNING EDITION` / `FREE WHILE STOCKS LAST`.
2. **Summary grid**: single column; ≥920px `grid-template-columns: minmax(0, 2fr) minmax(0, 1fr)`, gap 28px. Left = main column, right = sidebar (`align-self: start`).
3. **Corrections box** (full width below the grid).
4. **Continue bar** (full width, ink background, `border-top: 4px double var(--magenta)`, centered).

`reportedRound = game.round - 1` (the engine increments `round` at the end of `resolveRound`; the paper reports the round just resolved). This matches the existing `pickMasthead(game.mastheadOrder, game.round - 1, game.outcome)` call, which is kept verbatim (including the apocalypse `THE END TIMES — FINAL EDITION` override).

Breakpoints: grid collapses <920px; story flow drops to 1 column <600px (§3.4); casualty strip stays 4-across at all widths (cells shrink).

## 3. RoundSummary — main column

### 3.1 Headline + standfirst

- **Headline**: existing `pickHeadline` output, Anton `clamp(56px, 10vw, 108px)`, line-height 0.88, ink. Behavior preserved exactly: apocalypse → `THE END.`; elimination → `{NAME} ELIMINATED`; worst delta ≤ −10 → `{NAME} CLOBBERED`; ≤ −3 → `{NAME} STRUCK`; else `ROUND {round − 1} SETTLES`. The existing `styles.theEnd` apocalypse treatment is re-expressed in the new CSS (magenta headline).
- **Stamp**: when `thisRoundLost > 0`, a magenta `<Stamp>` reading `−{thisRoundLost}M`, absolutely positioned top-right of the headline block, rotated 8°.
- **Standfirst**: existing `pickSubhead` output (exported function, logic and tests untouched), Playfair italic 17px, line-height 1.35.

### 3.2 Photo frame (`MushroomCloudPhoto`)

Frame: `position: relative`, `3px solid var(--ink)` border, ink background, height 220px, `overflow: hidden`, margin `16px 0`. Contents:

- The SVG from `screens-3.jsx` lines 373–405 lifted verbatim (viewBox `0 0 400 200`, `preserveAspectRatio="xMidYMid slice"`, radial gradient `#f3c318 → #e6a517 → #c61f44 → #3a1010 → #141214`, 5×5 halftone dot pattern at 0.18 opacity, stacked ellipses + stem rect, 18 ink burst rays at 0.3 opacity). `aria-hidden="true"`. Gradient/pattern ids must be unique-per-instance (e.g. `useId`) so the component is safe to reuse.
- **Stamp** (top-right, magenta, rotate −7°): rendered only when `stampText` prop is set; RoundSummary passes `−{thisRoundLost}M` when `thisRoundLost > 0`, else omits it.
- **Caption bar** (absolute bottom, `rgba(20,18,20,0.85)` on paper text, Playfair italic 11px), text from `newspaper.ts`:
  - casualties this round: `Eyewitness sketch of the impact zone over {country}. Artist's impression.` — `{country}` is the country (flag emoji stripped) of the target in the round's largest summed attacker→target people-loss pairing (same pairing logic as `pickSubhead`).
  - no casualties: `File photo of a previous detonation. Nothing exploded tonight. Cherish it.`

The photo frame renders every round (the paper always runs a picture).

### 3.3 Casualty strip

4-column grid, `padding: 12px 14px`, ink background, paper text, `margin-bottom: 14px`. Each cell: Anton 10px label (letter-spacing 0.16em, opacity 0.6) over Anton 22px value.

| Label | Value | Color | Source |
|---|---|---|---|
| `THIS ROUND` | `−{thisRoundLost}M` | `--magenta` | existing `thisRoundLost` computation (sum of `max(0, prev − current)` over `prevPopulations`) — preserved |
| `WAR TO DATE` | `−{warTotalLost}M` | paper | existing `warTotalLost` computation (vs `initialPopulations`) — preserved |
| `SURVIVORS` | `{Σ population of cast}M` | `--green` | sum of `game.leaders[id].population` over `game.cast` |
| `LEADERS LEFT` | `{aliveCount}/{game.cast.length}` | paper | existing `survivors` count — preserved |

### 3.4 News stories — "FROM AROUND THE RUBBLE"

Section head: `★ FROM AROUND THE RUBBLE ★` — Anton 16px, centered, `3px double` ink rules top+bottom. (Replaces the current "World Reactions" heading and row list.)

Story flow: CSS `column-count: 2`, `column-gap: 22px`, `column-rule: 1px solid rgba(20,18,20,0.3)`; `column-count: 1` under 600px. Each `<article class="news-story">` is `break-inside: avoid` with dashed bottom rule. The **lead story** (`.lead`) spans both columns (`column-span: all`, `3px double` bottom rule, headline 30px, body itself set in 2 columns).

One story per **living** cast member (same iteration + `alive` filter as today's world-reactions loop). Story anatomy (fonts per handoff: kicker Anton 9px magenta; headline Anton 18px / 30px lead; byline Playfair 10px; body Playfair 12.5px justified/hyphens; pull-quote Playfair italic 14px with 3px magenta left rule):

- **Kicker (dateline)** — static map for AI leaders, adopted from handoff copy: chump `MAR-A-LAGO`, carnage `PARLIAMENT HILL`, khameneverhere `LOCATION UNDISCLOSED`, netanyahoo `THE KIRYA, TEL AVIV`, starmless `WESTMINSTER`, mileigh-hem `CASA ROSADA`. Human slots (`player1`–`player5`): the leader's country name, flag emoji stripped, uppercased (e.g. `FREEDONIA`).
- **Headline** — template chosen by the leader's dominant round condition, first match wins:

  | Precedence | Condition (from `events` + deltas) | Headline (verbatim) |
  |---|---|---|
  | 1 | popDelta ≤ −10 | `{NAME} DIGS OUT, BLAMES EVERYONE` |
  | 2 | −10 < popDelta < 0 | `{NAME} SHRUGS OFF LIGHT VAPORISATION` |
  | 3 | any `MissileLaunched` with `from === id` | `{NAME} PRESSES BUTTON, FEELS BETTER` |
  | 4 | any `MissileIntercepted` with `to === id` | `DEFENCES HOLD; {NAME} INSUFFERABLE` |
  | 5 | any `FactoryBuilt` with `by === id` | `GROUNDBREAKING CEREMONY HELD` |
  | 6 | any `PropagandaTransfer` with `from === id` | `LEAFLETS AWAY; NEIGHBOURS FURIOUS` |
  | 7 | any `WooApplied` with `from === id` | `{NAME} SPOTTED BEING NICE; MOTIVE UNKNOWN` |
  | 8 | otherwise | `{NAME} DOES NOTHING, CALLS IT STRATEGY` |

  `{NAME}` = `leader.name.toUpperCase()`. popDelta = `population − prevPopulations[id]` (0 when prev undefined).
- **Byline**: `by our {country} correspondent` (flag stripped), plus the population delta on the right in mono: `{prev}M → {cur}M` when changed (magenta if down, green if up), else `{cur}M` in `--ink-soft`.
- **Portrait**: `<Portrait leaderId={id} size={72} />` for the lead story, `size={46}` otherwise; floated left (`float: left; margin: 2px 10px 4px 0; shape-outside: margin-box`).
- **Body**: 1–3 sentences concatenated from these templates, in this order, only for categories present in the leader's round events (numbers summed per category):
  - people lost: `A strike removed {n} million citizens from the census.` (when a single attacker: `A strike from {attacker} removed {n} million citizens from the census.`)
  - factories lost: `{n} factory(ies) now qualify as open-plan.`
  - intercept as defender: `Air defences held; one incoming warhead retired over open water.`
  - launched: `{n} launch order(s) were filed and, regrettably, executed.`
  - propaganda received: `{n} million citizens defected after reading a leaflet.`
  - propaganda sent: `Leaflet drops persuaded {n} million foreigners to relocate.`
  - factory built: `Ground was broken on a new factory.`
  - woo sent: `Diplomatic flowers were dispatched to {target name}.`
  - none of the above: `No orders of consequence were filed. Analysts describe the restraint as "suspicious."`

  Cap the body at the first three applicable sentences (same precedence order as listed).
- **Pull-quote**: the leader's `PostRoundReaction` quote (existing lookup, preserved), rendered `"{quote}"`; omitted when absent.
- **Badges** (`<RelBadge>` row, `clear: both`): derived, in order — `−{n}M citizens` (harm, pop loss), `+{n}M citizens` (gain, pop gain), `−{n} factories` (harm), `+1 factory` (gain, `FactoryBuilt`), `banked {n} AP` (neutral, when `leader.apBanked > 0`). Omit any zero entries; row omitted if empty.

**Lead story selection**: the living leader with the largest population loss this round; ties broken by `game.cast` order; if no one lost population, the first living leader in cast order.

**DOM order**: the lead story renders **first** in the story flow, followed by the remaining living leaders in `game.cast` order. Because `.lead` is `column-span: all`, placing it anywhere but first would split the 2-column flow mid-stream; the handoff always renders the lead at the top (`screens-3.jsx` `big = i === 0`) with its `3px double` rule separating it from the columned stories below. Do not iterate the cast in order and tag the matching story in place — reorder so the selected lead comes first.

The old compact reaction rows (`👥 {pop}M · 🏭 {factories}` line) are replaced by this section; the data they showed survives in byline deltas and badges.

### 3.5 Existing behaviors preserved (main column)

- `pickHeadline` / `pickSubhead` logic, `pickSubhead` export and its tests.
- `thisRoundLost` / `warTotalLost` / `survivors` computations.
- Masthead selection via `pickMasthead` incl. apocalypse final edition.
- The `[ mushroom-cloud SVG — P4a ]` placeholder is finally replaced by the real SVG.

## 4. RoundSummary — sidebar

Each section is a `.side-sec` (paper-warm bg, `2px solid var(--ink)`, `3px 3px 0 var(--ink)` shadow, 12px padding, 16px stacked gap) with a `.side-head` (Anton 12px, centered, `3px double` ink rules). Order top→bottom:

### 4.1 THE FORECAST

Driven by `thisRoundLost` tiers:

| `thisRoundLost` | outlook (magenta, Anton 20px) | temp / tempLabel (mono 11px) | UV (☢ × n) | Fallout row |
|---|---|---|---|---|
| 0 | `FALLOUT: NONE` | `20°` / `seasonal, suspicious` | 1 | `None reported` |
| 1–5 | `FALLOUT: LIGHT` | `400°` / `localised high` | 2 | `Light, drifting east` |
| 6–14 | `FALLOUT: HEAVY` | `1,200°` / `ground zero high` | 4 | `Heavy, drifting east` |
| ≥15 | `FALLOUT: BIBLICAL` | `5,800°` / `surface of the sun, briefly` | 5 | `Total, drifting everywhere` |

Conditions table (label Anton 10px / value Playfair italic 12px right-aligned, dotted row rules):
- `Fallout` — tier row above.
- `Visibility` — `Nil to 200 yards` when lost > 0, else `Unlimited. For now.`
- `Wind` — `Mushroom-shaped` when lost > 0, else `Light breeze`.
- `Outlook` — `Worse. Always worse.` (always).

UV block right-aligned: label `UV INDEX`, value `☢` repeated n times.

> **Deliberate divergence from the mock:** `data.jsx` `NEWS_WEATHER` pairs `FALLOUT: HEAVY` with `uv: 5` ("out of 5"). This spec's 1/2/4/5 ladder reserves UV 5 for the BIBLICAL tier so the scale has headroom; HEAVY = 4 is intentional. Do not "fix" it back to match the sample datum.

### 4.2 MARKET REPORT

Sub-line: `Population exchange · close of round` (Playfair italic 10px, ink-soft). One ticker row per cast member **including the dead** (grid `42px 64px 1fr`, dotted rules):

- **sym** (mono 12px bold): AI static map — chump `USA`, khameneverhere `IRN`, starmless `UK`, carnage `CAN`, mileigh-hem `ARG`, netanyahoo `ISR`. Humans: country name with flag stripped, uppercased, first 3 characters (Freedonia → `FRE`).
- **change**: `prev > 0 ? Math.round((cur − prev) / prev × 100) : 0` (prev from `prevPopulations`, 0 fallback when undefined). Rendered `▲ {n}%` green / `▬ 0%` ink-soft / `▼ {n}%` magenta (absolute value shown).
- **note** (Playfair italic 10px): dead → `delisted`; change ≤ −20 → `clobbered`; −20 < change < 0 → `down`; 0 → `holds`; > 0 → `up`.

> **Deliberate divergence from the mock:** the deterministic first-3-chars rule yields `FRE` for Freedonia, while `data.jsx` `NEWS_MARKET` hand-picks `FRD`. Humans can enter any country name, so a hand-tuned abbreviation table is impossible; the rule wins and the tests assert `FRE`. A side-by-side check against the prototype showing `FRD` is not a defect.

### 4.3 TONIGHT'S EXCHANGES (box score)

One row per qualifying event, in event order (mono attacker `›` target on the left, Anton score right-aligned):

| Event | Score text | Color |
|---|---|---|
| `ImpactPeople` | `−{deaths}M` | `--magenta` |
| `ImpactInfrastructure` | `−{factoriesDestroyed} fac` | `--magenta` |
| `MissileIntercepted` | `INTERCEPT` | `--green` |

Names use `leader.name` (first 9 chars + `.` when longer). Intercept rows render `{attacker} › {defender}` (from the event's `from`/`to`), with `INTERCEPT` in green. Empty state (no qualifying events): single Playfair-italic line `No exchanges. The censors are baffled.`

> **Deliberate divergence from the mock:** `data.jsx` `NEWS_BOXSCORE` renders its intercept row as `{defender} › —`. The `{attacker} › {defender}` form is unambiguous (names who fired the intercepted shot) and keeps one row shape for all three event kinds; the mock's `—` form is not adopted. A side-by-side visual check will differ here by design.

### 4.4 OBITUARIES

Detection preserved from current code: eliminated this round = `!leader.alive && prevPopulations[id] > 0`; quote from the `LeaderEliminated` event. Entry: name (Anton 13px) + line (Playfair italic 11px) = the event quote, or `Gone, and swiftly forgotten.` when the event carries no quote. When nobody died this round the section still renders with placeholder: `None yet. Everyone's still here. Give it a round.` (verbatim from handoff).

### 4.5 THE DISPARAGE COLUMN

`DisparageColumn` component restyled as a `.side-sec`. Rendering condition preserved: only when a `DisparageColumn` event exists in `state.events`. Content: head `THE DISPARAGE COLUMN`; sub-line `From his Clacton office (allegedly)` (kept, moves from header into a Playfair-italic line); flex row of `<Portrait leaderId="disparage" size={52} />` + `event.quote` (Playfair 13px); footer `event.footer` (Playfair italic 10px, top border). Engine-driven quote/footer wiring unchanged.

### 4.6 CLASSIFIEDS

Static filler pool, all four shown, lifted verbatim from `data.jsx` `NEWS_CLASSIFIEDS` (tag in Anton 9px, body Playfair 11px justified, dotted rules):

- `FOR SALE` — `One (1) missile shield, barely used. Buyer collects from crater.`
- `WANTED` — `Delivery system for Large warhead. Will not fly itself, apparently.`
- `LOST` — `Iran's signed orders. Last seen never. Reward: plausible deniability.`
- `PERSONAL` — `Lonely glass cannon seeks 100% aggression. ¡Viva la libertad, carajo!`

### 4.7 Advertisement

Yellow block (`3px solid var(--ink)`, centered): `ADVERTISEMENT` (Anton 11px) / `NUCLEAR DUCKS` (Bangers 28px, two lines) / `If it walks, talks, and quacks — it's covered. Limited supply.` (Patrick Hand 14px).

## 5. RoundSummary — footer

### 5.1 Corrections & Clarifications

Full-width box (paper-warm, 2px ink border): label `CORRECTIONS & CLARIFICATIONS` (Anton 10px) followed by one rotating line (Playfair italic), pool verbatim from `data.jsx`, index `(reportedRound − 1) % 3`:

1. `CORRECTION: Yesterday we reported 14M dead. It was 15M. We regret the optimism.`
2. `CORRECTION: Mr Chump was described as 'a stable genius.' This was his description.`
3. `CORRECTION: The duck was, in fact, nuclear. We apologise to the duck.`

### 5.2 Continue bar

`<Btn variant="primary" size="xl">` dispatching `{ type: 'NEXT_ROUND' }` — dispatch preserved. Label strings preserved from current code (`Final Verdict` when `game.outcome`, else `` `Round ${game.round} → Plan` ``); uppercase presentation via CSS `text-transform: uppercase` so text queries keep matching the DOM string.

## 6. Winners

Full-viewport ink background, paper text, `padding: 40px 16px 96px`, `<Halftone color="rgba(255,255,255,0.06)" />` overlay, content max-width 1100px centered. Top to bottom:

1. **Tag** (centered): yellow `<Tag>` `FINAL SCORE · ROUND {game.round − 1}`.
2. **Hero** — flex row (gap 32px, wraps; column layout <720px), `--ink-soft` bg, `3px solid var(--paper)` border, `8px 8px 0 var(--magenta)` shadow, 28px padding:
   - **Portrait block** (survivor/pyrrhic only): `<Portrait leaderId={outcome.winner} size={200} />` with rotated (14°) `<Stamp>` at top-right — yellow `SURVIVOR` for `survivor`, magenta `PYRRHIC` for `pyrrhic`. **Apocalypse**: no portrait; a 200px-square ink panel containing a single ☢ glyph (~120px, `--magenta`) with magenta `NO SURVIVORS` stamp.
   - **Text block**: headline from existing `pickHeadline` (Anton `clamp(48px, 8vw, 110px)`, line-height 0.9) — logic preserved (`WINNER: NOBODY` / `{NAME} WINS`); subline from existing `pickSubLine` (Patrick Hand 20px, `--paper-edge`), still wrapped in quotes as today; button row — `<Btn variant="primary" size="lg">New Game</Btn>` and `<Btn size="lg">Same Cast, Again</Btn>`, wired to the existing `newGame` / `sameCast` handlers (BACK_TO_SETUP; START_GAME with `lastNewGameOpts` + fresh seed — both preserved verbatim).
3. **Death Toll** — `<Panel title="Death Toll">` on paper (ink text), containing the table. Data preserved: existing `tollRows` computation from `initialPopulations` vs live `leader.population`, sorted ascending by `pctLost`. Columns (header row: ink bg, Anton 11px): `LEADER` (flex 2: `<Portrait leaderId={id} size={36} />` + bold name + existing `(you)` marker on `player1` — preserved) / `START` (`{start}M`, mono) / `END` (`{end}M`, mono — magenta when 0, green otherwise) / `% LOST` (`{pct}%`, mono bold — **adopted from handoff:** integer `Math.round(pctLost)` replaces the current `toFixed(1)`) / `STATE` (flex 2: `<RelBadge kind="gain">SURVIVED</RelBadge>` when `end > 0`, else `<RelBadge kind="harm">ELIMINATED</RelBadge>`). Rows dashed-ruled. On narrow screens the table sits in an `overflow-x: auto` wrapper.
4. **Final word** (centered): `"EVERYBODY PLAYS. NOBODY WINS."` (Anton 28px, `--magenta`) over `— the original 1989 box, more or less.` (Patrick Hand 16px, `--paper-edge`).

## 7. Testing & verification

- **Existing tests stay green**: `tests/ui/roundSummary.test.ts` (`pickSubhead`) unchanged; full `npm run test:run` and `tsc --noEmit` (noUnusedLocals) pass on every commit. No guarded assertions anywhere (`if (x) expect(...)` forbidden — assert presence first or use non-null narrowing).
- **New `tests/ui/newspaper.test.ts`** (pure derivation, no rendering):
  - forecast tier boundaries: lost = 0 / 1 / 5 / 6 / 14 / 15 map to NONE / LIGHT / LIGHT / HEAVY / HEAVY / BIBLICAL with matching UV counts;
  - market rows: percent math, `▬ 0%` when prev undefined, `delisted` note for dead leaders, human sym derivation (`FRE` from `🦆 Freedonia`);
  - box score mapping for ImpactPeople / ImpactInfrastructure / MissileIntercepted and the empty-state row;
  - story headline precedence (a leader who both lost ≥10M and launched gets the DIGS OUT headline; an idle leader gets DOES NOTHING);
  - lead-story selection (largest loss wins; cast-order fallback when no losses) **and story ordering** — the derived story list puts the lead first, then the remaining living leaders in cast order (§3.4 DOM order);
  - photo caption: impact-zone country for the biggest pairing vs. the file-photo line when no casualties.
- **Render tests** (testing-library, query by role/text): RoundSummary shows the masthead from `game.mastheadOrder`, casualty-strip values, corrections line rotating with round; DisparageColumn section renders only when the event is present; Winners renders sorted death-toll rows, ELIMINATED badge for `end === 0`, and both buttons dispatch their existing actions.
- Visual verification: `npm run dev` side-by-side with `design_handoff_nuke_game/index.html` (Summary + Winners via its nav).

## 8. Out of scope

- Action screen re-theme (slice 3), and any Planning/Setup/Handoff/Conferring work (slices 1–2).
- Framer Motion — separate future phase; only `tokens.css` keyframes (`fadein`, `pop`) may be used here.
- The handoff DEV NAV — not ported.
- Engine changes of any kind (masthead pool, event kinds, outcome logic all consumed as-is).
- Importing `design_handoff_nuke_game/data.jsx` — copy is lifted into this codebase's source/derivation module as content, never imported.
- Commissioned portrait art (future swap behind `<Portrait>`).
- Print stylesheet / share-image export of the newspaper.
- Multi-human hotseat flow changes — roster, `(you)` marker semantics, and all `dispatch` wiring stay exactly as they are.
