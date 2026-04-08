import { wrappedDist } from '../utils/world';
import { smoothstep, clamp, lerp } from '../utils/math';
import { world } from './WorldState';
import { WEATHER_ZONES, DEFAULT_ZONE } from '../data/weather';

const BLEND_RADIUS = 400;

export function resolveWeather(worldOffset) {
  let nearestDist = Infinity;
  let nearestZone = DEFAULT_ZONE;

  for (const zone of WEATHER_ZONES) {
    const dist = wrappedDist(zone.worldX, worldOffset);
    if (dist < nearestDist) {
      nearestDist = dist;
      nearestZone = zone;
    }
  }

  const t = smoothstep(clamp(1 - nearestDist / BLEND_RADIUS, 0, 1));
  const target = nearestZone.weather;

  // Gradual per-frame blend toward nearest zone
  world.weather.rainIntensity  = lerp(world.weather.rainIntensity,  target.rainIntensity,  t * 0.1);
  world.weather.windIntensity  = lerp(world.weather.windIntensity,  target.windIntensity,  t * 0.1);
  world.weather.fogOpacity     = lerp(world.weather.fogOpacity,     target.fogOpacity,     t * 0.1);
  world.weather.lightningActive = nearestDist < BLEND_RADIUS / 2 ? target.lightningActive : false;
}

export function reset() {
  const d = DEFAULT_ZONE.weather;
  world.weather.rainIntensity   = d.rainIntensity;
  world.weather.windIntensity   = d.windIntensity;
  world.weather.fogOpacity      = d.fogOpacity;
  world.weather.lightningActive = d.lightningActive;
}
