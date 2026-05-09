# nuke — design spec

**Date:** 2026-05-08
**Status:** drafted from brainstorming session; pending user review

A browser-based parody game inspired by *Nuclear War* (1989), starring six modern world leaders. Solo + hotseat, 15–25 minute games, written in TypeScript on Vite + React with a fully-decoupled pure-TS game engine. Mobile path via PWA + Capacitor (post-v1).

The brainstorming session that produced this spec also produced four canonical mockups (`docs/superpowers/mockups/`) and a flavour bank (`docs/superpowers/flavour-bank.md`) that should be read alongside this document.

---

## 1. Overview

The player picks 3–5 leaders from a six-leader cast. Each round, every leader (human or AI) **privately submits orders** spending an Action Point (AP) budget; orders resolve simultaneously in a fixed phase order. Combat involves pairing a delivery system (missile or bomber) with a warhead and choosing whether to target **People** (kill citizens) or **Infrastructure** (destroy factories — the only destroyable infrastructure). Diplomacy via **wooing** and **propaganda** sits alongside aggression. When a leader's population reaches zero, all their remaining warheads launch automatically (**Final Retaliation**).

The tone is satirical political-cartoon, in the lineage of the original 1989 game's "Tricky Dick / Mao Tse Tongue / Infidel Castro" cast. Every "winner" is shown ironically — even the survivor rules over rubble.

---

## 2. Cast

In-game characters are parody names; real-world references appear only in the flavour-bank context table. The game world uses parody names exclusively across UI, dialogue, save data, and code.

| In-game | Country | Start pop | Real-world inspiration | One-line profile |
|---|---|---|---|---|
| **Chump** | 🇺🇸 US | 33 M | Donald Trump | Coward. Highest production, used badly. Heavy propagandist. |
| **Khameneverhere** | 🇮🇷 Iran | 28 M | Mojtaba Khamenei (the never-seen successor) | Grudge-holder. Visual gag: he's never actually on screen. |
| **Starmless** | 🇬🇧 UK | 25 M | Keir Starmer | Cautious investor + scapegoat. |
| **Carnage** | 🇨🇦 Canada | 25 M | Mark Carney | Rational escalator + opportunist. Catchphrase: "Elbows up." |
| **Mileigh-hem** | 🇦🇷 Argentina | 22 M | Javier Milei | Glass cannon. Heavy diplomacy, then all-out aggression. |
| **Netanyahoo** | 🇮🇱 Israel | 18 M | Benjamin Netanyahu | Warmonger. Attacks anyone, ignores counterattack risk. |

Full 6-leader cast totals 151 M. Smaller-cast games drop the lowest-pop leaders first by default (configurable in Setup).

### Cameo character (non-playable)

| In-game | Country | Real-world inspiration | Role |
|---|---|---|---|
| **Nigel Disparage** | 🇬🇧 UK (Clacton, allegedly) | Nigel Farage | Cameo critic. No AP, no country (mechanically), can't be attacked. Pops up uninvited on the Action and Round Summary screens to criticise without proposing alternatives. Mechanic detailed in §8. |

3–5 are picked per game. A 6-leader game is supported but uncommon.

---

## 3. Game shape

### Round structure

Each round has three phases:

1. **Planning (private).** Each leader privately submits orders, spending their AP budget. Hotseat humans pass the device between turns; AIs plan silently in the background.
2. **Resolution (public).** All orders are revealed and resolved simultaneously in fixed order: **Defences → Builds → Propaganda → Launches → Final Retaliations**.
3. **Status update.** Population, arsenals, grudges, woo expirations, and propaganda effects are applied. Eliminated leaders trigger Final Retaliation. Win condition is checked at end of round.

### Length

A typical game runs 15–25 minutes (~8–14 rounds). Configurable via Setup (starting populations, optional dominance threshold).

### Win conditions

Checked at end of each round, in order:

1. **Survivor win** — only one leader has population > 0.
2. **Pyrrhic win** — all leaders eliminated this round → highest population at start of round wins.
3. **Apocalypse** — all leaders at 0 → no winner; "the world ends" finale.
4. **Dominance** (optional, configurable) — a leader has 2× the next-highest population.

