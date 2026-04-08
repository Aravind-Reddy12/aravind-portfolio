# The Ride of Aravind — Architecture Document (v4, production)

## Vision

An interactive, canvas-driven cycling portfolio where the visitor inhabits a **looping animated world** — a living road that never ends. The cyclist pedals through a stylised neighbourhood of landmark buildings, each one a chapter of Aravind's story. Wheel/drag speed controls pedalling speed. Click a building to explore it. The whole world shifts between four distinct visual styles, each with its own atmosphere, diegetic toggle object, weather, and day/night character.

**Core metaphor**: _Life is a ride, not a destination._ The world loops. The journey continues. The visitor is always mid-ride.

---

## 1. Tech Stack

| Layer              | Choice                        | Reason                                                    |
| ------------------ | ----------------------------- | --------------------------------------------------------- |
| Framework          | React 18 (Vite)               | Component-driven style system, fast HMR, clean ESM        |
| Language           | JavaScript (JSX)              | No TypeScript overhead for a portfolio                    |
| World rendering    | HTML5 Canvas API (raw)        | Full control over the looping world, cyclist, weather     |
| UI overlays        | React + CSS Modules           | Modals, content panels sit above the canvas               |
| Input engine       | Pointer Events API            | Unified mouse + touch + pen; wheel for desktop scroll     |
| Styling            | CSS Modules + CSS variables   | Scoped styles, per-theme design tokens                    |
| Fonts              | Google Fonts (self-hosted)    | Per-theme font pairings (see Section 8)                   |
| Deployment         | GitHub Pages via `gh-pages`   | Free, static SPA, fits a portfolio                        |
| Routing            | Hash-based anchor navigation  | GitHub Pages doesn't support server-side rewrites         |

**Zero runtime animation libraries.** Canvas loop + CSS transitions only.

---

## 2. Project Structure

```
aravind-portfolio/
├── public/
│   ├── favicon.ico
│   ├── og-image.png
│   └── fonts/                          # Self-hosted .woff2 per theme
│
├── src/
│   ├── main.jsx                        # ReactDOM.createRoot — entry point only
│   ├── App.jsx                         # Mounts canvas + UI layers, owns WorldState context
│   │
│   ├── engine/
│   │   ├── WorldState.js               # Central mutable state atom (NOT React state)
│   │   ├── InputDriver.js              # Pointer + wheel + touch → worldSpeed writes
│   │   ├── ThemeEngine.js              # 4 themes + transitionIn interpolation
│   │   ├── WeatherSystem.js            # Per-zone weather rules + blend logic
│   │   ├── DayNightCycle.js            # WorldOffset-mapped sky palette + sun/moon arc
│   │   └── LoopManager.js              # Seamless world wrap + lap counter
│   │
│   ├── canvas/
│   │   ├── WorldCanvas.js              # Master rAF loop — composites all layers
│   │   ├── layers/
│   │   │   ├── sky.js                  # Sky gradient, sun/moon body, star field
│   │   │   ├── background.js           # Far mountains, clouds — 0.2x parallax
│   │   │   ├── midground.js            # Trees, hills — 0.5x parallax
│   │   │   ├── road.js                 # Ground surface, road markings
│   │   │   ├── buildings.js            # Landmark buildings at fixed world X positions
│   │   │   ├── weather.js              # Rain, wind, snow, lightning particles
│   │   │   ├── toggleObject.js         # Diegetic style-toggle world objects (per theme)
│   │   │   └── foreground.js           # Speed lines, dust, foreground debris
│   │   ├── cyclist.js                  # Procedural cyclist — IK rig, pedal, reactions
│   │   ├── particles.js                # Float32Array object pool, zero GC
│   │   ├── offscreen.js                # OffscreenCanvas manager for sky + background caching
│   │   └── themes/
│   │       ├── pixel.js                # Pixel art draw overrides, palette, transitionIn
│   │       ├── storybook.js            # Storybook draw overrides, palette, transitionIn
│   │       ├── lofi.js                 # Lo-fi draw overrides, palette, transitionIn
│   │       └── blueprint.js            # Blueprint draw overrides, palette, transitionIn
│   │
│   ├── components/
│   │   ├── BuildingModal/
│   │   │   ├── index.jsx               # Section content panel (opens on building click)
│   │   │   └── BuildingModal.module.css
│   │   ├── sections/
│   │   │   ├── Education.jsx
│   │   │   ├── Experience.jsx
│   │   │   ├── Projects.jsx
│   │   │   ├── Hobbies.jsx
│   │   │   └── Contact.jsx
│   │   ├── OnboardingHint/
│   │   │   ├── index.jsx               # "Scroll or drag to ride" prompt
│   │   │   └── OnboardingHint.module.css
│   │   ├── StyleHUD/
│   │   │   ├── index.jsx               # Subtle corner display — current theme + lap counter
│   │   │   └── StyleHUD.module.css
│   │   └── SpeedHUD/
│   │       ├── index.jsx               # Optional speed indicator HUD
│   │       └── SpeedHUD.module.css
│   │
│   ├── hooks/
│   │   ├── useWorldState.js            # useSyncExternalStore bridge for React components
│   │   ├── useCanvas.js                # Canvas context, DPR, resize, rAF loop setup
│   │   ├── useTheme.js                 # Active theme, trigger transitionIn
│   │   └── useDayNight.js              # Day/night progress from worldOffset
│   │
│   ├── data/
│   │   ├── buildings.js                # Landmark definitions (type, worldX, sectionId)
│   │   ├── projects.js                 # Project objects
│   │   ├── skills.js                   # Skills array
│   │   ├── milestones.js               # Education + experience timeline
│   │   └── weather.js                  # Per-zone weather config
│   │
│   ├── utils/
│   │   ├── math.js                     # lerp, clamp, mapRange, smoothstep, easeInOutCubic
│   │   ├── world.js                    # wrappedDist, worldToScreen, isOnScreen
│   │   ├── colors.js                   # lerpColor, palette helpers, alpha
│   │   └── canvas.js                   # drawRoundedRect, drawGlow, clearCanvas
│   │
│   ├── styles/
│   │   ├── global.css                  # Reset, font-face, body, touch-action
│   │   └── variables.css               # Base design tokens (overridden per theme at runtime)
│   │
│   └── constants/
│       └── index.js                    # WORLD_WIDTH, BUILDING_POSITIONS, speed limits
│
├── .gitignore
├── index.html
├── package.json
├── vite.config.js
└── README.md
```

