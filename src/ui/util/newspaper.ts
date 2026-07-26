/**
 * newspaper.ts — pure derivation for the RoundSummary tabloid front page.
 *
 * Typed section models (forecast, market, box score, news stories, photo
 * caption, corrections) computed from live game state + the round's
 * ResolutionEvents. No React.
 */
import type { GameState, LeaderId, ResolutionEvent } from '../../engine/types';
import { stripFlag } from '../portraits';

export type BadgeKind = 'harm' | 'gain' | 'neutral';

/* ============================================================
 * THE FORECAST
 * ============================================================ */

export interface ForecastRow {
  label: string;
  value: string;
}

export interface Forecast {
  outlook: string;
  temp: string;
  tempLabel: string;
  /** Number of ☢ glyphs to render for the UV index. */
  uv: number;
  rows: ForecastRow[];
}

/**
 * Fallout tiers by `thisRoundLost`. Deliberate divergence from the mock:
 * data.jsx pairs HEAVY with uv 5; this ladder reserves UV 5 for BIBLICAL so
 * the scale has headroom (spec §4.1). Do not "fix" it back.
 */
const FORECAST_TIERS = {
  none: { outlook: 'FALLOUT: NONE', temp: '20°', tempLabel: 'seasonal, suspicious', uv: 1 },
  light: { outlook: 'FALLOUT: LIGHT', temp: '400°', tempLabel: 'localised high', uv: 2 },
  heavy: { outlook: 'FALLOUT: HEAVY', temp: '1,200°', tempLabel: 'ground zero high', uv: 4 },
  biblical: { outlook: 'FALLOUT: BIBLICAL', temp: '5,800°', tempLabel: 'surface of the sun, briefly', uv: 5 },
};

/**
 * Ironic row-set variants, keyed by whether this round drew blood. Rotating
 * by round (rather than by the finer-grained fallout tier) keeps the same
 * "hit"/"calm" state reading differently round-to-round (spec §2.3).
 */
type RowSet = ForecastRow[];

const CALM_ROWSETS: RowSet[] = [
  [
    { label: 'Fallout', value: 'None reported' },
    { label: 'Visibility', value: 'Unlimited. For now.' },
    { label: 'Wind', value: 'Light breeze' },
    { label: 'Outlook', value: 'Worse. Always worse.' },
  ],
  [
    { label: 'Fallout', value: 'None reported. Suspicious.' },
    { label: 'Visibility', value: 'Unlimited. Make the most of it.' },
    { label: 'Wind', value: 'Calm, ominously so.' },
    { label: 'Outlook', value: 'Fine. For now.' },
  ],
  [
    { label: 'Fallout', value: 'Nothing on the wind but rumour.' },
    { label: 'Visibility', value: 'Clear. Historians will note the date.' },
    { label: 'Wind', value: 'Light breeze, holding its breath.' },
    { label: 'Outlook', value: 'A pause. Not a peace.' },
  ],
];

const HIT_ROWSETS: RowSet[] = [
  [
    { label: 'Fallout', value: 'Confirmed. Drifting east, as fallout does.' },
    { label: 'Visibility', value: 'Nil to 200 yards.' },
    { label: 'Wind', value: 'Mushroom-shaped, gusting to apocalyptic.' },
    { label: 'Outlook', value: 'Worse. Always worse.' },
  ],
  [
    { label: 'Fallout', value: 'Present and accounted for.' },
    { label: 'Visibility', value: 'Nil to 200 yards, improves once the dust is you.' },
    { label: 'Wind', value: 'Brisk, radioactive, unseasonal.' },
    { label: 'Outlook', value: 'Unseasonably terminal.' },
  ],
  [
    { label: 'Fallout', value: 'Heavier than advertised.' },
    { label: 'Visibility', value: "Ash-limited. Bring a torch, or don't bother." },
    { label: 'Wind', value: 'Gusting toward whichever border complains loudest.' },
    { label: 'Outlook', value: 'Grim, with a chance of grimmer.' },
  ],
];

export function deriveForecast(thisRoundLost: number, reportedRound: number): Forecast {
  const tier =
    thisRoundLost === 0 ? FORECAST_TIERS.none :
    thisRoundLost <= 5 ? FORECAST_TIERS.light :
    thisRoundLost <= 14 ? FORECAST_TIERS.heavy :
    FORECAST_TIERS.biblical;

  const sets = thisRoundLost > 0 ? HIT_ROWSETS : CALM_ROWSETS;
  const rows = sets[(reportedRound - 1) % sets.length];

  return {
    outlook: tier.outlook,
    temp: tier.temp,
    tempLabel: tier.tempLabel,
    uv: tier.uv,
    rows,
  };
}

