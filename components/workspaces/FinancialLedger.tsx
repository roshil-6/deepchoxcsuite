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
    Plus,
    Loader2,
    RefreshCw,
} from 'lucide-react';
import type { Project, ProjectEvent, StaffAttentionItem } from '@/lib/db';
import { mergeVentureOnboardingFromProject } from '@/lib/ventureOnboarding';
import { buildCfoFundingPayload } from '@/lib/cfoFundingContext';
import {
    parseFundingLedger,
    buildFundingLedgerTemplate,
    buildLedgerTextFromFundingValues,
    mergeFundingValueRows,
    FUNDING_VALUE_KEYS,
    type ParsedFundingRow,
    type FundingValueKey,
} from '@/lib/ventureFundingStructure';
import { DeskShell, DeskEmpty } from '@/components/workspaces/DeskShell';
import {
    DeskMsgUser,
    DeskMsgAssistant,
    DeskHubRow,
    DeskFocusToolbar,
} from '@/components/workspaces/DeskBlockFocusUI';
import { deskHeadline, deskHelpText, RESEARCH_STAFF } from '@/lib/researchStaffLabels';

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
        title: 'Cross-desk map (strategy, product, market, growth)',
        shortLabel: 'Cross-office',
        hint: 'Strategy, delivery board, market, go-to-market, and each desk’s last sync brief — finance reads one record.',
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
        title: 'Staff sync — fund intelligence brief',
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

type LedgerHubKey = 'funding' | 'connected' | 'snapshot' | 'discuss' | TopicId;

const LEDGER_HUB_STATIC: Record<
    'funding' | 'connected' | 'snapshot' | 'discuss',
    { title: string; question: string; prompt: string; hubSub: string }
> = {
    funding: {
        title: 'Expected funding',
        question: 'What capital, burn, runway, and ledger lines are we modeling?',
        prompt:
            'User is editing expected funding table, desk estimates, and venture budget field. Help in CFO terms; reference saved and estimated rows.',
        hubSub: 'Table, AI estimates, template, and venture budget field.',
    },
    connected: {
        title: 'Other desks',
        question: 'Which desk should finance read to validate assumptions?',
        prompt: 'User may jump to CEO strategy, CTO product, CSO market, or CMO GTM from fund intelligence.',
        hubSub: 'Open peer research areas to edit source fields.',
    },
    snapshot: {
        title: 'Ledger snapshot',
        question: 'How large is the budget field and what cues appear in the text?',
        prompt: 'User reviews venture budget field size and keyword signals for finance review.',
        hubSub: 'Chars, lines, and detected finance signals.',
    },
    discuss: {
        title: 'Discuss with this desk',
        question: 'What should we stress-test or clarify about this venture’s finances?',
        prompt:
            'User uses quick prompts or opens chat with budget field and fund intelligence context; reply as CFO.',
        hubSub: 'CFO chat and quick prompts.',
    },
};

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
            emptyHint: 'Budget text can be filled via staff sync, product/strategy flows, or coordination — then it appears here.',
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
                'Open strategy, product and delivery, market and landscape, or growth and narrative to edit source fields, or run staff sync so every brief lands in one venture record.',
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
            preview: aiPreview || 'Run staff sync from the overview to populate the fund intelligence brief.',
            insights: aiInsights,
            latest: aiUpdated,
            emptyHint: 'Staff sync merges research into a per-desk brief for fund intelligence.',
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
        label: 'Strategy versus budget tension',
        instruction:
            'Compare our stated strategy and priorities to the budget and runway. Where is the narrative overstretched vs the numbers?',
    },
    {
        label: 'Product delivery versus cash',
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

/** Single funding panel: group rows so the fund view reads top-to-bottom, not as scattered tiles. */
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
    { room: 'ceo', label: RESEARCH_STAFF.ceo.navTitle, short: RESEARCH_STAFF.ceo.navTitle, fieldHint: 'Strategy field', icon: Briefcase },
    { room: 'pm', label: RESEARCH_STAFF.pm.navTitle, short: RESEARCH_STAFF.pm.navTitle, fieldHint: 'Board and plan', icon: Cpu },
    { room: 'scout', label: RESEARCH_STAFF.scout.navTitle, short: RESEARCH_STAFF.scout.navTitle, fieldHint: 'Intel brief', icon: ScanSearch },
    { room: 'cmo', label: RESEARCH_STAFF.cmo.navTitle, short: RESEARCH_STAFF.cmo.navTitle, fieldHint: 'Go-to-market and story', icon: Megaphone },
];