The Winners screen always frames the outcome ironically — even a survivor wins by ruling over rubble.

---

## 4. Action set & AP economy

### Per-round AP budget

`AP_round = factories × 0.5 + banked_AP + leader_bonus`

Banked AP carries to the next round, capped at +2.

### Per-leader base AP

| Leader | Start factories | Start AP | Bonus rule |
|---|---|---|---|
| Chump | 10 | 5 | -1 wasted on excess defence each round |
| Khameneverhere | 6 | 3 | — |
| Starmless | 6 | 3 | — (often invests in factories) |
| Carnage | 6 | 3 | — (efficient) |
| Mileigh-hem | 4 | 2 | +2 if 100% of orders are aggression (attack/propaganda) |
| Netanyahoo | 6 | 3 | +1 if order set includes a launch |

### Action types and costs

| Action | AP | Effect |
|---|---|---|
| Build factory | 3 | +1 factory (+0.5 AP/round, permanent until destroyed) |
| Build missile / bomber | 1 | +1 delivery platform |
| Build warhead (S / M / L) | 1 / 2 / 3 | +1 warhead of that yield |
| Build defence (Missile Shield / Anti-Aircraft) | 2 | +1 defender of that type |
| **Launch** at target, **People** or **Infrastructure** | 2 | Pairs 1 delivery + 1 warhead, applies damage |
| **Propaganda** at target | 1 | Steals N M population from target |
| **Wooing** at target | 1 per point | Adds wooing points to target's `favourability[me]`; reduces target's willingness to attack me next round |

**Banking** is automatic, not a separate action. Any AP unspent at Seal Orders banks to the next round, capped at +2 stored. There is no "Pass" action — the player simply seals with fewer orders than their budget allows.

**No espionage / no intel.** Other players' stockpiles are visible at all times (open stockpiles), but their *current-round orders* are never previewable. Part of the fun is uncertainty about what others will actually do this round.

### Targeting choice (Launch only)

When launching, the attacker chooses **People** or **Infrastructure**. Same warhead damage profile, applied to a different pool:
- **People:** kills millions (yield-dependent)
- **Infrastructure:** destroys factories / arsenal items (Small=1, Medium=2, Large=3 destroyed; attacker picks within infra)

Chump's coward profile prefers Infrastructure first, mopping up People only when target can't rebuild.

---

## 5. Asset model

Each country has six asset classes. **Only People and Factories can be destroyed.** Stockpile assets (missiles, bombers, warheads, defences) are permanent — once built, they stay until consumed (deliveries + warheads consumed on launch) or persist forever (defences).

| Asset | Description | Destroyable? |
|---|---|---|
| **People** | Population in millions (e.g., Chump starts at 33M). | Yes — by People-targeted attacks; also reduced by incoming propaganda. |
| **Factories** | Each produces 0.5 AP/round. | Yes — by Infrastructure-targeted attacks. **The only target of "Infrastructure" launches.** |
| **Missiles** | Delivery platform. Fast, hard to intercept. | No — consumed when used in a launch; never destroyed by enemy action. |
| **Bombers** | Delivery platform. Slow, easier to intercept. | No — consumed when used in a launch; never destroyed by enemy action. |
| **Warheads** | Payload (Small / Medium / Large). Must pair with a delivery to fly. | No — consumed when used in a launch; never destroyed by enemy action. |
| **Defences** | **Missile Shield** (vs missiles) and **Anti-Aircraft** (vs bombers). | No — once built, permanent. |

Starting assets are set per leader to reflect country profile (US has highest factories, Israel highest weapons-to-pop ratio, etc.).

This means a launch with target=Infrastructure only ever destroys factories. The attacker doesn't pick which specific factory — destroyed factories are simply removed from count.

---

## 6. Combat model

### Intercept resolution — overwhelm model

Defences degrade against repeated incoming attacks of their matching type within the same round. The **Nth incoming attack** of a given type, against a player who has **S defenders** of that type, is intercepted at probability:

| Nth incoming | Probability |
|---|---|
| N ≤ S (defender capacity not exhausted) | **100%** |
| N = S + 1 | **75%** |
| N = S + 2 | **50%** |
| N = S + 3 | **25%** |
| N ≥ S + 4 | **0%** |

