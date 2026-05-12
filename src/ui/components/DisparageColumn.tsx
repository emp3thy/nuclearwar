import type { ResolutionEvent } from '../../engine/types';
import styles from './DisparageColumn.module.css';

interface Props {
  event: Extract<ResolutionEvent, { kind: 'DisparageColumn' }>;
}

export default function DisparageColumn({ event }: Props) {
  return (
    <aside className={styles.column}>
      <header className={styles.header}>
        THE DISPARAGE COLUMN
        <span className={styles.subhead}>From his Clacton office (allegedly)</span>
      </header>
      <p className={styles.body}>{event.quote}</p>
      <footer className={styles.footer}>{event.footer}</footer>
    </aside>
  );
}
