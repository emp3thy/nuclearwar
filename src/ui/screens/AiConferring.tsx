import { useEffect } from 'react';
import type { ScreenProps } from '../App';
import styles from './AiConferring.module.css';

export default function AiConferring({ dispatch }: ScreenProps) {
  useEffect(() => {
    const timer = setTimeout(() => dispatch({ type: 'AI_RESOLVE' }), 1500);
    return () => clearTimeout(timer);
  }, [dispatch]);

  return (
    <div className={styles.beat}>
      <p className={styles.text}>
        AI players are filing orders<span className={styles.dots}><span>.</span><span>.</span><span>.</span></span>
      </p>
    </div>
  );
}