So 3 missile shields auto-intercept the first 3 incoming missiles, then degrade: 4th = 75%, 5th = 50%, 6th = 25%, 7th+ = 0%. Defences can be **overwhelmed** by sheer volume — a deliberate strategic lever.

Each defender type is tracked separately:
- **Missile Shield** counts only against incoming **missiles**.
- **Anti-Aircraft** counts only against incoming **bombers**.
- Mismatched defender vs delivery is a no-op (a missile shield does nothing against bombers).

Within a round, attacks resolve in a deterministic order (attacker by leader-id ASC, then by order-id ASC) so the "Nth incoming" position is reproducible.

Intercepts roll before damage applies. A successful intercept destroys the warhead in flight; no damage lands. **Defences are permanent** — they survive intercepts indefinitely, and cannot be destroyed by enemy action.

### Damage

Yield → damage profile. Infrastructure damage is **factories destroyed** (the only destroyable infrastructure).

| Yield | People (M deaths) | Infrastructure (factories destroyed) |
|---|---|---|
| Small (1MT) | 2 | 1 |
| Medium (5MT) | 6 | 2 |
| Large (20MT) | 15 | 3 |

So a Large hit on the US (10 starting factories) wipes out 3 factories, leaving 7 productive — a noticeable but not crippling blow. A second Large hit drops them to 4, etc.

Damage is deterministic (no random damage rolls); only intercept rolls are random. This keeps the game predictable enough for strategic planning.

### Final Retaliation

When a leader's population reaches 0, all their remaining warheads automatically launch at random surviving opponents. If the leader has a grudge list (Khameneverhere), grudge targets are weighted higher. Final Retaliation can chain — a leader killed by another leader's Final Retaliation triggers their own.

---

## 7. AI personalities

Each leader's AI is a scoring function over candidate orders. Higher score → more likely to be picked; AP budget constrains the final selection. Personality manifests as differential weights on inputs (target threat, recent aggression, propaganda received, woo state, opportunism, etc.).

### Chump (Coward, US)

- **Bias:** Build Defence and Build Warhead (hoards arsenal).
- **Launch when** target's defence is visibly low **OR** target is otherwise weak (low pop, low arsenal). Either condition is sufficient — he picks on the vulnerable.
- **Rarely retaliates** after being hit (cowardice).
- **Heavy propagandist** — propaganda directed at *anyone*.
- **Wooing on Chump works**: if anyone woos Chump, he won't launch at them next round.
- **People vs Infra**: prefers Infra first, mops up People only when target can't rebuild.

### Khameneverhere (Grudge, Iran)

- **Maintains a grudge score** per leader. Each attack against him increments that attacker's score (heavier weight for higher-yield hits and recent hits).
- Each round, **launches focus on the leader at the top of the grudge list** (highest score). All anger goes to that one target.
- **Side effect (intentional):** a leader who's only attacked him a little can keep doing so without consequence — until their accumulated grudge score overtakes the current top, at which point the focus shifts to them. Players can game this (hit-and-stay-low) but pay the price as soon as they cross the threshold.
- Grudges persist past his own death — Final Retaliation prioritises the grudge list, top-down.
- **Visual gag:** the cardboard cutout / hospital leg / empty chair tableau. He's never actually on-screen. **Orders are filed for him, but always unsigned** — it is never explicitly clear whether he is personally issuing them or whether his office is acting in his name.

### Netanyahoo (Warmonger, Israel)

- **High base launch bias.** Attacks anyone, including non-aggressors — **with one exception**.
- **Chump exception:** will not *launch* against Chump until Chump attacks him first. He **will** still propagandise Chump (a constant low-level needle) regardless.
- **Ignores counterattack risk** in target scoring (except for the Chump rule above).
- **Higher chance to attack the leader with the largest arsenal**, regardless of relationship (excluding Chump until provoked).
- **Propaganda:** only used against Chump, and *only* against Chump. He doesn't propagandise anyone else.
- **Wooing:** only used on Chump, rarely.

### Carnage (Rational escalator + opportunist, Canada)

