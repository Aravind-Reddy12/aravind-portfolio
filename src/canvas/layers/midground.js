import { lerpColor } from '../../utils/colors';
import { mapRange } from '../../utils/math';

const PARALLAX   = 0.5;
const HORIZON_Y  = 0.70; // fraction — road starts here
const HILL_Y     = 0.65; // fraction — hills peak around here
const TILE_W     = 800;  // px — hill/tree tile repeat

// Tree positions within a tile
const TREES = [
  { x: 0.07, h: 55, r: 14 },
  { x: 0.18, h: 45, r: 11 },
  { x: 0.31, h: 60, r: 15 },
  { x: 0.46, h: 48, r: 12 },
  { x: 0.60, h: 52, r: 13 },
  { x: 0.73, h: 42, r: 10 },
  { x: 0.85, h: 58, r: 14 },
  { x: 0.95, h: 44, r: 11 },
];

function getHillColor(dayNightT) {
  if (dayNightT <= 0.1 || dayNightT >= 0.9)
    return '#0f1a0f';
  if (dayNightT <= 0.2)
    return lerpColor('#111a11', '#2a3a22', mapRange(dayNightT, 0.1, 0.2, 0, 1));
  if (dayNightT <= 0.3)
    return lerpColor('#2a3a22', '#2d5a3a', mapRange(dayNightT, 0.2, 0.3, 0, 1));
  if (dayNightT <= 0.7)
    return '#2d5a3a';
  if (dayNightT <= 0.8)
    return lerpColor('#2d5a3a', '#3a2a2a', mapRange(dayNightT, 0.7, 0.8, 0, 1));
  return lerpColor('#3a2a2a', '#0f1a0f', mapRange(dayNightT, 0.8, 0.9, 0, 1));
}

function getTreeColor(dayNightT) {
  if (dayNightT <= 0.1 || dayNightT >= 0.9) return '#0a120a';
  if (dayNightT <= 0.25)
    return lerpColor('#0a120a', '#1a3a22', mapRange(dayNightT, 0.1, 0.25, 0, 1));
  if (dayNightT <= 0.7)
    return '#1a3a22';
  if (dayNightT <= 0.85)
    return lerpColor('#1a3a22', '#0a120a', mapRange(dayNightT, 0.7, 0.85, 0, 1));
  return '#0a120a';
}

export function drawMidground(ctx, width, height, worldOffset, dayNightT) {
  const offset    = worldOffset * PARALLAX;
  const horizonY  = height * HORIZON_Y;
  const hillBaseY = height * HILL_Y;

  const hillColor = getHillColor(dayNightT);
  const treeColor = getTreeColor(dayNightT);

  const firstTile = Math.floor(offset / TILE_W) - 1;
  const lastTile  = Math.ceil((offset + width) / TILE_W) + 1;

  for (let tile = firstTile; tile <= lastTile; tile++) {
    const tileX = tile * TILE_W - offset;

    // Rolling hill — bezier wave across the tile
    ctx.fillStyle = hillColor;
    ctx.beginPath();
    ctx.moveTo(tileX, horizonY);

    // Two gentle humps per tile using bezier curves
    const mid  = tileX + TILE_W * 0.5;
    const end  = tileX + TILE_W;
    const peak1 = hillBaseY - 20;
    const peak2 = hillBaseY - 30;

    ctx.bezierCurveTo(
      tileX + TILE_W * 0.15, peak1,
      tileX + TILE_W * 0.35, peak1,
      mid, hillBaseY
    );
    ctx.bezierCurveTo(
      mid + TILE_W * 0.15, peak2,
      mid + TILE_W * 0.35, peak2,
      end, hillBaseY - 10
    );
    ctx.lineTo(end, horizonY);
    ctx.closePath();
    ctx.fill();

    // Trees on the hill
    ctx.fillStyle = treeColor;
    for (const t of TREES) {
      const tx      = tileX + t.x * TILE_W;
      const trunkY  = hillBaseY - 8; // sit on the hill
      const topY    = trunkY - t.h;

      // Trunk
      ctx.fillRect(tx - 2, topY + t.h * 0.55, 4, t.h * 0.45);

      // Canopy (circle)
      ctx.beginPath();
      ctx.arc(tx, topY + t.r, t.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
