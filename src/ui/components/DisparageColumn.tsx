import type { ResolutionEvent } from '../../engine/types';
import Portrait from './Portrait';
import styles from './DisparageColumn.module.css';

interface Props {
  event: Extract<ResolutionEvent, { kind: 'DisparageColumn' }>;
}

/** Sidebar `.side-sec` for the RoundSummary tabloid. Engine-driven quote/footer wiring unchanged. */
export default function DisparageColumn({ event }: Props) {
  return (
    <section className={styles.sideSec}>
      <div className={styles.head}>THE DISPARAGE COLUMN</div>
      <div className={styles.subLine}>From his Clacton office (allegedly)</div>
      <div className={styles.row}>
        <Portrait leaderId="disparage" size={52} />
        <div className={styles.quote}>{event.quote}</div>
      </div>
      <footer className={styles.footer}>{event.footer}</footer>
    </section>
  );
}
