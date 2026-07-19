import type { CSSProperties, ReactNode } from 'react';

export interface RibbonProps {
  children: ReactNode;
  color?: string;
  rotate?: number;
  style?: CSSProperties;
}

/** Tilted ribbon banner */
export default function Ribbon({ children, color = 'magenta', rotate = -2, style = {} }: RibbonProps) {
  const bg = `var(--${color})`;
  return (
    <span
      style={{
        display: 'inline-block',
        background: bg,
        color: color === 'yellow' ? 'var(--ink)' : 'var(--paper)',
        fontFamily: 'var(--font-display)',
        fontSize: 18,
        letterSpacing: '0.06em',
        padding: '6px 16px',
        border: '3px solid var(--ink)',
        boxShadow: '3px 3px 0 var(--ink)',
        transform: `rotate(${rotate}deg)`,
        textTransform: 'uppercase',
        ...style,
      }}
    >
      {children}
    </span>
  );
}
