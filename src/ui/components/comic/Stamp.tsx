import type { CSSProperties, ReactNode } from 'react';

export interface StampProps {
  children: ReactNode;
  color?: 'magenta' | 'ink' | 'cyan' | 'yellow' | 'green';
  rotate?: number;
  style?: CSSProperties;
}

/** Stamp — slanted "rubber stamp" */
export default function Stamp({ children, color = 'magenta', rotate = -6, style = {} }: StampProps) {
  return (
    <span className={`stamp ${color}`} style={{ transform: `rotate(${rotate}deg)`, ...style }}>
      {children}
    </span>
  );
}
