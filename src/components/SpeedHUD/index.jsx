import { useWorldState } from '../../hooks/useWorldState';
import styles from './SpeedHUD.module.css';

export default function SpeedHUD() {
  const theme = useWorldState(s => s.theme);
  const speed = useWorldState(s => s.worldSpeed);

  const abs      = Math.abs(speed);
  const visible  = abs > 0.05;
  const fillPct  = Math.min(abs, 1) * 100;

  return (
    <div
      className={`${styles.hud} ${visible ? styles.visible : ''}`}
      data-theme={theme}
      aria-hidden="true"
    >
      {theme === 'blueprint' && (
        <span className={styles.vLabel}>V:</span>
      )}
      <div className={styles.track}>
        <div className={styles.fill} style={{ width: `${fillPct}%` }} />
        {/* Pixel theme: segmented ticks */}
        {theme === 'pixel' && (
          <div className={styles.segTicks} aria-hidden="true">
            {[25, 50, 75].map(p => (
              <div key={p} className={styles.segTick} style={{ left: `${p}%` }} />
            ))}
          </div>
        )}
        {/* Blueprint theme: ruler ticks */}
        {theme === 'blueprint' && (
          <div className={styles.rulerTicks} aria-hidden="true">
            {[20, 40, 60, 80].map(p => (
              <div key={p} className={styles.rulerTick} style={{ left: `${p}%` }} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
