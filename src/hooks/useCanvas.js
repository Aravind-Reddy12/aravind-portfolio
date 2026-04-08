import { useEffect, useRef, useState } from 'react';
import { world } from '../engine/WorldState';

function getLOD(viewportW) {
  if (viewportW > 1024) return { lod: 'high',   dprCap: 2   };
  if (viewportW >= 640) return { lod: 'medium', dprCap: 1.5 };
  return                       { lod: 'low',    dprCap: 1   };
}

export function useCanvas(canvasRef) {
  const [dims, setDims] = useState({ ctx: null, width: 0, height: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');

    function applySize() {
      const rect   = canvas.getBoundingClientRect();
      const w      = rect.width;
      const h      = rect.height;
      const { lod, dprCap } = getLOD(w);
      const dpr    = Math.min(window.devicePixelRatio || 1, dprCap);

      canvas.width  = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.scale(dpr, dpr);

      world.canvasLOD = lod;

      setDims({ ctx, width: w, height: h });
    }

    applySize();

    const observer = new ResizeObserver(applySize);
    observer.observe(canvas);

    return () => observer.disconnect();
  }, [canvasRef]);

  return dims;
}
