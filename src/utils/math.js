export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

export function mapRange(value, inMin, inMax, outMin, outMax) {
  return outMin + ((value - inMin) / (inMax - inMin)) * (outMax - outMin);
}

export function smoothstep(t) {
  return t * t * (3 - 2 * t);
}

export function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export function inverseLerp(a, b, value) {
  return (value - a) / (b - a);
}
