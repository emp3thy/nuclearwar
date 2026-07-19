import type { GameState, SoftWarning } from '../../engine/types';
import { Panel } from './comic';
import styles from './SoftWarnPanel.module.css';

interface Props {
  warnings: SoftWarning[];
  game: GameState;
}

/** Always-visible warnings panel (handoff screens-2.jsx warnings-panel). */
export default function SoftWarnPanel({ warnings, game }: Props) {
  return (
    <Panel tilt={0}>
      <div className={`display ${styles.title}`}>SOFT WARNINGS</div>
      {warnings.length === 0 ? (
        <div className={`hand ${styles.empty}`}>Nothing obviously stupid. Yet.</div>
      ) : (
        <ul className={styles.list}>
          {warnings.map((w, i) => (
            <li key={i} className={`hand ${styles.warning}`}>⚠ {describe(w, game)}</li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

function describe(w: SoftWarning, game: GameState): string {
  switch (w.kind) {
    case 'warhead-no-delivery':
      return `Warhead #${w.orderIndex + 1}: no delivery vehicle owned or queued.`;
    case 'delivery-no-warhead':
      return `Delivery #${w.orderIndex + 1}: no warhead owned or queued.`;
    case 'woo-non-attacker': {
      const target = game.leaders[w.target];
      return `Woo ${target.name}: hasn't attacked you and already likes you.`;
    }
  }
}
