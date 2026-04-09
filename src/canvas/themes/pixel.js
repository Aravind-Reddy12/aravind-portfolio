import { lerpColor } from '../../utils/colors';
import { mapRange, clamp } from '../../utils/math';
import { spawn, update, drawWith } from '../particles';

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Snap a value to the nearest 4px grid point
function px(v) { return Math.round(v / 4) * 4; }

// Filled rect + black outline, all coords snapped to 4px grid
function pixelRect(ctx, x, y, w, h, fill) {
  x = px(x); y = px(y); w = Math.max(4, px(w)); h = Math.max(4, px(h));
  ctx.fillStyle = fill;
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
}

// Parse a 6-digit hex color to {r,g,b}
function hexToRgb(hex) {
  const h = hex.replace('#', '');
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

// ─── Star data (reuse same seeded positions as sky.js, but pixel-snapped) ─────
const STAR_COUNT = 80;
const pixelStars = [];
let pixelStarsSeeded = false;

function seedPixelStars() {
  for (let i = 0; i < STAR_COUNT; i++) {
    pixelStars.push({
      x:     Math.random(),
      y:     Math.random() * 0.55,
      phase: Math.random() * Math.PI * 2,
      freq:  0.5 + Math.random() * 1.5,
    });
  }
  pixelStarsSeeded = true;
}

// ─── Pixel mountain staircase ─────────────────────────────────────────────────
function drawPixelMountain(ctx, peakX, baseY, halfW, peakH) {
  const steps = Math.max(1, Math.floor(peakH / 4));
  for (let s = 0; s < steps; s++) {
    const t  = s / steps;
    const w  = halfW * (1 - t);
    const y  = baseY - s * 4 - 4;
    ctx.fillRect(Math.floor(peakX - w), y, Math.ceil(w * 2), 4);
  }
}

// ─── Pixel cloud (stacked rectangles) ─────────────────────────────────────────
function drawPixelCloud(ctx, cx, cy, w, h) {
  ctx.fillRect(px(cx - w / 2),        py(cy),          px(w),       px(h));
  ctx.fillRect(px(cx - w * 0.35),     py(cy - h * 0.5), px(w * 0.7), px(h * 0.6));
  ctx.fillRect(px(cx - w * 0.2),      py(cy - h * 0.9), px(w * 0.4), px(h * 0.4));
}
function py(v) { return Math.round(v / 4) * 4; }

// ─── Pixel tree ───────────────────────────────────────────────────────────────
function drawPixelTree(ctx, x, baseY, treeH, dayNightT) {
  const trunkH   = px(treeH * 0.45);
  const canopy   = px(treeH * 0.7);
  const tx       = px(x - 2);
  const trunkTop = py(baseY - trunkH);

  ctx.fillStyle = '#3a2010';
  ctx.fillRect(tx, trunkTop, 4, trunkH);

  const canopyX = px(x - canopy / 2);
  const canopyY = py(baseY - trunkH - canopy);
  ctx.fillStyle = dayNightT > 0.7 ? '#0a1a0a' : '#1a6a10';
  ctx.fillRect(canopyX, canopyY, canopy, canopy);
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 1;
  ctx.strokeRect(canopyX + 0.5, canopyY + 0.5, canopy - 1, canopy - 1);
}

// ─── Pixel cyclist state ──────────────────────────────────────────────────────
let pixelPedalAngle = 0;

// ─── Lightning flash state ────────────────────────────────────────────────────
let pixelFlashDuration = 0;

// ─── Per-building pixel draw functions ────────────────────────────────────────

function drawPixelWindows(ctx, x, y, w, h, cols, rows, winColor, padX, padY, gapX, gapY) {
  ctx.fillStyle = winColor;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      ctx.fillRect(x + padX + c * gapX, y + padY + r * gapY, 8, 8);
    }
  }
}

function drawPixelSchool(ctx, x, y, w, h, active, night) {
  // Body
  pixelRect(ctx, x, y + 20, w, h - 20, '#aa4422');
  // Stepped roof
  ctx.fillStyle = '#662211';
  const steps = 4;
  for (let s = 0; s < steps; s++) {
    const rw = Math.floor((w - s * 24) / 4) * 4;
    const rx = x + s * 12;
    ctx.fillRect(rx, y + (steps - s - 1) * 4, rw, 4);
  }
  ctx.strokeStyle = '#000'; ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  // Windows
  drawPixelWindows(ctx, x, y + 20, w, h - 20, 3, 2,
    night || active ? '#ffff44' : '#331100', 20, 12, 60, 48);
  // Door
  ctx.fillStyle = '#220800';
  ctx.fillRect(px(x + w / 2 - 10), y + h - 32, 20, 32);
}

