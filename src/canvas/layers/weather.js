import { spawn, update, draw } from '../particles';

// Lightning flash state
let flashAlpha    = 0;
let flashDuration = 0;

export function drawWeather(ctx, width, height, weather, worldSpeed, dt) {
  // ─── Spawn rain ──────────────────────────────────────────────────────────────
  if (weather.rainIntensity > 0) {
    const count = Math.floor(weather.rainIntensity * 8);
    for (let i = 0; i < count; i++) {
      spawn(
        Math.random() * width,          // x
        -10,                            // y (above screen)
        worldSpeed * -50 + (Math.random() * 40 - 20), // vx — wind-blown
        300 + Math.random() * 100,      // vy — falling down
        1.5,                            // life (seconds)
        2,                              // size
        1,                              // type = rain
        100, 150                        // r, g (bluish)
      );
    }
  }

  // ─── Spawn wind debris ───────────────────────────────────────────────────────
  if (weather.windIntensity > 0.3) {
    const count = Math.floor((weather.windIntensity - 0.3) * 4);
    for (let i = 0; i < count; i++) {
      spawn(
        -10,                                      // x (enter from left)
        Math.random() * height * 0.7,             // y (sky/midground area)
        100 + Math.random() * 80,                 // vx
        Math.random() * 40 - 20,                  // vy
        3,                                        // life
        3,                                        // size
        2,                                        // type = wind_debris
        120, 100                                  // r, g (earthy)
      );
    }
  }

  // ─── Update + draw all particles ─────────────────────────────────────────────
  update(dt);
  draw(ctx);

  // ─── Lightning flash ─────────────────────────────────────────────────────────
  if (weather.lightningActive) {
    // 1% chance per frame to trigger a new flash
    if (flashDuration <= 0 && Math.random() < 0.01) {
      flashAlpha    = 0.35;
      flashDuration = 0.12; // seconds
    }
  }

  if (flashDuration > 0) {
    flashDuration -= dt;
    if (flashDuration < 0) flashDuration = 0;

    const fade = flashDuration > 0 ? flashAlpha : 0;
    if (fade > 0) {
      ctx.fillStyle = `rgba(255, 255, 255, ${fade})`;
      ctx.fillRect(0, 0, width, height);
    }
  }

  // ─── Fog overlay ─────────────────────────────────────────────────────────────
  if (weather.fogOpacity > 0) {
    const fogAlpha = weather.fogOpacity * 0.5;
    const grad = ctx.createLinearGradient(0, height * 0.6, 0, height);
    grad.addColorStop(0, `rgba(180, 190, 200, 0)`);
    grad.addColorStop(1, `rgba(180, 190, 200, ${fogAlpha})`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, height * 0.6, width, height * 0.4);
  }
}
