import styles from './ApBudget.module.css';

export interface ApBudgetProps {
  ap: number;       // total AP available this round (engine bakes factoryAp + banked + bonus into this)
  apBanked: number; // informational: how much of `ap` carried over from last round
}

export default function ApBudget({ ap, apBanked }: ApBudgetProps) {
  return (
    <div className={styles.apBudget}>
      <div className={styles.row}>
        <span className={styles.label}>AP available</span>
        <span className={styles.value}>{ap}</span>
      </div>
      {apBanked > 0 && (
        <div className={styles.row}>
          <span className={styles.label}>Of which banked</span>
          <span className={styles.value}>{apBanked}</span>
        </div>
      )}
    </div>
  );
}
