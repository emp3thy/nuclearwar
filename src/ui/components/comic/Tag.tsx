import type { CSSProperties, ReactNode } from 'react';

export interface TagProps {
  children: ReactNode;
  color?: 'ink' | 'cyan' | 'magenta' | 'yellow' | 'green' | 'outline';
  style?: CSSProperties;
}

/** Tag — small pill label */
export default function Tag({ children, color = 'ink', style = {} }: TagProps) {
  return <span className={`tag ${color}`} style={style}>{children}</span>;
}
