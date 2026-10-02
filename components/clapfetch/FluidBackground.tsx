'use client';

import React from 'react';

/**
 * FluidBackground: Renders the fluid mixed pastel lavender, purple, and soft pink
 * organic wave flows matching the reference UI exactly.
 * Rendered at z-0 with smooth organic blurs so there are zero hard clipped edges.
 */
export function FluidBackground() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden select-none z-0 min-h-full">
      {/* ── Top-Left Sweeping Pastel Lavender / Violet Flow ── */}
      <div
        className="absolute -top-16 -left-20 w-[52vw] min-w-[520px] max-w-[920px] h-[700px] rounded-[45%_55%_60%_40%/50%_60%_40%_50%] blur-[60px] opacity-85"
        style={{
          background: 'radial-gradient(ellipse 70% 60% at 28% 28%, #DFBFF9 0%, #EBD5FB 38%, #F6EAFE 65%, transparent 100%)',
        }}
      />
      {/* Inner Richer Lavender Accent */}
      <div
        className="absolute top-12 -left-10 w-[38vw] min-w-[400px] max-w-[680px] h-[520px] rounded-[50%_50%_60%_40%/40%_50%_50%_60%] blur-[50px] opacity-75"
        style={{
          background: 'radial-gradient(ellipse 65% 55% at 32% 35%, #D4A3F7 0%, #E6C5FA 42%, transparent 85%)',
        }}
      />

      {/* ── Right-Side Sweeping Pastel Pink / Magenta / Violet Flow ── */}
      <div
        className="absolute top-[140px] -right-24 w-[56vw] min-w-[560px] max-w-[980px] h-[800px] rounded-[60%_40%_50%_50%/50%_40%_60%_50%] blur-[65px] opacity-85"
        style={{
          background: 'radial-gradient(ellipse 75% 65% at 72% 38%, #F7C0F7 0%, #F7D4F7 36%, #FAECFB 68%, transparent 100%)',
        }}
      />
      {/* Inner Richer Pink Accent */}
      <div
        className="absolute top-[260px] -right-12 w-[40vw] min-w-[420px] max-w-[720px] h-[580px] rounded-[55%_45%_45%_55%/45%_55%_55%_45%] blur-[55px] opacity-75"
        style={{
          background: 'radial-gradient(ellipse 65% 55% at 68% 45%, #ECAEEF 0%, #F5CEF6 45%, transparent 85%)',
        }}
      />

      {/* ── Top Header Subtle Center-Right Lavender Wash ── */}
      <div
        className="absolute -top-10 right-[18%] w-[480px] h-[260px] rounded-full blur-[55px] opacity-60"
        style={{
          background: 'radial-gradient(ellipse at 50% 25%, #E9D5FA 0%, #F5EAFD 52%, transparent 85%)',
        }}
      />
    </div>
  );
}
