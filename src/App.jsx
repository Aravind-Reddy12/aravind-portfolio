import { useEffect, useRef } from 'react';
import { world, notifySubscribers } from './engine/WorldState';
import { init as initInput } from './engine/InputDriver';
import { useWorldState } from './hooks/useWorldState';
import { lerp } from './utils/math';
import { WORLD_WIDTH } from './constants';

export default function App() {
  const divRef = useRef(null);

  const offset = useWorldState((s) => s.worldOffset.toFixed(1));
  const speed  = useWorldState((s) => s.worldSpeed.toFixed(3));

  useEffect(() => {
    const el = divRef.current;
    if (!el) return;

    initInput(el);

    let rafId;
    let lastTime = performance.now();

    function loop(now) {
      const dt = Math.min(now - lastTime, 50);
      lastTime = now;
      world.dt = dt;

      world.worldSpeed   = lerp(world.worldSpeed, world.targetSpeed, 0.12);
      world.worldOffset += world.worldSpeed * (dt / 16.67);
      world.worldOffset  = ((world.worldOffset % WORLD_WIDTH) + WORLD_WIDTH) % WORLD_WIDTH;
      world.dayNightT    = world.worldOffset / WORLD_WIDTH;

      notifySubscribers();
      rafId = requestAnimationFrame(loop);
    }

    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, []);

  return (
    <div
      ref={divRef}
      style={{
        width: '100vw',
        height: '100vh',
        background: 'var(--color-bg)',
        cursor: 'grab',
        touchAction: 'none',
        userSelect: 'none',
      }}
    >
      <div
        style={{
          position: 'fixed',
          bottom: 16,
          left: 16,
          fontFamily: 'var(--font-mono)',
          fontSize: 12,
          color: 'var(--color-text-muted)',
          lineHeight: 1.6,
        }}
      >
        <div>offset: {offset}</div>
        <div>speed:  {speed}</div>
      </div>
    </div>
  );
}
