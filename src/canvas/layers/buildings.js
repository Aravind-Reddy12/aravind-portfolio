import { BUILDINGS } from '../../data/buildings';
import { worldToScreen, isOnScreen } from '../../utils/world';

const ROAD_Y_RATIO = 0.70;

// ─── Per-building draw functions ──────────────────────────────────────────────

function drawSchool(ctx, x, y, w, h, hovered, active, night) {
  // Brick body
  ctx.fillStyle = hovered ? '#a05520' : '#8B4513';
  ctx.fillRect(x, y, w, h);

  // Triangular roof
  ctx.fillStyle = '#5a2a0a';
  ctx.beginPath();
  ctx.moveTo(x - 10, y);
  ctx.lineTo(x + w / 2, y - 30);
  ctx.lineTo(x + w + 10, y);
  ctx.closePath();
  ctx.fill();

  // Windows (2 rows × 3 cols)
  const winColor = night || active ? '#ffe080' : '#4a3020';
  ctx.fillStyle = winColor;
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 3; col++) {
      ctx.fillRect(x + 18 + col * 58, y + 20 + row * 55, 28, 36);
    }
  }

  // Door
  ctx.fillStyle = '#3a1a08';
  ctx.fillRect(x + w / 2 - 18, y + h - 55, 36, 55);
}

function drawOffice(ctx, x, y, w, h, hovered, active, night) {
  // Main tower
  ctx.fillStyle = hovered ? '#667788' : '#556677';
  ctx.fillRect(x, y, w, h);

  // Darker cap
  ctx.fillStyle = '#3a4a55';
  ctx.fillRect(x, y, w, 18);

  // Window grid
  const winColor = night || active ? '#ffe8a0' : '#2a3840';
  ctx.fillStyle = winColor;
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 4; col++) {
      // Randomly skip some windows for variety (deterministic by position)
      if ((row * 4 + col) % 5 === 3 && !night) continue;
      ctx.fillRect(x + 12 + col * 48, y + 28 + row * 32, 24, 20);
    }
  }
}

function drawGarage(ctx, x, y, w, h, hovered, active, night) {
  // Wide low body
  ctx.fillStyle = hovered ? '#6a5a4a' : '#5a4a3a';
  ctx.fillRect(x, y, w, h);

  // Roof overhang
  ctx.fillStyle = '#3a2a1a';
  ctx.fillRect(x - 5, y, w + 10, 14);

  // Garage door (large)
  ctx.fillStyle = active ? '#888' : '#3a2a1a';
  ctx.fillRect(x + 20, y + 20, w - 40, h - 35);
  // Door panels
  ctx.strokeStyle = '#5a4a3a';
  ctx.lineWidth = 2;
  for (let i = 1; i < 4; i++) {
    const py = y + 20 + i * ((h - 35) / 4);
    ctx.beginPath();
    ctx.moveTo(x + 20, py);
    ctx.lineTo(x + w - 20, py);
    ctx.stroke();
  }

  // Gear sign (circle with spokes)
  ctx.strokeStyle = hovered ? '#f4a261' : '#a07050';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x + w - 28, y + 14, 8, 0, Math.PI * 2);
  ctx.stroke();
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(x + w - 28, y + 14);
    ctx.lineTo(x + w - 28 + Math.cos(a) * 8, y + 14 + Math.sin(a) * 8);
    ctx.stroke();
  }
}

function drawCourt(ctx, x, y, w, h, hovered, active, night) {
  // Main structure
  ctx.fillStyle = hovered ? '#4a7a4a' : '#3a6a3a';
  ctx.fillRect(x, y, w, h);

  // Court surface visible inside
  ctx.fillStyle = '#2a5a2a';
  ctx.fillRect(x + 10, y + 30, w - 20, h - 40);

  // Basketball hoop
  ctx.strokeStyle = '#f4a261';
  ctx.lineWidth = 3;
  // Pole
  ctx.beginPath();
  ctx.moveTo(x + w - 20, y);
  ctx.lineTo(x + w - 20, y - 35);
  ctx.stroke();
  // Backboard
  ctx.strokeStyle = '#e8d5b7';
  ctx.lineWidth = 2;
  ctx.strokeRect(x + w - 36, y - 38, 26, 18);
  // Hoop
  ctx.strokeStyle = '#f4a261';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x + w - 26, y - 18, 8, 0, Math.PI);
  ctx.stroke();

  // Net lines (6 short diagonal lines)
  ctx.strokeStyle = '#e8d5b740';
  ctx.lineWidth = 1;
  for (let i = 0; i < 5; i++) {
    ctx.beginPath();
    ctx.moveTo(x + w - 34 + i * 4, y - 18);
    ctx.lineTo(x + w - 32 + i * 4, y - 5);
    ctx.stroke();
  }
}

