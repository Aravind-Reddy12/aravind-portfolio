import { useState, useRef, useCallback } from 'react';
import { world } from '../../engine/WorldState';
import { useWorldState } from '../../hooks/useWorldState';
import { WORLD_WIDTH } from '../../constants';
import { BUILDINGS } from '../../data/buildings';
import styles from './WorldScrubber.module.css';

// Building markers (exclude toggle — no section)
const MARKERS = BUILDINGS
  .filter(b => b.section)
  .map(b => ({
    id:    b.id,
    label: b.section,
    pct:   b.worldX / WORLD_WIDTH,
  }));

// ─── Thumb ────────────────────────────────────────────────────────────────────

function Thumb({ pct, theme }) {
  const left = `${(pct * 100).toFixed(3)}%`;
  return (
    <div
      className={`${styles.thumb} ${styles[`thumb_${theme}`] ?? ''}`}
      style={{ left }}
      aria-hidden="true"
    >
      {theme === 'blueprint' && (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.2" />
          <line x1="7" y1="1"  x2="7"  y2="13" stroke="currentColor" strokeWidth="1" />
          <line x1="1" y1="7"  x2="13" y2="7"  stroke="currentColor" strokeWidth="1" />
        </svg>
      )}
      {theme === 'storybook' && (
        <svg width="12" height="18" viewBox="0 0 12 18" fill="none">
          <path d="M0,0 H12 V12 L6,18 L0,12 Z" fill="currentColor" />
        </svg>
      )}
    </div>
  );
}

// ─── BuildingMarker ───────────────────────────────────────────────────────────

function BuildingMarker({ marker }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      className={styles.marker}
      style={{ left: `${marker.pct * 100}%` }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      aria-hidden="true"
    >
      <div className={styles.markerDot} />
      {hovered && (
        <div className={styles.markerTooltip}>{marker.label}</div>
      )}
    </div>
  );
}

// ─── WorldScrubber ────────────────────────────────────────────────────────────

export default function WorldScrubber() {
  const theme = useWorldState(s => s.theme);
  const pct   = useWorldState(s => s.worldOffset / WORLD_WIDTH);

  const trackRef    = useRef(null);
  const draggingRef = useRef(false);

  const getPctFromEvent = useCallback((e) => {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return null;
    return Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
  }, []);

  const setTarget = useCallback((fraction) => {
    world.scrubTarget = fraction * WORLD_WIDTH;
  }, []);

  const onPointerDown = useCallback((e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    draggingRef.current = true;
    trackRef.current?.setPointerCapture(e.pointerId);
    const fraction = getPctFromEvent(e);
    if (fraction !== null) setTarget(fraction);
  }, [getPctFromEvent, setTarget]);

  const onPointerMove = useCallback((e) => {
    if (!draggingRef.current) return;
    const fraction = getPctFromEvent(e);
    if (fraction !== null) setTarget(fraction);
  }, [getPctFromEvent, setTarget]);

  const onPointerUp = useCallback((e) => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    trackRef.current?.releasePointerCapture(e.pointerId);
    // scrubTarget stays — world coasts to final position
  }, []);

  const onKeyDown = useCallback((e) => {
    if (e.key === 'ArrowRight') {
      world.scrubTarget = ((world.worldOffset + WORLD_WIDTH * 0.05) % WORLD_WIDTH);
      e.preventDefault();
    } else if (e.key === 'ArrowLeft') {
      world.scrubTarget = ((world.worldOffset - WORLD_WIDTH * 0.05 + WORLD_WIDTH) % WORLD_WIDTH);
      e.preventDefault();
    }
  }, []);

  const ariaPct = Math.round(pct * 100);

  return (
    <div className={`${styles.root} ${styles[theme] ?? ''}`} data-theme={theme}>

      {/* Blueprint ruler numbers — rendered above the track */}
      {theme === 'blueprint' && (
        <div className={styles.rulerNumbers} aria-hidden="true">
          {[0, 1200, 2400, 3600, 4800, 6000].map(v => (
            <span
              key={v}
              className={styles.rulerNum}
              style={{ left: `${(v / WORLD_WIDTH) * 100}%` }}
            >
              {v}
            </span>
          ))}
        </div>
      )}

      {/* Track interaction area */}
      <div
        ref={trackRef}
        className={styles.trackArea}
        role="slider"
        tabIndex={0}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={ariaPct}
        aria-label="World position scrubber"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onKeyDown={onKeyDown}
      >
        {/* Visual track */}
        <div className={styles.track} aria-hidden="true">

          {/* Storybook: SVG wavy path overlaid on the track */}
          {theme === 'storybook' && (
            <svg
              className={styles.wavySvg}
              viewBox="0 0 1000 12"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <path
                d="M0,6 C40,2 80,10 120,6 C160,2 200,10 240,6 C280,2 320,10 360,6 C400,2 440,10 480,6 C520,2 560,10 600,6 C640,2 680,10 720,6 C760,2 800,10 840,6 C880,2 920,10 960,6 C980,4 990,6 1000,6"
                stroke="currentColor"
                strokeWidth="3"
                fill="none"
                strokeLinecap="round"
              />
            </svg>
          )}

          {/* Blueprint ruler tick marks */}
          {theme === 'blueprint' && (
            <div className={styles.rulerTicks} aria-hidden="true">
              {Array.from({ length: 25 }, (_, i) => (
                <div
                  key={i}
                  className={`${styles.tick} ${i % 4 === 0 ? styles.tickMajor : styles.tickMinor}`}
                  style={{ left: `${(i / 24) * 100}%` }}
                />
              ))}
            </div>
          )}

          {/* Building position markers */}
          {MARKERS.map(m => (
            <BuildingMarker key={m.id} marker={m} />
          ))}
        </div>

        {/* Draggable thumb */}
        <Thumb pct={pct} theme={theme} />
      </div>
    </div>
  );
}
