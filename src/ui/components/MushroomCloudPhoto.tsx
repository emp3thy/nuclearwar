/**
 * MushroomCloudPhoto — the RoundSummary's stylised mushroom-cloud "photo"
 * frame. Gradient and pattern ids are unique per instance (useId) so the
 * component is safe to reuse on one page.
 */
import { useId } from 'react';
import Stamp from './comic/Stamp';

export interface MushroomCloudPhotoProps {
  /** Rendered as a magenta stamp top-right when set (e.g. '−15M'). */
  stampText?: string;
  caption: string;
}

const RAYS = Array.from({ length: 18 }, (_, i) => {
  const a = (i / 18) * Math.PI * 2;
  return {
    x1: 200 + Math.cos(a) * 50,
    y1: 100 + Math.sin(a) * 30,
    x2: 200 + Math.cos(a) * 200,
    y2: 100 + Math.sin(a) * 130,
  };
});

export default function MushroomCloudPhoto({ stampText, caption }: MushroomCloudPhotoProps) {
  const uid = useId();
  const boomId = `boom-${uid}`;
  const halftoneId = `halftone-${uid}`;

  return (
    <div
      style={{
        position: 'relative',
        border: '3px solid var(--ink)',
        margin: '16px 0',
        background: 'var(--ink)',
        height: 220,
        overflow: 'hidden',
      }}
    >
      <svg
        viewBox="0 0 400 200"
        preserveAspectRatio="xMidYMid slice"
        style={{ width: '100%', height: '100%', display: 'block' }}
        aria-hidden="true"
      >
        <defs>
          <radialGradient id={boomId} cx="50%" cy="85%" r="60%">
            <stop offset="0%" stopColor="#f3c318" />
            <stop offset="30%" stopColor="#e6a517" />
            <stop offset="58%" stopColor="#c61f44" />
            <stop offset="85%" stopColor="#3a1010" />
            <stop offset="100%" stopColor="#141214" />
          </radialGradient>
          <pattern id={halftoneId} patternUnits="userSpaceOnUse" width="5" height="5">
            <circle cx="2.5" cy="2.5" r="0.8" fill="#141214" />
          </pattern>
        </defs>
        <rect width="400" height="200" fill="#1f1f24" />
        <rect y="160" width="400" height="40" fill="#3a2a1a" />
        {/* horizon halftone */}
        <rect width="400" height="200" fill={`url(#${halftoneId})`} opacity="0.18" />
        {/* cloud */}
        <ellipse cx="200" cy="170" rx="160" ry="22" fill={`url(#${boomId})`} />
        <rect x="180" y="98" width="40" height="70" fill={`url(#${boomId})`} />
        <ellipse cx="200" cy="100" rx="60" ry="36" fill={`url(#${boomId})`} />
        <ellipse cx="200" cy="68" rx="80" ry="28" fill={`url(#${boomId})`} opacity="0.9" />
        <ellipse cx="200" cy="50" rx="100" ry="22" fill={`url(#${boomId})`} opacity="0.7" />
        {/* ink burst rays */}
        {RAYS.map((r, i) => (
          <line key={i} x1={r.x1} y1={r.y1} x2={r.x2} y2={r.y2} stroke="#141214" strokeWidth="1.5" opacity="0.3" />
        ))}
      </svg>
      {stampText !== undefined && (
        <div style={{ position: 'absolute', top: 10, right: 10 }}>
          <Stamp color="magenta" rotate={-7}>{stampText}</Stamp>
        </div>
      )}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          background: 'rgba(20,18,20,0.85)',
          color: 'var(--paper)',
          fontFamily: 'var(--font-tabloid)',
          fontSize: 11,
          padding: '4px 10px',
          fontStyle: 'italic',
        }}
      >
        {caption}
      </div>
    </div>
  );
}