---

## 3. The World

### 3.1 Looping Horizontal World

The world is a **fixed-width horizontal canvas** (~6000px). Buildings sit at fixed X positions in world space. The visitor's input advances `worldOffset`, which scrolls all layers left. When `worldOffset` exceeds `WORLD_WIDTH`, it wraps to zero — seamlessly. The visitor never reaches an end.

```
World width: 6000px (configurable via WORLD_WIDTH constant)
Viewport: full-screen canvas (position: fixed, z-index: 0)

World space (loops):
[  School  ]──[  Office  ]──[  Garage  ]──[  Court  ]──[  Café  ]──[  Toggle  ]──→ wraps back
  x:600         x:1800        x:2800        x:3800       x:4800      x:5400
  Education    Experience    Projects       Hobbies      Contact     Theme switch
```

**Canvas layers (back → front):**

| Layer | File | Parallax |
|---|---|---|
| Sky | `layers/sky.js` | fixed (no parallax) |
| Far background | `layers/background.js` | 0.2× worldOffset |
| Mid background | `layers/midground.js` | 0.5× worldOffset |
| Road surface | `layers/road.js` | 1.0× worldOffset |
| Buildings | `layers/buildings.js` | 1.0× worldOffset |
| Toggle object | `layers/toggleObject.js` | 1.0× worldOffset |
| Cyclist | `cyclist.js` | fixed screen X |
| Weather | `layers/weather.js` | fullscreen |
| Foreground debris | `layers/foreground.js` | 1.2× worldOffset |

### 3.2 Wrapping-Aware Math (`utils/world.js`)

All distance and position calculations across the codebase **must** account for the world loop. A utility module provides the canonical functions:

```js
// utils/world.js
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
```

Every system that computes distance or visibility — WeatherSystem, building hit detection, building rendering, toggle object proximity — uses these functions. No raw `Math.abs(a - b)` on world positions.

### 3.3 Input → Speed Pipeline

The world does **not scroll via the page scrollbar**. Input events are intercepted and converted to `worldSpeed`. The canvas element has `touch-action: none` (set in CSS) to prevent browser scroll/zoom interference on mobile.

```
Wheel event (deltaY)       ──┐
Pointer drag (dx/frame)    ──┤─→ InputDriver.js → targetSpeed → lerp → worldSpeed
                             ──┘
  (Pointer Events API handles mouse, touch, and pen uniformly)

worldSpeed is smoothed (EMA, α=0.12):
  currentSpeed = lerp(currentSpeed, targetSpeed, 0.12)  // per frame

worldOffset advances:
  worldOffset += currentSpeed * (dt / 16.67)
  worldOffset = ((worldOffset % WORLD_WIDTH) + WORLD_WIDTH) % WORLD_WIDTH  // seamless loop
```

**Speed states and their effects:**

| State | worldSpeed | Cyclist | Visual |
|---|---|---|---|
| Idle | ~0 | Slow coast | Ambient dust, gentle sway |
| Cruising | 0.3–0.6 | Normal pedal cadence | Default |
| Fast | 0.7–1.0 | Lean forward, fast cadence | Speed lines, wind particles |
| Reverse | < 0 | Looks back over shoulder | World rewinds |
| Braking | lerping → 0 | Weight shifts back | Skid dust particles |

### 3.4 Landmark Buildings

Each building is a **clickable world object** drawn on canvas. Hit detection uses wrapping-aware AABB (see §3.2).

**Interaction flow:**
1. Visitor clicks a building (canvas `click` → `worldToScreen` → wrapping-aware AABB hit test)
2. `worldSpeed` lerps to 0 (cyclist brakes)
3. Cyclist hops-off animation plays (~800ms)
4. Building door opens / lights up
5. `BuildingModal` slides in with section content
6. On modal close → cyclist hops back on (~600ms), `worldSpeed` resumes

**Building registry (`data/buildings.js`):**

```js
export const BUILDINGS = [
  { id: 'education',  worldX: 600,  width: 200, height: 180, section: 'Education'  },
  { id: 'experience', worldX: 1800, width: 220, height: 200, section: 'Experience' },
  { id: 'projects',   worldX: 2800, width: 240, height: 220, section: 'Projects'   },
  { id: 'hobbies',    worldX: 3800, width: 180, height: 160, section: 'Hobbies'    },
  { id: 'contact',    worldX: 4800, width: 160, height: 150, section: 'Contact'    },
  { id: 'toggle',     worldX: 5400, width: 120, height: 140, section: null          },
];
```

**Hit detection (wrapping-aware):**

```js
function hitTestBuildings(clickScreenX, clickScreenY, worldOffset, viewportW) {
  for (const b of BUILDINGS) {
    const sx = worldToScreen(b.worldX, worldOffset, viewportW);
    const roadY = /* road surface Y */;
    if (
      clickScreenX >= sx && clickScreenX <= sx + b.width &&
      clickScreenY >= roadY - b.height && clickScreenY <= roadY
    ) return b;
  }
  return null;
}
```

### 3.5 Canvas Cursor States

The canvas cursor changes based on what the pointer is hovering over, giving the visitor clear interaction feedback:

| Hover target | Cursor | Feedback |
|---|---|---|
| Empty road / sky | `grab` (idle), `grabbing` (dragging) | "You can drag to move" |
| Building (clickable) | `pointer` | Building glows / pulses subtly |
| Toggle object | `pointer` | Toggle object bounces / highlights |
| Modal is open | `default` | Canvas input is paused |

```js
// In the pointermove handler, after world-space conversion:
const hovered = hitTestBuildings(e.offsetX, e.offsetY, world.worldOffset, width);
canvas.style.cursor = hovered ? 'pointer' : (isDragging ? 'grabbing' : 'grab');
world.hoveredBuilding = hovered ? hovered.id : null; // used by buildings.js for glow effect
```

---

## 4. Visual Themes

Four distinct visual styles. Each theme file exports a **draw context object** that overrides every canvas draw function, its own color palette, font tokens, and a `transitionIn` animation.

### 4.1 Theme Data Shape