function drawCafe(ctx, x, y, w, h, hovered, active, night) {
  // Body
  ctx.fillStyle = hovered ? '#7a5a4a' : '#6a4a3a';
  ctx.fillRect(x, y, w, h);

  // Awning
  ctx.fillStyle = '#c0392b';
  ctx.beginPath();
  ctx.moveTo(x - 8, y + 4);
  ctx.lineTo(x + w + 8, y + 4);
  ctx.lineTo(x + w, y + 26);
  ctx.lineTo(x, y + 26);
  ctx.closePath();
  ctx.fill();
  // Awning stripes
  ctx.fillStyle = '#e74c3c';
  for (let i = 0; i < 4; i++) {
    ctx.fillRect(x + 8 + i * 36, y + 4, 16, 22);
  }

  // Windows (warm glow)
  const winColor = night || active ? '#ffcc66' : '#4a2a1a';
  ctx.fillStyle = winColor;
  ctx.fillRect(x + 14, y + 36, 38, 40);
  ctx.fillRect(x + w - 52, y + 36, 38, 40);

  // Door
  ctx.fillStyle = '#3a1a08';
  ctx.fillRect(x + w / 2 - 14, y + h - 50, 28, 50);
  // Door handle
  ctx.fillStyle = '#f4a261';
  ctx.beginPath();
  ctx.arc(x + w / 2 + 8, y + h - 25, 3, 0, Math.PI * 2);
  ctx.fill();

  // Small sign
  ctx.fillStyle = '#f4a261';
  ctx.font = 'bold 10px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('CAFÉ', x + w / 2, y + 18);
}

function drawToggle(ctx, x, y, w, h, hovered, active) {
  // Glowing pedestal base
  ctx.fillStyle = hovered ? '#f4a261' : '#a06030';
  ctx.fillRect(x + 10, y + h - 20, w - 20, 20);

  // Vinyl record player
  // Platter
  ctx.fillStyle = hovered ? '#2a2a3a' : '#1a1a2a';
  ctx.beginPath();
  ctx.arc(x + w / 2, y + h / 2, 35, 0, Math.PI * 2);
  ctx.fill();
  // Record grooves
  ctx.strokeStyle = hovered ? '#f4a26180' : '#f4a26140';
  ctx.lineWidth = 1;
  for (let r = 10; r <= 30; r += 6) {
    ctx.beginPath();
    ctx.arc(x + w / 2, y + h / 2, r, 0, Math.PI * 2);
    ctx.stroke();
  }
  // Label circle
  ctx.fillStyle = hovered ? '#f4a261' : '#c07030';
  ctx.beginPath();
  ctx.arc(x + w / 2, y + h / 2, 8, 0, Math.PI * 2);
  ctx.fill();
  // Tonearm
  ctx.strokeStyle = '#e8d5b7';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x + w - 14, y + h / 2 - 28);
  ctx.quadraticCurveTo(x + w - 8, y + h / 2 - 10, x + w / 2 + 28, y + h / 2 + 8);
  ctx.stroke();

  // Glow when hovered
  if (hovered) {
    ctx.shadowColor = '#f4a261';
    ctx.shadowBlur  = 18;
    ctx.beginPath();
    ctx.arc(x + w / 2, y + h / 2, 35, 0, Math.PI * 2);
    ctx.strokeStyle = '#f4a26160';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.shadowBlur = 0;
  }
}

// ─── Main draw ────────────────────────────────────────────────────────────────

export function drawBuildings(ctx, width, height, worldOffset, activeBuilding, hoveredBuilding, dayNightT) {
  const roadY = height * ROAD_Y_RATIO;
  const night = dayNightT > 0.7;

  ctx.save();

  for (const b of BUILDINGS) {
    if (!isOnScreen(b.worldX, b.width, worldOffset, width)) continue;

    const sx     = worldToScreen(b.worldX, worldOffset, width);
    const bx     = sx;
    const by     = roadY - b.height;
    const hovered = b.id === hoveredBuilding;
    const active  = b.id === activeBuilding;

    // Glow effect for hovered buildings
    if (hovered && b.id !== 'toggle') {
      ctx.shadowColor = '#f4a261';
      ctx.shadowBlur  = 20;
    }

    switch (b.id) {
      case 'education':  drawSchool(ctx, bx, by, b.width, b.height, hovered, active, night); break;
      case 'experience': drawOffice(ctx, bx, by, b.width, b.height, hovered, active, night); break;
      case 'projects':   drawGarage(ctx, bx, by, b.width, b.height, hovered, active, night); break;
      case 'hobbies':    drawCourt(ctx, bx, by, b.width, b.height, hovered, active, night);  break;
      case 'contact':    drawCafe(ctx, bx, by, b.width, b.height, hovered, active, night);   break;
      case 'toggle':     drawToggle(ctx, bx, by, b.width, b.height, hovered, active);        break;
    }

    ctx.shadowBlur = 0;

    // Label
    ctx.fillStyle   = night ? '#e8d5b7a0' : '#e8d5b760';
    ctx.font        = '11px sans-serif';
    ctx.textAlign   = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(b.label, bx + b.width / 2, roadY + 6);
  }

  ctx.restore();
}

// ─── Hit detection ────────────────────────────────────────────────────────────

export function hitTestBuildings(clickScreenX, clickScreenY, worldOffset, width, height) {
  const roadY = height * ROAD_Y_RATIO;

  for (const b of BUILDINGS) {
    const sx = worldToScreen(b.worldX, worldOffset, width);
    if (
      clickScreenX >= sx              &&
      clickScreenX <= sx + b.width    &&
      clickScreenY >= roadY - b.height &&
      clickScreenY <= roadY
    ) return b;
  }
  return null;
}
