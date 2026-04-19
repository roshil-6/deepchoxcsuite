'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Check, Infinity, Mail, Lock, Sparkles, User, Shield, Volume2, VolumeX } from 'lucide-react';
import { FREE_DAILY_TOKENS, TOKEN_COSTS } from '@/lib/tokens/tokenSystem';
import { formatRegionalPricePair, getProBillingAmounts } from '@/lib/billingConfig';
import { usePricingRegion } from '@/hooks/usePricingRegion';
import { SITE_HERO_H1, SITE_HERO_LEAD, SITE_PULL_QUOTE, SITE_TAGLINE_SHORT } from '@/lib/siteSeo';

/**
 * Optional local hero file — add `public/landing-hero-demo.mp4` to the repo, or set
 * `NEXT_PUBLIC_LANDING_HERO_VIDEO_URL` to a full HTTPS URL (Vercel env).
 */
export const LANDING_HERO_VIDEO_DEFAULT = '/landing-hero-demo.mp4';

const LANDING_FREE_METERING = `${FREE_DAILY_TOKENS} Dexo tokens per day (resets midnight) · ${TOKEN_COSTS.ANALYSIS} per new analysis · ${TOKEN_COSTS.REANALYZE} per re-analyze · ${TOKEN_COSTS.CHAT_MESSAGE} per Dexo message`;
interface LandingPageProps {
    onStart: () => void;
    /** MP4/WebM URL — overrides env and default file in `public/`. */
    heroVideoSrc?: string | null;
}