```js
// Each theme in canvas/themes/*.js exports this shape:
export const lofiTheme = {
  id: 'lofi',
  label: 'Lo-fi',

  palette: {
    ground:        '#2a2035',
    road:          '#1e1a2e',
    roadLine:      '#f4a261',
    accent:        '#f4a261',
    accentDim:     '#a0622a',
    text:          '#e8d5b7',
    textMuted:     '#8a7a6a',
    bg:            '#1a1625',
    surface:       '#2a2035',
    buildingFill:  '#2d2545',
    buildingStroke:'#f4a261',
    particleTint:  '#f4a261',
    jerseyFill:    '#2d2545',
    jerseyStroke:  '#f4a261',
  },

  fonts: {
    '--font-display': "'Space Grotesk', sans-serif",
    '--font-body':    "'DM Sans', sans-serif",
  },

  // Canvas draw overrides — called by WorldCanvas per frame.
  // Sky colors come from DayNightCycle (the single source of truth for sky gradients).
  // Each theme renders the sky palette in its own visual language.
  drawBackground:   (ctx, skyPalette, dayNightT, worldOffset) => { },
  drawRoad:         (ctx, worldOffset) => { },
  drawBuilding:     (ctx, building, screenX, dayNightT, isHovered) => { },
  drawCyclist:      (ctx, state) => { },
  drawWeather:      (ctx, weatherState, dt) => { },
  drawToggleObject: (ctx, screenX, interactionState) => { },

  // Entrance transition — called by WorldCanvas when switching TO this theme.
  // progress: 0→1, runs over ~1 second (dt-scaled, not frame-count-dependent).
  // The OUTGOING theme has no exit handler. The incoming world announces itself.
  transitionIn: (ctx, progress) => { /* warm orange fade */ },
};
```

**Sky color ownership:** `DayNightCycle` is the **single source of truth** for sky gradients. It produces a `{ top, bottom }` palette from `dayNightT`. Each theme's `drawBackground` receives this palette and renders it in its own visual language — gradient fill (Lo-fi), pixel blocks (Pixel), watercolour wash (Storybook), or grid overlay (Blueprint). Themes do **not** store their own sky colors. This prevents conflicts and ensures the day/night arc is consistent across theme switches.

**`transitionIn` ownership rule:** each theme owns its *entrance*, never its exit. `WorldCanvas` calls `nextTheme.transitionIn(ctx, progress)` during the transition window. The outgoing theme is never consulted.

### 4.2 The Four Themes

#### Theme 1 — Lo-fi 🎧 *(default)*

| Property | Detail |
|---|---|
| Palette | Muted purples, warm oranges, dusty blues — always feels like evening |
| Font | `Space Grotesk` (display), `DM Sans` (body) |
| Draw style | Flat fills, soft rounded buildings, glowing windows |
| Day sky | Hazy morning yellow-orange, steam rising from rooftops |
| Night sky | Deep purple, warm glowing windows, rain-slicked streets |
| Rain | Diagonal streaks + puddle ripple rings on the ground |
| Wind | Floating music notes, cherry blossoms, paper scraps |
| Cyclist | Hoodie + headphones, relaxed posture, slight bop animation |
| Toggle object | **Vinyl record player stall** — click next track, world shifts |
| Transition in | Screen fades through warm orange, tape-hiss audio cue |

#### Theme 2 — Pixel Art 🎮

| Property | Detail |
|---|---|
| Palette | 16-color NES/SNES-inspired, chunky pixel fills |
| Font | `Press Start 2P` (display), `VT323` (body) |
| Draw style | All shapes snapped to 4px grid, `imageSmoothingEnabled = false` |
| Day sky | Bright blue, blocky pixel sun, pixel clouds |
| Night sky | Deep navy, pixel moon, pixel stars, arcade neon on buildings |
| Rain | Chunky pixel droplets — 4×2px rectangles |
| Wind | Pixel debris sprites flying horizontally |
| Cyclist | 16×16 sprite-sheet style, choppy 4-frame animation |
| Toggle object | **Cartridge slot** — ride past, press it, screen-flash reboot |
| Transition in | CRT scanline wipe sweeps top→bottom + 8-bit startup jingle |

#### Theme 3 — Illustrated Storybook 📖

| Property | Detail |
|---|---|
| Palette | Warm watercolour tones, soft edges, slight paper texture |
| Font | `Lora` (display), `Nunito` (body) |
| Draw style | Wobbly bezier outlines, hatching fills, hand-drawn feel |
| Day sky | Golden watercolour wash, sun with a friendly illustrated face |
| Night sky | Ink-blue, doodled stars, hand-drawn moon |
| Rain | Thin ink-stroke diagonal lines, watercolour puddle splashes |
| Wind | Illustrated swirl lines, leaves shaped like brushstrokes |
| Cyclist | Storybook character — round head, scarf, expressive poses |
| Toggle object | **Open book on a pedestal** — flip the page, ink spreads across screen |
| Transition in | Page-turn wipe + ink bleed bleeding in from the left edge |

#### Theme 4 — Blueprint 📐

| Property | Detail |
|---|---|
| Palette | Navy background, white/cyan linework — no fills anywhere |
| Font | `JetBrains Mono` (display + body) |
| Draw style | All shapes outline-only, technical line weights, dimension arrows |
| Day sky | Grid overlay, compass rose, coordinate markers |
| Night sky | Star map with constellation lines and labels |
| Rain | Velocity vectors — droplets drawn as dashed arrows with arrowheads |
| Wind | Airflow streamlines with direction indicators |
| Cyclist | Anatomical diagram style — joints labeled, dimension callouts |
| Toggle object | **Drafting table + blueprint roll** — world "redraws" in white lines |
| Transition in | Lines erase and redraw across canvas like an architect revising a draft |

---

## 5. Engine Layer

### 5.1 WorldState — Central State Atom

All canvas layers and React UI components read from a single shared plain JS object. This is **not** React state — it is mutated synchronously by the input pipeline and read directly by the canvas render loop at 60fps.

```js
// engine/WorldState.js
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
```

**Why not React state?** The canvas rAF loop reads WorldState 60× per second. Pushing updates through React reconciliation would waste frame budget and cause visual tearing. Instead, `WorldState` is a mutable object. React components that need slices subscribe via `useWorldState`, which uses `useSyncExternalStore`:

```js
// hooks/useWorldState.js
import { useSyncExternalStore } from 'react';
import { subscribe, getSnapshot } from '../engine/WorldState';

export function useWorldState(selector) {
  return useSyncExternalStore(subscribe, () => selector(getSnapshot()));
}
```

### 5.2 InputDriver — Events → WorldSpeed

Uses the **Pointer Events API** for unified mouse/touch/pen handling. The `wheel` event handles desktop scroll input separately.

