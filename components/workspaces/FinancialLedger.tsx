'use client';

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
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
    Briefcase,
    Cpu,
    ScanSearch,
    Megaphone,
    ArrowRight,
    Link2,
    Banknote,
    Plus,
} from 'lucide-react';
import type { Project, ProjectEvent, StaffAttentionItem } from '@/lib/db';
import { mergeVentureOnboardingFromProject } from '@/lib/ventureOnboarding';
import {
    parseFundingLedger,
    countFilledFundingRows,
    buildFundingLedgerTemplate,
    type ParsedFundingRow,
} from '@/lib/ventureFundingStructure';
import { DeskShell, DeskEmpty } from '@/components/workspaces/DeskShell';
import { DeskRevealSection } from '@/components/workspaces/DeskRevealSection';

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
        title: 'Cross-office map (CEO · CTO · CSO · CMO)',
        shortLabel: 'Cross-office',
        hint: 'Strategy, delivery board, market, GTM, and each desk’s last sync brief — finance reads one record.',
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
    const marketText = (project.marketInsights || '').trim();

    const desk = snap?.desks;
    const syncPeerBlocks = [
        desk?.ceo?.trim() && `Staff sync · CEO brief:\n${desk.ceo.trim()}`,
        desk?.pm?.trim() && `Staff sync · CTO / PM brief:\n${desk.pm.trim()}`,
        desk?.scout?.trim() && `Staff sync · CSO brief:\n${desk.scout.trim()}`,
        desk?.cmo?.trim() && `Staff sync · CMO brief:\n${desk.cmo.trim()}`,
    ].filter(Boolean) as string[];

    const kanban = Array.isArray(project.kanban) ? project.kanban : [];
    const kanbanTitles = kanban
        .map((t: { title?: string }) => (typeof t?.title === 'string' ? t.title.trim() : ''))
        .filter(Boolean)
        .slice(0, 8);
    const kanbanBlock =
        kanbanTitles.length > 0
            ? `CTO execution board (sample titles):\n${kanbanTitles.map((t) => `• ${t}`).join('\n')}`
            : '';

    const crossDeskBlock = [
        strategy && `CEO desk — strategy field:\n${strategy}`,
        product && `CTO desk — product / plan field:\n${product}`,
        marketText && `CSO desk — market intel field:\n${marketText}`,
        kanbanBlock,
        ...syncPeerBlocks,
    ]
        .filter(Boolean)
        .join('\n\n---\n\n');

    const crossPreview =
        excerpt(strategy || product || marketText || syncPeerBlocks[0] || '', 120) || excerpt(crossDeskBlock, 120);
    const crossInsights = toInsightBullets(excerpt(crossDeskBlock, 2400), 8);
    const crossLatestAt = snap?.at ?? project.timestamp;
    const crossUpdated = {
        label: snap?.at ? 'Venture fields + last staff sync (peer desks)' : 'Venture fields (run sync for live peer briefs)',
        at: crossLatestAt,
    };
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
            preview:
                crossPreview ||
                'No cross-desk text yet — add strategy, product plan, market intel, or run staff sync.',
            insights: crossInsights,
            latest: crossUpdated,
            emptyHint:
                'Open CEO, CTO, CSO, or CMO desks to edit source fields, or run staff sync so every role’s brief lands in one venture record.',
            rawContext: crossDeskBlock,
            hasData: !!(strategy || product || marketText || syncPeerBlocks.length > 0 || kanbanTitles.length > 0),
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

Reply as CFO: be specific, flag risks, and say what’s missing from the numbers or narrative. When useful, say which other desk (CEO strategy, CTO delivery, CSO market, CMO GTM) should confirm or update assumptions.`;
}

function topicDiscussMessage(ventureName: string, topicTitle: string, rawContext: string): string {
    return `CFO desk — topic: "${topicTitle}" (venture: ${ventureName})

Context for this section:
${truncateForPrompt(rawContext || '(no data in this section yet)')}