- Scores targets by `threat = arsenal_size + recent_aggression`.
- **Escalates**: if hit, attacker's threat doubles for next round, becomes priority target.
- **Opportunist**: weak leaders (low pop, low arsenal) get a "finish them" bonus.
- **Propaganda**: only at attackers.

### Starmless (Cautious technocrat + scapegoat, UK)

- **Defensive/proportional** baseline. Often spends 3 AP on Build Factory (long-game investor).
- **Scapegoat (35% on retaliation)**: when attacked, 35% chance to retaliate against a *different* leader — the one with the highest aggregate threat from others' POV — instead of the actual attacker.
- **Propaganda**: only at attackers.

### Mileigh-hem (Glass cannon, Argentina)

- Most rounds, **wooes + propagandises** (heavy diplomatic phase).
- **Only nukes leaders who have attacked OR propagandised him.**
- When violence is triggered, **commits 100%** to a single all-out attack on one target (glass-cannon).
- **Skips defences entirely** — chooses offence only.
- Activation trigger: `banked_AP + base_AP ≥ 4`.

### Difficulty model

- **Easy:** 30% of orders are randomised; AI ignores half its scoring inputs.
- **Normal:** 10% randomised; full scoring.
- **Hard:** 0% randomised; AI sees one round ahead in target scoring.

---

## 8. Flavour & visual identity

Detailed line bank lives in `docs/superpowers/flavour-bank.md` (~130 lines, tagged `[real]` / `[style]`, organised by leader and moment).

### Visual style

- **Political cartoon / satire register**: caricatured portraits, exaggerated features, comic-book tilts.
- **Tabloid newspaper aesthetic** for the Round Summary screen (cream paper background, bold headline typography, halftone-style "photos").
- **Per-leader signature colour**: Chump red-gold, Khameneverhere deep green, Netanyahoo IDF blue, Starmless Labour red, Carnage maple-red, Mileigh-hem chainsaw-yellow.
- **Khameneverhere's portrait** cycles randomly each round through three "empty leader" tableaux: empty ornate chair, half-open hospital room (single bandaged leg visible), obvious cardboard cutout that occasionally tips over. No-repeat from previous round.

### Tonal rules (load-bearing — apply at line-write time AND in code review)

- **No religious or ethnic markers in any leader's lines.** Critical:
  - **Netanyahoo:** plays as a *warmonger* — strength, war, deterrence, military hardware, the bomb-diagram visual gag. **No Jewish, Hebrew, or religious references.** No Torah, no Esther, no IDF religious framing. He's a hawk, not a religious figure. (The "Book of Esther gift to Obama" line that real Netanyahu actually did is **excluded** for this reason.)
  - **Khameneverhere:** plays the *extreme political rhetoric paired with banal domestic gripe* register. **Allowed:** "death to {target}" formulas, "strike down our enemies", "remove you from this earth", "obliterate", "Great Satan" (well-known Iranian-state rhetoric, uncontroversial). **Not allowed:** specifically *Islamic religious markers* like "infidel" (this term is specifically Islamic religious vocabulary), Quranic invocations, references to *other* religions or religious-coded groups (e.g. "Zionist" — references Judaism, "Christian", "Crusader"). The boundary: extreme political rhetoric is fine, including state rhetoric known to be his. What is NOT fine is marking him as a *religious* extremist or having him reference other religions. The 1989 game's "Infidel Castro" is NOT our model.
- **Khameneverhere — comedic engine:** every line pairs extreme-political-language with a banal domestic gripe. The pairing is the joke. Without the pairing, the line drops out.
- **Khameneverhere — authorship ambiguity:** orders filed in his name are **always unsigned**. System narration leans into this constantly: "Orders filed for Khameneverhere. The orders are unsigned." We never explicitly know whether he is personally issuing them or whether his office is acting unilaterally. This is part of the gag.
- **Other leaders:** lean into established public personas (Chump's malapropisms and tremendous-everything; Starmless's "creepy uncle from 1978" delivery and dad-joke fixation; Carnage's "Elbows up" and central-banker calm; Mileigh-hem's "AFUERA!" and chainsaw imagery).
- **No real ethnic, religious, or violent slurs.** Parody punches up at *political behaviour and persona*, not at identity.