/* ============================================================
 * ADVERTISEMENT
 * ============================================================ */

export interface Advert {
  title: string;
  body: string;
}

/**
 * Locked 15-entry pool (spec §2.1): original surreal inanity + prepper spoof,
 * Nuclear Ducks / Tinned Sunshine register. No borrowed comedy quotes.
 */
export const ADVERTS: readonly Advert[] = [
  { title: 'Nuclear Ducks', body: 'They float. They glow. They outlive you. £2 each, 3 for the end of the world.' },
  { title: 'Tinned Sunshine', body: 'Open in the event of nuclear winter. May contain bees. Definitely contains bees. Aisle 4, keeps for years.' },
  { title: 'Powdered Optimism', body: 'Just add water and look away. One tub lasts a whole denial. Now hope-free.' },
  { title: 'A Small Amount of Later', body: 'Buy time. Not much. Some. Terms shorter than expected.' },
  { title: 'Pre-Apologised Letters', body: 'Regret, posted in advance. Box of 50, stamps optional.' },
  { title: 'Spare Ceiling', body: 'For when yours leaves suddenly. Fits most skies. Flat-packed, like everything now.' },
  { title: 'Genuine Distance', body: 'Put some between yourself and things. Miles or feelings. By the yard, cut to length.' },
  { title: 'Assorted Consequences', body: "Grab bag. Some yours, some the neighbours'. No refunds, obviously." },
  { title: 'Emergency Trousers (B)', body: "Filling a need — because you've filled yours. Sold in pairs; you'll go through the first." },
  { title: 'Emergency Trousers (C)', body: 'The alert came. So did you. Step into something dignified. Or these.' },
  { title: 'Your Own Private Nuke', body: 'Why wait for a superpower? Deter the neighbours today. Collateral: the neighbours. 0% APR, 100% MAD.' },
  { title: 'The Family-Size Warhead', body: 'Big enough to share. Nobody will. Serves everyone, once.' },
  { title: 'Backyard Silo Kit', body: 'Turn that unloved patio into mutually assured deterrence. Flat-packed, spade not included.' },
  { title: 'The Doomsday Direct-Debit', body: "Prep now, pay later. There is no later. Prep now. Cancel anytime (you can't)." },
  { title: "Prepper's Pantry", body: "Forty years of beans for the forty minutes you have left. You've always bean prepared. Bulk only." },
];

export function pickAdvert(reportedRound: number): Advert {
  return ADVERTS[(reportedRound - 1) % ADVERTS.length];
}

/* ============================================================
 * MARKET REPORT
 * ============================================================ */

export interface MarketRow {
  id: LeaderId;
  sym: string;
  arrow: '▲' | '▬' | '▼';
  /** Signed rounded percent; render with Math.abs. */
  change: number;
  note: string;
}

const AI_SYMS: Partial<Record<LeaderId, string>> = {
  chump: 'USA',
  khameneverhere: 'IRN',
  burnem: 'UK',
  carnage: 'CAN',
  'mileigh-hem': 'ARG',
  netanyahoo: 'ISR',
};

function tickerSym(id: LeaderId, country: string): string {
  // Humans can enter any country name, so the deterministic first-3-chars
  // rule wins over hand-tuned abbreviations ('🦆 Freedonia' → FRE, not the
  // mock's FRD — spec §4.2 deliberate divergence).
  return AI_SYMS[id] ?? stripFlag(country).toUpperCase().slice(0, 3);
}

/** One ticker row per cast member, including the dead. */
export function deriveMarket(
  game: GameState,
  prevPopulations: Partial<Record<LeaderId, number>>,
): MarketRow[] {
  return game.cast.map((id) => {
    const leader = game.leaders[id];
    const prev = prevPopulations[id] ?? 0;
    const change = prev > 0 ? Math.round(((leader.population - prev) / prev) * 100) : 0;
    const note =
      !leader.alive ? 'delisted' :
      change <= -20 ? 'clobbered' :
      change < 0 ? 'down' :
      change === 0 ? 'holds' : 'up';
    return {
      id,
      sym: tickerSym(id, leader.country),
      arrow: change > 0 ? '▲' : change < 0 ? '▼' : '▬',
      change,
      note,
    };
  });
}

/* ============================================================
 * TONIGHT'S EXCHANGES (box score)
 * ============================================================ */

export interface BoxScoreRow {
  a: string;
  b: string;
  score: string;
  tone: 'harm' | 'good';
}

export const BOX_SCORE_EMPTY = 'No exchanges. The censors are baffled.';

function shortName(name: string): string {
  return name.length > 9 ? `${name.slice(0, 9)}.` : name;
}

