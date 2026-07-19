export interface ApMeterProps {
  used: number;
  max: number;
}

/** AP meter */
export default function ApMeter({ used, max }: ApMeterProps) {
  const pct = Math.min(100, (used / Math.max(1, max)) * 100);
  const over = used > max;
  return (
    <div style={{ width: '100%' }}>
      <div
        style={{
          position: 'relative',
          height: 18,
          border: '2.5px solid var(--ink)',
          background: 'var(--paper-warm)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${Math.min(100, pct)}%`,
            background: over ? 'var(--magenta)' : 'var(--ink)',
            transition: 'width 200ms ease',
            backgroundImage: over
              ? 'repeating-linear-gradient(45deg, transparent 0 4px, rgba(255,255,255,0.18) 4px 6px)'
              : 'none',
          }}
        />
        {/* tick marks */}
        {Array.from({ length: Math.max(0, max - 1) }).map((_, i) => (
          <span
            key={i}
            style={{
              position: 'absolute',
              top: 0, bottom: 0,
              left: `${((i + 1) / max) * 100}%`,
              width: 1,
              background: 'rgba(20,18,20,0.4)',
            }}
          />
        ))}
      </div>
      <div className="between" style={{ marginTop: 4, fontSize: 11 }}>
        <span className="mono"><strong style={{ fontSize: 13 }}>{used}</strong> / {max} AP</span>
        <span style={{ color: over ? 'var(--magenta)' : 'var(--ink-soft)', fontWeight: 600, fontSize: 11 }}>
          {over ? 'OVER BUDGET' : `${Math.max(0, max - used)} will bank`}
        </span>
      </div>
    </div>
  );
}
