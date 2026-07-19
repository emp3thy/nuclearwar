import { useEffect, useState } from 'react';
import type { ScreenProps } from '../App';
import type { LeaderId } from '../../engine/types';
import { isHuman } from '../../engine/state';
import { Panel, Tag } from '../components/comic';
import Portrait from '../components/Portrait';
import styles from './AiConferring.module.css';

/** Flavour lines lifted verbatim from the handoff (screens-1.jsx ConferringScreen). */
const LINES: Partial<Record<LeaderId, string>> = {
  chump: 'is on the phone yelling at his generals.',
  khameneverhere: 'has filed orders. The orders are unsigned.',
  burnem: 'is asking what this does to the buses, isn\'t he?',
  carnage: 'polishes his glasses. Files orders calmly.',
  'mileigh-hem': 'is revving something offscreen.',
  netanyahoo: 'is adding a fresh red line to the bomb diagram.',
};

/** Total stagger window: AI row i (0-based) flips to "filed" at (i+1) * TOTAL / n. */
const TOTAL_MS = 2400;
/** AI_RESOLVE fires at TOTAL_MS + RESOLVE_DELAY_MS. */
const RESOLVE_DELAY_MS = 500;
const DOT_INTERVAL_MS = 320;

export default function AiConferring({ state, dispatch }: ScreenProps) {
  const game = state.game!;
  const aiIds = game.cast.filter((id) => !isHuman(id) && game.leaders[id].alive);

  const [dots, setDots] = useState(1);
  const [filedCount, setFiledCount] = useState(0);

  useEffect(() => {
    const dotsInterval = setInterval(() => setDots((d) => (d % 3) + 1), DOT_INTERVAL_MS);
    const step = TOTAL_MS / Math.max(1, aiIds.length);
    const rowTimers = aiIds.map((_, i) =>
      setTimeout(() => setFiledCount((c) => Math.max(c, i + 1)), (i + 1) * step),
    );
    const finish = setTimeout(() => dispatch({ type: 'AI_RESOLVE' }), TOTAL_MS + RESOLVE_DELAY_MS);
    return () => {
      clearInterval(dotsInterval);
      for (const t of rowTimers) clearTimeout(t);
      clearTimeout(finish);
    };
    // The beat's timeline is fixed at mount; run once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={`screen paper ${styles.beat}`}>
      <div className={styles.wrap}>
        <div className={styles.head}>
          <Tag color="ink" style={{ fontSize: 12, letterSpacing: '0.2em' }}>INTERMISSION</Tag>
          <div className={`display ${styles.headline}`}>
            AI IS FILING ORDERS{'.'.repeat(dots)}
          </div>
          <div className={`hand ${styles.subline}`}>Don't look. They can sense it.</div>
        </div>

        <div className="col gap-3">
          {aiIds.map((id, i) => {
            const leader = game.leaders[id];
            const filed = i < filedCount;
            return (
              <Panel key={id} tilt={0} padding={12}>
                <div className="between" style={{ gap: 12 }}>
                  <div className={styles.rowLeft}>
                    <Portrait leaderId={id} size={48} />
                    <div>
                      <div className={`display ${styles.rowName}`}>{leader.name}</div>
                      <div className={`hand ${styles.rowLine}`}>
                        {leader.name} {LINES[id] ?? 'is conferring.'}
                      </div>
                    </div>
                  </div>
                  <div className={styles.rowStatus}>
                    {filed ? (
                      <Tag color="green">FILED ✓</Tag>
                    ) : (
                      <div className={styles.dotRow}>
                        {[0, 1, 2].map((d) => (
                          <span
                            key={d}
                            className={styles.pulseDot}
                            style={{ animationDelay: `${d * 150}ms` }}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </Panel>
            );
          })}
        </div>
      </div>
    </div>
  );
}
