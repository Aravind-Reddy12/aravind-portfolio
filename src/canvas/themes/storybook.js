import { mapRange, clamp } from '../../utils/math';
import { spawn, update, drawWith } from '../particles';

// ─── Wobbly Line Helpers ──────────────────────────────────────────────────────
// All wobble uses sin waves keyed to position — stable frame-to-frame, no jitter.

function wobblyLine(ctx, x1, y1, x2, y2, wobble = 3) {
  const dx  = x2 - x1;
  const dy  = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len < 1) return;
  // Perpendicular unit vector
  const px = -dy / len;
  const py =  dx / len;
  // Stable offsets keyed to endpoint positions — no Math.random()
  const w1 = Math.sin(x1 * 0.047 + y1 * 0.031) * wobble;
  const w2 = Math.sin(x2 * 0.047 + y2 * 0.031 + 1.7) * wobble;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.bezierCurveTo(
    x1 + dx * 0.33 + px * w1, y1 + dy * 0.33 + py * w1,
    x1 + dx * 0.67 + px * w2, y1 + dy * 0.67 + py * w2,
    x2, y2,
  );
  ctx.stroke();
}

function wobblyRect(ctx, x, y, w, h, wobble = 3) {
  wobblyLine(ctx, x,     y,     x + w, y,     wobble); // top
  wobblyLine(ctx, x + w, y,     x + w, y + h, wobble); // right
  wobblyLine(ctx, x + w, y + h, x,     y + h, wobble); // bottom
  wobblyLine(ctx, x,     y + h, x,     y,     wobble); // left
}

function hatchFill(ctx, x, y, w, h, spacing = 6, angle = Math.PI / 4) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  const cos  = Math.cos(angle);
  const sin  = Math.sin(angle);
  const diag = Math.sqrt(w * w + h * h) + spacing;
  const cx   = x + w / 2;
  const cy   = y + h / 2;
  ctx.beginPath();
  for (let d = -diag; d < diag; d += spacing) {
    ctx.moveTo(cx + cos * d - sin * diag, cy + sin * d + cos * diag);
    ctx.lineTo(cx + cos * d + sin * diag, cy + sin * d - cos * diag);
  }
  ctx.stroke();
  ctx.restore();
}

// Parse a 6-digit hex to {r,g,b}
function hexToRgb(hex) {
  const h = hex.replace('#', '');
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

// Draw a 5-point star — wobble is position-based, stable
function drawStar(ctx, cx, cy, r, wobble = 1.5) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const angle  = (i * Math.PI) / 5 - Math.PI / 2;
    const radius = i % 2 === 0 ? r : r * 0.45;
    const w = Math.sin(cx * 0.07 + cy * 0.05 + i * 1.3) * wobble;
    const rx = cx + Math.cos(angle) * (radius + w);
    const ry = cy + Math.sin(angle) * (radius + w);
    if (i === 0) ctx.moveTo(rx, ry);
    else ctx.lineTo(rx, ry);
  }
  ctx.closePath();
}

// Puffy cloud made of overlapping ellipses — time used only for slow pulse
function drawWobblyCloud(ctx, cx, cy, r, time) {
  const BLOBS = [
    { dx:  0,            dy:  0,           rb: 1.00 },
    { dx:  r * 0.70,     dy:  r * 0.15,   rb: 0.75 },
    { dx: -r * 0.70,     dy:  r * 0.15,   rb: 0.70 },
    { dx:  r * 0.35,     dy: -r * 0.55,   rb: 0.65 },
    { dx: -r * 0.30,     dy: -r * 0.50,   rb: 0.60 },
  ];
  for (const b of BLOBS) {
    const pulse = 1 + Math.sin(time * 0.4 + b.dx * 0.05) * 0.05;
    ctx.beginPath();
    ctx.arc(cx + b.dx, cy + b.dy, b.rb * r * pulse, 0, Math.PI * 2);
    ctx.fill();
  }
}

// Wobbly mountain silhouette using quadratic bezier slopes
function drawWobblyMountain(ctx, peakX, peakY, baseY, halfW) {
  ctx.beginPath();
  ctx.moveTo(peakX - halfW, baseY);
  const lCx = peakX - halfW * 0.6 + Math.sin(peakX * 0.020) * 8;
  const lCy = peakY + (baseY - peakY) * 0.5 + Math.sin(peakX * 0.015) * 10;
  ctx.quadraticCurveTo(lCx, lCy, peakX, peakY);
  const rCx = peakX + halfW * 0.6 + Math.sin(peakX * 0.020 + 2) * 8;
  const rCy = peakY + (baseY - peakY) * 0.5 + Math.sin(peakX * 0.015 + 1) * 10;
  ctx.quadraticCurveTo(rCx, rCy, peakX + halfW, baseY);
  ctx.closePath();
  ctx.fill();
}

// ─── Module-level state (stable seeds + per-session animation) ────────────────
const SB_STARS = [];
let sbStarsSeeded = false;
let sbPedalAngle  = 0;
let sbFlashDuration = 0;

const SB_CLOUD_POSITIONS = [
  { ox: 0.05, oy: 0.12, r: 55 },
  { ox: 0.28, oy: 0.08, r: 70 },
  { ox: 0.55, oy: 0.14, r: 48 },
  { ox: 0.78, oy: 0.09, r: 60 },
];

function seedStars() {
  for (let i = 0; i < 60; i++) {
    SB_STARS.push({
      xFrac: Math.sin(i * 2.4) * 0.5 + 0.5,
      yFrac: (Math.sin(i * 3.7) * 0.5 + 0.5) * 0.55,
      r:     1.5 + (i % 3) * 0.8,
      phase: i * 0.7,
      freq:  0.4 + (i % 5) * 0.15,
    });
  }
  sbStarsSeeded = true;
}

// ─── Main theme export ────────────────────────────────────────────────────────

