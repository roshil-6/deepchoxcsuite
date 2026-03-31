'use client';

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { ArrowRight, Mail, Lock, User, Shield } from 'lucide-react';

interface LandingPageProps {
    onStart: () => void;
}

/** Regular octagon vertices (flat top), angle index 0 at top */
function octagonVertices(cx: number, cy: number, r: number): [number, number][] {
    const pts: [number, number][] = [];
    for (let i = 0; i < 8; i++) {
        const a = -Math.PI / 2 + (i * Math.PI) / 4;
        pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
    }
    return pts;
}

/** Complex octagonal wireframe lattice (replaces legacy green “Nexus wheel”) — same reveal pipeline */
function drawOctagonalWireLattice(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    outerR: number,
    voidR: number,
    rgbaLine: string,
    lineWidth: number
) {
    ctx.strokeStyle = rgbaLine;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const rings: number[] = [];
    const steps = [1, 0.84, 0.68, 0.52, 0.36, 0.24];
    for (const t of steps) {
        const r = outerR * t;
        if (r > voidR * 1.06) rings.push(r);
    }

    for (const r of rings) {
        const v = octagonVertices(cx, cy, r);
        ctx.beginPath();
        ctx.moveTo(v[0][0], v[0][1]);
        for (let i = 1; i < 8; i++) ctx.lineTo(v[i][0], v[i][1]);
        ctx.closePath();
        ctx.stroke();
    }

    for (let k = 0; k < 8; k++) {
        const a = -Math.PI / 2 + (k * Math.PI) / 4;
        ctx.beginPath();
        for (let i = 0; i < rings.length; i++) {
            const r = rings[i];
            const x = cx + r * Math.cos(a);
            const y = cy + r * Math.sin(a);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.stroke();
    }

    for (let k = 0; k < 8; k++) {
        const k2 = (k + 2) % 8;
        for (let ri = 0; ri < rings.length - 1; ri++) {
            const r1 = rings[ri];
            const r2 = rings[ri + 1];
            const a1 = -Math.PI / 2 + (k * Math.PI) / 4;
            const a2 = -Math.PI / 2 + (k2 * Math.PI) / 4;
            ctx.beginPath();
            ctx.moveTo(cx + r1 * Math.cos(a1), cy + r1 * Math.sin(a1));
            ctx.lineTo(cx + r2 * Math.cos(a2), cy + r2 * Math.sin(a2));
            ctx.stroke();
        }
    }

    for (let k = 0; k < 8; k++) {
        const kp = (k + 1) % 8;
        for (let ri = 0; ri < rings.length - 1; ri++) {
            const r1 = rings[ri];
            const r2 = rings[ri + 1];
            const a1 = -Math.PI / 2 + (k * Math.PI) / 4;
            const a2 = -Math.PI / 2 + (kp * Math.PI) / 4;
            ctx.beginPath();
            ctx.moveTo(cx + r1 * Math.cos(a1), cy + r1 * Math.sin(a1));
            ctx.lineTo(cx + r2 * Math.cos(a2), cy + r2 * Math.sin(a2));
            ctx.stroke();
        }
    }
}

// Ambient particles + interactive octagonal lattice reveal (mouse spotlight)
function TealParticles() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const mouseRef = useRef({ x: 0, y: 0, radius: 250, active: false });

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        interface Particle {
            x: number;
            y: number;
            vx: number;
            vy: number;
            baseX: number;
            baseY: number;
            size: number;
            opacity: number;
        }


        const particles: Particle[] = [];


        // Create particles
        for (let i = 0; i < 70; i++) {
            const x = Math.random() * canvas.width;
            const y = Math.random() * canvas.height;
            particles.push({
                x, y,
                vx: (Math.random() - 0.5) * 0.4,
                vy: (Math.random() - 0.5) * 0.4,
                baseX: x,
                baseY: y,
                size: Math.random() * 2 + 0.8,
                opacity: Math.random() * 0.3 + 0.2
            });
        }


        const handleMouseMove = (e: MouseEvent) => {
            mouseRef.current.x = e.clientX;
            mouseRef.current.y = e.clientY;
            mouseRef.current.active = true;
        };

        const handleTouchMove = (e: TouchEvent) => {
            if (e.touches.length > 0) {
                mouseRef.current.x = e.touches[0].clientX;
                mouseRef.current.y = e.touches[0].clientY;
                mouseRef.current.active = true;
            }
        };

        const handleTouchEnd = () => {
            mouseRef.current.active = false;
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('touchmove', handleTouchMove);
        window.addEventListener('touchend', handleTouchEnd);
        window.addEventListener('touchstart', handleTouchMove);

        let time = 0;
        let nexusAlpha = 0;

        function animate() {
            if (!ctx || !canvas) return;

            ctx.clearRect(0, 0, canvas.width, canvas.height);
            const mouse = mouseRef.current;
            time += 0.01;

            // Update Nexus Visibility - Strictly gated to sensing
            if (mouse.active) {
                nexusAlpha = Math.min(0.98, nexusAlpha + 0.045);
            } else {
                nexusAlpha = Math.max(0, nexusAlpha - 0.018);
            }

            // 0. Octagonal wireframe lattice — same mouse spotlight reveal as legacy green “Nexus”
            if (nexusAlpha > 0) {
                const centerX = canvas.width / 2;
                const centerY = canvas.height / 2;
                const coreRadius = 520;
                const outerR = coreRadius - 10;
                const voidR = 118;
                const lineBlue = `rgba(112, 197, 232, ${nexusAlpha})`;

                ctx.save();

                const outer = octagonVertices(centerX, centerY, outerR);
                ctx.beginPath();
                ctx.moveTo(outer[0][0], outer[0][1]);
                for (let i = 1; i < 8; i++) ctx.lineTo(outer[i][0], outer[i][1]);
                ctx.closePath();
                ctx.clip();

                ctx.save();

                drawOctagonalWireLattice(ctx, centerX, centerY, outerR, voidR, lineBlue, 2.5);

                ctx.globalCompositeOperation = 'destination-in';
                const revealRadius = 450;
                const revealGradient = ctx.createRadialGradient(
                    mouse.x,
                    mouse.y,
                    50,
                    mouse.x,
                    mouse.y,
                    revealRadius
                );
                revealGradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
                revealGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
                ctx.fillStyle = revealGradient;
                ctx.fillRect(0, 0, canvas.width, canvas.height);

                ctx.restore();
                ctx.restore();
            }

            // 1. Process Particles (Ambient Background Layer - Vortex Physics)
            particles.forEach(p => {
                const dx = mouse.x - p.x;
                const dy = mouse.y - p.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                // Particles react with a swirling/vortex motion
                if (dist < 250 && mouse.active) {
                    const force = (250 - dist) / 250;
                    const angle = Math.atan2(dy, dx);

                    // Repulsive force
                    p.vx -= Math.cos(angle) * force * 0.2;
                    p.vy -= Math.sin(angle) * force * 0.2;

                    // Tangential force (Vortex) - Circular way
                    const swirlSpeed = 0.8;
                    p.vx += Math.sin(angle) * force * swirlSpeed;
                    p.vy -= Math.cos(angle) * force * swirlSpeed;
                }

                // Spring back & Viscosity
                p.vx += (p.baseX - p.x) * 0.005;
                p.vy += (p.baseY - p.y) * 0.005;
                p.vx *= 0.94;
                p.vy *= 0.94;
                p.x += p.vx;
                p.y += p.vy;

                // Draw Particles as subtle white ambient dust
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size * 0.7, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(255, 255, 255, ${p.opacity * 0.58})`;
                ctx.fill();
            });


            // 3. Layer Separation confirmed (No interaction between layers)

            requestAnimationFrame(animate);
        }

        animate();

        const handleResize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            particles.forEach(p => {
                p.baseX = Math.random() * canvas.width;
                p.baseY = Math.random() * canvas.height;
            });
        };

        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('touchmove', handleTouchMove);
            window.removeEventListener('touchend', handleTouchEnd);
            window.removeEventListener('touchstart', handleTouchMove);
        };
    }, []);

    return <canvas ref={canvasRef} className="absolute inset-0 z-0 pointer-events-none" />;
}


export function LandingPage({ onStart }: LandingPageProps) {
    const [isVisible, setIsVisible] = useState(false);
    const [signupOpen, setSignupOpen] = useState(false);
    const [signupEmail, setSignupEmail] = useState('');
    const [signupUsername, setSignupUsername] = useState('');
    const [signupPassword, setSignupPassword] = useState('');
    const [signupSubmitted, setSignupSubmitted] = useState(false);

    useEffect(() => {
        setIsVisible(true);
    }, []);

    useEffect(() => {
        if (!signupOpen) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setSignupOpen(false);
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [signupOpen]);

    const handleSignupSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!signupEmail.trim() || !signupUsername.trim() || !signupPassword.trim()) return;
        setSignupSubmitted(true);
    };

    const continueAsGuest = () => {
        setSignupOpen(false);
        onStart();
    };

    return (
        <div className="relative z-[100] min-h-screen bg-[#030304] text-white">
            {/* Canvas lattice + stronger field (dots & glow read more clearly) */}
            <div className="pointer-events-none absolute inset-0 z-0">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_88%_68%_at_50%_32%,#101014_0%,#050506_42%,#000000_100%)]" />
                {/* Dot field — reads clearly under canvas; not as flat black */}
                <div
                    className="absolute inset-0 opacity-[0.68]"
                    style={{
                        backgroundImage: 'radial-gradient(circle at center, #71717a 1px, transparent 1.05px)',
                        backgroundSize: '28px 28px',
                    }}
                />
                <div className="absolute inset-0 overflow-hidden">
                    <div className="absolute -left-[15%] top-[5%] h-[min(560px,75vh)] w-[min(560px,75vw)] rounded-full bg-violet-800/48 blur-[110px]" />
                    <div className="absolute -right-[10%] bottom-[0%] h-[min(480px,60vh)] w-[min(480px,60vw)] rounded-full bg-sky-900/42 blur-[100px]" />
                    <div className="absolute left-1/2 top-[60%] h-[40vh] w-[80%] -translate-x-1/2 rounded-full bg-zinc-700/22 blur-[80px]" />
                </div>
                <TealParticles />
            </div>

            <div
                className={`relative z-10 mx-auto flex min-h-screen w-full max-w-[1280px] flex-col px-0 font-sans transition-all duration-700 ease-out ${
                    isVisible ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'
                }`}
            >
                {/* Top bar — legible on busy bg */}
                <header className="sticky top-0 z-30 bg-transparent">
                    <div className="mx-auto flex max-w-[1280px] flex-wrap items-start justify-between gap-x-6 gap-y-4 px-5 py-5 sm:px-8 sm:py-7 lg:px-12">
                        <div className="min-w-0 flex-1 sm:flex-initial [text-shadow:0_2px_28px_rgba(0,0,0,0.85)]">
                            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                                <span className="font-serif text-[26px] font-semibold tracking-[0.04em] text-white sm:text-[32px]">DeepChox</span>
                                <span className="rounded-sm border border-zinc-500/80 bg-black/20 px-2 py-0.5 font-sans text-[11px] font-bold uppercase tracking-[0.14em] text-zinc-300">
                                    Beta
                                </span>
                            </div>
                            <p className="mt-2 max-w-[min(100%,28rem)] font-sans text-[16px] font-medium leading-snug text-zinc-300 sm:max-w-[30rem] sm:text-[17px] sm:leading-relaxed">
                                Strategy, desks, and AI—together in one workspace.
                            </p>
                        </div>
                        <nav
                            className="flex w-full flex-wrap items-center justify-end gap-x-1 gap-y-2 sm:w-auto sm:gap-x-2 md:gap-x-3 [text-shadow:0_2px_24px_rgba(0,0,0,0.85)]"
                            aria-label="Primary"
                        >
                            <Link
                                href="/guide"
                                className="hidden rounded-md px-3 py-2.5 font-sans text-[16px] font-semibold leading-none text-zinc-300 transition-colors hover:text-white md:inline"
                            >
                                How it works
                            </Link>
                            <Link
                                href="/guide#faq"
                                className="hidden rounded-md px-3 py-2.5 font-sans text-[16px] font-semibold leading-none text-zinc-300 transition-colors hover:text-white sm:inline"
                            >
                                FAQ
                            </Link>
                            <span className="hidden h-6 w-px bg-zinc-600/90 sm:block" aria-hidden />
                            <button
                                type="button"
                                onClick={continueAsGuest}
                                className="rounded-md px-3 py-2.5 font-sans text-[16px] font-semibold leading-none text-zinc-300 transition-colors hover:text-white"
                            >
                                Continue as guest
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setSignupOpen(true);
                                    setSignupSubmitted(false);
                                }}
                                className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3.5 font-sans text-[16px] font-bold leading-none text-zinc-950 shadow-[0_4px_24px_rgba(0,0,0,0.35)] transition hover:bg-zinc-100 active:scale-[0.98]"
                            >
                                Get started
                                <ArrowRight className="h-5 w-5 shrink-0" aria-hidden />
                            </button>
                        </nav>
                    </div>
                </header>

                {/* Hero — editorial scale + two-column prose on large screens */}
                <section className="flex flex-1 flex-col justify-center px-5 pb-24 pt-8 sm:px-10 sm:pb-32 sm:pt-10 md:min-h-[calc(100vh-140px)] md:py-12 lg:px-14">
                    <div className="mx-auto w-full max-w-[56rem] lg:max-w-[72rem]">
                        <div className="text-center lg:text-left">
                            <p className="font-sans text-[15px] font-bold uppercase tracking-[0.28em] text-zinc-400 sm:text-[16px]">
                                AI workspace for founders
                            </p>
                            <h1 className="font-serif mt-8 max-w-[22ch] text-balance text-[clamp(2.65rem,7.5vw,5.5rem)] font-semibold leading-[1.06] tracking-[0.015em] text-white lg:max-w-none [text-shadow:0_4px_40px_rgba(0,0,0,0.55)]">
                                Where venture and intelligence meet
                            </h1>
                        </div>

                        <div className="mx-auto mt-10 h-px w-32 bg-gradient-to-r from-transparent via-zinc-500 to-transparent lg:mx-0 lg:w-40" aria-hidden />

                        <div className="mt-12 grid gap-10 lg:mt-14 lg:grid-cols-2 lg:gap-x-16 lg:gap-y-0">
                            <p className="font-serif text-center text-[clamp(1.35rem,2.8vw,1.85rem)] font-normal italic leading-[1.55] text-zinc-200 lg:text-left lg:leading-[1.5] [text-shadow:0_2px_20px_rgba(0,0,0,0.5)]">
                                One company. One office. Every desk pulling in the same direction.
                            </p>
                            <p className="font-sans text-center text-[clamp(1.05rem,2.1vw,1.25rem)] font-normal leading-[1.75] text-zinc-300 lg:text-left lg:text-[1.35rem] lg:leading-[1.8]">
                                Run strategy, specialist desks, and AI staff on a single venture record—so your story, roadmap, and numbers
                                stay aligned without jumping between tools.
                            </p>
                        </div>

                        <div
                            className="mt-16 grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-5 lg:mt-20"
                            role="list"
                        >
                            {[
                                { t: 'One venture memory', d: 'Single source of truth' },
                                { t: 'Desk-native AI', d: 'CEO, finance, product, scout' },
                                { t: 'Models in-app', d: 'Groq · Kimi · SLM' },
                            ].map(({ t, d }) => (
                                <span
                                    key={t}
                                    role="listitem"
                                    className="flex flex-col gap-2 border-l-2 border-zinc-600 bg-black/25 px-6 py-5 text-left backdrop-blur-[2px] sm:min-h-[140px]"
                                >
                                    <span className="font-sans text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-500">Capability</span>
                                    <span className="font-sans text-[17px] font-bold leading-tight text-zinc-50">{t}</span>
                                    <span className="font-sans text-[15px] font-normal leading-snug text-zinc-400">{d}</span>
                                </span>
                            ))}
                        </div>

                        <p className="mx-auto mt-16 max-w-3xl text-center font-sans text-[17px] leading-[1.75] text-zinc-500 lg:mt-20 lg:text-[18px]">
                            Move the cursor over the background to reveal the lattice.{' '}
                            <Link
                                href="/guide"
                                className="font-bold text-zinc-300 underline decoration-zinc-600 underline-offset-[7px] transition hover:text-white"
                            >
                                Read the product guide
                            </Link>
                        </p>
                    </div>
                </section>

                <footer className="mt-auto flex flex-col items-center gap-6 border-t border-zinc-800/80 px-5 py-12 text-center sm:flex-row sm:justify-between sm:px-12 sm:text-left">
                    <div className="[text-shadow:0_2px_20px_rgba(0,0,0,0.6)]">
                        <span className="font-serif text-[19px] font-semibold text-zinc-100">DeepChox</span>
                        <span className="mt-2 block font-sans text-[16px] font-medium leading-relaxed text-zinc-500">Virtual AI office</span>
                    </div>
                    <Link
                        href="/guide"
                        className="font-sans text-[16px] font-semibold text-zinc-400 transition hover:text-zinc-100"
                    >
                        Guide &amp; FAQ →
                    </Link>
                </footer>
            </div>

            {/* Sign-up — only after Get started */}
            {signupOpen && (
                <div
                    className="fixed inset-0 z-[200] flex items-center justify-center bg-black p-4 sm:p-6"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="signup-dialog-title"
                >
                    <button
                        type="button"
                        className="absolute inset-0 cursor-default"
                        aria-label="Close"
                        onClick={() => setSignupOpen(false)}
                    />
                    <div
                        className="relative z-10 w-full max-w-md border border-zinc-800 bg-zinc-950 p-6 shadow-2xl sm:p-8"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="mb-6 flex items-start justify-between gap-4 border-b border-zinc-800 pb-5">
                            <div className="min-w-0 text-left">
                                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-zinc-500">Create account</p>
                                <h2 id="signup-dialog-title" className="font-serif mt-2 text-xl font-semibold text-white">
                                    Join DeepChox
                                </h2>
                                <p className="mt-2 text-[13px] leading-relaxed text-zinc-500">
                                    Sign up is coming with Clerk. You can skip and continue as a guest anytime.
                                </p>
                            </div>
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center border border-zinc-800 bg-black" aria-hidden>
                                <Shield className="h-5 w-5 text-zinc-600" strokeWidth={1.75} />
                            </div>
                        </div>

                        <form onSubmit={handleSignupSubmit} className="space-y-4">
                            <div>
                                <label htmlFor="dc-email" className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-600">
                                    Email
                                </label>
                                <div className="relative">
                                    <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-600" aria-hidden />
                                    <input
                                        id="dc-email"
                                        name="email"
                                        type="email"
                                        autoComplete="email"
                                        value={signupEmail}
                                        onChange={(e) => setSignupEmail(e.target.value)}
                                        placeholder="you@company.com"
                                        className="w-full border border-zinc-800 bg-black py-3 pl-10 pr-4 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none transition-colors focus:border-zinc-500"
                                    />
                                </div>
                            </div>
                            <div>
                                <label htmlFor="dc-user" className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-600">
                                    Username
                                </label>
                                <div className="relative">
                                    <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-600" aria-hidden />
                                    <input
                                        id="dc-user"
                                        name="username"
                                        type="text"
                                        autoComplete="username"
                                        value={signupUsername}
                                        onChange={(e) => setSignupUsername(e.target.value)}
                                        placeholder="founder_handle"
                                        className="w-full border border-zinc-800 bg-black py-3 pl-10 pr-4 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none transition-colors focus:border-zinc-500"
                                    />
                                </div>
                            </div>
                            <div>
                                <label htmlFor="dc-pass" className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-600">
                                    Password
                                </label>
                                <div className="relative">
                                    <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-600" aria-hidden />
                                    <input
                                        id="dc-pass"
                                        name="password"
                                        type="password"
                                        autoComplete="new-password"
                                        value={signupPassword}
                                        onChange={(e) => setSignupPassword(e.target.value)}
                                        placeholder="••••••••"
                                        className="w-full border border-zinc-800 bg-black py-3 pl-10 pr-4 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none transition-colors focus:border-zinc-500"
                                    />
                                </div>
                            </div>
                            <button
                                type="submit"
                                className="mt-2 flex w-full items-center justify-center gap-2 border border-zinc-600 bg-zinc-900 py-3.5 text-[12px] font-bold uppercase tracking-[0.1em] text-zinc-100 transition-colors hover:bg-zinc-800"
                            >
                                Sign up
                                <ArrowRight className="h-4 w-4 text-zinc-500" aria-hidden />
                            </button>
                            {signupSubmitted && (
                                <p className="border border-zinc-800 bg-zinc-900 px-3 py-3 text-center text-[12px] font-medium text-zinc-400">
                                    Saved for Clerk integration. You can close and enter as guest, or finish onboarding later.
                                </p>
                            )}
                        </form>

                        <div className="mt-6 border-t border-zinc-800 pt-6">
                            <button
                                type="button"
                                onClick={continueAsGuest}
                                className="w-full border border-zinc-700 bg-black py-3 text-[13px] font-semibold text-zinc-300 transition-colors hover:border-zinc-600 hover:bg-zinc-950 hover:text-white"
                            >
                                Continue as guest
                            </button>
                            <button
                                type="button"
                                onClick={() => setSignupOpen(false)}
                                className="mt-3 w-full py-2 text-[12px] font-medium text-zinc-600 hover:text-zinc-400"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

