import type { CSSProperties, ReactNode } from 'react';
import Halftone from './Halftone';

export interface PanelProps {
  title?: ReactNode;
  tilt?: -2 | -1 | 0 | 1 | 2;
  dark?: boolean;
  halftone?: boolean;
  halftoneColor?: string;
  padding?: number | string;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}

/** Comic panel with optional title strip */
export default function Panel({
  title, tilt = 0, dark = false, halftone = false, halftoneColor,
  padding, className = '', style = {}, children,
}: PanelProps) {
  const tiltClass =
    tilt === -1 ? 'tilt-l' : tilt === 1 ? 'tilt-r' : tilt === -2 ? 'tilt-l-1' : tilt === 2 ? 'tilt-r-1' : '';
  return (
    <div
      className={`panel ${dark ? 'dark' : ''} ${tiltClass} ${className}`}
      style={{ padding: padding ?? undefined, ...style }}
    >
      {halftone && <Halftone color={halftoneColor} opacity={0.5} style={{ pointerEvents: 'none' }} />}
      {title && <div className="panel-title">{title}</div>}
      <div style={{ position: 'relative' }}>{children}</div>
    </div>
  );
}
