'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Check, Globe, Infinity, Sparkles } from 'lucide-react';
import { FREE_DAILY_TOKENS, TOKEN_COSTS } from '@/lib/tokens/tokenSystem';
import { formatRegionalPricePair, getProBillingAmounts } from '@/lib/billingConfig';
import { usePricingRegion } from '@/hooks/usePricingRegion';
import { SITE_HERO_H1, SITE_HERO_LEAD, SITE_PULL_QUOTE, SITE_TAGLINE_SHORT } from '@/lib/siteSeo';
import { LandingClerkAuth, LANDING_SIGN_IN_HREF, LANDING_SIGN_UP_HREF } from '@/components/LandingClerkAuth';

/** @deprecated Hero is Clerk sign-in; kept for older imports / env docs. */
export const LANDING_HERO_VIDEO_DEFAULT = '/landing-hero-demo.mp4';


interface LandingPageProps {
    /** Enter the app without signing in; creating a venture will prompt for login. */
    onContinueGuest: () => void;
}

export function LandingPage({ onContinueGuest }: LandingPageProps) {
    const pricingRegion = usePricingRegion();
    const PRO_BILLING = getProBillingAmounts();

    const [isVisible, setIsVisible] = useState(false);
    /** Normalized pointer 0–100 for CSS-driven background parallax */
    const [bgPointer, setBgPointer] = useState({ x: 50, y: 32 });
    const pricingRef = useRef<HTMLElement>(null);

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
                            <a
                                href={LANDING_SIGN_IN_HREF}
                                className="rounded-md px-3 py-2.5 font-sans text-[16px] font-semibold leading-none text-zinc-300 transition-colors hover:text-white"
                            >
                                Log in
                            </a>
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
                                    <div className="flex items-baseline gap-4 sm:gap-6">
                                        <span className="font-sans text-[clamp(3.75rem,13vw,8rem)] font-black tracking-[-0.01em] text-white [text-shadow:0_0_60px_rgba(255,255,255,0.08)]">
                                            north<span className="text-brand-teal [text-shadow:0_0_48px_rgba(116,86,255,0.45)]">ROSC</span>
                                        </span>
                                        <span className="font-sans text-[clamp(1.75rem,5.5vw,3.25rem)] font-black tracking-[0.28em] text-zinc-400">
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

                        {/* Auth — links to `/sign-in` & `/sign-up` (path routing; OAuth works reliably there) */}
                        <div
                            id="landing-auth"
                            className="relative z-[35] mx-auto mt-6 w-full max-w-md scroll-mt-28 sm:mt-7"
                        >
                            <div className="rounded-2xl border border-white/15 bg-white p-4 shadow-[0_24px_48px_rgba(0,0,0,0.35)] sm:p-5">
                                <LandingClerkAuth />
                            </div>
                            <div className="mt-4 flex flex-col items-center gap-2">
                                <button
                                    type="button"
                                    onClick={continueWithoutSigningIn}
                                    className="rounded-full border border-zinc-500/55 bg-zinc-900/40 px-4 py-2 font-sans text-[12px] font-semibold text-zinc-200 transition hover:border-zinc-400/80 hover:bg-zinc-800/60 hover:text-white sm:text-[13px]"
                                >
                                    Continue without signing in
                                </button>
                                <p className="max-w-sm text-center font-sans text-[11px] leading-snug text-zinc-500">
                                    Browse first. You'll be asked to sign in when you add a venture.
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
                            Your co-founding team. One flat price.
                        </h2>
                        <p className="mx-auto mt-3 max-w-lg font-sans text-[15px] leading-relaxed text-zinc-400">
                            Start with everything — no card, no trial. Upgrade only when you want
                            to remove the daily AI limit and unlock research reports.
                        </p>
                    </div>


                    {/* Plan cards */}
                    <div className="mx-auto grid max-w-3xl gap-4 sm:grid-cols-2">

                        {/* Free card */}
                        <div className="group relative flex flex-col overflow-hidden rounded-2xl border border-zinc-800/80 bg-gradient-to-b from-zinc-900/60 to-zinc-950 p-6 shadow-[0_12px_40px_-20px_rgba(0,0,0,0.7)] transition-all duration-300 hover:-translate-y-0.5 hover:border-zinc-700 hover:shadow-[0_20px_48px_-20px_rgba(0,0,0,0.8)]">
                            {/* Top accent */}
                            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-zinc-600/60 to-transparent" aria-hidden />

                            {/* Tier + price */}
                            <p className="font-sans text-[10px] font-bold uppercase tracking-[0.24em] text-zinc-500">
                                Founder
                            </p>
                            <div className="mt-3 flex items-end gap-2">
                                <p className="font-sans text-[38px] font-black leading-none tracking-tight text-white">
                                    Free
                                </p>
                            </div>
                            <p className="mt-1.5 font-sans text-[12px] text-zinc-600">
                                Forever — no credit card, no catch
                            </p>

                            <div className="my-5 h-px bg-zinc-800/60" />

                            {/* Features */}
                            <ul className="flex-1 space-y-3.5">
                                <li className="flex items-start gap-3">
                                    <span className="mt-0.5 flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full bg-zinc-800">
                                        <Check className="h-2.5 w-2.5 text-zinc-400" aria-hidden />
                                    </span>
                                    <span className="font-sans text-[13px] leading-relaxed text-zinc-400">
                                        <span className="font-semibold text-zinc-200">Full workspace</span> — every desk, Dexo chat &amp; analysis, staff sync, calendar, ventures, and tools
                                    </span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <span className="mt-0.5 flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full bg-zinc-800">
                                        <Check className="h-2.5 w-2.5 text-zinc-400" aria-hidden />
                                    </span>
                                    <span className="font-sans text-[13px] leading-relaxed text-zinc-400">
                                        <span className="font-semibold text-zinc-200">Daily AI tokens</span> — {FREE_DAILY_TOKENS} tokens/day · {TOKEN_COSTS.ANALYSIS} per analysis · {TOKEN_COSTS.CHAT_MESSAGE} per message
                                    </span>
                                </li>
                                <li className="flex items-start gap-3 opacity-50">
                                    <span className="mt-0.5 flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full bg-zinc-800/50">
                                        <span className="h-1.5 w-1.5 rounded-full bg-zinc-600" />
                                    </span>
                                    <span className="font-sans text-[13px] leading-relaxed text-zinc-500">
                                        Daily research reports — Pro only
                                    </span>
                                </li>
                            </ul>

                            <button
                                type="button"
                                onClick={continueWithoutSigningIn}
                                className="mt-6 w-full rounded-xl border border-zinc-700/80 bg-zinc-900 py-3 font-sans text-[14px] font-semibold text-zinc-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition-all duration-200 hover:border-zinc-600 hover:bg-zinc-800 hover:text-white hover:shadow-[0_4px_20px_-8px_rgba(0,0,0,0.6)]"
                            >
                                Start building — free
                            </button>
                            <p className="mt-2.5 text-center font-sans text-[11px] text-zinc-600">
                                No sign-up required to explore
                            </p>
                        </div>

                        {/* Pro card */}
                        <div className="group relative flex flex-col overflow-hidden rounded-2xl border border-brand-teal/30 bg-gradient-to-b from-[#0d0b1a] via-zinc-950 to-black p-6 shadow-[0_0_0_1px_rgba(116,86,255,0.06),0_24px_60px_-20px_rgba(116,86,255,0.35)] transition-all duration-300 hover:-translate-y-0.5 hover:border-brand-teal/50 hover:shadow-[0_0_0_1px_rgba(116,86,255,0.1),0_28px_70px_-18px_rgba(116,86,255,0.45)]">
                            {/* Ambient glow blobs */}
                            <span className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-brand-teal/12 blur-3xl" aria-hidden />
                            <span className="pointer-events-none absolute -bottom-20 -left-12 h-44 w-44 rounded-full bg-[#8b74ff]/10 blur-3xl" aria-hidden />

                            {/* Top gradient accent */}
                            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-teal/70 to-transparent" aria-hidden />

                            {/* Recommended badge */}
                            <div className="absolute -top-px left-1/2 -translate-x-1/2">
                                <span className="inline-flex items-center gap-1.5 rounded-b-full border border-t-0 border-brand-teal/35 bg-gradient-to-b from-brand-teal/20 to-brand-teal/8 px-3.5 py-1 font-sans text-[10px] font-bold uppercase tracking-[0.18em] text-white/90 backdrop-blur-sm">
                                    <Sparkles className="h-2.5 w-2.5 text-brand-teal" aria-hidden />
                                    Recommended
                                </span>
                            </div>

                            <div className="relative flex flex-1 flex-col pt-3">
                                {/* Tier label */}
                                <div className="flex items-center gap-2">
                                    <Sparkles className="h-3.5 w-3.5 text-brand-teal/80" aria-hidden />
                                    <p className="font-sans text-[10px] font-bold uppercase tracking-[0.24em] text-brand-teal/80">
                                        Co-Founder Pro
                                    </p>
                                </div>

                                {/* Price */}
                                <div className="mt-3 flex items-end gap-2">
                                    <p className="font-sans text-[38px] font-black leading-none tracking-tight text-white">
                                        {formatRegionalPricePair(PRO_BILLING.monthlyInr, pricingRegion, { usdDecimals: 0 }).primary}
                                    </p>
                                    <span className="mb-1.5 font-sans text-[15px] text-zinc-500">/mo</span>
                                </div>
                                <p className="mt-1 font-sans text-[12px] text-zinc-600">
                                    {formatRegionalPricePair(PRO_BILLING.monthlyInr, pricingRegion, { usdDecimals: 0 }).secondary} &middot; billed monthly &middot; cancel anytime
                                </p>

                                <div className="my-5 h-px bg-gradient-to-r from-transparent via-zinc-800 to-transparent" />

                                {/* Feature highlight blocks */}
                                <div className="flex flex-1 flex-col gap-3">
                                    <div className="flex gap-3 rounded-xl border border-brand-teal/20 bg-brand-teal/[0.06] p-3.5 transition-colors duration-200 group-hover:border-brand-teal/30 group-hover:bg-brand-teal/[0.09]">
                                        <Infinity className="mt-0.5 h-4 w-4 shrink-0 text-brand-teal" aria-hidden />
                                        <div>
                                            <p className="font-sans text-[12px] font-semibold leading-snug text-zinc-100">
                                                Unlimited AI — no daily cap
                                            </p>
                                            <p className="mt-1 font-sans text-[11px] leading-snug text-zinc-400">
                                                Dexo, analyses, and chat run freely. Same workspace as Founder — just no meter watching you.
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex gap-3 rounded-xl border border-[#8b74ff]/20 bg-[#8b74ff]/[0.05] p-3.5 transition-colors duration-200 group-hover:border-[#8b74ff]/30 group-hover:bg-[#8b74ff]/[0.09]">
                                        <Globe className="mt-0.5 h-4 w-4 shrink-0 text-[#9d88ff]" aria-hidden />
                                        <div>
                                            <p className="font-sans text-[12px] font-semibold leading-snug text-zinc-100">
                                                Daily research reports
                                            </p>
                                            <p className="mt-1 font-sans text-[11px] leading-snug text-zinc-400">
                                                Automated live-web brief every morning — dual-model synthesis, saved history, venture updates, Dashboard tab.
                                            </p>
                                        </div>
                                    </div>
                                    <p className="font-sans text-[11.5px] leading-relaxed text-zinc-500">
                                        Every desk, venture, and tool from Founder — Pro just removes the ceiling.
                                    </p>
                                </div>

                                {/* CTA */}
                                <a
                                    href={LANDING_SIGN_UP_HREF}
                                    className="group/btn relative mt-5 inline-flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-b from-white to-zinc-100 py-3.5 font-sans text-[14px] font-bold text-zinc-900 shadow-[0_4px_28px_rgba(116,86,255,0.3),inset_0_1px_0_rgba(255,255,255,0.9)] transition-all duration-200 hover:shadow-[0_6px_32px_rgba(116,86,255,0.48)] active:scale-[0.98]"
                                >
                                    <span
                                        className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-brand-teal/15 to-transparent transition-transform duration-700 group-hover/btn:translate-x-full"
                                        aria-hidden
                                    />
                                    <Sparkles className="relative h-4 w-4 shrink-0" aria-hidden />
                                    <span className="relative">
                                        {`Upgrade to Pro — ${formatRegionalPricePair(PRO_BILLING.monthlyInr, pricingRegion, { usdDecimals: 0 }).primary}/mo`}
                                    </span>
                                </a>
                                <p className="mt-2.5 text-center font-sans text-[10.5px] text-zinc-600">
                                    Instant access &middot; cancel anytime &middot; no questions asked
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                <footer className="mt-auto flex flex-col items-center gap-6 border-t border-zinc-800/80 px-5 py-12 text-center sm:flex-row sm:justify-between sm:px-12 sm:text-left">
                    <div className="[text-shadow:0_2px_20px_rgba(0,0,0,0.6)]">
                        <div className="flex items-baseline gap-2.5">
                            <span className="font-sans text-[30px] font-black tracking-[-0.01em] text-white">
                                north<span className="text-brand-teal">ROSC</span>
                            </span>
                            <span className="font-sans text-[17px] font-black tracking-[0.22em] text-zinc-400">
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


