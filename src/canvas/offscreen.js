import { drawSky } from './layers/sky';

let skyBuffer = null;
let skyCtx    = null;
let lastSkyT  = -1;
let lastTheme = null;

function createBuffer(width, height) {
  if (typeof OffscreenCanvas !== 'undefined') {
    return new OffscreenCanvas(width, height);
  }
  // Fallback for browsers without OffscreenCanvas
  const canvas  = document.createElement('canvas');
  canvas.width  = width;
  canvas.height = height;
  return canvas;
}

export function init(width, height) {
  skyBuffer = createBuffer(width, height);
  skyCtx    = skyBuffer.getContext('2d');
}

export function resize(width, height) {
  if (!skyBuffer) {
    init(width, height);
    return;
  }
  skyBuffer.width  = width;
  skyBuffer.height = height;
  lastSkyT = -1; // force redraw on next frame
}

export function getSkyBuffer(width, height, dayNightT) {
  if (!skyBuffer) init(width, height);

  // Stars twinkle — never cache when they're visible (bypass threshold)
  const starsVisible = dayNightT > 0.75;
  if (
    !starsVisible &&
    Math.abs(dayNightT - lastSkyT) < 0.005
  ) return skyBuffer;

  // Reuse existing buffer — just clear and redraw
  skyCtx.clearRect(0, 0, width, height);
  drawSky(skyCtx, width, height, dayNightT);
  lastSkyT  = dayNightT;
  lastTheme = null; // unused until theme system is wired
  return skyBuffer;
}
