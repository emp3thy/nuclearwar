# Comic Re-theme Slice 1 (Foundation + Setup) Implementation Plan

> **Note (2026-07-20):** the `design_handoff_nuke_game/` prototype bundle referenced in this document was a temporary handoff artifact and has been deleted. The implemented code in `src/ui/` is the source of truth; paths below are historical.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Land the comic-tabloid design foundation (tokens, fonts, SVG portrait system, shared comic primitives) and re-theme the Setup screen to the design handoff.

**Architecture:** Global `tokens.css` carries the design language (custom properties + base classes); typed React components in `src/ui/components/comic/` and `src/ui/components/Portrait.tsx` port the handoff prototype (`design_handoff_nuke_game/`); `Setup.tsx` is rebuilt on top of them keeping all existing behavior (multi-human roster, seed, START_GAME dispatch).

**Tech Stack:** Vite 5, React 18, TypeScript 5, CSS modules, vitest + @testing-library/react, @fontsource self-hosted fonts.

**Spec:** `docs/superpowers/specs/2026-07-19-comic-retheme-slice1-design.md`

## Global Constraints

- Design source of truth: `design_handoff_nuke_game/` (in-repo). Lift exact values; never import its files at runtime, never use its mock `data.jsx` as state.
- Difficulty labels verbatim: easy = "Fine, Probably", normal = "Not Great", hard = "We're Cooked".
- Header copy verbatim: kicker "A PARODY IN POOR TASTE", title "NUKE!" (magenta "!"), tagline `"Everybody plays. Nobody wins."` (Nobody bold), ribbon "SELECT YOUR ENEMIES", begin button "Begin the End ↯".
- Human portrait accents fixed per slot: player1 `--cyan`, player2 `--green`, player3 `--yellow-soft`, player4 `--magenta-deep`, player5 `--ink-soft`.
- Stat values on cast tiles come from `LEADER_PROFILES` (engine truth), NOT the handoff's sample numbers.
- The handoff DEV NAV is not ported.

## Guardrails (from better-memory, surfaced per planning reflection be7ad6bf, conf 0.9)

- **[[aa0375da]] Product emojis are design language, not whimsy** (conf 0.7): the global "no emojis" user preference applies to assistant text only. The ↯ ⚙ 🦆 flag emojis in this plan's UI code are spec'd — do NOT strip them.
- **[[326f4462]] Every commit must independently typecheck** (conf 0.55, 2 evid): `noUnusedLocals` fails on imports added "for a later task". Add each import only in the commit that uses it.
- **[[063500c1]] No guarded assertions** (conf 0.7, 3 evid, vitest): never `if (cond) expect(...)`; assert preconditions unconditionally.
- **[[9f01589a]] Subagents may stop before the final commit** (conf 0.6): controller verifies `git status` after each task; if work is on disk uncommitted, verify tests/typecheck and commit directly.
- **[[0c83e25d]] Locators match DOM textContent, not CSS-rendered text** (conf 0.8): `text-transform: uppercase` in CSS keeps testing-library queries on the source string working — keep semantic case in JSX, uppercase in CSS.

Dismissed as not applicable here: AI-planner/resource-projection reflections (31c145bf, 125145ea, 0409087f, ef7d086e — no engine changes in this slice), python tempfile (85e7ec84), freeze logging (228dfa6d), clone-and-mutate orchestrator (977f97cc), consume-split (f091be56), scaffold-defaults (a6230fe0 — project already has sources/tests), website/README sync (98056ebc — no better-memory code touched; repo has no website).

## File Structure

```
src/ui/tokens.css                          (new — global tokens + base classes)
src/ui/main.tsx                            (modify — import fonts + tokens)
src/ui/portraits/faces.tsx                 (new — 8 face SVG components)
src/ui/portraits/index.ts                  (new — FACES, PORTRAIT_META, HUMAN_ACCENTS, extractFlag)
src/ui/components/Portrait.tsx             (new)
src/ui/components/comic/*.tsx              (new — 14 primitives + index.ts barrel)
src/ui/screens/Setup.tsx                   (rewrite)
src/ui/screens/Setup.module.css            (rewrite)
src/ui/content/cast.ts                     (new — profile/mood copy per AI leader)
tests/ui/Portrait.test.tsx                 (new)
tests/ui/HoldButton.test.tsx               (new)
tests/ui/Setup.multihuman.test.tsx         (modify — begin-button assertions)
package.json                               (modify — @fontsource deps)
```

---

### Task 1: Design tokens + fonts

**Files:**
- Create: `src/ui/tokens.css`
- Modify: `src/ui/main.tsx`
- Modify: `package.json` (via npm install)

**Interfaces:**
- Produces: global classes `.paper .panel .panel-title .display .tabloid .pop .hand .bang .mono .upper .italic .stamp .tag .btn .bubble .burst .halftone-* .row .col .grow .center .between .gap-* .wrap .tc .fadein .popin .wobble .screen .app .app-stage` and all `--*` custom properties — every later task relies on these exact names.

- [ ] **Step 1: Install fonts**