**Critical design:** drag tracking uses `lastPointerX` (updated every move event), not a fixed `startX`. This gives correct per-frame deltas instead of unbounded cumulative offsets.

```js
// engine/InputDriver.js
import { world } from './WorldState';
import { clamp } from '../utils/math';

let lastPointerX = null;
let isDragging   = false;

export function init(canvas) {
  // — Wheel (desktop) —
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    world.targetSpeed = clamp(world.targetSpeed + e.deltaY * 0.01, -1, 1);
    world.hasInteracted = true;
  }, { passive: false });

  // — Pointer drag (mouse + touch + pen via Pointer Events API) —
  canvas.addEventListener('pointerdown', (e) => {
    canvas.setPointerCapture(e.pointerId);
    lastPointerX = e.clientX;
    isDragging = true;
  });

  canvas.addEventListener('pointermove', (e) => {
    if (!isDragging || lastPointerX === null) return;
    const dx = e.clientX - lastPointerX;
    lastPointerX = e.clientX;                    // ← update every frame, not just on start
    world.targetSpeed = clamp(-dx * 0.008, -1, 1); // negative: drag right → move forward
    world.hasInteracted = true;
  });

  canvas.addEventListener('pointerup', (e) => {
    canvas.releasePointerCapture(e.pointerId);
    lastPointerX = null;
    isDragging = false;
    world.targetSpeed = 0; // release → decelerate to idle
  });

  canvas.addEventListener('pointercancel', (e) => {
    canvas.releasePointerCapture(e.pointerId);
    lastPointerX = null;
    isDragging = false;
    world.targetSpeed = 0;
  });
}
```

**CSS requirement** (in `global.css`):
```css
canvas {
  touch-action: none;    /* Prevent browser scroll/zoom on touch devices */
  -webkit-user-select: none;
  user-select: none;
}
```

**Why Pointer Events, not Touch Events?** Pointer Events unify mouse, touch, and pen into one API. `setPointerCapture` ensures we keep receiving events even if the pointer leaves the canvas during a drag. This eliminates the need for separate `touchstart`/`touchmove`/`touchend` handlers and handles all devices with one code path.

Per rAF frame (in `WorldCanvas.js`):
```js
world.worldSpeed  = lerp(world.worldSpeed, world.targetSpeed, 0.12);
world.worldOffset += world.worldSpeed * (world.dt / 16.67);
world.worldOffset  = ((world.worldOffset % WORLD_WIDTH) + WORLD_WIDTH) % WORLD_WIDTH;
world.dayNightT    = world.worldOffset / WORLD_WIDTH;
```

### 5.3 ThemeEngine

Transition timing is **dt-scaled** so the transition always takes ~1 second regardless of frame rate.

```js
// engine/ThemeEngine.js
import { world } from './WorldState';
import { easeInOutCubic } from '../utils/math';
import { lerpColor } from '../utils/colors';

let fromTheme    = null; // set on init
let toTheme      = null;
let transitionT  = 1.0;
const DURATION_S = 1.0;  // transition duration in seconds

export function init(defaultTheme) {
  fromTheme = defaultTheme;
  toTheme   = defaultTheme;
}

export function setTheme(themeId) {
  fromTheme   = getInterpolatedTheme(); // snapshot colors mid-transition
  toTheme     = THEMES[themeId];
  transitionT = 0.0;
  world.theme = themeId;
  world.themeTransitionT = 0.0;
  // Snap fonts immediately (masked by transitionIn animation)
  Object.entries(toTheme.fonts).forEach(([k, v]) =>
    document.documentElement.style.setProperty(k, v));
}

export function tick(dt) {
  if (transitionT >= 1.0) return;
  transitionT = Math.min(1.0, transitionT + dt / DURATION_S); // ← dt-scaled
  world.themeTransitionT = transitionT;
  syncCSSVariables(getInterpolatedTheme());
}

export function getInterpolatedTheme() {
  if (transitionT >= 1.0) return toTheme;
  const t = easeInOutCubic(transitionT);
  return interpolatePalettes(fromTheme.palette, toTheme.palette, t);
}

function interpolatePalettes(from, to, t) {
  const result = {};
  for (const key of Object.keys(from)) {
    result[key] = lerpColor(from[key], to[key], t);
  }
  return result;
}

function syncCSSVariables(palette) {
  const r = document.documentElement;
  r.style.setProperty('--color-bg',         palette.bg);
  r.style.setProperty('--color-surface',    palette.surface);
  r.style.setProperty('--color-accent',     palette.accent);
  r.style.setProperty('--color-text',       palette.text);
  r.style.setProperty('--color-text-muted', palette.textMuted);
  r.style.setProperty('--color-accent-glow',
    palette.accent.replace(')', ', 0.2)').replace('rgb', 'rgba'));
}
```

**`transitionIn` is called by `WorldCanvas` during the transition window:**
```js
// In WorldCanvas.js frame loop:
if (world.themeTransitionT < 1.0) {
  THEMES[world.theme].transitionIn(ctx, world.themeTransitionT);
}
```

The outgoing theme is never consulted.

### 5.4 WeatherSystem

Weather zones are defined by proximity to building X positions. As `worldOffset` approaches a building, weather blends toward that zone's config. **All distance calculations use `wrappedDist`** (see §3.2) to work correctly at the world-loop boundary.

```js
// engine/WeatherSystem.js
import { wrappedDist } from '../utils/world';

const BLEND_RADIUS = 400; // world px — blend starts 400px before/after zone center

export function resolveWeather(worldOffset) {
  let nearest = { zone: DEFAULT_ZONE, dist: Infinity };
  for (const zone of WEATHER_ZONES) {
    const dist = wrappedDist(zone.worldX, worldOffset); // ← wrapping-aware
    if (dist < nearest.dist) nearest = { zone, dist };
  }
  const t = smoothstep(clamp(1 - nearest.dist / BLEND_RADIUS, 0, 1));
  blendWeatherInto(world.weather, nearest.zone.weather, t * 0.1); // gradual per-frame blend
}
```

**Weather zones (`data/weather.js`):**

| Zone (worldX) | Weather | Mood |
|---|---|---|
| 0 (open road) | Clear, gentle breeze | Neutral cruise |
| 600 (school) | Light morning drizzle | Fresh, quiet start |
| 1800 (office) | Steady headwind | Grinding forward |
| 2800 (garage) | Electrical storm, lightning | Creative chaos |
| 3800 (court) | Perfect sunny breeze | Peak joy |
| 4800 (café) | Clearing up, golden rays | Open horizon |

