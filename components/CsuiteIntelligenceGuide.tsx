'use client';

import React from 'react';
import {
    Database,
    ArrowRight,
    Bot,
    Users,
    FileText,
    RefreshCw,
    MessageSquare,
    GitBranch,
    Shield,
    Sparkles,
    Layers,
} from 'lucide-react';

function FlowArrow() {
    return (
        <div className="flex items-center justify-center text-brand-muted/50" aria-hidden>
            <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5" />
        </div>
    );
}

export function CsuiteIntelligenceGuide() {
    return (
        <div className="h-full min-h-0 overflow-y-auto bg-brand-bg custom-scrollbar">
            <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8 lg:max-w-4xl">
                <header className="mb-10 border-b border-brand-border/60 pb-8">
                    <div className="mb-3 inline-flex items-center gap-2 rounded-lg border border-brand-border/60 bg-brand-panel/50 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-brand-muted">
                        <Sparkles className="h-3.5 w-3.5 text-brand-teal" aria-hidden />
                        DeepChox C-suite
                    </div>
                    <h1 className="text-2xl font-semibold tracking-tight text-brand-text sm:text-3xl">
                        How the AI network works
                    </h1>
                    <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-brand-muted">
                        A single place to see how venture data, officer desks, Dexo, staff sync, and the Chief of Staff chat
                        connect — and where decisions and reports come from.
                    </p>
                </header>

                {/* Network */}
                <section className="mb-12" aria-labelledby="net-title">
                    <h2 id="net-title" className="mb-4 flex items-center gap-2 text-lg font-semibold text-brand-text">
                        <GitBranch className="h-5 w-5 text-brand-teal" aria-hidden />
                        System map
                    </h2>
                    <p className="mb-6 text-sm leading-relaxed text-brand-muted">
                        Your venture record is the <strong className="font-medium text-brand-text">source of truth</strong> (stored
                        locally). AI features read from it and write back through controlled update paths — not a black box.
                    </p>

                    <div className="rounded-2xl border border-brand-border/80 bg-brand-panel/35 p-4 sm:p-6">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-stretch lg:justify-between lg:gap-2">
                            <div className="flex flex-1 flex-col rounded-xl border border-brand-border/60 bg-brand-bg/80 p-4">
                                <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-brand-muted">
                                    <Database className="h-4 w-4 text-brand-teal" aria-hidden />
                                    Venture data
                                </div>
                                <p className="text-[13px] leading-relaxed text-brand-muted">
                                    Strategy, product, budget, market notes, events, kanban, journal — persisted in the browser
                                    database (Dexie) per venture.
                                </p>
                            </div>
                            <div className="hidden lg:flex lg:items-center">
                                <FlowArrow />
                            </div>
                            <div className="flex flex-1 flex-col rounded-xl border border-brand-border/60 bg-brand-bg/80 p-4">
                                <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-brand-muted">
                                    <Layers className="h-4 w-4 text-brand-teal" aria-hidden />
                                    Intelligence layer
                                </div>
                                <ul className="space-y-2 text-[13px] leading-relaxed text-brand-muted">
                                    <li>
                                        <span className="font-medium text-brand-text">Dexo Core</span> — cross-desk Q&amp;A using
                                        venture context and officer system prompts.
                                    </li>
                                    <li>
                                        <span className="font-medium text-brand-text">Chief of Staff</span> (chat rail) —
                                        orchestration copy; routes mentally to the right desk.
                                    </li>
                                    <li>
                                        <span className="font-medium text-brand-text">Sync AI staff</span> — server research job
                                        merges summaries into desks (when configured).
                                    </li>
                                </ul>
                            </div>
                            <div className="hidden lg:flex lg:items-center">
                                <FlowArrow />
                            </div>
                            <div className="flex flex-1 flex-col rounded-xl border border-brand-border/60 bg-brand-bg/80 p-4">
                                <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-brand-muted">
                                    <Users className="h-4 w-4 text-brand-teal" aria-hidden />
                                    Officer outputs
                                </div>
                                <p className="text-[13px] leading-relaxed text-brand-muted">
                                    CEO, CFO, CTO, CMO, CSO (and VC gauntlet) each have a desk with a defined artifact type —
                                    strategy narrative, numbers, product plan, narrative, intel — so outputs stay structured.
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Processing */}
                <section className="mb-12" aria-labelledby="proc-title">
                    <h2 id="proc-title" className="mb-4 flex items-center gap-2 text-lg font-semibold text-brand-text">
                        <Bot className="h-5 w-5 text-brand-teal" aria-hidden />
                        Processing pipeline
                    </h2>
                    <ol className="space-y-4">
                        {[
                            {
                                n: '1',
                                t: 'Context assembly',
                                d: 'When you send a message or run a desk action, the app bundles relevant venture fields (and sometimes room-specific instructions) into a prompt payload.',
                            },
                            {
                                n: '2',
                                t: 'Role-conditioned prompts',
                                d: 'Each officer (and Dexo) uses a system prompt aligned to that role — so the model answers as CFO vs CMO, not as a generic chatbot.',
                            },
                            {
                                n: '3',
                                t: 'Model call',
                                d: 'Requests go to your configured backend (e.g. local Ollama or API). Responses are parsed where structured data is expected (JSON for boardroom sim, etc.).',
                            },
                            {
                                n: '4',
                                t: 'Write-back',
                                d: 'Approved updates patch the venture record (strategy, product plan, budget, …) so the UI and database stay in sync.',
                            },
                            {
                                n: '5',
                                t: 'Staff sync (optional)',
                                d: 'A separate sync pass can append research into market intel, finance notes, directives, kanban, and calendar — shown as notifications when relevant.',
                            },
                        ].map((step) => (
                            <li
                                key={step.n}
                                className="flex gap-4 rounded-xl border border-brand-border/50 bg-brand-panel/25 px-4 py-4 sm:px-5"
                            >
                                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-brand-border bg-brand-bg font-mono text-sm font-bold text-brand-teal">
                                    {step.n}
                                </span>
                                <div>
                                    <h3 className="font-medium text-brand-text">{step.t}</h3>
                                    <p className="mt-1.5 text-sm leading-relaxed text-brand-muted">{step.d}</p>
                                </div>
                            </li>
                        ))}
                    </ol>
                </section>

                {/* Decisions */}
                <section className="mb-12" aria-labelledby="dec-title">
                    <h2 id="dec-title" className="mb-4 flex items-center gap-2 text-lg font-semibold text-brand-text">
                        <Shield className="h-5 w-5 text-brand-teal" aria-hidden />
                        How decisions are shaped
                    </h2>
                    <div className="space-y-4 text-sm leading-relaxed text-brand-muted">
                        <p>
                            <strong className="font-medium text-brand-text">Executive overview &amp; dashboards</strong> surface
                            execution score, phases, and priorities from the strategy document — they don’t invent numbers; they
                            reflect what you and the CEO desk recorded.
                        </p>
                        <p>
                            <strong className="font-medium text-brand-text">Boardroom</strong> runs a multi-officer loop: parallel
                            role responses, then a conflict check (finance feasibility, tech risk, competitive threat) before a
                            consensus or follow-up message.
                        </p>
                        <p>
                            <strong className="font-medium text-brand-text">Per-desk chat</strong> (bottom bar on most rooms) uses
                            the active room’s “Chief of Staff” or officer theme so follow-ups stay on-strategy for that surface.
                        </p>
                    </div>
                </section>

                {/* Reports */}
                <section className="mb-12" aria-labelledby="rep-title">
                    <h2 id="rep-title" className="mb-4 flex items-center gap-2 text-lg font-semibold text-brand-text">
                        <FileText className="h-5 w-5 text-brand-teal" aria-hidden />
                        How reports &amp; artifacts appear
                    </h2>
                    <div className="rounded-xl border border-brand-border/60 bg-brand-panel/30 p-5 sm:p-6">
                        <ul className="space-y-4 text-sm leading-relaxed text-brand-muted">
                            <li className="flex gap-3">
                                <FileText className="mt-0.5 h-4 w-4 shrink-0 text-brand-teal" aria-hidden />
                                <span>
                                    <strong className="text-brand-text">Knowledge base / reports</strong> — library of saved work and
                                    exports tied to the venture; good for anything you promote from a desk or paste in manually.
                                </span>
                            </li>
                            <li className="flex gap-3">
                                <RefreshCw className="mt-0.5 h-4 w-4 shrink-0 text-brand-teal" aria-hidden />
                                <span>
                                    <strong className="text-brand-text">Sync AI staff</strong> — optional batch that writes
                                    structured snippets into venture sections (intel, budget notes, directives, kanban tasks,
                                    events) so reports and execution stay aligned after a sync run.
                                </span>
                            </li>
                            <li className="flex gap-3">
                                <MessageSquare className="mt-0.5 h-4 w-4 shrink-0 text-brand-teal" aria-hidden />
                                <span>
                                    <strong className="text-brand-text">Neural diary &amp; journals</strong> — narrative memory on
                                    the side; useful for qualitative threads that aren’t a formal “report” yet.
                                </span>
                            </li>
                        </ul>
                    </div>
                </section>

                <footer className="rounded-xl border border-dashed border-brand-border/60 bg-brand-bg/60 px-4 py-4 text-center text-[12px] text-brand-muted sm:text-left">
                    <strong className="font-medium text-brand-text">Privacy posture:</strong> venture data lives in your browser
                    (IndexedDB) unless you add server-side features. AI calls use whatever backend you connect — check your
                    deployment for outbound API usage.
                </footer>
            </div>
        </div>
    );
}