Run:
```bash
npm install -D @fontsource/anton @fontsource/playfair-display @fontsource/work-sans @fontsource/jetbrains-mono @fontsource/bowlby-one @fontsource/patrick-hand @fontsource/bangers
```
Expected: 7 packages added to devDependencies.

- [ ] **Step 2: Create `src/ui/tokens.css`**

Copy `design_handoff_nuke_game/tokens.css` verbatim with exactly two changes:
1. Delete the dev-nav block — everything from the comment `/* Bottom debug nav (toggleable via tweaks) */` through the `.devnav button:hover { ... }` rule (source lines 314–340).
2. Keep everything else byte-identical (palette, type utilities, `.panel`, `.stamp`, `.tag`, `.btn`, `.bubble`, `.burst`, scrollbar, `.app`/`.screen`, utility classes, keyframes).

- [ ] **Step 3: Wire imports in `src/ui/main.tsx`**

```tsx
import '@fontsource/anton';
import '@fontsource/playfair-display/400.css';
import '@fontsource/playfair-display/700.css';
import '@fontsource/playfair-display/900.css';
import '@fontsource/playfair-display/400-italic.css';
import '@fontsource/playfair-display/700-italic.css';
import '@fontsource/work-sans/400.css';
import '@fontsource/work-sans/500.css';
import '@fontsource/work-sans/600.css';
import '@fontsource/work-sans/700.css';
import '@fontsource/work-sans/800.css';
import '@fontsource/jetbrains-mono/400.css';
import '@fontsource/jetbrains-mono/700.css';
import '@fontsource/bowlby-one';
import '@fontsource/patrick-hand';
import '@fontsource/bangers';
import './tokens.css';
import { createRoot } from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Root element #root not found in index.html');
createRoot(rootElement).render(<App />);
```

- [ ] **Step 4: Verify**

Run: `npm run typecheck` — Expected: clean.
Run: `npm run test:run` — Expected: all existing tests pass (tokens are additive; no screen imports them by class yet).
Run: `npm run build` — Expected: builds; font files emitted to dist assets.

- [ ] **Step 5: Commit**

```bash
git add src/ui/tokens.css src/ui/main.tsx package.json package-lock.json
git commit -m "feat(ui): comic-tabloid design tokens + self-hosted fonts"
```

---

### Task 2: Portrait system

**Files:**
- Create: `src/ui/portraits/faces.tsx`
- Create: `src/ui/portraits/index.ts`
- Create: `src/ui/components/Portrait.tsx`
- Test: `tests/ui/Portrait.test.tsx`

**Interfaces:**
- Consumes: `isHuman(id: LeaderId): boolean` from `src/engine/state.ts`; `LeaderId` from `src/engine/types.ts`; CSS vars from Task 1.
- Produces:
  - `<Portrait leaderId={LeaderId} size?={number} shape?={'circle'|'square'} showBadge?={boolean} flag?={string} className?={string} />` (default size 80, shape circle, showBadge true)
  - `extractFlag(country: string): string`
  - `PORTRAIT_META: Record<string, { color: string; flag: string }>` (AI cast + disparage)
  - `HUMAN_ACCENTS: Record<'player1'|'player2'|'player3'|'player4'|'player5', string>`

- [ ] **Step 1: Write the failing test** — `tests/ui/Portrait.test.tsx`

```tsx
import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import Portrait from '../../src/ui/components/Portrait';
import { extractFlag } from '../../src/ui/portraits';

describe('<Portrait>', () => {
  it('renders an AI leader face SVG with its flag badge', () => {
    const { container, getByText } = render(<Portrait leaderId="chump" size={64} />);
    expect(container.querySelector('svg')).not.toBeNull();
    expect(getByText('🇺🇸')).toBeInTheDocument();
  });

  it('renders the Groucho disguise for human slots with the supplied flag', () => {
    const { container, getByText } = render(
      <Portrait leaderId="player2" size={64} flag="🦆" />,
    );
    // Groucho face is identifiable by its data marker
    expect(container.querySelector('[data-face="groucho"]')).not.toBeNull();
    expect(getByText('🦆')).toBeInTheDocument();
  });

  it('hides the badge when showBadge is false', () => {
    const { queryByText } = render(
      <Portrait leaderId="chump" size={64} showBadge={false} />,
    );
    expect(queryByText('🇺🇸')).toBeNull();
  });
});

describe('extractFlag', () => {
  it('extracts a regional-indicator flag', () => {
    expect(extractFlag('🇺🇸 US')).toBe('🇺🇸');
  });
  it('extracts a pictographic emoji', () => {
    expect(extractFlag('🦆 Freedonia')).toBe('🦆');
  });
  it('falls back to the globe for plain text', () => {
    expect(extractFlag('Freedonia')).toBe('🌐');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/ui/Portrait.test.tsx`
Expected: FAIL — cannot resolve `../../src/ui/components/Portrait`.

- [ ] **Step 3: Create `src/ui/portraits/faces.tsx`**

