'use client';

import React, { useState, useMemo, useCallback, useRef } from 'react';
import { useOffice } from '@/lib/OfficeContext';
import {
    Wallet,
    GitBranch,
    Globe2,
    Gavel,
    Sparkles,
    Bell,
    CalendarClock,
    MessageSquare,
    Copy,
    Check,
    Hash,
    Bot,
} from 'lucide-react';
import type { Project, ProjectEvent, StaffAttentionItem } from '@/lib/db';

const MAX_PROMPT_CONTEXT = 7200;

function formatWhen(ts: number): string {
    if (!ts) return '';
    try {
        return new Intl.DateTimeFormat(undefined, {
            dateStyle: 'medium',
            timeStyle: 'short',
        }).format(ts);
    } catch {
        return new Date(ts).toLocaleString();
    }
}

function excerpt(text: string, max: number): string {
    const t = (text || '').trim();
    if (!t) return '';
    if (t.length <= max) return t;
    return t.slice(0, max).trim() + '…';
}

function truncateForPrompt(text: string, max = MAX_PROMPT_CONTEXT): string {
    const t = (text || '').trim();
    if (t.length <= max) return t;
    return t.slice(0, max).trim() + '\n\n[…truncated for chat context]';
}

/** Turn free text into short insight bullets (non-empty lines / sentences). */
function toInsightBullets(text: string, max = 6): string[] {
    const raw = (text || '').trim();
    if (!raw) return [];
    const lines = raw
        .split(/\n+/)
        .map((l) => l.replace(/^[-*•]\s*/, '').trim())
        .filter(Boolean);
    if (lines.length >= 2) return lines.slice(0, max);
    const sentences = raw.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean);
    return sentences.slice(0, max);
}

function upcomingEvents(events: ProjectEvent[] | undefined, limit = 5): ProjectEvent[] {
    if (!events?.length) return [];
    const now = Date.now();
    return [...events]
        .filter((e) => e.date >= now - 86400000 * 2)
        .sort((a, b) => a.date - b.date)
        .slice(0, limit);
}

/** Light keyword hints for finance review */
function financeSignals(text: string): string[] {
    const t = (text || '').toLowerCase();
    const keys: [RegExp, string][] = [
        [/runway|months?\s+of\s+cash|cash\s+runway/, 'Runway'],
        [/burn|opex|monthly\s+cost/, 'Burn / opex'],
        [/mrr|arr|revenue/, 'Revenue'],
        [/cash\s+on\s+hand|liquidity|balance/, 'Liquidity'],
        [/headcount|salary|payroll/, 'People cost'],
        [/debt|loan|convertible/, 'Debt / capital'],
        [/risk|downside|sensitivity/, 'Risk'],
    ];
    const out: string[] = [];
    for (const [re, label] of keys) {
        if (re.test(t) && !out.includes(label)) out.push(label);
    }
    return out.slice(0, 6);
}

type TopicId =
    | 'liquidity'
    | 'cross_desk'
    | 'market'
    | 'governance'
    | 'ai_brief'
    | 'attention';

/** Align with sidebar / shell: brand-panel surfaces, brand-border outlines (no purple / rainbow accents). */
const DESK_PANEL = {
    detailWrap: 'border border-brand-border bg-brand-panel/50',
    tileOn: 'border border-brand-border bg-brand-panel/80',
    tileOff: 'border border-brand-border/60 bg-brand-bg',
    badgeOn: 'border border-brand-border bg-brand-card text-brand-text',
    badgeOff: 'border border-brand-border bg-brand-bg text-brand-muted',
    askBtn: 'border border-brand-border bg-brand-card text-brand-text hover:bg-brand-input',
    signalChip: 'border border-brand-border bg-brand-panel text-brand-muted',
    promptHover: 'hover:border-brand-teal/35 hover:text-brand-text',
} as const;

const TOPIC_META: { id: TopicId; title: string; shortLabel: string; hint: string; icon: typeof Wallet }[] = [
    {
        id: 'liquidity',
        title: 'Runway, cash & ledger',
        shortLabel: 'Runway & cash',
        hint: 'Burn, liquidity, and your venture budget field.',
        icon: Wallet,
    },
    {
        id: 'cross_desk',
        title: 'Delivery & strategy (cost impact)',
        shortLabel: 'Strategy & delivery',
        hint: 'Latest from CEO and PM that affects spend and timing.',
        icon: GitBranch,
    },
    {
        id: 'market',
        title: 'Market & revenue outlook',
        shortLabel: 'Market outlook',
        hint: 'Scout intel and external assumptions that hit the model.',
        icon: Globe2,
    },
    {
        id: 'governance',
        title: 'Directives & board asks',
        shortLabel: 'Directives',
        hint: 'Team directives and executive notes that finance must honour.',
        icon: Gavel,
    },
    {
        id: 'ai_brief',
        title: 'Staff sync — CFO brief',
        shortLabel: 'Staff sync',
        hint: 'AI desk summary for finance from the last office sync.',
        icon: Sparkles,
    },
    {
        id: 'attention',
        title: 'Alerts & deadlines',
        shortLabel: 'Alerts',
        hint: 'Items waiting on finance and upcoming dates.',
        icon: Bell,
    },
];

