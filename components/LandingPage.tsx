'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Check, Globe, Infinity, Sparkles } from 'lucide-react';
import { FREE_DAILY_TOKENS, TOKEN_COSTS } from '@/lib/tokens/tokenSystem';
import { formatRegionalPricePair, getProBillingAmounts } from '@/lib/billingConfig';
import { usePricingRegion } from '@/hooks/usePricingRegion';
import { SITE_HERO_H1, SITE_HERO_LEAD, SITE_PULL_QUOTE, SITE_TAGLINE_SHORT } from '@/lib/siteSeo';
import { LandingClerkAuth, LANDING_SIGN_IN_HREF, LANDING_SIGN_UP_HREF } from '@/components/LandingClerkAuth';
import { FaultyTerminal } from '@/components/FaultyTerminal';

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
    const pricingRef = useRef<HTMLElement>(null);

    useEffect(() => {
        setIsVisible(true);
    }, []);

    const continueWithoutSigningIn = () => {
        onContinueGuest();
    };

    return (
        <div className="relative z-[100] min-h-screen bg-[#030304] text-white">

            {/* ── FaultyTerminal WebGL background ── */}
            <div className="pointer-events-none fixed inset-0 z-0" aria-hidden>
                <FaultyTerminal
                    scale={1.5}
                    gridMul={[2, 1]}
                    digitSize={1.2}
                    timeScale={0.22}
                    scanlineIntensity={0.4}
                    glitchAmount={0.35}
                    flickerAmount={0.35}
                    noiseAmp={1}
                    chromaticAberration={0}
                    dither={0}
                    curvature={0.06}
                    tint="#8b7fe8"
                    mouseReact={true}
                    mouseStrength={0.35}
                    pageLoadAnimation={true}
                    brightness={0.38}
                />
                {/* Dark vignette overlay — keeps content readable */}
                <div
                    className="absolute inset-0"
                    style={{
                        background: 'radial-gradient(ellipse 110% 80% at 50% 50%, rgba(3,3,6,0.42) 0%, rgba(3,3,6,0.82) 75%, rgba(3,3,6,0.97) 100%)',
                    }}
                />
                {/* Soft violet top-left atmosphere */}
                <div
                    className="absolute inset-0"
                    style={{
                        background: 'radial-gradient(ellipse 60% 40% at 0% 0%, rgba(99,60,220,0.08) 0%, transparent 55%)',
                    }}
                />
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
                                    {/* Decorative overline */}
                                    <div className="mb-5 flex items-center gap-2.5">
                                        <span className="block h-px w-14 bg-zinc-700 sm:w-20" />
                                        <span className="block h-[7px] w-[7px] rotate-45 bg-brand-teal" aria-hidden />
                                        <span className="block h-px w-14 bg-zinc-700 sm:w-20" />
                                    </div>

                                    <div className="flex items-end gap-4 sm:gap-6">
                                        <span className="font-sans text-[clamp(2.25rem,13vw,8rem)] font-black tracking-[-0.025em] leading-[0.88] text-white">
                                            <span className="text-zinc-300/90">north</span><span className="text-brand-teal">ROSC</span>
                                        </span>
                                        {/* LABS badge — separated by left border rule */}
                                        <span className="mb-[0.1em] border-l-2 border-zinc-700 pl-3 font-sans text-[clamp(0.65rem,1.8vw,1rem)] font-black uppercase leading-tight tracking-[0.4em] text-zinc-500">
                                            LABS
                                        </span>
                                    </div>

                                    {/* Bottom rule */}
                                    <div className="mt-5 h-px w-48 bg-zinc-800 sm:w-64" />
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
                            className="relative z-[35] mx-auto mt-6 w-full max-w-sm scroll-mt-28 sm:mt-7 sm:max-w-md"
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
                            Move your cursor across the screen.{' '}
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
                        <div className="group relative flex flex-col overflow-hidden rounded-2xl border border-zinc-800/60 bg-gradient-to-b from-zinc-900/40 to-zinc-950/90 p-7 shadow-[0_12px_40px_-20px_rgba(0,0,0,0.6)] transition-all duration-300 hover:-translate-y-0.5 hover:border-zinc-700/70 hover:shadow-[0_20px_48px_-20px_rgba(0,0,0,0.75)]">
                            {/* Top accent */}
                            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-zinc-600/40 to-transparent" aria-hidden />

                            {/* Tier + price */}
                            <p className="font-sans text-[10px] font-semibold uppercase tracking-[0.22em] text-zinc-500">
                                Founder
                            </p>
                            <p className="mt-4 font-sans text-[40px] font-black leading-none tracking-tight text-white">
                                Free
                            </p>
                            <p className="mt-2 font-sans text-[12.5px] text-zinc-500">
                                Forever — no card, no catch
                            </p>

                            <div className="my-6 h-px bg-zinc-800/50" />

                            {/* Features */}
                            <ul className="flex-1 space-y-4">
                                <li className="flex items-start gap-3">
                                    <span className="mt-[3px] flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-zinc-800/80">
                                        <Check className="h-3 w-3 text-zinc-400" aria-hidden />
                                    </span>
                                    <span className="font-sans text-[13.5px] leading-relaxed text-zinc-400">
                                        <span className="font-medium text-zinc-200">Full workspace</span>
                                        <span className="mt-0.5 block text-[12px] text-zinc-500">Every desk, Dexo chat, daily briefs, staff sync, calendar, ventures &amp; tools</span>
                                    </span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <span className="mt-[3px] flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-zinc-800/80">
                                        <Check className="h-3 w-3 text-zinc-400" aria-hidden />
                                    </span>
                                    <span className="font-sans text-[13.5px] leading-relaxed text-zinc-400">
                                        <span className="font-medium text-zinc-200">{FREE_DAILY_TOKENS} AI tokens/day</span>
                                        <span className="mt-0.5 block text-[12px] text-zinc-500">Shared across Dexo chat and analysis — resets at midnight</span>
                                    </span>
                                </li>
                            </ul>

                            <button
                                type="button"
                                onClick={continueWithoutSigningIn}
                                className="mt-7 w-full rounded-xl border border-zinc-700/70 bg-zinc-900/80 py-3.5 font-sans text-[14px] font-semibold text-zinc-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition-all duration-200 hover:border-zinc-600 hover:bg-zinc-800 hover:text-white"
                            >
                                Start building — free
                            </button>
                            <p className="mt-3 text-center font-sans text-[11.5px] text-zinc-600">
                                No sign-up required to explore
                            </p>
                        </div>

                        {/* Pro card */}
                        <div className="group relative flex flex-col overflow-hidden rounded-2xl border border-brand-teal/25 bg-gradient-to-b from-[#0d0b1a] via-[#0b0b16] to-black p-7 shadow-[0_0_0_1px_rgba(116,86,255,0.05),0_24px_60px_-20px_rgba(116,86,255,0.28)] transition-all duration-300 hover:-translate-y-0.5 hover:border-brand-teal/40 hover:shadow-[0_0_0_1px_rgba(116,86,255,0.08),0_28px_70px_-18px_rgba(116,86,255,0.38)]">
                            {/* Ambient glow blobs */}
                            <span className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-brand-teal/8 blur-3xl" aria-hidden />
                            <span className="pointer-events-none absolute -bottom-20 -left-12 h-44 w-44 rounded-full bg-[#8b74ff]/8 blur-3xl" aria-hidden />

                            {/* Top gradient accent */}
                            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-teal/50 to-transparent" aria-hidden />

                            {/* Recommended badge */}
                            <div className="absolute -top-px left-1/2 -translate-x-1/2">
                                <span className="inline-flex items-center gap-1.5 rounded-b-full border border-t-0 border-brand-teal/30 bg-gradient-to-b from-brand-teal/15 to-brand-teal/5 px-3.5 py-1 font-sans text-[10px] font-semibold uppercase tracking-[0.18em] text-white/80 backdrop-blur-sm">
                                    <Sparkles className="h-2.5 w-2.5 text-brand-teal" aria-hidden />
                                    Recommended
                                </span>
                            </div>

                            <div className="relative flex flex-1 flex-col pt-3">
                                {/* Tier label */}
                                <div className="flex items-center gap-2">
                                    <Sparkles className="h-3 w-3 text-brand-teal/70" aria-hidden />
                                    <p className="font-sans text-[10px] font-semibold uppercase tracking-[0.22em] text-brand-teal/70">
                                        Co-Founder Pro
                                    </p>
                                </div>

                                {/* Price */}
                                <div className="mt-4 flex items-end gap-2">
                                    <p className="font-sans text-[40px] font-black leading-none tracking-tight text-white">
                                        {formatRegionalPricePair(PRO_BILLING.monthlyInr, pricingRegion, { usdDecimals: 0 }).primary}
                                    </p>
                                    <span className="mb-2 font-sans text-[14px] text-zinc-500">/mo</span>
                                </div>
                                <p className="mt-1.5 font-sans text-[12.5px] text-zinc-500">
                                    {formatRegionalPricePair(PRO_BILLING.monthlyInr, pricingRegion, { usdDecimals: 0 }).secondary} &middot; billed monthly &middot; cancel anytime
                                </p>

                                <div className="my-6 h-px bg-gradient-to-r from-transparent via-zinc-800/60 to-transparent" />

                                {/* Feature highlight blocks */}
                                <div className="flex flex-1 flex-col gap-3">
                                    <div className="flex gap-3.5 rounded-xl border border-brand-teal/15 bg-brand-teal/[0.05] p-4 transition-colors duration-200 group-hover:border-brand-teal/25 group-hover:bg-brand-teal/[0.08]">
                                        <Infinity className="mt-0.5 h-4 w-4 shrink-0 text-brand-teal/80" aria-hidden />
                                        <div>
                                            <p className="font-sans text-[13px] font-semibold leading-snug text-zinc-100">
                                                Unlimited AI — no daily cap
                                            </p>
                                            <p className="mt-1.5 font-sans text-[12px] leading-relaxed text-zinc-400">
                                                Dexo, analyses, and chat run freely — no meter, no resets.
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex gap-3.5 rounded-xl border border-[#8b74ff]/15 bg-[#8b74ff]/[0.04] p-4 transition-colors duration-200 group-hover:border-[#8b74ff]/25 group-hover:bg-[#8b74ff]/[0.07]">
                                        <Globe className="mt-0.5 h-4 w-4 shrink-0 text-[#9d88ff]/80" aria-hidden />
                                        <div>
                                            <p className="font-sans text-[13px] font-semibold leading-snug text-zinc-100">
                                                Advanced simulations
                                            </p>
                                            <p className="mt-1.5 font-sans text-[12px] leading-relaxed text-zinc-400">
                                                Wargame multi-round + cross-venture intelligence for portfolio-level decisions.
                                            </p>
                                        </div>
                                    </div>
                                    <p className="px-0.5 font-sans text-[12px] leading-relaxed text-zinc-500">
                                        Everything in Founder — Pro just removes the ceiling.
                                    </p>
                                </div>

                                {/* CTA */}
                                <a
                                    href={LANDING_SIGN_UP_HREF}
                                    className="group/btn relative mt-6 inline-flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-b from-white to-zinc-100 py-3.5 font-sans text-[14px] font-bold text-zinc-900 shadow-[0_4px_24px_rgba(116,86,255,0.25),inset_0_1px_0_rgba(255,255,255,0.9)] transition-all duration-200 hover:shadow-[0_6px_32px_rgba(116,86,255,0.4)] active:scale-[0.98]"
                                >
                                    <span
                                        className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-brand-teal/12 to-transparent transition-transform duration-700 group-hover/btn:translate-x-full"
                                        aria-hidden
                                    />
                                    <Sparkles className="relative h-4 w-4 shrink-0" aria-hidden />
                                    <span className="relative">
                                        {`Upgrade to Pro — ${formatRegionalPricePair(PRO_BILLING.monthlyInr, pricingRegion, { usdDecimals: 0 }).primary}/mo`}
                                    </span>
                                </a>
                                <p className="mt-3 text-center font-sans text-[11.5px] text-zinc-600">
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


