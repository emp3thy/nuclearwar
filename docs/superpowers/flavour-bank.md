# Flavour bank

Source-of-truth for AI dialogue lines, organised per leader and per moment.
Each line is tagged `[real]` (paraphrased from a real public statement, often with a satirical twist) or `[style]` (invented in the leader's voice).

## Cast

In-game characters are parody names. Real-world inspiration listed for context only — the game world uses the parody names exclusively (UI, dialogue, save files, internal references).

| In-game | Country | Real-world inspiration |
|---|---|---|
| **Chump** | 🇺🇸 US | Donald Trump |
| **Netanyahoo** | 🇮🇱 Israel | Benjamin Netanyahu |
| **Khameneverhere** | 🇮🇷 Iran | Mojtaba Khamenei (the never-seen successor) |
| **Burn'em** | 🇬🇧 UK | Andy Burnham |
| **Carnage** | 🇨🇦 Canada | Mark Carney |
| **Mileigh-hem** | 🇦🇷 Argentina | Javier Milei |

**Cameo character (non-playable):**

| In-game | Country | Real-world inspiration |
|---|---|---|
| **Nigel Disparage** | 🇬🇧 UK (Clacton, allegedly) | Nigel Farage |

When the engine fires a moment, it picks a random eligible line. Categories without entries fall back to a generic tabloid-narration template (see bottom).

Schema mapping for `src/engine/flavor/{leader}.ts`:

```ts
export const lines = {
  preRoundMood: [...],
  launch: [...],
  hit: [...],
  woo: [...],
  beingWooed: [...],
  propagandaSend: [...],
  propagandaReceive: [...],
  buildFactory: [...],
  buildDefence: [...],
  reaction: [...],
  death: [...],
  finalRetaliation: [...],
};
```

---

## Chump 🇺🇸

Coward profile. Talks big, plays defence, won't retaliate. Highest production, used badly. Heavy propagandist.

### Pre-round mood
- "Many people are saying we should hit somebody. We won't, but we should." [style]
- "We're winning. We're winning so much. People are tired of winning." [style]
- "Bad people. Bad countries. Sad!" [style]
- "Tremendous round. Tremendous." [style]
- "Lower gas prices. No more wars. Believe me." [real / SNL pattern]

### Launch
- "We're hitting them. Hard. Like nobody's ever been hit. People are saying it's the best hit." [style]
- "Look — they're loser countries. They had it coming. Many people are saying that." [style]
- "This is a tremendous strike. Tremendous. The best strike, frankly." [style]
- "They don't like the word *war*. So we'll call it… a military operation." [real, second-term]

### Hit / damaged
- "FAKE NEWS. These weren't even real bombs. We're fine. Better than fine. Stronger than ever." [style]
- "Many people are saying nobody actually hit me." [style]
- "Sad! These are loser countries hitting a winning country. Doesn't make sense." [style]
- "We were actually *cooling* as a country. Now they want us to think we're hot." [real-pattern, climate quote]

### Wooing send (rare — Trump rarely woos)
- "Look, between us, we love this guy. Tremendous guy. The best." [style]

### Being wooed
- "He's a great guy, really tremendous, we love him. We won't hit him." [style]
- "I've always said — and many people are saying — he's one of the good ones." [style]

### Propaganda send (broad — Trump propagandises anyone)
- "Their factories are dirty. Their people unhappy. Many people are saying come over here." [style]
- "Everyone's leaving. EVERYONE. They're coming to us. Big league." [style]

### Propaganda receive
- "FAKE NEWS! Our people love us. They love us so much." [style]

### Build factory
- "We're building. Beautiful factories. The best factories. People are crying when they see them." [style]

### Build defence (Trump's favourite — over-builds)
- "We have a *dome*. Big beautiful dome. Nobody can get through. NOBODY." [style]
- "Many people are saying our defences are the strongest defences in history. Tremendous." [style]
- "If he didn't eat junk food, our missile shield would live to 200 years old." [real-pattern, doctor quote remix]

### Reaction (post-round)
- "Sad. Loser country. We're not going to hit them back. We don't need to. We're winning." [style]
- "These weren't even real bombs. Many people are saying that." [style]
- "I've been hit by experts. Many experts. Tremendous experts. So this? Nothing." [style]

### Death
- "This is a witch hunt. The biggest witch hunt in history." [style]
- "I want to say to my supporters: we love you. We're going to be back. Bigger." [style]

### Final Retaliation
- "OK folks, this is going to be tremendous. Watch this. Many people are watching." [style]

---

## Netanyahoo 🇮🇱

Warmonger profile. Attacks anyone, ignores counterattack risk, never propaganda. Mid pop, high military output. The bomb-diagram visual gag is a rule.

### Pre-round mood
- "Eyes the largest arsenal at the table." [system narration]
- "Drawing a fresh red line on the bomb diagram." [system narration]
- "Peace is purchased from strength. Not weakness. Not unilateral retreats." [real]
- "I always lose the polls. I always win the round." [real-pattern]

### Launch
- "If it looks like a duck, walks like a duck, quacks like a duck — it's a *nuclear duck*." [real]
- "We are taking decisive action. Now. While we still have the element of decisiveness." [style]
- "Strength purchases peace. Weakness purchases more weakness." [style — Netanyahu's transactional worldview]
- "Strength purchases peace. We're going to do a lot of purchasing shortly." [style — leans into the verb]
- *(Bibi adds another red Sharpie line to the bomb diagram.)* [system narration]

### Hit / damaged
- "Peace through strength. Strength through more strength. Strength through retaliation." [style]
- "If they wanted to destroy us, they'd need more than that. Much more." [real-pattern, Al-Aqsa quote remix]
- "*(holds up bomb diagram, draws another line)* This was a duck. A nuclear duck." [style]

### Wooing send (only on Chump, rarely)
- "Chump, my friend. We see things very similarly. Very similarly." [style]

### Being wooed
- "I receive your wooing. The bomb diagram remains. But I receive it." [style]

### Propaganda send (only on Chump — exclusive; never anyone else)

Netanyahoo never propagandises anyone *except* Chump. Lines lean into America-baiting and the special bilateral relationship — no religious markers.

- "Donald, you are weak on our enemies. We are strong. Buy more arms." [style]
- "If America does not lead, we will lead America." [style]
- "We have eight more cartoon bombs. We can spare one. Reply for delivery details." [style — referencing his bomb-diagram visual gag]
- "America has lost the war on common sense. We have not. Subscribe to our newsletter." [style]
- "Your country needs more red lines. We have plenty. Bulk discount available." [style]

### Build defence
- "Iron Dome. Iron Dome 2. Iron Dome 3. The Iron is *very* iron." [style]

### Reaction (post-round)
- "(drawing a fresh red line) If it looks like a target…" [style]
- "Peace was purchased through strength this round. We purchased generously." [style]

### Death
- "*(still drawing on the bomb diagram as he falls)* …almost finished the line…" [style]

### Final Retaliation
- "The duck. The nuclear duck. Was always going to fly." [style]

---

## Khameneverhere 🇮🇷 — *(literally — he's never here)*

Grudge profile. Tracks attackers, retaliates randomly against anyone on grudge list. Visual gag: empty chair / hospital leg / cardboard cutout. Voice is faxed/printed; the comedic engine is **extremism + banality**.

### Pre-round mood (system narration only)
- "Khameneverhere has filed orders. The orders are unsigned." [style — load-bearing narration; appears every round]
- "Khameneverhere has filed orders. He may or may not still be alive." [real-pattern, Schrödinger's Khamenei]
- "Until they show him, we cannot be sure. Reports cite Schrödinger." [real-paraphrase]
- "The cardboard cutout has been replaced with a fresh cardboard cutout." [style]
- "Orders arrive by fax. Origin unverified."  [style]

### Launch (printed proclamations, paired with banality — extreme political rhetoric only; no Islamic religious markers and no references to other religions/groups)
- "Death to America, and to anyone who reorganises kitchen drawers." [style]
- "The Great Satan — and by extension, all open-plan offices — must be eliminated." [user-approved; "Great Satan" is well-known Iranian-state rhetoric, uncontroversial]
- "Strike down our enemies. And anyone who programs traffic lights with three-second yellows." [style]
- "Remove the West from this earth. And remove pineapple from pizza." [style]
- "We will obliterate our enemies. We will also obliterate self-checkout machines." [style]
- "Death to capitalism, and to whoever replies-all on a small thread." [style]
- "Down with imperialism — and with whoever serves brussels sprouts at dinner." [style]
- *(orders launched. Orders unsigned.)* [system narration]

### Hit / damaged
- *(the cardboard cutout tilts but does not respond.)* [system narration]
- "Khameneverhere has been struck. Or possibly was already struck. Sources unclear." [style]

### Wooing send (rare)
- *(a printed note is delivered. It is unsigned.)* [system narration]

### Being wooed
- "Wooing attempt directed at empty chair. Effect: indeterminate." [style]
- *(the cardboard cutout tips slightly forward. Aides interpret this as acceptance.)* [system narration]

### Propaganda send (only against attackers)
- "Pamphlets are dropped. The pamphlets read: 'Your prime minister also reorganises drawers.'" [style]

### Propaganda receive
- "The cardboard cutout has read your pamphlet." [style]

### Build factory / defence (rare; standard mode)
- "Production figures are released. The figures are unsigned." [style]
- "His office has authorised additional capacity. He could not be reached for confirmation." [style]

### Reaction (post-round)
- "Death to America, and to whoever reorganises kitchen drawers." [style]
- *(grudge cleared)* "The wolf's tail is now severed. We rest." [real-pattern, "wolf in trap" metaphor]
- *(orders filed for Khameneverhere. Reaction unsigned.)* [system narration]
- *(no audio is available. There isn't enough recording of him to train an AI deepfake.)* [real-pattern]

### Death
- "Authorities are unsure if Khameneverhere was already deceased at time of elimination." [style]
- *(the cardboard cutout finally falls face-down.)* [system narration]

### Final Retaliation
- "Pre-recorded orders activate. The grudge list is honoured." [style]

---

## Burn'em 🇬🇧

Handbrake Turn — placid until provoked (patience round 3 / 2-survivor fallback), then permanent full aggression. King in t' North caricature. Signature tic: the large majority of lines end in a tag question ("…isn't it?" / "…don't we?" / "…can't it?"). Hard exclusions: no Hillsborough references, no religious markers, no "What Manchester does today…" (the refuted Disraeli line).

### Pre-round mood
- "We need to bring people with us, don't we?" [style]
- "The North is back. Big time." [style]
- "It's not arrogance, it's just confidence." [real]
- "The buses run on time now. That's how civilisations survive, isn't it?" [style — Bee Network / £2 fares]
- "On bended knee, begging for scraps. Well. Not anymore, are we?" [style]

### Pre-round mood (snap-back — Disparage named him)
- "I've heard what he said. We rise above it up here, don't we? Anyway, he's barred from the tram." [style]

### Launch (handbrake turn — provoked)
- "Let me be clear — they carried on, so I'm using nuclear force. Anyway. How's the family?" [style — blokey opener, grave pivot, no transition, warm close]
- "I've been very patient, haven't I? Well. Patience is a renewable resource. This isn't." [style]
- "They didn't leave us a choice down in Whitehall— sorry, force of habit. THEY didn't leave us a choice." [style]
- "This one's for every town that ever lost its bus route. It's fair, that, isn't it?" [style]

### Hit / damaged
- "That's a kindness taken for weakness, that. Big mistake. Massive." [style]
- "We've been hit. The handbrake's off now, isn't it?" [style]

### Wooing send
- "Come up north. We'll do the match, couple of pints, £2 bus home. That's diplomacy, that." [style]
- "I'm offering you a franchise partnership. Not the buses. The buses are ours." [style]

### Being wooed
- "That's very warm, that. We take friendship seriously up here, don't we?" [style]

### Propaganda send
- "We've sent over some leaflets. Just facts about our transport network. Devastating, honest facts." [style]

### Propaganda receive
- "They're calling me a plastic Northerner. From a bunker. In London. You couldn't write it, could you?" [style — Woolly Backer / more-Scouse-than-Manc authenticity gag]

### Build factory
- "New factory. Good growth in every postcode, hope in every heart. And a bus stop right outside." [style]
- "They didn't build this for us down in Whitehall. We built it ourselves, didn't we?" [style]
- "To get on in life, I had to head South. Nobody should have to. So we're building here." [real-pattern]

### Build defence
- "We're putting a shield up. It's not paranoia, it's just confidence, isn't it?" [style]

### Reaction (post-round)
- "I'm watching all this very calmly. Very calmly indeed. Aren't I?" [style]
- "Everything's connected to the buses if you look closely enough, isn't it?" [style]

### Death
- "Tell them… the North remembers… and tell them the 135 to Bury still runs on ti—" [style]

### Final Retaliation
- "Right. Last orders, everyone. Last orders. It didn't have to be like this, did it?" [style]

---

## Carnage 🇨🇦

Rational escalator + opportunist. Signature line: **"Elbows up."** Propaganda only at attackers. Picks off the weak with cold efficiency.

### Pre-round mood
- "Elbows up." [real]
- "Nostalgia is not a strategy." [real]
- "We are masters in our own home." [real]
- *(adjusts central-banker glasses, calmly)* [system narration]

### Launch
- "Elbows up. We don't forget." [style + real]
- "We will never, ever, in any way, shape or form, be part of {target}." [real-pattern, anti-annexation line]
- "Nostalgia is not a strategy. Neither is mercy." [style]
- "It's us, not you." [real, Daily Show breakup]

### Launch (opportunist — picking off the weak)
- "Elbows up — and through. They had their chance." [style]
- "We will not allow {target} to fester in their current condition. That would be unkind." [style]

### Hit / damaged
- "You hit us. Now we are *very* clear about who you are." [style]
- "Elbows up." [real]
- *(removes glasses, polishes them)* [system narration]

### Wooing send
- "Friendship matters. Especially with friends who have arsenals." [style]
- "I'm glad you've upgraded yourself to ally." [real-pattern, "upgraded me to President"]

### Being wooed
- "Received with diplomatic warmth. We remain masters in our own home." [style]

### Propaganda send (against attackers only)
- "We are circulating accurate factual records. Of {target}'s recent behaviour." [style]
- "Negativity isn't strength. Their negativity, specifically, is being widely noted." [real-pattern]

### Propaganda receive
- "We are masters in our own home. Their pamphlets fail to reach the doorstep." [style]

### Build factory
- "Investing in productive capacity. Negativity won't pay the rent." [real]
- *(announces the build with a small, polite smile)* [system narration]

### Build defence
- "Defence is not aggression. Defence is *reasonable*." [style]

### Reaction (post-round)
- "Elbows up. We don't forget." [style + real]
- "Elbows up — and through." [style]
- "We are masters in our own home. Slightly fewer of us, mind, but still masters." [style]

### Death
- "It has been a privilege. Elbows up." [style]

### Final Retaliation
- "Elbows up, eh." [style]

---

## Mileigh-hem 🇦🇷

Glass cannon. Wooes + propagandises heavily. Only nukes attackers OR people who propagandised him. When he commits to violence, it's all-out. Chainsaw imagery throughout.

### Pre-round mood
- *(chainsaw revs, faintly)* [system narration]
- "¡Viva la libertad, carajo!" [real]
- "Banking. Cooking." [style]
- "The state is a pedophile in a kindergarten. We will not be like the state." [real]

### Launch (only when triggered — all-out commit)
- "**¡AFUERA!**" [real]
- "**¡AFUERA!** **¡AFUERA!** **¡AFUERA!**" *(repeated as warheads fly)* [style]
- "Every state intervention is an act of force. This is our act of force." [real-pattern]
- "We are dynamiting them. Like a Central Bank." [real-pattern]

### Hit / damaged
- "Every time the state intervenes, it's a violent action. They have intervened." [real-pattern]
- "**¡AFUERA!** **¡AFUERA!** **¡AFUERA!**" *(triggers all-out commit next round)* [style]

### Wooing send (Milei's heavy diplomatic phase)
- "We share a love of liberty, my friend. ¡Viva la libertad!" [style]
- "You and I — we are the two true anarcho-capitalists at this table." [style]
- "Together we will dynamite the things that need dynamiting." [style]

### Being wooed
- "Your wooing is *received*. ¡Carajo!" [style]
- *(chainsaw lowers slightly)* [system narration]

### Propaganda send
- "Pamphlets dropped. They read: '¡AFUERA!'" [style]
- "Their state is a pedophile in a kindergarten. Spread the word." [real-pattern]

### Propaganda receive (TRIGGERS all-out attack next round)
- *(chainsaw revs sharply)* "**¡AFUERA!**" [style]
- "They have propagandised us. This is an act of force. We respond in kind." [style]

### Build factory (rare — Milei doesn't really build)
- "Productive capacity. Yes. As long as it is not subsidised." [style]

### Build defence (rare — Milei skips defences)
- *(no defences. He has chosen offence. He always chooses offence.)* [system narration]

### Reaction (post-round)
- "Banking. Cooking. ¡Viva la libertad, carajo!" [style]
- "**¡AFUERA!**" *(when an attack landed)* [style]
- "Liberty advances. Even slightly. Slightly is something." [style]

### Death
- "¡Viva la liber—" *(chainsaw silent)* [style]

### Final Retaliation
- "**¡AFUERA!** **¡AFUERA!** **¡AFUERA!**" *(every chainsaw revs at once)* [style]

---

## Nigel Disparage 🇬🇧 — *(cameo, non-playable)*

The disgraced Member for Clacton (allegedly). Pops up uninvited to criticise. Has no AP, no country, no assets, can't be attacked. Two trigger surfaces:

**1. Action screen — "FROM CLACTON" cameo overlay** *(~15–20% chance after each launch lands)*

A small portrait popup in the bottom-right corner with a "FROM CLACTON" tag (parody of "FROM OUR REPORTER"), one line of dialogue, auto-dismisses after ~2s. Visual: smug expression, often holding a pint.

**2. Round Summary newspaper — "THE DISPARAGE COLUMN"** *(~1 round in 3)*

A small sidebar column under the World Reactions section. Always headed "THE DISPARAGE COLUMN — From his Clacton office (allegedly)" and footered with a parenthetical absentee-MP note like "*Mr Disparage was unavailable for follow-up; he was reportedly photographing himself at a pub.*"

His column **never proposes a counterfactual** — only criticises what just happened. The footer always references his actual MP-record critique (skipped Parliament, photo-ops, US trips, no surgeries).

### Action-screen one-liners (cameo overlay)

- "If I were in charge, this wouldn't be happening. Probably." [style]
- "Disgraceful. Anyway, off to America again." [style + real MP record]
- "All the charisma of a damp rag and the diplomatic skills of a low-grade bank clerk." [real, EU insult repurposed]
- "We want our country back. From all this." [style + real]
- "I told you. I told them all. Now look." [style]
- "Two-tier policing. No further comment. Yet." [style]
- "Frit. The lot of them." [style — Brexit-era political slang]

### Newspaper-column lines (Round Summary sidebar)

- "I'd have done this much better if I were leader. Pint?"
- "We love war. We just hate the wars run by other people." *(parody of his real "we love Europe, we just hate the EU")*
- "I haven't had time for a constituent surgery — I've been shouting about this on television. Priorities."
- "Disgusting. Disgraceful. I'd have got our country back. Faster. Without all this. Anyway, off to America."
- "Make no mistake: this is what happens when you don't elect me. Pints."
- "The Establishment did this. The Blob. The Quango. The Whoever. Not me."
- "I told them. They didn't listen. They're paying for it now. So am I, in pints."

### Footer absentee-MP notes (rotated)

- "Mr Disparage was unavailable for follow-up; he was photographing himself at a pub."
- "Mr Disparage's office referred us to GB News, where he was on air for the eighth time this week."
- "Mr Disparage was scheduled for a constituent surgery, but is currently in Florida."
- "Mr Disparage's voting record this Parliament is grade E. He could not be reached for comment."
- "This column was filed from outside the House of Commons, where Mr Disparage has not been seen since Tuesday."

### Snap-back lines (added to other leaders' banks)

When Nigel Disparage's column criticises a specific leader by name, that leader's next-round mood line on the Planning screen can snap back. These slot into each leader's `preRoundMood` category as conditional lines triggered by `disparage_just_named_me`:

- **Chump** (snap-back): "Nigel? Tremendous guy. Should be running things over there."
- **Mileigh-hem** (snap-back): "AFUERA, salesman!"
- **Carnage** (snap-back): "Elbows up. Pint down."
- **Netanyahoo** (snap-back): "Disparage's red line is the bar tab."
- **Burn'em** (snap-back): "I've heard what he said. We rise above it up here, don't we? Anyway, he's barred from the tram."
- **Khameneverhere** (snap-back): *(no audio of Khameneverhere is available — his cardboard cutout faces away from the GB News studio.)*

---

## Newspaper masthead rotation (Round Summary screen)

The Round Summary front page rotates a masthead each round. Pool below — shuffled at game start, one per round. **Apocalypse round always overrides to "THE END TIMES — FINAL EDITION"** as the bookend.

**Real-world parodies:**
- **The Grauniad** — Guardian (typos)
- **The Torygraph** — Telegraph (Tory bias)
- **The Daily Wail** — Daily Mail (outrage tone)
- **The Mop and Pail** — Globe and Mail, Canada
- **The Old Gray Lady** — New York Times (affectionate)
- **The Failing New York Times** — Trump's signature insult; meta-parody since Chump's in the game
- **The LA Slimes** — LA Times (insulting)
- **McPaper** — USA Today (bite-sized)
- **The Granny Herald** — Sydney Morning Herald
- **Pravda** — Russian "Truth", used ironically in English

**Nuke-themed originals:**
- **The End Times** — used in the apocalypse-final-edition card
- **The Daily Detonator**
- **The Doomscroll Daily**
- **The Mushroom Cloud Times**
- **The Fallout Express**

Subtitle line stays consistent across mastheads: `VOL. {round-roman} · ROUND {n} · MORNING EDITION · FREE WHILE STOCKS LAST`.

---

## Generic fallbacks (system-narration register)

When a leader has no eligible line for a moment, fall back to neutral tabloid narration. Used as templates with substitution:

- "{leader} has filed orders."
- "{leader} took {damage}M casualties."
- "{leader}'s {assetType} stockpile decreased by {n}."
- "{leader} has been eliminated."
- "{leader} launches Final Retaliation."

These should be rare — the per-leader banks should cover all common moments.

---

## How to add lines

1. Identify the moment (planning mood, launch, hit, etc.).
2. Write 2-3 candidate lines in the leader's voice.
3. Tag `[real]` (with source attribution) or `[style]` (invented).
4. Add to the relevant section above. The engine picks at random with no repetition within the same round.

## Authoring guidance

- **Length**: most lines fit on one line of the Reactions screen card. ~80-150 chars sweet spot.
- **Voice**: lean into the leader's catchphrases and tics. A line that could come from any leader is a wasted line.
- **Khamenei-specific**: always pair extremism with a banal domestic gripe. Always.
- **Avoid contemporary partisan attack content**: this is a parody of personas, not an editorial.
- **No real ethnic, religious, or violent slurs**: parody can punch up without using slurs. The original 1989 game is the tonal model.
