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
    lastPointerX = e.clientX;                     // ← update every frame, not just on start
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
