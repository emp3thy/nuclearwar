import type { ScreenProps } from '../App';
import styles from './HotseatHandoff.module.css';

export default function HotseatHandoff({ state, dispatch }: ScreenProps) {
  const game = state.game!;
  const id = state.activeHumanTurn!;
  const leader = game.leaders[id];

  // Country string is e.g. "🦆 Freedonia"; split into flag (first segment) and name (rest).
  const [flag, ...rest] = leader.country.split(' ');
  const countryName = rest.join(' ');

  function begin() {
    dispatch({ type: 'BEGIN_PLANNING', leaderId: id });
  }

  return (
    <div className={styles.curtain}>
      <div className={styles.passLabel}>Pass the device</div>
      <div className={styles.flag}>{flag}</div>
      <div className={styles.country}>{countryName}</div>
      <div className={styles.leaderName}>{leader.name}</div>
      <div className={styles.divider} />
      <div className={styles.sealed}>Previous orders sealed.</div>
      <button type="button" className={styles.tapBtn} onClick={begin}>Tap to begin →</button>
    </div>
  );
}