### Cameo character: Nigel Disparage

A non-playable cameo character who appears uninvited to criticise. Two trigger surfaces:

1. **Action screen.** ~15–20% chance after each launch lands. A small portrait popup ("FROM CLACTON" tag, parodying "FROM OUR REPORTER") appears in the bottom-right corner with one line of dialogue, auto-dismissing after ~2s.

2. **Round Summary newspaper.** ~1 round in 3, a "**THE DISPARAGE COLUMN**" sidebar appears below the World Reactions section. Always headed "From his Clacton office (allegedly)" and footered with an absentee-MP parenthetical (rotated from a small bank — "*photographing himself at a pub*", "*on GB News for the eighth time this week*", etc.).

**Rule:** his column never proposes a counterfactual — only criticises what happened. The footer always references his real-world MP-record critique (skipped Parliament, photo-ops, US trips, missed surgeries).

**Snap-back:** when his column names a specific leader, that leader's next-round Planning screen mood line can snap back ("Nigel? Tremendous guy.", "AFUERA, salesman!", "Elbows up. Pint down.", etc.). Snap-back lines are categorised in `flavour-bank.md` under each leader's `preRoundMood` section, conditioned on `disparage_just_named_me`.

**Engine implementation:** a small `cameo.ts` module owns the trigger logic (RNG roll on launch-impact and on round-end) and pulls lines from `flavor/disparage.ts`. The cameo system is bypassable for tests via a deterministic seed.

### Masthead rotation (Round Summary)

15-name pool rotates per round, shuffled at game start. Real-world parodies (The Grauniad, The Torygraph, The Daily Wail, The Mop and Pail, The Old Gray Lady, The Failing New York Times, The LA Slimes, McPaper, The Granny Herald, Pravda) plus nuke-themed originals (The End Times, The Daily Detonator, The Doomscroll Daily, The Mushroom Cloud Times, The Fallout Express). Apocalypse round always overrides to "THE END TIMES — FINAL EDITION".

---

## 9. Screens & UX flow

Seven screens total. Mobile-first vertical layout throughout.

### 1. Setup

Cast picker (3–5 of 6), difficulty (Easy/Normal/Hard), optional config sliders (start pop, dominance threshold, fast-play toggle). "New Game" or "Resume Saved Game" entry points.

### 2. Hotseat Handoff

Full-screen curtain shown only between humans: "Pass to {next-leader}. Previous orders sealed. Tap to begin." Solo mode skips this entirely.

### 3. Planning (canonical mockup: `docs/superpowers/mockups/planning-screen.html`)

Top → bottom:
- Header (round number, save, fast-resolve toggle).
- Your country panel: pop, factories, arsenal counts, defences, AP available + banked + bonus.
- History strip (last 3 rounds, horizontal scroll).
- The Table (other leaders as 2×2 grid of cards with relationship badges + AI mood quotes).
- Your orders (queue, AP cost per item, total/over-budget validation, +Add and Seal Orders buttons).

**Information model:** open stockpiles — full visibility of every other leader's pop, factories, arsenal counts, and defences. Hidden are only the **current-round orders** of every other leader. There is no espionage / intel system; uncertainty about what others will *do* this round is part of the fun.

**Validation:** hard-block ordering a launch without owning a delivery + warhead. Soft-warn obviously suboptimal plays (warhead with no deliveries, wooing a leader who never attacks you).

**Seal Orders** is irreversible; tap-and-hold (600ms) confirms.

### 4. AI Conferring

Brief beat (~1.5s) with system narration ("AI players are filing orders…", "Khameneverhere has filed orders. He may or may not still be alive.") while AI orders are computed.

### 5. Action / Resolution (canonical mockup: `docs/superpowers/mockups/action-screen.html`)

**World-map layout**: stylised world with countries highlighted in signature colours, name-labelled, with small dimmed leader icons at their location.

For each event:
- **Actor portrait** pops up over their country (left side).
- **Receiver portrait** pops up over their country (right side).
- Both with speech bubbles carrying their in-the-moment quote.
- Missile arcs across the map with a 🚀 mid-flight.
- Actor's country: green pulse. Receiver's country: red dashed attack ring.
- Damage badge floats over receiver, comic-tilted.

