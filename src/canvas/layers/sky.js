import { getPalette } from '../../engine/DayNightCycle';
import { mapRange, clamp } from '../../utils/math';
import { alpha } from '../../utils/colors';

const HORIZON_RATIO = 0.70; // sky occupies top 70% of canvas

// Star field — 120 positions seeded once
const STAR_COUNT = 120;
const stars = [];
let starsSeeded = false;

function seedStars() {
  // Deterministic-ish seed using Math.random at init time (called once)
  for (let i = 0; i < STAR_COUNT; i++) {
    stars.push({
      x:     Math.random(),           // 0–1 of width
      y:     Math.random() * 0.60,    // 0–0.6 of horizon height
      size:  0.5 + Math.random() * 1.5,
      phase: Math.random() * Math.PI * 2,
      freq:  0.5 + Math.random() * 1.5,
    });
  }
  starsSeeded = true;
}

function drawSunGlow(ctx, x, y, radius, color) {
  const grd = ctx.createRadialGradient(x, y, 0, x, y, radius * 2.5);
  grd.addColorStop(0, alpha(color, 0.4));
  grd.addColorStop(1, alpha(color, 0));
  ctx.fillStyle = grd;
  ctx.beginPath();
  ctx.arc(x, y, radius * 2.5, 0, Math.PI * 2);
  ctx.fill();
}

export function drawSky(ctx, width, height, dayNightT, skyPalette) {
  if (!starsSeeded) seedStars();

  const horizonY = height * HORIZON_RATIO;
  const { top, bottom } = skyPalette || getPalette(dayNightT);

  // Sky gradient
  const grad = ctx.createLinearGradient(0, 0, 0, horizonY);
  grad.addColorStop(0, top);
  grad.addColorStop(1, bottom);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, horizonY);

  const now = Date.now();

  // Stars (night: dayNightT > 0.75)
  if (dayNightT > 0.75) {
    const starAlpha = clamp(mapRange(dayNightT, 0.75, 0.9, 0, 1), 0, 1);
    for (const s of stars) {
      const twinkle = 0.6 + 0.4 * Math.sin(now * 0.001 * s.freq + s.phase);
      const a = starAlpha * twinkle;
      ctx.fillStyle = `rgba(255, 255, 255, ${a})`;
      ctx.beginPath();
      ctx.arc(s.x * width, s.y * horizonY, s.size, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Sun (visible dawn→afternoon: ~0.05 to 0.70)
  if (dayNightT >= 0.05 && dayNightT <= 0.70) {
    const sunT  = mapRange(dayNightT, 0.05, 0.70, 0, 1);   // 0=left, 1=right
    const sunX  = width * (0.1 + sunT * 0.8);
    // Arc: parabola peaking at noon (t=0.5 → dayNightT≈0.4)
    const arcT  = mapRange(dayNightT, 0.05, 0.70, 0, 1);
    const sunY  = horizonY * (0.8 - 0.6 * (1 - Math.pow(arcT * 2 - 1, 2)));
    const sunR  = 25;

    drawSunGlow(ctx, sunX, sunY, sunR, '#FFD700');
    ctx.fillStyle = '#FFD700';
    ctx.beginPath();
    ctx.arc(sunX, sunY, sunR, 0, Math.PI * 2);
    ctx.fill();
  }

  // Moon (visible dusk→dawn: ~0.78 to 1.0 and 0.0 to 0.05)
  const moonT_raw = dayNightT >= 0.78 ? mapRange(dayNightT, 0.78, 1.0, 0, 0.9)
                  : dayNightT <= 0.05  ? mapRange(dayNightT, 0.0,  0.05, 0.9, 1.0)
                  : -1;

  if (moonT_raw >= 0) {
    const moonX = width  * (0.15 + moonT_raw * 0.70);
    const moonY = horizonY * (0.15 + 0.25 * Math.sin(moonT_raw * Math.PI));
    const moonR = 18;

    drawSunGlow(ctx, moonX, moonY, moonR, '#C0C0C0');
    ctx.fillStyle = '#C0C0C0';
    ctx.beginPath();
    ctx.arc(moonX, moonY, moonR, 0, Math.PI * 2);
    ctx.fill();
  }
}
