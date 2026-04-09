'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ChevronDown, Cpu, Users, Building2 } from 'lucide-react';

const faqItems = [
    {
        q: 'Which AI models power DEEPCHOX?',
        a: 'Everything is wired inside the product: a built-in **SLM** for lightweight, local-friendly tasks; **Kimi V2** where we route longer reasoning and document-style work; and **Groq** for fast, low-latency responses on supported flows. DEEPCHOX chooses the stack—you do not paste API keys in the UI.',
    },
    {
        q: 'How is the virtual office meant to work for a solo founder?',
        a: 'You operate as the single decision-maker. DEEPCHOX gives you **desks** where **AI roles act as teammates** (strategy, product, finance, market, GTM, and more): each produces outputs in one venture record so context never splits across tools.',
    },
    {
        q: 'How do the agents behave?',
        a: 'Each AI teammate is **role-bound**: they answer from their desk’s mandate—strategy narrative, finance numbers, product delivery, market signal—not as a generic chatbot. **Staff sync** refreshes all desk briefs from the same snapshot and can merge updates into your venture.',
    },
    {
        q: 'What do I do first after entering the workspace?',
        a: 'Complete **venture onboarding** so intent and scope exist. Then open the **dashboard** and move between desks as your week demands; run **AI staff sync** when you want the model stack to refresh intel into your venture.',
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
            <header className="border-b border-zinc-800 bg-black">
                <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-5 py-5 sm:px-8">
                    <Link
                        href="/"
                        className="inline-flex items-center gap-2 text-[13px] font-medium text-zinc-400 transition hover:text-zinc-200"
                    >
                        <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden />
                        Back to home
                    </Link>
                    <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-600">DEEPCHOX</span>
                </div>
            </header>

            <main className="mx-auto max-w-3xl px-5 py-14 sm:px-8 sm:py-20">
                <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-zinc-500">Product guide</p>
                <h1 className="mt-3 font-serif text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                    How your AI-powered team for founders works
                </h1>
                <p className="mt-4 text-[15px] leading-relaxed text-zinc-400">
                    Built for <strong className="font-medium text-zinc-300">founders</strong>: one venture, one surface, AI teammates at each desk that stay aligned with how you run the company.
                </p>

                <section className="mt-16 border-t border-zinc-800 pt-14">
                    <div className="mb-8 flex items-center gap-3">
                        <Building2 className="h-5 w-5 text-zinc-500" strokeWidth={1.5} aria-hidden />
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

                <section className="mt-16 border-t border-zinc-800 pt-14">
                    <div className="mb-8 flex items-center gap-3">
                        <Users className="h-5 w-5 text-zinc-500" strokeWidth={1.5} aria-hidden />
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

                <section className="mt-16 border-t border-zinc-800 pt-14">
                    <div className="mb-8 flex items-center gap-3">
                        <Cpu className="h-5 w-5 text-zinc-500" strokeWidth={1.5} aria-hidden />
                        <h2 className="text-lg font-semibold tracking-tight text-white">AI stack (in-app)</h2>
                    </div>
                    <p className="text-[14px] leading-relaxed text-zinc-500">
                        DEEPCHOX routes requests across a fixed, product-managed stack—<strong className="text-zinc-400">built-in SLM</strong> for
                        efficient on-device-friendly tasks, <strong className="text-zinc-400">Kimi V2</strong> where we need strong long-context
                        reasoning, and <strong className="text-zinc-400">Groq</strong> for high-throughput, low-latency generation. Selection is
                        automatic from inside the app; there is no “bring your own key” step in the product experience.
                    </p>
                </section>

                <section id="faq" className="mt-16 scroll-mt-8 border-t border-zinc-800 pt-14">
                    <h2 className="text-lg font-semibold tracking-tight text-white">FAQ</h2>
                    <p className="mt-2 text-[13px] text-zinc-600">Modeling and behavior—without deployment trivia.</p>
                    <div className="mt-8 space-y-2">
                        {faqItems.map((item, i) => {
                            const open = openFaq === i;
                            return (
                                <div
                                    key={item.q}
                                    className="overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950/50 transition-colors hover:border-zinc-700"
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

                <div className="mt-20 border-t border-zinc-800 pt-10">
                    <Link
                        href="/"
                        className="inline-flex items-center gap-2 text-[13px] font-medium text-zinc-400 transition hover:text-white"
                    >
                        <ArrowLeft className="h-4 w-4" aria-hidden />
                        Return to DEEPCHOX home
                    </Link>
                </div>
            </main>
        </div>
    );
}