type TopicRow = {
    preview: string;
    insights: string[];
    latest: { label: string; at?: number };
    emptyHint: string;
    rawContext: string;
    hasData: boolean;
};

function buildTopicContent(project: Project, ledgerBody: string) {
    const snap = project.agentStaffSnapshot;
    const accountantAttention = (project.staffAttentionItems || []).filter(
        (i: StaffAttentionItem) => i.role === 'accountant' && !i.dismissed
    );

    const liquidityText = ledgerBody.trim() || project.budget || '';
    const liquidityPreview = excerpt(
        liquidityText.split('\n').find((l) => l.trim()) || liquidityText,
        100
    );
    const liquidityInsights = toInsightBullets(liquidityText, 8);
    const liquidityUpdated = liquidityText
        ? { label: 'Venture budget / ledger field', at: project.timestamp }
        : { label: 'No budget text yet', at: undefined };

    const strategy = (project.strategy || '').trim();
    const product = (project.productPlan || '').trim();
    const crossDeskBlock = [strategy && `CEO / strategy:\n${strategy}`, product && `PM / product:\n${product}`]
        .filter(Boolean)
        .join('\n\n');
    const crossPreview =
        excerpt(strategy ? strategy : product ? product : '', 120) || excerpt(crossDeskBlock, 120);
    const crossInsights = toInsightBullets(excerpt(crossDeskBlock, 1200), 6);
    const crossUpdated = { label: 'Venture fields', at: project.timestamp };

    const marketText = (project.marketInsights || '').trim();
    const marketPreview = excerpt(marketText.split('\n').find((l) => l.trim()) || marketText, 110);
    const marketInsights = toInsightBullets(marketText, 8);
    const marketUpdated = { label: 'Market intel field', at: project.timestamp };

    const gov = [project.teamDirectives && `Directives:\n${project.teamDirectives}`, project.userNotes && `Executive notes:\n${project.userNotes}`]
        .filter(Boolean)
        .join('\n\n');
    const govPreview = excerpt(gov, 110);
    const govInsights = toInsightBullets(excerpt(gov, 1500), 6);
    const govUpdated = { label: 'Directives & notes', at: project.timestamp };

    const cfoDesk = (snap?.desks.accountant || '').trim();
    const syncSummary = (snap?.summary || '').trim();
    const aiBlock = [syncSummary && `Office summary:\n${syncSummary}`, cfoDesk && `CFO desk:\n${cfoDesk}`].filter(Boolean).join('\n\n');
    const aiPreview = excerpt(cfoDesk || syncSummary || '', 100);
    const aiInsights = toInsightBullets(excerpt(aiBlock, 2000), 8);
    const aiUpdated = snap?.at ? { label: 'Last staff sync', at: snap.at } : { label: 'No staff sync yet', at: undefined };

    const events = upcomingEvents(project.events);
    const attLines = accountantAttention.map((a) => `${a.title}: ${a.message}`);
    const attentionBlock = [...attLines, ...events.map((e) => `Event · ${e.title} (${formatWhen(e.date)})`)].join('\n');
    const attentionPreview =
        accountantAttention[0]?.title
            ? excerpt(accountantAttention[0].title + ' — ' + accountantAttention[0].message, 100)
            : events[0]
              ? `${events[0].title} · ${formatWhen(events[0].date)}`
              : '—';
    const attentionInsights = toInsightBullets(attentionBlock, 8);
    const attentionUpdated =
        accountantAttention[0]?.createdAt
            ? { label: 'Latest attention item', at: accountantAttention[0].createdAt }
            : events[0]
              ? { label: 'Next event', at: events[0].date }
              : { label: 'Nothing queued', at: undefined };

    const map: Record<TopicId, TopicRow> = {
        liquidity: {
            preview: liquidityPreview || 'Add burn, cash, and runway to the venture budget (sync or other desks).',
            insights: liquidityInsights,
            latest: liquidityUpdated,
            emptyHint: 'Budget text can be filled via staff sync, PM/CEO flows, or Chief of Staff — then it appears here.',
            rawContext: liquidityText,
            hasData: !!liquidityText,
        },
        cross_desk: {
            preview: crossPreview || 'No strategy or product plan text yet.',
            insights: crossInsights,
            latest: crossUpdated,
            emptyHint: 'When CEO and PM desks have content, the CFO sees cost implications here.',
            rawContext: crossDeskBlock,
            hasData: !!(strategy || product),
        },
        market: {
            preview: marketPreview || 'No scout / market intel yet.',
            insights: marketInsights,
            latest: marketUpdated,
            emptyHint: 'Scout market intelligence feeds revenue and risk assumptions.',
            rawContext: marketText,
            hasData: !!marketText,
        },
        governance: {
            preview: govPreview || 'No directives or executive notes yet.',
            insights: govInsights,
            latest: govUpdated,
            emptyHint: 'Board asks and leadership notes land here for audit.',
            rawContext: gov,
            hasData: !!(project.teamDirectives?.trim() || project.userNotes?.trim()),
        },
        ai_brief: {
            preview: aiPreview || 'Run staff sync from the executive overview to populate CFO brief.',
            insights: aiInsights,
            latest: aiUpdated,
            emptyHint: 'Staff sync merges research into a per-desk brief including CFO.',
            rawContext: aiBlock,
            hasData: !!(cfoDesk || syncSummary),
        },
        attention: {
            preview: attentionPreview === '—' ? 'No finance alerts or upcoming deadlines.' : attentionPreview,
            insights: attentionInsights,
            latest: attentionUpdated,
            emptyHint: 'Staff sync can surface “waiting on finance” items; calendar events show pressure.',
            rawContext: attentionBlock,
            hasData: accountantAttention.length > 0 || events.length > 0,
        },
    };

    return { map, focusToday: project.staffFocusToday || [], events };
}

