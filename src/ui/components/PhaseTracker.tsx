import styles from './PhaseTracker.module.css';

const PHASES = ['Defences', 'Builds', 'Propaganda', 'Wooing', 'Launches', 'Final Retal.'];

export default function PhaseTracker() {
  return (
    <div className={styles.tracker}>
      {PHASES.map((p) => (
        <span key={p} className={styles.phase}>{p}</span>
      ))}
    </div>
  );
}