**Cyclist weather reactions:**
- `rainIntensity > 0.4` → raincoat appears, visor down, hunched posture
- `windIntensity > 0.6` → lean into wind, scarf/hair blows back
- `lightningActive` → brief flinch, speed burst
- All clear → upright, relaxed, one hand off bars

### 5.5 DayNightCycle

`dayNightT` maps directly from `worldOffset / WORLD_WIDTH`. One full world loop = one full day. **DayNightCycle is the single source of truth for sky colors** — themes render the palette, they do not override it.

```js
// engine/DayNightCycle.js
const SKY_STOPS = [
  { t: 0.0, top: '#1a0a2e', bottom: '#ff6b3d' },  // dawn
  { t: 0.2, top: '#4a90d9', bottom: '#87ceeb' },  // morning
  { t: 0.4, top: '#1e90ff', bottom: '#87ceeb' },  // noon
  { t: 0.6, top: '#4a6fa5', bottom: '#d4a574' },  // afternoon
  { t: 0.8, top: '#2d1b4e', bottom: '#ff6347' },  // dusk
  { t: 1.0, top: '#0a0a1a', bottom: '#0d1117' },  // night
];

export function getPalette(t) {
  const i = findFloorIndex(SKY_STOPS, t);
  const localT = inverseLerp(SKY_STOPS[i].t, SKY_STOPS[i+1].t, t);
  return {
    top:    lerpColor(SKY_STOPS[i].top,    SKY_STOPS[i+1].top,    localT),
    bottom: lerpColor(SKY_STOPS[i].bottom, SKY_STOPS[i+1].bottom, localT),
  };
}
```

Each theme's `drawBackground` receives this palette and renders the sky in its own visual language — Lo-fi as gradient fill, Pixel as blocky pixel strips, Storybook as watercolour wash, Blueprint as grid overlay with coordinate labels.

**Star field:** visible when `dayNightT > 0.75`. 120 pre-seeded positions (seeded once at init, stored in a `Float32Array`). Alpha fades in with `mapRange(t, 0.75, 0.9, 0, 1)`. Twinkling via `sin(time * freq + phase)`.

**Sun/Moon:** drawn by each theme's `drawBackground`. Blueprint draws them as annotated circles with dimension lines. Pixel as chunky sprites. Storybook as illustrated characters. Lo-fi as soft glowing orbs.

### 5.6 LoopManager

When `worldOffset` wraps, layers tile automatically (see §6.2 caching). On each wrap event:

```js
// engine/LoopManager.js
let prevOffset = 0;

export function checkWrap(worldOffset) {
  // Detect forward wrap: was near end, now near start
  if (prevOffset > WORLD_WIDTH * 0.9 && worldOffset < WORLD_WIDTH * 0.1) {
    onWrap();
  }
  prevOffset = worldOffset;
}

function onWrap() {
  world.lap++;
  WeatherSystem.reset();
  triggerCyclistReaction('lapComplete'); // hands up for 500ms
  notifySubscribers(); // React components (StyleHUD) re-render with new lap count
}
```

A **lap counter** in `StyleHUD` shows `LAP 2`, `LAP 3` — a small delight for visitors who keep riding.

---

## 6. Canvas Architecture

### 6.1 Render Pipeline (per frame)

```js
// WorldCanvas.js — master rAF loop
function frame(time) {
  // — Timing —
  const dt = Math.min(time - lastTime, 50); // cap at 50ms (prevents physics explosion)
  lastTime = time;
  world.dt  = dt;
  world.fps = 1000 / dt;

  // — Pause when hidden —
  if (document.hidden) {
    requestAnimationFrame(frame);
    return;
  }

  // — Tick systems —
  ThemeEngine.tick(dt / 1000);
  WeatherSystem.resolveWeather(world.worldOffset);
  LoopManager.checkWrap(world.worldOffset);
  particles.update(dt / 1000);

  // — Update toggle object proximity —
  const toggleDist = wrappedDist(5400, world.worldOffset);
  world.toggleInteractState =
    toggleDist < 100 ? 'nearby' :
    toggleDist < 300 ? 'approaching' : 'idle';

  // — Early exit if nothing changed —
  if (
    Math.abs(world.worldSpeed) < 0.001 &&
    world.themeTransitionT >= 1.0 &&
    !particles.hasAlive() &&
    !world.weather.lightningActive &&
    !isDirty
  ) {
    requestAnimationFrame(frame);
    return;
  }

  // — Resolve interpolated theme —
  const colors     = ThemeEngine.getInterpolatedTheme();
  const skyPalette = DayNightCycle.getPalette(world.dayNightT);
  const theme      = THEMES[world.theme];

  // — Composite layers (back → front) —
  ctx.clearRect(0, 0, width, height);
  theme.drawBackground(ctx, skyPalette, world.dayNightT, world.worldOffset);
  drawMidground(ctx, colors, world.worldOffset);
  theme.drawRoad(ctx, world.worldOffset);
  drawBuildings(ctx, theme, world.worldOffset, world.activeBuilding, world.hoveredBuilding);
  theme.drawToggleObject(ctx, worldToScreen(5400, world.worldOffset, width), world.toggleInteractState);
  cyclist.draw(ctx, theme, world);
  theme.drawWeather(ctx, world.weather, dt / 1000);
  drawForeground(ctx, world.worldSpeed, world.weather);

  // — Destination theme announces its own arrival —
  if (world.themeTransitionT < 1.0) {
    theme.transitionIn(ctx, world.themeTransitionT);
  }

  isDirty = false;
  requestAnimationFrame(frame);
}
```

### 6.2 OffscreenCanvas Caching

Sky and far background are expensive per-frame. They change only when `dayNightT` shifts > 0.005 or theme changes. **Buffers are allocated once and reused** — no per-invalidation `new OffscreenCanvas`.

```js
// canvas/offscreen.js
let skyBuffer = null;
let skyCtx    = null;
let lastSkyT  = -1;
let lastTheme = null;

export function init(width, height) {
  skyBuffer = new OffscreenCanvas(width, height);
  skyCtx    = skyBuffer.getContext('2d');
}

export function resize(width, height) {
  skyBuffer.width  = width;
  skyBuffer.height = height;
  lastSkyT = -1; // force redraw on next frame
}

export function getSkyBuffer(width, height, palette, dayNightT, theme) {
  if (
    Math.abs(dayNightT - lastSkyT) < 0.005 &&
    theme.id === lastTheme
  ) return skyBuffer;

  // Reuse existing buffer — just clear and redraw
  skyCtx.clearRect(0, 0, width, height);
  theme.drawBackground(skyCtx, palette, dayNightT, 0);
  lastSkyT  = dayNightT;
  lastTheme = theme.id;
  return skyBuffer;
}
// Per frame: ctx.drawImage(getSkyBuffer(...), 0, 0)
```

