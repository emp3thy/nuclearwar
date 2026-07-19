import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';

export interface HoldButtonProps {
  onComplete: () => void;
  duration?: number;
  children: ReactNode;
  disabled?: boolean;
  style?: CSSProperties;
}

/** Tap-and-hold button — rAF progress fill, fires onComplete at 100%. */
export default function HoldButton({
  onComplete, duration = 600, children, disabled, style,
}: HoldButtonProps) {
  const [progress, setProgress] = useState(0);
  const frameRef = useRef<number | null>(null);
  const startRef = useRef(0);

  const cancelHold = () => {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
    setProgress(0);
  };

  const startHold = () => {
    if (disabled) return;
    startRef.current = Date.now();
    const tick = () => {
      const p = Math.min(1, (Date.now() - startRef.current) / duration);
      setProgress(p);
      if (p >= 1) {
        cancelHold();
        onComplete();
      } else {
        frameRef.current = requestAnimationFrame(tick);
      }
    };
    frameRef.current = requestAnimationFrame(tick);
  };

  useEffect(() => cancelHold, []);

  return (
    <button
      type="button"
      className="btn primary lg"
      disabled={disabled}
      onMouseDown={startHold}
      onMouseUp={cancelHold}
      onMouseLeave={cancelHold}
      onTouchStart={startHold}
      onTouchEnd={cancelHold}
      style={{ position: 'relative', overflow: 'hidden', ...style }}
    >
      <span style={{ position: 'relative', zIndex: 2 }}>
        {progress > 0 ? `HOLD… ${Math.round(progress * 100)}%` : children}
      </span>
      <span
        aria-hidden
        style={{
          position: 'absolute', inset: 0, background: 'var(--ink)',
          width: `${progress * 100}%`,
          transition: progress === 0 ? 'width 200ms ease' : 'none', zIndex: 1,
        }}
      />
    </button>
  );
}
