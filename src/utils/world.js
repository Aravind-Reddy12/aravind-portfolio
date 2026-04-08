import { WORLD_WIDTH } from '../constants';

/** Shortest distance between two world-X positions, accounting for wrap. */
export function wrappedDist(a, b) {
  const raw = Math.abs(a - b);
  return Math.min(raw, WORLD_WIDTH - raw);
}

/** Convert a world-X to screen-X given the current worldOffset and viewport width. */
export function worldToScreen(worldX, worldOffset, viewportW) {
  let sx = worldX - worldOffset;
  if (sx < -WORLD_WIDTH / 2) sx += WORLD_WIDTH;
  if (sx >  WORLD_WIDTH / 2) sx -= WORLD_WIDTH;
  return sx;
}

/** Returns true if a world-X AABB is visible on screen (partially or fully). */
export function isOnScreen(worldX, objWidth, worldOffset, viewportW) {
  const sx = worldToScreen(worldX, worldOffset, viewportW);
  return sx + objWidth > 0 && sx < viewportW;
}
