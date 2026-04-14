import { mapRange, clamp } from '../../utils/math';
import { spawn, update, drawWith } from '../particles';

// ─── Constants ────────────────────────────────────────────────────────────────

const NAVY   = '#0a1e36';
const CYAN   = '#4a9eff';
const WHITE  = '#e0f0ff';
const GRID   = 'rgba(74,158,255,0.06)';
const DIM    = 'rgba(74,158,255,0.15)';
const MONO   = "'JetBrains Mono', monospace";

// ─── Small drawing helpers ────────────────────────────────────────────────────

/** Draw a dimension arrow between two points with a label */
function dimArrow(ctx, x1, y1, x2, y2, label, offset = 0) {
  const dx  = x2 - x1;
  const dy  = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len < 4) return;
  const ux = dx / len, uy = dy / len;
  const px = -uy, py = ux;  // perpendicular
  const ox = px * offset, oy = py * offset;

  ctx.beginPath();
  ctx.moveTo(x1 + ox, y1 + oy);
  ctx.lineTo(x2 + ox, y2 + oy);
  ctx.stroke();
  // Arrowheads
  const hs = 5;
  ctx.beginPath();
  ctx.moveTo(x1 + ox, y1 + oy);
  ctx.lineTo(x1 + ox + (ux + px * 0.6) * hs, y1 + oy + (uy + py * 0.6) * hs);
  ctx.moveTo(x1 + ox, y1 + oy);
  ctx.lineTo(x1 + ox + (ux - px * 0.6) * hs, y1 + oy + (uy - py * 0.6) * hs);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x2 + ox, y2 + oy);
  ctx.lineTo(x2 + ox + (-ux + px * 0.6) * hs, y2 + oy + (-uy + py * 0.6) * hs);
  ctx.moveTo(x2 + ox, y2 + oy);
  ctx.lineTo(x2 + ox + (-ux - px * 0.6) * hs, y2 + oy + (-uy - py * 0.6) * hs);
  ctx.stroke();

  if (label) {
    const mx = (x1 + x2) / 2 + ox + px * 8;
    const my = (y1 + y2) / 2 + oy + py * 8;
    ctx.fillText(label, mx, my);
  }
}

/** Draw a crosshair (+) at (cx,cy) with arm length r */
function crosshair(ctx, cx, cy, r = 5) {
  ctx.beginPath();
  ctx.moveTo(cx - r, cy); ctx.lineTo(cx + r, cy);
  ctx.moveTo(cx, cy - r); ctx.lineTo(cx, cy + r);
  ctx.stroke();
}

/** Draw a rotating crosshair at (cx,cy) with arm length r, rotated by angle */
function rotatingCrosshair(ctx, cx, cy, r, angle) {
  ctx.beginPath();
  ctx.moveTo(cx + Math.cos(angle) * r,              cy + Math.sin(angle) * r);
  ctx.lineTo(cx - Math.cos(angle) * r,              cy - Math.sin(angle) * r);
  ctx.moveTo(cx + Math.cos(angle + Math.PI / 2) * r, cy + Math.sin(angle + Math.PI / 2) * r);
  ctx.lineTo(cx - Math.cos(angle + Math.PI / 2) * r, cy - Math.sin(angle + Math.PI / 2) * r);
  ctx.stroke();
}

/** Draw an outline-only circle with no fill */
function circleStroke(ctx, cx, cy, r) {
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
}

/** Dashed line helper */
function dashedLine(ctx, x1, y1, x2, y2, dash = [4, 4]) {
  ctx.save();
  ctx.setLineDash(dash);
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
}

/** Small arrowhead at (x,y) pointing in direction (dx,dy) */
function arrowHead(ctx, x, y, dx, dy, size = 5) {
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  const ux = dx / len, uy = dy / len;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x - ux * size + uy * size * 0.5, y - uy * size - ux * size * 0.5);
  ctx.lineTo(x - ux * size - uy * size * 0.5, y - uy * size + ux * size * 0.5);
  ctx.closePath();
  ctx.fill();
}

/** Draw the ubiquitous blueprint grid */
function drawGrid(ctx, width, height, spacing = 40) {
  ctx.strokeStyle = GRID;
  ctx.lineWidth   = 0.5;
  ctx.beginPath();
  for (let x = 0; x <= width; x += spacing) {
    ctx.moveTo(x, 0); ctx.lineTo(x, height);
  }
  for (let y = 0; y <= height; y += spacing) {
    ctx.moveTo(0, y); ctx.lineTo(width, y);
  }
  ctx.stroke();
}

// ─── Module-level state ───────────────────────────────────────────────────────

const BP_STARS = [];
let bpStarsSeeded = false;
let bpPedalAngle  = 0;
let bpWheelAngle  = 0;
let bpFlashTimer  = 0;

const CONSTELLATION_EDGES = [
  [0,1],[1,2],[2,3],[3,4],[4,0],   // pentagon A
  [5,6],[6,7],[7,8],               // arc B
  [9,10],[10,11],                  // pair C
];

function seedStars() {
  for (let i = 0; i < 30; i++) {
    BP_STARS.push({
      xFrac: Math.sin(i * 2.4) * 0.5 + 0.5,
      yFrac: (Math.sin(i * 3.7) * 0.5 + 0.5) * 0.50,
      label: i < 3 ? String.fromCharCode(0x03B1 + i) : '',  // α β γ
    });
  }
  bpStarsSeeded = true;
}

// ─── Main theme export ────────────────────────────────────────────────────────

