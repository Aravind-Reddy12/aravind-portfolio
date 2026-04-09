import { useEffect, useRef } from 'react';
import { useCanvas } from '../hooks/useCanvas';
import { world, notifySubscribers } from '../engine/WorldState';
import { init as initInput } from '../engine/InputDriver';
import { checkWrap } from '../engine/LoopManager';
import * as ThemeEngine from '../engine/ThemeEngine';
import { getPalette } from '../engine/DayNightCycle';
import { hitTestBuildings } from './layers/buildings';
import { BUILDINGS } from '../data/buildings';
import { worldToScreen, isOnScreen } from '../utils/world';
import { resolveWeather } from '../engine/WeatherSystem';
import { lerp } from '../utils/math';
import { WORLD_WIDTH } from '../constants';

const ROAD_Y_RATIO = 0.70;

export default function WorldCanvas() {
  const canvasRef = useRef(null);
  const { ctx, width, height } = useCanvas(canvasRef);

  // Wire up input — return cleanup so StrictMode double-mount doesn't stack listeners
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    return initInput(canvas);
  }, []);

  // Temporary keyboard shortcuts for theme testing (1 = lo-fi, 2 = pixel)
  useEffect(() => {
    function onKeyDown(e) {
      if (e.key === '1') ThemeEngine.setTheme('lofi');
      if (e.key === '2') ThemeEngine.setTheme('pixel');
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // Cursor + hover + click handling
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let dragging = false;

    function onPointerDown() { dragging = true; }
    function onPointerUp()   { dragging = false; }

    function onPointerMove(e) {
      const rect    = canvas.getBoundingClientRect();
      const mx      = e.clientX - rect.left;
      const my      = e.clientY - rect.top;
      const hit     = hitTestBuildings(mx, my, world.worldOffset, rect.width, rect.height);
      world.hoveredBuilding = hit ? hit.id : null;
      canvas.style.cursor   = hit ? 'pointer' : dragging ? 'grabbing' : 'grab';
    }

    function onClick(e) {
      const rect = canvas.getBoundingClientRect();
      const mx   = e.clientX - rect.left;
      const my   = e.clientY - rect.top;
      const hit  = hitTestBuildings(mx, my, world.worldOffset, rect.width, rect.height);
      if (!hit) return;
      if (hit.id === 'toggle') {
        console.log('Toggle clicked — theme switch coming later');
      } else if (hit.section) {
        world.activeBuilding = hit.id;
        console.log('Building clicked:', hit.id);
      }
    }

    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointerup',   onPointerUp);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('click',       onClick);

    return () => {
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointerup',   onPointerUp);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('click',       onClick);
    };
  }, []);

  // Master rAF loop
  useEffect(() => {
    if (!ctx || width === 0 || height === 0) return;

    ThemeEngine.init('lofi');

    let rafId;
    let lastTime = performance.now();

    function frame(now) {
      const dt = Math.min(now - lastTime, 50); // cap at 50ms
      lastTime = now;

      // Pause when tab is hidden
      if (document.hidden) {
        rafId = requestAnimationFrame(frame);
        return;
      }

      // Update timing
      world.dt  = dt;
      world.fps = 1000 / dt;

      // Smooth speed and advance world
      world.worldSpeed   = lerp(world.worldSpeed, world.targetSpeed, 0.12);
      world.worldOffset += world.worldSpeed * (dt / 16.67);
      world.worldOffset  = ((world.worldOffset % WORLD_WIDTH) + WORLD_WIDTH) % WORLD_WIDTH;
      world.dayNightT    = world.worldOffset / WORLD_WIDTH;

      // Wrap detection + lap counter
      checkWrap(world.worldOffset);

      // Weather blending
      resolveWeather(world.worldOffset);

      // Advance theme transition
      ThemeEngine.tick(dt / 1000);

      // Notify React subscribers
      notifySubscribers();

      // Active theme (has draw methods) + sky palette (DayNightCycle is source of truth)
      const theme      = ThemeEngine.getActiveTheme();
      const skyPalette = getPalette(world.dayNightT);
      const roadY      = height * ROAD_Y_RATIO;

      // Clear
      ctx.clearRect(0, 0, width, height);

      // Sky + far mountains (combined into drawBackground per architecture §4.1)
      theme.drawBackground(ctx, skyPalette, world.dayNightT, world.worldOffset, width, height);

      // Mid background — hills + trees (0.5× parallax)
      theme.drawMidground(ctx, world.worldOffset, world.dayNightT, width, height);

      // Road surface + dashes
      theme.drawRoad(ctx, world.worldOffset, width, height);

      // Buildings (1.0× parallax) — iterate, cull, draw per building
      for (const b of BUILDINGS) {
        if (!isOnScreen(b.worldX, b.width, world.worldOffset, width)) continue;
        const screenX  = worldToScreen(b.worldX, world.worldOffset, width);
        const isHovered = b.id === world.hoveredBuilding;
        const isActive  = b.id === world.activeBuilding;
        theme.drawBuilding(ctx, b, screenX, roadY, world.dayNightT, isHovered, isActive);
      }

      // Cyclist (fixed screen X)
      theme.drawCyclist(ctx, { world, width, height });

      // Weather particles + lightning + fog
      theme.drawWeather(ctx, world.weather, world.worldSpeed, dt / 1000, width, height);

      // Foreground — speed lines, dust, debris, vignette (frontmost)
      theme.drawForeground(ctx, world.worldSpeed, world.worldOffset, world.weather, width, height);

      // Theme transition overlay (runs during theme switch; lofi init sets T=1 so skipped)
      if (world.themeTransitionT < 1.0) {
        theme.transitionIn(ctx, world.themeTransitionT, width, height);
      }

      rafId = requestAnimationFrame(frame);
    }

    rafId = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(rafId);
  }, [ctx, width, height]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 0,
        display: 'block',
        touchAction: 'none',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        cursor: 'grab',
      }}
    />
  );
}