Background tiles are `width × 3` wide. Seamless parallax via blit with modulo offset — no recompute on scroll.

### 6.3 Cyclist IK Rig (`cyclist.js`)

Drawn procedurally using bezier curves and arcs. No sprite sheets (except Pixel theme which overrides `drawCyclist` with its own 4-frame sprite).

**Joint tree computed from `pedalAngle`:**
```
hip (fixed pivot)
├── leftKnee → leftAnkle → leftPedal   (two-segment IK from pedal circle)
├── rightKnee → rightAnkle → rightPedal (IK, π offset)
├── spine → shoulder
│   ├── leftElbow → leftHand → handlebar
│   └── rightElbow → rightHand → handlebar
└── neck → head
```

```js
pedalAngle += world.worldSpeed * PEDAL_RATIO;
leftPedal  = { x: hip.x + CRANK * cos(pedalAngle),     y: hip.y + CRANK * sin(pedalAngle) };
rightPedal = { x: hip.x + CRANK * cos(pedalAngle + π), y: hip.y + CRANK * sin(pedalAngle + π) };
leftKnee   = twoSegmentIK(hip, leftPedal, THIGH, SHIN);
// mirror for right leg
```

**Two-segment IK solver:**

```js
function twoSegmentIK(root, target, lenA, lenB) {
  const dist = Math.hypot(target.x - root.x, target.y - root.y);
  const clampedDist = clamp(dist, Math.abs(lenA - lenB) + 0.01, lenA + lenB - 0.01);
  const angle = Math.atan2(target.y - root.y, target.x - root.x);
  const cosKnee = (lenA * lenA + clampedDist * clampedDist - lenB * lenB) / (2 * lenA * clampedDist);
  const kneeAngle = angle - Math.acos(clamp(cosKnee, -1, 1));
  return {
    x: root.x + lenA * Math.cos(kneeAngle),
    y: root.y + lenA * Math.sin(kneeAngle),
  };
}
```

**Reaction state machine:**

| Trigger | Pose | Duration |
|---|---|---|
| Near school | Sits up, looks around | hold in zone |
| Near office | Forward lean, strong cadence | hold in zone |
| Near garage | Aero tuck | hold in zone |
| Near court | Upright, one hand off bars | hold in zone |
| Building click | Braking — weight shifts back | until stopped |
| Hop off / Hop on | Walk / mount animation | 800ms / 600ms |
| Fast scroll | Sprint — head down, full lean | while fast |
| Reverse | Look back over shoulder | while reversing |
| Lap complete | Both hands up | 500ms |
| Rain zone | Raincoat, visor down, hunch | while raining |
| Wind zone | Lean into wind, scarf billows | while windy |

**Reaction priority** (highest wins): Building click > Hop off/on > Weather > Zone-based > Speed-based > Idle.

All pose transitions use `smoothstep` over 400ms.

### 6.4 Particle Pool (`particles.js`)

Zero-allocation `Float32Array` pool. Max 200 particles.

```js
const STRIDE = 10; // x, y, vx, vy, life, maxLife, size, type, r, g
const pool   = new Float32Array(200 * STRIDE);
let alive    = 0;

// Types: 0=dust, 1=rain, 2=wind_debris, 3=lightning, 4=blossom, 5=vector_arrow
// Dead particles compacted to back via swap — O(1) removal

function swap(indexA, indexB) {
  for (let j = 0; j < STRIDE; j++) {
    const a = indexA * STRIDE + j;
    const b = indexB * STRIDE + j;
    const tmp = pool[a];
    pool[a] = pool[b];
    pool[b] = tmp;
  }
}
```

Theme's `drawWeather` renders each type in its visual language — rain is `4×2px` blocks in Pixel, ink strokes in Storybook, velocity arrows in Blueprint.

---

## 7. UI Layer (React)

Canvas is `position: fixed, z-index: 0`. React components sit above it as normal HTML.

```
z-index stack:
  100  BuildingModal (slides in from right on building click)
   50  OnboardingHint (centered — fades out after first input)
   10  StyleHUD (corner — theme name + lap counter)
    5  SpeedHUD (optional speed indicator)
    0  <canvas> (the entire world)
```

`BuildingModal` re-skins automatically via CSS variables synced by `ThemeEngine`. Each section component renders inside the modal. The modal is focus-trapped while open; Escape closes it.

### 7.1 OnboardingHint

A first-visit prompt that tells the visitor how to interact. Disappears permanently after the first input event.

```
┌─────────────────────────────────┐
│                                 │
│    ← Scroll or drag to ride →   │    Centered on screen
│                                 │    Semi-transparent overlay
│    Click a building to explore  │    Uses --font-body, --color-text-muted
│                                 │
└─────────────────────────────────┘
```

**Implementation:**

```jsx
// components/OnboardingHint/index.jsx
function OnboardingHint() {
  const hasInteracted = useWorldState(s => s.hasInteracted);

  if (hasInteracted) return null;

  return (
    <div className={styles.hint} aria-hidden="true">
      <p className={styles.primary}>← Scroll or drag to ride →</p>
      <p className={styles.secondary}>Click a building to explore</p>
    </div>
  );
}
```

- `aria-hidden="true"` because it's a visual hint, not essential content
- Fades out via CSS transition when `hasInteracted` turns true
- On mobile, text reads "← Swipe to ride →" (detected via `matchMedia('(pointer: coarse)')`)

---

## 8. Style System

### 8.1 Base Design Tokens (`variables.css`)

Default tokens (Lo-fi theme). Overridden at runtime by `ThemeEngine.syncCSSVariables()`.

