'use client';

import React, { useEffect, useRef } from 'react';

const CHARSET =
  'ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂ0123456789ABCDEFﾝﾘﾜﾞﾟ';

/** Canvas “digital rain” for empty preview (reference-style matrix veil). */
export function MatrixBackdrop() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const cell = 15;
    let cols = 0;
    let heads: Float64Array | null = null;
    let speeds: Float64Array | null = null;
    let animationId = 0;

    const layout = () => {
      const dpr = Math.min(typeof window !== 'undefined' ? window.devicePixelRatio : 1, 2);
      const { width, height } = wrap.getBoundingClientRect();
      const cw = Math.max(80, Math.floor(width));
      const ch = Math.max(80, Math.floor(height));
      canvas.width = Math.floor(cw * dpr);
      canvas.height = Math.floor(ch * dpr);
      canvas.style.width = `${cw}px`;
      canvas.style.height = `${ch}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cols = Math.max(12, Math.floor(cw / cell));
      heads = new Float64Array(cols);
      speeds = new Float64Array(cols);
      for (let i = 0; i < cols; i++) {
        heads[i] = -(Math.random() * ch + 72);
        speeds[i] = 0.92 + Math.random() * 1.25 + ((i % 4) / 13);
      }
    };

    const tick = () => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (!heads || !speeds || cols <= 1) {
        animationId = requestAnimationFrame(tick);
        return;
      }

      ctx.fillStyle = 'rgba(7, 8, 12, 0.21)';
      ctx.fillRect(0, 0, w, h);
      ctx.textBaseline = 'top';
      ctx.font = `${cell - 2}px ui-monospace, "JetBrains Mono", "IBM Plex Mono", monospace`;

      for (let i = 0; i < cols; i++) {
        const x = Math.floor(i * cell);
        const yHead = heads[i];
        const trail = 8 + ((i * 17) % 9);

        for (let k = 0; k < trail; k++) {
          const py = Math.floor(yHead - k * cell);
          if (py < -cell || py > h) continue;
          const char = CHARSET[((i * 83 + py * 37 + k * 19) >>> 3) % CHARSET.length];
          if (k === 0) {
            ctx.shadowBlur = 12;
            ctx.shadowColor = 'rgba(110,231,183,0.45)';
            ctx.fillStyle = 'rgba(236,253,245,0.98)';
          } else {
            ctx.shadowBlur = 0;
            const fade = Math.max(0.04, 0.58 - k * 0.042 - (i % 5) * 0.015);
            ctx.fillStyle = `rgba(74,222,128,${fade})`;
          }
          ctx.fillText(char, x + 2, py);
        }

        heads[i] += speeds[i];
        if (yHead - trail * cell > h + cell * 10) heads[i] = -(Math.random() * h + 96);
      }

      ctx.shadowBlur = 0;
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, 'rgba(4,6,11,0.38)');
      g.addColorStop(0.42, 'rgba(4,7,11,0)');
      g.addColorStop(0.68, 'rgba(4,6,12,0.12)');
      g.addColorStop(1, 'rgba(5,6,13,0.58)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);

      animationId = requestAnimationFrame(tick);
    };

    layout();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => layout()) : null;
    ro?.observe(wrap);
    window.addEventListener('resize', layout);

    animationId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', layout);
      ro?.disconnect();
    };
  }, []);

  return (
    <div ref={wrapRef} className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <canvas
        ref={canvasRef}
        className="h-full w-full opacity-[0.9]"
        style={{ mixBlendMode: 'screen' }}
      />
    </div>
  );
}
