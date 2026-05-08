'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ChevronDown, Cpu, Users, Building2, Mic, Orbit } from 'lucide-react';

const GUIDE_NAV = [
    { id: 'guide-intro', label: 'Overview' },
    { id: 'guide-loop', label: 'Solo-founder loop' },
    { id: 'guide-agents', label: 'How agents behave' },
    { id: 'guide-dexo', label: 'Deepchox room' },
    { id: 'guide-orb', label: 'Floating orb' },
    { id: 'guide-ai', label: 'Claude × GPT' },
    { id: 'guide-faq', label: 'FAQ' },
] as const;

const faqItems = [
    {
        q: 'Which AI models power Deepchox?',
        a: 'Deepchox runs a **Claude × GPT dual stack**. **OpenAI GPT** powers desk agents (CEO, CFO, PM, CMO, Scout) with role-specific prompts. **Anthropic Claude** runs in parallel on **staff sync** alongside GPT so both model families contribute to merged desk briefs. The **Deepchox Intelligence Room** adds a dedicated analysis pass across your venture fields. Routing is automatic — you never pick a provider.',
    },
    {
        q: 'What is Deepchox and how is it different from the desk agents?',
        a: '**Deepchox** is an ambient intelligence room, not a desk. While desk agents answer domain questions on demand, Deepchox reads your entire venture record and produces a **cross-functional analysis** covering strategy gaps, product risks, financial flags, and market signals in one pass. It speaks results aloud in a **Jarvis-style voice** and surfaces prioritised next actions.',
    },
    {
        q: 'Can I talk to Deepchox while it is still analysing?',
        a: 'Yes. Deepchox uses **non-blocking analysis** — the message bar and voice input are active the moment you enter the room. You can ask follow-up questions or speak a prompt before the first report finishes. The analysis runs in the background and the conversation thread updates when it completes.',
    },
    {
        q: 'How do I interrupt Deepchox while it is speaking?',
        a: 'Tap the **microphone button** or speak at any point — Deepchox cancels the current speech, registers your interrupt in the conversation thread, and immediately processes your input. You can also tap the **Mute** button to silence the voice while the text report remains on screen.',
    },
    {
        q: 'How is the virtual office meant to work for a solo founder?',
        a: 'You operate as the single decision-maker. Deepchox gives you **desks** where **AI roles act as teammates** (strategy, product, finance, market, GTM, and more): each produces outputs in one venture record so context never splits across tools. **Deepchox** sits above the desks as an ambient layer that synthesises all of it.',
    },
    {
        q: 'How do the agents behave?',
        a: "Each AI teammate is **role-bound**: they answer from their desk's mandate—strategy narrative, finance numbers, product delivery, market signal—not as a generic chatbot. **Staff sync** refreshes all desk briefs from the same snapshot and can merge updates into your venture.",
    },
    {
        q: 'What do I do first after entering the workspace?',
        a: 'Complete **venture onboarding** so intent and scope exist. Then open the **dashboard** and move between desks as your week demands; run **AI staff sync** when you want the model stack to refresh intel into your venture. Open **Deepchox** whenever you want a full cross-functional read of where the venture stands.',
    },
];

function FaqAnswer({ text }: { text: string }) {
    const parts = text.split(/\*\*(.*?)\*\*/g);
    return (
        <p className="text-[14px] leading-relaxed text-zinc-500">
            {parts.map((part, i) =>
                i % 2 === 1 ? (
                    <strong key={i} className="font-semibold text-zinc-300">
                        {part}
                    </strong>
                ) : (
                    <span key={i}>{part}</span>
                )
            )}
        </p>
    );
}