Khameneverhere's portrait is always the empty-chair / hospital-leg / cardboard tableau.

Phase tracker at top shows progress through Defences → Builds → Propaganda → Launches → Final Retaliations.

**Pacing**: ~1.8s per event; Fast Resolve mode = 3× speed.

**Other phases on the same map**:
- Defence intercepts: 🛡 burst on arc; missile fades; receiver shows relief.
- Defence builds: 🛡 icon pops over building country.
- Factory builds: ⚙ icon pops up.
- Propaganda: paper-aeroplane trail arcs sender → receiver; pop counter ticks.
- Wooing: heart / handshake icon arcs gently with brief mutual portrait flash.
- Final Retaliation: eliminated country goes black; starburst of arcs fires from it to grudge targets simultaneously.

### 6. Round Summary (canonical mockup: `docs/superpowers/mockups/round-summary.html`)

**Tabloid newspaper front page** — single screen replacing the originally-separate Reactions + Summary screens.

- Masthead (rotating).
- Bold headline matching round's dominant event ("CHUMP CLOBBERED" etc.).
- Italic subhead.
- Stylised SVG mushroom-cloud "photo" with comic-tilted red damage stamp.
- Casualty strip (this round / war total / survivors).
- "World Reactions" — per-leader stories with portrait, name, monospace pop-delta, italic quote, state-change badges.
- Big red "Round N+1 → Plan" button at bottom.

**Special variants**:
- Apocalypse round → masthead "THE END TIMES — FINAL EDITION", headline "**THE END.**" centred.
- Eliminated leaders → portrait greyed, black border, "OBITUARY:" prefix, last-words quote.
- "The Failing New York Times" masthead lands when Chump's in the round → next-round mood line is *"Failing New York Times. Sad."*

### 7. Winners

Final screen, ironic framing always:

| Win type | Headline | Sub-line example *(numbers illustrative — actual depend on cast)* |
|---|---|---|
| Survivor | "**CARNAGE WINS**" | "He rules over 4 M Canadians. The rest are ash. Elbows up." |
| Pyrrhic | "**CHUMP WINS**" | "He had 12 M when the bombs flew. He has 0 now. So does everyone else. Briefly, he had more." |
| Apocalypse | "**WINNER: NOBODY**" | "Total casualties: 100% of starting population. The board is dark." |
| Dominance | "**MILEIGH-HEM WINS**" | "22 M Argentinians remain. The next-largest leader has 11 M. The rest are… well." |

Visual treatment:
- Ironic headline + the winner's catchphrase rendered over a ruined version of their iconography (Chump's MAGA hat in rubble, Mileigh-hem's chainsaw broken in half, etc.).
- Per-leader death-toll table (start pop, end pop, % lost) sorted by % lost ascending.
- Replay timeline scrubber — drag through every round to relive each leader's orders + outcomes.
- Buttons: "New Game" and "Same cast, again".

---

## 10. Architecture

**Approach: pure TS engine + thin React UI.** Engine has zero React dependencies and is fully deterministic given seed.

### Folder layout

```
nuke/
├── package.json, tsconfig.json, vite.config.ts, index.html
├── public/
│   ├── art/        (SVG portraits, icons, newspaper textures, world map)
│   └── audio/      (sfx, music)
└── src/
    ├── engine/                  ← pure TS, zero React
    │   ├── types.ts             (GameState, Leader, Order, Action, ResolutionEvent)
    │   ├── state.ts             (initial state factory)
    │   ├── reducer.ts           ((state, action) => state)
    │   ├── resolution.ts        (round → events[])
    │   ├── combat.ts            (intercepts, damage, infra targeting)
    │   ├── balance.ts           (all tunable constants)
    │   ├── ai/
    │   │   ├── scoring.ts       (shared primitives: threat, opportunism, etc.)
    │   │   ├── chump.ts
    │   │   ├── khameneverhere.ts
    │   │   ├── netanyahoo.ts
    │   │   ├── carnage.ts
    │   │   ├── starmless.ts
    │   │   ├── mileighhem.ts
    │   │   └── index.ts
    │   ├── flavor/              (catchphrase banks, one file per leader)
    │   ├── masthead.ts          (rotation pool + Fisher-Yates shuffle)
    │   └── replay.ts
    ├── ui/                      ← React shell
    │   ├── App.tsx
    │   ├── screens/
    │   │   ├── Setup.tsx
    │   │   ├── HotseatHandoff.tsx
    │   │   ├── Planning.tsx
    │   │   ├── AiConferring.tsx
    │   │   ├── Action.tsx
    │   │   ├── RoundSummary.tsx
    │   │   └── Winners.tsx
    │   ├── components/          (LeaderPortrait, OrderForm, AssetCounter, …)
    │   ├── animation/           (Framer Motion variants)
    │   ├── audio/               (one-line play(name) wrapper)
    │   ├── persistence.ts       (localStorage)
    │   └── store.ts             (useReducer wrapping engine.reduce)
    └── main.tsx
```

