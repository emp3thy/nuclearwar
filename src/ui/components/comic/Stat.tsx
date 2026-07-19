import type { CSSProperties, ReactNode } from 'react';

export interface StatProps {
  label: ReactNode;
  value: ReactNode;
  sub?: ReactNode;
  accent?: string;
  style?: CSSProperties;
}

/** Stat block — label + value, comic style */
export default function Stat({ label, value, sub, accent = 'ink', style = {} }: StatProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', minWidth: 0, ...style }}>
      <span className="display" style={{ fontSize: 10, letterSpacing: '0.14em', opacity: 0.7 }}>{label}</span>
      <span className="mono" style={{ fontSize: 22, fontWeight: 700, color: `var(--${accent})`, lineHeight: 1, whiteSpace: 'nowrap' }}>{value}</span>
      {sub && <span style={{ fontSize: 10, marginTop: 2, opacity: 0.7, whiteSpace: 'nowrap' }}>{sub}</span>}
    </div>
  );
}
