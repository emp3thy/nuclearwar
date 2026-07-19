export interface RoundBadgeProps {
  round: number;
  label?: string;
}

/** Round number ink plaque (handoff ui.jsx lines 156–172). */
export default function RoundBadge({ round, label = 'Round' }: RoundBadgeProps) {
  return (
    <div
      style={{
        display: 'inline-flex',
        flexDirection: 'column',
        alignItems: 'center',
        border: '3px solid var(--paper)',
        padding: '4px 12px',
        background: 'var(--ink)',
        color: 'var(--paper)',
        lineHeight: 1,
      }}
    >
      <span className="display" style={{ fontSize: 9, letterSpacing: '0.2em', opacity: 0.7 }}>{label}</span>
      <span className="display" style={{ fontSize: 22, letterSpacing: '0.03em' }}>{round}</span>
    </div>
  );
}
