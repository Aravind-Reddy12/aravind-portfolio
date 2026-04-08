// Float32Array particle pool — zero allocations after init
// Layout per particle (STRIDE = 10):
//   0:x  1:y  2:vx  3:vy  4:life  5:maxLife  6:size  7:type  8:r  9:g

const STRIDE        = 10;
const MAX_PARTICLES = 200;
const pool          = new Float32Array(MAX_PARTICLES * STRIDE);
let   alive         = 0;

function swap(iA, iB) {
  if (iA === iB) return;
  for (let j = 0; j < STRIDE; j++) {
    const a   = iA * STRIDE + j;
    const b   = iB * STRIDE + j;
    const tmp = pool[a];
    pool[a]   = pool[b];
    pool[b]   = tmp;
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function spawn(x, y, vx, vy, life, size, type, r, g) {
  if (alive >= MAX_PARTICLES) return;
  const i        = alive * STRIDE;
  pool[i + 0]    = x;
  pool[i + 1]    = y;
  pool[i + 2]    = vx;
  pool[i + 3]    = vy;
  pool[i + 4]    = life;
  pool[i + 5]    = life; // maxLife
  pool[i + 6]    = size;
  pool[i + 7]    = type;
  pool[i + 8]    = r;
  pool[i + 9]    = g;
  alive++;
}

export function update(dt) {
  let i = 0;
  while (i < alive) {
    const base = i * STRIDE;
    pool[base + 0] += pool[base + 2] * dt; // x += vx * dt
    pool[base + 1] += pool[base + 3] * dt; // y += vy * dt
    pool[base + 4] -= dt;                  // life -= dt

    if (pool[base + 4] <= 0) {
      // Swap with last alive and shrink — O(1) removal
      swap(i, alive - 1);
      alive--;
      // Don't increment i — re-check this index (now holds the swapped particle)
    } else {
      i++;
    }
  }
}

export function draw(ctx) {
  for (let i = 0; i < alive; i++) {
    const base    = i * STRIDE;
    const x       = pool[base + 0];
    const y       = pool[base + 1];
    const vx      = pool[base + 2];
    const vy      = pool[base + 3];
    const life    = pool[base + 4];
    const maxLife = pool[base + 5];
    const size    = pool[base + 6];
    const type    = pool[base + 7];
    const r       = pool[base + 8];
    const g       = pool[base + 9];
    const alpha   = Math.max(0, life / maxLife);

    switch (type) {
      case 1: { // rain — diagonal line
        ctx.strokeStyle = `rgba(${r}, ${g}, 220, ${alpha * 0.7})`;
        ctx.lineWidth   = size * 0.8;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + vx * 0.02, y + vy * 0.02);
        ctx.stroke();
        break;
      }
      case 2: { // wind debris — small dot/leaf
        ctx.fillStyle = `rgba(${r}, ${g}, 80, ${alpha})`;
        ctx.beginPath();
        ctx.ellipse(x, y, size, size * 0.5, Math.atan2(vy, vx), 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case 0: // dust
      default: {
        ctx.fillStyle = `rgba(${r}, ${g}, 100, ${alpha * 0.6})`;
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
    }
  }
}

export function hasAlive() { return alive > 0; }
export function clear()    { alive = 0; }
export function getAlive() { return alive; }
