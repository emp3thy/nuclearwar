# nuke — visual design direction & portrait system

**Date:** 2026-05-20
**Status:** SUPERSEDED by `2026-07-19-comic-retheme-slice1-design.md` — visual direction replaced by the comic-tabloid design handoff (`design_handoff_nuke_game/`); geometric SVG portraits replace the PNG pipeline and flag-fill human variant described here.

This spec captures three top-level look-and-feel decisions and the full portrait system that sits on top of them. It is the first concrete elaboration of the 2026-05-08 base design (`docs/superpowers/specs/2026-05-08-nuke-design.md`) and the four parchment-phone mockups in `docs/superpowers/mockups/`.

Tagline driving tone: **"everybody plays. Nobody wins."**

---

## 1. Direction decisions

### 1.1 Polish — mockups as floor, then elevate

The 2026-05-08 parchment-phone mockups are the *floor*, not the ceiling. We adopt their design language (warm parchment palette, dark wrapper, single-column phone shape) and go past them: a real spacing scale, a real type scale, shared design tokens, more depth and texture, tighter visual hierarchy.

This spec adds no *new* animation work — the existing animation plan (Framer Motion, missile arcs, impact rings, sequential beat timing) is already settled in the May 8 design spec and the Action/Reactions mockups (see §6). The portrait component this spec defines must be **animation-friendly** so that plan can attach to it without refactor (§3.7).

The token system itself (spacing, type, colour, shadow) is **out of scope** for this spec — it follows in a separate design-tokens spec. This spec only nails the portrait-system tokens (§3.1).

### 1.2 Desktop framing — responsive

Mobile-first single column is the source of truth. On wider viewports the layout opens up into a multi-column desktop arrangement (e.g. the Table beside the orders column on Planning, instead of stacked). No phone-bezel frame, no fixed-width floating panel — the parchment surface re-flows.

Per-screen multi-column breakpoints and exact arrangements are out of scope for this spec; the portrait-size scale (§3) accommodates both column widths via slot-size swaps at desktop breakpoint.

### 1.3 Leader identity — custom portrait art

Every leader appears as a custom illustrated head-and-shoulders portrait, replacing the current bare flag-emoji rendering across every screen. A flag badge sits on the portrait's corner so country reads at a glance even with a strong caricature (§3.3).

---

## 2. Cast covered

All six playable leaders plus the Disparage cameo receive the same portrait treatment. Same artist hand, same framing, same head size, same eye-line height — so the cast reads as one coherent set, never a collage.

| Slug | In-game name | Flag |
|---|---|---|
| `chump` | Chump | 🇺🇸 |
| `netanyahoo` | Netanyahoo | 🇮🇱 |
| `khameneverhere` | Khameneverhere | 🇮🇷 |
| `starmless` | Starmless | 🇬🇧 |
| `carnage` | Carnage | 🇨🇦 |
| `mileigh-hem` | Mileigh-hem | 🇦🇷 |
| `disparage` | Nigel Disparage (cameo) | 🇬🇧 |

The Chump caricature already produced in brainstorming is the **style reference** — every other portrait matches its line weight, palette, exaggeration intensity, and lighting.

Khameneverhere's running visual gag — never actually shown — is preserved by his portrait being a stylised empty-chair / silhouette frame rather than a face. He still occupies the slot; the slot just shows absence.

---

## 3. Portrait system

### 3.1 Size scale (tokens)

Five discrete sizes. Every slot in the UI picks one of these — no bespoke sizes.

| Token | Pixel size | Where it's used |
|---|---|---|
| `xs` | 32 px | History strip, inline meta, dense lists |
| `sm` | 56 px | RoundSummary story rows |
| `md` | 80 px | Reactions row, Action actor/receiver (mobile) |
| `lg` | 128 px | Planning Table card (desktop), Action portraits (desktop) |
| `xl` | 200 px | Setup picker tile, HotseatHandoff hero, Winners hero |

These elevate above the mockup defaults (mockup used 42 px on RoundSummary and 56 px on Reactions; we bump to 56 and 80 respectively). The master asset (§3.2) is sized so even `xl` is a 4× downsample, well within sharp-render range.

Implementation as CSS custom properties:

```css
--portrait-xs: 32px;
--portrait-sm: 56px;
--portrait-md: 80px;
--portrait-lg: 128px;
--portrait-xl: 200px;
```