### Engine surface

```ts
type Action =
  | { type: 'NEW_GAME'; cast: LeaderId[]; difficulty: Difficulty; seed: string }
  | { type: 'SUBMIT_ORDERS'; leaderId: LeaderId; orders: Order[] }
  | { type: 'RESOLVE_ROUND' }
  | { type: 'LOAD_STATE'; state: GameState };

reduce(state, action): GameState
resolveRound(state, rng): { state, events: ResolutionEvent[] }
planAi(state, leaderId, rng): Order[]
```

### Determinism

Engine is fully deterministic given seed. **No `Math.random()`, no `Date.now()` inside the engine** — RNG is a seeded function passed in (`Rng = () => number`). This makes replay exact and saves trustworthy.

### Resolution events

Resolution returns a typed `ResolutionEvent[]` describing what happened, e.g.:

```ts
type ResolutionEvent =
  | { kind: 'MissileLaunched'; from: LeaderId; to: LeaderId; warhead: Yield; targetType: 'people' | 'infra' }
  | { kind: 'MissileIntercepted'; from: LeaderId; to: LeaderId; warhead: Yield }
  | { kind: 'ImpactPeople'; target: LeaderId; deaths: number }
  | { kind: 'ImpactInfrastructure'; target: LeaderId; assetType: 'factory' | 'missile' | …; count: number }
  | { kind: 'PropagandaTransfer'; from: LeaderId; to: LeaderId; amount: number }
  | { kind: 'WooApplied'; from: LeaderId; to: LeaderId; points: number }
  | { kind: 'FactoryBuilt'; by: LeaderId }
  | { kind: 'DefenceBuilt'; by: LeaderId; type: 'shield' | 'aa' }
  | { kind: 'LeaderEliminated'; id: LeaderId }
  | { kind: 'FinalRetaliationTriggered'; by: LeaderId; targets: LeaderId[] }
  ;
```

UI consumes events to drive animations on the Action screen; replay re-streams the same events to the timeline scrubber.

---

## 11. Persistence & replay

- **Save slot:** one slot for v1. Auto-save on every state mutation to `localStorage` under `nuke.save.v1`. Resume from Setup.
- **Action log:** a parallel write of every dispatched `Action` to `localStorage` (`nuke.actions.v1`). Replay is `cast` + initial seed + actions; engine re-runs deterministically.
- **Replay UI:** timeline scrubber on Winners screen. Drag a horizontal handle through rounds; tap any event marker to see its detail. Re-uses Action-screen rendering primitives.

---

## 12. Audio

Small wrapper around `<audio>` elements with a one-line API: `play(soundName: string)`. No Web Audio.

Asset categories:
- Launch beep / impact boom / intercept fizzle.
- Propaganda jingle / wooing chime.
- Round-summary stinger / Winners trumpet.
- Light ambient war-room hum (looping background music).

`prefers-reduced-motion` users get muted-by-default.

---

## 13. Mobile path

PWA from day one (manifest + service worker, installable to home screen).

Post-v1: wrap `dist/` with **Capacitor** (`npx cap init`) → build for iOS / Android. No code rewrite. Touch-first UX (≥44px tap targets, no hover-only interactions, vertical layouts) is built in from the start so the port is painless.

---

## 14. Build & deployment

