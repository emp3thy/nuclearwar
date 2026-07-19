import type { ResolutionEvent } from '../../engine/types';
import Portrait from './Portrait';
import { Tag } from './comic';
import styles from './DisparageCard.module.css';

interface Props {
  event: Extract<ResolutionEvent, { kind: 'DisparageCameo' }>;
}

/** Disparage cameo overlay card (map bottom-right, slice-3 spec §6). */
export default function DisparageCard({ event }: Props) {
  return (
    <div className={styles.card}>
      <div className={styles.row}>
        <Portrait leaderId="disparage" size={56} />
        <div>
          <Tag color="yellow" style={{ fontSize: 9 }}>🍺 FROM CLACTON</Tag>
          <div className={`hand ${styles.quote}`}>{event.quote}</div>
        </div>
      </div>
    </div>
  );
}
