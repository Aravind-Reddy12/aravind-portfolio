import { spawn } from '../particles';
import { mapRange, clamp } from '../../utils/math';

// Speed line Y positions — seeded once, refreshed occasionally
const SPEED_LINE_COUNT = 4;
const speedLineYs = new Float32Array(SPEED_LINE_COUNT);
const speedLineLens = new Float32Array(SPEED_LINE_COUNT);
let speedLinesSeeded = false;
let speedLineRefreshTimer = 0;

function refreshSpeedLines(height) {
  const band = height * 0.6;
  const top  = height * 0.2;
  for (let i = 0; i < SPEED_LINE_COUNT; i++) {
    speedLineYs[i]   = top + Math.random() * band;
    speedLineLens[i] = 0.3 + Math.random() * 0.5; // fraction of width
  }
}

// Foreground debris tile
const DEBRIS_TILE_W = 400;
const DEBRIS = [
  { x: 0.08, r: 2.5 },
  { x: 0.22, r: 1.5 },
  { x: 0.41, r: 2   },
  { x: 0.60, r: 1.5 },
  { x: 0.75, r: 2   },
  { x: 0.90, r: 1.5 },
];

export function drawForeground(ctx, width, height, worldSpeed, worldOffset, weather) {
  const absSpeed = Math.abs(worldSpeed);
  const dt = 1 / 60; // approximate, good enough for spawn rate

  // ─── Dust particles near road ──────────────────────────────────────────────
  if (absSpeed > 0.1) {
    const count = Math.floor(clamp(absSpeed * 2, 0, 3));
    for (let i = 0; i < count; i++) {
      const rx = Math.random() * width;
      const ry = height * 0.68 + Math.random() * height * 0.06;
      spawn(
        rx, ry,
        (Math.random() - 0.5) * 30,  // vx
        -(Math.random() * 25 + 10),   // vy — float upward
        0.6 + Math.random() * 0.4,    // life
        1 + Math.random() * 1.5,      // size
        0,                             // type = dust
        160, 120                       // warm brown r,g
      );
    }
  }

  // ─── Speed lines ──────────────────────────────────────────────────────────
  if (absSpeed > 0.6) {
    if (!speedLinesSeeded) { refreshSpeedLines(height); speedLinesSeeded = true; }

    speedLineRefreshTimer += dt;
    if (speedLineRefreshTimer > 0.18) {
      refreshSpeedLines(height);
      speedLineRefreshTimer = 0;
    }

    const alpha = mapRange(absSpeed, 0.6, 1.0, 0, 0.15);
    const dir   = worldSpeed > 0 ? -1 : 1; // lines angle in travel direction

    ctx.save();
    ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;

    for (let i = 0; i < SPEED_LINE_COUNT; i++) {
      const lineW  = 100 + speedLineLens[i] * 200; // 100–300px, not screen-wide
      const startX = Math.random() * (width - lineW);
      const y      = speedLineYs[i];
      const angle  = dir * 0.03;

      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(startX, y);
      ctx.lineTo(startX + dir * lineW, y + Math.sin(angle) * lineW * 0.05);
      ctx.stroke();
    }

    ctx.restore();
  }

  // ─── Foreground debris — 1.2× parallax ────────────────────────────────────
  const fgOffset   = worldOffset * 1.2;
  const roadY      = height * 0.70 + 36; // just below road surface
  const firstTile  = Math.floor(fgOffset / DEBRIS_TILE_W) - 1;
  const lastTile   = Math.ceil((fgOffset + width) / DEBRIS_TILE_W) + 1;

  ctx.fillStyle = 'rgba(30, 22, 46, 0.7)';
  for (let tile = firstTile; tile <= lastTile; tile++) {
    const tileX = tile * DEBRIS_TILE_W - fgOffset;
    for (const d of DEBRIS) {
      const dx = tileX + d.x * DEBRIS_TILE_W;
      ctx.beginPath();
      ctx.arc(dx, roadY, d.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // ─── Vignette (always on) ─────────────────────────────────────────────────
  const cx = width / 2;
  const cy = height / 2;
  const vr = Math.max(width, height) * 0.75;

  const vignette = ctx.createRadialGradient(cx, cy, vr * 0.35, cx, cy, vr);
  vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
  vignette.addColorStop(1, 'rgba(0, 0, 0, 0.38)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, width, height);
}
