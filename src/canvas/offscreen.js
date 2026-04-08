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

export function getSkyBuffer(width, height, palette, dayNightT, theme) {
  if (!skyBuffer) init(width, height);

  if (
    Math.abs(dayNightT - lastSkyT) < 0.005 &&
    theme.id === lastTheme
  ) return skyBuffer;

  // Reuse existing buffer — just clear and redraw
  skyCtx.clearRect(0, 0, width, height);
  theme.drawBackground(skyCtx, palette, dayNightT, 0);
  lastSkyT  = dayNightT;
  lastTheme = theme.id;
  return skyBuffer;
}