export function FinancialLedger() {
    const { activeProject, prepopulateChat, switchRoom, updateBudget, setDeskSectionFocus } = useOffice();
    const [selectedTopicId, setSelectedTopicId] = useState<TopicId>('liquidity');
    const [copiedTopic, setCopiedTopic] = useState<TopicId | null>(null);
    const [budgetDraft, setBudgetDraft] = useState('');
    const [budgetSavedFlash, setBudgetSavedFlash] = useState(false);
    const [aiFunding, setAiFunding] = useState<Partial<Record<FundingValueKey, string>> | null>(null);
    const [aiFundingLoading, setAiFundingLoading] = useState(false);
    const [aiFundingError, setAiFundingError] = useState<string | null>(null);
    const [aiRefreshNonce, setAiRefreshNonce] = useState(0);
    const [ledgerFocus, setLedgerFocus] = useState<LedgerHubKey | null>(null);
    const autoAppliedLedgerRef = useRef<number | null>(null);

    useEffect(() => {
        setLedgerFocus(null);
        setDeskSectionFocus(null);
    }, [activeProject?.id, setDeskSectionFocus]);

    const applyLedgerDeskContext = useCallback(
        (key: LedgerHubKey | null) => {
            if (!key || !activeProject) {
                setDeskSectionFocus(null);
                return;
            }
            if (
                key === 'funding' ||
                key === 'connected' ||
                key === 'snapshot' ||
                key === 'discuss'
            ) {
                const m = LEDGER_HUB_STATIC[key];
                setDeskSectionFocus({
                    room: 'accountant',
                    sectionId: key,
                    title: m.title,
                    prompt: m.prompt,
                });
                return;
            }
            const meta = TOPIC_META.find((t) => t.id === key);
            if (!meta) {
                setDeskSectionFocus(null);
                return;
            }
            setDeskSectionFocus({
                room: 'accountant',
                sectionId: key,
                title: meta.title,
                prompt: `${meta.hint} User focused this fund-intelligence topic; answer in CFO terms and cite venture fields.`,
            });
        },
        [activeProject, setDeskSectionFocus],
    );

    const openLedgerSection = (key: LedgerHubKey) => {
        applyLedgerDeskContext(key);
        setLedgerFocus(key);
    };

    const goLedgerHub = () => {
        setDeskSectionFocus(null);
        setLedgerFocus(null);
    };

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
    const fundingTotal = fundingRows.length;
    const totalCapitalRow = fundingRows.find((r) => r.spec.id === 'total_capital');

    const fundingById = useMemo(() => {
        const m: Record<string, ParsedFundingRow> = {};
        for (const r of fundingRows) {
            m[r.spec.id] = r;
        }
        return m;
    }, [fundingRows]);

    const parsedFundingValues = useMemo(() => {
        const m: Partial<Record<FundingValueKey, string>> = {};
        for (const r of fundingRows) {
            if (r.value) m[r.spec.id as FundingValueKey] = r.value;
        }
        return m;
    }, [fundingRows]);

    const fundingSuggestKey = useMemo(
        () =>
            activeProject
                ? `${activeProject.id}-${activeProject.timestamp}-${activeProject.agentStaffSnapshot?.at ?? 0}-${aiRefreshNonce}`
                : '',
        [activeProject, aiRefreshNonce]
    );

    const fundingFilledWithAi = useMemo(() => {
        let n = 0;
        for (const k of FUNDING_VALUE_KEYS) {
            const saved = parsedFundingValues[k]?.trim();
            const ai = aiFunding?.[k]?.trim();
            if (saved || ai) n++;
        }
        return n;
    }, [parsedFundingValues, aiFunding]);

    const persistBudget = useCallback(
        (next: string) => {
            updateBudget(next);
            setBudgetSavedFlash(true);
            window.setTimeout(() => setBudgetSavedFlash(false), 1600);
        },
        [updateBudget]
    );

    useEffect(() => {
        if (!activeProject?.id || !fundingSuggestKey) return;
        const ac = new AbortController();
        let cancelled = false;
        (async () => {
            setAiFundingLoading(true);
            setAiFundingError(null);
            try {
                const payload = buildCfoFundingPayload(activeProject);
                const res = await fetch('/api/cfo-funding-suggest', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ payload }),
                    signal: ac.signal,
                });
                const data = (await res.json()) as { ok?: boolean; error?: string; values?: Partial<Record<FundingValueKey, string>> };
                if (cancelled) return;
                if (!res.ok || !data.ok) {
                    setAiFunding(null);
                    setAiFundingError(typeof data.error === 'string' ? data.error : 'Could not load desk estimates');
                    return;
                }
                setAiFunding(data.values ?? null);
                setAiFundingError(null);
            } catch (e) {
                if (cancelled || (e instanceof Error && e.name === 'AbortError')) return;
                setAiFunding(null);
                setAiFundingError(e instanceof Error ? e.message : 'Request failed');
            } finally {
                if (!cancelled) setAiFundingLoading(false);
            }
        })();
        return () => {
            cancelled = true;
            ac.abort();
        };
    }, [fundingSuggestKey]);

    useEffect(() => {
        autoAppliedLedgerRef.current = null;
    }, [activeProject?.id]);

    useEffect(() => {
        if (!activeProject) return;
        if (!(activeProject.budget || '').trim()) {
            autoAppliedLedgerRef.current = null;
        }
    }, [activeProject?.budget, activeProject?.id]);

    useEffect(() => {
        if (!activeProject?.id || !aiFunding) return;
        const budgetEmpty = !(activeProject.budget || '').trim();
        if (!budgetEmpty) return;
        const filled = Object.values(aiFunding).filter((x) => (x || '').trim()).length;
        if (filled < 3) return;
        if (autoAppliedLedgerRef.current === activeProject.id) return;
        autoAppliedLedgerRef.current = activeProject.id!;
        const text = buildLedgerTextFromFundingValues(activeProject.name, aiFunding);
        setBudgetDraft(text);
        persistBudget(text);
    }, [activeProject?.id, activeProject?.budget, activeProject?.name, aiFunding, persistBudget]);

    const applyMergedFundingToLedger = useCallback(() => {
        if (!activeProject || !aiFunding) return;
        const merged = mergeFundingValueRows(parsedFundingValues, aiFunding);
        const text = buildLedgerTextFromFundingValues(activeProject.name, merged);
        setBudgetDraft(text);
        persistBudget(text);
    }, [activeProject, aiFunding, parsedFundingValues, persistBudget]);

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
        return <DeskEmpty className="text-brand-muted">Select a venture to open Research fund intelligence.</DeskEmpty>;
    }

    if (!topic) return null;

    const { map, focusToday, events } = topic;
    const lines = budgetText.split('\n').length;
    const chars = budgetText.length;
    const signals = financeSignals(budgetText);

    const renderLedgerFocusBody = (k: LedgerHubKey): React.ReactNode => {
        switch (k) {
            case 'funding':
                return (
                    <>
                        <p className="mb-1 text-[11px] text-brand-muted">
                            Saved rows and desk estimates merge in the table ({fundingFilledWithAi}/{fundingTotal} lines filled). Refresh after
                            you edit other areas.
                        </p>
                        <div className="mb-3 flex flex-wrap items-center gap-2">
                            <button
                                type="button"
                                disabled={aiFundingLoading}
                                onClick={() => setAiRefreshNonce((n) => n + 1)}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-brand-border bg-brand-card px-3 py-1.5 text-[11px] font-semibold text-brand-text hover:bg-brand-input disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {aiFundingLoading ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                                ) : (
                                    <RefreshCw className="h-3.5 w-3.5" aria-hidden />
                                )}
                                Refresh desk estimates
                            </button>
                            {aiFunding && (
                                <button
                                    type="button"
                                    onClick={applyMergedFundingToLedger}
                                    className="inline-flex items-center gap-1.5 rounded-lg border border-brand-border bg-brand-bg px-3 py-1.5 text-[11px] font-medium text-brand-muted hover:border-brand-teal/25 hover:text-brand-text"
                                >
                                    Merge AI into ledger (keep saved lines)
                                </button>
                            )}
                            {aiFundingLoading && (
                                <span className="text-[11px] text-brand-muted">Analyzing venture across desks…</span>
                            )}
                        </div>
                        {aiFundingError ? (
                            <p className="mb-3 text-[11px] leading-relaxed text-brand-muted">
                                <span className="font-medium text-brand-text">Estimate unavailable.</span> {aiFundingError}
                            </p>
                        ) : null}

                        <div className="overflow-hidden rounded-lg border border-brand-border/70 bg-brand-bg/25">
                            {resourcesFromOnboarding && resourcesFromOnboarding !== budgetDraft.trim() ? (
                                <div className="border-b border-brand-border/60 bg-brand-panel/20 px-3 py-2.5 sm:px-4">
                                    <p className="text-[10px] font-semibold uppercase tracking-wider text-brand-muted">Onboarding · Resources</p>
                                    <p className="mt-1 text-[12px] leading-relaxed text-brand-text/95">{resourcesFromOnboarding}</p>
                                    <p className="mt-2 text-[10px] text-brand-muted">
                                        Merge into the ledger below so this desk has one source of truth.
                                    </p>
                                </div>
                            ) : null}

                            <div className="border-b border-brand-border/60 bg-brand-panel/15 px-3 py-3 sm:px-4">
                                <p className="text-[10px] font-semibold uppercase tracking-wider text-brand-muted">Total capital needed</p>
                                {totalCapitalRow?.value?.trim() || aiFunding?.total_capital?.trim() ? (
                                    <p className="mt-1.5 text-lg font-semibold leading-snug text-brand-text sm:text-xl">
                                        {totalCapitalRow?.value?.trim() || aiFunding?.total_capital?.trim()}
                                    </p>
                                ) : (
                                    <p className="mt-1.5 text-sm leading-relaxed text-brand-muted">
                                        Add a line starting with <span className="font-medium text-brand-text/90">Total capital needed</span> in the
                                        editor, use the template, or wait for desk estimates when other areas have data.
                                    </p>
                                )}
                                <div className="mt-2 h-1 w-full max-w-md overflow-hidden rounded-full bg-brand-border/40">
                                    <div
                                        className="h-full rounded-full bg-brand-teal/75 transition-all duration-300"
                                        style={{
                                            width: `${fundingTotal ? Math.round((fundingFilledWithAi / fundingTotal) * 100) : 0}%`,
                                        }}
                                    />
                                </div>
                                <p className="mt-2 text-[10px] text-brand-muted">
                                    {fundingFilledWithAi} of {fundingTotal} lines with saved or estimated values.
                                </p>
                            </div>

                            {FUNDING_ROW_GROUPS.map((group) => (
                                <div key={group.title} className="border-b border-brand-border/50 last:border-b-0">
                                    <div className="bg-brand-panel/10 px-3 py-1.5 sm:px-4">
                                        <p className="text-[10px] font-medium uppercase tracking-wide text-brand-muted">{group.title}</p>
                                    </div>
                                    <ul className="divide-y divide-brand-border/40">
                                        {group.ids.map((id) => {
                                            const row = fundingById[id];
                                            if (!row) return null;
                                            const saved = row.value?.trim();
                                            const aiVal = aiFunding?.[id as FundingValueKey]?.trim();
                                            const display = saved || aiVal || '';
                                            const isAiOnly = !saved && !!aiVal;
                                            return (
                                                <li
                                                    key={id}
                                                    className={`flex flex-col gap-0.5 px-3 py-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-4 ${
                                                        display ? 'bg-brand-input/15' : ''
                                                    }`}
                                                >
                                                    <div className="min-w-0 flex-1">
                                                        <p className="text-[12px] font-medium text-brand-text">{row.spec.label}</p>
                                                        <p className="text-[10px] leading-snug text-brand-muted/90">{row.spec.shortHint}</p>
                                                    </div>
                                                    <div className="flex min-w-0 shrink-0 flex-col items-start gap-0.5 sm:max-w-[min(24rem,45%)] sm:items-end sm:text-right">
                                                        <p
                                                            className={`text-left text-[13px] font-medium leading-snug sm:text-right ${
                                                                display
                                                                    ? isAiOnly
                                                                        ? 'text-brand-muted'
                                                                        : 'text-brand-teal'
                                                                    : 'text-brand-muted'
                                                            }`}
                                                        >
                                                            {display || '—'}
                                                        </p>
                                                        {isAiOnly ? (
                                                            <span className="text-[9px] font-semibold uppercase tracking-wider text-brand-teal/80">
                                                                Desk estimate
                                                            </span>
                                                        ) : null}
                                                    </div>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                </div>
                            ))}
                        </div>

                        <div className="mt-3 rounded-lg border border-brand-border/70 bg-brand-panel/15 p-3 sm:p-4">
                            <div className="mb-2 flex flex-wrap gap-2">
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
                                {budgetSavedFlash ? (
                                    <span className="font-medium text-brand-teal">Saved to venture.</span>
                                ) : (
                                    <span>Blur field to save.</span>
                                )}
                            </p>
                        </div>
                    </>
                );
            case 'connected':
                return (
                    <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                        {PEER_DESKS.map(({ room, short, icon: Icon }) => {
                            const live = peerStatus[room];
                            return (
                                <button
                                    key={room}
                                    type="button"
                                    onClick={() => switchRoom(room)}
                                    className="group flex items-center gap-2 rounded-md border border-brand-border/70 bg-brand-panel/40 px-2.5 py-2 text-left transition hover:bg-brand-input/80"
                                >
                                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded border border-brand-border/80 bg-brand-bg text-brand-text">
                                        <Icon className="h-3.5 w-3.5" aria-hidden />
                                    </span>
                                    <span className="min-w-0 flex-1">
                                        <span className="block text-[12px] font-semibold text-brand-text">{short}</span>
                                        <span className={`text-[9px] uppercase ${live ? 'text-brand-teal' : 'text-brand-muted'}`}>
                                            {live ? 'Has data' : 'Open'}
                                        </span>
                                    </span>
                                    <ArrowRight className="h-3 w-3 shrink-0 text-brand-muted opacity-60 group-hover:opacity-100" aria-hidden />
                                </button>
                            );
                        })}
                    </div>
                );
            case 'snapshot':
                return (
                    <div className="rounded-lg border border-brand-border/60 bg-brand-bg/25">
                        <div className="grid grid-cols-1 divide-y divide-brand-border/50 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
                            <div className="px-3 py-2.5 sm:px-4">
                                <p className="text-[10px] font-semibold uppercase tracking-wider text-brand-muted">Venture</p>
                                <p className="mt-1 truncate text-sm font-medium text-brand-text">{activeProject.name}</p>
                            </div>
                            <div className="px-3 py-2.5 sm:px-4">
                                <p className="text-[10px] font-semibold uppercase tracking-wider text-brand-muted">Budget field</p>
                                <p className="mt-1 text-sm font-medium text-brand-text">
                                    {chars.toLocaleString()} chars · {lines} lines
                                </p>
                            </div>
                            <div className="px-3 py-2.5 sm:px-4">
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
                );
            case 'discuss':
                return (
                    <>
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex min-w-0 items-start gap-2">
                                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-brand-border bg-brand-bg text-brand-text">
                                    <Bot className="h-4 w-4" aria-hidden />
                                </span>
                                <p className="max-w-xl text-[11px] leading-snug text-brand-muted">
                                    Suite chat opens with this desk’s context. Use the actions and quick prompts below.
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
                                    Discuss venture finances
                                </button>
                            </div>
                        </div>

                        <div className="mt-3 flex flex-wrap items-center gap-2">
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
                    </>
                );
            default: {
                const topicId = k as TopicId;
                if (!TOPIC_META.some((t) => t.id === topicId)) return null;
                const meta = TOPIC_META.find((t) => t.id === topicId)!;
                const row = map[topicId];
                return (
                    <>
                        <div className="mb-3 flex flex-wrap items-center gap-2">
                            <span
                                className={`rounded px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                                    row.hasData ? DESK_PANEL.badgeOn : DESK_PANEL.badgeOff
                                }`}
                            >
                                {row.hasData ? 'Has data' : 'Empty'}
                            </span>
                            <span className="text-[11px] text-brand-muted">{meta.hint}</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                            {TOPIC_META.map(({ id, shortLabel, icon: Icon }) => {
                                const r = map[id];
                                const isSel = topicId === id;
                                return (
                                    <button
                                        key={id}
                                        type="button"
                                        onClick={() => {
                                            setSelectedTopicId(id);
                                            openLedgerSection(id);
                                        }}
                                        className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-left text-[11px] font-medium transition ${
                                            isSel
                                                ? 'border-brand-teal/40 bg-brand-input text-brand-text'
                                                : r.hasData
                                                  ? 'border-brand-border bg-brand-panel/50 text-brand-text hover:bg-brand-input/50'
                                                  : 'border-brand-border/60 bg-brand-bg/40 text-brand-muted hover:border-brand-border'
                                        }`}
                                    >
                                        <Icon className="h-3.5 w-3.5 shrink-0 opacity-80" aria-hidden />
                                        <span>{shortLabel}</span>
                                        <span
                                            className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                                                r.hasData ? 'bg-brand-teal' : 'bg-brand-border'
                                            }`}
                                            title={r.hasData ? 'Has data' : 'Empty'}
                                        />
                                    </button>
                                );
                            })}
                        </div>
                        <div className={`mt-3 rounded-lg p-4 sm:p-5 ${DESK_PANEL.detailWrap}`}>
                            <p className="mb-3 text-[12px] leading-snug text-brand-muted">{row.preview}</p>

                            <div className="space-y-3">
                                <div>
                                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-brand-muted">Latest update</p>
                                    <p className="mt-1 text-[13px] text-brand-text">
                                        {row.latest.label}
                                        {row.latest.at != null && (
                                            <span className="text-brand-muted"> · {formatWhen(row.latest.at)}</span>
                                        )}
                                    </p>
                                </div>

                                <div>
                                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-brand-muted">Insights</p>
                                    {row.insights.length > 0 ? (
                                        <ul className="mt-2 list-disc space-y-1.5 pl-4 text-[13px] leading-relaxed text-brand-text/95">
                                            {row.insights.map((line, i) => (
                                                <li key={i}>{line}</li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <p className="mt-2 text-[13px] leading-relaxed text-brand-muted">{row.emptyHint}</p>
                                    )}
                                </div>

                                <div className="flex flex-wrap items-center gap-2 border-t border-brand-border/50 pt-3">
                                    <button
                                        type="button"
                                        onClick={() => askCfoTopic(topicId, meta.title)}
                                        className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-semibold transition-colors ${DESK_PANEL.askBtn}`}
                                    >
                                        <MessageSquare className="h-3.5 w-3.5" aria-hidden />
                                        Ask about this topic
                                    </button>
                                    <button
                                        type="button"
                                        disabled={row.insights.length === 0}
                                        onClick={() => copyInsights(topicId, meta.title, row.insights)}
                                        className="inline-flex items-center gap-1.5 rounded-lg border border-brand-border bg-brand-bg px-3 py-1.5 text-[11px] font-medium text-brand-text transition-colors hover:bg-brand-input disabled:cursor-not-allowed disabled:opacity-40"
                                    >
                                        {copiedTopic === topicId ? (
                                            <Check className="h-3.5 w-3.5 text-brand-teal" aria-hidden />
                                        ) : (
                                            <Copy className="h-3.5 w-3.5" aria-hidden />
                                        )}
                                        {copiedTopic === topicId ? 'Copied' : 'Copy bullets'}
                                    </button>
                                </div>

                                {topicId === 'ai_brief' && focusToday.length > 0 && (
                                    <div className="rounded-md border border-brand-border bg-brand-bg px-3 py-2.5">
                                        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-brand-muted">Office focus today</p>
                                        <ul className="mt-2 list-disc space-y-1 pl-4 text-[12px] text-brand-muted">
                                            {focusToday.map((line, i) => (
                                                <li key={i}>{line}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {topicId === 'attention' && events.length > 0 && (
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
                    </>
                );
            }
        }
    };

    const ledgerFocusCopy = ledgerFocus
        ? ledgerFocus === 'funding' ||
          ledgerFocus === 'connected' ||
          ledgerFocus === 'snapshot' ||
          ledgerFocus === 'discuss'
            ? LEDGER_HUB_STATIC[ledgerFocus]
            : TOPIC_META.find((t) => t.id === ledgerFocus)
        : null;

    const LEDGER_STATIC_HUB: Array<'funding' | 'connected' | 'snapshot'> = ['funding', 'connected', 'snapshot'];

    const ledgerHubIcon = (k: LedgerHubKey) => {
        const wrap = (node: React.ReactNode) => (
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.04] text-brand-muted sm:h-9 sm:w-9">{node}</span>
        );
        if (k === 'funding') return wrap(<Wallet className="h-4 w-4" aria-hidden />);
        if (k === 'connected') return wrap(<GitBranch className="h-4 w-4" aria-hidden />);
        if (k === 'snapshot') return wrap(<ScanSearch className="h-4 w-4" aria-hidden />);
        if (k === 'discuss') return wrap(<MessageSquare className="h-4 w-4" aria-hidden />);
        const tm = TOPIC_META.find((t) => t.id === k);
        if (tm) {
            const Icon = tm.icon;
            return wrap(<Icon className="h-4 w-4" aria-hidden />);
        }
        return null;
    };

    return (
        <DeskShell
            className="min-h-0 flex-1"
            title={deskHeadline(activeProject.name, 'accountant')}
            description={ledgerFocus ? undefined : deskHelpText('accountant')}
            bodyFlush={Boolean(ledgerFocus)}
            bodyClassName={ledgerFocus ? 'flex min-h-0 flex-1 flex-col px-4 pb-28 pt-0 sm:px-5 sm:pb-32' : undefined}
        >
            {ledgerFocus && ledgerFocusCopy ? (
                <>
                    <DeskFocusToolbar
                        onBack={goLedgerHub}
                        title={
                            'question' in ledgerFocusCopy
                                ? ledgerFocusCopy.title
                                : (ledgerFocusCopy as (typeof TOPIC_META)[number]).title
                        }
                        onSave={ledgerFocus === 'funding' ? () => persistBudget(budgetDraft) : undefined}
                        saveLabel="Save budget"
                    />
                    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                        <div className="custom-scrollbar flex-1 space-y-3 overflow-y-auto py-3">
                            <DeskMsgUser>
                                <p className="text-[13px] font-semibold text-zinc-50">
                                    {'question' in ledgerFocusCopy
                                        ? ledgerFocusCopy.title
                                        : (ledgerFocusCopy as (typeof TOPIC_META)[number]).title}
                                </p>
                                <p className="mt-1 text-[12px] leading-relaxed text-zinc-300">
                                    {'question' in ledgerFocusCopy
                                        ? ledgerFocusCopy.question
                                        : (ledgerFocusCopy as (typeof TOPIC_META)[number]).hint}
                                </p>
                            </DeskMsgUser>
                            <DeskMsgAssistant>
                                <div className="flex flex-col gap-3">{renderLedgerFocusBody(ledgerFocus)}</div>
                            </DeskMsgAssistant>
                        </div>
                    </div>
                </>
            ) : (
                <div className="space-y-2 pb-8">
                    <p className="text-[10px] leading-snug text-brand-muted">
                        Tap a block — other sections hide. Chat below stays on that block until you press Back.
                    </p>
                    <div className="space-y-1.5 sm:space-y-2">
                        {LEDGER_STATIC_HUB.map((k) => (
                            <DeskHubRow
                                key={k}
                                title={LEDGER_HUB_STATIC[k].title}
                                subtitle={LEDGER_HUB_STATIC[k].hubSub}
                                onOpen={() => openLedgerSection(k)}
                                right={ledgerHubIcon(k)}
                            />
                        ))}
                        {TOPIC_META.map((tm) => (
                            <DeskHubRow
                                key={tm.id}
                                title={tm.title}
                                subtitle={tm.hint}
                                onOpen={() => {
                                    setSelectedTopicId(tm.id);
                                    openLedgerSection(tm.id);
                                }}
                                right={ledgerHubIcon(tm.id)}
                            />
                        ))}
                        <DeskHubRow
                            title={LEDGER_HUB_STATIC.discuss.title}
                            subtitle={LEDGER_HUB_STATIC.discuss.hubSub}
                            onOpen={() => openLedgerSection('discuss')}
                            right={ledgerHubIcon('discuss')}
                        />
                    </div>
                </div>
            )}
        </DeskShell>
    );
}