function ledgerDiscussMessage(ventureName: string, ledger: string, instruction: string): string {
    return `${instruction}

Venture: ${ventureName}

--- Financial ledger & assumptions ---
${truncateForPrompt(ledger || '(empty — describe what you want to model)')}

Reply as CFO: be specific, flag risks, and say what’s missing from the numbers or narrative.`;
}

function topicDiscussMessage(ventureName: string, topicTitle: string, rawContext: string): string {
    return `CFO desk — topic: "${topicTitle}" (venture: ${ventureName})

Context for this section:
${truncateForPrompt(rawContext || '(no data in this section yet)')}

Please: (1) summarize what matters for finance, (2) list risks or gaps, (3) suggest 2–3 concrete next steps.`;
}

const LEDGER_QUICK_PROMPTS: { label: string; instruction: string }[] = [
    {
        label: 'Stress-test runway',
        instruction:
            'Challenge my runway and liquidity assumptions. What would make them wrong, and what should I monitor weekly?',
    },
    {
        label: 'Board-ready summary',
        instruction:
            'Turn this ledger into a tight summary I could read to the board: headline metrics, risks, and asks.',
    },
    {
        label: 'Missing line items',
        instruction:
            'What line items or scenarios are probably missing from this ledger for an early-stage venture?',
    },
    {
        label: 'Downside case',
        instruction:
            'Build a verbal downside scenario from this ledger (slower revenue, higher burn). What breaks first?',
    },
];

