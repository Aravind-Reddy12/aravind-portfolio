import { useRef } from 'react';
import { useWorldState } from '../../hooks/useWorldState';
import styles from './StyleHUD.module.css';

const THEME_LABELS = {
  lofi:       'Lo-fi',
  pixel:      'Pixel Art',
  storybook:  'Storybook',
  blueprint:  'Blueprint',
};

export default function StyleHUD() {
  const theme     = useWorldState(s => s.theme);
  const lap       = useWorldState(s => s.lap);
  const prevLapRef = useRef(lap);

  // Detect lap change to flash accent color
  const lapChanged = lap !== prevLapRef.current;
  if (lapChanged) prevLapRef.current = lap;

  const label = THEME_LABELS[theme] ?? theme;

  return (
    <div className={styles.hud} aria-live="polite">
      <span className={styles.theme}>{label}</span>
      <span className={styles.dot} aria-hidden="true"> · </span>
      <span
        className={`${styles.lap} ${lapChanged ? styles.lapFlash : ''}`}
        key={lap}   /* re-mount on lap change to restart the animation */
      >
        LAP {lap}
      </span>
    </div>
  );
}
