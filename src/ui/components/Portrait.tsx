import { isHuman } from '../../engine/state';
import type { LeaderId } from '../../engine/types';
import { FACES, HUMAN_ACCENTS, PORTRAIT_META } from '../portraits';

export interface PortraitProps {
  /** 'disparage' is a non-playable cameo, absent from the engine's LeaderId union. */
  leaderId: LeaderId | 'disparage';
  /** Pixel diameter (circle) or edge (square). */
  size?: number;
  shape?: 'circle' | 'square';
  showBadge?: boolean;
  /** Badge flag override — humans pass their chosen country's flag. */
  flag?: string;
  className?: string;
}

export default function Portrait({
  leaderId, size = 80, shape = 'circle', showBadge = true, flag, className,
}: PortraitProps) {
  const human = leaderId !== 'disparage' && isHuman(leaderId);
  const Face = FACES[leaderId];
  if (!Face) return null;
  const color = human ? HUMAN_ACCENTS[leaderId] : PORTRAIT_META[leaderId].color;
  const badgeFlag = flag ?? (human ? '🌐' : PORTRAIT_META[leaderId].flag);
  const badgeSize = Math.max(16, Math.round(size * 0.28));

  return (
    <span className={className} style={{ display: 'inline-block', position: 'relative' }}>
      <span
        style={{
          width: size, height: size,
          borderRadius: shape === 'square' ? 0 : '50%',
          background: color,
          border: '3px solid var(--ink)',
          boxShadow: '3px 3px 0 var(--ink)',
          position: 'relative', overflow: 'hidden', display: 'inline-block',
        }}
      >
        <span
          aria-hidden
          style={{
            position: 'absolute', inset: 0,
            backgroundImage: 'radial-gradient(rgba(0,0,0,0.18) 1px, transparent 1.4px)',
            backgroundSize: '6px 6px', mixBlendMode: 'multiply', pointerEvents: 'none',
          }}
        />
        <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <Face />
        </span>
        {shape !== 'square' && (
          <span
            aria-hidden
            style={{
              position: 'absolute', inset: 4, border: '2px dashed rgba(20,18,20,0.35)',
              borderRadius: '50%', pointerEvents: 'none',
            }}
          />
        )}
      </span>
      {showBadge && (
        <span
          style={{
            position: 'absolute', right: -2, bottom: -2,
            width: badgeSize, height: badgeSize, borderRadius: '50%',
            background: 'var(--paper)', border: '2.5px solid var(--ink)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: Math.round(badgeSize * 0.62), lineHeight: 1,
            boxShadow: '1.5px 1.5px 0 var(--ink)',
          }}
        >
          {badgeFlag}
        </span>
      )}
    </span>
  );
}
