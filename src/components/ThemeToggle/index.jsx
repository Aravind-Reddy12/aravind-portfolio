import { useState, useCallback } from 'react';
import * as ThemeEngine from '../../engine/ThemeEngine';
import { useWorldState } from '../../hooks/useWorldState';
import styles from './ThemeToggle.module.css';

const CYCLE = {
  lofi:       'pixel',
  pixel:      'storybook',
  storybook:  'blueprint',
  blueprint:  'lofi',
};

const LABELS = {
  lofi:       'Lo-fi',
  pixel:      'Pixel',
  storybook:  'Storybook',
  blueprint:  'Blueprint',
};

// Inline SVG icons — one per theme (the CURRENT theme icon shown)
function IconLofi() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
      {/* Vinyl record */}
      <circle cx="11" cy="11" r="9"   stroke="currentColor" strokeWidth="1.5" />
      <circle cx="11" cy="11" r="5"   stroke="currentColor" strokeWidth="1"   opacity="0.5" />
      <circle cx="11" cy="11" r="1.5" fill="currentColor" />
    </svg>
  );
}

function IconPixel() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
      {/* Game cartridge */}
      <rect x="4" y="5" width="14" height="14" rx="1" stroke="currentColor" strokeWidth="1.5" />
      {/* Label area */}
      <rect x="6" y="9" width="10" height="6" stroke="currentColor" strokeWidth="1" opacity="0.6" />
      {/* Notch at top */}
      <rect x="8" y="4" width="6" height="3" fill="currentColor" rx="0.5" />
    </svg>
  );
}

function IconStorybook() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
      {/* Open book — two pages angled */}
      <path
        d="M11 17 C11 17 5 16 4 8 L4 6 C4 6 8 6.5 11 8"
        stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
      />
      <path
        d="M11 17 C11 17 17 16 18 8 L18 6 C18 6 14 6.5 11 8"
        stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
      />
      {/* Spine */}
      <line x1="11" y1="8" x2="11" y2="17" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function IconBlueprint() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
      {/* Drafting compass — V shape + pivot circle */}
      <line x1="11" y1="6" x2="6"  y2="17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="11" y1="6" x2="16" y2="17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="11" cy="6" r="2" stroke="currentColor" strokeWidth="1.2" />
      {/* Crossbar */}
      <line x1="7.5" y1="12.5" x2="14.5" y2="12.5" stroke="currentColor" strokeWidth="1" opacity="0.6" />
    </svg>
  );
}

const ICONS = {
  lofi:      IconLofi,
  pixel:     IconPixel,
  storybook: IconStorybook,
  blueprint: IconBlueprint,
};

export default function ThemeToggle() {
  const theme     = useWorldState(s => s.theme);
  const [spinning, setSpinning] = useState(false);

  const nextTheme = CYCLE[theme] ?? 'lofi';
  const Icon      = ICONS[theme] ?? IconLofi;

  const handleClick = useCallback(() => {
    if (spinning) return;
    setSpinning(true);
    ThemeEngine.setTheme(nextTheme);
    setTimeout(() => setSpinning(false), 420);
  }, [spinning, nextTheme]);

  const isPixel = theme === 'pixel';

  return (
    <button
      className={`${styles.btn} ${isPixel ? styles.pixel : ''} ${spinning ? styles.spinning : ''}`}
      onClick={handleClick}
      aria-label={`Switch to ${LABELS[nextTheme]} theme`}
    >
      <span className={styles.icon}>
        <Icon />
      </span>
      <span className={styles.label}>{LABELS[nextTheme]}</span>
    </button>
  );
}