export function FinancialLedger() {
    const { activeProject, prepopulateChat } = useOffice();
    const [selectedTopicId, setSelectedTopicId] = useState<TopicId>('liquidity');
    const [copiedTopic, setCopiedTopic] = useState<TopicId | null>(null);
    const detailPanelRef = useRef<HTMLDivElement>(null);

    const selectTopic = useCallback((id: TopicId) => {
        setSelectedTopicId(id);
        requestAnimationFrame(() => {
            detailPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    }, []);

    const budgetText = activeProject?.budget ?? '';

    const topic = useMemo(() => {
        if (!activeProject) return null;
        return buildTopicContent(activeProject, budgetText);
    }, [activeProject, budgetText]);

    const askCfoLedger = useCallback(
        (instruction: string) => {
            if (!activeProject) return;
            prepopulateChat(
                'accountant',
                ledgerDiscussMessage(activeProject.name, activeProject.budget ?? '', instruction)
            );
        },
        [activeProject, prepopulateChat]
    );

    const askCfoTopic = useCallback(
        (id: TopicId, title: string) => {
            if (!activeProject || !topic) return;
            const raw = topic.map[id].rawContext;
            prepopulateChat('accountant', topicDiscussMessage(activeProject.name, title, raw));
        },
        [activeProject, topic, prepopulateChat]
    );

    const copyInsights = useCallback(async (id: TopicId, title: string, insights: string[]) => {
        const text = [`## ${title}`, '', ...insights.map((l) => `- ${l}`)].join('\n');
        try {
            await navigator.clipboard.writeText(text);
            setCopiedTopic(id);
            setTimeout(() => setCopiedTopic(null), 2000);
        } catch {
            /* ignore */
        }
    }, []);

    if (!activeProject) {
        return (
            <div className="flex h-full items-center justify-center p-8 text-sm text-brand-muted">
                Select a venture to open the CFO desk.
            </div>
        );
    }

    if (!topic) return null;

    const { map, focusToday, events } = topic;
    const selectedMeta = TOPIC_META.find((t) => t.id === selectedTopicId)!;
    const selectedRow = map[selectedTopicId];
    const lines = budgetText.split('\n').length;
    const chars = budgetText.length;
    const signals = financeSignals(budgetText);

    return (
        <div className="flex h-full min-h-0 flex-col overflow-hidden bg-brand-bg">
            <div className="custom-scrollbar flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-6 py-5 sm:px-8">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="rounded-lg border border-brand-border bg-brand-panel px-4 py-3">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-brand-muted">Venture</p>
                        <p className="mt-1 truncate text-sm font-medium text-brand-text">{activeProject.name}</p>
                    </div>
                    <div className="rounded-lg border border-brand-border bg-brand-panel px-4 py-3">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-brand-muted">Budget field</p>
                        <p className="mt-1 flex flex-wrap items-baseline gap-2 text-sm font-medium text-brand-text">
                            <span>
                                {chars.toLocaleString()} chars · {lines} lines
                            </span>
                        </p>
                    </div>
                    <div className="rounded-lg border border-brand-border bg-brand-panel px-4 py-3 sm:col-span-2 lg:col-span-2">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-brand-muted">Signals in text</p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                            {signals.length > 0 ? (
                                signals.map((s) => (
                                    <span
                                        key={s}
                                        className={`rounded-md px-2 py-0.5 text-[10px] font-medium ${DESK_PANEL.signalChip}`}
                                    >
                                        {s}
                                    </span>
                                ))
                            ) : (
                                <span className="text-[12px] text-brand-muted">
                                    Add burn, runway, or revenue cues — we’ll tag them.
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                <div>
                    <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-brand-muted">Topics</p>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                        {TOPIC_META.map(({ id, shortLabel, icon: Icon }) => {
                            const row = map[id];
                            const isSel = selectedTopicId === id;
                            return (
                                <button
                                    key={id}
                                    type="button"
                                    onClick={() => selectTopic(id)}
                                    className={`flex min-h-[4.5rem] flex-col items-start gap-1.5 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-brand-card/40 ${
                                        row.hasData ? DESK_PANEL.tileOn : DESK_PANEL.tileOff
                                    } ${
                                        isSel
                                            ? 'ring-2 ring-brand-teal/25 ring-offset-2 ring-offset-brand-bg'
                                            : ''
                                    }`}
                                >
                                    <span className="flex w-full items-center justify-between gap-1">
                                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded border border-brand-border bg-brand-input text-brand-text">
                                            <Icon className="h-3.5 w-3.5" aria-hidden />
                                        </span>
                                        <span
                                            className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                                                row.hasData ? 'bg-brand-teal' : 'bg-brand-border'
                                            }`}
                                            title={row.hasData ? 'Has data' : 'Empty'}
                                        />
                                    </span>
                                    <span className="line-clamp-2 w-full text-[11px] font-semibold leading-tight text-brand-text">
                                        {shortLabel}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div
                    ref={detailPanelRef}
                    id="cfo-topic-detail"
                    className={`scroll-mt-4 rounded-lg px-3 py-3 sm:px-4 ${
                        selectedRow.hasData ? DESK_PANEL.detailWrap : 'border border-brand-border/60 bg-brand-bg'
                    }`}
                >
                    <div className="mb-3 flex flex-wrap items-start justify-between gap-2 border-b border-brand-border/60 pb-3">
                        <div>
                            <h3 className="text-sm font-semibold text-brand-text">{selectedMeta.title}</h3>
                            <p className="mt-0.5 text-[11px] text-brand-muted">{selectedMeta.hint}</p>
                        </div>
                        <span
                            className={`shrink-0 rounded px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                                selectedRow.hasData ? DESK_PANEL.badgeOn : DESK_PANEL.badgeOff
                            }`}
                        >
                            {selectedRow.hasData ? 'Has data' : 'Empty'}
                        </span>
                    </div>
                    <p className="mb-3 text-[12px] leading-snug text-brand-muted">{selectedRow.preview}</p>

                    <div className="space-y-3">
                        <div>
                            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-brand-muted">Latest update</p>
                            <p className="mt-1 text-[13px] text-brand-text">
                                {selectedRow.latest.label}
                                {selectedRow.latest.at != null && (
                                    <span className="text-brand-muted"> · {formatWhen(selectedRow.latest.at)}</span>
                                )}
                            </p>
                        </div>

                        <div>
                            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-brand-muted">Insights</p>
                            {selectedRow.insights.length > 0 ? (
                                <ul className="mt-2 list-disc space-y-1.5 pl-4 text-[13px] leading-relaxed text-brand-text/95">
                                    {selectedRow.insights.map((line, i) => (
                                        <li key={i}>{line}</li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="mt-2 text-[13px] leading-relaxed text-brand-muted">{selectedRow.emptyHint}</p>
                            )}
                        </div>

                        <div className="flex flex-wrap items-center gap-2 border-t border-brand-border/50 pt-3">
                            <button
                                type="button"
                                onClick={() => askCfoTopic(selectedTopicId, selectedMeta.title)}
                                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-semibold transition-colors ${DESK_PANEL.askBtn}`}
                            >
                                <MessageSquare className="h-3.5 w-3.5" aria-hidden />
                                Ask CFO about this
                            </button>
                            <button
                                type="button"
                                disabled={selectedRow.insights.length === 0}
                                onClick={() => copyInsights(selectedTopicId, selectedMeta.title, selectedRow.insights)}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-brand-border bg-brand-bg px-3 py-1.5 text-[11px] font-medium text-brand-text transition-colors hover:bg-brand-input disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                {copiedTopic === selectedTopicId ? (
                                    <Check className="h-3.5 w-3.5 text-brand-teal" aria-hidden />
                                ) : (
                                    <Copy className="h-3.5 w-3.5" aria-hidden />
                                )}
                                {copiedTopic === selectedTopicId ? 'Copied' : 'Copy bullets'}
                            </button>
                        </div>

                        {selectedTopicId === 'ai_brief' && focusToday.length > 0 && (
                            <div className="rounded-md border border-brand-border bg-brand-bg px-3 py-2.5">
                                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-brand-muted">
                                    Office focus today
                                </p>
                                <ul className="mt-2 list-disc space-y-1 pl-4 text-[12px] text-brand-muted">
                                    {focusToday.map((line, i) => (
                                        <li key={i}>{line}</li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {selectedTopicId === 'attention' && events.length > 0 && (
                            <div className="flex items-start gap-2 rounded-md border border-brand-border bg-brand-bg/80 px-3 py-2">
                                <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-brand-muted" aria-hidden />
                                <div className="min-w-0 text-[12px] text-brand-muted">
                                    <span className="font-medium text-brand-text">Upcoming: </span>
                                    {events.map((e) => e.title).join(' · ')}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="rounded-xl border border-brand-border bg-brand-panel px-4 py-4 sm:px-5">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex min-w-0 gap-3">
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-brand-border bg-brand-bg text-brand-text">
                                <Bot className="h-5 w-5" aria-hidden />
                            </span>
                            <div>
                                <h2 className="text-sm font-semibold text-brand-text">Discuss with CFO</h2>
                                <p className="mt-1 max-w-xl text-[12px] leading-relaxed text-brand-muted">
                                    Use the chat below to work through finance. Prompts use your venture budget field, desk sync,
                                    and the topic you selected (trimmed if very long).
                                </p>
                            </div>
                        </div>
                        <div className="flex shrink-0 flex-col gap-2 sm:items-end">
                            <button
                                type="button"
                                onClick={() =>
                                    askCfoLedger(
                                        'Review this financial ledger holistically. What are the top 3 risks and what should I validate next?'
                                    )
                                }
                                className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-brand-border bg-brand-card px-4 py-2.5 text-xs font-semibold text-brand-text transition-colors hover:bg-brand-input sm:w-auto"
                            >
                                <MessageSquare className="h-4 w-4" aria-hidden />
                                Discuss venture finances with CFO
                            </button>
                        </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                        <span className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-brand-muted">
                            <Hash className="h-3 w-3" aria-hidden />
                            Quick prompts
                        </span>
                        {LEDGER_QUICK_PROMPTS.map((q) => (
                            <button
                                key={q.label}
                                type="button"
                                onClick={() => askCfoLedger(q.instruction)}
                                className={`rounded-full border border-brand-border bg-brand-bg px-3 py-1.5 text-[11px] font-medium text-brand-muted transition-colors ${DESK_PANEL.promptHover}`}
                            >
                                {q.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
