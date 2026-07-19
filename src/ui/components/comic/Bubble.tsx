import type { CSSProperties, ReactNode } from 'react';

export interface BubbleProps {
  children: ReactNode;
  tail?: 'bl' | 'tl';
  thought?: boolean;
  style?: CSSProperties;
}

/** Speech bubble */
export default function Bubble({ children, tail = 'bl', thought = false, style = {} }: BubbleProps) {
  return (
    <span className={`bubble tail-${tail} ${thought ? 'thought' : ''}`} style={style}>
      {children}
    </span>
  );
}