export default function GuidePage() {
    const [openFaq, setOpenFaq] = useState<number | null>(0);

    return (
        <div className="font-brand-display min-h-screen bg-black text-zinc-100">
            <header className="border-b border-zinc-800/90 bg-zinc-950/80">
                <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
                    <Link
                        href="/"
                        className="inline-flex items-center gap-2 text-[13px] font-medium text-zinc-400 transition hover:text-zinc-200"
                    >
                        <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden />
                        Back to home
                    </Link>
                    <span className="text-right text-[10px] font-medium uppercase tracking-[0.14em] text-zinc-600">
                        north<span className="text-zinc-400">ROSC</span> LABS · Deepchox
                    </span>
                </div>
            </header>

            <div className="mx-auto flex max-w-6xl gap-10 px-5 py-12 sm:px-8 lg:gap-14 lg:py-16">
                <aside className="hidden w-48 shrink-0 lg:block xl:w-52">
                    <nav
                        className="sticky top-8 space-y-0.5 border-l border-zinc-800 pl-4"
                        aria-label="On this page"
                    >
                        <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-600">On this page</p>
                        {GUIDE_NAV.map((item) => (
                            <a
                                key={item.id}
                                href={`#${item.id}`}
                                className="block rounded-md py-1.5 pl-2 text-[12px] text-zinc-500 transition hover:bg-zinc-900/80 hover:text-zinc-300"
                            >
                                {item.label}
                            </a>
                        ))}
                    </nav>
                </aside>

                <main className="min-w-0 flex-1 max-w-3xl">
                <div id="guide-intro" className="scroll-mt-24 rounded-2xl border border-zinc-800/90 bg-zinc-950/40 px-5 py-6 sm:px-7 sm:py-8">
                <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-zinc-500">Product guide</p>
                <h1 className="mt-3 font-serif text-3xl font-semibold tracking-tight text-white sm:text-[2.125rem] sm:leading-tight">
                    How your AI-powered team for founders works
                </h1>
                <p className="mt-4 text-[15px] leading-[1.65] text-zinc-400">
                    Built for <strong className="font-medium text-zinc-300">founders</strong>: one venture, one surface, AI teammates at each desk that stay aligned with how you run the company.
                </p>
                </div>

                <section id="guide-loop" className="scroll-mt-24 mt-14 border-t border-zinc-800/90 pt-12">
                    <div className="mb-7 flex items-center gap-3">
                        <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900/60">
                            <Building2 className="h-4 w-4 text-zinc-400" strokeWidth={1.5} aria-hidden />
                        </span>
                        <h2 className="text-lg font-semibold tracking-tight text-white">The solo-founder loop</h2>
                    </div>
                    <ol className="space-y-6 border-l border-zinc-800 pl-6">
                        {[
                            {
                                title: 'Anchor a venture',
                                body: 'New ventures open in Personal Assistant: you describe the idea in chat; the assistant asks follow-ups (including tap-to-answer options) and writes into your venture record so every desk shares the same ground truth.',
                            },
                            {
                                title: 'Work desks, not tabs',
                                body: 'Move between CEO, product, finance, and scout as jobs appear—artifacts stay in one venture record.',
                            },
                            {
                                title: 'Let staff sync compress research',
                                body: 'When you run sync, the model stack updates market and desk notes so you are not copy-pasting between chats.',
                            },
                            {
                                title: 'Run Deepchox for a full cross-functional read',
                                body: 'Open the Deepchox room from the floating orb or nav. Tap Analyse — Deepchox reads every venture field and speaks a structured briefing aloud. Interrupt it at any point to ask a follow-up; it picks up the thread without restarting the analysis.',
                            },
                            {
                                title: 'Read the office from the dashboard',
                                body: 'Execution signal, phases, and desk coverage give you a single place to see whether the plan is moving.',
                            },
                        ].map((item, i) => (
                            <li key={item.title} className="relative">
                                <span className="absolute -left-6 top-1.5 flex h-2 w-2 -translate-x-1/2 rounded-full bg-zinc-600" aria-hidden />
                                <h3 className="text-[15px] font-semibold text-zinc-200">{item.title}</h3>
                                <p className="mt-2 text-[14px] leading-relaxed text-zinc-500">{item.body}</p>
                            </li>
                        ))}
                    </ol>
                </section>

                <section id="guide-agents" className="scroll-mt-24 mt-14 border-t border-zinc-800/90 pt-12">
                    <div className="mb-7 flex items-center gap-3">
                        <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900/60">
                            <Users className="h-4 w-4 text-zinc-400" strokeWidth={1.5} aria-hidden />
                        </span>
                        <h2 className="text-lg font-semibold tracking-tight text-white">How agents behave</h2>
                    </div>
                    <ul className="space-y-4 text-[14px] leading-relaxed text-zinc-500">
                        <li>
                            <span className="font-medium text-zinc-300">Desk-scoped:</span> each role has a mandate; outputs read as memos and
                            artifacts, not random Q&amp;A.
                        </li>
                        <li>
                            <span className="font-medium text-zinc-300">Venture-consistent:</span> strategy, backlog, and numbers reference the
                            same venture so narrative does not drift.
                        </li>
                        <li>
                            <span className="font-medium text-zinc-300">Syncable:</span> staff sync is the batch pass that folds fresh research
                            into your operating picture.
                        </li>
                    </ul>
                </section>

                <section id="guide-dexo" className="scroll-mt-24 mt-14 border-t border-zinc-800/90 pt-12">
                    <div className="mb-7 flex items-center gap-3">
                        <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900/60">
                            <Orbit className="h-4 w-4 text-zinc-400" strokeWidth={1.5} aria-hidden />
                        </span>
                        <h2 className="text-lg font-semibold tracking-tight text-white">Deepchox Intelligence Room</h2>
                    </div>
                    <ul className="space-y-4 text-[14px] leading-relaxed text-zinc-500">
                        <li>
                            <span className="font-medium text-zinc-300">Canvas sphere orb:</span> a live 60 fps particle sphere renders at the centre of the room. While Deepchox is speaking, the sphere pulses and shifts colour in sync with the voice — three overlapping sine-wave frequencies drive organic motion, not looping CSS keyframes.
                        </li>
                        <li>
                            <span className="font-medium text-zinc-300">Non-blocking analysis:</span> clicking Analyse never locks the UI. The message bar and voice button are available immediately. Type or speak while the briefing compiles; the thread updates when results land.
                        </li>
                        <li>
                            <span className="font-medium text-zinc-300">Jarvis-style interruptible voice:</span> Deepchox reads its report aloud. Tap the mic or speak at any moment — the current utterance cancels, the interrupt is logged in the conversation, and your input is processed immediately.
                        </li>
                        <li>
                            <span className="font-medium text-zinc-300">Inline controls:</span> Mute toggles voice without closing the report. Re-read replays the full briefing. Re-analyse reruns the full cross-functional pass against updated venture fields.
                        </li>
                    </ul>
                </section>

                <section id="guide-orb" className="scroll-mt-24 mt-14 border-t border-zinc-800/90 pt-12">
                    <div className="mb-7 flex items-center gap-3">
                        <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900/60">
                            <Mic className="h-4 w-4 text-zinc-400" strokeWidth={1.5} aria-hidden />
                        </span>
                        <h2 className="text-lg font-semibold tracking-tight text-white">Floating Deepchox orb</h2>
                    </div>
                    <ul className="space-y-4 text-[14px] leading-relaxed text-zinc-500">
                        <li>
                            <span className="font-medium text-zinc-300">Persistent entry point:</span> the animated orb floats at the bottom-right of every screen. Tap it to enter the Deepchox room instantly — no nav required.
                        </li>
                        <li>
                            <span className="font-medium text-zinc-300">Voice greeting:</span> on first tap, Deepchox speaks an introduction. On subsequent taps it acknowledges your return. The orb remembers across sessions so it never repeats the full intro.
                        </li>
                        <li>
                            <span className="font-medium text-zinc-300">Reactive canvas:</span> the orb idle-rotates slowly and breathes gently. On hover it speeds up with a cooler palette; thin motion rings show it is ready — no heavy glow.
                        </li>
                        <li>
                            <span className="font-medium text-zinc-300">Draggable:</span> drag the orb to any corner — its position persists across sessions via local storage.
                        </li>
                    </ul>
                </section>

                <section id="guide-ai" className="scroll-mt-24 mt-14 border-t border-zinc-800/90 pt-12">
                    <div className="mb-7 flex items-center gap-3">
                        <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900/60">
                            <Cpu className="h-4 w-4 text-zinc-400" strokeWidth={1.5} aria-hidden />
                        </span>
                        <h2 className="text-lg font-semibold tracking-tight text-white">Claude × GPT — how models work together</h2>
                    </div>
                    <div className="rounded-2xl border border-zinc-800/90 bg-zinc-950/40 px-5 py-5 sm:px-6 sm:py-6">
                        <p className="text-[14px] leading-[1.65] text-zinc-400">
                            Deepchox uses a <strong className="font-medium text-zinc-300">dual-provider layout</strong>:{' '}
                            <strong className="font-medium text-zinc-300">GPT</strong> drives most desk conversations with role-tuned system prompts, while{' '}
                            <strong className="font-medium text-zinc-300">Claude</strong> runs in the same staff-sync pipeline so both families contribute to merged outputs. The Intelligence Suite shows a <strong className="font-medium text-zinc-300">Claude × GPT</strong> panel while sync runs.{' '}
                            <strong className="font-medium text-zinc-300">Deepchox</strong> adds a full-record analysis pass. You never choose a model in the UI — routing is automatic and follows your backend configuration.
                        </p>
                    </div>
                </section>

                <section id="guide-faq" className="scroll-mt-24 mt-14 border-t border-zinc-800/90 pt-12">
                    <h2 className="text-lg font-semibold tracking-tight text-white">FAQ</h2>
                    <p className="mt-2 text-[13px] leading-relaxed text-zinc-600">Modeling and behaviour — without deployment trivia.</p>
                    <div className="mt-8 space-y-2">
                        {faqItems.map((item, i) => {
                            const open = openFaq === i;
                            return (
                                <div
                                    key={item.q}
                                    className="overflow-hidden rounded-xl border border-zinc-800/90 bg-zinc-950/40 transition-colors hover:border-zinc-700/90"
                                >
                                    <button
                                        type="button"
                                        onClick={() => setOpenFaq(open ? null : i)}
                                        className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left sm:px-5"
                                        aria-expanded={open}
                                    >
                                        <span className="text-[14px] font-medium text-zinc-200">{item.q}</span>
                                        <ChevronDown
                                            className={`h-5 w-5 shrink-0 text-zinc-600 transition-transform ${open ? 'rotate-180' : ''}`}
                                            aria-hidden
                                        />
                                    </button>
                                    {open && (
                                        <div className="border-t border-zinc-800 px-4 pb-4 pt-0 sm:px-5">
                                            <div className="pt-3">
                                                <FaqAnswer text={item.a} />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </section>

                <div className="mt-16 border-t border-zinc-800/90 pt-10">
                    <Link
                        href="/"
                        className="inline-flex items-center gap-2 text-[13px] font-medium text-zinc-400 transition hover:text-white"
                    >
                        <ArrowLeft className="h-4 w-4" aria-hidden />
                        Return to Deepchox home
                    </Link>
                </div>
            </main>
            </div>
        </div>
    );
}