Port the eight face functions from `design_handoff_nuke_game/portraits.jsx` (lines 9–249) verbatim as named exports typed `(): JSX.Element` — `ChumpFace`, `NetanyahooFace`, `KhameneverhereFace`, `StarmlessFace`, `CarnageFace`, `MileighFace`, `DisparageFace`, `GrouchoFace` (rename of `PlayerFace`). The JSX is already camelCase-attribute React code; copy bodies unchanged, with one addition: `GrouchoFace`'s root `<svg>` gets `data-face="groucho"` (test hook + future art-swap marker).

- [ ] **Step 4: Create `src/ui/portraits/index.ts`**

```ts
import type { LeaderId } from '../../engine/types';
import {
  CarnageFace, ChumpFace, DisparageFace, GrouchoFace,
  KhameneverhereFace, MileighFace, NetanyahooFace, StarmlessFace,
} from './faces';

/** Face component per AI leader; every human slot maps to the Groucho disguise. */
export const FACES: Record<string, () => JSX.Element> = {
  chump: ChumpFace,
  netanyahoo: NetanyahooFace,
  khameneverhere: KhameneverhereFace,
  starmless: StarmlessFace,
  carnage: CarnageFace,
  'mileigh-hem': MileighFace,
  disparage: DisparageFace,
  player1: GrouchoFace,
  player2: GrouchoFace,
  player3: GrouchoFace,
  player4: GrouchoFace,
  player5: GrouchoFace,
};

/** Signature disc color + badge flag for the fixed cast. */
export const PORTRAIT_META: Record<string, { color: string; flag: string }> = {
  chump: { color: 'var(--c-chump)', flag: '🇺🇸' },
  netanyahoo: { color: 'var(--c-netan)', flag: '🇮🇱' },
  khameneverhere: { color: 'var(--c-khamen)', flag: '🇮🇷' },
  starmless: { color: 'var(--c-starm)', flag: '🇬🇧' },
  carnage: { color: 'var(--c-carnage)', flag: '🇨🇦' },
  'mileigh-hem': { color: 'var(--c-mileigh)', flag: '🇦🇷' },
  disparage: { color: 'var(--c-disparage)', flag: '🇬🇧' },
};

/** Fixed per-slot accent for human (Groucho) portraits — spec §3. */
export const HUMAN_ACCENTS: Record<string, string> = {
  player1: 'var(--cyan)',
  player2: 'var(--green)',
  player3: 'var(--yellow-soft)',
  player4: 'var(--magenta-deep)',
  player5: 'var(--ink-soft)',
};

/** Leading flag/emoji of a country string ("🇺🇸 US" → "🇺🇸"), 🌐 fallback. */
export function extractFlag(country: string): string {
  const m = country.trim().match(/^(\p{RI}\p{RI}|\p{Extended_Pictographic})/u);
  return m ? m[0] : '🌐';
}

export type { LeaderId };
```

- [ ] **Step 5: Create `src/ui/components/Portrait.tsx`**

```tsx
import { isHuman } from '../../engine/state';
import type { LeaderId } from '../../engine/types';
import { FACES, HUMAN_ACCENTS, PORTRAIT_META } from '../portraits';

export interface PortraitProps {
  leaderId: LeaderId;
  /** Pixel diameter (circle) or edge (square). */
  size?: number;
  shape?: 'circle' | 'square';
  showBadge?: boolean;
  /** Badge flag override — humans pass their chosen country's flag. */
  flag?: string;
  className?: string;
}

export default function Portrait({
  leaderId, size = 80, shape = 'circle', showBadge = true, flag, className,
}: PortraitProps) {
  const human = isHuman(leaderId);
  const Face = FACES[leaderId];
  if (!Face) return null;
  const color = human ? HUMAN_ACCENTS[leaderId] : PORTRAIT_META[leaderId].color;
  const badgeFlag = flag ?? (human ? '🌐' : PORTRAIT_META[leaderId].flag);
  const badgeSize = Math.max(16, Math.round(size * 0.28));

  return (
    <span className={className} style={{ display: 'inline-block', position: 'relative' }}>
      <span
        style={{
          width: size, height: size,
          borderRadius: shape === 'square' ? 0 : '50%',
          background: color,
          border: '3px solid var(--ink)',
          boxShadow: '3px 3px 0 var(--ink)',
          position: 'relative', overflow: 'hidden', display: 'inline-block',
        }}
      >
        <span
          aria-hidden
          style={{
            position: 'absolute', inset: 0,
            backgroundImage: 'radial-gradient(rgba(0,0,0,0.18) 1px, transparent 1.4px)',
            backgroundSize: '6px 6px', mixBlendMode: 'multiply', pointerEvents: 'none',
          }}
        />
        <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <Face />
        </span>
        {shape !== 'square' && (
          <span
            aria-hidden
            style={{
              position: 'absolute', inset: 4, border: '2px dashed rgba(20,18,20,0.35)',
              borderRadius: '50%', pointerEvents: 'none',
            }}
          />
        )}
      </span>
      {showBadge && (
        <span
          style={{
            position: 'absolute', right: -2, bottom: -2,
            width: badgeSize, height: badgeSize, borderRadius: '50%',
            background: 'var(--paper)', border: '2.5px solid var(--ink)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: Math.round(badgeSize * 0.62), lineHeight: 1,
            boxShadow: '1.5px 1.5px 0 var(--ink)',
          }}
        >
          {badgeFlag}
        </span>
      )}
    </span>
  );
}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npx vitest run tests/ui/Portrait.test.tsx`
Expected: PASS (6 tests).