export const storybookTheme = {
  id:    'storybook',
  label: 'Illustrated Storybook',

  palette: {
    ground:         '#c8b99a',
    road:           '#8b7355',
    roadLine:       '#f5f0e1',
    accent:         '#d4634b',
    accentDim:      '#a04830',
    text:           '#3a2f25',
    textMuted:      '#7a6b5a',
    bg:             '#f5f0e1',
    surface:        '#ebe3d1',
    buildingFill:   '#e8dcc8',
    buildingStroke: '#5a4a3a',
    particleTint:   '#7aab6e',
    jerseyFill:     '#d4634b',
    jerseyStroke:   '#3a2f25',
  },

  fonts: {
    '--font-display': "'Lora', serif",
    '--font-body':    "'Nunito', sans-serif",
  },

  // ── Background: sky wash, paper texture, sun/moon, stars, clouds, mountains ─

  drawBackground(ctx, skyPalette, dayNightT, worldOffset, width, height) {
    if (!sbStarsSeeded) seedStars();
    const horizonY = height * 0.70;
    const now      = Date.now() * 0.001;
    const topRgb   = hexToRgb(skyPalette.top);
    const botRgb   = hexToRgb(skyPalette.bottom);

    // Watercolour sky wash — base gradient
    const grad = ctx.createLinearGradient(0, 0, 0, horizonY);
    grad.addColorStop(0, skyPalette.top);
    grad.addColorStop(1, skyPalette.bottom);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, horizonY);

    // Subtle horizontal bands (organic watercolour bleeding)
    for (let i = 0; i < 8; i++) {
      const t    = i / 8;
      const y    = horizonY * t;
      const bH   = horizonY / 8 + 2;
      const r    = Math.round(topRgb.r + (botRgb.r - topRgb.r) * t);
      const g    = Math.round(topRgb.g + (botRgb.g - topRgb.g) * t);
      const b    = Math.round(topRgb.b + (botRgb.b - topRgb.b) * t);
      const warp = Math.sin(i * 1.3 + now * 0.1) * (horizonY * 0.015);
      const a    = 0.05 + Math.sin(i * 2.1 + now * 0.05) * 0.025;
      ctx.fillStyle = `rgba(${r},${g},${b},${a})`;
      ctx.fillRect(0, y + warp, width, bH);
    }

    // Paper texture dots — stable positions, very low opacity
    ctx.fillStyle = 'rgba(90,70,50,0.028)';
    for (let i = 0; i < 200; i++) {
      const dotX = (Math.sin(i * 5.1) * 0.5 + 0.5) * width;
      const dotY = (Math.sin(i * 7.3) * 0.5 + 0.5) * horizonY;
      ctx.fillRect(dotX | 0, dotY | 0, 1, 1);
    }

    // ── Sun ────────────────────────────────────────────────────────────────────
    if (dayNightT >= 0.05 && dayNightT <= 0.72) {
      const sunT  = mapRange(dayNightT, 0.05, 0.72, 0, 1);
      const sunX  = width * (0.1 + sunT * 0.8);
      const arcT  = sunT;
      const sunY  = horizonY * (0.8 - 0.6 * (1 - Math.pow(arcT * 2 - 1, 2)));
      const sunR  = 26;

      // Wobbly rays
      ctx.strokeStyle = 'rgba(255,200,80,0.7)';
      ctx.lineWidth   = 1.8;
      ctx.lineCap     = 'round';
      for (let i = 0; i < 12; i++) {
        const angle  = (i / 12) * Math.PI * 2;
        const innerR = sunR + 5;
        const outerR = sunR + 14 + Math.sin(i * 2.3 + now * 0.8) * 4;
        const wx = Math.sin(i * 1.7 + sunX * 0.03) * 2;
        const wy = Math.cos(i * 2.1 + sunY * 0.03) * 2;
        ctx.beginPath();
        ctx.moveTo(sunX + Math.cos(angle) * innerR, sunY + Math.sin(angle) * innerR);
        ctx.lineTo(sunX + Math.cos(angle) * outerR + wx, sunY + Math.sin(angle) * outerR + wy);
        ctx.stroke();
      }
      ctx.lineCap = 'butt';

      // Sun body
      ctx.fillStyle = '#ffe066';
      ctx.beginPath(); ctx.arc(sunX, sunY, sunR, 0, Math.PI * 2); ctx.fill();

      // Wobbly outline
      ctx.strokeStyle = '#c8980a';
      ctx.lineWidth   = 2;
      ctx.beginPath();
      for (let a = 0; a <= Math.PI * 2; a += 0.15) {
        const wobble = 1 + Math.sin(sunX * 0.1 + a * 3.7) * (3 / sunR);
        const rx = sunX + Math.cos(a) * sunR * wobble;
        const ry = sunY + Math.sin(a) * sunR * wobble;
        if (a < 0.01) ctx.moveTo(rx, ry); else ctx.lineTo(rx, ry);
      }
      ctx.closePath();
      ctx.stroke();

      // Friendly face — dot eyes + curved smile
      ctx.fillStyle = '#c07010';
      ctx.beginPath(); ctx.arc(sunX - 8, sunY - 5, 2.5, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(sunX + 8, sunY - 5, 2.5, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#c07010'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(sunX, sunY + 3, 8, 0.2, Math.PI - 0.2); ctx.stroke();
    }

    // ── Moon ───────────────────────────────────────────────────────────────────
    const moonT_raw = dayNightT >= 0.78
      ? mapRange(dayNightT, 0.78, 1.0, 0, 0.9)
      : dayNightT <= 0.05
        ? mapRange(dayNightT, 0.0, 0.05, 0.9, 1.0)
        : -1;

    if (moonT_raw >= 0) {
      const moonX = width  * (0.15 + moonT_raw * 0.70);
      const moonY = horizonY * (0.15 + 0.25 * Math.sin(moonT_raw * Math.PI));
      const moonR = 22;

      // Full circle then clip-shadow to make crescent
      ctx.fillStyle = '#f0e8c8';
      ctx.beginPath(); ctx.arc(moonX, moonY, moonR, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = skyPalette.top;
      ctx.beginPath(); ctx.arc(moonX + moonR * 0.55, moonY - moonR * 0.1, moonR * 0.82, 0, Math.PI * 2); ctx.fill();

      // Wobbly outline
      ctx.strokeStyle = '#d4c890'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(moonX, moonY, moonR, 0, Math.PI * 2); ctx.stroke();

      // Sleepy face — closed-eye arcs + small smile
      ctx.strokeStyle = '#a09060'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(moonX - 6, moonY - 4, 3.5, Math.PI + 0.3, Math.PI * 2 - 0.3); ctx.stroke();
      ctx.beginPath(); ctx.arc(moonX + 6, moonY - 4, 3.5, Math.PI + 0.3, Math.PI * 2 - 0.3); ctx.stroke();
      ctx.beginPath(); ctx.arc(moonX, moonY + 5, 4, 0.2, Math.PI - 0.2); ctx.stroke();
    }

    // ── Hand-drawn 5-point stars ───────────────────────────────────────────────
    if (dayNightT > 0.75) {
      const starAlpha = clamp(mapRange(dayNightT, 0.75, 0.90, 0, 1), 0, 1);
      ctx.fillStyle   = `rgba(255,245,200,${starAlpha})`;
      for (const s of SB_STARS) {
        const sx = s.xFrac * width;
        const sy = s.yFrac * horizonY;
        ctx.save();
        ctx.translate(sx, sy);
        ctx.rotate(Math.sin(now * s.freq + s.phase) * 0.15);
        drawStar(ctx, 0, 0, s.r, 0.5);
        ctx.fill();
        ctx.restore();
      }
    }

    // ── Clouds ─────────────────────────────────────────────────────────────────
    const cloudVis = dayNightT < 0.80 && dayNightT > 0.04;
    if (cloudVis) {
      const cloudAlpha = dayNightT > 0.70
        ? mapRange(dayNightT, 0.70, 0.80, 0.78, 0)
        : 0.78;
      const coffset = worldOffset * 0.15;
      const TILE_W  = 1600;
      const cfirst  = Math.floor(coffset / TILE_W) - 1;
      const clast   = Math.ceil((coffset + width) / TILE_W) + 1;

      for (let tile = cfirst; tile <= clast; tile++) {
        const tileX = tile * TILE_W - coffset;
        for (const c of SB_CLOUD_POSITIONS) {
          const ccx = tileX + c.ox * TILE_W;
          const ccy = c.oy * horizonY;
          ctx.fillStyle = `rgba(255,255,255,${cloudAlpha * 0.82})`;
          drawWobblyCloud(ctx, ccx, ccy, c.r, now);
        }
      }
    }

    // ── Far mountains (0.2× parallax) ─────────────────────────────────────────
    const mOffset = worldOffset * 0.2;
    const M_TILE  = 1200;
    const mSets   = [
      {
        color:     dayNightT > 0.70 ? 'rgba(80,65,95,0.80)'   : 'rgba(160,145,120,0.55)',
        hatch:     dayNightT > 0.70 ? 'rgba(60,50,80,0.25)'   : 'rgba(120,105,85,0.22)',
        peakFrac:  0.50,
        halfWFrac: 0.25,
        peaks: [0.05, 0.30, 0.58, 0.82],
      },
      {
        color:     dayNightT > 0.70 ? 'rgba(60,50,80,0.92)'   : 'rgba(130,115,95,0.72)',
        hatch:     dayNightT > 0.70 ? 'rgba(40,35,60,0.30)'   : 'rgba(100,88,72,0.26)',
        peakFrac:  0.60,
        halfWFrac: 0.20,
        peaks: [0.15, 0.42, 0.70, 0.92],
      },
    ];

    for (const mset of mSets) {
      const mfirst = Math.floor(mOffset / M_TILE) - 1;
      const mlast  = Math.ceil((mOffset + width) / M_TILE) + 1;
      for (let tile = mfirst; tile <= mlast; tile++) {
        const tileX = tile * M_TILE - mOffset;
        for (const px of mset.peaks) {
          const peakX = tileX + px * M_TILE;
          const halfW = mset.halfWFrac * M_TILE;
          const peakY = horizonY * (1 - mset.peakFrac);
          ctx.fillStyle = mset.color;
          drawWobblyMountain(ctx, peakX, peakY, horizonY - 2, halfW);
          ctx.strokeStyle = mset.hatch; ctx.lineWidth = 0.7;
          hatchFill(ctx, peakX - halfW, peakY, halfW * 2, horizonY - peakY, 9, Math.PI * 0.35);
        }
      }
    }
  },

  // ── Midground: rolling hills, hand-drawn trees, bushes, flowers ──────────────

  drawMidground(ctx, worldOffset, dayNightT, width, height) {
    const now      = Date.now() * 0.001;
    const horizonY = height * 0.70;
    const offset   = worldOffset * 0.5;
    const night    = dayNightT > 0.70;

    // Rolling hills — continuous wavy fill
    const hillFill   = night ? 'rgba(80,100,60,0.88)'  : 'rgba(140,165,100,0.82)';
    const hillStroke = night ? 'rgba(60,80,40,0.45)'   : 'rgba(100,125,70,0.40)';
    ctx.fillStyle   = hillFill;
    ctx.strokeStyle = hillStroke;
    ctx.lineWidth   = 1.5;

    ctx.beginPath();
    const step = 8;
    for (let col = 0; col <= width + step; col += step) {
      const wx = (col + offset) % 4000;
      const hv = 30 + 20 * Math.sin(wx * 0.003) + 14 * Math.sin(wx * 0.0077) + 8 * Math.sin(wx * 0.017);
      const wob = Math.sin(wx * 0.04) * 2.5;
      const y   = horizonY - hv + wob;
      if (col === 0) ctx.moveTo(col, y); else ctx.lineTo(col, y);
    }
    ctx.lineTo(width, horizonY);
    ctx.lineTo(0,     horizonY);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Trees
    const TREE_SPACING = 100;
    const treeOffset   = offset % TREE_SPACING;
    const treeCount    = Math.ceil(width / TREE_SPACING) + 2;
    const greens = night
      ? ['rgba(50,80,35,0.9)', 'rgba(40,70,30,0.9)', 'rgba(55,85,40,0.9)']
      : ['rgba(90,150,60,0.9)', 'rgba(70,130,50,0.9)', 'rgba(100,160,70,0.9)'];

    for (let i = 0; i < treeCount; i++) {
      const tx  = i * TREE_SPACING - treeOffset;
      const wx  = Math.floor((tx + offset) % 4000);
      const hv  = 30 + 20 * Math.sin(wx * 0.003) + 14 * Math.sin(wx * 0.0077);
      const baseY   = horizonY - hv;
      const treeH   = 55 + (wx % 4) * 15;
      const trunkTop = baseY - treeH * 0.55;
      const canopyR  = treeH * 0.38;
      const tweak    = Math.sin(wx * 0.09) * 4;

      // Wobbly trunk
      ctx.strokeStyle = night ? '#3a2a1a' : '#5a3a1a';
      ctx.lineWidth   = 5 + (wx % 3);
      ctx.lineCap     = 'round';
      ctx.beginPath();
      ctx.moveTo(tx, baseY);
      ctx.bezierCurveTo(tx + tweak, baseY - treeH * 0.25, tx - tweak * 0.5, baseY - treeH * 0.4, tx, trunkTop);
      ctx.stroke();
      ctx.lineCap = 'butt';

      // Leafy canopy — overlapping wobbly circles
      const gv = wx % greens.length;
      ctx.fillStyle   = greens[gv];
      ctx.strokeStyle = night ? 'rgba(30,60,20,0.5)' : 'rgba(50,100,30,0.45)';
      ctx.lineWidth   = 1;
      const BLOBS = [
        { dx:  0,             dy:  0,             rb: 1.00 },
        { dx: -canopyR * 0.55, dy:  canopyR * 0.20, rb: 0.70 },
        { dx:  canopyR * 0.55, dy:  canopyR * 0.10, rb: 0.75 },
        { dx: -canopyR * 0.25, dy: -canopyR * 0.45, rb: 0.60 },
        { dx:  canopyR * 0.30, dy: -canopyR * 0.40, rb: 0.55 },
      ];
      for (const b of BLOBS) {
        const pulse = 1 + Math.sin(wx * 0.05 + b.dx) * 0.07;
        ctx.beginPath();
        ctx.arc(tx + b.dx, trunkTop + canopyR * 0.3 + b.dy, b.rb * canopyR * pulse, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
    }

    // Bushes and flowers along the ground
    const BUSH_SPACING = 60;
    const bushOffset   = offset % BUSH_SPACING;
    const bushCount    = Math.ceil(width / BUSH_SPACING) + 2;

    for (let i = 0; i < bushCount; i++) {
      const bx  = i * BUSH_SPACING - bushOffset;
      const wx  = Math.floor((bx + offset) % 4000);
      const hv  = 30 + 20 * Math.sin(wx * 0.003) + 14 * Math.sin(wx * 0.0077);
      const bY  = horizonY - hv;

      if (wx % 3 === 0) {
        // Bush
        ctx.fillStyle = night ? 'rgba(60,90,40,0.75)' : 'rgba(100,150,70,0.75)';
        ctx.beginPath();
        ctx.arc(bx,      bY, 6, Math.PI, Math.PI * 2);
        ctx.arc(bx + 7,  bY, 5, Math.PI, Math.PI * 2);
        ctx.arc(bx - 5,  bY, 4, Math.PI, Math.PI * 2);
        ctx.fill();
      } else if (wx % 3 === 1 && !night) {
        // Small flower
        const petalColor = ['#e87070', '#f4d060', '#d4b0e8', '#70c4e8'][wx % 4];
        ctx.fillStyle = petalColor;
        for (let p = 0; p < 5; p++) {
          const ang = (p / 5) * Math.PI * 2;
          ctx.beginPath();
          ctx.ellipse(bx + Math.cos(ang) * 3.5, bY + Math.sin(ang) * 3.5, 2.5, 1.2, ang, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = '#f5e050';
        ctx.beginPath(); ctx.arc(bx, bY, 2.5, 0, Math.PI * 2); ctx.fill();
      }
    }
  },

  // ── Road: earthy surface, wobbly markings, roadside details ──────────────────

  drawRoad(ctx, worldOffset, width, height) {
    const roadY    = height * 0.70;
    const roadH    = height - roadY;
    const surfaceH = roadH * 0.65;

    // Ground
    ctx.fillStyle = this.palette.ground;
    ctx.fillRect(0, roadY, width, roadH);

    // Road surface
    ctx.fillStyle = this.palette.road;
    ctx.fillRect(0, roadY, width, surfaceH);

    // Wobbly top edge
    ctx.strokeStyle = 'rgba(90,74,58,0.4)'; ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let x = 0; x <= width; x += 16) {
      const yw = roadY + Math.sin((x + worldOffset) * 0.038) * 1.8;
      if (x === 0) ctx.moveTo(x, yw); else ctx.lineTo(x, yw);
    }
    ctx.stroke();

    // Wobbly bottom edge
    const botY = roadY + surfaceH;
    ctx.beginPath();
    for (let x = 0; x <= width; x += 16) {
      const yw = botY + Math.sin((x + worldOffset) * 0.038 + 1.5) * 1.8;
      if (x === 0) ctx.moveTo(x, yw); else ctx.lineTo(x, yw);
    }
    ctx.stroke();

    // Wobbly dashed centre line
    const DASH_SPACING = 52;
    const dashY        = roadY + surfaceH * 0.5;
    const dashOff      = -(worldOffset % DASH_SPACING);

    ctx.strokeStyle = this.palette.roadLine; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
    for (let x = dashOff; x < width + DASH_SPACING; x += DASH_SPACING) {
      const seed = Math.floor((x + worldOffset) / DASH_SPACING);
      const dLen = 20 + Math.sin(seed * 2.7) * 4;
      const dY   = dashY + Math.sin(seed * 1.9) * 2;
      ctx.beginPath();
      ctx.moveTo(x,        dY + Math.sin(seed * 0.8) * 1.5);
      ctx.bezierCurveTo(
        x + dLen * 0.33, dY + Math.sin(seed * 1.1 + 1) * 2,
        x + dLen * 0.67, dY + Math.sin(seed * 1.4 + 2) * 2,
        x + dLen,        dY + Math.sin(seed * 0.8 + 3) * 1.5,
      );
      ctx.stroke();
    }
    ctx.lineCap = 'butt';

    // Roadside details: flowers, grass tufts, stones
    const DETAIL_SPACING = 40;
    const detailOff  = worldOffset % DETAIL_SPACING;
    const detailCount = Math.ceil(width / DETAIL_SPACING) + 2;

    for (let i = 0; i < detailCount; i++) {
      const dx = i * DETAIL_SPACING - detailOff;
      const wx = Math.floor((dx + worldOffset) % 4000);

      if (wx % 5 === 0) {
        // 5-petal flower
        const fc = ['#e87070', '#f4d060', '#d4b0e8'][wx % 3];
        ctx.fillStyle = fc;
        for (let p = 0; p < 5; p++) {
          const ang = (p / 5) * Math.PI * 2;
          ctx.beginPath();
          ctx.ellipse(dx + Math.cos(ang) * 3, roadY - 3 + Math.sin(ang) * 3, 2, 1.2, ang, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = '#f5e050';
        ctx.beginPath(); ctx.arc(dx, roadY - 3, 1.5, 0, Math.PI * 2); ctx.fill();
      } else if (wx % 5 === 2) {
        // Grass tuft — small curved lines
        ctx.strokeStyle = 'rgba(100,130,60,0.75)'; ctx.lineWidth = 1.2; ctx.lineCap = 'round';
        for (let g = 0; g < 3; g++) {
          const gx = dx + (g - 1) * 4;
          ctx.beginPath();
          ctx.moveTo(gx, roadY);
          ctx.quadraticCurveTo(gx + Math.sin(wx * 0.1 + g) * 3, roadY - 6, gx + Math.sin(wx * 0.15 + g * 0.5) * 2, roadY - 10);
          ctx.stroke();
        }
        ctx.lineCap = 'butt';
      } else if (wx % 5 === 4) {
        // Wobbly stone oval
        ctx.fillStyle   = 'rgba(150,135,110,0.65)';
        ctx.strokeStyle = 'rgba(100,88,72,0.45)'; ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.ellipse(dx, roadY - 2, 5 + wx % 4, 3 + wx % 3, Math.sin(wx * 0.3) * 0.4, 0, Math.PI * 2);
        ctx.fill(); ctx.stroke();
      }
    }
  },

  // ── Building ──────────────────────────────────────────────────────────────────

  drawBuilding(ctx, building, screenX, baseY, dayNightT, isHovered, isActive) {
    const x     = screenX;
    const w     = building.width;
    const h     = building.height;
    const y     = baseY - h;
    const night = dayNightT > 0.70;
    const now   = Date.now() * 0.001;

    ctx.save();
    ctx.lineCap  = 'round';
    ctx.lineJoin = 'round';

    // Hover glow
    if (isHovered && building.id !== 'toggle') {
      ctx.shadowColor = 'rgba(220,180,60,0.5)';
      ctx.shadowBlur  = 20;
      ctx.fillStyle   = 'rgba(220,180,60,0.12)';
      ctx.fillRect(x - 8, y - 8, w + 16, h + 16);
      ctx.shadowBlur  = 0;
      ctx.shadowColor = 'transparent';
    }

    ctx.strokeStyle = this.palette.buildingStroke;
    ctx.lineWidth   = isHovered ? 2.5 : 1.8;

    switch (building.id) {
      case 'education':  this._drawSchool(ctx, x, y, w, h, night, now, isActive);   break;
      case 'experience': this._drawOffice(ctx, x, y, w, h, night, now, isActive);   break;
      case 'projects':   this._drawWorkshop(ctx, x, y, w, h, night, now, isActive); break;
      case 'hobbies':    this._drawCottage(ctx, x, y, w, h, night, now, isActive);  break;
      case 'contact':    this._drawCafe(ctx, x, y, w, h, night, now, isActive);     break;
      case 'toggle':     this._drawBook(ctx, x, y, w, h, now, isHovered);           break;
    }

    // Building label
    if (building.id !== 'toggle') {
      ctx.fillStyle    = night ? 'rgba(245,240,225,0.82)' : 'rgba(58,47,37,0.72)';
      ctx.font         = '11px "Nunito", sans-serif';
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(building.label, x + w / 2, baseY + 5);
    }
    ctx.restore();
  },

  // ── Per-building draw helpers ──────────────────────────────────────────────

  _drawWobblyWindow(ctx, wx, wy, ww, wh, night, isActive) {
    ctx.fillStyle = night || isActive ? 'rgba(255,220,120,0.82)' : 'rgba(200,230,255,0.55)';
    ctx.fillRect(wx, wy, ww, wh);
    ctx.strokeStyle = 'rgba(90,74,58,0.6)'; ctx.lineWidth = 1;
    wobblyRect(ctx, wx, wy, ww, wh, 1);
    if (night || isActive) {
      ctx.fillStyle = 'rgba(255,200,80,0.20)';
      ctx.fillRect(wx - 3, wy - 3, ww + 6, wh + 6);
    }
  },

  _drawSchool(ctx, x, y, w, h, night, now, isActive) {
    // Body
    ctx.fillStyle = '#d4a090';
    ctx.fillRect(x, y + 22, w, h - 22);
    ctx.strokeStyle = '#5a4a3a'; ctx.lineWidth = 1.8;
    wobblyRect(ctx, x, y + 22, w, h - 22, 2);
    ctx.strokeStyle = 'rgba(90,74,58,0.18)'; ctx.lineWidth = 0.8;
    hatchFill(ctx, x + w * 0.6, y + 22, w * 0.4, h - 22, 8);

    // Bell tower
    const towerX = x + w / 2 - 14;
    ctx.fillStyle = '#c49080';
    ctx.fillRect(towerX, y, 28, 28);
    ctx.strokeStyle = '#5a4a3a'; ctx.lineWidth = 1.8;
    wobblyRect(ctx, towerX, y, 28, 28, 2);

    // Bell
    ctx.strokeStyle = '#5a4a3a'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(towerX + 14, y + 16, 5, 0, Math.PI * 2); ctx.stroke();

    // Flag
    const fX = towerX + 28, fY = y - 8;
    ctx.strokeStyle = '#5a4a3a'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(fX, fY); ctx.lineTo(fX, fY + 18); ctx.stroke();
    ctx.fillStyle = '#d4634b';
    ctx.beginPath(); ctx.moveTo(fX, fY); ctx.lineTo(fX + 14, fY + 5); ctx.lineTo(fX, fY + 10); ctx.closePath(); ctx.fill();

    // Clock face
    ctx.fillStyle = '#f5f0e1'; ctx.strokeStyle = '#5a4a3a'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(towerX + 14, y + 7, 6, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = '#3a2f25'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(towerX + 14, y + 7); ctx.lineTo(towerX + 14, y + 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(towerX + 14, y + 7); ctx.lineTo(towerX + 18, y + 7); ctx.stroke();

    // Windows
    this._drawWobblyWindow(ctx, x + 14, y + 34, 22, 20, night, isActive);
    this._drawWobblyWindow(ctx, x + w - 36, y + 34, 22, 20, night, isActive);
    this._drawWobblyWindow(ctx, x + 14, y + 66, 22, 20, night, isActive);
    this._drawWobblyWindow(ctx, x + w - 36, y + 66, 22, 20, night, isActive);

    // Arched door
    const dX = x + w / 2 - 12, dY = y + h - 36;
    ctx.fillStyle = '#7a5a3a';
    ctx.beginPath(); ctx.roundRect(dX, dY, 24, 36, [12, 12, 0, 0]); ctx.fill();
    ctx.strokeStyle = '#5a4a3a'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.roundRect(dX, dY, 24, 36, [12, 12, 0, 0]); ctx.stroke();
  },

  _drawOffice(ctx, x, y, w, h, night, now, isActive) {
    // Slightly leaning building — charming imperfection
    const lean = 3;
    ctx.fillStyle = '#d8cbb8';
    ctx.beginPath();
    ctx.moveTo(x + lean, y); ctx.lineTo(x + w + lean, y);
    ctx.lineTo(x + w, y + h); ctx.lineTo(x, y + h);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#5a4a3a'; ctx.lineWidth = 1.8; ctx.stroke();

    // Shadow hatch left
    ctx.strokeStyle = 'rgba(90,74,58,0.18)'; ctx.lineWidth = 0.8;
    hatchFill(ctx, x, y, w * 0.28, h, 8, Math.PI * 0.6);

    // Floor dividers
    ctx.strokeStyle = 'rgba(90,74,58,0.25)'; ctx.lineWidth = 1;
    for (let f = 1; f < 4; f++) {
      wobblyLine(ctx, x, y + f * (h / 4), x + w, y + f * (h / 4), 1.5);
    }

    // Clock
    ctx.fillStyle = '#f5f0e1'; ctx.strokeStyle = '#5a4a3a'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(x + w / 2 + lean * 0.5, y + 16, 10, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = '#3a2f25'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x + w / 2 + lean * 0.5, y + 16); ctx.lineTo(x + w / 2 + lean * 0.5, y + 8); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + w / 2 + lean * 0.5, y + 16); ctx.lineTo(x + w / 2 + lean * 0.5 + 6, y + 16); ctx.stroke();

    // Window grid
    const cols = 3, rows = 4;
    const padX = 18, padY = 32;
    const gapX = (w - 2 * padX) / cols;
    const gapY = (h - padY - 12) / rows;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const leanOff = lean * (1 - r / rows);
        this._drawWobblyWindow(ctx, x + padX + leanOff + c * gapX, y + padY + r * gapY, gapX - 8, gapY - 8, night, isActive);
      }
    }

    // Door
    const dX = x + w / 2 - 10, dY = y + h - 30;
    ctx.fillStyle = '#7a5a3a';
    ctx.beginPath(); ctx.roundRect(dX, dY, 20, 30, [6, 6, 0, 0]); ctx.fill();
    ctx.strokeStyle = '#5a4a3a'; ctx.lineWidth = 1.5; ctx.stroke();
  },

  _drawWorkshop(ctx, x, y, w, h, night, now, isActive) {
    ctx.fillStyle = '#ccc0a8';
    ctx.fillRect(x, y + 18, w, h - 18);
    ctx.strokeStyle = '#5a4a3a'; ctx.lineWidth = 1.8;
    wobblyRect(ctx, x, y + 18, w, h - 18, 2);
    ctx.strokeStyle = 'rgba(90,74,58,0.18)'; ctx.lineWidth = 0.8;
    hatchFill(ctx, x + w * 0.65, y + 18, w * 0.35, h - 18, 7);

    // Wonky roof
    ctx.fillStyle = '#b0a090';
    ctx.beginPath();
    ctx.moveTo(x - 8, y + 22);
    ctx.lineTo(x + w / 2 + 5, y);
    ctx.lineTo(x + w + 6, y + 22);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#5a4a3a'; ctx.lineWidth = 1.8; ctx.stroke();

    // Garage door
    const gX = x + 14, gY = y + 30, gW = w - 28, gH = h - 56;
    ctx.fillStyle = isActive ? 'rgba(80,60,40,0.5)' : '#7a6a58';
    ctx.fillRect(gX, gY, gW, gH);
    ctx.strokeStyle = '#5a4a3a'; ctx.lineWidth = 1.5;
    wobblyRect(ctx, gX, gY, gW, gH, 1.5);
    // Horizontal slats
    ctx.strokeStyle = 'rgba(90,74,58,0.3)'; ctx.lineWidth = 0.8;
    for (let s = 1; s < 4; s++) {
      wobblyLine(ctx, gX, gY + s * (gH / 4), gX + gW, gY + s * (gH / 4), 1);
    }

    // Gears on facade
    ctx.strokeStyle = '#a09080'; ctx.lineWidth = 1;
    for (const gr of [{ cx: x + 20, cy: y + 10, r: 7 }, { cx: x + w - 22, cy: y + 10, r: 5 }]) {
      ctx.beginPath(); ctx.arc(gr.cx, gr.cy, gr.r, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(gr.cx, gr.cy, gr.r * 0.5, 0, Math.PI * 2); ctx.stroke();
    }

    // Tools inside if active
    if (isActive) {
      ctx.strokeStyle = '#d4a050'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(gX + 15, gY + gH - 6); ctx.lineTo(gX + 15, gY + 12); ctx.stroke();
      ctx.fillStyle = '#d4a050'; ctx.fillRect(gX + 9, gY + 8, 14, 8);
    }
  },

  _drawCottage(ctx, x, y, w, h, night, now, isActive) {
    ctx.fillStyle = '#ddd0b8';
    ctx.fillRect(x, y + h * 0.35, w, h * 0.65);
    ctx.strokeStyle = '#5a4a3a'; ctx.lineWidth = 1.8;
    wobblyRect(ctx, x, y + h * 0.35, w, h * 0.65, 2);
    ctx.strokeStyle = 'rgba(90,74,58,0.17)'; ctx.lineWidth = 0.7;
    hatchFill(ctx, x + w * 0.6, y + h * 0.35, w * 0.4, h * 0.65, 8);

    // Thatched roof
    ctx.fillStyle = '#c8a860';
    ctx.beginPath();
    ctx.moveTo(x - 12, y + h * 0.38);
    ctx.bezierCurveTo(x - 8, y + h * 0.05, x + w / 2, y, x + w / 2, y);
    ctx.bezierCurveTo(x + w / 2, y, x + w + 8, y + h * 0.05, x + w + 12, y + h * 0.38);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#9a7840'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.strokeStyle = 'rgba(100,80,40,0.28)'; ctx.lineWidth = 0.8;
    hatchFill(ctx, x - 8, y, w + 16, h * 0.42, 6, Math.PI * 0.45);

    // Chimney
    ctx.fillStyle = '#c49888';
    ctx.fillRect(x + w * 0.7, y - 8, 18, 30);
    ctx.strokeStyle = '#5a4a3a'; ctx.lineWidth = 1.5;
    wobblyRect(ctx, x + w * 0.7, y - 8, 18, 30, 1.5);

    // Smoke curls
    ctx.strokeStyle = 'rgba(180,170,160,0.55)'; ctx.lineWidth = 1.5; ctx.lineCap = 'round';
    for (let s = 0; s < 3; s++) {
      const sPhase = now * 0.8 + s * 1.2;
      const sx     = x + w * 0.7 + 9 + Math.sin(sPhase) * 5;
      const sy     = y - 10 - s * 12;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.bezierCurveTo(
        sx + Math.sin(sPhase + 1) * 6, sy - 8,
        sx + Math.cos(sPhase) * 6,     sy - 16,
        sx + Math.sin(sPhase + 2) * 4, sy - 22,
      );
      ctx.stroke();
    }
    ctx.lineCap = 'butt';

    // Windows
    this._drawWobblyWindow(ctx, x + 14, y + h * 0.45, 24, 22, night, isActive);
    this._drawWobblyWindow(ctx, x + w - 38, y + h * 0.45, 24, 22, night, isActive);

    // Arched door
    const dX = x + w / 2 - 12, dY = y + h - 36;
    ctx.fillStyle = '#7a5a3a';
    ctx.beginPath(); ctx.roundRect(dX, dY, 24, 36, [10, 10, 0, 0]); ctx.fill();
    ctx.strokeStyle = '#5a4a3a'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = '#c8a050';
    ctx.beginPath(); ctx.arc(dX + 20, dY + 18, 2, 0, Math.PI * 2); ctx.fill();

    // Garden flowers
    const gY = y + h - 2;
    const flc = ['#e87070', '#f4d060', '#d4b0e8', '#70c4e8'];
    for (let fi = 0; fi < 5; fi++) {
      const fx = x + 10 + fi * (w - 20) / 4;
      ctx.fillStyle = flc[fi % 4];
      for (let p = 0; p < 5; p++) {
        const ang = (p / 5) * Math.PI * 2;
        ctx.beginPath();
        ctx.ellipse(fx + Math.cos(ang) * 3, gY - 4 + Math.sin(ang) * 3, 2, 1.2, ang, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#f5e050';
      ctx.beginPath(); ctx.arc(fx, gY - 4, 2, 0, Math.PI * 2); ctx.fill();
    }
  },

  _drawCafe(ctx, x, y, w, h, night, now, isActive) {
    ctx.fillStyle = '#d4c0a0';
    ctx.fillRect(x, y + 30, w, h - 30);
    ctx.strokeStyle = '#5a4a3a'; ctx.lineWidth = 1.8;
    wobblyRect(ctx, x, y + 30, w, h - 30, 2);
    ctx.strokeStyle = 'rgba(90,74,58,0.17)'; ctx.lineWidth = 0.7;
    hatchFill(ctx, x + w * 0.6, y + 30, w * 0.4, h - 30, 8);

    // Striped awning with scallop edge
    ctx.save();
    ctx.beginPath(); ctx.rect(x - 6, y, w + 12, 34); ctx.clip();
    const stripeW = 14;
    const awningColors = ['#d4634b', '#f5f0e1'];
    for (let s = 0; s < Math.ceil((w + 24) / stripeW); s++) {
      ctx.fillStyle = awningColors[s % 2];
      ctx.fillRect(x - 6 + s * stripeW, y, stripeW, 34);
    }
    ctx.restore();
    // Scallop bottom
    ctx.strokeStyle = '#5a4a3a'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(x - 6, y);
    for (let s = 0; s <= Math.ceil((w + 12) / 18); s++) {
      const ax = x - 6 + s * 18;
      ctx.quadraticCurveTo(ax + 9, y + 38, ax + 18, y + 30);
    }
    ctx.stroke();
    wobblyLine(ctx, x - 6, y, x + w + 6, y, 1.5);

    // Windows
    this._drawWobblyWindow(ctx, x + 10, y + 44, 28, 28, night, isActive);
    this._drawWobblyWindow(ctx, x + w - 38, y + 44, 28, 28, night, isActive);

    // Door
    const dX = x + w / 2 - 12, dY = y + h - 40;
    ctx.fillStyle = '#7a5a3a';
    ctx.beginPath(); ctx.roundRect(dX, dY, 24, 40, [8, 8, 0, 0]); ctx.fill();
    ctx.strokeStyle = '#5a4a3a'; ctx.lineWidth = 1.5; ctx.stroke();

    // Mailbox out front
    const mbX = x - 20, mbY = y + h - 30;
    ctx.fillStyle = '#c04030';
    ctx.fillRect(mbX, mbY, 14, 10);
    ctx.beginPath(); ctx.arc(mbX + 7, mbY, 7, Math.PI, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#5a4a3a'; ctx.lineWidth = 1; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(mbX + 7, mbY + 10); ctx.lineTo(mbX + 7, mbY + 25); ctx.stroke();
  },

  _drawBook(ctx, x, y, w, h, now, hovered) {
    const midX   = x + w / 2;
    const bookY  = y + h * 0.2;
    const bookW  = w * 0.8;
    const bookH  = h * 0.55;

    // Lectern/pedestal
    ctx.fillStyle = '#9a7a50';
    ctx.beginPath();
    ctx.moveTo(x + w * 0.25, y + h);
    ctx.lineTo(x + w * 0.35, bookY + bookH);
    ctx.lineTo(x + w * 0.65, bookY + bookH);
    ctx.lineTo(x + w * 0.75, y + h);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#5a4a3a'; ctx.lineWidth = 1.5; ctx.stroke();

    ctx.fillStyle = '#b09060';
    ctx.fillRect(x + w * 0.1, bookY + bookH - 4, w * 0.8, 8);
    ctx.strokeStyle = '#5a4a3a'; ctx.lineWidth = 1;
    wobblyRect(ctx, x + w * 0.1, bookY + bookH - 4, w * 0.8, 8, 1);

    if (hovered) { ctx.shadowColor = 'rgba(212,160,80,0.6)'; ctx.shadowBlur = 14; }

    // Page flutter
    const flutter = hovered ? Math.sin(now * 4) * 4 : Math.sin(now * 1.2) * 1.5;

    // Left page
    ctx.fillStyle = '#f9f4e8';
    ctx.beginPath();
    ctx.moveTo(midX, bookY);
    ctx.bezierCurveTo(midX - bookW * 0.1, bookY - 5, midX - bookW * 0.4, bookY, midX - bookW * 0.5, bookY + 4);
    ctx.lineTo(midX - bookW * 0.5 + flutter, bookY + bookH);
    ctx.lineTo(midX, bookY + bookH);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#5a4a3a'; ctx.lineWidth = 1.5; ctx.stroke();

    // Right page
    ctx.fillStyle = '#f5f0e0';
    ctx.beginPath();
    ctx.moveTo(midX, bookY);
    ctx.bezierCurveTo(midX + bookW * 0.1, bookY - 5, midX + bookW * 0.4, bookY, midX + bookW * 0.5, bookY + 4);
    ctx.lineTo(midX + bookW * 0.5 - flutter, bookY + bookH);
    ctx.lineTo(midX, bookY + bookH);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#5a4a3a'; ctx.lineWidth = 1.5; ctx.stroke();

    ctx.shadowBlur = 0; ctx.shadowColor = 'transparent';

    // Squiggly text lines
    ctx.strokeStyle = 'rgba(90,74,58,0.38)'; ctx.lineWidth = 0.8;
    for (let line = 0; line < 5; line++) {
      const ly = bookY + 12 + line * ((bookH - 16) / 5);
      // Left page
      ctx.beginPath();
      for (let lx = midX - bookW * 0.44; lx < midX - 6; lx += 8) {
        const wy = ly + Math.sin(lx * 0.3 + line * 0.7) * 1.5;
        if (lx <= midX - bookW * 0.43) ctx.moveTo(lx, wy); else ctx.lineTo(lx, wy);
      }
      ctx.stroke();
      // Right page
      ctx.beginPath();
      for (let lx = midX + 6; lx < midX + bookW * 0.44; lx += 8) {
        const wy = ly + Math.sin(lx * 0.3 + line * 0.7 + 1) * 1.5;
        if (lx <= midX + 7) ctx.moveTo(lx, wy); else ctx.lineTo(lx, wy);
      }
      ctx.stroke();
    }

    // Spine
    ctx.strokeStyle = '#9a7a50'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(midX, bookY); ctx.lineTo(midX, bookY + bookH); ctx.stroke();
  },

  // ── Cyclist ───────────────────────────────────────────────────────────────────

  drawCyclist(ctx, { world, width, height }) {
    const speed   = world.worldSpeed;
    const now     = Date.now() * 0.001;
    const groundY = height * 0.70;
    const wheelY  = groundY + 14;
    const cx      = width * 0.33;

    sbPedalAngle += speed * 0.05;
    const pedAngle = sbPedalAngle;
    const lean     = speed > 0.5 ? 6 : speed > 0.2 ? 3 : 0;

    // Wheel centres
    const rearCX  = cx - 22;
    const frontCX = cx + 24 + lean;
    const wheelR  = 14;
    const bbX     = cx - 2;
    const bbY     = wheelY - 6;
    const seatX   = cx - 12 + lean;
    const seatY   = wheelY - 22;
    const htX     = cx + 12 + lean;
    const htY     = wheelY - 18;

    ctx.save();
    ctx.lineCap  = 'round';
    ctx.lineJoin = 'round';

    // Wobbly frame tubes
    ctx.strokeStyle = '#7a5a3a'; ctx.lineWidth = 2.5;
    wobblyLine(ctx, rearCX,  wheelY, bbX,     bbY,    2); // chain stay
    wobblyLine(ctx, bbX,     bbY,    seatX,   seatY,  2); // seat tube
    wobblyLine(ctx, bbX,     bbY,    htX,     htY,    2); // down tube
    wobblyLine(ctx, htX,     htY,    frontCX, wheelY, 2); // fork
    wobblyLine(ctx, seatX,   seatY,  htX,     htY,    2); // top tube
    wobblyLine(ctx, seatX,   seatY,  rearCX,  wheelY, 2); // seat stay

    // Wheels — wobbly circles with spokes
    const drawWobblyWheel = (wcx, wcy, wr) => {
      ctx.strokeStyle = '#5a4a3a'; ctx.lineWidth = 2;
      ctx.beginPath();
      for (let a = 0; a <= Math.PI * 2; a += 0.12) {
        const wobble = 1 + Math.sin(wcx * 0.07 + a * 5) * 0.05;
        const rx = wcx + Math.cos(a) * wr * wobble;
        const ry = wcy + Math.sin(a) * wr * wobble;
        if (a < 0.01) ctx.moveTo(rx, ry); else ctx.lineTo(rx, ry);
      }
      ctx.closePath(); ctx.stroke();
      // Hub
      ctx.fillStyle = '#8a7a6a';
      ctx.beginPath(); ctx.arc(wcx, wcy, 3, 0, Math.PI * 2); ctx.fill();
      // Spokes
      ctx.strokeStyle = '#7a6a5a'; ctx.lineWidth = 1;
      for (let s = 0; s < 6; s++) {
        const angle = pedAngle + s * (Math.PI / 3);
        wobblyLine(ctx, wcx + Math.cos(angle) * 3, wcy + Math.sin(angle) * 3, wcx + Math.cos(angle) * (wr - 2), wcy + Math.sin(angle) * (wr - 2), 1);
      }
    };
    drawWobblyWheel(rearCX, wheelY, wheelR);
    drawWobblyWheel(frontCX, wheelY, wheelR);

    // Handlebars
    ctx.strokeStyle = '#5a4a3a'; ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(htX - 2, htY - 2);
    ctx.bezierCurveTo(htX + 2, htY - 8, htX + 8, htY - 6, htX + 8, htY - 1);
    ctx.stroke();

    // Seat
    ctx.fillStyle = '#3a2f25';
    ctx.beginPath(); ctx.ellipse(seatX, seatY, 10, 3, -0.1, 0, Math.PI * 2); ctx.fill();

    // ── Rider ──────────────────────────────────────────────────────────────────
    const hipX = seatX + 2;
    const hipY = seatY - 2;

    // Pedal positions
    const leftPedX  = bbX + Math.cos(pedAngle) * 9;
    const leftPedY  = bbY + Math.sin(pedAngle) * 9;
    const rightPedX = bbX + Math.cos(pedAngle + Math.PI) * 9;
    const rightPedY = bbY + Math.sin(pedAngle + Math.PI) * 9;

    // Right leg (behind)
    ctx.globalAlpha = 0.65; ctx.strokeStyle = '#3a2f25'; ctx.lineWidth = 4;
    wobblyLine(ctx, hipX, hipY, rightPedX, rightPedY + 4, 2);
    ctx.globalAlpha = 1;

    // Left leg (front)
    ctx.strokeStyle = '#3a2f25'; ctx.lineWidth = 4;
    wobblyLine(ctx, hipX, hipY, leftPedX, leftPedY + 4, 2);

    // Crank
    ctx.strokeStyle = '#7a6a5a'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(bbX - 4, bbY); ctx.lineTo(leftPedX, leftPedY); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(bbX + 4, bbY); ctx.lineTo(rightPedX, rightPedY); ctx.stroke();

    // Jersey body
    const bX = hipX - 6, bY = hipY - 22;
    ctx.fillStyle = '#d4634b';
    ctx.beginPath(); ctx.roundRect(bX, bY, 14, 22, 4); ctx.fill();
    ctx.strokeStyle = '#3a2f25'; ctx.lineWidth = 1; ctx.stroke();

    // Arm
    ctx.strokeStyle = '#e8c4a0'; ctx.lineWidth = 4;
    wobblyLine(ctx, bX + 13, bY + 6, htX + 4, htY + 2, 2);

    // Trailing scarf (length depends on speed)
    const scarfLen = 12 + Math.abs(speed) * 30;
    const scarfY   = bY + 4;
    ctx.strokeStyle = '#7aab6e'; ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(bX, scarfY);
    ctx.bezierCurveTo(
      bX - scarfLen * 0.33, scarfY + Math.sin(now * 2) * 4,
      bX - scarfLen * 0.67, scarfY + Math.sin(now * 2 + 1) * 6 + (speed < 0.2 ? 8 : 0),
      bX - scarfLen,        scarfY + (speed < 0.2 ? 14 : Math.sin(now * 3) * 3),
    );
    ctx.stroke();

    // Head — round, bigger storybook proportions
    const headR = 11;
    const headX = bX + 7;
    const headY = bY - headR - 2;
    ctx.fillStyle = '#f0d0a8';
    ctx.beginPath(); ctx.arc(headX, headY, headR, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#3a2f25'; ctx.lineWidth = 1.2; ctx.stroke();

    // Rosy cheeks
    ctx.fillStyle = 'rgba(220,120,100,0.32)';
    ctx.beginPath(); ctx.ellipse(headX - 5, headY + 3, 4, 2.5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(headX + 5, headY + 3, 4, 2.5, 0, 0, Math.PI * 2); ctx.fill();

    // Eyes
    ctx.fillStyle = '#3a2f25';
    ctx.beginPath(); ctx.arc(headX - 4, headY - 2, 1.8, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(headX + 4, headY - 2, 1.8, 0, Math.PI * 2); ctx.fill();

    // Smile
    ctx.strokeStyle = '#3a2f25'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.arc(headX, headY + 2, 4, 0.2, Math.PI - 0.2); ctx.stroke();

    // Helmet (knit cap)
    ctx.fillStyle = '#d4634b';
    ctx.beginPath(); ctx.ellipse(headX, headY - headR * 0.28, headR + 1, headR * 0.72, 0, Math.PI, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#3a2f25'; ctx.lineWidth = 1; ctx.stroke();

    // Motion lines when moving
    if (Math.abs(speed) > 0.2) {
      const mAlpha = Math.min(Math.abs(speed) * 0.45, 0.38);
      ctx.strokeStyle = `rgba(90,74,58,${mAlpha})`; ctx.lineWidth = 1;
      for (let ml = 0; ml < 3; ml++) {
        const mlY   = wheelY - 8 - ml * 10;
        const mlX   = cx - 30 - ml * 8;
        const mlLen = 18 + ml * 8;
        wobblyLine(ctx, mlX, mlY, mlX - mlLen, mlY + Math.sin(ml * 2 + now) * 2, 1.5);
      }
    }

    ctx.restore();
  },

  // ── Weather ───────────────────────────────────────────────────────────────────

  drawWeather(ctx, weather, worldSpeed, dt, width, height) {
    const groundY = height * 0.70;
    const now     = Date.now() * 0.001;

    // Rain — spawn ink-stroke particles
    if (weather.rainIntensity > 0) {
      const count = Math.floor(weather.rainIntensity * 12);
      for (let i = 0; i < count; i++) {
        spawn(Math.random() * width, -10,
          worldSpeed * -40 + (Math.random() * 10 - 5),
          250 + Math.random() * 80,
          1.5, 1, 1, 100, 130);
      }
    }

    // Wind — spawn brushstroke leaf shapes
    if (weather.windIntensity > 0.3) {
      const count = Math.floor((weather.windIntensity - 0.3) * 2);
      for (let i = 0; i < count; i++) {
        spawn(-10, Math.random() * height * 0.7,
          80 + Math.random() * 60, Math.random() * 20 - 10,
          3, 3, 2, 110, 150);
      }
    }

    update(dt);

    drawWith(ctx, (ctx, x, y, vx, vy, type, size, r, g, a) => {
      if (type === 1) {
        // Ink-stroke rain line
        const len   = 14 + Math.sin(x * 0.1) * 5;
        const angle = Math.atan2(vy, vx - 50);
        ctx.strokeStyle = `rgba(80,110,160,${a * 0.7})`;
        ctx.lineWidth   = 0.8 + Math.sin(y * 0.15) * 0.4;
        ctx.lineCap     = 'round';
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + Math.cos(angle) * len, y + Math.sin(angle) * len);
        ctx.stroke();
        ctx.lineCap = 'butt';
        // Watercolour puddle splash near ground
        if (y > groundY - 6 && y < groundY + 6) {
          const splashAge = 1 - a;
          const splashR   = splashAge * 14;
          ctx.strokeStyle = `rgba(80,110,160,${(1 - splashAge) * 0.28})`;
          ctx.lineWidth   = 0.8;
          ctx.beginPath(); ctx.ellipse(x, groundY + 2, splashR, splashR * 0.35, 0, 0, Math.PI * 2); ctx.stroke();
        }
      } else if (type === 2) {
        // Brushstroke leaf — pointed oval
        const angle = Math.atan2(vy, vx) + Math.sin(x * 0.05 + now) * 0.5;
        ctx.fillStyle = `rgba(${r},${g},60,${a})`;
        ctx.save();
        ctx.translate(x, y); ctx.rotate(angle);
        ctx.beginPath(); ctx.ellipse(0, 0, size * 2, size * 0.9, 0, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      } else {
        // Dust mote
        ctx.fillStyle = `rgba(${r},${g},80,${a * 0.45})`;
        ctx.beginPath(); ctx.arc(x, y, size, 0, Math.PI * 2); ctx.fill();
      }
    });

    // Illustrated wind swirl lines
    if (weather.windIntensity > 0.4) {
      const swirlAlpha = Math.min(weather.windIntensity * 0.28, 0.22);
      ctx.strokeStyle = `rgba(140,180,120,${swirlAlpha})`; ctx.lineWidth = 1;
      for (let s = 0; s < 3; s++) {
        const swX = ((now * 110 + s * 300) % (width + 100)) - 50;
        const swY = height * (0.2 + s * 0.2);
        ctx.beginPath(); ctx.moveTo(swX, swY);
        for (let t = 0; t < Math.PI * 3; t += 0.12) {
          ctx.lineTo(swX + Math.cos(t) * t * 5, swY + Math.sin(t) * t * 2.5);
        }
        ctx.stroke();
      }
    }

    // Lightning — hand-drawn jagged bolt
    if (weather.lightningActive) {
      if (sbFlashDuration <= 0 && Math.random() < 0.008) sbFlashDuration = 0.12;
    }
    if (sbFlashDuration > 0) {
      sbFlashDuration -= dt;
      if (sbFlashDuration > 0) {
        ctx.fillStyle = 'rgba(255,240,200,0.10)';
        ctx.fillRect(0, 0, width, height);
        ctx.strokeStyle = 'rgba(255,220,100,0.82)'; ctx.lineWidth = 2; ctx.lineCap = 'round';
        const boltX = width * 0.6;
        ctx.beginPath(); ctx.moveTo(boltX, 0);
        let bx = boltX, by = 0;
        while (by < height * 0.6) {
          bx += (Math.sin(by * 0.5) - 0.4) * 28;
          by += 28 + Math.sin(by * 0.3) * 12;
          ctx.lineTo(bx, by);
        }
        ctx.stroke(); ctx.lineCap = 'butt';
      }
    }
  },

  // ── Foreground ─────────────────────────────────────────────────────────────

  drawForeground(ctx, worldSpeed, worldOffset, weather, width, height) {
    const now      = Date.now() * 0.001;
    const absSpeed = Math.abs(worldSpeed);

    // Thin wobbly speed streaks
    if (absSpeed > 0.5) {
      const lineAlpha = mapRange(absSpeed, 0.5, 1.0, 0, 0.11);
      ctx.strokeStyle = `rgba(90,74,58,${lineAlpha})`; ctx.lineWidth = 0.8;
      for (let i = 0; i < 4; i++) {
        const lineY = height * 0.2 + Math.sin(i * 2.1 + now * 0.5) * height * 0.35;
        const x1    = (Math.sin(i * 3.7 + now * 0.2) * 0.5 + 0.5) * width;
        const lineL = 60 + Math.sin(i * 1.9) * 60;
        wobblyLine(ctx, x1, lineY, x1 - lineL * Math.sign(worldSpeed), lineY + Math.sin(i) * 3, 2);
      }
    }

    // Floating dust motes — slow gentle drift, stable positions
    ctx.fillStyle = 'rgba(180,160,120,0.07)';
    for (let d = 0; d < 12; d++) {
      const dx = (Math.sin(d * 3.7 + now * 0.3) * 0.5 + 0.5) * width;
      const dy = (Math.sin(d * 5.1 + now * 0.2) * 0.5 + 0.5) * height;
      const dr = 1.5 + Math.sin(d * 1.9) * 0.8;
      ctx.beginPath(); ctx.arc(dx, dy, dr, 0, Math.PI * 2); ctx.fill();
    }

    // Paper-texture vignette
    const vign = ctx.createRadialGradient(width / 2, height / 2, height * 0.3, width / 2, height / 2, height * 0.82);
    vign.addColorStop(0, 'rgba(90,74,58,0)');
    vign.addColorStop(1, 'rgba(90,74,58,0.11)');
    ctx.fillStyle = vign; ctx.fillRect(0, 0, width, height);

    // Foreground leaves/petals at 1.2× parallax
    const fgOffset = worldOffset * 1.2;
    const TILE_W   = 500;
    const fgFirst  = Math.floor(fgOffset / TILE_W) - 1;
    const fgLast   = Math.ceil((fgOffset + width) / TILE_W) + 1;
    const PETALS   = [
      { ox: 0.08, oy: 0.84, color: 'rgba(210,100,80,0.5)',   size: 4   },
      { ox: 0.23, oy: 0.88, color: 'rgba(170,210,100,0.45)', size: 3   },
      { ox: 0.47, oy: 0.82, color: 'rgba(230,180,80,0.40)',  size: 3.5 },
      { ox: 0.68, oy: 0.86, color: 'rgba(180,140,210,0.45)', size: 3   },
      { ox: 0.88, oy: 0.83, color: 'rgba(210,100,80,0.40)',  size: 4   },
    ];
    for (let tile = fgFirst; tile <= fgLast; tile++) {
      const tileX = tile * TILE_W - fgOffset;
      for (const p of PETALS) {
        const petX = tileX + p.ox * TILE_W;
        const petY = p.oy * height + Math.sin(now * 0.6 + p.ox * 10) * 8;
        const ang  = Math.sin(now * 0.8 + p.ox * 5) * 0.8;
        ctx.fillStyle = p.color;
        ctx.save();
        ctx.translate(petX, petY); ctx.rotate(ang);
        ctx.beginPath(); ctx.ellipse(0, 0, p.size, p.size * 0.55, ang, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }
    }
  },

  // ── Toggle object (standalone — open book on pedestal) ────────────────────

  drawToggleObject(ctx, screenX, baseY, interactionState) {
    const now = Date.now() * 0.001;
    ctx.save();
    this._drawBook(ctx, screenX, baseY - 120, 100, 120, now, interactionState === 'nearby');

    if (interactionState === 'active') {
      // Ink splotches spread outward from book
      const t = Math.sin(now * 3) * 0.5 + 0.5;
      for (let ring = 1; ring <= 5; ring++) {
        ctx.strokeStyle = `rgba(58,47,37,${0.14 * (1 - ring / 5)})`;
        ctx.lineWidth   = 1;
        ctx.beginPath(); ctx.arc(screenX + 50, baseY - 60, ring * 24 * t, 0, Math.PI * 2); ctx.stroke();
      }
    }
    ctx.restore();
  },

  // ── Transition: page-turn wipe left → right ───────────────────────────────

  transitionIn(ctx, progress, width, height) {
    if (progress >= 1.0) return;
    // Ease-in-out quadratic
    const eased = progress < 0.5
      ? 2 * progress * progress
      : 1 - Math.pow(-2 * progress + 2, 2) / 2;

    const sweepX = eased * (width + 100) - 100;

    // Old page cover (left of sweep)
    if (sweepX > 30) {
      ctx.fillStyle = '#f5f0e1';
      ctx.fillRect(0, 0, Math.max(0, sweepX - 30), height);
    }

    // Curling page edge — curved strip with gradient
    if (sweepX > -80 && sweepX < width + 80) {
      const edgeGrad = ctx.createLinearGradient(sweepX - 30, 0, sweepX + 30, 0);
      edgeGrad.addColorStop(0,   '#f5f0e1');
      edgeGrad.addColorStop(0.4, '#ebe3d1');
      edgeGrad.addColorStop(0.7, 'rgba(200,185,160,0.55)');
      edgeGrad.addColorStop(1,   'rgba(200,185,160,0)');
      ctx.fillStyle = edgeGrad;
      ctx.beginPath();
      ctx.moveTo(sweepX - 30, 0);
      for (let y = 0; y <= height; y += 8) {
        const curl = Math.sin(y * 0.016 + progress * 3) * 10;
        ctx.lineTo(sweepX + curl, y);
      }
      ctx.lineTo(sweepX + 30, height);
      ctx.lineTo(sweepX - 30, height);
      ctx.closePath();
      ctx.fill();
    }

    // Ink splotches behind the sweep (progress 0.3 → 1.0)
    if (progress > 0.3 && sweepX > 0) {
      const sT = (progress - 0.3) / 0.7;
      const SPLOTCH_COLORS = ['#d4634b', '#7aab6e', '#c8b99a', '#8b7355', '#3a2f25'];
      for (let si = 0; si < 7; si++) {
        const sx = (Math.sin(si * 2.3) * 0.5 + 0.5) * sweepX;
        const sy = (Math.sin(si * 3.7) * 0.5 + 0.5) * height;
        const sr = sT * (20 + si * 10) * (Math.sin(si * 1.7) * 0.3 + 0.7);
        ctx.fillStyle = SPLOTCH_COLORS[si % SPLOTCH_COLORS.length] + '55';
        ctx.beginPath(); ctx.arc(sx, sy, Math.max(0, sr), 0, Math.PI * 2); ctx.fill();
      }
    }
  },
};
