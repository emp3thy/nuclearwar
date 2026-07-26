# Slice 2 — Newspaper content (adverts + ironic weather) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Make the RoundSummary tabloid varied and funny — a rotating pool of 15 surreal adverts, a bigger rotating classifieds window, ironic weather that varies by round, and more corrections. Content + pure selection helpers only; no engine/AI/layout change.

**Architecture:** All new content + selection lives in `src/ui/util/newspaper.ts` as pure functions of `reportedRound`. `src/ui/screens/RoundSummary.tsx` swaps its static renders for the new pickers. Deterministic, reproducible, testable.

**Tech Stack:** React 18 + TS + CSS modules, vitest. `vite-node` available.

**Spec:** `docs/superpowers/specs/2026-07-26-fun-while-dying-slice2-newspaper-content-design.md`

## Global Constraints

- Product emojis (☢ ▲▼ flags) are design language — keep them.
- Every commit: `npm run typecheck` clean AND `npm run test:run` green.
- Tests: unconditional assertions only (no `if (x) expect(...)`).
- Advert voice is LOCKED (spec §2.1): original surreal inanity + prepper spoof, in the Nuclear Ducks / Tinned Sunshine register. NO borrowed Monty Python / Marx quotes. Exactly 15 adverts, using the locked list.
- Selection is a pure function of `reportedRound` — no RNG, no engine state.

## Guardrails (better-memory)

- Product design-language emojis are not "whimsy" to strip (mem: 'No whimsy' scopes to assistant text, not product UI).
- `deriveForecast` arity change ripples to its caller + any test — update all call sites in the same commit (mem: every commit typechecks; changing a signature shifts tests outside the planned file).

## File Structure

```
src/ui/util/newspaper.ts        (modify: + Advert type, ADVERTS, pickAdvert; expand CLASSIFIEDS + pickClassifieds; deriveForecast gains round param + rotating rows; expand CORRECTIONS)
src/ui/screens/RoundSummary.tsx (modify: use pickAdvert, pickClassifieds, deriveForecast(thisRoundLost, reportedRound))
tests/ui/newspaper.test.ts      (modify/extend: pool sizes, rotation, distinctness, tier mapping preserved)
```

---

### Task 1: Content pools + selection helpers (`newspaper.ts`)

**Files:**
- Modify: `src/ui/util/newspaper.ts`
- Test: `tests/ui/newspaper.test.ts`

**Interfaces produced:**
- `export interface Advert { title: string; body: string }`
- `export const ADVERTS: readonly Advert[]` (exactly 15)
- `export function pickAdvert(reportedRound: number): Advert`
- `export function pickClassifieds(reportedRound: number, n?: number): Classified[]` (default n=4)
- `export function deriveForecast(thisRoundLost: number, reportedRound: number): Forecast` (round param ADDED)
- `CLASSIFIEDS` expanded to ≥16; `CORRECTIONS` expanded to ≥8.