### 3.2 Master asset spec

Every portrait is produced once at master resolution and downscaled at render time:

- **Dimensions:** 800 × 1000 px (4:5 portrait ratio)
- **Format:** PNG-24 with alpha channel
- **Background:** transparent
- **Composition rules** (rigorously uniform across the cast):
  - Head horizontally centred in the frame.
  - Entire face/head fits inside the **top 800 × 800 square**, so any slot can circle-crop to a square avatar without losing the face.
  - ~10% breathing room around the head on every side inside that square.
  - Shoulders crop naturally at the bottom of the frame.
  - Same head size, same eye-line height, same shoulder line across all seven assets.
- **Framing:** uniform head-and-shoulders. No signature poses or characteristic gestures — every leader is composed identically. Personality reads through facial expression and caricature exaggeration, not body language.

### 3.3 Flag badge overlay

Every portrait, at every size, carries a small circular flag badge at its **bottom-right corner**. Badge proportions (% of portrait diameter, not fixed pixels — they scale with the slot):

| Spec | Value |
|---|---|
| Badge diameter | 28% of portrait short edge |
| Border ring | 2 px white (parchment) ring around the badge |
| Position | Bottom-right, centre of badge sitting on the portrait's bottom-right edge (overhanging slightly) |
| Content | The leader's flag emoji, rendered at badge size |
| At `xs` (32 px) | Badge ≈ 9 px — small but still rendered so the rule is uniform. The `xs` slot is always paired with the leader name inline, so country also reads from text |

### 3.4 Art pipeline

AI-generated, single locked style. One image-generation model + one master prompt template, with the approved Chump portrait as the in-context style reference for every subsequent leader. Output is post-processed (alpha cleanup, exact 800 × 1000 crop, head-position normalisation) before commit.

Regeneration policy: portraits are not sacred — if a leader's prompt fails to hit the style or framing, regenerate. Treat the seven portraits as a single batched asset job that we may rerun end-to-end at a higher fidelity model later. The system is designed so that swap-in is a file replacement, nothing more.

The exact prompt template, model choice, and the post-processing pipeline are out of scope for this spec — they belong in the implementation plan.

### 3.5 Player slots (hotseat) — flag fill, no portrait

The engine distinguishes the six AI character ids (with fixed personality) from the five player slot ids (`player1`..`player5`, claimed by humans at Setup who pick their own name and country). Only the AI cast receives caricature portraits. Player slots render as a **flag-fill** variant:

- The slot is filled by the player's chosen country flag glyph, sized to fill the circle (≈ 70% of slot diameter).
- Same parchment background, same circle crop, same shadow as a portrait slot.
- The corner flag badge is **omitted** in the flag-fill variant — the slot already is the flag.
- All five size tokens (xs–xl) apply; the glyph scales proportionally.

This is a deliberate asymmetry: caricature carries personality, and players are whoever the user said they are. Forcing a generic silhouette or monogram would dilute the cast or pretend the player is part of it.

### 3.6 File layout

```
src/assets/portraits/
  chump.png
  netanyahoo.png
  khameneverhere.png
  starmless.png
  carnage.png
  mileigh-hem.png
  disparage.png
```

Imported via Vite's static-asset handling. A single `getPortrait(leaderId): string` helper in `src/ui/assets/portraits.ts` maps leader ids to asset URLs. Components consume that helper, never raw paths.

A single `<Portrait leaderId={id} size="md" />` component (`src/ui/components/Portrait.tsx`) is the only direct consumer — it renders the `<img>` (AI cast) or the flag-fill variant (player slots), the corner flag badge for AI portraits, and handles circle vs. square crop. Every screen calls `<Portrait>`, never raw `<img>`s. Internally it dispatches on `isHuman(leaderId)`: human → flag fill, otherwise → portrait + badge.

### 3.7 Animation-readiness

The Action and Reactions phases run a Framer Motion sequence (missile arcs, country pulses, impact rings, portrait pop-in, speech-bubble fades — see §6). The portrait system has to play well with that:

- `<Portrait>` accepts an optional `as={motion.div}` (or equivalent) prop, so callers can wrap it as a `motion` component when an animation needs to drive the slot. Default render is a plain `<div>` to avoid loading Framer Motion on screens that don't animate.
- The inner image and badge are addressable as separate animatable layers — Framer Motion variants can target the portrait's translate/scale and the badge's pop-in independently.
- No animation is implemented in this spec — only the structural seams that let the existing animation plan attach later without refactor.

