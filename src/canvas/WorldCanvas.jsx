import { useEffect, useRef } from 'react';
import { useCanvas } from '../hooks/useCanvas';
import { world, notifySubscribers } from '../engine/WorldState';
import { init as initInput } from '../engine/InputDriver';
import { lerp } from '../utils/math';
import { WORLD_WIDTH } from '../constants';

export default function WorldCanvas() {
  const canvasRef = useRef(null);
  const { ctx, width, height } = useCanvas(canvasRef);

  // Wire up input
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    initInput(canvas);
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

      // Notify React subscribers
      notifySubscribers();

      // Clear
      ctx.clearRect(0, 0, width, height);

      // Sky placeholder (top 70%)
      ctx.fillStyle = '#1a1625';
      ctx.fillRect(0, 0, width, height);

      // Ground placeholder (bottom 30%)
      ctx.fillStyle = '#2a2035';
      ctx.fillRect(0, height * 0.7, width, height * 0.3);

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