- [ ] **Step 1: Write failing tests** — add to `tests/ui/newspaper.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
  ADVERTS, pickAdvert, CLASSIFIEDS, pickClassifieds, CORRECTIONS, deriveForecast,
} from '../../src/ui/util/newspaper';

describe('adverts', () => {
  it('pool is exactly 15 with non-empty title + body', () => {
    expect(ADVERTS).toHaveLength(15);
    for (const a of ADVERTS) {
      expect(a.title.length).toBeGreaterThan(0);
      expect(a.body.length).toBeGreaterThan(0);
    }
  });
  it('pickAdvert rotates by round and wraps', () => {
    expect(pickAdvert(1)).toBe(ADVERTS[0]);
    expect(pickAdvert(2)).not.toBe(pickAdvert(1));
    expect(pickAdvert(16)).toBe(pickAdvert(1)); // 15-wrap
  });
});

describe('classifieds', () => {
  it('pool is at least 16', () => {
    expect(CLASSIFIEDS.length).toBeGreaterThanOrEqual(16);
  });
  it('pickClassifieds returns n distinct items and rotates by round', () => {
    const r1 = pickClassifieds(1, 4);
    const r2 = pickClassifieds(2, 4);
    expect(r1).toHaveLength(4);
    expect(new Set(r1.map((c) => c.text)).size).toBe(4); // distinct within a round
    expect(r1.map((c) => c.text).join('|')).not.toBe(r2.map((c) => c.text).join('|'));
  });
});

describe('corrections', () => {
  it('pool is at least 8', () => {
    expect(CORRECTIONS.length).toBeGreaterThanOrEqual(8);
  });
});

describe('deriveForecast (round-varied, tier preserved)', () => {
  it('maps damage to the right tier outlook + uv', () => {
    expect(deriveForecast(0, 1).outlook).toBe('FALLOUT: NONE');
    expect(deriveForecast(0, 1).uv).toBe(1);
    expect(deriveForecast(3, 1).outlook).toBe('FALLOUT: LIGHT');
    expect(deriveForecast(10, 1).outlook).toBe('FALLOUT: HEAVY');
    expect(deriveForecast(10, 1).uv).toBe(4);
    expect(deriveForecast(20, 1).outlook).toBe('FALLOUT: BIBLICAL');
    expect(deriveForecast(20, 1).uv).toBe(5);
  });
  it('same damage tier reads differently across rounds (rows rotate)', () => {
    const a = deriveForecast(10, 1).rows.map((r) => r.value).join('|');
    const b = deriveForecast(10, 2).rows.map((r) => r.value).join('|');
    expect(a).not.toBe(b);
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

Run: `npx vitest run tests/ui/newspaper.test.ts`
Expected: FAIL (ADVERTS/pickAdvert/pickClassifieds undefined; deriveForecast arity; pool sizes).

- [ ] **Step 3: Implement in `newspaper.ts`**

Add the Advert type + the locked 15-entry `ADVERTS` (spec §2.1 list verbatim in voice — each `{ title, body }`; body carries pitch + price/CTA; use `\n` in title only if the two-line look is wanted, otherwise plain). Add:

```ts
export interface Advert { title: string; body: string }

export const ADVERTS: readonly Advert[] = [ /* the 15 from spec §2.1, in order */ ];

