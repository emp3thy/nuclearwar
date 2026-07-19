import type { ScreenProps } from '../App';
import type { GameState, LeaderId, ResolutionEvent } from '../../engine/types';
import { pickMasthead } from '../../engine/masthead';
import { isHuman } from '../../engine/state';
import { extractFlag } from '../portraits';
import Portrait from '../components/Portrait';
import MushroomCloudPhoto from '../components/MushroomCloudPhoto';
import DisparageColumn from '../components/DisparageColumn';
import { Btn, RelBadge, Stamp } from '../components/comic';
import {
  BOX_SCORE_EMPTY,
  CLASSIFIEDS,
  deriveBoxScore,
  deriveForecast,
  deriveMarket,
  derivePhotoCaption,
  deriveStories,
  pickCorrection,
} from '../util/newspaper';
import styles from './RoundSummary.module.css';

function pickHeadline(
  events: ResolutionEvent[],
  leaders: GameState['leaders'],
  prevPopulations: Partial<Record<LeaderId, number>>,
  round: number,
  outcome: GameState['outcome'],
): string {
  if (outcome?.type === 'apocalypse') return 'THE END.';

  const elims = events.filter((e): e is Extract<ResolutionEvent, { kind: 'LeaderEliminated' }> =>
    e.kind === 'LeaderEliminated',
  );
  if (elims.length > 0) return `${leaders[elims[0].id].name.toUpperCase()} ELIMINATED`;

  let worstId: LeaderId | null = null;
  let worstDelta = 0;
  for (const idStr of Object.keys(prevPopulations)) {
    const id = idStr as LeaderId;
    const prev = prevPopulations[id]!;
    const delta = leaders[id].population - prev;
    if (delta < worstDelta) { worstDelta = delta; worstId = id; }
  }
  if (worstId !== null && worstDelta <= -10) return `${leaders[worstId].name.toUpperCase()} CLOBBERED`;
  if (worstId !== null && worstDelta <= -3) return `${leaders[worstId].name.toUpperCase()} STRUCK`;
  return `ROUND ${round - 1} SETTLES`;
}

export function pickSubhead(events: ResolutionEvent[], leaders: GameState['leaders']): string {
  // Sum people-deaths per attacker→target pair, then name the biggest pairing.
  // A single round can land several strikes from one attacker on one target;
  // the subhead must report the total, not the largest single hit.
  const pairs = new Map<string, { from: LeaderId; target: LeaderId; deaths: number }>();
  for (const e of events) {
    if (e.kind !== 'ImpactPeople') continue;
    const k = `${e.from}|${e.target}`;
    const cur = pairs.get(k);
    if (cur) cur.deaths += e.deaths;
    else pairs.set(k, { from: e.from, target: e.target, deaths: e.deaths });
  }
  const all = [...pairs.values()];
  if (all.length === 0) return 'No casualties this round.';
  let biggest = all[0];
  for (const p of all) if (p.deaths > biggest.deaths) biggest = p;
  return `${leaders[biggest.from].name} hits ${leaders[biggest.target].name} for ${biggest.deaths}M.`;
}

