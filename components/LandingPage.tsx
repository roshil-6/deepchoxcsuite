'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Mail, Lock, User, Shield, Volume2, VolumeX } from 'lucide-react';

/** Default hero video — `public/landing-hero-demo.mp4`. Override with `NEXT_PUBLIC_LANDING_HERO_VIDEO_URL` (full URL). */
export const LANDING_HERO_VIDEO_DEFAULT = '/landing-hero-demo.mp4';

interface LandingPageProps {
    onStart: () => void;
    /** MP4/WebM URL — overrides env and default file in `public/`. */
    heroVideoSrc?: string | null;
}

export function LandingPage({ onStart, heroVideoSrc }: LandingPageProps) {
    /** Hero video only. Prop → env → `public/landing-hero-demo.mp4`. */
    const resolvedHeroVideo = (() => {
        const fromProp =
            heroVideoSrc != null && String(heroVideoSrc).trim() !== '' ? String(heroVideoSrc).trim() : null;
        if (fromProp) return fromProp;
        const env = process.env.NEXT_PUBLIC_LANDING_HERO_VIDEO_URL;
        if (typeof env === 'string' && env.trim() !== '') return env.trim();
        return LANDING_HERO_VIDEO_DEFAULT;
    })();

    const [isVisible, setIsVisible] = useState(false);
    const [signupOpen, setSignupOpen] = useState(false);
    const [signupEmail, setSignupEmail] = useState('');
    const [signupUsername, setSignupUsername] = useState('');
    const [signupPassword, setSignupPassword] = useState('');
    const [signupSubmitted, setSignupSubmitted] = useState(false);
    /** Normalized pointer 0–100 for CSS-driven background parallax */
    const [bgPointer, setBgPointer] = useState({ x: 50, y: 32 });
    /** Browsers allow autoplay only when muted — user can enable sound via control */
    const [heroVideoMuted, setHeroVideoMuted] = useState(true);
    const heroVideoRef = useRef<HTMLVideoElement>(null);

    const handleBgPointer = (e: React.PointerEvent<HTMLDivElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / Math.max(rect.width, 1)) * 100;
        const y = ((e.clientY - rect.top) / Math.max(rect.height, 1)) * 100;
        setBgPointer({ x, y });
    };

    useEffect(() => {
        setIsVisible(true);
    }, []);

    useEffect(() => {
        const v = heroVideoRef.current;
        if (!v) return;
        const sync = () => setHeroVideoMuted(v.muted);
        v.addEventListener('volumechange', sync);
        return () => v.removeEventListener('volumechange', sync);
    }, [resolvedHeroVideo]);

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

    const px = bgPointer.x - 50;
    const py = bgPointer.y - 50;

    return (
        <div
            className="relative z-[100] min-h-screen bg-[#030304] text-white"
            onPointerMove={handleBgPointer}
        >
            {/* Dot grid + blobs + gradient — pointer-reactive (no canvas overlay) */}
            <div className="pointer-events-none absolute inset-0 z-0">
                <div
                    className="absolute inset-0"
                    style={{
                        background: `radial-gradient(ellipse 88% 68% at ${bgPointer.x}% ${bgPointer.y}%, #101014 0%, #050506 42%, #000000 100%)`,
                    }}
                />
                {/* Subtle violet from top-left — soft gradients only, no blur orbs */}
                <div
                    className="absolute inset-0"
                    aria-hidden
                    style={{
                        background:
                            'radial-gradient(ellipse 70% 52% at 0% 0%, rgba(124, 58, 237, 0.11) 0%, transparent 50%), linear-gradient(158deg, rgba(91, 33, 182, 0.06) 0%, transparent 36%)',
                    }}
                />
                <div
                    className="absolute inset-0 opacity-[0.68]"
                    style={{
                        backgroundImage: 'radial-gradient(circle at center, #71717a 1px, transparent 1.05px)',
                        backgroundSize: '28px 28px',
                        backgroundPosition: `${px * -0.45}px ${py * -0.45}px`,
                    }}
                />
                <div
                    className="absolute inset-0 overflow-hidden"
                    style={{
                        transform: `translate(${px * 0.65}px, ${py * 0.5}px)`,
                    }}
                >
                    <div className="absolute -right-[10%] bottom-[0%] h-[min(480px,60vh)] w-[min(480px,60vw)] rounded-full bg-sky-900/42 blur-[100px]" />
                    <div className="absolute left-1/2 top-[60%] h-[40vh] w-[80%] -translate-x-1/2 rounded-full bg-zinc-700/22 blur-[80px]" />
                </div>
            </div>

            <div
                className={`relative z-10 mx-auto flex min-h-screen w-full max-w-[1600px] flex-col px-0 font-sans transition-all duration-700 ease-out ${
                    isVisible ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'
                }`}
            >
                {/* Top bar — minimal wordmark + actions; full brand lives in hero */}
                <header className="sticky top-0 z-30 bg-transparent">
                    <div className="mx-auto flex max-w-[1280px] flex-wrap items-center justify-between gap-x-4 gap-y-3 px-5 py-3.5 sm:px-8 lg:px-12">
                        <span className="font-sans text-[12px] font-semibold tracking-[0.12em] text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.85)]">
                            AI-powered team for founders
                        </span>
                        <nav
                            className="flex flex-1 flex-wrap items-center justify-end gap-x-1 gap-y-2 sm:flex-initial sm:gap-x-2 md:gap-x-3 [text-shadow:0_2px_24px_rgba(0,0,0,0.85)]"
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

                {/* Above-the-fold hero — Google AI Studio–style stack (fits in one viewport) */}
                <section className="flex min-h-[calc(100dvh-3.75rem)] shrink-0 flex-col items-center justify-center px-4 py-4 sm:px-6 sm:py-6 lg:px-10">
                    <div className="mx-auto flex w-full max-w-[min(100%,72rem)] flex-col items-center text-center lg:max-w-[min(100%,80rem)]">
                        {/* Wordmark — no logo; neutral grey accent */}
                        <div className="flex w-full justify-center px-1">
                            <div className="flex w-full max-w-xl flex-col items-center text-center sm:max-w-2xl lg:max-w-3xl">
                                <p className="font-sans text-[10px] font-bold uppercase tracking-[0.28em] text-brand-teal sm:text-[11px]">
                                    AI-powered team for founders
                                </p>
                                <span
                                    className="mt-2 font-[family-name:var(--font-brand-display)] text-[clamp(2.5rem,8vw,4.5rem)] font-semibold leading-[1.02] tracking-[-0.02em] text-white [text-shadow:0_2px_40px_rgba(0,0,0,0.5),0_0_48px_rgba(255,255,255,0.04)]"
                                >
                                    DEEPCHOX
                                </span>
                                <span
                                    className="mt-3 block h-px w-12 bg-gradient-to-r from-white/30 to-transparent"
                                    aria-hidden
                                />
                                <p className="mt-4 max-w-[22rem] font-sans text-[14px] font-normal leading-[1.55] text-zinc-400 sm:max-w-[26rem] sm:text-[15px] sm:leading-relaxed">
                                    AI roles act as specialized team members — strategy, finance, product, market, and GTM — coordinated on
                                    one venture record for solo founders.
                                </p>
                            </div>
                        </div>

                        {/* Centered preview box — capped width so the hero stays balanced on large screens */}
                        <div className="relative mx-auto mt-5 w-full max-w-[min(100%,36rem)] overflow-hidden rounded-2xl border border-zinc-800/90 bg-zinc-900/40 shadow-[0_20px_60px_-18px_rgba(0,0,0,0.75)] sm:mt-6 sm:max-w-[min(100%,42rem)] lg:max-w-[min(100%,48rem)]">
                            <div className="relative aspect-video w-full overflow-hidden bg-zinc-950">
                                <video
                                    ref={heroVideoRef}
                                    className="absolute inset-0 h-full w-full object-cover object-center"
                                    autoPlay
                                    loop
                                    muted={heroVideoMuted}
                                    playsInline
                                    preload="auto"
                                    controls
                                    src={resolvedHeroVideo}
                                >
                                    Your browser does not support the video tag.
                                </video>
                                <button
                                    type="button"
                                    onClick={() => setHeroVideoMuted((m) => !m)}
                                    className="absolute right-2 top-2 z-10 inline-flex items-center gap-2 rounded-lg border border-zinc-600/90 bg-black/75 px-2.5 py-1.5 font-sans text-[11px] font-semibold text-zinc-100 shadow-lg backdrop-blur-sm transition hover:bg-black/90 hover:border-zinc-500 sm:right-3 sm:top-3 sm:px-3 sm:py-2 sm:text-xs"
                                    aria-pressed={!heroVideoMuted}
                                    aria-label={heroVideoMuted ? 'Turn sound on' : 'Mute video'}
                                >
                                    {heroVideoMuted ? (
                                        <VolumeX className="h-4 w-4 shrink-0 text-zinc-400" aria-hidden />
                                    ) : (
                                        <Volume2 className="h-4 w-4 shrink-0 text-brand-teal" aria-hidden />
                                    )}
                                    <span className="hidden sm:inline">{heroVideoMuted ? 'Sound on' : 'Mute'}</span>
                                </button>
                            </div>
                            <p className="border-t border-zinc-800/80 px-3 py-2 text-center font-sans text-[10px] text-zinc-500">
                                Plays automatically — tap Sound on for audio
                            </p>
                        </div>

                        <h1 className="font-serif mx-auto mt-5 max-w-[22ch] text-balance text-[clamp(2.15rem,6vw,4.25rem)] font-semibold leading-[1.08] tracking-[0.015em] text-white sm:mt-6 sm:max-w-[24ch] [text-shadow:0_4px_40px_rgba(0,0,0,0.55)]">
                            Where venture and intelligence meet
                        </h1>
                    </div>
                </section>

                <section className="mx-auto w-full max-w-[56rem] flex-1 px-5 pb-24 pt-6 sm:px-10 sm:pb-32 lg:max-w-[72rem] lg:px-14">
                    <div className="mx-auto h-px w-32 bg-gradient-to-r from-transparent via-zinc-500 to-transparent sm:w-40" aria-hidden />

                    <div className="mt-12 grid gap-10 text-left lg:mt-14 lg:grid-cols-2 lg:gap-x-16 lg:gap-y-0">
                            <p className="font-serif text-[clamp(1.35rem,2.8vw,1.85rem)] font-normal italic leading-[1.55] text-zinc-200 lg:leading-[1.5] [text-shadow:0_2px_20px_rgba(0,0,0,0.5)]">
                                One company. One office. Every desk pulling in the same direction.
                            </p>
                            <p className="font-sans text-[clamp(1.05rem,2.1vw,1.25rem)] font-normal leading-[1.75] text-zinc-300 lg:text-[1.35rem] lg:leading-[1.8]">
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
                                { t: 'Role-based teammates', d: 'Each desk is an AI team member' },
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

                        <p className="mt-16 max-w-3xl text-left font-sans text-[16px] leading-[1.75] text-zinc-500 sm:text-[17px] lg:mt-20">
                            The grid shifts subtly with your cursor.{' '}
                            <Link
                                href="/guide"
                                className="font-bold text-zinc-300 underline decoration-zinc-600 underline-offset-[7px] transition hover:text-white"
                            >
                                Read the product guide
                            </Link>
                        </p>
                </section>

                <footer className="mt-auto flex flex-col items-center gap-6 border-t border-zinc-800/80 px-5 py-12 text-center sm:flex-row sm:justify-between sm:px-12 sm:text-left">
                    <div className="[text-shadow:0_2px_20px_rgba(0,0,0,0.6)]">
                        <span className="font-sans text-[17px] font-semibold tracking-tight text-zinc-100">DEEPCHOX</span>
                        <span className="mt-2 block font-sans text-[14px] font-normal leading-relaxed text-zinc-500">
                            AI-powered team for founders · One venture workspace
                        </span>
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

