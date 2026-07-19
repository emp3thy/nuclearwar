import type { ReactNode } from 'react';

export type RelBadgeKind =
  | 'hit-you' | 'wooing' | 'you-woo' | 'grudge' | 'mood'
  | 'gain' | 'neutral' | 'harm' | 'cyan' | 'yellow';

export interface RelBadgeProps {
  kind: RelBadgeKind;
  children: ReactNode;
}

const KIND_STYLES: Record<RelBadgeKind, { bg: string; fg: string }> = {
  'hit-you': { bg: 'var(--magenta)', fg: 'var(--paper)' },
  wooing: { bg: 'var(--green)', fg: 'var(--paper)' },
  'you-woo': { bg: '#6b8a2b', fg: 'var(--paper)' },
  grudge: { bg: '#5a3a1a', fg: 'var(--paper)' },
  mood: { bg: 'var(--paper-warm)', fg: 'var(--ink)' },
  gain: { bg: 'var(--green)', fg: 'var(--paper)' },
  neutral: { bg: '#5a4a3a', fg: 'var(--paper)' },
  harm: { bg: 'var(--magenta-deep)', fg: 'var(--paper)' },
  cyan: { bg: 'var(--cyan)', fg: 'var(--paper)' },
  yellow: { bg: 'var(--yellow)', fg: 'var(--ink)' },
};

/** Relationship badge */
export default function RelBadge({ kind, children }: RelBadgeProps) {
  const s = KIND_STYLES[kind] ?? KIND_STYLES.neutral;
  return (
    <span
      style={{
        display: 'inline-block',
        background: s.bg, color: s.fg,
        fontFamily: 'var(--font-display)',
        fontSize: 10,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        padding: '3px 7px',
        border: kind === 'mood' ? '2px solid var(--ink)' : '0',
        fontStyle: kind === 'mood' ? 'italic' : 'normal',
      }}
    >
      {children}
    </span>
  );
}
