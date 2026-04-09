import { drawSky } from '../layers/sky';
import { drawBackground } from '../layers/background';
import { drawMidground } from '../layers/midground';
import { drawRoadLayer } from '../layers/road';
import { drawSingleBuilding } from '../layers/buildings';
import { cyclist } from '../cyclist';
import { drawWeather } from '../layers/weather';
import { drawForeground } from '../layers/foreground';
import { easeInOutCubic } from '../../utils/math';

export const lofiTheme = {
  id: 'lofi',
  label: 'Lo-fi',

  palette: {
    ground:         '#2a2035',
    road:           '#1e1a2e',
    roadLine:       '#f4a261',
    accent:         '#f4a261',
    accentDim:      '#a0622a',
    text:           '#e8d5b7',
    textMuted:      '#8a7a6a',
    bg:             '#1a1625',
    surface:        '#2a2035',
    buildingFill:   '#2d2545',
    buildingStroke: '#f4a261',
    particleTint:   '#f4a261',
    jerseyFill:     '#2d2545',
    jerseyStroke:   '#f4a261',
  },

  fonts: {
    '--font-display': "'Space Grotesk', sans-serif",
    '--font-body':    "'DM Sans', sans-serif",
  },

  // Sky gradient + sun/moon + stars, then far mountains + clouds
  // skyPalette = { top, bottom } from DayNightCycle (single source of truth)
  drawBackground(ctx, skyPalette, dayNightT, worldOffset, width, height) {
    drawSky(ctx, width, height, dayNightT, skyPalette);
    drawBackground(ctx, width, height, worldOffset, dayNightT);
  },

  drawMidground(ctx, worldOffset, dayNightT, width, height) {
    drawMidground(ctx, width, height, worldOffset, dayNightT);
  },

  drawRoad(ctx, worldOffset, width, height) {
    drawRoadLayer(ctx, width, height, worldOffset, this.palette);
  },

  // Called per visible building. Drawing shape + label in Lo-fi style.
  drawBuilding(ctx, building, screenX, baseY, dayNightT, isHovered, isActive) {
    drawSingleBuilding(ctx, building, screenX, baseY, dayNightT, isHovered, isActive);

    // Label — lo-fi style: warm text, subtle alpha
    const night = dayNightT > 0.7;
    ctx.fillStyle    = night ? '#e8d5b7a0' : '#e8d5b760';
    ctx.font         = '11px sans-serif';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(building.label, screenX + building.width / 2, baseY + 6);
  },

  // cyclistState = { world, width, height }
  drawCyclist(ctx, cyclistState) {
    cyclist.draw(ctx, cyclistState.world, cyclistState.width, cyclistState.height);
  },

  drawWeather(ctx, weather, worldSpeed, dt, width, height) {
    drawWeather(ctx, width, height, weather, worldSpeed, dt);
  },

  drawForeground(ctx, worldSpeed, worldOffset, weather, width, height) {
    drawForeground(ctx, width, height, worldSpeed, worldOffset, weather);
  },

  // Vinyl record player stall — rendered as part of drawBuilding (toggle id).
  // This stub exists for themes that want a standalone toggle object draw pass.
  drawToggleObject(ctx, screenX, baseY, interactionState) {
    // Lo-fi toggle is handled by drawBuilding (building.id === 'toggle').
  },

  // Warm orange fade-in: alpha 1→0 as progress 0→1
  transitionIn(ctx, progress, width, height) {
    const eased = easeInOutCubic(progress);
    const a = 1.0 - eased;
    ctx.fillStyle = `rgba(244, 162, 97, ${a})`;
    ctx.fillRect(0, 0, width, height);
  },
};