You share one venture record with CEO (strategy), CTO (product + board), CSO (market), and CMO (GTM). Please: (1) summarize what matters for finance and cash, (2) call out any tension between roles (e.g. roadmap vs runway, GTM spend vs liquidity), (3) list risks or gaps, (4) suggest 2–3 concrete next steps and which desk should own each.`;
}

const LEDGER_QUICK_PROMPTS: { label: string; instruction: string }[] = [
    {
        label: 'Stress-test runway',
        instruction:
            'Challenge my runway and liquidity assumptions. What would make them wrong, and what should I monitor weekly?',
    },
    {
        label: 'CEO vs budget tension',
        instruction:
            'Compare our stated strategy and priorities to the budget and runway. Where is the narrative overstretched vs the numbers?',
    },
    {
        label: 'CTO delivery vs cash',
        instruction:
            'Given product plan and execution board load, what hiring, infra, or timeline choices most threaten runway in the next 90 days?',
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

/** Single funding panel: group rows so the CFO view reads top-to-bottom, not as scattered tiles. */
const FUNDING_ROW_GROUPS: { title: string; ids: string[] }[] = [
    { title: 'Capital & runway', ids: ['total_capital', 'secured', 'pre_launch', 'monthly_burn', 'runway_months'] },
    { title: 'Build & go-to-market', ids: ['product_build', 'gtm', 'team_people', 'infra'] },
    { title: 'Buffer & notes', ids: ['contingency', 'notes'] },
];

const PEER_DESKS: {
    room: 'ceo' | 'pm' | 'scout' | 'cmo';
    label: string;
    short: string;
    fieldHint: string;
    icon: typeof Briefcase;
}[] = [
    { room: 'ceo', label: 'CEO desk', short: 'CEO', fieldHint: 'Strategy', icon: Briefcase },
    { room: 'pm', label: 'CTO / PM desk', short: 'CTO', fieldHint: 'Product & board', icon: Cpu },
    { room: 'scout', label: 'CSO desk', short: 'CSO', fieldHint: 'Market intel', icon: ScanSearch },
    { room: 'cmo', label: 'CMO desk', short: 'CMO', fieldHint: 'GTM / narrative', icon: Megaphone },
];

const CFO_JUMP: { id: string; label: string }[] = [
    { id: 'cfo-funding', label: 'Funding' },
    { id: 'cfo-connected', label: 'Roles' },
    { id: 'cfo-snapshot', label: 'Snapshot' },
    { id: 'cfo-topic-cards', label: 'Topics' },
    { id: 'cfo-topic-panel', label: 'Brief' },
    { id: 'cfo-discuss', label: 'Chat' },
];

function scrollToCfoSection(anchorId: string) {
    document.getElementById(anchorId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

export function FinancialLedger() {
    const { activeProject, prepopulateChat, switchRoom, updateBudget } = useOffice();
    const [selectedTopicId, setSelectedTopicId] = useState<TopicId>('liquidity');
    const [copiedTopic, setCopiedTopic] = useState<TopicId | null>(null);
    const [budgetDraft, setBudgetDraft] = useState('');
    const [budgetSavedFlash, setBudgetSavedFlash] = useState(false);
    const detailPanelRef = useRef<HTMLDivElement>(null);

    const selectTopic = useCallback((id: TopicId) => {
        setSelectedTopicId(id);
        requestAnimationFrame(() => {
            detailPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    }, []);

    const budgetText = activeProject?.budget ?? '';

    useEffect(() => {
        setBudgetDraft(activeProject?.budget ?? '');
    }, [activeProject?.id, activeProject?.budget]);

    const onboardingMerged = useMemo(() => {
        if (!activeProject) return {} as Record<string, string>;
        return mergeVentureOnboardingFromProject(activeProject);
    }, [activeProject]);

    const resourcesFromOnboarding = onboardingMerged.resources?.trim() || '';

    const fundingRows = useMemo(() => parseFundingLedger(budgetDraft), [budgetDraft]);
    const fundingFilled = countFilledFundingRows(fundingRows);
    const fundingTotal = fundingRows.length;
    const totalCapitalRow = fundingRows.find((r) => r.spec.id === 'total_capital');

    const fundingById = useMemo(() => {
        const m: Record<string, ParsedFundingRow> = {};
        for (const r of fundingRows) {
            m[r.spec.id] = r;
        }
        return m;
    }, [fundingRows]);

    const persistBudget = useCallback(
        (next: string) => {
            updateBudget(next);
            setBudgetSavedFlash(true);
            window.setTimeout(() => setBudgetSavedFlash(false), 1600);
        },
        [updateBudget]
    );

    const topic = useMemo(() => {
        if (!activeProject) return null;
        return buildTopicContent(activeProject, budgetText);
    }, [activeProject, budgetText]);

    const peerStatus = useMemo(() => {
        if (!activeProject) {
            return { ceo: false, pm: false, scout: false, cmo: false };
        }
        const d = activeProject.agentStaffSnapshot?.desks;
        const s = (activeProject.strategy || '').trim().length > 0;
        const p = (activeProject.productPlan || '').trim().length > 0;
        const m = (activeProject.marketInsights || '').trim().length > 0;
        const k = Array.isArray(activeProject.kanban) && activeProject.kanban.length > 0;
        return {
            ceo: s || !!(d?.ceo?.trim()),
            pm: p || k || !!(d?.pm?.trim()),
            scout: m || !!(d?.scout?.trim()),
            cmo: !!(d?.cmo?.trim()),
        };
    }, [activeProject]);

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
        return <DeskEmpty className="text-brand-muted">Select a venture to open the CFO desk.</DeskEmpty>;
    }

    if (!topic) return null;

    const { map, focusToday, events } = topic;
    const selectedMeta = TOPIC_META.find((t) => t.id === selectedTopicId)!;
    const selectedRow = map[selectedTopicId];
    const lines = budgetText.split('\n').length;
    const chars = budgetText.length;
    const signals = financeSignals(budgetText);

    return (
        <DeskShell
            eyebrow="CFO · Numbers + scenario table"
            title="Chief Financial Officer"
            description="Structure how much capital this venture needs to get built, then tie it to runway and scenarios. The funding breakdown below parses labeled lines from your budget field; the editor saves to the same venture record the dashboard and CFO chat use."
            tabs={
                <nav className="flex flex-wrap gap-1" aria-label="CFO desk sections">
                    {CFO_JUMP.map((item) => (
                        <button
                            key={item.id}
                            type="button"
                            onClick={() => scrollToCfoSection(item.id)}
                            className="inline-flex items-center gap-2 rounded-md border border-transparent bg-transparent px-3 py-1.5 text-xs font-medium text-brand-muted transition-colors hover:border-brand-border hover:bg-brand-input/60 hover:text-brand-text"
                        >
                            {item.label}
                        </button>
                    ))}
                </nav>
            }
        >
            <div className="flex flex-col gap-4">
                <DeskRevealSection
                    id="cfo-funding"
                    variant="brand"
                    defaultOpen
                    title={`Expected funding — ${activeProject.name}`}
                    subtitle="Use the labeled lines below (or the template) so totals, burn, and runway surface here automatically. Values are read from your venture budget field."
                    badge={
                        <span className="inline-flex items-center gap-1 rounded-full border border-brand-teal/30 bg-brand-teal/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-brand-teal">
                            <Banknote className="h-3 w-3" aria-hidden />
                            {fundingFilled}/{fundingTotal} filled
                        </span>
                    }
                >
                    <div className="overflow-hidden rounded-xl border border-brand-border bg-brand-bg/50">
                        {resourcesFromOnboarding && resourcesFromOnboarding !== budgetDraft.trim() ? (
                            <div className="border-b border-brand-border/70 bg-brand-panel/30 px-4 py-3 sm:px-5">
                                <p className="text-[10px] font-semibold uppercase tracking-wider text-brand-muted">Onboarding · Resources</p>
                                <p className="mt-1 text-[12px] leading-relaxed text-brand-text/95">{resourcesFromOnboarding}</p>
                                <p className="mt-2 text-[10px] text-brand-muted">
                                    Merge into the ledger below so this desk has one source of truth.
                                </p>
                            </div>
                        ) : null}

                        <div className="border-b border-brand-border/70 bg-gradient-to-r from-brand-teal/12 via-brand-teal/5 to-transparent px-4 py-4 sm:px-5">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-brand-muted">Total capital needed</p>
                            {totalCapitalRow?.value ? (
                                <p className="mt-1.5 text-lg font-semibold leading-snug text-brand-text sm:text-xl">{totalCapitalRow.value}</p>
                            ) : (
                                <p className="mt-1.5 text-sm leading-relaxed text-brand-muted">
                                    Add a line starting with <span className="font-medium text-brand-text/90">Total capital needed</span> in the
                                    editor, or use the structure template.
                                </p>
                            )}
                            <div className="mt-3 h-1.5 w-full max-w-md overflow-hidden rounded-full bg-brand-border/40">
                                <div
                                    className="h-full rounded-full bg-brand-teal/75 transition-all duration-300"
                                    style={{ width: `${fundingTotal ? Math.round((fundingFilled / fundingTotal) * 100) : 0}%` }}
                                />
                            </div>
                            <p className="mt-2 text-[10px] text-brand-muted">
                                {fundingFilled} of {fundingTotal} ledger lines detected with values.
                            </p>
                        </div>

                        {FUNDING_ROW_GROUPS.map((group) => (
                            <div key={group.title} className="border-b border-brand-border/60 last:border-b-0">
                                <div className="bg-brand-panel/20 px-4 py-2 sm:px-5">
                                    <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-brand-muted">{group.title}</p>
                                </div>
                                <ul className="divide-y divide-brand-border/50">
                                    {group.ids.map((id) => {
                                        const row = fundingById[id];
                                        if (!row) return null;
                                        return (
                                            <li
                                                key={id}
                                                className={`flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-start sm:justify-between sm:gap-8 sm:px-5 ${
                                                    row.value ? 'bg-brand-input/25' : ''
                                                }`}
                                            >
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-[12px] font-medium text-brand-text">{row.spec.label}</p>
                                                    <p className="mt-0.5 text-[10px] leading-snug text-brand-muted">{row.spec.shortHint}</p>
                                                </div>
                                                <p
                                                    className={`shrink-0 text-left text-[13px] font-medium leading-snug sm:max-w-[min(24rem,45%)] sm:text-right ${
                                                        row.value ? 'text-brand-teal' : 'text-brand-muted'
                                                    }`}
                                                >
                                                    {row.value ?? '—'}
                                                </p>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </div>
                        ))}
                    </div>

                    <div className="mt-4 rounded-xl border border-brand-border/80 bg-brand-panel/20 p-4 sm:p-5">
                        <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-brand-muted">Budget &amp; ledger (venture record)</p>
                            <div className="flex flex-wrap gap-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        const t = buildFundingLedgerTemplate(activeProject.name);
                                        setBudgetDraft(t);
                                        persistBudget(t);
                                    }}
                                    className="inline-flex min-h-[40px] touch-manipulation items-center justify-center rounded-lg border border-brand-border bg-brand-card px-3 py-2 text-[11px] font-semibold text-brand-text hover:bg-brand-input"
                                >
                                    Use structure template
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        const t = buildFundingLedgerTemplate(activeProject.name);
                                        const next = budgetDraft.trim() ? `${budgetDraft.trim()}\n\n${t}` : t;
                                        setBudgetDraft(next);
                                        persistBudget(next);
                                    }}
                                    className="inline-flex min-h-[40px] touch-manipulation items-center justify-center gap-1.5 rounded-lg border border-brand-border bg-brand-bg px-3 py-2 text-[11px] font-medium text-brand-muted hover:border-brand-teal/25 hover:text-brand-text"
                                >
                                    <Plus className="h-3.5 w-3.5" aria-hidden />
                                    Append template
                                </button>
                            </div>
                        </div>
                        <textarea
                            value={budgetDraft}
                            onChange={(e) => setBudgetDraft(e.target.value)}
                            onBlur={() => {
                                if (budgetDraft !== (activeProject.budget ?? '')) {
                                    persistBudget(budgetDraft);
                                }
                            }}
                            placeholder={buildFundingLedgerTemplate(activeProject.name)}
                            rows={14}
                            className="min-h-[220px] w-full resize-y rounded-xl border border-brand-border bg-brand-input p-4 text-[13px] leading-relaxed text-brand-text placeholder:text-brand-muted/55 focus:outline-none focus:ring-2 focus:ring-brand-teal/25"
                            spellCheck={false}
                        />
                        <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-brand-muted">
                            <span>One metric per line with a colon. Template labels map to the table above.</span>
                            {budgetSavedFlash ? <span className="font-medium text-brand-teal">Saved to venture.</span> : <span>Blur field to save.</span>}
                        </p>
                    </div>
                </DeskRevealSection>

                <DeskRevealSection
                    id="cfo-connected"
                    variant="brand"
                    defaultOpen
                    title="Connected roles"
                    subtitle="One venture record — jump to another desk to refresh source data."
                    badge={
                        <span className="flex items-center gap-1 rounded-full border border-brand-border bg-brand-bg px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-brand-muted">
                            <Link2 className="h-3 w-3" aria-hidden />
                            Suite
                        </span>
                    }
                >
                    <p className="mb-3 text-[12px] leading-relaxed text-brand-muted">
                        CFO models cash against what CEO prioritizes, CTO ships, CSO sees in the market, and CMO pushes in GTM. Staff sync
                        refreshes every desk brief in one pass so numbers and narrative stay aligned.
                    </p>
                    <div className="overflow-hidden rounded-xl border border-brand-border bg-brand-border">
                        <div className="grid grid-cols-2 gap-px sm:grid-cols-4">
                            {PEER_DESKS.map(({ room, label, short, fieldHint, icon: Icon }) => {
                                const live = peerStatus[room];
                                return (
                                    <button
                                        key={room}
                                        type="button"
                                        onClick={() => switchRoom(room)}
                                        className="group flex flex-col items-start gap-2 bg-brand-panel/95 px-3 py-3 text-left transition-colors hover:bg-brand-input sm:py-2.5"
                                    >
                                        <span className="flex w-full items-center justify-between gap-1">
                                            <span className="flex h-8 w-8 items-center justify-center rounded-md border border-brand-border bg-brand-panel text-brand-text">
                                                <Icon className="h-4 w-4" aria-hidden />
                                            </span>
                                            <span
                                                className={`text-[9px] font-bold uppercase tracking-wider ${
                                                    live ? 'text-brand-teal' : 'text-brand-muted'
                                                }`}
                                            >
                                                {live ? 'Active' : 'Open'}
                                            </span>
                                        </span>
                                        <span className="text-[12px] font-semibold text-brand-text">{short}</span>
                                        <span className="text-[10px] leading-snug text-brand-muted">{fieldHint}</span>
                                        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-brand-muted group-hover:text-brand-text">
                                            {label}
                                            <ArrowRight className="h-3 w-3 opacity-70" aria-hidden />
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </DeskRevealSection>

                <DeskRevealSection
                    id="cfo-snapshot"
                    variant="brand"
                    defaultOpen
                    title="Venture snapshot"
                    subtitle="Budget field size and auto-detected finance cues — one summary strip."
                >
                    <div className="overflow-hidden rounded-xl border border-brand-border bg-brand-bg/40">
                        <div className="grid grid-cols-1 divide-y divide-brand-border/60 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
                            <div className="px-4 py-3 sm:px-5">
                                <p className="text-[10px] font-semibold uppercase tracking-wider text-brand-muted">Venture</p>
                                <p className="mt-1 truncate text-sm font-medium text-brand-text">{activeProject.name}</p>
                            </div>
                            <div className="px-4 py-3 sm:px-5">
                                <p className="text-[10px] font-semibold uppercase tracking-wider text-brand-muted">Budget field</p>
                                <p className="mt-1 text-sm font-medium text-brand-text">
                                    {chars.toLocaleString()} chars · {lines} lines
                                </p>
                            </div>
                            <div className="px-4 py-3 sm:px-5">
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
                                        <span className="text-[12px] text-brand-muted">Add burn, runway, or revenue cues.</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </DeskRevealSection>

                <DeskRevealSection
                    id="cfo-topic-cards"
                    variant="brand"
                    defaultOpen
                    title="Topics"
                    subtitle="Tap a card to load its detail below."
                >
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
                                        isSel ? 'ring-2 ring-brand-teal/25 ring-offset-2 ring-offset-brand-bg' : ''
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
                </DeskRevealSection>

                <DeskRevealSection
                    id="cfo-topic-panel"
                    variant="brand"
                    defaultOpen
                    title={selectedMeta.title}
                    subtitle={selectedMeta.hint}
                    badge={
                        <span
                            className={`rounded px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                                selectedRow.hasData ? DESK_PANEL.badgeOn : DESK_PANEL.badgeOff
                            }`}
                        >
                            {selectedRow.hasData ? 'Has data' : 'Empty'}
                        </span>
                    }
                >
                <div
                    ref={detailPanelRef}
                    id="cfo-topic-detail"
                    className={`rounded-lg p-4 sm:p-5 ${DESK_PANEL.detailWrap}`}
                >
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
                </DeskRevealSection>

                <DeskRevealSection
                    id="cfo-discuss"
                    variant="brand"
                    defaultOpen
                    title="Discuss with CFO"
                    subtitle="Chat prompts use your budget field, desk sync, and the topic you selected."
                    badge={
                        <span className="rounded-full border border-brand-border bg-brand-bg px-2 py-0.5 text-[10px] font-medium text-brand-muted">
                            Chat
                        </span>
                    }
                >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex min-w-0 gap-3">
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-brand-border bg-brand-bg text-brand-text">
                                <Bot className="h-5 w-5" aria-hidden />
                            </span>
                            <p className="max-w-xl text-[12px] leading-relaxed text-brand-muted">
                                Use the suite chat to work through finance. The buttons below pre-fill the CFO with your ledger context.
                            </p>
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
                </DeskRevealSection>
            </div>
        </DeskShell>
    );
}
