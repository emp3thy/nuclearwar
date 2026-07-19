import type { CSSProperties } from 'react';

export interface HalftoneProps {
  color?: string;
  size?: number;
  opacity?: number;
  style?: CSSProperties;
}

/** Halftone dot overlay layer */
export default function Halftone({
  color = 'rgba(20,18,20,0.16)', size = 6, opacity = 1, style = {},
}: HalftoneProps) {
  return (
    <span
      aria-hidden
      style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: `radial-gradient(${color} 1px, transparent 1.4px)`,
        backgroundSize: `${size}px ${size}px`,
        opacity,
        pointerEvents: 'none',
        ...style,
      }}
    />
  );
}
