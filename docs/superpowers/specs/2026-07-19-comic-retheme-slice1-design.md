# nuke — comic-tabloid re-theme, slice 1: foundation + Setup

**Date:** 2026-07-19
**Status:** approved in brainstorming session
**Supersedes:** `2026-05-20-visual-design-portrait-system-design.md` (parchment direction, AI-generated PNG portraits, flag-fill human slots)

## 0. Context

A complete hi-fi design handoff lives at `design_handoff_nuke_game/` — a working HTML/JSX prototype of all seven screens in a political-cartoon comic-book / four-color tabloid aesthetic, with design tokens, shared primitives, geometric SVG caricature portraits, and final copy. See its `readme.md` for the full screen-by-screen description.

The handoff is the new visual source of truth. It is a design reference, not production code (CDN React + in-browser Babel); we recreate it in this codebase's stack: Vite + React 18 + TypeScript + CSS modules, driven by live engine state from `src/ui/store.ts`.

The work is decomposed into four slices, each its own spec → plan → PR cycle:

1. **This slice:** design tokens, fonts, portrait system, shared comic primitives, Setup screen re-theme.
2. Planning + HotseatHandoff + AiConferring re-themes.
3. Action screen (world map, event playback overlays).
4. RoundSummary (fake newspaper) + Winners re-themes.

During the waves the app will be visually mixed (new Setup, old rest). Accepted.

## 1. Design tokens (`src/ui/tokens.css`)

Port `design_handoff_nuke_game/tokens.css` near-verbatim to `src/ui/tokens.css`, imported first in `src/ui/main.tsx`. It replaces any existing global parchment styling. Contents:

- **Custom properties:** ink/paper palette, CMYK-aged accents (`--cyan #1d7fb0`, `--magenta #c61f44`, `--yellow #f3c318`, `--green #2e7a3c`), leader signature colors (`--c-chump`…`--c-disparage`), font stacks, spacing scale `--s-1`…`--s-8` (4/8/12/16/24/32/48/64px), borders 2/3/4px, radius 0, hard ink-offset shadows (`--offset-sm/md/lg`, no blur).
- **Global base classes:** `.paper` (newsprint texture), `.panel` (+ `tight/flat/dark/tilt-*` variants), `.panel-title`, `.tag`, `.stamp`, `.bubble`, `.burst`, `.halftone-cyan/magenta/yellow/ink`, button base styles.
- **Keyframe animations:** `fadein`, `pop`, `pulsedot`, `wobble`, `scan`.

Base classes are intentionally global — they are the design language shared by every screen. Screen-specific layout stays in per-screen CSS modules that reference the custom properties.

## 2. Fonts

Self-hosted via `@fontsource` packages, imported in `main.tsx`:

| Family | Package | Weights |
|---|---|---|
| Anton | `@fontsource/anton` | 400 |
| Playfair Display | `@fontsource/playfair-display` | 400, 700, 900 + italics |
| Work Sans | `@fontsource/work-sans` | 400–800 |
| JetBrains Mono | `@fontsource/jetbrains-mono` | 400, 700 |
| Bowlby One | `@fontsource/bowlby-one` | 400 |
| Patrick Hand | `@fontsource/patrick-hand` | 400 |
| Bangers | `@fontsource/bangers` | 400 |

No runtime external fetch; deterministic builds.

## 3. Portrait system

Supersedes the old PNG/flag-fill portrait spec. Geometric caricature SVGs from `design_handoff_nuke_game/portraits.jsx`, ported to typed components.

- `src/ui/portraits/` — one file per leader (`chump.tsx`, `netanyahoo.tsx`, `khameneverhere.tsx`, `starmless.tsx`, `carnage.tsx`, `mileighhem.tsx`, `disparage.tsx`, `groucho.tsx`), each exporting an SVG face component; `index.ts` exports a `FACES` record keyed by leader id.
- `src/ui/components/Portrait.tsx` — the single consumer-facing component: `<Portrait leaderId={id} size={px} />`. Sizes are free pixel values per call site (handoff convention: 48–200px), not a fixed token scale.
  - **AI leader:** signature-color background, the leader's `FACES` SVG, halftone multiply overlay.
  - **Human slot (`player1`–`player5`):** Groucho-disguise SVG (glasses + moustache + cigar), differentiated by per-slot accent color (fixed per slot: player1 `--cyan`, player2 `--green`, player3 `--yellow-soft`, player4 `--magenta-deep`, player5 `--ink-soft`) plus the player's chosen-country flag badge.
  - Dispatches on `isHuman(leaderId)` from `src/engine/state.ts`.
