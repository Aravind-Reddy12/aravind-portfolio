import { useEffect, useRef } from 'react';
import { useCanvas } from '../hooks/useCanvas';
import { world, notifySubscribers } from '../engine/WorldState';
import { init as initInput } from '../engine/InputDriver';
import { checkWrap } from '../engine/LoopManager';
import { drawSky } from './layers/sky';
import { drawBackground } from './layers/background';
import { drawMidground } from './layers/midground';
import { drawRoad } from './layers/road';
import { drawBuildings, hitTestBuildings } from './layers/buildings';
import { cyclist } from './cyclist';
import { drawWeather } from './layers/weather';
import { resolveWeather } from '../engine/WeatherSystem';
import { lerp } from '../utils/math';
import { WORLD_WIDTH } from '../constants';

export default function WorldCanvas() {
  const canvasRef = useRef(null);
  const { ctx, width, height } = useCanvas(canvasRef);

  // Wire up input — return cleanup so StrictMode double-mount doesn't stack listeners
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    return initInput(canvas);
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

      // Notify React subscribers
      notifySubscribers();

      // Clear
      ctx.clearRect(0, 0, width, height);

      // Sky layer (backmost)
      drawSky(ctx, width, height, world.dayNightT);

      // Far background — mountains + clouds (0.2× parallax)
      drawBackground(ctx, width, height, world.worldOffset, world.dayNightT);

      // Mid background — hills + trees (0.5× parallax)
      drawMidground(ctx, width, height, world.worldOffset, world.dayNightT);

      // Road layer (1.0× parallax)
      drawRoad(ctx, width, height, world.worldOffset);

      // Buildings (1.0× parallax, on the road)
      drawBuildings(ctx, width, height, world.worldOffset, world.activeBuilding, world.hoveredBuilding, world.dayNightT);

      // Cyclist (fixed screen X, on the road, in front of buildings)
      cyclist.draw(ctx, world, width, height);

      // Weather particles + lightning + fog (frontmost layer)
      drawWeather(ctx, width, height, world.weather, world.worldSpeed, dt / 1000);

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