```css
:root {
  --color-bg:          #1a1625;
  --color-surface:     #2a2035;
  --color-text:        #e8d5b7;
  --color-text-muted:  #8a7a6a;
  --color-accent:      #f4a261;
  --color-accent-glow: rgba(244, 162, 97, 0.2);

  --font-display:      'Space Grotesk', sans-serif;
  --font-body:         'DM Sans', sans-serif;
  --font-mono:         'JetBrains Mono', monospace;

  --ease-out-expo:     cubic-bezier(0.16, 1, 0.3, 1);
  --ease-in-out-cubic: cubic-bezier(0.65, 0, 0.35, 1);
  --duration-fast:     200ms;
  --duration-normal:   500ms;
  --duration-slow:     1000ms;

  --max-width: 900px;
}

@media (prefers-reduced-motion: reduce) {
  :root {
    --duration-fast:   0ms;
    --duration-normal: 0ms;
    --duration-slow:   0ms;
  }
}
```

### 8.2 Per-Theme Font Tokens

Fonts snap at the start of the `transitionIn` animation (masked by it):

```css
[data-theme="pixel"]     { --font-display: 'Press Start 2P', monospace; --font-body: 'VT323', monospace; }
[data-theme="storybook"] { --font-display: 'Lora', serif;               --font-body: 'Nunito', sans-serif; }
[data-theme="lofi"]      { --font-display: 'Space Grotesk', sans-serif; --font-body: 'DM Sans', sans-serif; }
[data-theme="blueprint"] { --font-display: 'JetBrains Mono', monospace; --font-body: 'JetBrains Mono', monospace; }
```

### 8.3 Canvas LOD by Device

| LOD | Breakpoint | Background layers | Particles max | Cyclist | DPR cap |
|---|---|---|---|---|---|
| `high` | > 1024px | sky + far + mid | 200 | Full IK rig | 2 |
| `medium` | 640–1024px | sky + far | 100 | Full IK rig | 1.5 |
| `low` | < 640px | sky only | 50 | Simplified (no IK, basic shapes) | 1 |

LOD set once on mount via `matchMedia`, updated on resize.

---

## 9. Performance Strategy

| Technique | What it solves |
|---|---|
| OffscreenCanvas for sky + background | No per-frame recompute unless `dayNightT` changes meaningfully |
| OffscreenCanvas **reuse** (no re-allocation) | No GC pressure from buffer creation on invalidation |
| `Float32Array` particle pool | Zero GC pressure — no object allocation after init |
| Pointer Events with `setPointerCapture` | Unified input across mouse/touch/pen, no lost events on leave |
| `touch-action: none` on canvas | Prevents iOS/Android scroll bounce and pinch-zoom interference |
| EMA velocity smoothing (α=0.12) | Jitter-free cyclist lean and particle emission rate |
| Early rAF exit on idle | No GPU work when world is static and no particles alive |
| dt cap at 50ms | No physics explosion after tab switch |
| `document.hidden` check | Pauses rAF entirely when tab is backgrounded |
| CSS variable batch write | All token updates in one rAF callback — no layout thrash |
| `will-change: transform` | GPU layer for `BuildingModal` slide animation |
| DPR cap (LOD-based) | Prevents 3× retina fill rate from degrading perf |
| Font `display: swap` | No FOIT — text visible before fonts load |
| `prefers-reduced-motion` | Static canvas fallback, all transitions 0ms |
| Wrapping-aware distance (`wrappedDist`) | Correct weather/hit-test math at world boundaries |
| dt-scaled theme transitions | Consistent 1s transition duration regardless of frame rate |

**Target:** 60fps on a 2021 mid-range laptop (M1 MacBook Air, Intel i5-1135G7).

---

## 10. Accessibility

- `prefers-reduced-motion`: canvas shows a static scene (cyclist idle, no weather, no parallax). All CSS transitions disabled.
- Keyboard navigation: Tab reaches buildings via invisible focusable overlay `<button>` elements positioned over each building's screen location. Enter/Space opens modal. Arrow keys cycle between buildings.
- `BuildingModal`: focus-trapped while open. Escape closes. Focus returns to the building's overlay button on close.
- Semantic HTML inside all modal content (`<article>`, `<h2>`, etc.)
- WCAG AA contrast verified for all text on all four theme palettes.
- `aria-live="polite"` on `StyleHUD` — theme change and lap count announced to screen readers.
- Skip link: "Skip to content" visible on first Tab press. Jumps focus to the first building overlay button.
- `<canvas>` has `role="img"` and `aria-label` describing the cycling world.
- Onboarding hint is `aria-hidden="true"` (visual-only; screen reader users use keyboard nav).

---

## 11. GitHub Pages Deployment

### vite.config.js
```js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/aravind-portfolio/',
  build: {
    outDir: 'dist',
    assetsInlineLimit: 4096,
    rollupOptions: { output: { manualChunks: undefined } },
  },
});
```

### package.json scripts
```json
{
  "scripts": {
    "dev":       "vite",
    "build":     "vite build",
    "preview":   "vite preview",
    "predeploy": "npm run build",
    "deploy":    "gh-pages -d dist"
  }
}
```

### Deploy flow
```
npm run deploy
→ predeploy runs vite build → /dist (base: '/aravind-portfolio/')
→ gh-pages pushes /dist to gh-pages branch
→ Live at: https://<username>.github.io/aravind-portfolio/
```

### Optional CI/CD
```yaml
# .github/workflows/deploy.yml
name: Deploy to GitHub Pages
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm ci
      - run: npm run build
      - uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist
```

---

## 12. Build Plan

Sequenced to produce a testable, visible result at every step.