/**
 * One row per qualifying event, in event order. Intercept rows render
 * `{attacker} › {defender}` (spec §4.3 deliberate divergence from the mock's
 * `{defender} › —` form).
 */
export function deriveBoxScore(
  events: ResolutionEvent[],
  leaders: GameState['leaders'],
): BoxScoreRow[] {
  const rows: BoxScoreRow[] = [];
  for (const e of events) {
    if (e.kind === 'ImpactPeople') {
      rows.push({
        a: shortName(leaders[e.from].name),
        b: shortName(leaders[e.target].name),
        score: `−${e.deaths}M`,
        tone: 'harm',
      });
    } else if (e.kind === 'ImpactInfrastructure') {
      rows.push({
        a: shortName(leaders[e.from].name),
        b: shortName(leaders[e.target].name),
        score: `−${e.factoriesDestroyed} fac`,
        tone: 'harm',
      });
    } else if (e.kind === 'MissileIntercepted') {
      rows.push({
        a: shortName(leaders[e.from].name),
        b: shortName(leaders[e.to].name),
        score: 'INTERCEPT',
        tone: 'good',
      });
    }
  }
  return rows;
}

/* ============================================================
 * NEWS STORIES — "FROM AROUND THE RUBBLE"
 * ============================================================ */

export interface StoryBadge {
  kind: BadgeKind;
  text: string;
}

export interface NewsStory {
  id: LeaderId;
  lead: boolean;
  kicker: string;
  headline: string;
  /** Flag-stripped country for "by our {country} correspondent". */
  bylineCountry: string;
  delta: { text: string; kind: BadgeKind };
  body: string;
  pullquote?: string;
  badges: StoryBadge[];
}

const AI_KICKERS: Partial<Record<LeaderId, string>> = {
  chump: 'MAR-A-LAGO',
  carnage: 'PARLIAMENT HILL',
  khameneverhere: 'LOCATION UNDISCLOSED',
  netanyahoo: 'THE KIRYA, TEL AVIV',
  burnem: 'WESTMINSTER',
  'mileigh-hem': 'CASA ROSADA',
};

interface RoundFacts {
  popDelta: number;
  peopleLost: number;
  attackers: LeaderId[];
  factoriesLost: number;
  interceptedAsDefender: boolean;
  launches: number;
  propagandaReceived: number;
  propagandaSent: number;
  factoryBuilt: boolean;
  wooTarget: LeaderId | null;
}

function collectFacts(
  id: LeaderId,
  events: ResolutionEvent[],
  cur: number,
  prev: number | undefined,
): RoundFacts {
  const facts: RoundFacts = {
    popDelta: prev === undefined ? 0 : cur - prev,
    peopleLost: 0,
    attackers: [],
    factoriesLost: 0,
    interceptedAsDefender: false,
    launches: 0,
    propagandaReceived: 0,
    propagandaSent: 0,
    factoryBuilt: false,
    wooTarget: null,
  };
  for (const e of events) {
    switch (e.kind) {
      case 'ImpactPeople':
        if (e.target === id) {
          facts.peopleLost += e.deaths;
          if (!facts.attackers.includes(e.from)) facts.attackers.push(e.from);
        }
        break;
      case 'ImpactInfrastructure':
        if (e.target === id) facts.factoriesLost += e.factoriesDestroyed;
        break;
      case 'MissileIntercepted':
        if (e.to === id) facts.interceptedAsDefender = true;
        break;
      case 'MissileLaunched':
        if (e.from === id) facts.launches += 1;
        break;
      case 'PropagandaTransfer':
        if (e.to === id) facts.propagandaReceived += e.amount;
        if (e.from === id) facts.propagandaSent += e.amount;
        break;
      case 'FactoryBuilt':
        if (e.by === id) facts.factoryBuilt = true;
        break;
      case 'WooApplied':
        if (e.from === id && facts.wooTarget === null) facts.wooTarget = e.to;
        break;
    }
  }
  return facts;
}

/** Headline template by the leader's dominant round condition — first match wins (spec §3.4). */
function storyHeadline(name: string, f: RoundFacts): string {
  const NAME = name.toUpperCase();
  if (f.popDelta <= -10) return `${NAME} DIGS OUT, BLAMES EVERYONE`;
  if (f.popDelta < 0) return `${NAME} SHRUGS OFF LIGHT VAPORISATION`;
  if (f.launches > 0) return `${NAME} PRESSES BUTTON, FEELS BETTER`;
  if (f.interceptedAsDefender) return `DEFENCES HOLD; ${NAME} INSUFFERABLE`;
  if (f.factoryBuilt) return 'GROUNDBREAKING CEREMONY HELD';
  if (f.propagandaSent > 0) return 'LEAFLETS AWAY; NEIGHBOURS FURIOUS';
  if (f.wooTarget !== null) return `${NAME} SPOTTED BEING NICE; MOTIVE UNKNOWN`;
  return `${NAME} DOES NOTHING, CALLS IT STRATEGY`;
}

