import { useState, useEffect } from 'react';
import { useWorldState } from '../../hooks/useWorldState';
import styles from './OnboardingHint.module.css';

const isTouch = typeof window !== 'undefined' &&
  window.matchMedia('(pointer: coarse)').matches;

export default function OnboardingHint() {
  const hasInteracted = useWorldState(s => s.hasInteracted);
  const [fading, setFading] = useState(false);
  const [gone,   setGone]   = useState(false);

  useEffect(() => {
    if (hasInteracted && !fading && !gone) {
      setFading(true);
      const id = setTimeout(() => setGone(true), 520);
      return () => clearTimeout(id);
    }
  }, [hasInteracted, fading, gone]);

  if (gone) return null;

  const primaryText = isTouch ? '← Swipe to ride →' : '← Scroll or drag to ride →';

  return (
    <div
      className={`${styles.hint} ${fading ? styles.fading : ''}`}
      aria-hidden="true"
    >
      <p className={styles.primary}>{primaryText}</p>
      <p className={styles.secondary}>Click a building to explore</p>
    </div>
  );
}
