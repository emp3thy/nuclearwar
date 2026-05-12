import type { ResolutionEvent } from '../../engine/types';
import styles from './DisparageCard.module.css';

interface Props {
  event: Extract<ResolutionEvent, { kind: 'DisparageCameo' }>;
}

export default function DisparageCard({ event }: Props) {
  return (
    <div className={styles.card}>
      <div className={styles.header}>FROM CLACTON</div>
      <div className={styles.quote}>{event.quote}</div>
    </div>
  );
}