- [ ] **Step 7: Typecheck + full test run + commit**

Run: `npm run typecheck` then `npm run test:run` — Expected: clean / all pass.

```bash
git add src/ui/portraits src/ui/components/Portrait.tsx tests/ui/Portrait.test.tsx
git commit -m "feat(ui): geometric SVG portrait system with Groucho human variant"
```

---

### Task 3: Comic primitives

**Files:**
- Create: `src/ui/components/comic/Halftone.tsx`, `Panel.tsx`, `Tag.tsx`, `Stamp.tsx`, `Bubble.tsx`, `Burst.tsx`, `Btn.tsx`, `Stat.tsx`, `ApMeter.tsx`, `PhaseTrack.tsx`, `DamageBadge.tsx`, `RelBadge.tsx`, `HoldButton.tsx`, `Ribbon.tsx`, `index.ts`
- Test: `tests/ui/HoldButton.test.tsx`

**Interfaces:**
- Consumes: global classes/vars from Task 1.
- Produces (barrel `src/ui/components/comic/index.ts` re-exports all):
  - `Halftone({ color?, size?, opacity?, style? })`
  - `Panel({ title?, tilt?: -2|-1|0|1|2, dark?, halftone?, halftoneColor?, padding?, className?, style?, children })`
  - `Tag({ children, color?: 'ink'|'cyan'|'magenta'|'yellow'|'green'|'outline', style? })`
  - `Stamp({ children, color?: 'magenta'|'ink'|'cyan'|'yellow'|'green', rotate?, style? })`
  - `Bubble({ children, tail?: 'bl'|'tl', thought?, style? })`
  - `Burst({ children, color?, rotate?, size?, style? })`
  - `Btn({ children, variant?: 'default'|'primary'|'danger'|'cyan'|'ghost', size?: 'md'|'lg'|'xl', onClick?, disabled?, type?, style? })`
  - `Stat({ label, value, sub?, accent?, style? })`
  - `ApMeter({ used: number, max: number })`
  - `PhaseTrack({ phases: string[], current: string, done: string[] })`
  - `DamageBadge({ value: number|string, label?, rotate?, style? })`
  - `RelBadge({ kind: 'hit-you'|'wooing'|'you-woo'|'grudge'|'mood'|'gain'|'neutral'|'harm'|'cyan'|'yellow', children })`
  - `HoldButton({ onComplete: () => void, duration?: number, children, disabled?, style? })`
  - `Ribbon({ children, color?, rotate?, style? })`

Port each from `design_handoff_nuke_game/ui.jsx` (`RoundBadge` is NOT ported — slice 2). Mechanical translation rules: add a typed props interface per component; replace `React.useState/useRef` with named imports; keep inline styles and class names byte-equivalent; `Btn` renders the same class list (`btn` + variant + size). No behavioral changes except `HoldButton` below.

- [ ] **Step 1: Write the failing test** — `tests/ui/HoldButton.test.tsx`

```tsx
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, waitFor } from '@testing-library/react';
import { HoldButton } from '../../src/ui/components/comic';

describe('<HoldButton>', () => {
  it('fires onComplete after the hold duration', async () => {
    const onComplete = vi.fn();
    const { getByRole } = render(
      <HoldButton onComplete={onComplete} duration={50}>SEAL</HoldButton>,
    );
    fireEvent.mouseDown(getByRole('button'));
    await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1), { timeout: 2000 });
  });

  it('does not fire when released early', async () => {
    const onComplete = vi.fn();
    const { getByRole } = render(
      <HoldButton onComplete={onComplete} duration={200}>SEAL</HoldButton>,
    );
    const btn = getByRole('button');
    fireEvent.mouseDown(btn);
    fireEvent.mouseUp(btn);
    await new Promise((r) => setTimeout(r, 300));
    expect(onComplete).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/ui/HoldButton.test.tsx`
Expected: FAIL — cannot resolve `../../src/ui/components/comic`.

- [ ] **Step 3: Create the 14 components + barrel**

`HoldButton.tsx` (the only one with logic changes — rAF cleanup on unmount):