- SVGs are deliberate placeholders: `<Portrait>` API stays stable so commissioned art can replace internals with no call-site change.
- Khameneverhere's portrait is the cardboard-cutout "NOT HERE" gag — absence preserved.

## 4. Shared comic primitives (`src/ui/components/comic/`)

Port `design_handoff_nuke_game/ui.jsx` to one typed TSX file per component:

`Panel`, `Halftone`, `Tag`, `Stamp`, `Bubble`, `Burst`, `Btn`, `Stat`, `ApMeter`, `PhaseTrack`, `DamageBadge`, `RelBadge`, `HoldButton`, `Ribbon`.

- Props typed; behavior matches the prototype (e.g. `Panel` tilt variants, `Stamp` rotation, `Burst` color/fg pairing).
- `HoldButton`: requestAnimationFrame progress fill over `duration` ms (default 600), fires `onComplete` at 100%, cancels on mouse/touch leave/up.
- Components lean on the global base classes from `tokens.css`; anything component-specific goes in a co-located CSS module.

## 5. Setup screen re-theme

Rebuild `src/ui/screens/Setup.tsx` + `Setup.module.css` to the handoff layout (`screens-1.jsx`):

- Max-width 1180px on `.paper`. Two-column grid (`minmax(0,1.6fr) minmax(0,1fr)`) ≥920px; single column below.
- **Left:** "The Table" cast picker — 2-col grid of rotated cast tiles (3px ink border, 4px offset shadow, ±1.4° rotation; 64px `<Portrait>`, name in Anton, country/profile in mono, 2-line clamped mood quote in Patrick Hand, POP/⚙/AP stat tags, magenta "PICKED" stamp when selected; hover lifts to rotation 0 + translateY(−2px)).
- **Right:** stacked panels — human roster, difficulty, begin panel with live opponent count.
- **Header copy:** kicker "A PARODY IN POOR TASTE", title "NUKE!" (magenta "!"), tagline "Everybody plays. **Nobody** wins.", yellow ribbon "SELECT YOUR ENEMIES".
- **Difficulty labels** (mapped to existing engine values): easy = "Fine, Probably", normal = "Not Great", hard = "We're Cooked". Selected option: ink bg, paper text, magenta check square.
- **Pick behavior:** toggle on click; if already 4 opponents picked, drop the oldest pick and add the new one (adopted from handoff). Begin disabled until ≥2 opponents and all human rows complete.
- **Behavior kept from existing code, diverging from handoff:** multi-human hotseat roster (1–5 players, add/remove, per-player name + country inputs, player1 defaults to Rufus T. Firefly / Freedonia and cannot be removed) — styled as roster rows in the same panel language. Seed input stays. All `dispatch({type:'START_GAME'…})` wiring unchanged.
- Begin button: "Begin the End ↯".

## 6. Testing & verification

- Existing vitest + testing-library suite stays green; Setup behavior tests updated for new markup (queries by role/label, not old class names).
- New render tests: `Portrait` AI vs human variant; `HoldButton` fires `onComplete` after hold, cancels on early release.
- Visual verification: `npm run dev` side-by-side with the prototype (`design_handoff_nuke_game/index.html`).

## 7. Out of scope (later slices / never)

- Re-theming Planning, HotseatHandoff, AiConferring (slice 2), Action (slice 3), RoundSummary + Winners (slice 4).
- Framer Motion animation work (separate, already-specified phase).
- Handoff's DEV NAV bar — not ported.
- Commissioned portrait art — future swap behind the `<Portrait>` API.
- The prototype's mock data (`data.jsx`) — never imported; live engine state only. Its copy (mood quotes, difficulty labels, headlines) is lifted as content where a screen needs it.