export default function RoundSummary({ state, dispatch }: ScreenProps) {
  const game = state.game!;
  const reportedRound = game.round - 1;
  const headline = pickHeadline(state.events, game.leaders, state.prevPopulations, game.round, game.outcome);
  const subhead = pickSubhead(state.events, game.leaders);

  const thisRoundLost = Object.entries(state.prevPopulations).reduce<number>((acc, [idStr, prev]) => {
    if (prev === undefined) return acc;
    const id = idStr as LeaderId;
    return acc + Math.max(0, prev - game.leaders[id].population);
  }, 0);
  const warTotalLost = Object.entries(state.initialPopulations).reduce<number>((acc, [idStr, init]) => {
    const id = idStr as LeaderId;
    if (init === undefined) return acc;
    return acc + Math.max(0, init - game.leaders[id].population);
  }, 0);
  const survivors = game.cast.filter((id) => game.leaders[id].alive).length;
  const survivorsPop = game.cast.reduce((acc, id) => acc + game.leaders[id].population, 0);

  const forecast = deriveForecast(thisRoundLost);
  const market = deriveMarket(game, state.prevPopulations);
  const boxScore = deriveBoxScore(state.events, game.leaders);
  const stories = deriveStories(game, state.events, state.prevPopulations);
  const photoCaption = derivePhotoCaption(state.events, game.leaders);
  const lostStamp = thisRoundLost > 0 ? `−${thisRoundLost}M` : undefined;

  // Eliminated this round = alive=false AND prev > 0 (detection preserved).
  const obits = game.cast.flatMap((id) => {
    const leader = game.leaders[id];
    const prev = state.prevPopulations[id];
    if (leader.alive || prev === undefined || prev <= 0) return [];
    const death = state.events.find(
      (e): e is Extract<ResolutionEvent, { kind: 'LeaderEliminated' }> =>
        e.kind === 'LeaderEliminated' && e.id === id,
    );
    return [{ id, name: leader.name, line: death?.quote ?? 'Gone, and swiftly forgotten.' }];
  });

  const disparage = state.events.find(
    (e): e is Extract<ResolutionEvent, { kind: 'DisparageColumn' }> => e.kind === 'DisparageColumn',
  );

  const flagFor = (id: LeaderId) =>
    isHuman(id) ? extractFlag(game.leaders[id].country) : undefined;

  const continueLabel = game.outcome ? 'Final Verdict' : `Round ${game.round} → Plan`;

  return (
    <div className={styles.summary}>
      <div className={`${styles.sheet} paper`}>
        {/* Masthead */}
        <header className={styles.masthead}>
          <div className={styles.mastheadKicker}>EXTRA · EXTRA · EXTRA</div>
          <h1 className={styles.mastheadTitle}>
            {pickMasthead(game.mastheadOrder, game.round - 1, game.outcome)}
          </h1>
          <div className={styles.ruleLine}>
            <span>VOL. IV · ROUND {reportedRound}</span>
            <span>MORNING EDITION</span>
            <span>FREE WHILE STOCKS LAST</span>
          </div>
        </header>

        <div className={styles.summaryGrid}>
          {/* Main column */}
          <div>
            <div className={styles.headlineWrap}>
              <h2 className={`${styles.headline} ${game.outcome?.type === 'apocalypse' ? styles.theEnd : ''}`}>
                {headline}
              </h2>
              {lostStamp !== undefined && (
                <div className={styles.headlineStamp}>
                  <Stamp color="magenta" rotate={8}>{lostStamp}</Stamp>
                </div>
              )}
            </div>
            <p className={styles.standfirst}>{subhead}</p>

            <MushroomCloudPhoto stampText={lostStamp} caption={photoCaption} />

            <div className={styles.casualtyStrip}>
              <div>
                <div className={styles.casualtyLabel}>THIS ROUND</div>
                <div className={`${styles.casualtyValue} ${styles.casualtyMagenta}`}>−{thisRoundLost}M</div>
              </div>
              <div>
                <div className={styles.casualtyLabel}>WAR TO DATE</div>
                <div className={styles.casualtyValue}>−{warTotalLost}M</div>
              </div>
              <div>
                <div className={styles.casualtyLabel}>SURVIVORS</div>
                <div className={`${styles.casualtyValue} ${styles.casualtyGreen}`}>{survivorsPop}M</div>
              </div>
              <div>
                <div className={styles.casualtyLabel}>LEADERS LEFT</div>
                <div className={styles.casualtyValue}>{survivors}/{game.cast.length}</div>
              </div>
            </div>

            <div className={styles.sectionHead}>★ FROM AROUND THE RUBBLE ★</div>
            <div className={styles.storyFlow}>
              {stories.map((s) => (
                <article key={s.id} className={`${styles.newsStory} ${s.lead ? styles.lead : ''}`}>
                  <div className={styles.storyKicker}>{s.kicker}</div>
                  <h3 className={styles.storyHeadline}>{s.headline}</h3>
                  <div className={styles.storyByline}>
                    <span className={styles.bylineWho}>by our {s.bylineCountry} correspondent</span>
                    <span
                      className={`${styles.bylineDelta} ${
                        s.delta.kind === 'harm' ? styles.deltaHarm
                        : s.delta.kind === 'gain' ? styles.deltaGain
                        : styles.deltaNeutral
                      }`}
                    >
                      {s.delta.text}
                    </span>
                  </div>
                  <div className={styles.storyPortrait}>
                    <Portrait leaderId={s.id} size={s.lead ? 72 : 46} flag={flagFor(s.id)} />
                  </div>
                  <p className={styles.storyBody}>{s.body}</p>
                  {s.pullquote !== undefined && (
                    <p className={styles.storyPull}>"{s.pullquote}"</p>
                  )}
                  {s.badges.length > 0 && (
                    <div className={styles.storyTags}>
                      {s.badges.map((b, j) => (
                        <RelBadge key={j} kind={b.kind}>{b.text}</RelBadge>
                      ))}
                    </div>
                  )}
                </article>
              ))}
            </div>
          </div>

          {/* Sidebar */}
          <aside className={styles.sidebar}>
            <section className={styles.sideSec}>
              <div className={styles.sideHead}>THE FORECAST</div>
              <div className={styles.forecastTop}>
                <div>
                  <div className={styles.forecastOutlook}>{forecast.outlook}</div>
                  <div className={styles.forecastTemp}>
                    {forecast.temp} <span className={styles.forecastTempLabel}>{forecast.tempLabel}</span>
                  </div>
                </div>
                <div className={styles.uvBlock}>
                  <div className={styles.uvLabel}>UV INDEX</div>
                  <div className={styles.uvValue}>{'☢'.repeat(forecast.uv)}</div>
                </div>
              </div>
              <table className={styles.sideTable}>
                <tbody>
                  {forecast.rows.map((r) => (
                    <tr key={r.label}>
                      <td className={styles.sideTableLabel}>{r.label}</td>
                      <td className={styles.sideTableValue}>{r.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            <section className={styles.sideSec}>
              <div className={styles.sideHead}>MARKET REPORT</div>
              <div className={styles.marketSub}>Population exchange · close of round</div>
              <div className={styles.ticker}>
                {market.map((m) => (
                  <div key={m.id} className={styles.tickerRow}>
                    <span className={styles.tickerSym}>{m.sym}</span>
                    <span
                      className={`${styles.tickerChange} ${
                        m.change > 0 ? styles.deltaGain : m.change < 0 ? styles.deltaHarm : styles.deltaNeutral
                      }`}
                    >
                      {m.arrow} {Math.abs(m.change)}%
                    </span>
                    <span className={styles.tickerNote}>{m.note}</span>
                  </div>
                ))}
              </div>
            </section>

            <section className={styles.sideSec}>
              <div className={styles.sideHead}>TONIGHT'S EXCHANGES</div>
              {boxScore.length === 0 ? (
                <div className={styles.boxScoreEmpty}>{BOX_SCORE_EMPTY}</div>
              ) : (
                <table className={`${styles.sideTable} ${styles.boxscore}`}>
                  <tbody>
                    {boxScore.map((r, i) => (
                      <tr key={i}>
                        <td className={styles.boxScoreNames}>
                          {r.a} <span className={styles.boxScoreArrow}>›</span> {r.b}
                        </td>
                        <td
                          className={`${styles.boxScoreScore} ${
                            r.tone === 'good' ? styles.boxScoreGood : styles.boxScoreHarm
                          }`}
                        >
                          {r.score}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>

            <section className={styles.sideSec}>
              <div className={styles.sideHead}>OBITUARIES</div>
              {obits.length === 0 ? (
                <div className={styles.obitEmpty}>None yet. Everyone's still here. Give it a round.</div>
              ) : (
                obits.map((o) => (
                  <div key={`obit-${o.id}`} className={styles.obit}>
                    <div className={styles.obitName}>{o.name}</div>
                    <div className={styles.obitLine}>{o.line}</div>
                  </div>
                ))
              )}
            </section>

            {disparage !== undefined && <DisparageColumn event={disparage} />}

            <section className={styles.sideSec}>
              <div className={styles.sideHead}>CLASSIFIEDS</div>
              {CLASSIFIEDS.map((c) => (
                <p key={c.tag} className={styles.classified}>
                  <strong className={styles.classifiedTag}>{c.tag}</strong>
                  {c.text}
                </p>
              ))}
            </section>

            <div className={styles.adBlock}>
              <div className={styles.adLabel}>ADVERTISEMENT</div>
              <div className={styles.adTitle}>NUCLEAR<br />DUCKS</div>
              <div className={styles.adCopy}>
                If it walks, talks, and quacks — it's covered. Limited supply.
              </div>
            </div>
          </aside>
        </div>

        {/* Corrections & Clarifications */}
        <div className={styles.correctionsBox}>
          <span className={styles.correctionsLabel}>CORRECTIONS &amp; CLARIFICATIONS</span>
          <span className={styles.correctionsLine}>{pickCorrection(reportedRound)}</span>
        </div>

        {/* Continue bar */}
        <div className={styles.continueBar}>
          <Btn variant="primary" size="xl" onClick={() => dispatch({ type: 'NEXT_ROUND' })}>
            {continueLabel}
          </Btn>
        </div>
      </div>
    </div>
  );
}