```tsx
import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';

export interface HoldButtonProps {
  onComplete: () => void;
  duration?: number;
  children: ReactNode;
  disabled?: boolean;
  style?: CSSProperties;
}

export default function HoldButton({
  onComplete, duration = 600, children, disabled, style,
}: HoldButtonProps) {
  const [progress, setProgress] = useState(0);
  const frameRef = useRef<number | null>(null);
  const startRef = useRef(0);

  const cancelHold = () => {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
    setProgress(0);
  };

  const startHold = () => {
    if (disabled) return;
    startRef.current = Date.now();
    const tick = () => {
      const p = Math.min(1, (Date.now() - startRef.current) / duration);
      setProgress(p);
      if (p >= 1) {
        cancelHold();
        onComplete();
      } else {
        frameRef.current = requestAnimationFrame(tick);
      }
    };
    frameRef.current = requestAnimationFrame(tick);
  };

  useEffect(() => cancelHold, []);

  return (
    <button
      type="button"
      className="btn primary lg"
      disabled={disabled}
      onMouseDown={startHold}
      onMouseUp={cancelHold}
      onMouseLeave={cancelHold}
      onTouchStart={startHold}
      onTouchEnd={cancelHold}
      style={{ position: 'relative', overflow: 'hidden', ...style }}
    >
      <span style={{ position: 'relative', zIndex: 2 }}>
        {progress > 0 ? `HOLD… ${Math.round(progress * 100)}%` : children}
      </span>
      <span
        aria-hidden
        style={{
          position: 'absolute', inset: 0, background: 'var(--ink)',
          width: `${progress * 100}%`,
          transition: progress === 0 ? 'width 200ms ease' : 'none', zIndex: 1,
        }}
      />
    </button>
  );
}
```

The other 13: translate from `design_handoff_nuke_game/ui.jsx` per the mechanical rules above (typed props interface, named React imports, byte-equivalent styles/classes). Source line ranges: Halftone 7–22, Panel 25–39, Tag 42–44, Stamp 47–53, Bubble 56–65, Burst 68–83, Btn 86–99, Stat 102–110, ApMeter 113–153, PhaseTrack 175–206, DamageBadge 209–231, RelBadge 234–263, Ribbon 318–338.

`index.ts` barrel:

```ts
export { default as Halftone } from './Halftone';
export { default as Panel } from './Panel';
export { default as Tag } from './Tag';
export { default as Stamp } from './Stamp';
export { default as Bubble } from './Bubble';
export { default as Burst } from './Burst';
export { default as Btn } from './Btn';
export { default as Stat } from './Stat';
export { default as ApMeter } from './ApMeter';
export { default as PhaseTrack } from './PhaseTrack';
export { default as DamageBadge } from './DamageBadge';
export { default as RelBadge } from './RelBadge';
export { default as HoldButton } from './HoldButton';
export { default as Ribbon } from './Ribbon';
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/ui/HoldButton.test.tsx`
Expected: PASS (2 tests). Note: jsdom 24 implements requestAnimationFrame on real timers; no mocking needed.

- [ ] **Step 5: Typecheck + full test run + commit**

Run: `npm run typecheck` then `npm run test:run` — Expected: clean / all pass.

```bash
git add src/ui/components/comic tests/ui/HoldButton.test.tsx
git commit -m "feat(ui): shared comic primitives ported from design handoff"
```

---

### Task 4: Setup screen re-theme

**Files:**
- Create: `src/ui/content/cast.ts`
- Rewrite: `src/ui/screens/Setup.tsx`, `src/ui/screens/Setup.module.css`
- Modify: `tests/ui/Setup.multihuman.test.tsx`

**Interfaces:**
- Consumes: `Panel, Tag, Stamp, Btn, Ribbon` from `../components/comic`; `Portrait` from `../components/Portrait`; `extractFlag` from `../portraits`; `LEADER_PROFILES` from `../../engine/balance`; existing `ScreenProps`/dispatch contract (unchanged).
- Produces: `CAST_COPY: Record<string, { profile: string; mood: string }>` in `src/ui/content/cast.ts`.

Behavior kept from the current `Setup.tsx` verbatim: `humans` state array + `addHuman`/`removeHuman`/`updateHuman` (P1 fixed, re-key on remove), `canStart` (≥2 AI picked AND ≤4 AND all human rows complete), `generateSeed`, the `START_GAME` dispatch payload, aria-labels `Name for P{n}` / `Country for P{n}` / `Remove P{n}` / add-button text "+ Add another human". Behavior adopted from the handoff: cast-pick toggle drops the OLDEST pick when a 5th is clicked (replaces the current no-op at 4).

- [ ] **Step 1: Update the test first** — in `tests/ui/Setup.multihuman.test.tsx` replace the last test:

```tsx
  it('Begin button gates on 2+ opponents and shows the live count', () => {
    const dispatch = vi.fn();
    render(<Setup state={initialUiState} dispatch={dispatch} />);
    const begin = screen.getByRole('button', { name: /begin the end/i });
    expect(begin).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: /chump/i }));
    fireEvent.click(screen.getByRole('button', { name: /carnage/i }));
    expect(begin).toBeEnabled();
    expect(screen.getByText(/2/)).toBeInTheDocument();
    fireEvent.click(begin);
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'START_GAME' }),
    );
  });
```

Add one new test for the oldest-drop rule:

