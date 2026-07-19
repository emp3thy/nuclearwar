import { AP_BANK_CAP } from '../../engine/balance';
import { ApMeter } from './comic';
import styles from './ApBudget.module.css';

export interface ApBudgetProps {
  /** AP queued so far this round. */
  used: number;
  /** Total AP available this round (engine bakes factoryAp + banked + bonus into this). */
  max: number;
  /** Informational: how much of `max` carried over from last round. */
  banked: number;
}

/** AP block inside "Your Country" — ApMeter plus the banking note. */
export default function ApBudget({ used, max, banked }: ApBudgetProps) {
  return (
    <div className={styles.apBudget}>
      <ApMeter used={used} max={max} />
      <div className={styles.note}>
        Banked AP carries over (cap {AP_BANK_CAP}).
        {banked > 0 ? ` Of which banked: ${banked}.` : ''}
      </div>
    </div>
  );
}