function drawPixelOffice(ctx, x, y, w, h, active, night) {
  pixelRect(ctx, x, y, w, h, '#445566');
  // Cap
  ctx.fillStyle = '#223344';
  ctx.fillRect(x, y, w, 12);
  ctx.strokeStyle = '#000'; ctx.lineWidth = 1;
  // Windows
  const wc = night || active ? '#ffee88' : '#112233';
  ctx.fillStyle = wc;
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 4; c++) {
      if (!night && (r * 4 + c) % 5 === 3) continue;
      ctx.fillRect(x + 12 + c * 48, y + 20 + r * 32, 8, 8);
    }
  }
}

function drawPixelGarage(ctx, x, y, w, h, active, night) {
  pixelRect(ctx, x, y, w, h, '#5a4a3a');
  // Roof bar
  ctx.fillStyle = '#2a1a0a';
  ctx.fillRect(x - 4, y, w + 8, 12);
  // Door
  ctx.fillStyle = active ? '#777' : '#2a1a0a';
  ctx.fillRect(x + 16, y + 16, w - 32, h - 28);
  ctx.strokeStyle = '#5a4a3a'; ctx.lineWidth = 2;
  for (let i = 1; i < 4; i++) {
    const dy = y + 16 + i * Math.floor((h - 28) / 4);
    ctx.beginPath(); ctx.moveTo(x + 16, dy); ctx.lineTo(x + w - 16, dy); ctx.stroke();
  }
  // Gear icon — simple circle outline
  ctx.strokeStyle = '#ffcc00'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.arc(x + w - 20, y + 14, 6, 0, Math.PI * 2); ctx.stroke();
}

function drawPixelCourt(ctx, x, y, w, h, active, night) {
  pixelRect(ctx, x, y, w, h, '#3a7a3a');
  // Court surface
  ctx.fillStyle = '#2a5a2a';
  ctx.fillRect(x + 8, y + 24, w - 16, h - 32);
  // Hoop (pixel L-shape)
  ctx.strokeStyle = '#ffcc00'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(x + w - 16, y); ctx.lineTo(x + w - 16, y - 28); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x + w - 28, y - 28); ctx.lineTo(x + w - 4, y - 28); ctx.stroke();
  // Backboard pixel rect
  ctx.fillStyle = '#e8d5b7';
  ctx.fillRect(x + w - 28, y - 32, 24, 4);
  // Hoop ring (2px line)
  ctx.strokeStyle = '#ffcc00'; ctx.lineWidth = 2;
  ctx.strokeRect(x + w - 24, y - 20, 16, 4);
}

function drawPixelCafe(ctx, x, y, w, h, active, night) {
  pixelRect(ctx, x, y + 24, w, h - 24, '#6a4a3a');
  // Awning — striped rectangles
  ctx.fillStyle = '#cc2211';
  ctx.fillRect(x - 4, y, w + 8, 24);
  ctx.fillStyle = '#ee3322';
  for (let i = 0; i < 4; i++) ctx.fillRect(x + 4 + i * 40, y, 16, 24);
  ctx.strokeStyle = '#000'; ctx.lineWidth = 1; ctx.strokeRect(x - 3.5, y + 0.5, w + 7, 23);
  // Windows
  ctx.fillStyle = night || active ? '#ffcc66' : '#3a1a0a';
  ctx.fillRect(x + 12, y + 36, 28, 24);
  ctx.fillRect(x + w - 40, y + 36, 28, 24);
  // Door
  ctx.fillStyle = '#220800';
  ctx.fillRect(px(x + w / 2 - 10), y + h - 40, 20, 40);
  // Sign text pixel block
  ctx.fillStyle = '#ffcc00';
  ctx.fillRect(px(x + w / 2 - 12), y + 6, 24, 8);
}