```tsx
  it('picking a 5th opponent drops the oldest pick', () => {
    render(<Setup state={initialUiState} dispatch={vi.fn()} />);
    for (const name of [/chump/i, /carnage/i, /starmless/i, /netanyahoo/i]) {
      fireEvent.click(screen.getByRole('button', { name }));
    }
    fireEvent.click(screen.getByRole('button', { name: /khameneverhere/i }));
    // chump (oldest) dropped; the four later picks remain
    expect(screen.getByRole('button', { name: /chump/i })).toHaveAttribute('aria-pressed', 'false');
    for (const name of [/carnage/i, /starmless/i, /netanyahoo/i, /khameneverhere/i]) {
      expect(screen.getByRole('button', { name })).toHaveAttribute('aria-pressed', 'true');
    }
  });
```

- [ ] **Step 2: Run tests to verify state**

Run: `npx vitest run tests/ui/Setup.multihuman.test.tsx`
Expected: the two new/changed tests FAIL (old markup); the three roster tests still PASS.

- [ ] **Step 3: Create `src/ui/content/cast.ts`** (copy lifted from handoff `data.jsx` LEADERS)

```ts
/** Per-leader satirical copy for the Setup cast tiles (from the design handoff). */
export const CAST_COPY: Record<string, { profile: string; mood: string }> = {
  chump: { profile: 'Coward', mood: "Many people are saying we should hit somebody. We won't, but we should." },
  khameneverhere: { profile: 'Grudge', mood: 'Orders filed. Orders unsigned.' },
  starmless: { profile: 'Cautious', mood: 'So, let me be very clear…' },
  carnage: { profile: 'Rational', mood: 'Nostalgia is not a strategy.' },
  'mileigh-hem': { profile: 'Glass cannon', mood: 'Banking. Cooking. ¡Viva la libertad, carajo!' },
  netanyahoo: { profile: 'Warmonger', mood: 'Drawing a fresh red line on the bomb diagram.' },
};
```

- [ ] **Step 4: Rewrite `Setup.tsx`**

Keep the entire state/handler block of the current file (lines 1–74) except `toggleAi` becomes:

```tsx
  function toggleAi(id: LeaderId) {
    setSelectedAi((current) => {
      if (current.includes(id)) return current.filter((x) => x !== id);
      if (current.length >= 4) return [...current.slice(1), id];
      return [...current, id];
    });
  }
```

Render (full replacement of the return block):

```tsx
  return (
    <div className={`screen paper ${styles.setup}`}>
      <div className={styles.wrap}>
        <header className={styles.header}>
          <div>
            <div className={`display ${styles.kicker}`}>A Parody In Poor Taste</div>
            <h1 className={`display ${styles.title}`}>
              NUKE<span className={styles.bang}>!</span>
            </h1>
            <div className={`tabloid italic ${styles.tagline}`}>
              "Everybody plays. <strong>Nobody</strong> wins."
            </div>
          </div>
          <Ribbon color="yellow" rotate={2}>Select Your Enemies</Ribbon>
        </header>

        <div className={styles.grid}>
          <Panel title="The Table" halftone halftoneColor="rgba(212,38,68,0.08)">
            <div className={styles.castGrid}>
              {AI_IDS.map((id, i) => {
                const profile = LEADER_PROFILES[id];
                const copy = CAST_COPY[id];
                const picked = selectedAi.includes(id);
                const tilts = [-1.4, 0.8, -0.5, 1.2, -0.9, 0.4];
                return (
                  <button
                    key={id}
                    type="button"
                    aria-pressed={picked}
                    className={`${styles.castTile} ${picked ? styles.picked : ''}`}
                    style={{ transform: `rotate(${tilts[i % tilts.length]}deg)` }}
                    onClick={() => toggleAi(id)}
                  >
                    {picked && (
                      <Stamp color="magenta" rotate={-12} style={{ position: 'absolute', top: 6, right: 6, fontSize: 10, padding: '3px 7px', zIndex: 2 }}>
                        Picked
                      </Stamp>
                    )}
                    <div className={styles.tileRow}>
                      <Portrait leaderId={id} size={64} />
                      <div className={styles.tileBody}>
                        <div className={`display ${styles.tileName}`}>{profile.name}</div>
                        <div className={`mono ${styles.tileMeta}`}>
                          {profile.country} · {copy.profile}
                        </div>
                        <div className={`hand ${styles.tileMood}`}>"{copy.mood}"</div>
                        <div className={styles.tileTags}>
                          <Tag color="ink">POP {profile.startPop}M</Tag>
                          <Tag color="outline">⚙{profile.startFactories}</Tag>
                          <Tag color="outline">AP {profile.startAp}</Tag>
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
            <div className={styles.castHint}>Pick 2–4 opponents. You're already at the table.</div>
          </Panel>

          <div className="col gap-4">
            <Panel title="The Humans" tilt={1}>
              {humans.map((h, idx) => (
                <div key={h.id} className={styles.humanCard}>
                  <Portrait leaderId={h.id} size={56} flag={extractFlag(h.country)} />
                  <div className={styles.humanFields}>
                    <input
                      type="text"
                      aria-label={`Name for P${idx + 1}`}
                      className={`display ${styles.nameInput}`}
                      value={h.name}
                      onChange={(e) => updateHuman(idx, 'name', e.target.value)}
                      placeholder="Name"
                    />
                    <input
                      type="text"
                      aria-label={`Country for P${idx + 1}`}
                      className={styles.countryInput}
                      value={h.country}
                      onChange={(e) => updateHuman(idx, 'country', e.target.value)}
                      placeholder="🌐 Country"
                    />
                  </div>
                  {idx > 0 && (
                    <button
                      type="button"
                      aria-label={`Remove P${idx + 1}`}
                      className={styles.removeBtn}
                      onClick={() => removeHuman(idx)}
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                className={`btn ${styles.addBtn}`}
                onClick={addHuman}
                disabled={humans.length >= 5}
              >
                + Add another human {humans.length >= 5 && '(max 5)'}
              </button>
              <div className={styles.humanHint}>
                Default: Rufus T. Firefly of Freedonia (<em>Duck Soup</em>, 1933). Change if
                you'd prefer to die under a different name.
              </div>
            </Panel>

            <Panel title="Difficulty" tilt={-1}>
              <div className={styles.diffList}>
                {(
                  [
                    { id: 'easy', label: 'Fine, Probably', sub: "30% random AI · what's the worst that could happen" },
                    { id: 'normal', label: 'Not Great', sub: '10% random · things are getting spicy' },
                    { id: 'hard', label: "We're Cooked", sub: '0% random + lookahead · kiss the kids' },
                  ] as const
                ).map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    aria-pressed={difficulty === d.id}
                    className={`${styles.diffOption} ${difficulty === d.id ? styles.diffSelected : ''}`}
                    onClick={() => setDifficulty(d.id)}
                  >
                    <span className={styles.diffCheck} />
                    <span className={styles.diffText}>
                      <span className={`display ${styles.diffLabel}`}>{d.label}</span>
                      <span className={styles.diffSub}>{d.sub}</span>
                    </span>
                  </button>
                ))}
              </div>
              <label className={styles.seedBlock}>
                <span className={`display ${styles.seedLabel}`}>Optional Seed</span>
                <input
                  type="text"
                  className={`mono ${styles.seedInput}`}
                  value={seedInput}
                  placeholder="leave blank for chaos"
                  onChange={(e) => setSeedInput(e.target.value)}
                />
              </label>
            </Panel>

            <Panel>
              <div className={styles.beginRow}>
                <div>
                  <div className={`display ${styles.countLabel}`}>Opponents Picked</div>
                  <div className={`display ${styles.countValue} ${selectedAi.length < 2 ? styles.countLow : ''}`}>
                    {selectedAi.length}
                    <span className={styles.countMax}>/4</span>
                  </div>
                </div>
                <Btn variant="primary" size="lg" disabled={!canStart} onClick={start}>
                  Begin the End ↯
                </Btn>
              </div>
            </Panel>
          </div>
        </div>
      </div>
    </div>
  );
```

