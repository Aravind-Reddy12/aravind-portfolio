import { inverseLerp } from '../utils/math';
import { lerpColor } from '../utils/colors';

const SKY_STOPS = [
  { t: 0.0, top: '#1a0a2e', bottom: '#ff6b3d' },  // dawn
  { t: 0.2, top: '#4a90d9', bottom: '#87ceeb' },  // morning
  { t: 0.4, top: '#1e90ff', bottom: '#87ceeb' },  // noon
  { t: 0.6, top: '#4a6fa5', bottom: '#d4a574' },  // afternoon
  { t: 0.8, top: '#2d1b4e', bottom: '#ff6347' },  // dusk
  { t: 1.0, top: '#0a0a1a', bottom: '#0d1117' },  // night
];

function findFloorIndex(t) {
  if (t >= 1.0) return SKY_STOPS.length - 2;
  for (let i = SKY_STOPS.length - 2; i >= 0; i--) {
    if (t >= SKY_STOPS[i].t) return i;
  }
  return 0;
}

export function getPalette(t) {
  if (t >= 1.0) {
    const last = SKY_STOPS[SKY_STOPS.length - 1];
    return { top: last.top, bottom: last.bottom };
  }
  const i      = findFloorIndex(t);
  const localT = inverseLerp(SKY_STOPS[i].t, SKY_STOPS[i + 1].t, t);
  return {
    top:    lerpColor(SKY_STOPS[i].top,    SKY_STOPS[i + 1].top,    localT),
    bottom: lerpColor(SKY_STOPS[i].bottom, SKY_STOPS[i + 1].bottom, localT),
  };
}