| Command | Purpose |
|---|---|
| `npm run dev` | Vite dev server with hot reload |
| `npm run build` | Static `dist/` output |
| `npm run test` | Vitest engine + UI tests |
| `npm run typecheck` | `tsc --noEmit` |

Static deploy works on any host (GitHub Pages, Netlify, Cloudflare Pages).

---

## 15. Testing approach

- **Vitest on the engine** (no DOM): damage math, intercept rolls, every AI scoring function, Final Retaliation cascades, win-condition ordering.
- **React Testing Library** for a small set of UI tests: OrderForm validation, Hotseat Handoff transitions, planning AP-budget previewer.
- **Property tests for resolution determinism**: same seed + same orders → identical events array.
- **AI-duel headless mode** (post-v1 nice-to-have): run 100 all-AI games, compare win distribution per leader to detect balance outliers.

---

## 16. Scope — IN for v1

- Solo + hotseat (no networking).
- 6-leader cast / 3–5 per game / asymmetric AI personalities.
- Full action set including wooing, propaganda, infrastructure-vs-people targeting, factory investment.
- Save / resume (one slot).
- Audio: sfx + light ambient music.
- End-of-game replay timeline scrubber.
- Difficulty: Easy / Normal / Hard.
- PWA install.
- English only.
- Masthead rotation (15 mastheads).

## Scope — OUT for v1 (explicit YAGNI)

- Online multiplayer / accounts / cloud save.
- Localisation (i18n).
- Custom leader creation / mod support.
- Procedural news events / random world events.
- Achievements / unlocks / metaprogression.
- Spectator mode.
- Voice acting (text-only flavour).
- Capacitor mobile builds (PWA only in v1; native wrap is post-v1).

---

## 17. Risks & unknowns

| Risk | Mitigation |
|---|---|
| **AI balance outliers**: one leader dominates or is always crushed. | Constants in `balance.ts`. Headless AI-duel test mode (100 all-AI games) to surface outliers. Plan for one balance pass after first playable. |
| **Resolution pacing drags** under realistic Round 4-style scenarios with 5+ events. | Animate parallel events in parallel where possible. Fast Resolve mode = 3× speed. Skip-to-summary control. |
| **Art workload** balloons (6 leaders × multiple states × screens). | SVG flat caricatures cap workload. Fall back to stylised silhouettes if needed. Mockups already use emoji as wireframe placeholders; production art is a separate workstream. |
| **Hotseat feels fiddly** on small screens. | Curtain screen mandatory between humans. Tap-and-hold reveal. Test early on a real phone. |
| **State machine grows unmanageable** as we add edge cases (intercepts during Final Retaliation, eliminated-leader bookkeeping, etc.). | Engine is pure TS with strong types and unit tests; avoid leaking logic into UI. Resolution returns events; UI is read-only consumer. |

---

## 18. Open questions

- **Production art workflow**: who/how generates the leader caricatures and world-map artwork? (Out of scope for v1 spec — placeholder SVG/emoji acceptable initially.)
- **Wooing math**: exact woo-points-to-favourability curve. To be tuned in `balance.ts` during balance pass.
- **Grudge-score weights**: exact weight formula for Khameneverhere's grudge score (yield × time-decay × something?). To be tuned in `balance.ts` — design intent is "small attacks accumulate slowly; big attacks dominate fast".

---

## 19. References

- **Mockups** (canonical, self-contained HTML in `docs/superpowers/mockups/`):
  - `planning-screen.html` — Planning screen layout
  - `action-screen.html` — Action / Resolution world-map layout
  - `round-summary.html` — Round Summary tabloid front page (merged Reactions + Summary)
- **Flavour bank** (`docs/superpowers/flavour-bank.md`): per-leader dialogue lines tagged `[real]` / `[style]`, plus masthead rotation pool.
- **Brainstorming session artifacts** (`.superpowers/brainstorm/<session-id>/`, gitignored): full conversation history, intermediate mockups, exploratory variants. Not part of the source of truth.

---

## 20. Approval

This spec is a snapshot of brainstorming session 2026-05-08. The user reviews; if approved, the next step is `superpowers:writing-plans` to produce an implementation plan. If changes are needed, this doc is updated in place and re-reviewed.
