import type { ScreenProps } from '../App';
import type { GameState, LeaderId, WinOutcome } from '../../engine/types';
import { isHuman } from '../../engine/state';
import { extractFlag } from '../portraits';
import Portrait from '../components/Portrait';
import { Btn, Halftone, Panel, RelBadge, Stamp, Tag } from '../components/comic';
import { deriveAwards, humanDemiseLine } from '../util/demise';
import styles from './Winners.module.css';

function pickHeadline(outcome: WinOutcome, leaders: GameState['leaders']): string {
  switch (outcome.type) {
    case 'apocalypse': return 'WINNER: NOBODY';
    case 'survivor':
      return `${leaders[outcome.winner].name.toUpperCase()} WINS`;
    case 'pyrrhic':
      return `LAST TO FALL: ${leaders[outcome.winner].name.toUpperCase()}`;
  }
}

function pickSubLine(
  outcome: WinOutcome,
  leaders: GameState['leaders'],
  initialPopulations: Partial<Record<LeaderId, number>>,
): string {
  switch (outcome.type) {
    case 'apocalypse':
      return 'Total casualties: 100% of starting population. The board is dark.';
    case 'survivor': {
      const winner = leaders[outcome.winner];
      return `${winner.name} rules over ${winner.population}M. The rest are ash.`;
    }
    case 'pyrrhic': {
      const winner = leaders[outcome.winner];
      const initial = initialPopulations[outcome.winner] ?? winner.population;
      return `${winner.name} had ${initial}M when the bombs flew. They have 0M now. So does everyone else. Briefly, they had more.`;
    }
  }
}

export default function Winners({ state, dispatch }: ScreenProps) {
  const game = state.game!;
  const outcome = game.outcome!;
  const headline = pickHeadline(outcome, game.leaders);
  const subLine = pickSubLine(outcome, game.leaders, state.initialPopulations);
  const awards = deriveAwards(game, state.initialPopulations);
  const epitaph = humanDemiseLine(game, state.initialPopulations, 'player1');

  const tollRows = game.cast.map((id) => {
    const leader = game.leaders[id];
    const start = state.initialPopulations[id] ?? leader.population;
    const end = leader.population;
    const pctLost = start === 0 ? 0 : ((start - end) / start) * 100;
    return { id, name: leader.name, country: leader.country, start, end, pctLost };
  });
  tollRows.sort((a, b) => a.pctLost - b.pctLost);

  function newGame() { dispatch({ type: 'BACK_TO_SETUP' }); }
  function sameCast() {
    if (!state.lastNewGameOpts) return newGame();
    dispatch({
      type: 'START_GAME',
      opts: { ...state.lastNewGameOpts, seed: Date.now().toString(36) + Math.random().toString(36).slice(2, 8) },
    });
  }

  const flagFor = (id: LeaderId) =>
    isHuman(id) ? extractFlag(game.leaders[id].country) : undefined;

  return (
    <div className={styles.winners}>
      <Halftone color="rgba(255,255,255,0.06)" />
      <div className={styles.content}>
        <div className={styles.finalTag}>
          <Tag color="yellow" style={{ fontSize: 13, padding: '5px 12px' }}>
            FINAL SCORE · ROUND {game.round - 1}
          </Tag>
        </div>

        <div className={styles.hero}>
          {outcome.type === 'apocalypse' ? (
            <div className={styles.portraitBlock}>
              <div className={styles.apocalypsePanel} aria-hidden="true">☢</div>
              <div className={styles.heroStamp}>
                <Stamp color="magenta" rotate={14} style={{ fontSize: 14, padding: '5px 12px' }}>
                  NO SURVIVORS
                </Stamp>
              </div>
            </div>
          ) : (
            <div className={styles.portraitBlock}>
              <Portrait leaderId={outcome.winner} size={200} flag={flagFor(outcome.winner)} />
              <div className={styles.heroStamp}>
                <Stamp
                  color={outcome.type === 'survivor' ? 'yellow' : 'magenta'}
                  rotate={14}
                  style={{ fontSize: 14, padding: '5px 12px' }}
                >
                  {outcome.type === 'survivor' ? 'SURVIVOR' : 'LAST TO FALL'}
                </Stamp>
              </div>
            </div>
          )}
          <div className={styles.heroText}>
            <h1 className={styles.headline}>{headline}</h1>
            <p className={styles.subline}>"{subLine}"</p>
            <p className={styles.epitaph}>{epitaph}</p>
            <div className={styles.buttonRow}>
              <Btn variant="primary" size="lg" onClick={newGame}>New Game</Btn>
              <Btn size="lg" onClick={sameCast}>Same Cast, Again</Btn>
            </div>
          </div>
        </div>

        {awards.length > 0 && (
          <Panel title="Honours (Dishonours)" style={{ marginTop: 32, background: 'var(--paper)', color: 'var(--ink)' }}>
            <div className={styles.tableScroll}>
              <div className={styles.awardsList}>
                {awards.map((award) => {
                  const leader = game.leaders[award.leaderId];
                  const mine = isHuman(award.leaderId);
                  return (
                    <div
                      key={award.title}
                      className={`${styles.awardRow} ${mine ? styles.awardMine : ''}`}
                    >
                      <span className={styles.awardTitle}>{award.title}</span>
                      <span className={`${styles.cellLeader} ${styles.leaderCell}`}>
                        <Portrait leaderId={award.leaderId} size={36} flag={flagFor(award.leaderId)} />
                        <strong>{leader.name}{mine ? ' (you)' : ''}</strong>
                      </span>
                      <span className={styles.awardDetail}>{award.detail}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </Panel>
        )}

        <Panel title="Death Toll" style={{ marginTop: 32, background: 'var(--paper)', color: 'var(--ink)' }}>
          <div className={styles.tableScroll}>
            <div className={styles.deathTable}>
              <div className={styles.deathHead}>
                <span className={styles.cellLeader}>LEADER</span>
                <span className={styles.cellNum}>START</span>
                <span className={styles.cellNum}>END</span>
                <span className={styles.cellNum}>% LOST</span>
                <span className={styles.cellState}>STATE</span>
              </div>
              {tollRows.map((row) => (
                <div key={row.id} className={styles.deathRow}>
                  <span className={`${styles.cellLeader} ${styles.leaderCell}`}>
                    <Portrait leaderId={row.id} size={36} flag={flagFor(row.id)} />
                    <strong>{row.name}{row.id === 'player1' ? ' (you)' : ''}</strong>
                  </span>
                  <span className={`${styles.cellNum} ${styles.numCell}`}>{row.start}M</span>
                  <span
                    className={`${styles.cellNum} ${styles.numCell} ${row.end === 0 ? styles.endDead : styles.endAlive}`}
                  >
                    {row.end}M
                  </span>
                  <span className={`${styles.cellNum} ${styles.numCell} ${styles.pctCell}`}>
                    {Math.round(row.pctLost)}%
                  </span>
                  <span className={styles.cellState}>
                    {row.end > 0
                      ? <RelBadge kind="gain">SURVIVED</RelBadge>
                      : <RelBadge kind="harm">ELIMINATED</RelBadge>}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </Panel>

        <div className={styles.finalWord}>
          <div className={styles.finalQuote}>"EVERYBODY PLAYS. NOBODY WINS."</div>
          <div className={styles.finalAttribution}>— the original 1989 box, more or less.</div>
        </div>
      </div>
    </div>
  );
}