---

## 4. Slot mapping (per screen)

The table below lists every visible portrait slot today and the chosen size token. Mobile-first sizes given; desktop overrides noted where they differ.

| Screen / component | Slot | Mobile token | Desktop token | Crop |
|---|---|---|---|---|
| `Setup.tsx` | Cast picker tile (one per leader) | `xl` | `xl` | Square (with rounded corners, not circle) |
| `Planning.tsx` (TargetRow) | Per-target row header | `sm` | `md` | Circle |
| `Planning.tsx` (Table cards) | Per-leader Table card | `md` | `lg` | Circle |
| `Action.tsx` | Actor portrait (world-map style) | `md` | `lg` | Circle |
| `Action.tsx` | Receiver portrait | `md` | `lg` | Circle |
| `EventCard.tsx` | Inline event-feed leader pip | `xs` | `xs` | Circle |
| `RoundSummary.tsx` | Story row portrait | `sm` | `sm` | Circle |
| `RoundSummary.tsx` (Reactions sub-block) | Reaction row portrait | `md` | `md` | Circle |
| `HotseatHandoff.tsx` | Curtain hero | `xl` | `xl` | Circle |
| `Winners.tsx` | Winner hero | `xl` | `xl` | Circle |
| `AiConferring.tsx` | Conferring leader (rotating) | `lg` | `lg` | Circle |
| `DisparageCard.tsx` / `DisparageColumn.tsx` | Cameo sidebar | `md` | `md` | Circle |

The cast-picker Setup tile is the only **square** crop; everywhere else, the slot is a circle that picks up the top 800 × 800 of the master. Player-slot occupants use the flag-fill variant (§3.5) at the same size token.

---

## 5. Out of scope

Captured here so they don't get rolled into the implementation plan for this spec:

- The full design-token system (spacing scale, type scale, colour palette, shadow tokens) — separate spec.
- Per-screen multi-column desktop arrangements — separate spec, after tokens.
- **Implementing** Action/Reactions animations (Framer Motion variants, missile arcs, impact rings, pacing) — those are a separately-planned phase, already specified in the May 8 design and mockups (see §6). This spec only ensures the portrait component is animation-ready; it does not write the animation code or variants.
- The image-generation prompt template, model, and post-processing pipeline — belongs in this spec's implementation plan, not the design spec itself.
- Replacing the AI-generated portraits with commissioned art — a future regeneration pass; no code or spec change required.

---

## 6. Animation context (already decided, reference only)

Recorded here so the portrait system isn't designed in ignorance of the animation plan it has to feed.

- **Library:** Framer Motion. Lives at `src/ui/animation/` (per `2026-05-08-nuke-design.md` §10).
- **Action phase:** `docs/superpowers/mockups/action-screen.html` specifies ~1.8 s per event: green firing pulse on the actor's country, SVG missile arc across the world-map background (rocket emoji mid-flight), red dashed glow ring + damage badge on the receiver, portraits and speech bubbles fade in, ~0.6 s dwell, fade. Fast Resolve toggle = 3× speed.
- **Reactions phase:** `docs/superpowers/mockups/reactions-screen.html` specifies ~1.3 s per beat, six beats ≈ 8 s total: portrait shifts in, quote types out, state-change badge slides in. `prefers-reduced-motion` shows all six at once after 4 s with no animation.
- **Audio:** paired with the animation work; same Phase-5 bucket.
- **Build phase:** scheduled as P5 in `2026-05-11-phase-3-ui-design.md` deferred-items list and `2026-05-12-phase-4a-satire-hotseat-design.md` deferred-items list.

The portrait component (§3.7) is the only seam this spec adds for that work.

---

## 7. Open questions

None. Every decision in this spec was made interactively in the 2026-05-19 and 2026-05-20 brainstorm sessions; the animation context in §6 was already settled in the May 8 design.

---

## 8. Implementation references

- `docs/superpowers/specs/2026-05-08-nuke-design.md` — base game design, animation library choice.
- `docs/superpowers/mockups/{planning,action,reactions,round-summary}-screen.html` — the parchment-phone visual floor + animation pacing.
- `docs/superpowers/flavour-bank.md` — leader cast and personality references that the portraits must read against.
