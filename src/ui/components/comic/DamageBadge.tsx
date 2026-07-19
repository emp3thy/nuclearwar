import type { CSSProperties, ReactNode } from 'react';

export interface DamageBadgeProps {
  value: number | string;
  label?: ReactNode;
  rotate?: number;
  style?: CSSProperties;
}

/** Damage badge (comic-tilted red stamp with -XM number) */
export default function DamageBadge({ value, label = 'M', rotate = -8, style = {} }: DamageBadgeProps) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'baseline',
        gap: 2,
        background: 'var(--magenta)',
        color: 'var(--paper)',
        border: '3px solid var(--ink)',
        padding: '6px 12px',
        fontFamily: 'var(--font-display)',
        boxShadow: '3px 3px 0 var(--ink)',
        transform: `rotate(${rotate}deg)`,
        letterSpacing: '0.04em',
        ...style,
      }}
    >
      <span style={{ fontSize: 22 }}>−{value}</span>
      <span style={{ fontSize: 12, opacity: 0.85 }}>{label}</span>
    </span>
  );
}
