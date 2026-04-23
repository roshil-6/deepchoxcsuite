'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Check, Globe, Infinity, Sparkles, Quote, Search, Wand2, Users } from 'lucide-react';
import { FREE_DAILY_TOKENS, TOKEN_COSTS } from '@/lib/tokens/tokenSystem';
import { formatRegionalPricePair, getProBillingAmounts } from '@/lib/billingConfig';
import { usePricingRegion } from '@/hooks/usePricingRegion';
import { SITE_HERO_H1, SITE_HERO_LEAD, SITE_PULL_QUOTE, SITE_TAGLINE_SHORT } from '@/lib/siteSeo';
import { LandingGoogleAuth } from '@/components/LandingGoogleAuth';

/** @deprecated Hero is Clerk sign-in; kept for older imports / env docs. */
export const LANDING_HERO_VIDEO_DEFAULT = '/landing-hero-demo.mp4';

const LANDING_FREE_METERING = `${FREE_DAILY_TOKENS} Dexo tokens per day (resets midnight) · ${TOKEN_COSTS.ANALYSIS} per new analysis · ${TOKEN_COSTS.REANALYZE} per re-analyze · ${TOKEN_COSTS.CHAT_MESSAGE} per Dexo message`;

interface LandingPageProps {
    /** Enter the app without signing in; creating a venture will prompt for login. */
    onContinueGuest: () => void;
}