Imports to add at top: `Panel, Tag, Stamp, Btn, Ribbon` from `../components/comic`; `Portrait` from `../components/Portrait`; `extractFlag` from `../portraits`; `CAST_COPY` from `../content/cast`.

- [ ] **Step 5: Rewrite `Setup.module.css`**

Full replacement (uppercase via CSS per guardrail 0c83e25d — JSX keeps semantic case):

```css
.setup { padding: 32px 20px 96px; min-height: 100vh; }
.wrap { max-width: 1180px; margin: 0 auto; }

.header { display: flex; justify-content: space-between; align-items: flex-end; flex-wrap: wrap; gap: 16px; margin-bottom: 24px; }
.kicker { font-size: 12px; letter-spacing: 0.3em; color: var(--magenta); text-transform: uppercase; }
.title { font-size: clamp(64px, 10vw, 140px); margin: 4px 0 0; letter-spacing: -0.02em; color: var(--ink); }
.bang { color: var(--magenta); }
.tagline { font-size: 18px; margin-top: 4px; }

.grid { display: grid; grid-template-columns: 1fr; gap: 24px; }
@media (min-width: 920px) { .grid { grid-template-columns: minmax(0, 1.6fr) minmax(0, 1fr); } }

.castGrid { display: grid; grid-template-columns: 1fr; gap: 14px; }
@media (min-width: 640px) { .castGrid { grid-template-columns: 1fr 1fr; } }

.castTile {
  position: relative; text-align: left; padding: 14px;
  border: 3px solid rgba(20, 18, 20, 0.5); background: var(--paper-warm);
  cursor: pointer; box-shadow: 4px 4px 0 var(--ink);
  font-family: inherit; transition: transform 100ms ease;
}
.castTile:hover { transform: rotate(0deg) translateY(-2px) !important; }
.picked { background: var(--paper-bright); border-color: var(--ink); }
.tileRow { display: flex; gap: 10px; align-items: flex-start; }
.tileBody { flex: 1; min-width: 0; }
.tileName { font-size: 18px; line-height: 1; margin-top: 2px; }
.picked .tileName { padding-right: 70px; }
.tileMeta { font-size: 9px; opacity: 0.65; letter-spacing: 0.1em; margin-top: 2px; text-transform: uppercase; }
.tileMood { font-size: 13px; margin-top: 4px; line-height: 1.2; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
.tileTags { display: flex; gap: 3px; margin-top: 6px; flex-wrap: wrap; }
.castHint { margin-top: 14px; font-size: 12px; font-style: italic; color: var(--ink-soft); }

.humanCard { display: flex; gap: 12px; align-items: center; padding: 8px 0; border-bottom: 2px dashed var(--paper-edge); position: relative; }
.humanFields { flex: 1; min-width: 0; }
.nameInput { width: 100%; border: 0; border-bottom: 3px solid var(--ink); background: transparent; font-size: 20px; padding: 2px 0; }
.countryInput { margin-top: 6px; border: 2px solid var(--ink); background: var(--paper); padding: 2px 8px; font-family: var(--font-display); font-size: 13px; letter-spacing: 0.1em; width: 160px; }
.removeBtn { background: var(--ink); color: var(--paper); border: 2px solid var(--ink); width: 24px; height: 24px; cursor: pointer; font-size: 14px; line-height: 1; }
.addBtn { margin-top: 10px; font-size: 12px; }
.humanHint { font-size: 12px; font-style: italic; margin-top: 12px; color: var(--ink-soft); }

.diffList { display: grid; gap: 6px; }
.diffOption { display: flex; align-items: center; gap: 12px; padding: 10px 12px; cursor: pointer; text-align: left; background: transparent; color: var(--ink); border: 2.5px solid var(--ink); font-family: inherit; }
.diffSelected { background: var(--ink); color: var(--paper); }
.diffCheck { width: 14px; height: 14px; border: 2.5px solid currentColor; flex: 0 0 auto; }
.diffSelected .diffCheck { background: var(--magenta); }
.diffText { flex: 1; display: flex; flex-direction: column; }
.diffLabel { font-size: 16px; letter-spacing: 0.06em; }
.diffSub { font-size: 11px; opacity: 0.7; }
.seedBlock { display: block; margin-top: 12px; }
.seedLabel { font-size: 10px; letter-spacing: 0.18em; display: block; margin-bottom: 4px; text-transform: uppercase; }
.seedInput { width: 100%; padding: 6px 8px; border: 2px solid var(--ink); background: var(--paper); font-size: 13px; }

.beginRow { display: flex; justify-content: space-between; align-items: center; gap: 16px; flex-wrap: wrap; }
.countLabel { font-size: 11px; letter-spacing: 0.18em; text-transform: uppercase; }
.countValue { font-size: 36px; color: var(--ink); }
.countLow { color: var(--magenta); }
.countMax { opacity: 0.4; font-size: 24px; }
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npx vitest run tests/ui/Setup.multihuman.test.tsx`
Expected: PASS (6 tests: 3 roster + begin-gate + oldest-drop + original add/remove).

