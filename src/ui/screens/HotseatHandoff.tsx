import type { ScreenProps } from '../App';
import { Btn, Tag } from '../components/comic';
import styles from './HotseatHandoff.module.css';

export default function HotseatHandoff({ state, dispatch }: ScreenProps) {
  const game = state.game!;
  const id = state.activeHumanTurn!;
  const leader = game.leaders[id];

  // Country string is e.g. "🦆 Freedonia"; the first token is the flag.
  const flag = leader.country.split(' ')[0];

  function begin() {
    dispatch({ type: 'BEGIN_PLANNING', leaderId: id });
  }

  return (
    <div className={`screen ${styles.curtain}`}>
      <div aria-hidden className={styles.dotGrid} />
      <div className={styles.content}>
        <Tag color="yellow" style={{ fontSize: 12, padding: '5px 12px' }}>HOTSEAT HANDOFF</Tag>
        <div className={styles.flag}>{flag}</div>
        <div className={`display ${styles.kicker}`}>PASS TO</div>
        <h1 className={`display ${styles.leaderName}`}>{leader.name}</h1>
        <div className={`hand ${styles.sealed}`}>Previous orders sealed. Don't peek.</div>
        <Btn variant="primary" size="xl" onClick={begin} style={{ marginTop: 28 }}>
          BEGIN MY TURN
        </Btn>
      </div>
    </div>
  );
}