function drawPixelToggle(ctx, x, y, w, h, hovered) {
  // Cartridge body
  const now = Date.now();
  const pulse = Math.floor(now / 400) % 2 === 0;
  pixelRect(ctx, x + 8, y + 8, w - 16, h - 16, '#886644');
  // Label area
  ctx.fillStyle = '#ccaa66';
  ctx.fillRect(x + 12, y + 16, w - 24, 20);
  // Cartridge slot notch at top
  ctx.fillStyle = '#2a1a08';
  ctx.fillRect(px(x + w / 2 - 8), y + 8, 16, 8);
  // Pulsing outline
  if (hovered || pulse) {
    ctx.strokeStyle = hovered ? '#ffcc00' : '#ff8800';
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 8, y + 8, w - 16, h - 16);
  }
}

// ─── Main theme export ────────────────────────────────────────────────────────

export const pixelTheme = {
  id: 'pixel',
  label: 'Pixel Art',

  palette: {
    ground:         '#3a7a2a',
    road:           '#555555',
    roadLine:       '#ffcc00',
    accent:         '#ff4444',
    accentDim:      '#aa2222',
    text:           '#ffffff',
    textMuted:      '#aaaaaa',
    bg:             '#1a1a2e',
    surface:        '#2a2a3e',
    buildingFill:   '#886644',
    buildingStroke: '#000000',
    particleTint:   '#ffcc00',
    jerseyFill:     '#ff4444',
    jerseyStroke:   '#000000',
  },

  fonts: {
    '--font-display': "'Press Start 2P', monospace",
    '--font-body':    "'VT323', monospace",
  },

  drawBackground(ctx, skyPalette, dayNightT, worldOffset, width, height) {
    ctx.imageSmoothingEnabled = false;
    const horizonY = height * 0.70;
    const BAND = 8;
    const bands = Math.ceil(horizonY / BAND);
    const top = hexToRgb(skyPalette.top);
    const bot = hexToRgb(skyPalette.bottom);

    // Blocky horizontal color bands — no gradient
    for (let i = 0; i < bands; i++) {
      const t = i / Math.max(bands - 1, 1);
      const r = Math.round(top.r + (bot.r - top.r) * t);
      const g = Math.round(top.g + (bot.g - top.g) * t);
      const b = Math.round(top.b + (bot.b - top.b) * t);
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.fillRect(0, i * BAND, width, BAND);
    }

    const now = Date.now();

    // Stars — 4×4 squares, blink on/off (no alpha)
    if (dayNightT > 0.75) {
      if (!pixelStarsSeeded) seedPixelStars();
      const starAlpha = clamp(mapRange(dayNightT, 0.75, 0.9, 0, 1), 0, 1);
      if (starAlpha > 0.5) {
        ctx.fillStyle = '#ffffff';
        for (const s of pixelStars) {
          const on = Math.sin(now * 0.001 * s.freq + s.phase) > 0;
          if (!on) continue;
          ctx.fillRect(px(s.x * width), px(s.y * horizonY), 4, 4);
        }
      }
    }

    // Sun — 20×20 yellow square
    if (dayNightT >= 0.05 && dayNightT <= 0.70) {
      const sunT = mapRange(dayNightT, 0.05, 0.70, 0, 1);
      const sunX = px(width * (0.1 + sunT * 0.8));
      const arcT = sunT;
      const sunY = px(horizonY * (0.8 - 0.6 * (1 - Math.pow(arcT * 2 - 1, 2))));
      pixelRect(ctx, sunX - 10, sunY - 10, 20, 20, '#FFD700');
    }

    // Moon — 16×16 grey square
    const moonT_raw = dayNightT >= 0.78 ? mapRange(dayNightT, 0.78, 1.0, 0, 0.9)
                    : dayNightT <= 0.05  ? mapRange(dayNightT, 0.0,  0.05, 0.9, 1.0)
                    : -1;
    if (moonT_raw >= 0) {
      const moonX = px(width  * (0.15 + moonT_raw * 0.70));
      const moonY = px(horizonY * (0.15 + 0.25 * Math.sin(moonT_raw * Math.PI)));
      pixelRect(ctx, moonX - 8, moonY - 8, 16, 16, '#C0C0C0');
    }

    // Mountains — staircase silhouettes (0.2× parallax)
    const offset = worldOffset * 0.2;
    const TILE_W = 1200;
    const farColor  = dayNightT > 0.7 ? '#0d0d1a' : '#2d3d4d';
    const nearColor = dayNightT > 0.7 ? '#111122' : '#3a4a5a';

    const mSets = [
      { color: farColor,  h: 160, mountains: [
        { x: 0.0, halfW: 180 }, { x: 0.3, halfW: 210 },
        { x: 0.62, halfW: 190 }, { x: 0.85, halfW: 150 },
      ]},
      { color: nearColor, h: 100, mountains: [
        { x: 0.12, halfW: 140 }, { x: 0.44, halfW: 160 },
        { x: 0.72, halfW: 130 }, { x: 0.92, halfW: 145 },
      ]},
    ];

    for (const mset of mSets) {
      ctx.fillStyle = mset.color;
      const first = Math.floor(offset / TILE_W) - 1;
      const last  = Math.ceil((offset + width) / TILE_W) + 1;
      for (let tile = first; tile <= last; tile++) {
        const tileX = tile * TILE_W - offset;
        for (const m of mset.mountains) {
          drawPixelMountain(ctx, tileX + m.x * TILE_W, horizonY - 8, m.halfW, mset.h);
        }
      }
    }

    // Clouds — stacked rectangles (day/dusk only)
    const cloudVis = dayNightT < 0.8 && dayNightT > 0.05;
    if (cloudVis) {
      const CLOUD_TILE = 1800;
      const coffset  = offset * 0.6;
      const first = Math.floor(coffset / CLOUD_TILE) - 1;
      const last  = Math.ceil((coffset + width) / CLOUD_TILE) + 1;
      const cloudAlpha = dayNightT > 0.7 ? mapRange(dayNightT, 0.7, 0.8, 0.4, 0) : 0.4;
      ctx.fillStyle = `rgba(255,255,255,${cloudAlpha})`;
      const CLOUDS = [
        { x: 0.05, y: 0.12, w: 80, h: 20 },
        { x: 0.28, y: 0.08, w: 100, h: 24 },
        { x: 0.55, y: 0.14, w: 64, h: 16 },
        { x: 0.78, y: 0.10, w: 88, h: 20 },
      ];
      for (let tile = first; tile <= last; tile++) {
        const tileX = tile * CLOUD_TILE - coffset;
        for (const c of CLOUDS) {
          drawPixelCloud(ctx, tileX + c.x * CLOUD_TILE, c.y * horizonY, c.w, c.h);
        }
      }
    }
  },

  drawMidground(ctx, worldOffset, dayNightT, width, height) {
    ctx.imageSmoothingEnabled = false;
    const offset   = worldOffset * 0.5;
    const horizonY = height * 0.70;
    const step     = 4;

    // Stepped hill terrain — draw column-by-column staircase
    const hillColor = dayNightT > 0.7 ? '#1a2a12' : '#2a6a1a';
    ctx.fillStyle = hillColor;
    for (let col = 0; col < width + step; col += step) {
      const wx = (col + offset) % 3200;
      // Two sine waves for organic-ish staircase
      const h = Math.max(step,
        Math.round((18 + 14 * Math.sin(wx * 0.004) + 10 * Math.sin(wx * 0.011)) / step) * step
      );
      ctx.fillRect(col, horizonY - h, step, h);
    }

    // Pixel trees at regular world-space intervals
    const TREE_SPACING = 120;
    const treeOffset   = offset % TREE_SPACING;
    const treeCount    = Math.ceil(width / TREE_SPACING) + 2;

    for (let i = 0; i < treeCount; i++) {
      const tx = i * TREE_SPACING - treeOffset;
      // Vary tree height by position
      const wx = Math.floor((tx + offset) % 3200);
      const treeH = 40 + (wx % 3) * 12; // 40, 52, or 64px
      const baseH = Math.max(step,
        Math.round((18 + 14 * Math.sin((tx + offset) * 0.004) + 10 * Math.sin((tx + offset) * 0.011)) / step) * step
      );
      drawPixelTree(ctx, tx, horizonY - baseH + step, treeH, dayNightT);
    }
  },

  drawRoad(ctx, worldOffset, width, height) {
    ctx.imageSmoothingEnabled = false;
    const GROUND_RATIO  = 0.30;
    const ROAD_HEIGHT   = 40;
    const DASH_W        = 16;
    const DASH_H        = 4;
    const DASH_SPACING  = 48;

    const groundY = px(height * (1 - GROUND_RATIO));
    const roadY   = groundY;

    // Ground (grass in pixel theme)
    ctx.fillStyle = this.palette.ground;
    ctx.fillRect(0, roadY + ROAD_HEIGHT, width, height - roadY - ROAD_HEIGHT);

    // Road surface
    ctx.fillStyle = this.palette.road;
    ctx.fillRect(0, roadY, width, ROAD_HEIGHT);

    // Black edge lines
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, roadY, width, 2);
    ctx.fillRect(0, roadY + ROAD_HEIGHT - 2, width, 2);

    // Chunky yellow dashes
    const dashOffset = -(worldOffset % DASH_SPACING);
    ctx.fillStyle = this.palette.roadLine;
    for (let x = dashOffset; x < width; x += DASH_SPACING) {
      ctx.fillRect(px(x), roadY + ROAD_HEIGHT / 2 - DASH_H / 2, DASH_W, DASH_H);
    }
  },

  drawBuilding(ctx, building, screenX, baseY, dayNightT, isHovered, isActive) {
    ctx.imageSmoothingEnabled = false;
    const x     = px(screenX);
    const y     = py(baseY - building.height);
    const w     = px(building.width);
    const h     = px(building.height);
    const night = dayNightT > 0.7;

    // Hover: bright outline (no blur — pixel art)
    if (isHovered && building.id !== 'toggle') {
      ctx.strokeStyle = '#ffcc00';
      ctx.lineWidth = 3;
      ctx.strokeRect(x - 2, y - 2, w + 4, h + 4);
    }

    ctx.save();
    switch (building.id) {
      case 'education':  drawPixelSchool(ctx, x, y, w, h, isActive, night);         break;
      case 'experience': drawPixelOffice(ctx, x, y, w, h, isActive, night);         break;
      case 'projects':   drawPixelGarage(ctx, x, y, w, h, isActive, night);         break;
      case 'hobbies':    drawPixelCourt(ctx, x, y, w, h, isActive, night);           break;
      case 'contact':    drawPixelCafe(ctx, x, y, w, h, isActive, night);            break;
      case 'toggle':     drawPixelToggle(ctx, x, y, w, h, isHovered);               break;
    }
    ctx.restore();

    // Label
    ctx.fillStyle    = '#ffffff';
    ctx.font         = '8px monospace';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(building.label, x + w / 2, baseY + 4);
  },

  drawCyclist(ctx, { world, width, height }) {
    ctx.imageSmoothingEnabled = false;
    const speed = world.worldSpeed;
    pixelPedalAngle += speed * 0.07;

    // 4 animation frames from pedal angle
    const norm  = ((pixelPedalAngle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    const frame = Math.floor(norm / (Math.PI * 2) * 4) % 4;

    const cx      = px(width * 0.33);
    const groundY = px(height * 0.70);
    const wheelY  = groundY + 14;                           // wheel centres touch road
    const lean    = speed > 0.6 ? 8 : speed > 0.3 ? 4 : 0;

    // ── Key geometry ──────────────────────────────────────────────────────────
    const rearWL  = cx - 20;           // rear wheel left edge
    const frontWL = cx + 12 + lean;    // front wheel left edge
    const rearCX  = rearWL  + 4;       // rear wheel centre x
    const frontCX = frontWL + 4;       // front wheel centre x
    const bbX     = cx - 2;            // bottom bracket (pedal pivot)
    const bbY     = wheelY - 4;
    const seatX   = cx - 10 + lean;    // seat top
    const seatY   = wheelY - 16;
    const htX     = cx + 10 + lean;    // head-tube top
    const htY     = wheelY - 12;

    // ── Frame lines (yellow, 2px, square caps) ────────────────────────────────
    ctx.strokeStyle = '#ffcc00';
    ctx.lineWidth   = 2;
    ctx.lineCap     = 'square';
    function line(ax, ay, bx, by) {
      ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
    }
    line(rearCX, wheelY, bbX,   bbY);   // chain stay
    line(bbX,    bbY,    seatX, seatY); // seat tube
    line(bbX,    bbY,    htX,   htY);   // down tube
    line(htX,    htY,    frontCX, wheelY); // fork
    line(seatX,  seatY,  rearCX, wheelY);  // seat stay

    // Handlebars — 6×2 pixel rect at head-tube top
    ctx.fillStyle = '#aaaaaa';
    ctx.fillRect(htX - 1, htY - 5, 6, 2);
    ctx.strokeStyle = '#000'; ctx.lineWidth = 1;
    ctx.strokeRect(htX - 0.5, htY - 4.5, 5, 1);

    // ── Wheels — 8×8 grey squares, black outline ─────────────────────────────
    pixelRect(ctx, rearWL,  wheelY - 4, 8, 8, '#aaaaaa');
    pixelRect(ctx, frontWL, wheelY - 4, 8, 8, '#aaaaaa');

    // ── Rider sitting on the seat ─────────────────────────────────────────────
    // Hip is pinned to the seat top
    const hipX = seatX - 1;
    const hipY = seatY;

    // Leg animation: shin length varies per frame (thigh is always 8px down from hip)
    // [left shin height, right shin height]  — max 8 = foot at pedal level
    const LEG_FRAMES = [
      [8, 4],   // frame 0: left leg down,  right leg up
      [6, 6],   // frame 1: both mid
      [4, 8],   // frame 2: left leg up,    right leg down
      [6, 6],   // frame 3: both mid
    ];
    const [lShin, rShin] = LEG_FRAMES[frame];
    const kneeY = hipY + 8;

    // Right leg (behind — slightly faded)
    ctx.globalAlpha = 0.65;
    ctx.fillStyle = '#222244';                           // shorts — thigh
    ctx.fillRect(hipX + 2, hipY,    4, 8);
    ctx.strokeStyle = '#000'; ctx.lineWidth = 1;
    ctx.strokeRect(hipX + 2.5, hipY + 0.5, 3, 7);
    ctx.fillStyle = '#e8b88a';                           // skin — shin
    ctx.fillRect(hipX + 2, kneeY, 4, rShin);
    ctx.strokeRect(hipX + 2.5, kneeY + 0.5, 3, rShin - 1);
    ctx.globalAlpha = 1;

    // Left leg (front)
    ctx.fillStyle = '#222244';
    ctx.fillRect(hipX - 2, hipY,    4, 8);
    ctx.strokeStyle = '#000'; ctx.lineWidth = 1;
    ctx.strokeRect(hipX - 1.5, hipY + 0.5, 3, 7);
    ctx.fillStyle = '#e8b88a';
    ctx.fillRect(hipX - 2, kneeY, 4, lShin);
    ctx.strokeRect(hipX - 1.5, kneeY + 0.5, 3, lShin - 1);

    // Torso — 6×8 jersey red with black outline
    const torsoX = hipX - 3;
    const torsoY = hipY - 8;
    ctx.fillStyle = '#ff4444';
    ctx.fillRect(torsoX, torsoY, 6, 8);
    ctx.strokeStyle = '#000'; ctx.lineWidth = 1;
    ctx.strokeRect(torsoX + 0.5, torsoY + 0.5, 5, 7);

    // Arm — 2px tall skin rect from torso to handlebar
    ctx.fillStyle = '#e8b88a';
    const armStartX = torsoX + 5;
    const armEndX   = htX + 2;
    ctx.fillRect(armStartX, torsoY + 2, armEndX - armStartX, 2);

    // Head — 6×6 skin with black outline
    const headX = torsoX;
    const headY = torsoY - 6;
    ctx.fillStyle = '#e8b88a';
    ctx.fillRect(headX, headY, 6, 6);
    ctx.strokeStyle = '#000'; ctx.lineWidth = 1;
    ctx.strokeRect(headX + 0.5, headY + 0.5, 5, 5);

    // Helmet — 8×4 jersey red cap, black outline
    ctx.fillStyle = '#ff4444';
    ctx.fillRect(headX - 1, headY - 3, 8, 4);
    ctx.strokeStyle = '#000'; ctx.lineWidth = 1;
    ctx.strokeRect(headX - 0.5, headY - 2.5, 7, 3);
  },

  drawWeather(ctx, weather, worldSpeed, dt, width, height) {
    ctx.imageSmoothingEnabled = false;

    // Spawn rain (pixel-sized)
    if (weather.rainIntensity > 0) {
      const count = Math.floor(weather.rainIntensity * 8);
      for (let i = 0; i < count; i++) {
        spawn(Math.random() * width, -10,
          worldSpeed * -50 + (Math.random() * 20 - 10),
          300 + Math.random() * 100,
          1.5, 2, 1, 68, 68);
      }
    }

    // Spawn wind debris
    if (weather.windIntensity > 0.3) {
      const count = Math.floor((weather.windIntensity - 0.3) * 3);
      for (let i = 0; i < count; i++) {
        spawn(-10, Math.random() * height * 0.7,
          100 + Math.random() * 80, Math.random() * 30 - 15,
          3, 3, 2, 136, 136);
      }
    }

    update(dt);

    // Draw particles as pixel rectangles
    drawWith(ctx, (ctx, x, y, vx, vy, type, size, r, g, a) => {
      if (type === 1) {
        // Rain: 4×2 blue rect
        ctx.fillStyle = `rgba(68,68,255,${a * 0.8})`;
        ctx.fillRect(px(x), py(y), 4, 2);
      } else if (type === 2) {
        // Wind debris: 4×4 square
        ctx.fillStyle = `rgba(136,136,68,${a})`;
        ctx.fillRect(px(x), py(y), 4, 4);
      } else {
        // Dust: 4×4 square
        ctx.fillStyle = `rgba(${r},${g},100,${a * 0.6})`;
        ctx.fillRect(px(x), py(y), 4, 4);
      }
    });

    // Lightning — same gentle flash alpha as lo-fi
    if (weather.lightningActive) {
      if (pixelFlashDuration <= 0 && Math.random() < 0.01) {
        pixelFlashDuration = 0.10;
      }
    }
    if (pixelFlashDuration > 0) {
      pixelFlashDuration -= dt;
      if (pixelFlashDuration > 0) {
        ctx.fillStyle = 'rgba(255,255,255,0.12)';
        ctx.fillRect(0, 0, width, height);
      }
    }
  },

  drawForeground(ctx, worldSpeed, worldOffset, weather, width, height) {
    ctx.imageSmoothingEnabled = false;
    const absSpeed = Math.abs(worldSpeed);

    // Dust near road — 4×4 squares
    if (absSpeed > 0.1) {
      const count = Math.floor(clamp(absSpeed * 2, 0, 3));
      for (let i = 0; i < count; i++) {
        spawn(
          Math.random() * width, height * 0.68 + Math.random() * height * 0.06,
          (Math.random() - 0.5) * 30, -(Math.random() * 25 + 10),
          0.6 + Math.random() * 0.4, 2, 0, 160, 120
        );
      }
    }

    // Speed lines — subtle 2px pixel rects, same threshold as lo-fi
    if (absSpeed > 0.6) {
      const alpha = mapRange(absSpeed, 0.6, 1.0, 0, 0.15);
      const dir   = worldSpeed > 0 ? -1 : 1;
      ctx.fillStyle = `rgba(255,255,255,${alpha})`;
      for (let i = 0; i < 3; i++) {
        const lineW  = px(60 + Math.random() * 140);   // 60–200px
        const startX = px(Math.random() * (width - lineW));
        const lineY  = py(height * 0.2 + Math.random() * height * 0.6);
        ctx.fillRect(startX, lineY, dir * lineW, 2);
      }
    }

    // Foreground debris — 4×4 pixel dots at 1.2× parallax, no vignette
    const fgOffset  = worldOffset * 1.2;
    const roadY     = height * 0.70 + 36;
    const TILE_W    = 400;
    const DEBRIS    = [0.08, 0.22, 0.41, 0.60, 0.75, 0.90];
    const first     = Math.floor(fgOffset / TILE_W) - 1;
    const last      = Math.ceil((fgOffset + width) / TILE_W) + 1;

    ctx.fillStyle = 'rgba(30,22,46,0.8)';
    for (let tile = first; tile <= last; tile++) {
      const tileX = tile * TILE_W - fgOffset;
      for (const d of DEBRIS) {
        ctx.fillRect(px(tileX + d * TILE_W), py(roadY), 4, 4);
      }
    }
    // No vignette — pixel art doesn't do gradients
  },

  drawToggleObject(ctx, screenX, baseY, interactionState) {
    // The toggle building is drawn via drawBuilding (id === 'toggle')
  },

  // CRT scanline wipe: sweeps top→bottom as progress 0→1
  transitionIn(ctx, progress, width, height) {
    const wipeY = Math.floor(progress * height / 4) * 4;
    if (wipeY >= height) return;

    // Solid black below the wipe line
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, wipeY, width, height - wipeY);

    // Scanline texture (subtle green CRT tint on alternating rows)
    ctx.fillStyle = 'rgba(0,255,0,0.07)';
    for (let y = wipeY; y < height; y += 8) {
      ctx.fillRect(0, y, width, 2);
    }
  },
};