export function pickAdvert(reportedRound: number): Advert {
  return ADVERTS[(reportedRound - 1) % ADVERTS.length];
}
```

Expand `CLASSIFIEDS` to ≥16 (keep the existing 4, add ≥12 in the same surreal-inanity/prepper voice; some may share a `tag`). Add:

```ts
export function pickClassifieds(reportedRound: number, n = 4): Classified[] {
  const start = (reportedRound - 1) % CLASSIFIEDS.length;
  return Array.from({ length: Math.min(n, CLASSIFIEDS.length) }, (_, i) =>
    CLASSIFIEDS[(start + i) % CLASSIFIEDS.length],
  );
}
```

Weather: change `deriveForecast(thisRoundLost: number, reportedRound: number)`. Keep the four damage tiers driving `outlook`/`temp`/`tempLabel`/`uv` (and the documented UV-ladder divergence note — do NOT revert it). Replace the fixed `rows` with per-damage-state rotating variants:

```ts
// Each damage state has >=2 ironic row-set variants; pick by round so the same
// tier reads differently round-to-round. Keep the Fallout/Visibility/Wind/Outlook
// shape; make the copy deadpan-wasteland ironic.
type RowSet = ForecastRow[];
const CALM_ROWSETS: RowSet[] = [ /* >=2 sets for thisRoundLost === 0 */ ];
const HIT_ROWSETS: RowSet[] = [ /* >=2 sets for thisRoundLost > 0 */ ];
// inside deriveForecast:
const sets = thisRoundLost > 0 ? HIT_ROWSETS : CALM_ROWSETS;
const rows = sets[(reportedRound - 1) % sets.length];
```

Provide ≥3 variants each, ironic (e.g. "Wind: mushroom-shaped, gusting to apocalyptic"; "Visibility: nil to 200 yards, improves once the dust is you"; "UV: put factor 50 on the survivors"; "Outlook: unseasonably terminal"). Keep `{ label, value }` shape.

Expand `CORRECTIONS` to ≥8 in-voice items. `pickCorrection` unchanged.

- [ ] **Step 4: Run — expect PASS**

Run: `npx vitest run tests/ui/newspaper.test.ts` → PASS.

- [ ] **Step 5: Typecheck** — `npm run typecheck`. Expected FAIL only at the `deriveForecast` call site in RoundSummary.tsx (fixed in Task 2). If any OTHER file calls deriveForecast, note it for Task 2. Do not commit yet if the suite is red from the arity change — implement Task 2 first, then commit both together. (If cleaner, commit Task 1 with a temporary second arg at the call site; either way the branch must end green.)

---

### Task 2: Wire RoundSummary + green suite

**Files:**
- Modify: `src/ui/screens/RoundSummary.tsx`
- Test: `tests/ui/RoundSummary.render.test.tsx` (only if it asserts old static content)

**Interfaces consumed:** `pickAdvert`, `pickClassifieds`, `deriveForecast(thisRoundLost, reportedRound)` from Task 1.

- [ ] **Step 1: Update imports** — add `pickAdvert`, `pickClassifieds`, `type Advert` to the `newspaper` import; `CLASSIFIEDS` may stay imported only if still referenced (it won't be — remove it to satisfy `noUnusedLocals`).

- [ ] **Step 2: Forecast call** — line ~87: `const forecast = deriveForecast(thisRoundLost, reportedRound);`

- [ ] **Step 3: Classifieds render** — replace the `CLASSIFIEDS.map(...)` block (lines ~295–301) with `pickClassifieds(reportedRound).map((c, i) => (...))`, keying by index `i` (expanded pool may repeat `tag`, so `key={c.tag}` would collide):

```tsx
<div className={styles.sideHead}>CLASSIFIEDS</div>
{pickClassifieds(reportedRound).map((c, i) => (
  <p key={i} className={styles.classified}>
    <strong className={styles.classifiedTag}>{c.tag}</strong>
    {c.text}
  </p>
))}
```

- [ ] **Step 4: Advert block** — replace the hardcoded block (lines ~304–310):

```tsx
const advert = pickAdvert(reportedRound); // hoist near other per-render derivations
// ...
<div className={styles.adBlock}>
  <div className={styles.adLabel}>ADVERTISEMENT</div>
  <div className={styles.adTitle}>
    {advert.title.split('\n').map((line, i) => (
      <span key={i}>{i > 0 && <br />}{line}</span>
    ))}
  </div>
  <div className={styles.adCopy}>{advert.body}</div>
</div>
```

- [ ] **Step 5: Full verify**

Run: `npm run typecheck` → clean.
Run: `npm run test:run` → all green. Update `RoundSummary.render.test.tsx` only if it asserted the literal "NUCLEAR DUCKS" text or the old 4 classifieds (repoint to assert the ad block renders *an* advert title + body, and that classifieds render 4 rows).

- [ ] **Step 6: Visual check** — `npm run dev`, open a RoundSummary (play a round or dev-nav); confirm the advert + classifieds change across rounds and the weather reads ironically. (Not a gate; sanity only.)

- [ ] **Step 7: Commit** (both tasks together, branch already `feat/newspaper-content`)

```bash
git add src/ui/util/newspaper.ts src/ui/screens/RoundSummary.tsx tests/ui/newspaper.test.ts tests/ui/RoundSummary.render.test.tsx
git commit -m "feat(ui): rotating surreal adverts, expanded classifieds, ironic varied weather"
```

---

## Self-Review Notes

- Spec coverage: §2.1 adverts → Task 1 ADVERTS/pickAdvert + Task 2 ad block; §2.2 classifieds → Task 1 pool+pickClassifieds + Task 2 render; §2.3 weather → Task 1 deriveForecast rotation + Task 2 call; §2.4 corrections → Task 1. §4 tests → Task 1 Step 1 + Task 2 Step 5.
- Arity change to `deriveForecast` is the one cross-file ripple — handled explicitly (Task 1 Step 5 + Task 2 Step 2), suite must be green at the single commit.
- Advert list is locked (15) in the spec; implementer transcribes the voice, does not invent a different register or add borrowed quotes.
- No engine/AI/scoring/layout change; RoundSummary CSS modules untouched.