function scrollToHeroAuth() {
    document.getElementById('landing-auth')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

export function LandingPage({ onContinueGuest }: LandingPageProps) {
    const pricingRegion = usePricingRegion();
    const PRO_BILLING = getProBillingAmounts();

    const [isVisible, setIsVisible] = useState(false);
    /** Normalized pointer 0–100 for CSS-driven background parallax */
    const [bgPointer, setBgPointer] = useState({ x: 50, y: 32 });
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

    const continueWithoutSigningIn = () => {
        onContinueGuest();
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
                    <div className="mx-auto flex max-w-[1280px] flex-wrap items-center justify-end gap-x-4 gap-y-3 px-5 py-3.5 sm:px-8 lg:px-12">
                        <nav
                            className="flex flex-wrap items-center justify-end gap-x-1 gap-y-2 sm:gap-x-2 md:gap-x-3 [text-shadow:0_2px_24px_rgba(0,0,0,0.85)]"
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
                                onClick={continueWithoutSigningIn}
                                className="rounded-md px-3 py-2.5 text-left font-sans text-[14px] font-semibold leading-snug text-zinc-300 transition-colors hover:text-white sm:text-[16px] sm:leading-none"
                            >
                                Continue without signing in
                            </button>
                            <button
                                type="button"
                                onClick={scrollToHeroAuth}
                                className="rounded-md px-3 py-2.5 font-sans text-[16px] font-semibold leading-none text-zinc-300 transition-colors hover:text-white"
                            >
                                Log in
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
                                    <div className="relative flex items-baseline gap-4 sm:gap-5">
                                        <span
                                            className="absolute inset-0 -z-10 rounded-full bg-brand-teal/15 blur-[80px]"
                                            aria-hidden
                                        />
                                        <span className="font-sans text-[clamp(2.75rem,9vw,5rem)] font-black tracking-[0.05em] text-white [text-shadow:0_2px_40px_rgba(116,86,255,0.35)]">
                                            north<span className="bg-gradient-to-br from-brand-teal via-[#9d88ff] to-brand-teal bg-clip-text text-transparent">ROSC</span>
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

                        {/* Auth — compact Google actions + guest path (no embedded Clerk card) */}
                        <div
                            id="landing-auth"
                            className="relative z-[35] mx-auto mt-6 w-full max-w-lg scroll-mt-28 sm:mt-7"
                        >
                            <LandingGoogleAuth
                                afterOAuth={{ openNameVenture: true }}
                                showOtherOptions
                            />
                            <div className="mt-4 flex flex-col items-center gap-2">
                                <button
                                    type="button"
                                    onClick={continueWithoutSigningIn}
                                    className="rounded-full border border-zinc-500/55 bg-zinc-900/40 px-4 py-2 font-sans text-[12px] font-semibold text-zinc-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-sm transition-all hover:-translate-y-px hover:border-brand-teal/50 hover:bg-zinc-800/60 hover:text-white hover:shadow-[0_4px_20px_-8px_rgba(116,86,255,0.35)] sm:text-[13px]"
                                >
                                    Continue without signing in
                                </button>
                                <p className="max-w-sm text-center font-sans text-[11px] leading-snug text-zinc-500">
                                    Browse first. You’ll be asked to sign in when you add a venture.
                                </p>
                            </div>
                        </div>

                        <h1 className="font-serif mx-auto mt-5 max-w-[24ch] text-balance text-[clamp(2.15rem,6vw,4.25rem)] font-semibold leading-[1.08] tracking-[0.015em] text-white sm:mt-6 sm:max-w-[28ch] [text-shadow:0_4px_40px_rgba(0,0,0,0.55)]">
                            {SITE_HERO_H1}
                        </h1>
                    </div>
                </section>

                <section className="mx-auto w-full max-w-[56rem] px-5 pb-16 pt-6 sm:px-10 sm:pb-24 lg:max-w-[72rem] lg:px-14">
                    <div className="mx-auto h-px w-32 bg-gradient-to-r from-transparent via-zinc-500 to-transparent sm:w-40" aria-hidden />

                    <div className="mt-12 grid gap-10 text-left lg:mt-14 lg:grid-cols-2 lg:gap-x-16 lg:gap-y-0">
                            <div className="relative">
                                <Quote
                                    className="absolute -left-2 -top-4 h-8 w-8 text-brand-teal/30 sm:-left-4 sm:-top-5 sm:h-10 sm:w-10"
                                    aria-hidden
                                    strokeWidth={1.5}
                                />
                                <p className="relative pl-6 font-serif text-[clamp(1.35rem,2.8vw,1.85rem)] font-normal italic leading-[1.55] text-zinc-200 lg:leading-[1.5] [text-shadow:0_2px_20px_rgba(0,0,0,0.5)] sm:pl-8">
                                    {SITE_PULL_QUOTE}
                                </p>
                            </div>
                            <p className="font-sans text-[clamp(1.05rem,2.1vw,1.25rem)] font-normal leading-[1.75] text-zinc-300 lg:text-[1.35rem] lg:leading-[1.8]">
                                {SITE_HERO_LEAD}
                            </p>
                        </div>

                        <div
                            className="mt-16 grid grid-cols-1 gap-5 sm:grid-cols-3 lg:mt-20"
                            role="list"
                        >
                            {[
                                {
                                    t: 'Research',
                                    d: 'Live web research so you build from real markets and sources, not guesswork.',
                                    Icon: Search,
                                },
                                {
                                    t: 'Actions',
                                    d: 'Concrete suggestions for your venture — not only chat, but changes you can apply.',
                                    Icon: Wand2,
                                },
                                {
                                    t: 'A full team',
                                    d: 'Strategy, product, finance, GTM, and intel — one workspace, like a co-founding team.',
                                    Icon: Users,
                                },
                            ].map(({ t, d, Icon }) => (
                                <div
                                    key={t}
                                    role="listitem"
                                    className="group relative flex flex-col gap-3 overflow-hidden rounded-2xl border border-zinc-800/80 bg-gradient-to-b from-zinc-900/50 to-black/40 p-6 text-left backdrop-blur-[3px] transition-all duration-300 hover:-translate-y-1 hover:border-brand-teal/40 hover:shadow-[0_20px_50px_-20px_rgba(116,86,255,0.35)] sm:min-h-[170px]"
                                >
                                    <span
                                        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-teal/60 to-transparent opacity-60 transition-opacity duration-300 group-hover:opacity-100"
                                        aria-hidden
                                    />
                                    <span
                                        className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-brand-teal/10 blur-3xl opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                                        aria-hidden
                                    />
                                    <span className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl border border-brand-teal/25 bg-brand-teal/10 text-brand-teal shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] transition-transform duration-300 group-hover:scale-105">
                                        <Icon className="h-[18px] w-[18px]" aria-hidden strokeWidth={2.2} />
                                    </span>
                                    <span className="relative font-sans text-[11px] font-bold uppercase tracking-[0.22em] text-brand-teal/80">Capability</span>
                                    <span className="relative font-sans text-[18px] font-bold leading-tight text-zinc-50">{t}</span>
                                    <span className="relative font-sans text-[15px] font-normal leading-relaxed text-zinc-400">{d}</span>
                                </div>
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
                        <div className="inline-flex items-center rounded-full border border-zinc-700/60 bg-black/50 p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_8px_30px_-12px_rgba(0,0,0,0.6)] backdrop-blur-md">
                            <button
                                type="button"
                                onClick={() => setLandingBilling('monthly')}
                                className={`rounded-full px-5 py-2 font-sans text-[13px] font-semibold transition-all duration-200 ${
                                    landingBilling === 'monthly'
                                        ? 'bg-gradient-to-b from-zinc-700 to-zinc-800 text-white shadow-[0_2px_12px_-2px_rgba(116,86,255,0.25)]'
                                        : 'text-zinc-500 hover:text-zinc-300'
                                }`}
                            >
                                Monthly
                            </button>
                            <button
                                type="button"
                                onClick={() => setLandingBilling('yearly')}
                                className={`flex items-center gap-2 rounded-full px-5 py-2 font-sans text-[13px] font-semibold transition-all duration-200 ${
                                    landingBilling === 'yearly'
                                        ? 'bg-gradient-to-b from-zinc-700 to-zinc-800 text-white shadow-[0_2px_12px_-2px_rgba(116,86,255,0.25)]'
                                        : 'text-zinc-500 hover:text-zinc-300'
                                }`}
                            >
                                Yearly
                                <span className="rounded-full bg-gradient-to-r from-amber-400/25 to-amber-300/25 px-2 py-0.5 font-sans text-[10px] font-bold uppercase tracking-wider text-amber-300 ring-1 ring-inset ring-amber-400/20">
                                    Save 17%
                                </span>
                            </button>
                        </div>
                    </div>

                    {/* Plan cards */}
                    <div className="mx-auto grid max-w-3xl gap-4 sm:grid-cols-2">

                        {/* Free card */}
                        <div className="group flex flex-col rounded-2xl border border-zinc-800 bg-gradient-to-b from-zinc-950 to-black p-6 shadow-[0_12px_32px_-24px_rgba(0,0,0,0.8)] transition-all duration-300 hover:-translate-y-0.5 hover:border-zinc-700 hover:shadow-[0_20px_40px_-24px_rgba(0,0,0,0.9)]">
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
                                        <span className="font-semibold text-zinc-200">Full workspace</span> — all desks,
                                        Dexo chat &amp; analysis, staff sync, calendar, ventures, and tools.
                                    </span>
                                </li>
                                <li className="flex items-start gap-2.5 font-sans text-[13px] leading-relaxed text-zinc-400">
                                    <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-zinc-500" aria-hidden />
                                    <span>
                                        <span className="font-semibold text-zinc-200">Metered AI</span> — {LANDING_FREE_METERING}
                                    </span>
                                </li>
                                <li className="flex items-start gap-2.5 font-sans text-[13px] leading-relaxed text-zinc-500">
                                    <span className="mt-0.5 shrink-0 font-sans text-[11px] font-bold text-zinc-600" aria-hidden>
                                        —
                                    </span>
                                    <span>
                                        <span className="font-semibold text-zinc-400">Dexo daily research reports</span>{' '}
                                        (web-backed briefs, history, Dashboard tab) —{' '}
                                        <span className="text-zinc-500">Co-Founder Pro</span> only.
                                    </span>
                                </li>
                            </ul>
                            <button
                                type="button"
                                onClick={continueWithoutSigningIn}
                                className="group/free mt-6 w-full rounded-xl border border-zinc-700 bg-gradient-to-b from-zinc-900 to-zinc-950 py-3 font-sans text-[14px] font-semibold text-zinc-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition-all hover:-translate-y-px hover:border-zinc-600 hover:bg-gradient-to-b hover:from-zinc-800 hover:to-zinc-900 hover:text-white hover:shadow-[0_8px_24px_-12px_rgba(0,0,0,0.8)]"
                            >
                                Get started free
                            </button>
                        </div>

                        {/* Pro card */}
                        <div className="group relative flex flex-col overflow-hidden rounded-2xl border border-brand-teal/35 bg-gradient-to-b from-zinc-900/90 via-zinc-950 to-black p-6 shadow-[0_24px_60px_-28px_rgba(116,86,255,0.45),0_16px_40px_-24px_rgba(0,0,0,0.8)] transition-all duration-300 hover:-translate-y-0.5 hover:border-brand-teal/55 hover:shadow-[0_28px_70px_-24px_rgba(116,86,255,0.55)]">
                            {/* Recommended badge */}
                            <div className="absolute -top-px left-1/2 -translate-x-1/2">
                                <span className="inline-flex items-center gap-1.5 rounded-b-full border border-t-0 border-brand-teal/40 bg-gradient-to-b from-brand-teal/25 to-brand-teal/10 px-3 py-1 font-sans text-[10px] font-bold uppercase tracking-[0.18em] text-white backdrop-blur-sm">
                                    <Sparkles className="h-3 w-3 text-brand-teal" aria-hidden />
                                    Recommended
                                </span>
                            </div>
                            {/* Ambient glow */}
                            <span
                                className="pointer-events-none absolute -right-20 -top-20 h-60 w-60 rounded-full bg-brand-teal/15 blur-3xl"
                                aria-hidden
                            />
                            <span
                                className="pointer-events-none absolute -bottom-24 -left-16 h-56 w-56 rounded-full bg-[#8b74ff]/10 blur-3xl"
                                aria-hidden
                            />
                            <div className="relative flex flex-1 flex-col pt-3">
                                <div className="flex items-center gap-2">
                                    <Sparkles className="h-3.5 w-3.5 text-brand-teal" aria-hidden />
                                    <p className="font-sans text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-200">
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
                                    <div className="flex gap-3 rounded-xl border border-cyan-500/20 bg-cyan-500/[0.06] p-3.5">
                                        <Globe className="mt-0.5 h-4 w-4 shrink-0 text-cyan-300" aria-hidden />
                                        <div>
                                            <p className="font-sans text-[12px] font-semibold leading-snug text-zinc-100">
                                                Dexo daily research reports
                                            </p>
                                            <p className="mt-1 font-sans text-[11px] leading-snug text-zinc-400">
                                                Automated daily brief with live web research, dual-model synthesis, saved
                                                history, optional venture updates — including the Dashboard &quot;Daily
                                                brief&quot; tab.
                                            </p>
                                        </div>
                                    </div>
                                    <p className="font-sans text-[12px] leading-relaxed text-zinc-500">
                                        Same desks, ventures, and data as Founder — plus unlimited AI and daily research
                                        reports.
                                    </p>
                                </div>

                                <button
                                    type="button"
                                    onClick={scrollToHeroAuth}
                                    className="group/btn relative mt-5 inline-flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-b from-white to-zinc-100 py-3 font-sans text-[14px] font-bold text-zinc-900 shadow-[0_4px_28px_rgba(116,86,255,0.35),inset_0_1px_0_rgba(255,255,255,0.8)] transition-all hover:from-white hover:to-white hover:shadow-[0_6px_32px_rgba(116,86,255,0.5)] active:scale-[0.98]"
                                >
                                    <span
                                        className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-brand-teal/20 to-transparent transition-transform duration-700 group-hover/btn:translate-x-full"
                                        aria-hidden
                                    />
                                    <Sparkles className="relative h-4 w-4 shrink-0" aria-hidden />
                                    <span className="relative">
                                        {landingBilling === 'monthly'
                                            ? `Get Pro - ${formatRegionalPricePair(PRO_BILLING.monthlyInr, pricingRegion, { usdDecimals: 0 }).primary}/mo`
                                            : `Get Pro - ${formatRegionalPricePair(PRO_BILLING.yearlyInr, pricingRegion, { usdDecimals: 2 }).primary}/yr`}
                                    </span>
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

        </div>
    );
}


