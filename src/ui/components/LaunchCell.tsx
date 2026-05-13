import styles from './LaunchCell.module.css';

interface Props {
  sizeLabel: 'small' | 'med' | 'big';
  warheadsLeft: number;
  count: number;
  canAdd: boolean;
  onInc: () => void;
  onDec: () => void;
}

export default function LaunchCell({ sizeLabel, warheadsLeft, count, canAdd, onInc, onDec }: Props) {
  const stateClass = count > 0 ? styles.on : warheadsLeft === 0 && count === 0 ? styles.off : '';
  return (
    <div className={`${styles.cell} ${stateClass}`}>
      <div className={styles.emoji}>💥</div>
      <div className={styles.label}>{sizeLabel}</div>
      <div className={styles.inv}>{warheadsLeft} left</div>
      <div className={styles.stepper}>
        <button type="button" disabled={count === 0} onClick={onDec}>−</button>
        <span className={styles.num}>{count}</span>
        <button type="button" disabled={!canAdd} onClick={onInc}>+</button>
      </div>
    </div>
  );
}
