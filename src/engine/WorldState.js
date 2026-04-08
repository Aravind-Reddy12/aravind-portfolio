export const world = {
  // World position
  worldOffset:      0,         // 0 → WORLD_WIDTH, wraps seamlessly
  worldSpeed:       0,         // smoothed, px/frame equivalent
  targetSpeed:      0,         // raw from input events
  inputDirection:   1,         // 1 = forward, -1 = reverse

  // Active building
  activeBuilding:   null,      // building id string or null
  hoveredBuilding:  null,      // building id string or null (for glow effect)
  modalOpen:        false,

  // Theme
  theme:            'lofi',    // 'lofi' | 'pixel' | 'storybook' | 'blueprint'
  themeTransitionT: 1.0,       // 1.0 = complete, 0.0 = just started
  toggleInteractState: 'idle', // 'idle' | 'nearby' | 'active'

  // Weather
  weather: {
    rainIntensity:   0,
    windIntensity:   0,
    fogOpacity:      0,
    lightningActive: false,
    terrainTint:     null,
  },

  // Day/night
  dayNightT:        0.0,       // 0=dawn → 0.5=noon → 1.0=night, mapped from worldOffset

  // Loop
  lap:              1,

  // Onboarding
  hasInteracted:    false,     // true after first wheel/drag input

  // Performance
  dt:               16.67,
  fps:              60,
  prefersReducedMotion: false,
  canvasLOD:        'high',    // 'high' | 'medium' | 'low'
};

const listeners = new Set();

export function subscribe(callback) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

export function getSnapshot() {
  return world;
}

export function notifySubscribers() {
  listeners.forEach((cb) => cb());
}
