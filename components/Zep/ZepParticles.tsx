'use client';

import React, { useEffect, useRef, useCallback } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  alpha: number;
  decay: number;
  color: string;
  pulsePhase: number;
  pulseSpeed: number;
}

interface ZepParticlesProps {
  isDark: boolean;
  state: 'idle' | 'listening' | 'thinking' | 'speaking' | 'processing';
  isHovered: boolean;
  size?: number;
}

export function ZepParticles({ isDark, state, isHovered, size = 56 }: ZepParticlesProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animationRef = useRef<number>(0);
  const stateRef = useRef(state);
  const hoveredRef = useRef(isHovered);

  // Update refs for animation loop
  useEffect(() => { stateRef.current = state; }, [state]);
  useEffect(() => { hoveredRef.current = isHovered; }, [isHovered]);

  const createParticle = useCallback((centerX: number, centerY: number, isCore: boolean = false): Particle => {
    const angle = Math.random() * Math.PI * 2;
    const distance = isCore ? Math.random() * 15 + 5 : Math.random() * 25 + 20;
    const speed = state === 'speaking' ? 0.8 : state === 'listening' ? 0.4 : 0.2;
    
    const colors = isDark
      ? ['#6ee7b7', '#34d399', '#10b981', '#059669']
      : ['#059669', '#10b981', '#34d399', '#6ee7b7'];
    
    const stateColors: Record<string, string[]> = {
      idle: isDark ? ['#6b7280', '#9ca3af', '#4b5563'] : ['#9ca3af', '#d1d5db', '#6b7280'],
      listening: isDark ? ['#fbbf24', '#f59e0b', '#d97706'] : ['#f59e0b', '#fbbf24', '#fcd34d'],
      thinking: isDark ? ['#a78bfa', '#8b5cf6', '#7c3aed'] : ['#8b5cf6', '#a78bfa', '#c4b5fd'],
      speaking: isDark ? ['#6ee7b7', '#34d399', '#10b981'] : ['#10b981', '#34d399', '#6ee7b7'],
      processing: isDark ? ['#60a5fa', '#3b82f6', '#2563eb'] : ['#3b82f6', '#60a5fa', '#93c5fd'],
    };

    const stateColor = stateColors[stateRef.current] || colors;
    
    return {
      x: centerX + Math.cos(angle) * distance,
      y: centerY + Math.sin(angle) * distance,
      vx: Math.cos(angle + Math.PI / 2) * speed * (Math.random() * 0.5 + 0.5),
      vy: Math.sin(angle + Math.PI / 2) * speed * (Math.random() * 0.5 + 0.5),
      radius: Math.random() * 2 + (isCore ? 2 : 1),
      alpha: Math.random() * 0.6 + 0.4,
      decay: Math.random() * 0.005 + 0.002,
      color: stateColor[Math.floor(Math.random() * stateColor.length)],
      pulsePhase: Math.random() * Math.PI * 2,
      pulseSpeed: Math.random() * 0.05 + 0.02,
    };
  }, [isDark, state]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio : 1;
    const displaySize = size + 40; // Extra space for particles
    
    canvas.width = displaySize * dpr;
    canvas.height = displaySize * dpr;
    canvas.style.width = `${displaySize}px`;
    canvas.style.height = `${displaySize}px`;
    ctx.scale(dpr, dpr);

    const centerX = displaySize / 2;
    const centerY = displaySize / 2;

    // Initialize particles
    particlesRef.current = [];
    for (let i = 0; i < 20; i++) {
      particlesRef.current.push(createParticle(centerX, centerY, i < 5));
    }

    const animate = () => {
      ctx.clearRect(0, 0, displaySize, displaySize);

      const centerX = displaySize / 2;
      const centerY = displaySize / 2;
      const coreRadius = size / 2;

      // Draw glowing core
      const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, coreRadius);
      if (isDark) {
        gradient.addColorStop(0, stateRef.current === 'speaking' ? 'rgba(110,231,183,0.3)' : 'rgba(107,114,128,0.2)');
        gradient.addColorStop(0.5, stateRef.current === 'listening' ? 'rgba(251,191,36,0.15)' : 'rgba(75,85,99,0.1)');
        gradient.addColorStop(1, 'rgba(0,0,0,0)');
      } else {
        gradient.addColorStop(0, stateRef.current === 'speaking' ? 'rgba(16,185,129,0.2)' : 'rgba(156,163,175,0.15)');
        gradient.addColorStop(0.5, stateRef.current === 'listening' ? 'rgba(245,158,11,0.1)' : 'rgba(209,213,219,0.08)');
        gradient.addColorStop(1, 'rgba(0,0,0,0)');
      }

      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, displaySize, displaySize);

      // Draw core circle with pulse
      const pulse = Math.sin(Date.now() * 0.003) * 2;
      const pulseScale = hoveredRef.current ? 1.1 : 1;
      
      ctx.beginPath();
      ctx.arc(centerX, centerY, (coreRadius - 4) * pulseScale + pulse, 0, Math.PI * 2);
      ctx.fillStyle = isDark 
        ? stateRef.current === 'speaking' ? 'rgba(110,231,183,0.15)' : 'rgba(75,85,99,0.3)'
        : stateRef.current === 'speaking' ? 'rgba(16,185,129,0.1)' : 'rgba(209,213,219,0.4)';
      ctx.fill();

      // Draw particles
      particlesRef.current.forEach((particle, i) => {
        // Update position
        particle.pulsePhase += particle.pulseSpeed;
        const orbitRadius = hoveredRef.current ? 35 : 28;
        const breathe = Math.sin(particle.pulsePhase) * 5;
        
        particle.x += particle.vx + Math.cos(particle.pulsePhase) * 0.3;
        particle.y += particle.vy + Math.sin(particle.pulsePhase) * 0.3;

        // Wrap around center
        const dx = particle.x - centerX;
        const dy = particle.y - centerY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist > orbitRadius + breathe || dist < 8) {
          const angle = Math.atan2(dy, dx);
          particle.x = centerX + Math.cos(angle) * (15 + Math.random() * 15);
          particle.y = centerY + Math.sin(angle) * (15 + Math.random() * 15);
          particle.vx = Math.cos(angle + Math.PI / 2) * 0.3;
          particle.vy = Math.sin(angle + Math.PI / 2) * 0.3;
        }

        // Draw particle
        const alpha = particle.alpha * (0.7 + Math.sin(particle.pulsePhase) * 0.3);
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
        ctx.fillStyle = particle.color + Math.floor(alpha * 255).toString(16).padStart(2, '0');
        ctx.fill();

        // Draw connection to center for core particles
        if (i < 5 && stateRef.current !== 'idle') {
          ctx.beginPath();
          ctx.moveTo(centerX, centerY);
          ctx.lineTo(particle.x, particle.y);
          ctx.strokeStyle = particle.color + '20';
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      });

      // Draw state indicator ring
      if (stateRef.current !== 'idle') {
        ctx.beginPath();
        ctx.arc(centerX, centerY, coreRadius - 2, 0, Math.PI * 2);
        ctx.strokeStyle = stateRef.current === 'listening' 
          ? 'rgba(251,191,36,0.6)' 
          : stateRef.current === 'speaking'
            ? 'rgba(110,231,183,0.6)'
            : 'rgba(139,92,246,0.6)';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.rotate(Date.now() * 0.001);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationRef.current);
    };
  }, [createParticle, isDark, size]);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 -m-5"
      style={{ width: size + 40, height: size + 40 }}
    />
  );
}