export const blueprintTheme = {
  id:    'blueprint',
  label: 'Blueprint',

  palette: {
    ground:         '#1a3a5c',
    road:           '#0d2b45',
    roadLine:       '#4a9eff',
    accent:         '#4a9eff',
    accentDim:      '#2a6ab5',
    text:           '#e0f0ff',
    textMuted:      '#6a8aaa',
    bg:             '#0a1e36',
    surface:        '#122a44',
    buildingFill:   '#0a1e36',
    buildingStroke: '#4a9eff',
    particleTint:   '#4a9eff',
    jerseyFill:     '#0a1e36',
    jerseyStroke:   '#4a9eff',
  },

  fonts: {
    '--font-display': "'JetBrains Mono', monospace",
    '--font-body':    "'JetBrains Mono', monospace",
  },

  // ── Background ───────────────────────────────────────────────────────────────

  drawBackground(ctx, skyPalette, dayNightT, worldOffset, width, height) {
    if (!bpStarsSeeded) seedStars();
    const horizonY = height * 0.70;

    // Navy fill — slightly lighter during "day"
    const dayBright = clamp(mapRange(dayNightT, 0.1, 0.5, 0.06, 0), 0, 0.06);
    ctx.fillStyle = NAVY;
    ctx.fillRect(0, 0, width, height);
    if (dayBright > 0) {
      ctx.fillStyle = `rgba(74,158,255,${dayBright})`;
      ctx.fillRect(0, 0, width, horizonY);
    }

    // Grid
    drawGrid(ctx, width, height);

    // Coordinate labels along top edge
    ctx.fillStyle   = DIM;
    ctx.font        = `9px ${MONO}`;
    ctx.textBaseline = 'top';
    ctx.textAlign   = 'left';
    const labelOffset = (worldOffset * 0.2) % 200;
    for (let x = -labelOffset; x < width; x += 200) {
      const wx = Math.round(worldOffset * 0.2 + x) - Math.round(worldOffset * 0.2 + x) % 200;
      ctx.fillText(`+${wx}`, x + 2, 2);
      ctx.beginPath(); ctx.strokeStyle = DIM; ctx.lineWidth = 0.5;
      ctx.moveTo(x, 0); ctx.lineTo(x, 6); ctx.stroke();
    }
    // Left edge coordinate labels
    ctx.textAlign = 'left';
    for (let y = 0; y < horizonY; y += 100) {
      ctx.fillStyle = DIM; ctx.font = `9px ${MONO}`;
      ctx.fillText(`${Math.round(y)}`, 2, y + 2);
    }

    // Compass rose — top right corner
    const crX = width - 38, crY = 38, crR = 18;
    ctx.strokeStyle = CYAN; ctx.lineWidth = 1;
    ctx.fillStyle   = CYAN; ctx.font = `8px ${MONO}`; ctx.textAlign = 'center';
    const dirs = [['N', 0], ['E', Math.PI/2], ['S', Math.PI], ['W', -Math.PI/2]];
    for (const [lbl, ang] of dirs) {
      const ex = crX + Math.sin(ang) * crR;
      const ey = crY - Math.cos(ang) * crR;
      ctx.beginPath(); ctx.moveTo(crX, crY); ctx.lineTo(ex, ey); ctx.stroke();
      arrowHead(ctx, ex, ey, Math.sin(ang), -Math.cos(ang), 5);
      const lx = crX + Math.sin(ang) * (crR + 8);
      const ly = crY - Math.cos(ang) * (crR + 8);
      ctx.fillText(lbl, lx, ly + 3);
    }
    circleStroke(ctx, crX, crY, 6);

    // ── Sun ────────────────────────────────────────────────────────────────────
    if (dayNightT >= 0.10 && dayNightT <= 0.65) {
      const sunT  = mapRange(dayNightT, 0.10, 0.65, 0, 1);
      const sunX  = width * (0.1 + sunT * 0.8);
      const arcT  = sunT;
      const sunY  = horizonY * (0.8 - 0.6 * (1 - Math.pow(arcT * 2 - 1, 2)));
      const sunR  = 20;

      ctx.strokeStyle = CYAN; ctx.lineWidth = 1.5;
      circleStroke(ctx, sunX, sunY, sunR);

      // Center crosshair
      ctx.strokeStyle = CYAN; ctx.lineWidth = 1;
      crosshair(ctx, sunX, sunY, 5);

      // Dimension lines: horizontal and vertical through the circle
      ctx.strokeStyle = DIM; ctx.lineWidth = 0.8;
      dashedLine(ctx, sunX - sunR - 14, sunY, sunX + sunR + 14, sunY, [3, 3]);
      dashedLine(ctx, sunX, sunY - sunR - 14, sunX, sunY + sunR + 14, [3, 3]);

      // Radius callout
      ctx.strokeStyle = CYAN; ctx.lineWidth = 1;
      ctx.fillStyle   = CYAN; ctx.font = `8px ${MONO}`; ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.beginPath();
      ctx.moveTo(sunX, sunY);
      ctx.lineTo(sunX + sunR, sunY);
      ctx.stroke();
      ctx.fillText('R=20', sunX + sunR + 3, sunY - 5);

      // Label
      ctx.fillStyle = DIM; ctx.font = `8px ${MONO}`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
      ctx.fillText('SOL', sunX, sunY - sunR - 3);
    }

    // ── Moon ───────────────────────────────────────────────────────────────────
    const moonT_raw = dayNightT >= 0.78
      ? mapRange(dayNightT, 0.78, 1.0, 0, 0.9)
      : dayNightT <= 0.06
        ? mapRange(dayNightT, 0.0, 0.06, 0.9, 1.0)
        : -1;

    if (moonT_raw >= 0) {
      const moonX = width  * (0.15 + moonT_raw * 0.70);
      const moonY = horizonY * (0.15 + 0.25 * Math.sin(moonT_raw * Math.PI));
      const moonR = 18;

      ctx.strokeStyle = WHITE; ctx.lineWidth = 1.5;
      circleStroke(ctx, moonX, moonY, moonR);
      // Crescent angle arc annotation
      ctx.strokeStyle = DIM; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(moonX, moonY, moonR + 6, -Math.PI * 0.7, 0); ctx.stroke();
      ctx.fillStyle = DIM; ctx.font = `8px ${MONO}`; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.fillText('∠48°', moonX + moonR + 8, moonY - 6);
      ctx.fillStyle = DIM; ctx.font = `8px ${MONO}`; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
      ctx.fillText('LUNA', moonX, moonY - moonR - 3);
      crosshair(ctx, moonX, moonY, 4);
    }

    // ── Stars as + crosshairs with constellation lines ─────────────────────────
    if (dayNightT > 0.75) {
      const sa = clamp(mapRange(dayNightT, 0.75, 0.90, 0, 1), 0, 1);
      const starAlpha = sa * 0.8;

      // Constellation connector lines
      ctx.strokeStyle = `rgba(74,158,255,${starAlpha * 0.25})`;
      ctx.lineWidth   = 0.6;
      ctx.setLineDash([2, 4]);
      for (const [a, b] of CONSTELLATION_EDGES) {
        if (a >= BP_STARS.length || b >= BP_STARS.length) continue;
        const sa_ = BP_STARS[a], sb_ = BP_STARS[b];
        ctx.beginPath();
        ctx.moveTo(sa_.xFrac * width, sa_.yFrac * horizonY);
        ctx.lineTo(sb_.xFrac * width, sb_.yFrac * horizonY);
        ctx.stroke();
      }
      ctx.setLineDash([]);

      // Crosshair stars
      ctx.strokeStyle = `rgba(224,240,255,${starAlpha})`;
      ctx.lineWidth   = 0.8;
      ctx.fillStyle   = `rgba(74,158,255,${starAlpha * 0.6})`;
      ctx.font        = `8px ${MONO}`;
      ctx.textBaseline = 'middle';
      for (const s of BP_STARS) {
        const sx = s.xFrac * width, sy = s.yFrac * horizonY;
        crosshair(ctx, sx, sy, 3);
        if (s.label) {
          ctx.textAlign = 'left';
          ctx.fillText(s.label, sx + 5, sy);
        }
      }
    }

    // ── Mountains — outline triangles with angle annotations ──────────────────
    const mOffset = worldOffset * 0.2;
    const M_TILE  = 1200;
    const mSets   = [
      { peakFrac: 0.45, halfWFrac: 0.22, color: `rgba(74,158,255,0.35)`, peaks: [0.05, 0.32, 0.60, 0.84] },
      { peakFrac: 0.60, halfWFrac: 0.17, color: `rgba(74,158,255,0.55)`, peaks: [0.18, 0.46, 0.72, 0.93] },
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
          const baseY = horizonY - 2;

          ctx.strokeStyle = mset.color; ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(peakX - halfW, baseY);
          ctx.lineTo(peakX, peakY);
          ctx.lineTo(peakX + halfW, baseY);
          ctx.stroke();

          // Dashed internal slope lines
          ctx.strokeStyle = `rgba(74,158,255,0.12)`;
          dashedLine(ctx, peakX, peakY, peakX, baseY, [4, 6]);

          // Base angle arc annotation
          const ang = Math.atan2(peakY - baseY, halfW);
          ctx.strokeStyle = `rgba(74,158,255,0.25)`;
          ctx.lineWidth   = 0.7;
          ctx.beginPath(); ctx.arc(peakX - halfW, baseY, 14, ang, 0); ctx.stroke();
          const deg = Math.round(Math.abs(ang * 180 / Math.PI));
          ctx.fillStyle = `rgba(74,158,255,0.35)`;
          ctx.font      = `7px ${MONO}`; ctx.textAlign = 'left'; ctx.textBaseline = 'bottom';
          ctx.fillText(`${deg}°`, peakX - halfW + 16, baseY - 2);
        }
      }
    }

    // Clouds — technical arc symbols
    const cloudVis = dayNightT < 0.80;
    if (cloudVis) {
      const cloudAlpha = dayNightT > 0.70 ? mapRange(dayNightT, 0.70, 0.80, 0.35, 0) : 0.35;
      const coffset = worldOffset * 0.15;
      const TILE_W  = 1600;
      const cfirst  = Math.floor(coffset / TILE_W) - 1;
      const clast   = Math.ceil((coffset + width) / TILE_W) + 1;
      const CLOUDS  = [
        { ox: 0.07, oy: 0.12, w: 60 },
        { ox: 0.32, oy: 0.08, w: 80 },
        { ox: 0.60, oy: 0.13, w: 55 },
        { ox: 0.82, oy: 0.09, w: 70 },
      ];
      ctx.strokeStyle = `rgba(74,158,255,${cloudAlpha})`;
      ctx.lineWidth   = 1;
      for (let tile = cfirst; tile <= clast; tile++) {
        const tileX = tile * TILE_W - coffset;
        for (const c of CLOUDS) {
          const cx = tileX + c.ox * TILE_W;
          const cy = c.oy * horizonY;
          // Technical cloud: sequence of arcs
          ctx.beginPath();
          ctx.arc(cx,          cy, c.w * 0.25, Math.PI, 0, false);
          ctx.arc(cx + c.w * 0.28, cy - c.w * 0.15, c.w * 0.20, Math.PI, 0, false);
          ctx.arc(cx + c.w * 0.55, cy, c.w * 0.22, Math.PI, 0, false);
          ctx.stroke();
          // Label
          ctx.fillStyle = `rgba(74,158,255,${cloudAlpha * 0.7})`;
          ctx.font = `7px ${MONO}`; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
          ctx.fillText('H₂O', cx + c.w * 0.25, cy + c.w * 0.28);
        }
      }
    }
  },

  // ── Midground ─────────────────────────────────────────────────────────────────

  drawMidground(ctx, worldOffset, dayNightT, width, height) {
    const horizonY = height * 0.70;
    const offset   = worldOffset * 0.5;

    // Terrain profile line
    ctx.strokeStyle = `rgba(74,158,255,0.45)`;
    ctx.lineWidth   = 1.5;
    ctx.beginPath();
    let firstPoint = true;
    for (let x = 0; x <= width; x += 6) {
      const wx = (x + offset) % 4000;
      const hv = 22 + 18 * Math.sin(wx * 0.003) + 12 * Math.sin(wx * 0.0079);
      if (firstPoint) { ctx.moveTo(x, horizonY - hv); firstPoint = false; }
      else { ctx.lineTo(x, horizonY - hv); }
    }
    ctx.stroke();

    // Elevation tick marks at peaks
    const ELEV_SPACING = 220;
    const elevOff = offset % ELEV_SPACING;
    const elevCount = Math.ceil(width / ELEV_SPACING) + 2;
    ctx.strokeStyle = `rgba(74,158,255,0.4)`;
    ctx.fillStyle   = `rgba(74,158,255,0.4)`;
    ctx.font        = `7px ${MONO}`; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
    ctx.lineWidth   = 1;
    for (let i = 0; i < elevCount; i++) {
      const ex  = i * ELEV_SPACING - elevOff;
      const wx  = Math.floor((ex + offset) % 4000);
      const hv  = 22 + 18 * Math.sin(wx * 0.003) + 12 * Math.sin(wx * 0.0079);
      const ey  = horizonY - hv;
      ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(ex, ey - 8); ctx.stroke();
      ctx.fillText(`${Math.round(hv)}m`, ex, ey - 9);
    }

    // Schematic trees
    const TREE_SPACING = 120;
    const treeOff  = offset % TREE_SPACING;
    const treeCount = Math.ceil(width / TREE_SPACING) + 2;
    ctx.strokeStyle = `rgba(74,158,255,0.5)`;
    ctx.lineWidth   = 1;
    for (let i = 0; i < treeCount; i++) {
      const tx  = i * TREE_SPACING - treeOff;
      const wx  = Math.floor((tx + offset) % 4000);
      const hv  = 22 + 18 * Math.sin(wx * 0.003) + 12 * Math.sin(wx * 0.0079);
      const baseY = horizonY - hv;
      const tH  = 36 + (wx % 4) * 10;

      // Trunk line
      ctx.beginPath(); ctx.moveTo(tx, baseY); ctx.lineTo(tx, baseY - tH * 0.55); ctx.stroke();
      // Canopy circle
      circleStroke(ctx, tx, baseY - tH * 0.55 - tH * 0.28, tH * 0.28);

      // Dimension arrow: tree height
      if (i % 3 === 0) {
        ctx.fillStyle = `rgba(74,158,255,0.3)`;
        ctx.font      = `7px ${MONO}`; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        ctx.strokeStyle = `rgba(74,158,255,0.22)`;
        dimArrow(ctx, tx + 10, baseY, tx + 10, baseY - tH, `${tH}px`, 0);
        ctx.strokeStyle = `rgba(74,158,255,0.5)`;
        ctx.fillStyle   = `rgba(74,158,255,0.5)`;
      }
    }
  },

  // ── Road ──────────────────────────────────────────────────────────────────────

  drawRoad(ctx, worldOffset, width, height) {
    const roadY = height * 0.70;
    const roadH = 42;
    const botY  = roadY + roadH;

    // Fill the ground area below road (subtle)
    ctx.fillStyle = 'rgba(10,30,54,0.8)';
    ctx.fillRect(0, roadY, width, height - roadY);

    // Two road edge lines
    ctx.strokeStyle = CYAN; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(0, roadY); ctx.lineTo(width, roadY); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, botY);  ctx.lineTo(width, botY);  ctx.stroke();

    // Dashed centre line — evenly spaced technical dashes
    const DASH = 18, GAP = 10, PERIOD = DASH + GAP;
    const dashOffset = -(worldOffset % PERIOD);
    const dashY = roadY + roadH / 2;
    ctx.strokeStyle = `rgba(74,158,255,0.55)`;
    ctx.lineWidth   = 1;
    ctx.setLineDash([DASH, GAP]);
    ctx.beginPath();
    ctx.moveTo(dashOffset, dashY); ctx.lineTo(width, dashY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Road width dimension arrow (shown once, near left edge)
    ctx.strokeStyle = `rgba(74,158,255,0.35)`;
    ctx.lineWidth   = 0.8;
    ctx.fillStyle   = `rgba(74,158,255,0.35)`;
    ctx.font        = `7px ${MONO}`; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    dimArrow(ctx, 24, roadY, 24, botY, 'W=42', -14);

    // Section markers every 300px
    const SEC_PERIOD = 300;
    const secOffset  = worldOffset % SEC_PERIOD;
    const secCount   = Math.ceil(width / SEC_PERIOD) + 2;
    const secLabels  = ['SEC-A', 'SEC-B', 'SEC-C', 'SEC-D', 'SEC-E', 'SEC-F'];
    ctx.strokeStyle = `rgba(74,158,255,0.22)`;
    ctx.lineWidth   = 0.7;
    ctx.fillStyle   = `rgba(74,158,255,0.22)`;
    ctx.font        = `7px ${MONO}`; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    for (let i = 0; i < secCount; i++) {
      const sx = i * SEC_PERIOD - secOffset;
      ctx.beginPath(); ctx.moveTo(sx, roadY - 6); ctx.lineTo(sx, botY + 4); ctx.stroke();
      ctx.fillText(secLabels[i % secLabels.length], sx, botY + 5);
    }
  },

  // ── Buildings ─────────────────────────────────────────────────────────────────

  drawBuilding(ctx, building, screenX, baseY, dayNightT, isHovered, isActive) {
    const x     = screenX;
    const w     = building.width;
    const h     = building.height;
    const y     = baseY - h;
    const night = dayNightT > 0.70;

    ctx.save();
    ctx.font         = `8px ${MONO}`;
    ctx.textBaseline = 'middle';

    const lineColor   = isHovered ? WHITE : CYAN;
    const lineW       = isHovered ? 2.5   : 1.8;
    if (isHovered) {
      ctx.shadowColor = 'rgba(74,158,255,0.3)';
      ctx.shadowBlur  = 8;
    }
    ctx.strokeStyle = lineColor;
    ctx.fillStyle   = lineColor;
    ctx.lineWidth   = lineW;

    switch (building.id) {
      case 'education':  this._bpSchool(ctx,   x, y, w, h, baseY, night, isActive, lineColor);   break;
      case 'experience': this._bpOffice(ctx,   x, y, w, h, baseY, night, isActive, lineColor);   break;
      case 'projects':   this._bpWorkshop(ctx, x, y, w, h, baseY, night, isActive, lineColor);   break;
      case 'hobbies':    this._bpCottage(ctx,  x, y, w, h, baseY, night, isActive, lineColor);   break;
      case 'contact':    this._bpCafe(ctx,     x, y, w, h, baseY, night, isActive, lineColor);   break;
      case 'toggle':     this._bpToggle(ctx,   x, y, w, h, isHovered, lineColor);                break;
    }

    ctx.shadowBlur  = 0;
    ctx.shadowColor = 'transparent';

    // Label above building
    if (building.id !== 'toggle') {
      ctx.fillStyle    = isHovered ? WHITE : DIM;
      ctx.font         = `9px ${MONO}`;
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(building.label.toUpperCase(), x + w / 2, y - 4);
    }
    ctx.restore();
  },

  _bpSchool(ctx, x, y, w, h, baseY, night, isActive, color) {
    // Main body
    ctx.beginPath(); ctx.strokeRect(x, y + h * 0.2, w, h * 0.8);
    // Triangular roof outline
    ctx.beginPath();
    ctx.moveTo(x - 6, y + h * 0.2);
    ctx.lineTo(x + w / 2, y);
    ctx.lineTo(x + w + 6, y + h * 0.2);
    ctx.stroke();
    // Small tower on top
    const tX = x + w / 2 - 10;
    ctx.beginPath(); ctx.strokeRect(tX, y - 20, 20, 22);
    // Bell symbol in tower
    ctx.beginPath(); ctx.arc(tX + 10, y - 10, 5, 0, Math.PI * 2); ctx.stroke();
    // Floor line
    ctx.strokeStyle = `rgba(74,158,255,0.35)`; ctx.lineWidth = 0.7;
    ctx.beginPath(); ctx.moveTo(x, y + h * 0.55); ctx.lineTo(x + w, y + h * 0.55); ctx.stroke();
    ctx.strokeStyle = color; ctx.lineWidth = 1.5;
    // Windows grid
    this._bpWindows(ctx, x, y + h * 0.24, w, h * 0.56, 3, 2, night, isActive);
    // Door
    ctx.beginPath(); ctx.strokeRect(x + w / 2 - 10, y + h - 28, 20, 28);
    // Dimension: width
    ctx.strokeStyle = `rgba(74,158,255,0.28)`; ctx.lineWidth = 0.7;
    ctx.fillStyle   = `rgba(74,158,255,0.28)`; ctx.font = `7px ${MONO}`; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    dimArrow(ctx, x, baseY + 10, x + w, baseY + 10, `W:${w}`, 0);
    // Dimension: height
    dimArrow(ctx, x - 14, y, x - 14, y + h, `H:${h}`, 0);
  },

  _bpOffice(ctx, x, y, w, h, baseY, night, isActive, color) {
    ctx.beginPath(); ctx.strokeRect(x, y, w, h);
    // Floor lines
    ctx.strokeStyle = `rgba(74,158,255,0.30)`; ctx.lineWidth = 0.7;
    const floors = 4;
    for (let f = 1; f < floors; f++) {
      const fy = y + f * (h / floors);
      ctx.beginPath(); ctx.moveTo(x, fy); ctx.lineTo(x + w, fy); ctx.stroke();
    }
    ctx.strokeStyle = color; ctx.lineWidth = 1.5;
    // Windows
    this._bpWindows(ctx, x, y, w, h, 3, 4, night, isActive);
    // Door
    ctx.beginPath(); ctx.strokeRect(x + w / 2 - 10, y + h - 28, 20, 28);
    // Dimension
    ctx.strokeStyle = `rgba(74,158,255,0.28)`; ctx.lineWidth = 0.7;
    ctx.fillStyle   = `rgba(74,158,255,0.28)`; ctx.font = `7px ${MONO}`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    dimArrow(ctx, x, baseY + 10, x + w, baseY + 10, `W:${w}`, 0);
    dimArrow(ctx, x - 14, y, x - 14, y + h, `H:${h}`, 0);
  },

  _bpWorkshop(ctx, x, y, w, h, baseY, night, isActive, color) {
    ctx.beginPath(); ctx.strokeRect(x, y + h * 0.15, w, h * 0.85);
    // Flat roof line
    ctx.beginPath(); ctx.moveTo(x - 4, y + h * 0.15); ctx.lineTo(x + w + 4, y + h * 0.15); ctx.stroke();
    // Large door opening — dashed to show it's open
    ctx.strokeStyle = `rgba(74,158,255,0.45)`;
    ctx.setLineDash([5, 4]);
    ctx.beginPath(); ctx.strokeRect(x + 16, y + h * 0.35, w - 32, h * 0.65 - 4);
    ctx.setLineDash([]);
    ctx.strokeStyle = color;
    // Gear symbol (circle + radial teeth outlines)
    const gx = x + w / 2, gy = y + h * 0.25;
    circleStroke(ctx, gx, gy, 10);
    circleStroke(ctx, gx, gy, 5);
    ctx.lineWidth = 0.8;
    for (let t = 0; t < 8; t++) {
      const ang = (t / 8) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(gx + Math.cos(ang) * 10, gy + Math.sin(ang) * 10);
      ctx.lineTo(gx + Math.cos(ang) * 14, gy + Math.sin(ang) * 14);
      ctx.stroke();
    }
    ctx.lineWidth = 1.5;
    ctx.fillStyle = `rgba(74,158,255,0.28)`; ctx.font = `7px ${MONO}`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.strokeStyle = `rgba(74,158,255,0.28)`; ctx.lineWidth = 0.7;
    dimArrow(ctx, x, baseY + 10, x + w, baseY + 10, `W:${w}`, 0);
  },

  _bpCottage(ctx, x, y, w, h, baseY, night, isActive, color) {
    ctx.beginPath(); ctx.strokeRect(x, y + h * 0.30, w, h * 0.70);
    // Roof lines
    ctx.beginPath();
    ctx.moveTo(x - 8, y + h * 0.32);
    ctx.lineTo(x + w / 2, y);
    ctx.lineTo(x + w + 8, y + h * 0.32);
    ctx.stroke();
    // Chimney
    ctx.beginPath(); ctx.strokeRect(x + w * 0.68, y - 12, 14, h * 0.30 + 14);
    // Garden area — dashed perimeter
    ctx.strokeStyle = `rgba(74,158,255,0.30)`;
    ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.strokeRect(x + w + 6, y + h * 0.55, 36, h * 0.45 - 2);
    ctx.setLineDash([]);
    ctx.strokeStyle = color;
    ctx.fillStyle = `rgba(74,158,255,0.22)`; ctx.font = `7px ${MONO}`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('GARDEN', x + w + 24, y + h * 0.78);
    // Windows + door
    this._bpWindows(ctx, x, y + h * 0.34, w, h * 0.45, 2, 2, night, isActive);
    ctx.strokeStyle = color; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.strokeRect(x + w / 2 - 10, y + h - 28, 20, 28);
    ctx.strokeStyle = `rgba(74,158,255,0.28)`; ctx.lineWidth = 0.7;
    ctx.fillStyle   = `rgba(74,158,255,0.28)`; ctx.font = `7px ${MONO}`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    dimArrow(ctx, x, baseY + 10, x + w, baseY + 10, `W:${w}`, 0);
  },

  _bpCafe(ctx, x, y, w, h, baseY, night, isActive, color) {
    ctx.beginPath(); ctx.strokeRect(x, y + 28, w, h - 28);
    // Awning line
    ctx.beginPath(); ctx.moveTo(x - 5, y); ctx.lineTo(x + w + 5, y); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x - 5, y + 28); ctx.lineTo(x + w + 5, y + 28); ctx.stroke();
    // Awning vertical stripes (dashed)
    ctx.strokeStyle = `rgba(74,158,255,0.25)`; ctx.lineWidth = 0.7;
    for (let s = 0; s < 6; s++) {
      const sx = x + s * (w / 5.5);
      dashedLine(ctx, sx, y, sx, y + 28, [3, 4]);
    }
    ctx.strokeStyle = color; ctx.lineWidth = 1.5;
    // Windows + door
    this._bpWindows(ctx, x, y + 32, w, h - 60, 2, 2, night, isActive);
    ctx.beginPath(); ctx.strokeRect(x + w / 2 - 10, y + h - 32, 20, 32);
    // Mailbox on post
    const mbX = x - 22, mbY = y + h - 28;
    ctx.beginPath(); ctx.strokeRect(mbX, mbY, 14, 10);
    ctx.beginPath(); ctx.moveTo(mbX + 7, mbY + 10); ctx.lineTo(mbX + 7, mbY + 28); ctx.stroke();
    ctx.fillStyle = `rgba(74,158,255,0.35)`; ctx.font = `6px ${MONO}`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
    ctx.fillText('MAIL', mbX + 7, mbY - 1);
    ctx.strokeStyle = `rgba(74,158,255,0.28)`; ctx.lineWidth = 0.7;
    ctx.fillStyle   = `rgba(74,158,255,0.28)`; ctx.font = `7px ${MONO}`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    dimArrow(ctx, x, baseY + 10, x + w, baseY + 10, `W:${w}`, 0);
  },

  _bpToggle(ctx, x, y, w, h, isHovered, color) {
    // Small rectangle
    ctx.beginPath(); ctx.strokeRect(x + 8, y + 8, w - 16, h - 16);
    // Refresh/cycle icon — circular arrows
    const icX = x + w / 2, icY = y + h / 2;
    const icR  = 16;
    ctx.strokeStyle = color; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(icX, icY, icR, -Math.PI * 0.6, Math.PI * 1.1); ctx.stroke();
    arrowHead(ctx, icX + Math.cos(Math.PI * 1.1) * icR, icY + Math.sin(Math.PI * 1.1) * icR,
              Math.sin(Math.PI * 1.1) * icR, -Math.cos(Math.PI * 1.1) * icR, 5);
    ctx.fillStyle = color; // reset fill for arrowhead
    // MODE label
    ctx.fillStyle = color; ctx.font = `8px ${MONO}`; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
    ctx.fillText('MODE', x + w / 2, y + h - 10);
    if (isHovered) {
      ctx.fillStyle = WHITE; ctx.font = `8px ${MONO}`; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
      ctx.fillText('CYCLE', x + w / 2, y - 4);
    }
  },

  _bpWindows(ctx, x, y, w, h, cols, rows, night, isActive) {
    const padX = 12, padY = 12;
    const gapX = (w - 2 * padX) / cols;
    const gapY = (h - 2 * padY) / rows;
    const wW = gapX - 8, wH = gapY - 8;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const wx = x + padX + c * gapX;
        const wy = y + padY + r * gapY;
        ctx.beginPath(); ctx.strokeRect(wx, wy, Math.max(8, wW), Math.max(6, wH));
        // Night window glow — tiny fill at very low alpha
        if (night || isActive) {
          ctx.fillStyle = 'rgba(74,158,255,0.09)';
          ctx.fillRect(wx, wy, Math.max(8, wW), Math.max(6, wH));
        }
      }
    }
  },

  // ── Cyclist — anatomical diagram ───────────────────────────────────────────

  drawCyclist(ctx, { world, width, height }) {
    const speed   = world.worldSpeed;
    const groundY = height * 0.70;
    const cx      = width * 0.33;
    const WHEEL_R = 18;
    const CRANK   = 12;

    bpPedalAngle += speed * 0.07;
    bpWheelAngle += speed * 0.15;

    // Mirror from lofi cyclist geometry
    const leanAngle = speed > 0.3
      ? 0.22 + Math.min(speed - 0.3, 0.7) * 0.3
      : speed < -0.1 ? -0.12 : 0.08;

    const rearWheelX  = cx - 20;
    const frontWheelX = cx + 24;
    const wheelY      = groundY + WHEEL_R - 4;
    const bb   = { x: cx + 2, y: wheelY - WHEEL_R + 4 };
    const leftPedal  = { x: bb.x + CRANK * Math.cos(bpPedalAngle), y: bb.y + CRANK * Math.sin(bpPedalAngle) };
    const rightPedal = { x: bb.x + CRANK * Math.cos(bpPedalAngle + Math.PI), y: bb.y + CRANK * Math.sin(bpPedalAngle + Math.PI) };
    const seat = { x: bb.x - 8, y: bb.y - WHEEL_R + 2 };
    const hip  = { x: seat.x, y: seat.y };
    const shoulder = { x: hip.x + 28 * Math.sin(leanAngle), y: hip.y - 28 * Math.cos(leanAngle) };
    const neck     = { x: shoulder.x + 8 * Math.sin(leanAngle * 0.6), y: shoulder.y - 8 * Math.cos(leanAngle * 0.6) };
    const handlebar = { x: frontWheelX - 8 + leanAngle * 10, y: wheelY - WHEEL_R * 1.7 };

    function ik(root, target, lenA, lenB) {
      const dist = Math.hypot(target.x - root.x, target.y - root.y);
      const cd   = clamp(dist, Math.abs(lenA - lenB) + 0.01, lenA + lenB - 0.01);
      const ang  = Math.atan2(target.y - root.y, target.x - root.x);
      const cosK = (lenA * lenA + cd * cd - lenB * lenB) / (2 * lenA * cd);
      const ka   = ang - Math.acos(clamp(cosK, -1, 1));
      return { x: root.x + lenA * Math.cos(ka), y: root.y + lenA * Math.sin(ka) };
    }

    const leftKnee   = ik(hip, leftPedal,  22, 20);
    const rightKnee  = ik(hip, rightPedal, 22, 20);
    const leftElbow  = ik(shoulder, handlebar, 18, 16);
    const rightElbow = ik({ x: shoulder.x + 3, y: shoulder.y }, { x: handlebar.x + 3, y: handlebar.y }, 18, 16);

    ctx.save();

    const THIN   = `rgba(74,158,255,0.55)`;
    const MAIN   = CYAN;
    const JNT    = WHITE;

    // Bicycle — outline only
    ctx.strokeStyle = MAIN; ctx.lineWidth = 1.5;
    // Frame triangle
    ctx.beginPath();
    ctx.moveTo(bb.x, bb.y);
    ctx.lineTo(seat.x, seat.y);
    ctx.lineTo(frontWheelX - 6, wheelY - WHEEL_R * 1.8);
    ctx.lineTo(bb.x, bb.y);
    ctx.stroke();
    // Chain stay, seat stay, fork
    ctx.beginPath(); ctx.moveTo(bb.x, bb.y);   ctx.lineTo(rearWheelX, wheelY); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(seat.x, seat.y); ctx.lineTo(rearWheelX, wheelY); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(frontWheelX - 6, wheelY - WHEEL_R * 1.8); ctx.lineTo(frontWheelX, wheelY); ctx.stroke();

    // Wheels — outline circles with crosshairs
    ctx.strokeStyle = MAIN; ctx.lineWidth = 1.5;
    circleStroke(ctx, rearWheelX, wheelY, WHEEL_R);
    circleStroke(ctx, frontWheelX, wheelY, WHEEL_R);
    ctx.strokeStyle = THIN; ctx.lineWidth = 0.8;
    rotatingCrosshair(ctx, rearWheelX,  wheelY, WHEEL_R, bpWheelAngle);
    rotatingCrosshair(ctx, frontWheelX, wheelY, WHEEL_R, bpWheelAngle);

    // Handlebar
    ctx.strokeStyle = MAIN; ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(frontWheelX - 6, wheelY - WHEEL_R * 1.8);
    ctx.lineTo(handlebar.x, handlebar.y);
    ctx.stroke();

    // Right limbs (behind, faded)
    ctx.globalAlpha = 0.5;
    ctx.strokeStyle = THIN; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(hip.x, hip.y); ctx.lineTo(rightKnee.x, rightKnee.y); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(rightKnee.x, rightKnee.y); ctx.lineTo(rightPedal.x, rightPedal.y); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(shoulder.x + 3, shoulder.y); ctx.lineTo(rightElbow.x, rightElbow.y); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(rightElbow.x, rightElbow.y); ctx.lineTo(handlebar.x + 3, handlebar.y); ctx.stroke();
    ctx.globalAlpha = 1;

    // Left limbs (front)
    ctx.strokeStyle = MAIN; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(hip.x, hip.y);         ctx.lineTo(leftKnee.x,  leftKnee.y);  ctx.stroke();
    ctx.beginPath(); ctx.moveTo(leftKnee.x, leftKnee.y); ctx.lineTo(leftPedal.x, leftPedal.y); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(shoulder.x, shoulder.y); ctx.lineTo(leftElbow.x, leftElbow.y); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(leftElbow.x, leftElbow.y); ctx.lineTo(handlebar.x, handlebar.y); ctx.stroke();

    // Torso + neck
    ctx.beginPath(); ctx.moveTo(hip.x, hip.y);       ctx.lineTo(shoulder.x, shoulder.y); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(shoulder.x, shoulder.y); ctx.lineTo(neck.x, neck.y);     ctx.stroke();

    // Joint circles
    const joints = [hip, shoulder, neck, leftKnee, leftElbow, rightKnee, rightElbow, leftPedal, rightPedal, handlebar];
    ctx.strokeStyle = JNT; ctx.lineWidth = 0.8;
    for (const j of joints) { circleStroke(ctx, j.x, j.y, 2.5); }

    // Head — circle outline only
    circleStroke(ctx, neck.x, neck.y - 8, 8);

    // Knee angle annotation
    const thighVec  = { x: leftKnee.x - hip.x, y: leftKnee.y - hip.y };
    const shinVec   = { x: leftPedal.x - leftKnee.x, y: leftPedal.y - leftKnee.y };
    const kneeAngle = Math.round(Math.abs(
      Math.atan2(shinVec.y, shinVec.x) - Math.atan2(thighVec.y, thighVec.x)
    ) * 180 / Math.PI);
    ctx.strokeStyle = THIN; ctx.lineWidth = 0.7;
    ctx.beginPath(); ctx.arc(leftKnee.x, leftKnee.y, 9, Math.atan2(thighVec.y, thighVec.x), Math.atan2(shinVec.y, shinVec.x)); ctx.stroke();
    ctx.fillStyle = THIN; ctx.font = `6px ${MONO}`; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.fillText(`${kneeAngle}°`, leftKnee.x + 11, leftKnee.y - 4);

    // Dimension callout on left thigh
    const thighLen = Math.round(Math.hypot(leftKnee.x - hip.x, leftKnee.y - hip.y));
    ctx.fillStyle = THIN; ctx.font = `6px ${MONO}`; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    ctx.fillText(`L=${thighLen}`, leftKnee.x - 4, (hip.y + leftKnee.y) / 2);

    ctx.restore();
  },

  // ── Weather ───────────────────────────────────────────────────────────────────

  drawWeather(ctx, weather, worldSpeed, dt, width, height) {
    const groundY = height * 0.70;
    const now     = Date.now() * 0.001;

    // Rain — velocity vectors (arrowheads)
    if (weather.rainIntensity > 0) {
      const count = Math.floor(weather.rainIntensity * 10);
      for (let i = 0; i < count; i++) {
        spawn(Math.random() * width, -10,
          worldSpeed * -40 + (Math.random() * 6 - 3),
          240 + Math.random() * 80,
          1.5, 1, 1, 74, 158);
      }
    }

    // Wind — spawn streamline seeds
    if (weather.windIntensity > 0.3) {
      const count = Math.floor((weather.windIntensity - 0.3) * 2);
      for (let i = 0; i < count; i++) {
        spawn(-10, Math.random() * height * 0.75,
          90 + Math.random() * 50, Math.random() * 10 - 5,
          1.5, 3, 2, 74, 158);
      }
    }

    update(dt);

    drawWith(ctx, (ctx, x, y, vx, vy, type, size, r, g, a) => {
      if (type === 1) {
        // Rain: dashed line with arrowhead — velocity vector
        const vlen  = Math.sqrt(vx * vx + vy * vy);
        const scale = 0.06;
        const ex    = x + vx * scale;
        const ey    = y + vy * scale;
        ctx.strokeStyle = `rgba(74,158,255,${a * 0.75})`;
        ctx.lineWidth   = 0.8;
        ctx.setLineDash([3, 3]);
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(ex, ey); ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = `rgba(74,158,255,${a * 0.75})`;
        arrowHead(ctx, ex, ey, vx, vy, 4);
      } else if (type === 2) {
        // Wind: streamline dot + small direction tick
        ctx.strokeStyle = `rgba(74,158,255,${a * 0.5})`;
        ctx.lineWidth   = 0.8;
        const ang = Math.atan2(vy, vx);
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + Math.cos(ang) * 8, y + Math.sin(ang) * 8);
        ctx.stroke();
        ctx.fillStyle = `rgba(74,158,255,${a * 0.5})`;
        arrowHead(ctx, x + Math.cos(ang) * 8, y + Math.sin(ang) * 8, Math.cos(ang), Math.sin(ang), 3);
      } else {
        // Dust
        ctx.strokeStyle = `rgba(74,158,255,${a * 0.4})`;
        ctx.lineWidth   = 0.6;
        circleStroke(ctx, x, y, size);
      }
    });

    // Wind streamlines
    if (weather.windIntensity > 0.4) {
      const wa = Math.min(weather.windIntensity * 0.25, 0.20);
      ctx.strokeStyle = `rgba(74,158,255,${wa})`; ctx.lineWidth = 0.8;
      for (let s = 0; s < 4; s++) {
        const sy = height * (0.15 + s * 0.18);
        const ox = ((now * 80 + s * 200) % (width + 100)) - 50;
        ctx.beginPath(); ctx.moveTo(ox, sy);
        for (let t = 0; t <= width; t += 20) {
          ctx.lineTo(ox + t, sy + Math.sin(t * 0.025 + now + s) * 15);
        }
        ctx.stroke();
        // Arrow at end of each streamline
        const ex = ox + width;
        const ey = sy + Math.sin(width * 0.025 + now + s) * 15;
        ctx.fillStyle = `rgba(74,158,255,${wa})`;
        arrowHead(ctx, ex, ey, 1, Math.cos(width * 0.025 + now + s) * 0.375, 5);
      }
    }

    // Lightning — jagged bolt with label
    if (weather.lightningActive) {
      if (bpFlashTimer <= 0 && Math.random() < 0.008) bpFlashTimer = 0.12;
    }
    if (bpFlashTimer > 0) {
      bpFlashTimer -= dt;
      if (bpFlashTimer > 0) {
        ctx.fillStyle = 'rgba(74,158,255,0.06)';
        ctx.fillRect(0, 0, width, height);
        ctx.strokeStyle = WHITE; ctx.lineWidth = 1.5;
        const boltX = width * 0.65;
        ctx.beginPath(); ctx.moveTo(boltX, 0);
        let bx = boltX, by = 0;
        const pts = [];
        while (by < height * 0.55) {
          bx += (Math.sin(by * 0.3) - 0.3) * 20;
          by += 22;
          pts.push({ x: bx, y: by });
          ctx.lineTo(bx, by);
        }
        ctx.stroke();
        // HIGH VOLTAGE label + warning triangle
        if (pts.length > 0) {
          const lx = pts[0].x + 12, ly = pts[0].y;
          ctx.strokeStyle = WHITE; ctx.lineWidth = 1;
          // Triangle outline
          ctx.beginPath();
          ctx.moveTo(lx, ly - 10);
          ctx.lineTo(lx - 8, ly + 4);
          ctx.lineTo(lx + 8, ly + 4);
          ctx.closePath();
          ctx.stroke();
          ctx.fillText('!', lx, ly - 1);
          ctx.fillStyle = WHITE; ctx.font = `7px ${MONO}`; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
          ctx.fillText('HIGH VOLTAGE', lx + 10, ly - 8);
        }
      }
    }
  },

  // ── Foreground ────────────────────────────────────────────────────────────────

  drawForeground(ctx, worldSpeed, worldOffset, weather, width, height) {
    const absSpeed = Math.abs(worldSpeed);
    const groundY  = height * 0.70;

    // Velocity vectors near cyclist when fast
    if (absSpeed > 0.4) {
      const vAlpha = mapRange(absSpeed, 0.4, 1.0, 0, 0.35);
      const cx     = width * 0.33;
      ctx.strokeStyle = `rgba(74,158,255,${vAlpha})`; ctx.lineWidth = 0.8;
      ctx.fillStyle   = `rgba(74,158,255,${vAlpha})`;
      const dir = worldSpeed > 0 ? 1 : -1;
      for (let i = 0; i < 3; i++) {
        const vx = cx - 30 - i * 20;
        const vy = groundY - 20 - i * 18;
        const vLen = 24 - i * 4;
        ctx.beginPath(); ctx.moveTo(vx, vy); ctx.lineTo(vx - dir * vLen, vy); ctx.stroke();
        arrowHead(ctx, vx - dir * vLen, vy, -dir, 0, 4);
      }
    }

    // HUD status readout — bottom left
    ctx.fillStyle   = 'rgba(74,158,255,0.20)';
    ctx.font        = `8px ${MONO}`;
    ctx.textAlign   = 'left';
    ctx.textBaseline = 'bottom';
    const vStr = worldSpeed.toFixed(2).padStart(5, ' ');
    const pStr = Math.round(worldOffset).toString().padStart(5, '0');
    const hdg  = worldSpeed >= 0 ? '→' : '←';
    ctx.fillText(`V: ${vStr}  POS: ${pStr}  HDG: ${hdg}`, 8, height - 6);

    // Subtle scanlines
    ctx.fillStyle = 'rgba(0,0,0,0.018)';
    for (let y = 0; y < height; y += 3) {
      ctx.fillRect(0, y, width, 1);
    }
  },

  // ── Toggle object — drafting table ────────────────────────────────────────────

  drawToggleObject(ctx, screenX, baseY, interactionState) {
    const x  = screenX;
    const tW = 80, tH = 50;
    const tX = x + 10, tY = baseY - 90;

    ctx.save();
    const color = interactionState === 'active' ? WHITE : CYAN;
    ctx.strokeStyle = color; ctx.lineWidth = 1.5;
    ctx.fillStyle   = color;

    // Table legs
    ctx.beginPath();
    ctx.moveTo(tX + 10, tY + tH); ctx.lineTo(tX + 10, baseY);
    ctx.moveTo(tX + tW - 10, tY + tH); ctx.lineTo(tX + tW - 10, baseY);
    ctx.stroke();
    // Angled drafting board surface
    ctx.beginPath();
    ctx.moveTo(tX, tY + tH);
    ctx.lineTo(tX, tY + tH * 0.2);
    ctx.lineTo(tX + tW, tY);
    ctx.lineTo(tX + tW, tY + tH);
    ctx.closePath();
    ctx.stroke();

    // Blueprint roll (cylinder outline) to the right
    const rX = tX + tW + 8, rY = tY + tH * 0.3;
    ctx.beginPath(); ctx.strokeRect(rX, rY, 14, 44);
    ctx.beginPath(); ctx.arc(rX + 7, rY, 7, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(rX + 7, rY + 44, 7, 0, Math.PI * 2); ctx.stroke();

    // Grid lines on the board surface (schematic detail)
    ctx.strokeStyle = `rgba(74,158,255,0.22)`; ctx.lineWidth = 0.6;
    for (let g = 1; g < 4; g++) {
      const gy = tY + tH * 0.2 + g * (tH * 0.8 / 4);
      const gx = tX + (g / 4) * tW;
      ctx.beginPath(); ctx.moveTo(tX, gy); ctx.lineTo(tX + tW, gy - tH * 0.2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(gx, tY + (1 - g / 4) * tH * 0.8); ctx.lineTo(gx, tY + tH); ctx.stroke();
    }

    // Label
    ctx.strokeStyle = color; ctx.lineWidth = 1.5;
    ctx.fillStyle   = interactionState === 'nearby' ? WHITE : DIM;
    ctx.font        = `8px ${MONO}`; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
    ctx.fillText('MODE SELECT', tX + tW / 2, tY - 4);

    if (interactionState === 'nearby') {
      // Circular refresh icon above
      const icX = tX + tW / 2, icY = tY - 22;
      ctx.strokeStyle = WHITE; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.arc(icX, icY, 10, -Math.PI * 0.5, Math.PI * 1.2); ctx.stroke();
      ctx.fillStyle = WHITE;
      arrowHead(ctx, icX + Math.cos(Math.PI * 1.2) * 10, icY + Math.sin(Math.PI * 1.2) * 10,
                Math.sin(Math.PI * 1.2), -Math.cos(Math.PI * 1.2), 4);
      ctx.fillStyle = WHITE; ctx.font = `7px ${MONO}`; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
      ctx.fillText('CYCLE', icX, icY - 14);
    }

    ctx.restore();
  },

  // ── Transition — lines erase and redraw ───────────────────────────────────────

  transitionIn(ctx, progress, width, height) {
    if (progress >= 1.0) return;

    if (progress < 0.35) {
      // Expanding navy rectangles wipe old theme left→right
      const wipeX = (progress / 0.35) * (width + 20);
      ctx.fillStyle = NAVY;
      ctx.fillRect(0, 0, wipeX, height);
      // Leading edge — faint cyan line
      ctx.strokeStyle = `rgba(74,158,255,${0.6 * (1 - progress / 0.35)})`;
      ctx.lineWidth   = 2;
      ctx.beginPath(); ctx.moveTo(wipeX, 0); ctx.lineTo(wipeX, height); ctx.stroke();
    } else if (progress < 0.70) {
      // Full navy cover
      ctx.fillStyle = NAVY;
      ctx.fillRect(0, 0, width, height);

      // Grid lines draw themselves outward from centre
      const t   = (progress - 0.35) / 0.35;
      const cx  = width / 2, cy = height / 2;
      const maxR = Math.sqrt(cx * cx + cy * cy);
      const r   = t * maxR;
      ctx.strokeStyle = `rgba(74,158,255,${t * 0.18})`;
      ctx.lineWidth   = 0.7;
      ctx.save();
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.clip();
      drawGrid(ctx, width, height);
      ctx.restore();

      // Faint radial pulse
      ctx.strokeStyle = `rgba(74,158,255,${(1 - t) * 0.35})`;
      ctx.lineWidth   = 1.5;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
    } else {
      // World fades in — fade from navy overlay
      const t = (progress - 0.70) / 0.30;
      const a = 1.0 - t;
      ctx.fillStyle = `rgba(10,30,54,${a})`;
      ctx.fillRect(0, 0, width, height);
      // Grid always visible during reveal
      drawGrid(ctx, width, height);
    }
  },
};

