'use client';

/** Particles scattered across the auth page background */
const PARTICLES = [
  { x: '7%',  y: '14%', s: 2.5, delay: 0,    dur: 4.2 },
  { x: '91%', y: '9%',  s: 2,   delay: 0.8,  dur: 5.1 },
  { x: '18%', y: '70%', s: 2,   delay: 1.5,  dur: 5.8 },
  { x: '76%', y: '62%', s: 3,   delay: 0.3,  dur: 4.6 },
  { x: '44%', y: '87%', s: 2,   delay: 2.1,  dur: 5.4 },
  { x: '61%', y: '21%', s: 2.5, delay: 1.1,  dur: 3.9 },
  { x: '29%', y: '44%', s: 2,   delay: 0.6,  dur: 6.0 },
  { x: '84%', y: '38%', s: 2,   delay: 1.9,  dur: 4.7 },
  { x: '5%',  y: '54%', s: 2.5, delay: 2.6,  dur: 5.3 },
  { x: '53%', y: '11%', s: 2,   delay: 0.4,  dur: 4.3 },
  { x: '37%', y: '78%', s: 3,   delay: 1.7,  dur: 5.9 },
  { x: '68%', y: '48%', s: 2,   delay: 0.9,  dur: 4.1 },
];

/**
 * Pure-CSS animated background for the sign-in / sign-up pages.
 * Renders floating particles, a vertical scan line, and pulsing glow orbs.
 * No canvas, no JS animation loops — only keyframes defined in globals.css.
 */
export function AuthPageBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {/* Primary glow — top centre */}
      <div
        className="absolute -top-32 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-[#7456ff]/20 blur-[110px]"
        style={{ animation: 'auth-glow 6s ease-in-out infinite' }}
      />
      {/* Secondary glow — bottom right */}
      <div
        className="absolute -bottom-24 right-[-10%] h-72 w-72 rounded-full bg-[#8b74ff]/14 blur-[90px]"
        style={{ animation: 'auth-glow 8s ease-in-out infinite 2s' }}
      />
      {/* Tertiary glow — left mid */}
      <div
        className="absolute left-[-8%] top-1/2 h-56 w-56 -translate-y-1/2 rounded-full bg-sky-600/8 blur-[80px]"
        style={{ animation: 'auth-glow 7s ease-in-out infinite 1s' }}
      />

      {/* Dot grid */}
      <div
        className="absolute inset-0 opacity-[0.32]"
        style={{
          backgroundImage: 'radial-gradient(circle at center, #71717a 1px, transparent 1.05px)',
          backgroundSize: '30px 30px',
        }}
      />

      {/* Scan line */}
      <div
        className="absolute inset-x-0 h-px bg-gradient-to-r from-transparent via-[#7456ff]/70 to-transparent"
        style={{ animation: 'auth-scan 4.5s linear infinite', top: 0 }}
      />

      {/* Floating particles */}
      {PARTICLES.map((p, i) => (
        <div
          key={i}
          className="absolute rounded-full bg-[#9d88ff]"
          style={{
            left: p.x,
            top: p.y,
            width: p.s,
            height: p.s,
            animation: `auth-particle ${p.dur}s ease-in-out infinite`,
            animationDelay: `${p.delay}s`,
          }}
        />
      ))}
    </div>
  );
}