/** 1–3 sentences, in fixed precedence order, from categories present this round. */
function storyBody(f: RoundFacts, leaders: GameState['leaders']): string {
  const sentences: string[] = [];
  if (f.peopleLost > 0) {
    sentences.push(
      f.attackers.length === 1
        ? `A strike from ${leaders[f.attackers[0]].name} removed ${f.peopleLost} million citizens from the census.`
        : `A strike removed ${f.peopleLost} million citizens from the census.`,
    );
  }
  if (f.factoriesLost > 0) {
    sentences.push(
      f.factoriesLost === 1
        ? '1 factory now qualifies as open-plan.'
        : `${f.factoriesLost} factories now qualify as open-plan.`,
    );
  }
  if (f.interceptedAsDefender) {
    sentences.push('Air defences held; one incoming warhead retired over open water.');
  }
  if (f.launches > 0) {
    sentences.push(
      f.launches === 1
        ? '1 launch order was filed and, regrettably, executed.'
        : `${f.launches} launch orders were filed and, regrettably, executed.`,
    );
  }
  if (f.propagandaReceived > 0) {
    sentences.push(`${f.propagandaReceived} million citizens defected after reading a leaflet.`);
  }
  if (f.propagandaSent > 0) {
    sentences.push(`Leaflet drops persuaded ${f.propagandaSent} million foreigners to relocate.`);
  }
  if (f.factoryBuilt) {
    sentences.push('Ground was broken on a new factory.');
  }
  if (f.wooTarget !== null) {
    sentences.push(`Diplomatic flowers were dispatched to ${leaders[f.wooTarget].name}.`);
  }
  if (sentences.length === 0) {
    return 'No orders of consequence were filed. Analysts describe the restraint as "suspicious."';
  }
  return sentences.slice(0, 3).join(' ');
}

/**
 * One story per living cast member. The lead (largest population loss this
 * round; cast-order tiebreak; first living leader when nobody lost) is
 * ordered FIRST so its `column-span: all` block doesn't split the 2-column
 * flow mid-stream (spec §3.4 DOM order).
 */
export function deriveStories(
  game: GameState,
  events: ResolutionEvent[],
  prevPopulations: Partial<Record<LeaderId, number>>,
): NewsStory[] {
  const living = game.cast.filter((id) => game.leaders[id].alive);
  if (living.length === 0) return [];

  let leadId = living[0];
  let leadLoss = 0;
  for (const id of living) {
    const prev = prevPopulations[id];
    const loss = prev === undefined ? 0 : Math.max(0, prev - game.leaders[id].population);
    if (loss > leadLoss) {
      leadLoss = loss;
      leadId = id;
    }
  }

  const ordered = [leadId, ...living.filter((id) => id !== leadId)];
  return ordered.map((id) => {
    const leader = game.leaders[id];
    const prev = prevPopulations[id];
    const cur = leader.population;
    const facts = collectFacts(id, events, cur, prev);
    const reaction = events.find(
      (e): e is Extract<ResolutionEvent, { kind: 'PostRoundReaction' }> =>
        e.kind === 'PostRoundReaction' && e.leaderId === id,
    );

    const delta: NewsStory['delta'] =
      prev !== undefined && prev !== cur
        ? { text: `${prev}M → ${cur}M`, kind: cur < prev ? 'harm' : 'gain' }
        : { text: `${cur}M`, kind: 'neutral' };

    const badges: StoryBadge[] = [];
    if (facts.popDelta < 0) badges.push({ kind: 'harm', text: `−${-facts.popDelta}M citizens` });
    if (facts.popDelta > 0) badges.push({ kind: 'gain', text: `+${facts.popDelta}M citizens` });
    if (facts.factoriesLost > 0) badges.push({ kind: 'harm', text: `−${facts.factoriesLost} factories` });
    if (facts.factoryBuilt) badges.push({ kind: 'gain', text: '+1 factory' });
    if (leader.apBanked > 0) badges.push({ kind: 'neutral', text: `banked ${leader.apBanked} AP` });

    return {
      id,
      lead: id === leadId,
      kicker: AI_KICKERS[id] ?? stripFlag(leader.country).toUpperCase(),
      headline: storyHeadline(leader.name, facts),
      bylineCountry: stripFlag(leader.country),
      delta,
      body: storyBody(facts, game.leaders),
      pullquote: reaction?.quote,
      badges,
    };
  });
}

