'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Mail, Lock, Play, User, Shield } from 'lucide-react';

/** Default hero still — drop `landing-hero-suite-intelligence.png` into `/public` (Intelligence Suite screenshot). */
export const LANDING_HERO_STILL = '/landing-hero-suite-intelligence.png';

interface LandingPageProps {
    onStart: () => void;
    /** MP4/WebM URL for the hero video. Defaults to `NEXT_PUBLIC_LANDING_HERO_VIDEO_URL`. */
    heroVideoSrc?: string | null;
}

export function LandingPage({ onStart, heroVideoSrc }: LandingPageProps) {
    const resolvedHeroVideo = (() => {
        const fromProp =
            heroVideoSrc != null && String(heroVideoSrc).trim() !== '' ? String(heroVideoSrc).trim() : null;
        if (fromProp) return fromProp;
        const env = process.env.NEXT_PUBLIC_LANDING_HERO_VIDEO_URL;
        return typeof env === 'string' && env.trim() !== '' ? env.trim() : null;
    })();
    const [isVisible, setIsVisible] = useState(false);
    const [signupOpen, setSignupOpen] = useState(false);
    const [signupEmail, setSignupEmail] = useState('');
    const [signupUsername, setSignupUsername] = useState('');
    const [signupPassword, setSignupPassword] = useState('');
    const [signupSubmitted, setSignupSubmitted] = useState(false);
    /** True if `/public/landing-hero-suite-intelligence.png` is missing or failed to load */
    const [heroStillError, setHeroStillError] = useState(false);
    /** Normalized pointer 0–100 for CSS-driven background parallax */
    const [bgPointer, setBgPointer] = useState({ x: 50, y: 32 });

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
                className={`relative z-10 mx-auto flex min-h-screen w-full max-w-[1280px] flex-col px-0 font-sans transition-all duration-700 ease-out ${
                    isVisible ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'
                }`}
            >
                {/* Top bar — minimal wordmark + actions; full brand lives in hero */}
                <header className="sticky top-0 z-30 bg-transparent">
                    <div className="mx-auto flex max-w-[1280px] flex-wrap items-center justify-between gap-x-4 gap-y-3 px-5 py-3.5 sm:px-8 lg:px-12">
                        <span className="font-sans text-[12px] font-semibold tracking-[0.12em] text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.85)]">
                            Virtual C-Suite
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
                <section className="flex min-h-[calc(100dvh-3.75rem)] shrink-0 flex-col items-center justify-center px-5 py-4 sm:px-10 sm:py-6 lg:px-14">
                    <div className="mx-auto flex w-full max-w-5xl flex-col items-center text-center">
                        {/* Logo + wordmark + tagline: tagline aligns under “DeepChox”, whole block centered */}
                        <div className="flex w-full justify-center">
                            <div className="flex items-start gap-3 sm:gap-4">
                                <Image
                                    src="/deepchox-mark.svg"
                                    alt=""
                                    width={128}
                                    height={128}
                                    priority
                                    className="mt-0.5 h-16 w-16 shrink-0 sm:mt-1 sm:h-[4.5rem] sm:w-[4.5rem]"
                                    aria-hidden
                                />
                                <div className="flex min-w-0 flex-col items-start text-left">
                                    <span className="font-sans text-[clamp(2.35rem,7vw,4.25rem)] font-semibold leading-[1.05] tracking-tight text-white">
                                        DeepChox
                                    </span>
                                    <p className="mt-2 max-w-[20rem] font-sans text-[14px] font-normal leading-snug text-zinc-400 sm:text-[15px] sm:leading-relaxed">
                                        Virtual AI-powered office
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div
                            className="relative mt-5 w-full max-w-5xl overflow-hidden rounded-2xl border border-zinc-800/90 bg-zinc-950/80 shadow-[0_24px_80px_-20px_rgba(0,0,0,0.85)] sm:mt-6"
                            style={{ aspectRatio: '16/9', maxHeight: 'min(46vh, 520px)' }}
                        >
                            {resolvedHeroVideo ? (
                                <video
                                    className="absolute inset-0 h-full w-full object-cover"
                                    controls
                                    playsInline
                                    preload="metadata"
                                    poster={LANDING_HERO_STILL}
                                    src={resolvedHeroVideo}
                                />
                            ) : !heroStillError ? (
                                <div className="absolute inset-0">
                                    <Image
                                        src={LANDING_HERO_STILL}
                                        alt="DeepChox Intelligence Suite — staff network, venture record, and officer desks"
                                        fill
                                        className="object-cover object-top"
                                        priority
                                        sizes="(max-width: 1280px) 100vw, 1280px"
                                        onError={() => setHeroStillError(true)}
                                    />
                                    <div
                                        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent"
                                        aria-hidden
                                    />
                                    <div className="absolute inset-x-0 bottom-0 flex flex-col gap-1 px-4 pb-3 pt-8 sm:px-5 sm:pb-4">
                                        <p className="font-sans text-[10px] font-semibold uppercase tracking-[0.18em] text-teal-300/95">
                                            Intelligence Suite
                                        </p>
                                        <p className="max-w-2xl font-sans text-[11px] leading-snug text-zinc-300/95 sm:text-xs">
                                            Staff network &amp; process — venture record, CEO · CTO · CFO · CSO · CMO, and one
                                            controlled merge.
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-gradient-to-b from-zinc-900/90 via-black to-black px-4">
                                    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_40%,rgba(34,211,238,0.12),transparent_65%)]" />
                                    <Image
                                        src="/deepchox-mark.svg"
                                        alt=""
                                        width={56}
                                        height={56}
                                        className="relative h-12 w-12 opacity-90 sm:h-14 sm:w-14"
                                        aria-hidden
                                    />
                                    <div className="relative flex h-12 w-12 items-center justify-center rounded-full border border-zinc-700/80 bg-zinc-900/90 text-zinc-300">
                                        <Play className="ml-0.5 h-5 w-5 fill-current" aria-hidden />
                                    </div>
                                    <p className="relative max-w-[20rem] text-center font-sans text-[11px] leading-relaxed text-zinc-500 sm:text-xs">
                                        Add{' '}
                                        <code className="rounded bg-zinc-900 px-1.5 py-0.5 font-mono text-[10px] text-zinc-400">
                                            public/landing-hero-suite-intelligence.png
                                        </code>{' '}
                                        (your screenshot) or set{' '}
                                        <code className="rounded bg-zinc-900 px-1.5 py-0.5 font-mono text-[10px] text-zinc-400">
                                            NEXT_PUBLIC_LANDING_HERO_VIDEO_URL
                                        </code>
                                    </p>
                                </div>
                            )}
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
                        <span className="font-sans text-[17px] font-semibold tracking-tight text-zinc-100">DeepChox</span>
                        <span className="mt-2 block font-sans text-[14px] font-normal leading-relaxed text-zinc-500">
                            C-Suite workspace · Virtual AI office
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

