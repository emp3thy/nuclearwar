export interface PhaseTrackProps {
  phases: string[];
  current: string;
  done: string[];
}

/** Phase track for Action screen */
export default function PhaseTrack({ phases, current, done }: PhaseTrackProps) {
  return (
    <div style={{ display: 'flex', gap: 0, border: '3px solid var(--ink)', background: 'var(--paper)' }}>
      {phases.map((p, i) => {
        const isDone = done.includes(p);
        const isCurrent = current === p;
        const bg = isCurrent ? 'var(--magenta)' : isDone ? 'var(--ink)' : 'var(--paper)';
        const color = isCurrent ? 'var(--paper)' : isDone ? 'var(--paper)' : 'var(--ink-soft)';
        return (
          <div
            key={p}
            style={{
              flex: 1, padding: '8px 6px',
              textAlign: 'center',
              fontFamily: 'var(--font-display)', fontSize: 11, letterSpacing: '0.14em',
              textTransform: 'uppercase',
              background: bg, color,
              borderRight: i === phases.length - 1 ? 0 : '2px solid var(--ink)',
              position: 'relative',
            }}
          >
            {p}
            {isCurrent && (
              <div
                style={{
                  position: 'absolute', left: 0, right: 0, bottom: -3,
                  height: 4, background: 'var(--yellow)', border: '2px solid var(--ink)', borderTop: 0,
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
