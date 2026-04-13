'use client';

/**
 * JARVIS — Intelligent Command Center
 *
 * A single room that gives the founder:
 *  1. Full dual-agent venture analysis with health scores per section
 *  2. Interactive report they can read or hear (TTS)
 *  3. Voice or text input to update the venture and regenerate
 *  4. One-click apply of all proposed changes to venture sections
 *  5. Continuous conversation loop: user speaks → Jarvis responds + updates
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    Activity,
    AlertTriangle,
    ArrowRight,
    CheckCircle2,
    ChevronDown,
    ChevronUp,
    Cpu,
    Loader2,
    Mic,
    MicOff,
    Play,
    RefreshCw,
    Send,
    Square,
    Volume2,
    VolumeX,
    Zap,
    Bot,
    TrendingUp,
    TrendingDown,
    Minus,
    Shield,
    Sparkles,
} from 'lucide-react';
import { useOffice } from '@/lib/OfficeContext';
import type { JarvisReport, JarvisSection } from '@/app/api/jarvis/route';

// ─── Utility types ────────────────────────────────────────────────────────────

type VoiceState = 'idle' | 'listening' | 'processing' | 'speaking';

// ─── Voice hook ───────────────────────────────────────────────────────────────

function useJarvisVoice(onTranscript: (text: string) => void) {
    const [voiceState, setVoiceState] = useState<VoiceState>('idle');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const recognitionRef = useRef<any>(null);
    const synthRef = useRef<SpeechSynthesisUtterance | null>(null);
    const speakingRef = useRef(false);

    const startListening = useCallback(() => {
        if (typeof window === 'undefined') return;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const SR = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;
        if (!SR) { alert('Speech recognition not supported in this browser.'); return; }

        const rec = new SR();
        rec.continuous = false;
        rec.interimResults = false;
        rec.lang = 'en-US';

        rec.onstart = () => setVoiceState('listening');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        rec.onresult = (e: any) => {
            const text = e.results[0]?.[0]?.transcript ?? '';
            if (text.trim()) { onTranscript(text.trim()); setVoiceState('processing'); }
        };
        rec.onerror = () => setVoiceState('idle');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        rec.onend = () => { if (voiceState === 'listening') setVoiceState('idle'); };

        recognitionRef.current = rec;
        rec.start();
    }, [onTranscript, voiceState]);

    const stopListening = useCallback(() => {
        recognitionRef.current?.stop();
        setVoiceState('idle');
    }, []);

    const speak = useCallback((text: string, onEnd?: () => void) => {
        if (typeof window === 'undefined' || !window.speechSynthesis) return;
        window.speechSynthesis.cancel();
        const utt = new SpeechSynthesisUtterance(text);

        // Pick a natural voice
        const voices = window.speechSynthesis.getVoices();
        const preferred = voices.find((v) => v.name.toLowerCase().includes('google uk english male'))
            ?? voices.find((v) => v.lang === 'en-US' && !v.name.toLowerCase().includes('zira'))
            ?? voices[0];
        if (preferred) utt.voice = preferred;

        utt.rate = 0.95;
        utt.pitch = 0.9;
        utt.volume = 1;

        utt.onstart = () => { speakingRef.current = true; setVoiceState('speaking'); };
        utt.onend = () => { speakingRef.current = false; setVoiceState('idle'); onEnd?.(); };
        utt.onerror = () => { speakingRef.current = false; setVoiceState('idle'); };

        synthRef.current = utt;
        window.speechSynthesis.speak(utt);
    }, []);

    const stopSpeaking = useCallback(() => {
        window.speechSynthesis?.cancel();
        speakingRef.current = false;
        setVoiceState('idle');
    }, []);

    useEffect(() => () => {
        recognitionRef.current?.stop();
        window.speechSynthesis?.cancel();
    }, []);

    return { voiceState, startListening, stopListening, speak, stopSpeaking };
}

// ─── Status colours ────────────────────────────────────────────────────────────

const STATUS_COLOR = {
    strong:   { ring: 'ring-emerald-500/40',  bg: 'bg-emerald-500/10',  text: 'text-emerald-300',  dot: 'bg-emerald-400',  label: 'Strong'   },
    caution:  { ring: 'ring-amber-500/40',    bg: 'bg-amber-500/10',    text: 'text-amber-300',    dot: 'bg-amber-400',    label: 'Caution'  },
    risk:     { ring: 'ring-orange-500/40',   bg: 'bg-orange-500/10',   text: 'text-orange-300',   dot: 'bg-orange-400',   label: 'Risk'     },
    critical: { ring: 'ring-red-500/40',      bg: 'bg-red-500/10',      text: 'text-red-300',      dot: 'bg-red-400',      label: 'Critical' },
} as const;

const RISK_BADGE = {
    high:   'border-red-500/30 bg-red-500/10 text-red-300',
    medium: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
    low:    'border-sky-500/25 bg-sky-500/8 text-sky-300',
} as const;

const DESK_LABEL: Record<JarvisSection['desk'], string> = {
    strategy: 'Strategy',
    finance:  'Finance',
    product:  'Product',
    market:   'Market',
    gtm:      'GTM',
};

const TF_BADGE = {
    today:       'border-red-500/25 bg-red-500/8 text-red-300',
    'this week': 'border-amber-500/25 bg-amber-500/8 text-amber-300',
    'this month':'border-sky-500/25 bg-sky-500/8 text-sky-300',
} as const;

// ─── Orb ──────────────────────────────────────────────────────────────────────

function JarvisOrb({ state, confidence }: { state: VoiceState | 'loading' | 'ready'; confidence?: JarvisReport['confidence'] }) {
    const base = 'relative flex items-center justify-center rounded-full transition-all duration-700';

    const ring =
        state === 'listening'  ? 'ring-4 ring-sky-400/60 shadow-[0_0_40px_rgba(56,189,248,0.25)]' :
        state === 'speaking'   ? 'ring-4 ring-violet-400/60 shadow-[0_0_40px_rgba(167,139,250,0.25)]' :
        state === 'loading'    ? 'ring-2 ring-white/20 shadow-[0_0_20px_rgba(255,255,255,0.05)]' :
        confidence === 'high'  ? 'ring-2 ring-emerald-500/40 shadow-[0_0_28px_rgba(16,185,129,0.12)]' :
        confidence === 'medium'? 'ring-2 ring-amber-500/35 shadow-[0_0_22px_rgba(245,158,11,0.10)]' :
                                 'ring-2 ring-white/10';

    const inner =
        state === 'listening'  ? 'bg-gradient-to-br from-sky-600/40 to-sky-400/20' :
        state === 'speaking'   ? 'bg-gradient-to-br from-violet-600/40 to-violet-400/20' :
        state === 'loading'    ? 'bg-gradient-to-br from-zinc-700/50 to-zinc-600/30 animate-pulse' :
                                 'bg-gradient-to-br from-zinc-800/60 to-zinc-700/30';

    return (
        <div className={`${base} h-20 w-20 ${ring}`}>
            <div className={`flex h-16 w-16 items-center justify-center rounded-full ${inner}`}>
                {state === 'loading' ? (
                    <Loader2 className="h-7 w-7 animate-spin text-zinc-400" />
                ) : state === 'listening' ? (
                    <Mic className="h-7 w-7 text-sky-300" />
                ) : state === 'speaking' ? (
                    <Volume2 className="h-7 w-7 text-violet-300" />
                ) : (
                    <Bot className="h-7 w-7 text-zinc-300" />
                )}
            </div>
            {(state === 'listening' || state === 'speaking') && (
                <span className="absolute inset-0 rounded-full animate-ping opacity-20 ring-1 ring-current" />
            )}
        </div>
    );
}

// ─── Health pill ───────────────────────────────────────────────────────────────

function HealthPill({ label, status }: { label: string; status: keyof typeof STATUS_COLOR }) {
    const c = STATUS_COLOR[status];
    return (
        <div className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 ${c.ring} ${c.bg}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${c.dot}`} />
            <span className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">{label}</span>
            <span className={`text-[10px] font-bold uppercase tracking-wide ${c.text}`}>{c.label}</span>
        </div>
    );
}

// ─── Section card ─────────────────────────────────────────────────────────────

function SectionCard({ section, onRead }: { section: JarvisSection; onRead: (text: string) => void }) {
    const [open, setOpen] = useState(false);
    const c = STATUS_COLOR[section.status];

    return (
        <div className={`rounded-2xl border ${c.ring} ${c.bg} overflow-hidden`}>
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className="flex w-full items-center gap-3 px-4 py-3.5 text-left"
            >
                <span className={`h-2 w-2 shrink-0 rounded-full ${c.dot}`} />
                <span className="flex-1 min-w-0">
                    <span className="block text-[13px] font-semibold text-zinc-100">{section.title}</span>
                    <span className={`text-[10px] font-bold uppercase tracking-wide ${c.text}`}>{c.label}</span>
                </span>
                {open ? <ChevronUp className="h-4 w-4 shrink-0 text-zinc-500" /> : <ChevronDown className="h-4 w-4 shrink-0 text-zinc-500" />}
            </button>

            {open && (
                <div className="border-t border-white/[0.06] px-4 pb-4 pt-3 space-y-3">
                    <p className="text-[13px] leading-relaxed text-zinc-300">{section.insight}</p>
                    <div className="flex items-start gap-2 rounded-xl border border-white/[0.08] bg-black/25 px-3 py-2.5">
                        <ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-zinc-500" />
                        <p className="text-[12px] text-zinc-400">{section.action}</p>
                    </div>
                    <button
                        type="button"
                        onClick={() => onRead(`${section.title}. ${section.insight} Next action: ${section.action}`)}
                        className="flex items-center gap-1.5 text-[10px] font-medium text-zinc-600 hover:text-zinc-400 transition-colors"
                    >
                        <Volume2 className="h-3 w-3" /> Read aloud
                    </button>
                </div>
            )}
        </div>
    );
}

// ─── Proposed update badge ────────────────────────────────────────────────────

function ProposedUpdateRow({
    label,
    content,
    applied,
    onApply,
}: {
    label: string;
    content: string;
    applied: boolean;
    onApply: () => void;
}) {
    const [expanded, setExpanded] = useState(false);
    return (
        <div className="rounded-xl border border-violet-500/20 bg-violet-500/[0.06] px-3 py-2.5">
            <div className="flex items-center justify-between gap-2">
                <button type="button" onClick={() => setExpanded((v) => !v)} className="flex items-center gap-2 min-w-0 flex-1">
                    <span className="text-[11px] font-semibold text-violet-200">{label}</span>
                    <span className="text-[10px] text-zinc-600 truncate">{content.slice(0, 60)}…</span>
                </button>
                {applied ? (
                    <span className="flex items-center gap-1 text-[10px] text-emerald-400 shrink-0">
                        <CheckCircle2 className="h-3 w-3" /> Applied
                    </span>
                ) : (
                    <button
                        type="button"
                        onClick={onApply}
                        className="shrink-0 rounded-lg border border-violet-500/30 bg-violet-500/15 px-2.5 py-1 text-[10px] font-semibold text-violet-100 transition hover:bg-violet-500/25"
                    >
                        Apply
                    </button>
                )}
            </div>
            {expanded && (
                <p className="mt-2 text-[11px] leading-relaxed text-zinc-400 whitespace-pre-wrap">{content}</p>
            )}
        </div>
    );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function JarvisRoom() {
    const {
        activeProject,
        updateStrategy,
        updateProductPlan,
        updateMarketInsights,
        updateBudget,
        updateDirectives,
        patchActiveProject,
    } = useOffice();

    const [report, setReport] = useState<JarvisReport | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [inputText, setInputText] = useState('');
    const [isMuted, setIsMuted] = useState(false);
    const [appliedFields, setAppliedFields] = useState<Set<string>>(new Set());
    const [conversationHistory, setConversationHistory] = useState<{ role: 'user' | 'jarvis'; text: string }[]>([]);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const chatEndRef = useRef<HTMLDivElement>(null);

    const handleTranscript = useCallback((text: string) => {
        setInputText(text);
        setTimeout(() => inputRef.current?.focus(), 50);
    }, []);

    const { voiceState, startListening, stopListening, speak, stopSpeaking } = useJarvisVoice(handleTranscript);

    // Build venture context string
    const buildContext = useCallback(() => {
        if (!activeProject) return '';
        const parts: string[] = [`Venture: ${activeProject.name}`];
        if (activeProject.strategy) parts.push(`Strategy:\n${activeProject.strategy.slice(0, 3000)}`);
        if (activeProject.productPlan) parts.push(`Product Plan:\n${activeProject.productPlan.slice(0, 2000)}`);
        if (activeProject.budget) parts.push(`Budget / Finance:\n${activeProject.budget.slice(0, 1500)}`);
        if (activeProject.marketInsights) parts.push(`Market Insights:\n${activeProject.marketInsights.slice(0, 1500)}`);
        if (activeProject.teamDirectives) parts.push(`Team Directives:\n${activeProject.teamDirectives.slice(0, 800)}`);
        if (activeProject.userNotes) parts.push(`Founder Notes:\n${activeProject.userNotes.slice(0, 800)}`);
        if (activeProject.agentStaffSnapshot?.summary) parts.push(`Last Staff Sync:\n${activeProject.agentStaffSnapshot.summary}`);
        return parts.join('\n\n');
    }, [activeProject]);

    const runAnalysis = useCallback(async (mode: 'analyze' | 'converse', userMessage?: string) => {
        if (!activeProject?.id) return;
        setLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/jarvis', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    mode,
                    context: buildContext(),
                    userMessage,
                    previousHeadline: report?.headline,
                }),
            });
            const data = await res.json() as { ok: boolean; report?: JarvisReport; error?: string };
            if (!data.ok || !data.report) {
                setError(data.error ?? 'Analysis failed');
                return;
            }
            setReport(data.report);
            setAppliedFields(new Set());

            if (!isMuted && data.report.voiceResponse) {
                speak(data.report.voiceResponse);
            }

            if (mode === 'converse' && userMessage) {
                setConversationHistory((prev) => [
                    ...prev,
                    { role: 'user', text: userMessage },
                    { role: 'jarvis', text: data.report!.voiceResponse },
                ]);
                setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
            }
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Request failed');
        } finally {
            setLoading(false);
        }
    }, [activeProject, buildContext, report?.headline, isMuted, speak]);

    // Auto-analyze on first load
    useEffect(() => {
        if (activeProject?.id && !report && !loading) {
            void runAnalysis('analyze');
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeProject?.id]);

    const handleSend = async () => {
        const text = inputText.trim();
        if (!text || loading) return;
        setInputText('');
        await runAnalysis('converse', text);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            void handleSend();
        }
    };

    const applyUpdate = (field: keyof JarvisReport['proposedUpdates'], content: string) => {
        const stamp = `\n\n--- JARVIS update ${new Date().toLocaleString()} ---\n${content}`;
        switch (field) {
            case 'strategy':      updateStrategy((activeProject?.strategy ?? '') + stamp); break;
            case 'productPlan':   updateProductPlan((activeProject?.productPlan ?? '') + stamp); break;
            case 'marketInsights':updateMarketInsights((activeProject?.marketInsights ?? '') + stamp); break;
            case 'budget':        updateBudget((activeProject?.budget ?? '') + stamp); break;
            case 'teamDirectives':updateDirectives((activeProject?.teamDirectives ?? '') + stamp); break;
        }
        setAppliedFields((prev) => new Set([...prev, field]));
    };

    const applyAllUpdates = () => {
        if (!report) return;
        const upd = report.proposedUpdates;
        if (upd.strategy)      applyUpdate('strategy', upd.strategy);
        if (upd.productPlan)   applyUpdate('productPlan', upd.productPlan);
        if (upd.marketInsights)applyUpdate('marketInsights', upd.marketInsights);
        if (upd.budget)        applyUpdate('budget', upd.budget);
        if (upd.teamDirectives)applyUpdate('teamDirectives', upd.teamDirectives);
    };

    const pendingUpdates = report
        ? Object.entries(report.proposedUpdates).filter(([, v]) => v !== null) as [string, string][]
        : [];

    const readFullReport = () => {
        if (!report) return;
        const text = [
            report.headline,
            report.summary,
            ...report.sections.map((s) => `${s.title}: ${s.insight} Action: ${s.action}`),
            report.risks.length > 0
                ? 'Key risks: ' + report.risks.map((r) => r.label).join(', ')
                : '',
        ].filter(Boolean).join('. ');
        speak(text);
    };

    // ── Empty state
    if (!activeProject?.id) {
        return (
            <div className="flex h-full items-center justify-center bg-[#0e0e10]">
                <div className="text-center space-y-3">
                    <Bot className="mx-auto h-10 w-10 text-zinc-600" />
                    <p className="text-[13px] text-zinc-500">Select a venture to activate JARVIS.</p>
                </div>
            </div>
        );
    }

    const orbState: VoiceState | 'loading' | 'ready' =
        loading ? 'loading' :
        voiceState !== 'idle' ? voiceState :
        'ready';

    return (
        <div className="flex h-full min-h-0 flex-col bg-[#0a0a0c]">
            {/* ── Top bar ── */}
            <header className="flex shrink-0 items-center justify-between gap-3 border-b border-white/[0.06] bg-[#0e0e10] px-4 py-3 sm:px-5">
                <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500/20 to-violet-500/20 ring-1 ring-white/[0.08]">
                        <Sparkles className="h-4 w-4 text-white/70" />
                    </div>
                    <div>
                        <p className="text-[13px] font-semibold tracking-tight text-zinc-100">JARVIS</p>
                        <p className="text-[10px] text-zinc-600">Intelligence Core · {activeProject.name}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {report && (
                        <>
                            <button
                                type="button"
                                onClick={() => isMuted ? setIsMuted(false) : (stopSpeaking(), setIsMuted(true))}
                                className="rounded-lg border border-white/[0.08] bg-white/[0.04] p-2 text-zinc-400 transition hover:text-zinc-200"
                                title={isMuted ? 'Unmute' : 'Mute voice'}
                            >
                                {isMuted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
                            </button>
                            <button
                                type="button"
                                onClick={readFullReport}
                                disabled={voiceState === 'speaking' || loading}
                                className="hidden sm:flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-[11px] font-medium text-zinc-300 transition hover:bg-white/[0.07] disabled:opacity-40"
                            >
                                <Play className="h-3 w-3" /> Read report
                            </button>
                        </>
                    )}
                    <button
                        type="button"
                        onClick={() => runAnalysis('analyze')}
                        disabled={loading}
                        className="flex items-center gap-1.5 rounded-lg border border-sky-500/25 bg-sky-500/10 px-3 py-1.5 text-[11px] font-semibold text-sky-200 transition hover:bg-sky-500/18 disabled:opacity-40"
                    >
                        <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
                        {loading ? 'Analyzing…' : 'Re-analyze'}
                    </button>
                </div>
            </header>

            {/* ── Main scrollable content ── */}
            <div className="custom-scrollbar flex-1 overflow-y-auto">
                <div className="mx-auto max-w-3xl space-y-5 px-4 pt-6 pb-4 sm:px-5">

                    {/* ── Orb + headline ── */}
                    <div className="flex flex-col items-center gap-4 rounded-2xl border border-white/[0.06] bg-zinc-900/40 px-5 py-7">
                        <JarvisOrb state={orbState} confidence={report?.confidence} />
                        {loading ? (
                            <div className="space-y-1 text-center">
                                <p className="text-[13px] font-medium text-zinc-300">Analyzing your venture…</p>
                                <p className="text-[11px] text-zinc-600">GPT-4o and Claude Haiku working simultaneously</p>
                            </div>
                        ) : report ? (
                            <div className="space-y-2 text-center max-w-xl">
                                <p className="text-[15px] font-semibold leading-snug text-zinc-100">{report.headline}</p>
                                <p className="text-[12px] leading-relaxed text-zinc-400">{report.summary}</p>
                                <div className="flex flex-wrap justify-center gap-1.5 pt-1">
                                    {(['strategy','finance','product','market','gtm'] as const).map((d) => (
                                        <HealthPill key={d} label={d} status={report.health[d]} />
                                    ))}
                                </div>
                            </div>
                        ) : error ? (
                            <div className="text-center space-y-2">
                                <p className="text-[13px] text-red-400">{error}</p>
                                <button
                                    type="button"
                                    onClick={() => runAnalysis('analyze')}
                                    className="text-[11px] text-zinc-500 hover:text-zinc-300 underline"
                                >Retry</button>
                            </div>
                        ) : null}
                    </div>

                    {report && (
                        <>
                            {/* ── Section analysis ── */}
                            <section>
                                <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-600">Venture Analysis</p>
                                <div className="space-y-2">
                                    {report.sections.map((s) => (
                                        <SectionCard key={s.desk} section={s} onRead={(text) => !isMuted && speak(text)} />
                                    ))}
                                </div>
                            </section>

                            {/* ── Risk register ── */}
                            {report.risks.length > 0 && (
                                <section>
                                    <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-600">Risk Register</p>
                                    <div className="space-y-2">
                                        {report.risks.map((r, i) => (
                                            <div key={i} className="flex items-start gap-3 rounded-xl border border-white/[0.07] bg-black/25 px-3.5 py-3">
                                                <AlertTriangle className={`mt-0.5 h-4 w-4 shrink-0 ${r.level === 'high' ? 'text-red-400' : r.level === 'medium' ? 'text-amber-400' : 'text-sky-400'}`} />
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[12px] font-semibold text-zinc-200">{r.label}</span>
                                                        <span className={`rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase ${RISK_BADGE[r.level]}`}>{r.level}</span>
                                                    </div>
                                                    <p className="mt-1 text-[11px] leading-snug text-zinc-500">{r.detail}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            )}

                            {/* ── Next actions ── */}
                            {report.nextActions.length > 0 && (
                                <section>
                                    <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-600">Priority Actions</p>
                                    <div className="space-y-2">
                                        {report.nextActions.map((a) => (
                                            <div key={a.priority} className="flex items-center gap-3 rounded-xl border border-white/[0.07] bg-black/25 px-3.5 py-2.5">
                                                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-white/[0.1] bg-white/[0.05] text-[10px] font-bold text-zinc-400">
                                                    {a.priority}
                                                </span>
                                                <p className="flex-1 min-w-0 text-[12px] text-zinc-300">{a.action}</p>
                                                <div className="flex shrink-0 items-center gap-1.5">
                                                    <span className="text-[9px] font-semibold uppercase tracking-wide text-zinc-600">{a.desk}</span>
                                                    <span className={`rounded-full border px-2 py-0.5 text-[9px] font-bold ${TF_BADGE[a.timeframe]}`}>{a.timeframe}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            )}

                            {/* ── Proposed updates ── */}
                            {pendingUpdates.length > 0 && (
                                <section>
                                    <div className="mb-3 flex items-center justify-between">
                                        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-600">
                                            Proposed Updates ({pendingUpdates.length})
                                        </p>
                                        {pendingUpdates.some(([k]) => !appliedFields.has(k)) && (
                                            <button
                                                type="button"
                                                onClick={applyAllUpdates}
                                                className="flex items-center gap-1.5 rounded-lg border border-violet-500/30 bg-violet-500/12 px-3 py-1.5 text-[11px] font-semibold text-violet-100 transition hover:bg-violet-500/20"
                                            >
                                                <Zap className="h-3 w-3" /> Apply all
                                            </button>
                                        )}
                                    </div>
                                    <div className="space-y-2">
                                        {pendingUpdates.map(([field, content]) => (
                                            <ProposedUpdateRow
                                                key={field}
                                                label={field.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase())}
                                                content={content}
                                                applied={appliedFields.has(field)}
                                                onApply={() => applyUpdate(field as keyof JarvisReport['proposedUpdates'], content)}
                                            />
                                        ))}
                                    </div>
                                </section>
                            )}

                            {/* ── Conversation history ── */}
                            {conversationHistory.length > 0 && (
                                <section>
                                    <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-600">Session</p>
                                    <div className="space-y-2">
                                        {conversationHistory.map((msg, i) => (
                                            <div key={i} className={`flex gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                                                <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-xl ${msg.role === 'jarvis' ? 'bg-sky-500/15 ring-1 ring-sky-500/20' : 'bg-white/[0.06] ring-1 ring-white/[0.08]'}`}>
                                                    {msg.role === 'jarvis' ? <Bot className="h-3.5 w-3.5 text-sky-300" /> : <Activity className="h-3.5 w-3.5 text-zinc-400" />}
                                                </div>
                                                <div className={`max-w-[75%] rounded-2xl px-3.5 py-2.5 text-[12px] leading-relaxed ${msg.role === 'jarvis' ? 'bg-zinc-800/60 text-zinc-300' : 'bg-sky-500/10 text-sky-100'}`}>
                                                    {msg.text}
                                                </div>
                                            </div>
                                        ))}
                                        <div ref={chatEndRef} />
                                    </div>
                                </section>
                            )}

                            {/* ── Follow-up prompts ── */}
                            {report.followUp.length > 0 && (
                                <div className="flex flex-wrap gap-2">
                                    {report.followUp.map((q, i) => (
                                        <button
                                            key={i}
                                            type="button"
                                            onClick={() => { setInputText(q); inputRef.current?.focus(); }}
                                            className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-[11px] text-zinc-400 transition hover:bg-white/[0.06] hover:text-zinc-200"
                                        >
                                            {q}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* ── Input bar ── */}
            <div className="shrink-0 border-t border-white/[0.06] bg-[#0e0e10] px-4 py-3 sm:px-5">
                <div className="mx-auto max-w-3xl">
                    <div className="flex items-end gap-2 rounded-2xl border border-white/[0.1] bg-zinc-900/60 px-3 py-2 focus-within:border-sky-500/30 focus-within:ring-1 focus-within:ring-sky-500/20 transition-all">
                        {/* Voice button */}
                        <button
                            type="button"
                            onMouseDown={() => voiceState === 'listening' ? stopListening() : startListening()}
                            className={`shrink-0 flex h-8 w-8 items-center justify-center rounded-xl border transition-all ${
                                voiceState === 'listening'
                                    ? 'border-sky-500/50 bg-sky-500/20 text-sky-300'
                                    : voiceState === 'speaking'
                                        ? 'border-violet-500/40 bg-violet-500/15 text-violet-300'
                                        : 'border-white/[0.08] bg-white/[0.04] text-zinc-500 hover:text-zinc-300'
                            }`}
                            title={voiceState === 'listening' ? 'Stop listening' : 'Speak to JARVIS'}
                        >
                            {voiceState === 'listening' ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
                        </button>

                        <textarea
                            ref={inputRef}
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            onKeyDown={handleKeyDown}
                            rows={1}
                            placeholder={
                                voiceState === 'listening' ? 'Listening…' :
                                voiceState === 'speaking'  ? 'JARVIS is speaking…' :
                                loading ? 'Analyzing…' :
                                'Tell JARVIS about a venture update, ask a question, or request a change…'
                            }
                            disabled={loading || voiceState === 'listening'}
                            className="flex-1 resize-none bg-transparent py-1 text-[13px] leading-relaxed text-zinc-200 placeholder:text-zinc-600 focus:outline-none disabled:opacity-50"
                            style={{ maxHeight: '120px', overflowY: 'auto' }}
                        />

                        {voiceState === 'speaking' ? (
                            <button
                                type="button"
                                onClick={stopSpeaking}
                                className="shrink-0 flex h-8 w-8 items-center justify-center rounded-xl border border-violet-500/30 bg-violet-500/15 text-violet-300 transition hover:bg-violet-500/25"
                                title="Stop speaking"
                            >
                                <Square className="h-3.5 w-3.5" />
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={handleSend}
                                disabled={!inputText.trim() || loading}
                                className="shrink-0 flex h-8 w-8 items-center justify-center rounded-xl border border-sky-500/30 bg-sky-500/15 text-sky-200 transition hover:bg-sky-500/25 disabled:opacity-30"
                                title="Send (Enter)"
                            >
                                {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                            </button>
                        )}
                    </div>
                    <p className="mt-1.5 text-center text-[10px] text-zinc-700">
                        Enter to send · Hold mic to speak · JARVIS auto-applies changes when you approve
                    </p>
                </div>
            </div>
        </div>
    );
}