```
Phase 1 — Foundation
  [ ] Step 1:  Scaffold Vite + React
               - npm create vite, folder structure, global.css, variables.css
               - index.html with font preloads, OG tags, base path
               - global.css: canvas touch-action: none, user-select: none
               Output: blank page, correct Lo-fi fonts, dark background

  [ ] Step 2:  Engine layer
               - WorldState.js (plain object + subscribe/getSnapshot/notifySubscribers)
               - InputDriver.js (Pointer Events + wheel → worldSpeed + worldOffset)
               - useWorldState.js (useSyncExternalStore bridge)
               - utils/world.js (wrappedDist, worldToScreen, isOnScreen)
               - utils/math.js (lerp, clamp, mapRange, smoothstep, easeInOutCubic)
               Output: worldOffset updating in console on scroll/drag, works on mobile

  [ ] Step 3:  Canvas scaffolding
               - useCanvas.js (ref, context, DPR, resize, rAF)
               - WorldCanvas.js (fixed canvas, frame loop, layer stubs)
               - offscreen.js (buffer allocation, resize handler)
               Output: canvas fills screen, reacts to input events

Phase 2 — Canvas World
  [ ] Step 4:  Road + looping world
               - road.js (ground surface, road markings, parallax at 1.0×)
               - LoopManager.js (seamless offset wrap, lap detection)
               Output: road scrolls horizontally and loops seamlessly

  [ ] Step 5:  Sky + DayNightCycle
               - sky.js + DayNightCycle.js + offscreen.js caching (reuse buffers)
               - Star field (Float32Array, 120 pre-seeded positions)
               - Sun/moon arc
               Output: sky transitions dawn→noon→dusk→night as world advances

  [ ] Step 6:  Background + midground parallax
               - background.js (0.2×), midground.js (0.5×)
               Output: layered parallax depth behind the road

  [ ] Step 7:  Cyclist IK rig
               - cyclist.js (skeletal rig, two-segment IK solver, lean)
               - Pedal animation synced to worldSpeed
               Output: cyclist pedals with world speed, leans on fast input

  [ ] Step 8:  Buildings + hit detection
               - buildings.js layer (draw + wrapping-aware AABB hit test)
               - data/buildings.js registry (with height field)
               - Cursor state changes (grab/pointer)
               - Hover glow effect
               Output: buildings at correct positions, clickable, hover feedback

  [ ] Step 9:  Particles + weather
               - particles.js (Float32Array pool, swap compaction)
               - weather.js layer (rain, wind, lightning renderers)
               - WeatherSystem.js (zone proximity blend via wrappedDist)
               - utils/colors.js (lerpColor)
               Output: weather changes per zone, cyclist reacts

  [ ] Step 10: Foreground + speed effects
               - foreground.js (speed lines, debris, vignette)
               Output: speed lines on fast scroll, vignette always on

Phase 3 — Themes
  [ ] Step 11: Lo-fi theme (formalize as default)
               - canvas/themes/lofi.js (all draw overrides)
               - ThemeEngine.js (dt-scaled interpolation, CSS variable sync)
               - transitionIn: warm orange fade
               Output: Lo-fi world fully themed end-to-end

  [ ] Step 12: Pixel theme
               - canvas/themes/pixel.js (pixel grid snapping, 4-frame cyclist sprite)
               - transitionIn: CRT scanline wipe
               Output: toggle switches to Pixel world with CRT transition

  [ ] Step 13: Storybook theme
               - canvas/themes/storybook.js (wobbly beziers, hatching)
               - transitionIn: page-turn ink bleed
               Output: toggle switches to Storybook world

  [ ] Step 14: Blueprint theme
               - canvas/themes/blueprint.js (outline-only, grid, dimension arrows)
               - transitionIn: lines erase and redraw
               Output: toggle switches to Blueprint world

  [ ] Step 15: Diegetic toggle objects
               - toggleObject.js layer (per-theme world objects)
               - Toggle proximity detection (toggleInteractState in WorldState)
               - Interaction: approach → highlight → click → theme cycle
               Output: each theme has its own in-world toggle object

Phase 4 — Content
  [ ] Step 16: BuildingModal + building interaction
               - Cyclist brake → hop off → door open → modal slide in
               - BuildingModal component (focus trap, Escape close, themed via CSS vars)
               - Keyboard overlay buttons for building access
               Output: click any building, modal opens with placeholder content

  [ ] Step 17: Section content components
               - Education, Experience, Projects, Hobbies, Contact
               - Real content, re-skins per active theme via CSS variables
               Output: all 5 sections readable and styled per theme

Phase 5 — Polish
  [ ] Step 18: OnboardingHint + StyleHUD + SpeedHUD + lap counter
               - OnboardingHint (disappears on first input, mobile-adapted text)
               - StyleHUD (theme name + lap counter)
               - SpeedHUD (optional speed gauge)
               Output: subtle overlays, onboarding works, lap counter increments

  [ ] Step 19: Cyclist reaction poses
               - All zone-based + event-based reactions
               - Reaction priority system
               - Pose interpolation (smoothstep over 400ms)
               Output: cyclist reacts expressively to every zone and event

  [ ] Step 20: Responsive + reduced-motion pass
               - LOD switching (matchMedia), mobile-adapted onboarding text
               - Simplified cyclist for LOD 'low'
               - prefers-reduced-motion: static fallback (no rAF loop)
               - Keyboard a11y audit (Tab, Enter, Escape, Arrow keys)
               Output: works on phone, passes accessibility audit

  [ ] Step 21: GitHub Pages deploy
               - gh-pages setup, README, OG image
               Output: live at https://<username>.github.io/aravind-portfolio/
```

---

## 13. File Dependency Graph

```
main.jsx
  └── App.jsx
        │
        ├── engine/WorldState.js ◄─ engine/InputDriver.js
        │                        ◄─ engine/LoopManager.js
        │                        ◄─ engine/WeatherSystem.js  ◄─ data/weather.js
        │                        ◄─ engine/DayNightCycle.js
        │                        ◄─ engine/ThemeEngine.js    ◄─ canvas/themes/*
        │
        ├── canvas/WorldCanvas.js ◄─ hooks/useCanvas.js
        │     ├── canvas/layers/sky.js
        │     ├── canvas/layers/background.js
        │     ├── canvas/layers/midground.js
        │     ├── canvas/layers/road.js
        │     ├── canvas/layers/buildings.js   ◄─ data/buildings.js
        │     │                                ◄─ utils/world.js
        │     ├── canvas/layers/toggleObject.js
        │     ├── canvas/layers/weather.js
        │     ├── canvas/layers/foreground.js
        │     ├── canvas/cyclist.js
        │     ├── canvas/particles.js
        │     ├── canvas/offscreen.js
        │     └── canvas/themes/
        │           ├── lofi.js
        │           ├── pixel.js
        │           ├── storybook.js
        │           └── blueprint.js
        │
        ├── components/BuildingModal  ◄─ hooks/useWorldState
        │     └── components/sections/
        │           ├── Education.jsx
        │           ├── Experience.jsx  ◄─ data/milestones.js
        │           ├── Projects.jsx    ◄─ data/projects.js
        │           ├── Hobbies.jsx
        │           └── Contact.jsx
        │
        ├── components/OnboardingHint ◄─ hooks/useWorldState
        ├── components/StyleHUD       ◄─ hooks/useWorldState
        └── components/SpeedHUD       ◄─ hooks/useWorldState
```

No circular dependencies. State flows down. Canvas reads `WorldState` directly. React components subscribe via `useWorldState`. `ThemeEngine` writes CSS variables that canvas and DOM consume simultaneously. All world-space distance calculations go through `utils/world.js`.