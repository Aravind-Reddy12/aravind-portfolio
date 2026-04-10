import { world } from './WorldState';
import { easeInOutCubic } from '../utils/math';
import { lerpColor, alpha } from '../utils/colors';
import { lofiTheme } from '../canvas/themes/lofi';
import { pixelTheme } from '../canvas/themes/pixel';
import { storybookTheme } from '../canvas/themes/storybook';
import { blueprintTheme } from '../canvas/themes/blueprint';

const THEMES = { lofi: lofiTheme, pixel: pixelTheme, storybook: storybookTheme, blueprint: blueprintTheme };

let fromTheme   = null;
let toTheme     = null;
let transitionT = 1.0;
const DURATION_S = 1.0;

export function init(defaultThemeId) {
  fromTheme   = THEMES[defaultThemeId];
  toTheme     = THEMES[defaultThemeId];
  transitionT = 1.0;
  world.theme             = defaultThemeId;
  world.themeTransitionT  = 1.0;
  syncCSSVariables(toTheme.palette);
  Object.entries(toTheme.fonts).forEach(([k, v]) =>
    document.documentElement.style.setProperty(k, v));
}

export function setTheme(themeId) {
  // Snapshot current interpolated palette so mid-transition switches are smooth
  fromTheme   = { palette: getInterpolatedPalette(), fonts: toTheme.fonts };
  toTheme     = THEMES[themeId];
  transitionT = 0.0;
  world.theme            = themeId;
  world.themeTransitionT = 0.0;
  // Snap fonts immediately — masked by transitionIn overlay
  Object.entries(toTheme.fonts).forEach(([k, v]) =>
    document.documentElement.style.setProperty(k, v));
}

// Call once per frame with dt in seconds
export function tick(dtSeconds) {
  if (transitionT >= 1.0) return;
  transitionT = Math.min(1.0, transitionT + dtSeconds / DURATION_S);
  world.themeTransitionT = transitionT;
  syncCSSVariables(getInterpolatedPalette());
}

// Returns the active theme object (with draw methods)
export function getActiveTheme() {
  return THEMES[world.theme];
}

// Returns a palette interpolated between fromTheme and toTheme
export function getInterpolatedPalette() {
  if (transitionT >= 1.0) return toTheme.palette;
  const t      = easeInOutCubic(transitionT);
  const result = {};
  for (const key of Object.keys(fromTheme.palette)) {
    result[key] = lerpColor(fromTheme.palette[key], toTheme.palette[key], t);
  }
  return result;
}

// Writes palette colors to CSS custom properties
export function syncCSSVariables(palette) {
  const r = document.documentElement;
  r.style.setProperty('--color-bg',          palette.bg);
  r.style.setProperty('--color-surface',     palette.surface);
  r.style.setProperty('--color-accent',      palette.accent);
  r.style.setProperty('--color-text',        palette.text);
  r.style.setProperty('--color-text-muted',  palette.textMuted);
  r.style.setProperty('--color-accent-glow', alpha(palette.accent, 0.2));
}
