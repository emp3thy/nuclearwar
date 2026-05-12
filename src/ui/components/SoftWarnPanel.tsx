import type { GameState, SoftWarning } from '../../engine/types';
import styles from './SoftWarnPanel.module.css';

interface Props {
  warnings: SoftWarning[];
  game: GameState;
}

export default function SoftWarnPanel({ warnings, game }: Props) {
  if (warnings.length === 0) return null;
  return (
    <div className={styles.panel}>
      <div className={styles.title}>⚠ Suggestions</div>
      <ul className={styles.list}>
        {warnings.map((w, i) => (
          <li key={i}>{describe(w, game)}</li>
        ))}
      </ul>
    </div>
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