- [ ] **Step 7: Typecheck + full test run + commit**

Run: `npm run typecheck` then `npm run test:run` — Expected: clean / all pass.

```bash
git add src/ui/screens/Setup.tsx src/ui/screens/Setup.module.css src/ui/content/cast.ts tests/ui/Setup.multihuman.test.tsx
git commit -m "feat(ui): re-theme Setup screen to comic-tabloid design"
```

---

### Task 5: Verification sweep

**Files:** none created; verification only.

- [ ] **Step 1: Full suite + typecheck + build**

Run: `npm run test:run && npm run typecheck && npm run build`
Expected: all pass, clean, build succeeds.

- [ ] **Step 2: Visual check against the prototype**

Run `npm run dev`; open the app and `design_handoff_nuke_game/index.html` side by side. Verify on the Setup screen: paper texture + ink frame, NUKE! masthead with magenta bang, yellow ribbon, rotated cast tiles with SVG portraits + PICKED stamps, difficulty gag labels, magenta Begin button, human roster rows with Groucho portraits. Check responsive collapse below 920px.

- [ ] **Step 3: Update knowledge graph**

Run: `graphify update .`
Expected: graph refreshed, no API cost.

- [ ] **Step 4: Commit any stragglers**

Run `git status` — if verification produced fixes, commit them with a descriptive message.

---

## Self-Review Notes

- Spec §1 tokens → Task 1; §2 fonts → Task 1; §3 portraits → Task 2; §4 primitives → Task 3; §5 Setup → Task 4; §6 testing → Tasks 2–5. §7 exclusions respected (no RoundBadge/dev-nav/animations).
- Verbatim-port steps (faces, 13 primitives, tokens.css) reference exact in-repo source line ranges instead of duplicating hundreds of lines — the source bundle is checked in at `design_handoff_nuke_game/` and is the design source of truth.
- Type consistency: `Portrait` prop `flag` (Task 2) is what Task 4's human roster passes; `extractFlag` exported from `../portraits` matches Task 4's import; `HoldButton` barrel export name matches its test import. Nothing in slice 1 consumes `ApMeter`/`PhaseTrack`/etc. yet — they exist for slices 2–4 per spec §4.
