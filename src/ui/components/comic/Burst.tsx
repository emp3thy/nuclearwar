import type { CSSProperties, ReactNode } from 'react';

export interface BurstProps {
  children: ReactNode;
  color?: string;
  rotate?: number;
  size?: number;
  style?: CSSProperties;
}

/** Comic burst (sound effect) */
export default function Burst({
  children, color = 'magenta', rotate = -8, size = 32, style = {},
}: BurstProps) {
  const bg = `var(--${color})`;
  const fg = color === 'yellow' ? 'var(--ink)' : 'var(--paper)';
  return (
    <span
      className="burst"
      style={{
        background: bg, color: fg, fontSize: size,
        transform: `rotate(${rotate}deg)`,
        ...style,
      }}
    >
      {children}
    </span>
  );
}