export function LandingPage({ onStart, heroVideoSrc }: LandingPageProps) {
    const pricingRegion = usePricingRegion();
    const PRO_BILLING = getProBillingAmounts();
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
    /** True when `<video>` fails (missing file, bad URL, CORS, or blocked host). */
    const [heroVideoFailed, setHeroVideoFailed] = useState(false);
    const heroVideoRef = useRef<HTMLVideoElement>(null);
    const pricingRef = useRef<HTMLElement>(null);
    const [landingBilling, setLandingBilling] = useState<'monthly' | 'yearly'>('monthly');

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
        setHeroVideoFailed(false);
    }, [resolvedHeroVideo]);

    useEffect(() => {
        const v = heroVideoRef.current;
        if (!v) return;
        const sync = () => setHeroVideoMuted(v.muted);
        v.addEventListener('volumechange', sync);
        return () => v.removeEventListener('volumechange', sync);
    }, [resolvedHeroVideo]);

    useEffect(() => {
        const v = heroVideoRef.current;
        if (!v || heroVideoFailed) return;
        void v.play().catch(() => {
            /* autoplay may be blocked until user gesture — controls still work */
        });
    }, [resolvedHeroVideo, heroVideoFailed]);

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
                            {SITE_TAGLINE_SHORT}
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
                                href="/guide#guide-faq"
                                className="hidden rounded-md px-3 py-2.5 font-sans text-[16px] font-semibold leading-none text-zinc-300 transition-colors hover:text-white sm:inline"
                            >
                                FAQ
                            </Link>
                            <button
                                type="button"
                                onClick={() => pricingRef.current?.scrollIntoView({ behavior: 'smooth' })}
                                className="hidden rounded-md px-3 py-2.5 font-sans text-[16px] font-semibold leading-none text-zinc-300 transition-colors hover:text-white sm:inline"
                            >
                                Pricing
                            </button>
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
                                {/* Company branding */}
                                <div className="flex flex-col items-center">
                                    <div className="flex items-baseline gap-4 sm:gap-5">
                                        <span className="font-sans text-[clamp(2.75rem,9vw,5rem)] font-black tracking-[0.05em] text-white">
                                            north<span className="text-brand-teal">ROSC</span>
                                        </span>
                                        <span className="font-sans text-[clamp(1.5rem,5vw,2.5rem)] font-bold tracking-[0.25em] text-zinc-400">
                                            LABS
                                        </span>
                                    </div>
                                </div>
                                <div className="mt-4 flex items-center gap-3">
                                    <span className="h-px w-12 bg-gradient-to-r from-transparent via-brand-teal/50 to-transparent" />
                                    <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.3em] text-zinc-500">
                                        presents
                                    </p>
                                    <span className="h-px w-12 bg-gradient-to-r from-transparent via-brand-teal/50 to-transparent" />
                                </div>
                                <span
                                    className="mt-6 font-[family-name:var(--font-brand-display)] text-[clamp(1.75rem,5vw,3rem)] font-semibold leading-[1.05] tracking-[0.02em] text-white/90"
                                >
                                    Deepchox
                                </span>
                                <span
                                    className="mt-4 block h-px w-20 bg-gradient-to-r from-transparent via-brand-teal/60 to-transparent"
                                    aria-hidden
                                />
                                <p className="mt-5 max-w-[26rem] font-sans text-[16px] font-light leading-[1.7] text-zinc-300 sm:max-w-[30rem] sm:text-[18px]">
                                    {SITE_TAGLINE_SHORT}
                                </p>
                            </div>
                        </div>

                        {/* Centered preview box — capped width so the hero stays balanced on large screens */}
                        <div className="relative mx-auto mt-5 w-full max-w-[min(100%,36rem)] overflow-hidden rounded-2xl border border-zinc-800/90 bg-zinc-900/40 shadow-[0_20px_60px_-18px_rgba(0,0,0,0.75)] sm:mt-6 sm:max-w-[min(100%,42rem)] lg:max-w-[min(100%,48rem)]">
                            <div className="relative aspect-video w-full overflow-hidden bg-zinc-950">
                                {heroVideoFailed ? (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-4 text-center">
                                        <p className="font-sans text-sm text-zinc-300">Hero video couldn’t load</p>
                                        <p className="max-w-sm font-sans text-[11px] leading-relaxed text-zinc-500">
                                            Add <code className="rounded bg-zinc-800 px-1 py-0.5 text-zinc-300">public/landing-hero-demo.mp4</code>{' '}
                                            or set{' '}
                                            <code className="rounded bg-zinc-800 px-1 py-0.5 text-zinc-300">NEXT_PUBLIC_LANDING_HERO_VIDEO_URL</code>{' '}
                                            (full HTTPS URL to an MP4/WebM) in Vercel / Render env, then redeploy.
                                        </p>
                                    </div>
                                ) : (
                                    <>
                                        <video
                                            key={resolvedHeroVideo}
                                            ref={heroVideoRef}
                                            className="absolute inset-0 h-full w-full object-cover object-center"
                                            autoPlay
                                            loop
                                            muted={heroVideoMuted}
                                            playsInline
                                            preload="metadata"
                                            controls
                                            src={resolvedHeroVideo}
                                            onError={() => setHeroVideoFailed(true)}
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
                                    </>
                                )}
                            </div>
                            <p className="border-t border-zinc-800/80 px-3 py-2 text-center font-sans text-[10px] text-zinc-500">
                                Plays automatically — tap Sound on for audio
                            </p>
                        </div>

                        <h1 className="font-serif mx-auto mt-5 max-w-[24ch] text-balance text-[clamp(2.15rem,6vw,4.25rem)] font-semibold leading-[1.08] tracking-[0.015em] text-white sm:mt-6 sm:max-w-[28ch] [text-shadow:0_4px_40px_rgba(0,0,0,0.55)]">
                            {SITE_HERO_H1}
                        </h1>
                    </div>
                </section>

                <section className="mx-auto w-full max-w-[56rem] px-5 pb-16 pt-6 sm:px-10 sm:pb-24 lg:max-w-[72rem] lg:px-14">
                    <div className="mx-auto h-px w-32 bg-gradient-to-r from-transparent via-zinc-500 to-transparent sm:w-40" aria-hidden />

                    <div className="mt-12 grid gap-10 text-left lg:mt-14 lg:grid-cols-2 lg:gap-x-16 lg:gap-y-0">
                            <p className="font-serif text-[clamp(1.35rem,2.8vw,1.85rem)] font-normal italic leading-[1.55] text-zinc-200 lg:leading-[1.5] [text-shadow:0_2px_20px_rgba(0,0,0,0.5)]">
                                {SITE_PULL_QUOTE}
                            </p>
                            <p className="font-sans text-[clamp(1.05rem,2.1vw,1.25rem)] font-normal leading-[1.75] text-zinc-300 lg:text-[1.35rem] lg:leading-[1.8]">
                                {SITE_HERO_LEAD}
                            </p>
                        </div>

                        <div
                            className="mt-16 grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-5 lg:mt-20"
                            role="list"
                        >
                            {[
                                {
                                    t: 'Research',
                                    d: 'Live web research so you build from real markets and sources, not guesswork.',
                                },
                                {
                                    t: 'Actions',
                                    d: 'Concrete suggestions for your venture — not only chat, but changes you can apply.',
                                },
                                {
                                    t: 'A full team',
                                    d: 'Strategy, product, finance, GTM, and intel — one workspace, like a co-founding team.',
                                },
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

                {/* ── Pricing ── */}
                <section
                    id="pricing"
                    ref={pricingRef}
                    className="mx-auto w-full max-w-[56rem] px-5 pb-24 pt-4 sm:px-10 sm:pb-32 lg:max-w-[72rem] lg:px-14"
                >
                    <div
                        className="mx-auto mb-14 h-px w-32 bg-gradient-to-r from-transparent via-zinc-500 to-transparent sm:w-40"
                        aria-hidden
                    />

                    {/* Section heading */}
                    <div className="mb-10 text-center">
                        <p className="font-sans text-[10px] font-bold uppercase tracking-[0.28em] text-brand-teal">
                            Pricing
                        </p>
                        <h2 className="font-[family-name:var(--font-brand-display)] mx-auto mt-3 max-w-[22ch] text-balance text-[clamp(1.6rem,4vw,2.75rem)] font-semibold leading-tight tracking-[-0.01em] text-white">
                            Start free. Upgrade when you need the edge.
                        </h2>
                        <p className="mx-auto mt-3 max-w-xl font-sans text-[15px] leading-relaxed text-zinc-400">
                            The full workspace is free. The only difference is how much AI you can run: Founder uses a daily
                            token pool; Co-Founder Pro is unlimited.
                        </p>
                    </div>

                    {/* Billing toggle */}
                    <div className="mb-8 flex justify-center">
                        <div className="inline-flex items-center rounded-full border border-zinc-700/60 bg-black/40 p-1 backdrop-blur-sm">
                            <button
                                type="button"
                                onClick={() => setLandingBilling('monthly')}
                                className={`rounded-full px-5 py-2 font-sans text-[13px] font-semibold transition ${
                                    landingBilling === 'monthly'
                                        ? 'bg-zinc-800 text-zinc-100 shadow-sm'
                                        : 'text-zinc-500 hover:text-zinc-300'
                                }`}
                            >
                                Monthly
                            </button>
                            <button
                                type="button"
                                onClick={() => setLandingBilling('yearly')}
                                className={`flex items-center gap-2 rounded-full px-5 py-2 font-sans text-[13px] font-semibold transition ${
                                    landingBilling === 'yearly'
                                        ? 'bg-zinc-800 text-zinc-100 shadow-sm'
                                        : 'text-zinc-500 hover:text-zinc-300'
                                }`}
                            >
                                Yearly
                                <span className="rounded-full bg-amber-400/20 px-2 py-0.5 font-sans text-[10px] font-bold uppercase text-amber-400">
                                    Save 17%
                                </span>
                            </button>
                        </div>
                    </div>

                    {/* Plan cards */}
                    <div className="mx-auto grid max-w-3xl gap-4 sm:grid-cols-2">

                        {/* Free card */}
                        <div className="flex flex-col rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-[0_12px_32px_-24px_rgba(0,0,0,0.8)]">
                            <p className="font-sans text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">
                                Founder
                            </p>
                            <p className="mt-3 font-sans text-[34px] font-bold leading-none text-zinc-200">
                                Free
                            </p>
                            <p className="mt-1 font-sans text-[13px] text-zinc-600">
                                forever, no card required
                            </p>
                            <div className="my-5 h-px bg-zinc-800/80" />
                            <ul className="flex-1 space-y-3">
                                <li className="flex items-start gap-2.5 font-sans text-[13px] leading-relaxed text-zinc-400">
                                    <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-zinc-500" aria-hidden />
                                    <span>
                                        <span className="font-semibold text-zinc-200">Full product</span> — all desks, Dexo,
                                        sync, calendar, ventures, and tools. Nothing extra is paywalled.
                                    </span>
                                </li>
                                <li className="flex items-start gap-2.5 font-sans text-[13px] leading-relaxed text-zinc-400">
                                    <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-zinc-500" aria-hidden />
                                    <span>
                                        <span className="font-semibold text-zinc-200">Metered AI</span> — {LANDING_FREE_METERING}
                                    </span>
                                </li>
                            </ul>
                            <button
                                type="button"
                                onClick={continueAsGuest}
                                className="mt-6 w-full rounded-xl border border-zinc-700 bg-zinc-900 py-3 font-sans text-[14px] font-semibold text-zinc-200 transition hover:border-zinc-600 hover:bg-zinc-800 hover:text-white"
                            >
                                Get started free
                            </button>
                        </div>

                        {/* Pro card */}
                        <div className="relative flex flex-col overflow-hidden rounded-2xl border border-zinc-700 bg-zinc-950/80 p-6 shadow-[0_16px_40px_-24px_rgba(0,0,0,0.8)]">
                            <div className="relative flex flex-1 flex-col">
                                <div className="flex items-center gap-2">
                                    <Sparkles className="h-3.5 w-3.5 text-zinc-300" aria-hidden />
                                    <p className="font-sans text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-300">
                                        Co-Founder Pro
                                    </p>
                                </div>

                                {/* Price */}
                                {landingBilling === 'monthly' ? (
                                    <>
                                        <div className="mt-3 flex items-end gap-2">
                                            <p className="font-sans text-[34px] font-bold leading-none text-zinc-100">
                                                {formatRegionalPricePair(PRO_BILLING.monthlyInr, pricingRegion, { usdDecimals: 0 }).primary}
                                            </p>
                                            <span className="mb-1 font-sans text-[15px] text-zinc-500">/mo</span>
                                            <span className="mb-1 font-sans text-[13px] text-zinc-600">
                                                ({formatRegionalPricePair(PRO_BILLING.monthlyInr, pricingRegion, { usdDecimals: 0 }).secondary})
                                            </span>
                                        </div>
                                        <p className="mt-1 font-sans text-[13px] text-zinc-600">
                                            billed monthly &middot; cancel anytime
                                        </p>
                                    </>
                                ) : (
                                    <>
                                        <div className="mt-3 flex items-end gap-2">
                                            <p className="font-sans text-[34px] font-bold leading-none text-zinc-100">
                                                {
                                                    formatRegionalPricePair(PRO_BILLING.effectiveMonthlyInr, pricingRegion, {
                                                        usdDecimals: 2,
                                                        inrMaximumFractionDigits: 2,
                                                    }).primary
                                                }
                                            </p>
                                            <span className="mb-1 font-sans text-[15px] text-zinc-500">/mo</span>
                                            <span className="mb-1 font-sans text-[13px] text-zinc-600">
                                                (
                                                {
                                                    formatRegionalPricePair(PRO_BILLING.effectiveMonthlyInr, pricingRegion, {
                                                        usdDecimals: 2,
                                                        inrMaximumFractionDigits: 2,
                                                    }).secondary
                                                }
                                                )
                                            </span>
                                        </div>
                                        <p className="mt-1 font-sans text-[13px] text-zinc-600">
                                            {formatRegionalPricePair(PRO_BILLING.yearlyInr, pricingRegion, { usdDecimals: 2 }).primary}/yr (
                                            {formatRegionalPricePair(PRO_BILLING.yearlyInr, pricingRegion, { usdDecimals: 2 }).secondary}) &middot;
                                            billed annually
                                        </p>
                                    </>
                                )}

                                <div className="my-5 h-px bg-zinc-800" />

                                <div className="flex flex-1 flex-col gap-3">
                                    <div className="flex gap-3 rounded-xl border border-emerald-500/25 bg-emerald-500/[0.07] p-3.5">
                                        <Infinity className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" aria-hidden />
                                        <div>
                                            <p className="font-sans text-[12px] font-semibold leading-snug text-zinc-100">
                                                Unlimited AI usage
                                            </p>
                                            <p className="mt-1 font-sans text-[11px] leading-snug text-zinc-400">
                                                No daily token cap — Dexo, analyses, and chat run without the Founder tier
                                                meter. Same app; you only remove limits.
                                            </p>
                                        </div>
                                    </div>
                                    <p className="font-sans text-[12px] leading-relaxed text-zinc-500">
                                        Everything else matches Founder: same desks, same data, same features.
                                    </p>
                                </div>

                                <button
                                    type="button"
                                    onClick={onStart}
                                    className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white py-3 font-sans text-[14px] font-bold text-zinc-900 shadow-[0_2px_24px_rgba(255,255,255,0.12)] transition hover:bg-zinc-100 active:scale-[0.98]"
                                >
                                    <Sparkles className="h-4 w-4 shrink-0" aria-hidden />
                                    {landingBilling === 'monthly'
                                        ? `Get Pro - ${formatRegionalPricePair(PRO_BILLING.monthlyInr, pricingRegion, { usdDecimals: 0 }).primary}/mo`
                                        : `Get Pro - ${formatRegionalPricePair(PRO_BILLING.yearlyInr, pricingRegion, { usdDecimals: 2 }).primary}/yr`}
                                </button>
                                <p className="mt-2 text-center font-sans text-[10px] text-zinc-600">
                                    Instant access &middot; cancel anytime &middot; no questions asked
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                <footer className="mt-auto flex flex-col items-center gap-6 border-t border-zinc-800/80 px-5 py-12 text-center sm:flex-row sm:justify-between sm:px-12 sm:text-left">
                    <div className="[text-shadow:0_2px_20px_rgba(0,0,0,0.6)]">
                        <div className="flex items-baseline gap-2">
                            <span className="font-sans text-[20px] font-black tracking-tighter text-white">
                                north<span className="text-brand-teal">ROSC</span>
                            </span>
                            <span className="font-sans text-[13px] font-bold tracking-[0.15em] text-zinc-400">
                                LABS
                            </span>
                        </div>
                        <span className="mt-2 block font-sans text-[14px] font-normal leading-relaxed text-zinc-500">
                            {SITE_TAGLINE_SHORT}
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
                                    Join Deepchox
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


