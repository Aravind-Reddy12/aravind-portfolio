import { lerpColor, alpha } from '../../utils/colors';
import { clamp, mapRange } from '../../utils/math';

const PARALLAX = 0.2;
const HORIZON_Y = 0.70; // fraction of canvas height where road starts

// Mountain definitions — each set tiles across a wide virtual world
// Each mountain: { x (0–1 of tile width), width (px), height (px) }
const TILE_W = 1200; // px — tile repeats at this interval

const MOUNTAIN_SETS = [
  // Far range (tallest, darkest)
  [
    { x: 0.0,  w: 360, h: 160 },
    { x: 0.3,  w: 420, h: 190 },
    { x: 0.62, w: 380, h: 145 },
    { x: 0.85, w: 300, h: 170 },
  ],
  // Near range (shorter, slightly lighter)
  [
    { x: 0.12, w: 280, h: 100 },
    { x: 0.44, w: 320, h: 115 },
    { x: 0.72, w: 260, h: 90  },
    { x: 0.92, w: 290, h: 105 },
  ],
];

// Cloud definitions — static relative positions in a wider virtual space
const CLOUD_TILE_W = 1800;
const CLOUDS = [
  { x: 0.05, y: 0.12, rx: 80, ry: 22 },
  { x: 0.28, y: 0.08, rx: 110, ry: 28 },
  { x: 0.55, y: 0.15, rx: 70,  ry: 18 },
  { x: 0.78, y: 0.10, rx: 95,  ry: 24 },
];

function getMountainColor(index, dayNightT) {
  const palettes = [
    // far range
    { day: '#2d3d4d', dusk: '#1e1835', night: '#0d0d1a' },
    // near range
    { day: '#3a4a5a', dusk: '#2a2040', night: '#111122' },
  ];
  const p = palettes[index] || palettes[0];
  if (dayNightT <= 0.1 || dayNightT >= 0.9) return p.night;
  if (dayNightT <= 0.2) return lerpColor(p.night, p.dusk, mapRange(dayNightT, 0.1, 0.2, 0, 1));
  if (dayNightT <= 0.3) return lerpColor(p.dusk,  p.day,  mapRange(dayNightT, 0.2, 0.3, 0, 1));
  if (dayNightT <= 0.7) return p.day;
  if (dayNightT <= 0.8) return lerpColor(p.day,   p.dusk, mapRange(dayNightT, 0.7, 0.8, 0, 1));
  return lerpColor(p.dusk, p.night, mapRange(dayNightT, 0.8, 0.9, 0, 1));
}

function drawMountainSet(ctx, width, height, offset, setIndex, baseY) {
  const color = getMountainColor(setIndex, 0); // color passed separately
  const mountains = MOUNTAIN_SETS[setIndex];

  // How many tiles needed to cover viewport
  const firstTile = Math.floor(offset / TILE_W) - 1;
  const lastTile  = Math.ceil((offset + width) / TILE_W) + 1;

  for (let tile = firstTile; tile <= lastTile; tile++) {
    const tileX = tile * TILE_W - offset;
    for (const m of mountains) {
      const mx = tileX + m.x * TILE_W;
      const my = baseY;
      // Draw mountain as a bezier triangle
      ctx.beginPath();
      ctx.moveTo(mx - m.w / 2, my);
      ctx.quadraticCurveTo(mx, my - m.h, mx + m.w / 2, my);
      ctx.closePath();
      ctx.fill();
    }
  }
}

function getCloudAlpha(dayNightT) {
  if (dayNightT > 0.8) return clamp(mapRange(dayNightT, 0.8, 0.95, 0.25, 0), 0, 0.25);
  if (dayNightT < 0.1) return clamp(mapRange(dayNightT, 0.0,  0.1,  0,   0.25), 0, 0.25);
  return 0.25;
}

export function drawBackground(ctx, width, height, worldOffset, dayNightT) {
  const offset  = worldOffset * PARALLAX;
  const horizonY = height * HORIZON_Y;

  // Far mountain range
  const farColor = getMountainColor(0, dayNightT);
  ctx.fillStyle = farColor;
  drawMountainSet(ctx, width, height, offset, 0, horizonY - 10);

  // Near mountain range
  const nearColor = getMountainColor(1, dayNightT);
  ctx.fillStyle = nearColor;
  drawMountainSet(ctx, width, height, offset, 1, horizonY - 5);

  // Clouds
  const cloudA = getCloudAlpha(dayNightT);
  if (cloudA > 0) {
    const firstTile = Math.floor(offset / CLOUD_TILE_W) - 1;
    const lastTile  = Math.ceil((offset + width) / CLOUD_TILE_W) + 1;

    for (let tile = firstTile; tile <= lastTile; tile++) {
      const tileX = tile * CLOUD_TILE_W - offset;
      for (const c of CLOUDS) {
        const cx = tileX + c.x * CLOUD_TILE_W;
        const cy = c.y * horizonY;
        ctx.fillStyle = `rgba(255, 255, 255, ${cloudA})`;
        ctx.beginPath();
        ctx.ellipse(cx, cy, c.rx, c.ry, 0, 0, Math.PI * 2);
        ctx.fill();
        // Slightly smaller bright center
        ctx.fillStyle = `rgba(255, 255, 255, ${cloudA * 0.5})`;
        ctx.beginPath();
        ctx.ellipse(cx - c.rx * 0.15, cy - c.ry * 0.3, c.rx * 0.6, c.ry * 0.7, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}
