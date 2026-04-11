'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Brain, Check, Mail, Lock, Network, Target, User, Shield, Volume2, VolumeX } from 'lucide-react';

/** Default hero video — `public/landing-hero-demo.mp4`. Override with `NEXT_PUBLIC_LANDING_HERO_VIDEO_URL` (full URL). */
export const LANDING_HERO_VIDEO_DEFAULT = '/landing-hero-demo.mp4';

const FREE_PRICING_ITEMS = [
    'All 11 AI desks and rooms',
    'Unlimited ventures',
    'Personal Assistant + Meeting Room',
    'Strategy, Finance, Product & GTM desks',
    'Wargame Nexus (1 round)',
    'VC Gauntlet — pitch practice',
    'Intelligence Suite & Reports',
    'Manual executive briefings on demand',
    'Calendar, Kanban & Pitch Forge',
];

const LANDING_PRO_FEATURES = [
    {
        icon: Brain,
        name: 'Executive Briefing Autopilot',
        desc: 'Daily AI brief auto-delivered every morning — progress, risks flagged, priorities, and market intel without asking.',
    },
    {
        icon: Target,
        name: 'Wargame Multi-Round Simulation',
        desc: 'Full adversarial simulation with competitor counter-moves, board stress-test mode, and downloadable scenario reports.',
    },
    {
        icon: Network,
        name: 'Cross-Venture Intelligence',
        desc: 'AI layer that finds patterns, conflicts, and synergies across all your ventures simultaneously — portfolio-level decisions.',
    },
] as const;

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
                            The AI C-Suite for solo founders
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
                                <p className="font-sans text-[10px] font-bold uppercase tracking-[0.28em] text-brand-teal sm:text-[11px]">
                                    The AI C-Suite for solo founders
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
                                    Five AI executives — strategy, finance, product, GTM, and market intelligence — coordinated on one venture record. Run your company like a funded team, without the headcount.
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
                            The AI that runs your company, not just your tasks
                        </h1>
                    </div>
                </section>

                <section className="mx-auto w-full max-w-[56rem] px-5 pb-16 pt-6 sm:px-10 sm:pb-24 lg:max-w-[72rem] lg:px-14">
                    <div className="mx-auto h-px w-32 bg-gradient-to-r from-transparent via-zinc-500 to-transparent sm:w-40" aria-hidden />

                    <div className="mt-12 grid gap-10 text-left lg:mt-14 lg:grid-cols-2 lg:gap-x-16 lg:gap-y-0">
                            <p className="font-serif text-[clamp(1.35rem,2.8vw,1.85rem)] font-normal italic leading-[1.55] text-zinc-200 lg:leading-[1.5] [text-shadow:0_2px_20px_rgba(0,0,0,0.5)]">
                                Every other AI answers questions. DEEPCHOX runs operations.
                            </p>
                            <p className="font-sans text-[clamp(1.05rem,2.1vw,1.25rem)] font-normal leading-[1.75] text-zinc-300 lg:text-[1.35rem] lg:leading-[1.8]">
                                Five specialist desks — strategy, finance, product, GTM, market intel — all coordinated on one venture record. Each desk knows what the others are doing. The founder gets a full company view, not five disconnected chat windows.
                            </p>
                        </div>

                        <div
                            className="mt-16 grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-5 lg:mt-20"
                            role="list"
                        >
                            {[
                                { t: 'Coordinated AI team', d: 'Five executives. One venture record. All aligned.' },
                                { t: 'Decisions, not chat', d: 'Each desk gives a call, not a list of options' },
                                { t: 'Built for solo founders', d: 'One person running a whole company — this is for you' },
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
                    className="mx-auto w-full max-w-[66rem] px-5 pb-32 pt-4 sm:px-10 sm:pb-40 lg:px-14"
                >
                    <div
                        className="mx-auto mb-16 h-px w-48 bg-gradient-to-r from-transparent via-zinc-600/80 to-transparent"
                        aria-hidden
                    />

                    {/* Section heading */}
                    <div className="mb-12 text-center">
                        <p className="font-sans text-[10px] font-bold uppercase tracking-[0.32em] text-brand-teal">
                            Pricing
                        </p>
                        <h2 className="font-[family-name:var(--font-brand-display)] mx-auto mt-4 text-[clamp(2rem,5vw,3.25rem)] font-semibold leading-[1.05] tracking-[-0.025em] text-white">
                            Start free.{' '}
                            <span className="text-zinc-500">Go Pro when you mean it.</span>
                        </h2>
                        <p className="mx-auto mt-4 max-w-[36rem] font-sans text-[15px] leading-relaxed text-zinc-500">
                            Every desk, room, and tool — free forever. Pro adds three automated intelligence
                            features that run your company while you focus elsewhere.
                        </p>
                    </div>

                    {/* Billing toggle */}
                    <div className="mb-8 flex flex-col items-center gap-2">
                        <div className="inline-flex items-center rounded-full border border-zinc-800 p-1">
                            <button
                                type="button"
                                onClick={() => setLandingBilling('monthly')}
                                className={`rounded-full px-6 py-2 font-sans text-[13px] font-medium transition-all ${
                                    landingBilling === 'monthly'
                                        ? 'bg-zinc-800 text-white'
                                        : 'text-zinc-500 hover:text-zinc-300'
                                }`}
                            >
                                Monthly
                            </button>
                            <button
                                type="button"
                                onClick={() => setLandingBilling('yearly')}
                                className={`flex items-center gap-2 rounded-full px-6 py-2 font-sans text-[13px] font-medium transition-all ${
                                    landingBilling === 'yearly'
                                        ? 'bg-zinc-800 text-white'
                                        : 'text-zinc-500 hover:text-zinc-300'
                                }`}
                            >
                                Yearly
                                <span className="rounded bg-white/10 px-1.5 py-0.5 font-sans text-[10px] font-semibold text-zinc-400">
                                    –17%
                                </span>
                            </button>
                        </div>
                        {landingBilling === 'yearly' && (
                            <p className="font-sans text-[12px] text-zinc-500">
                                Save &#8377;601 vs monthly billing
                            </p>
                        )}
                    </div>

                    {/* Plan cards */}
                    <div className="mx-auto grid max-w-3xl items-stretch gap-4 sm:grid-cols-2">

                        {/* ── Free card ── */}
                        <div className="flex flex-col rounded-2xl border border-zinc-800 p-7">
                            <p className="font-sans text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-600">
                                Founder
                            </p>
                            <p className="mt-4 font-sans text-[44px] font-semibold leading-none tracking-tight text-white">
                                Free
                            </p>
                            <p className="mt-2 font-sans text-[13px] text-zinc-600">
                                forever &mdash; no credit card required
                            </p>

                            <div className="my-6 h-px bg-zinc-800" />

                            <ul className="flex-1 space-y-2.5">
                                {FREE_PRICING_ITEMS.map((item) => (
                                    <li
                                        key={item}
                                        className="flex items-center gap-3 font-sans text-[13px] text-zinc-500"
                                    >
                                        <Check className="h-3.5 w-3.5 shrink-0 text-zinc-600" aria-hidden />
                                        {item}
                                    </li>
                                ))}
                            </ul>

                            <button
                                type="button"
                                onClick={continueAsGuest}
                                className="mt-7 w-full rounded-xl border border-zinc-700 py-3 font-sans text-[14px] font-medium text-zinc-400 transition hover:border-zinc-500 hover:text-white active:scale-[0.98]"
                            >
                                Get started free
                            </button>
                        </div>

                        {/* ── Pro card — black ── */}
                        <div className="flex flex-col rounded-2xl border border-zinc-800 bg-black p-7">
                            <p className="font-sans text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
                                Co-Founder Pro
                            </p>

                            <div className="mt-4 flex items-end gap-2">
                                <span className="font-sans text-[44px] font-semibold leading-none tracking-tight text-white">
                                    ${landingBilling === 'monthly' ? '4' : '3.33'}
                                </span>
                                <span className="mb-1.5 font-sans text-[14px] text-zinc-500">/mo</span>
                                <span className="mb-1.5 font-sans text-[13px] text-zinc-600">
                                    (&#8377;{landingBilling === 'monthly' ? '300' : '250'})
                                </span>
                            </div>
                            <p className="mt-2 font-sans text-[13px] text-zinc-600">
                                {landingBilling === 'monthly'
                                    ? 'billed monthly \u00b7 cancel anytime'
                                    : '$40/yr (\u20b92,999) \u00b7 billed annually'}
                            </p>

                            <div className="my-6 h-px bg-zinc-800" />

                            <p className="mb-4 font-sans text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-600">
                                Pro-exclusive
                            </p>

                            <div className="flex-1 space-y-4">
                                {LANDING_PRO_FEATURES.map(({ icon: Icon, name, desc }) => (
                                    <div key={name} className="flex gap-3">
                                        <Icon className="mt-0.5 h-4 w-4 shrink-0 text-zinc-500" aria-hidden />
                                        <div>
                                            <p className="font-sans text-[13px] font-semibold leading-snug text-zinc-200">
                                                {name}
                                            </p>
                                            <p className="mt-0.5 font-sans text-[12px] leading-relaxed text-zinc-500">
                                                {desc}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <p className="mt-5 font-sans text-[12px] text-zinc-600">+ everything in Free</p>

                            <button
                                type="button"
                                onClick={onStart}
                                className="mt-5 w-full rounded-xl bg-gradient-to-r from-orange-500 to-white py-3.5 font-sans text-[14px] font-semibold text-zinc-900 transition hover:opacity-90 active:scale-[0.98]"
                            >
                                {landingBilling === 'monthly' ? 'Get Pro — $4/mo' : 'Get Pro — $40/yr'}
                            </button>
                            <p className="mt-2 text-center font-sans text-[11px] text-zinc-600">
                                Instant access &middot; cancel anytime
                            </p>
                        </div>

                    </div>
                </section>

                <footer className="mt-auto flex flex-col items-center gap-6 border-t border-zinc-800/80 px-5 py-12 text-center sm:flex-row sm:justify-between sm:px-12 sm:text-left">
                    <div className="[text-shadow:0_2px_20px_rgba(0,0,0,0.6)]">
                        <span className="font-sans text-[17px] font-semibold tracking-tight text-zinc-100">DEEPCHOX</span>
                        <span className="mt-2 block font-sans text-[14px] font-normal leading-relaxed text-zinc-500">
                            The AI C-Suite for solo founders · Run your company, not just your tasks
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

