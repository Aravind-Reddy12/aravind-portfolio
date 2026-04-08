import { world } from './WorldState';
import { clamp } from '../utils/math';

export function init(canvas) {
  let lastPointerX = null;
  let isDragging   = false;

  // — Wheel (desktop) —
  function onWheel(e) {
    e.preventDefault();
    world.targetSpeed = clamp(world.targetSpeed + e.deltaY * 0.01, -1, 1);
    world.hasInteracted = true;
  }

  // — Pointer drag (mouse + touch + pen via Pointer Events API) —
  function onPointerDown(e) {
    canvas.setPointerCapture(e.pointerId);
    lastPointerX = e.clientX;
    isDragging = true;
  }

  function onPointerMove(e) {
    if (!isDragging || lastPointerX === null) return;
    const dx = e.clientX - lastPointerX;
    lastPointerX = e.clientX;                      // ← update every frame, not just on start
    world.targetSpeed = clamp(-dx * 0.05, -1, 1); // drag left → positive speed → world advances
    world.hasInteracted = true;
  }

  function onPointerUp(e) {
    canvas.releasePointerCapture(e.pointerId);
    lastPointerX = null;
    isDragging = false;
    world.targetSpeed = 0; // release → decelerate to idle
  }

  canvas.addEventListener('wheel',        onWheel,       { passive: false });
  canvas.addEventListener('pointerdown',  onPointerDown);
  canvas.addEventListener('pointermove',  onPointerMove);
  canvas.addEventListener('pointerup',    onPointerUp);
  canvas.addEventListener('pointercancel', onPointerUp);

  // Return cleanup so callers can remove listeners (critical for React StrictMode)
  return function cleanup() {
    canvas.removeEventListener('wheel',        onWheel);
    canvas.removeEventListener('pointerdown',  onPointerDown);
    canvas.removeEventListener('pointermove',  onPointerMove);
    canvas.removeEventListener('pointerup',    onPointerUp);
    canvas.removeEventListener('pointercancel', onPointerUp);
  };
}
