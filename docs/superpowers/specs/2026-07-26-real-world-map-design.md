# nuke — real world map for the Action screen

**Date:** 2026-07-26
**Status:** approved in brainstorming (visual companion); pending spec review
**Goal:** Replace the Action screen's abstract blob continents with a recognisable real-world map (real coastlines), leaders pinned at true geographic locations, and Freedonia as an invented island in the mid-Atlantic. Confirmed visually in the companion.

## 0. Decisions (locked)

- **Real coastlines, comic-styled.** Actual Natural Earth 110m land (public domain), simplified, drawn in the existing ink-outline / paper-fill / halftone-ocean style — recognisable Earth, not photoreal, not toddler blobs.
- **Real geographic pins.** Every leader sits at true lon/lat via an equirectangular mapping (`x = lon + 180`, `y = 90 - lat`). Freedonia = invented mid-Atlantic island (~40°W, 32°N). Human slots 2–5 take ocean positions.
- **Presentational only.** No engine/gameplay change. Overlays (launch arcs, impact rings, pulses, diplomacy trails, build icons) keep their behaviour — only their coordinate constants rescale to the new map units.

## 1. Asset & provenance (already in the branch)

- `src/ui/components/worldPath.ts` — `WORLD_PATH` (single `d`, ~37KB, `fill-rule="evenodd"`) + `WORLD_VIEWBOX = "0 12 360 132"`. Sourced from Natural Earth 110m Land (public domain: "No permission is needed… crediting unnecessary"), converted to `x=lon+180, y=90-lat`, RDP-simplified. Licence/provenance noted in the file header.
- `scripts/worldmap/ne_110m_land.equirect.svg` (source) + `scripts/worldmap/convert.py` (regenerator) kept for reproducibility.

## 2. WorldMap.tsx changes (`src/ui/components/WorldMap.tsx`)

### 2.1 Coordinate system
- viewBox: `"0 0 100 85"` → `WORLD_VIEWBOX` (`"0 12 360 132"`).
- `preserveAspectRatio`: `"none"` → `"xMidYMid meet"` (real coastlines must keep their proportions, not stretch).
- Add an ocean background covering the full equirectangular extent so letterboxing (from `meet`) reads as ocean: a `<rect x="0" y="0" width="360" height="180">` in the ocean cyan + the existing halftone dot pattern, drawn first.
- Continents: replace the seven hand-authored `<path>`s (+ the separate UK island + its label) with one `<path d={WORLD_PATH} fillRule="evenodd" fill="var(--paper)" stroke="var(--ink)" strokeWidth="0.5" strokeLinejoin="round" />`. (UK is now part of the real coastline, so the special-case island path AND the standalone "UK" continent label are removed; UK keeps its country pin like everyone else.)

### 2.2 COUNTRY_POS → real lon/lat
Rewrite via an `ll(lon, lat)` helper (`{ cx: lon + 180, cy: 90 - lat }`). Values (lon, lat):
- chump USA (-98, 39) · carnage CANADA (-106, 58) · burnem UK (-2, 54) · netanyahoo ISR (34, 31) · khameneverhere IRAN (53, 32) · mileigh-hem ARG (-64, -38)
- player1 Freedonia (-40, 32) — mid-Atlantic
- player2 (-150, 5) Pacific · player3 (78, -28) Indian Ocean · player4 (170, 42) N Pacific · player5 (-25, -45) S Atlantic
Keep the `CountryPos { cx, cy, label? }` shape and AI `label`s (USA/CANADA/UK/ISR/IRAN/ARG) so the render loop is unchanged.

### 2.3 Freedonia island
Freedonia has no real landmass. Draw a small invented island under player1's pin (a `<path>` blob in `--cyan-soft`, ~6×5 units) so the human isn't floating on open ocean. Only for player1 (and only if player1 is in the cast); other human ocean slots just get their pin/marker (islandless is fine for them, or reuse the same small-island blob — implementer's call, keep it cheap).

### 2.4 Rescale overlay + marker constants to the 360×132 space
The map units are ~3.6× the old 100-wide space; `meet` keeps units square so one factor applies. Use these (validated in the companion mock):
- Country marker ellipse: `rx` ~5–6 (UK/ISR smaller ~3.5), `ry` ~3–3.4; label `fontSize` ~3.6 (small pins ~3.2). Drop the old `isUK` special-case sizing if no longer needed, or keep a "small pin" set for UK/ISR which sit close together in the Middle East / NW Europe.
- LaunchArc apex: `midY = min(a.cy,b.cy) - 16` (was −18 in the small space); strokeWidths ~1.0 (yellow) / 0.5 (magenta); flight-icon fontSize ~8.
- ImpactRings: outer `rx 13 / ry 8`, inner `rx 16.5 / ry 10` (scaled from 9/5 & 11.5/7); strokeWidths ~0.8 / 0.4.
- Pulse: `r` ~5–6, strokeWidth ~0.5.
- Trail: mid offset ~−10, strokeWidth ~0.5, icon fontSize ~5.
- Build-icon: fontSize ~5, offset ~−7.
Tune by eye against the running app; the companion mock's arc (Iran→Freedonia) already reads correctly at these values.

## 3. CSS (`WorldMap.module.css` / Action)
- Ensure the map container background is the ocean cyan (or the SVG's own ocean rect fully covers the frame) so `meet` letterbox bars, if any, don't show as ink. Minimal change — likely just confirm `.svg` fills its box and the ocean rect covers the extent. No layout restructure.

## 4. Testing (`tests/ui/WorldMap.test.tsx`)
- Update assertions tied to the old viewBox / abstract paths / UK special-casing.
- Assert: the real `WORLD_PATH` renders (one big path with `fill-rule="evenodd"`); each cast leader renders a marker + label at its `COUNTRY_POS`; an actor gets the green highlight and a receiver the magenta (existing behaviour) at the new coords; a launch event still renders a `LaunchArc` + `ImpactRings` (overlay wiring intact). Assertions unconditional.
- `npm run typecheck` clean; `npm run test:run` green.

## 5. Out of scope
- Engine/gameplay, other screens, animation timing (unchanged).
- Per-continent interactivity, zoom/pan, real-time projection maths (static equirectangular only).
- Multi-human island art beyond a shared cheap blob.

## 6. Constraints
- Product emojis kept. Unconditional test assertions. Every commit typechecks + suite green.
- Keep the Natural Earth licence/provenance comment in `worldPath.ts` intact.
- Deterministic, presentational — no RNG.