/* ============================================================
 * PHOTO CAPTION
 * ============================================================ */

/**
 * Caption for the mushroom-cloud "photo". Uses the same summed
 * attacker→target pairing logic as RoundSummary's pickSubhead.
 */
export function derivePhotoCaption(
  events: ResolutionEvent[],
  leaders: GameState['leaders'],
): string {
  const pairs = new Map<string, { target: LeaderId; deaths: number }>();
  for (const e of events) {
    if (e.kind !== 'ImpactPeople') continue;
    const k = `${e.from}|${e.target}`;
    const cur = pairs.get(k);
    if (cur) cur.deaths += e.deaths;
    else pairs.set(k, { target: e.target, deaths: e.deaths });
  }
  const all = [...pairs.values()];
  if (all.length === 0) {
    return 'File photo of a previous detonation. Nothing exploded tonight. Cherish it.';
  }
  let biggest = all[0];
  for (const p of all) if (p.deaths > biggest.deaths) biggest = p;
  const country = stripFlag(leaders[biggest.target].country);
  return `Eyewitness sketch of the impact zone over ${country}. Artist's impression.`;
}

/* ============================================================
 * CORRECTIONS & CLASSIFIEDS (static pools, copy lifted from data.jsx)
 * ============================================================ */

export const CORRECTIONS: readonly string[] = [
  'CORRECTION: Yesterday we reported 14M dead. It was 15M. We regret the optimism.',
  "CORRECTION: Mr Chump was described as 'a stable genius.' This was his description.",
  'CORRECTION: The duck was, in fact, nuclear. We apologise to the duck.',
  'CORRECTION: The Ministry of Defence denies denying anything. We regret the confusion.',
  "CORRECTION: 'Surgical strike' was reviewed by our medical desk and rejected.",
  'CORRECTION: We described the ceasefire as "holding." It was not holding. Nothing is holding.',
  'CORRECTION: The general we quoted has since been promoted, demoted, and promoted again. We regret nothing, because we no longer know what happened.',
  'CORRECTION: An earlier edition named the aggressor. All parties have since claimed the title. We defer to the crater.',
];

export function pickCorrection(reportedRound: number): string {
  return CORRECTIONS[(reportedRound - 1) % CORRECTIONS.length];
}

export interface Classified {
  tag: string;
  text: string;
}

export const CLASSIFIEDS: readonly Classified[] = [
  { tag: 'FOR SALE', text: 'One (1) missile shield, barely used. Buyer collects from crater.' },
  { tag: 'WANTED', text: 'Delivery system for Large warhead. Will not fly itself, apparently.' },
  { tag: 'LOST', text: "Iran's signed orders. Last seen never. Reward: plausible deniability." },
  { tag: 'PERSONAL', text: 'Lonely glass cannon seeks 100% aggression. ¡Viva la libertad, carajo!' },
  { tag: 'FOR SALE', text: 'Slightly-used bunker. One careful owner, several careless neighbours.' },
  { tag: 'WANTED', text: 'Someone to explain the chain of command. Urgently.' },
  { tag: 'FOUND', text: 'One (1) launch key. Turns out it was in the other pocket.' },
  { tag: 'SERVICES', text: 'Will draft a strongly-worded letter to any nation, any grievance. Postage not included.' },
  { tag: 'FOR SALE', text: 'Gently detonated warhead casing. Ideal planter. Some assembly required.' },
  { tag: 'WANTED', text: 'Volunteer to stand closer to the blast, for scientific curiosity.' },
  { tag: 'NOTICE', text: 'The Ministry of Reassurance regrets it has nothing reassuring to say.' },
  { tag: 'PERSONAL', text: 'Retired general, all limbs present, seeks quiet hobby. No missiles, please.' },
  { tag: 'FOR SALE', text: 'Emergency trousers, gently worn. See also: emergency.' },
  { tag: 'WANTED', text: "A neighbour who isn't planning something. Any neighbour." },
  { tag: 'LOST', text: 'The point of all this. Last seen sometime before round one.' },
  { tag: 'SERVICES', text: 'Bunker cleaning, hazard pay negotiable, references from survivors only.' },
];

export function pickClassifieds(reportedRound: number, n = 4): Classified[] {
  const start = (reportedRound - 1) % CLASSIFIEDS.length;
  return Array.from({ length: Math.min(n, CLASSIFIEDS.length) }, (_, i) =>
    CLASSIFIEDS[(start + i) % CLASSIFIEDS.length],
  );
}
