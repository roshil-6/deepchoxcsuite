'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, Mic, Square, Sparkles, Volume2 } from 'lucide-react';
import type { StaffAttentionItem } from '@/lib/db';
import type { DailyOfficeCycleResult } from '@/types/office';
import type { FocusBriefingPayload } from '@/types/focusBriefing';
import { buildFocusBriefingContext } from '@/lib/buildFocusBriefingContext';
import { initVoiceCache, speak, stopSpeaking } from '@/lib/voiceEngine';
import { useTokens } from '@/lib/tokens/useTokens';
import { TOKEN_COSTS } from '@/lib/tokens/tokenSystem';

function buildLocalVoiceNarration(params: {
    ventureName: string;
    livingOffice: DailyOfficeCycleResult | null;
    staffFocusLines: string[];
    staffAttentionPending: StaffAttentionItem[];
    strategicExcerpt: string | null;
    aiSummaryExcerpt: string | null;
}): string {
    const name = params.ventureName || 'your venture';
    const parts: string[] = [`Here's what matters today for ${name}.`];

    const lo = params.livingOffice;
    if (lo && lo.brief.greeting !== 'No venture selected.') {
        parts.push(lo.brief.greeting);
        if (lo.brief.suggestedFocus?.trim()) {
            parts.push(`If you pick one steer, consider this. ${lo.brief.suggestedFocus.trim()}`);
        }
        const prios = lo.brief.priorities.slice(0, 4).filter(Boolean);
        prios.forEach((p, i) => {
            parts.push(i === 0 ? `On priorities. ${p}` : `Also. ${p}`);
        });
    }

    const focusLines = params.staffFocusLines.slice(0, 6).filter((l) => l.trim());
    focusLines.forEach((line, i) => {
        parts.push(i === 0 ? `From your team. ${line.trim()}` : `Another thread. ${line.trim()}`);
    });

    params.staffAttentionPending.slice(0, 3).forEach((a, i) => {
        parts.push(
            i === 0
                ? `Something that needs a decision. ${a.title}. ${a.message}`
                : `Still open. ${a.title}. ${a.message}`,
        );
    });

    if (params.strategicExcerpt?.trim()) {
        parts.push(`On strategy, in short. ${params.strategicExcerpt.trim().slice(0, 400)}`);
    } else if (params.aiSummaryExcerpt?.trim()) {
        parts.push(`From the latest staff research. ${params.aiSummaryExcerpt.trim().slice(0, 400)}`);
    }

    return parts.join(' ');
}

type Props = {
    ventureName: string;
    livingOffice: DailyOfficeCycleResult | null;
    staffFocusLines: string[];
    staffAttentionPending: StaffAttentionItem[];
    aiSummaryExcerpt: string | null;
    strategicExcerpt: string | null;
    /** Dashboard theme tokens */
    theme: {
        text: { primary: string; secondary: string; muted: string };
        border: { default: string; subtle: string };
        accent: { primary: string; secondary: string };
    };
};

export function FocusBriefingPanel({
    ventureName,
    livingOffice,
    staffFocusLines,
    staffAttentionPending,
    aiSummaryExcerpt,
    strategicExcerpt,
    theme,
}: Props) {
    const [briefing, setBriefing] = useState<FocusBriefingPayload | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [speaking, setSpeaking] = useState(false);
    const [autoSpeak, setAutoSpeak] = useState(true);
    const { spend: spendTokens } = useTokens();

    useEffect(() => {
        initVoiceCache();
    }, []);

    const context = useMemo(
        () =>
            buildFocusBriefingContext({
                ventureName,
                livingOffice,
                staffFocusLines,
                staffAttentionPending,
                aiSummaryExcerpt,
                strategicExcerpt,
            }),
        [
            ventureName,
            livingOffice,
            staffFocusLines,
            staffAttentionPending,
            aiSummaryExcerpt,
            strategicExcerpt,
        ]
    );

    const hasVenture = ventureName.trim().length > 0;
    const hasRichContext =
        staffFocusLines.some(Boolean) ||
        staffAttentionPending.length > 0 ||
        (livingOffice != null && livingOffice.brief.greeting !== 'No venture selected.') ||
        !!strategicExcerpt?.trim() ||
        !!aiSummaryExcerpt?.trim();

    const playVoice = useCallback(
        async (text: string) => {
            const t = text.trim();
            if (!t || typeof window === 'undefined' || !window.speechSynthesis) return;
            stopSpeaking();
            setSpeaking(true);
            try {
                await speak(t, {
                    preset: 'jarvis',
                    onEnd: () => setSpeaking(false),
                    onError: () => setSpeaking(false),
                });
            } catch {
                setSpeaking(false);
            }
        },
        []
    );

    const stopVoice = useCallback(() => {
        stopSpeaking();
        setSpeaking(false);
    }, []);

    useEffect(() => {
        return () => stopSpeaking();
    }, []);

    const generateAi = useCallback(async () => {
        setError(null);
        setLoading(true);
        setBriefing(null);
        const paid = spendTokens(TOKEN_COSTS.CHAT_MESSAGE, 'Focus briefing');
        if (!paid.success) {
            setError(
                paid.message ??
                    'Daily AI credits are used up. Upgrade to Pro for unlimited usage, or try again after the daily reset.',
            );
            setLoading(false);
            return;
        }
        try {
            const res = await fetch('/api/dexo', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'focusBriefing',
                    payload: { context },
                }),
            });
            const data = (await res.json()) as { ok?: boolean; briefing?: FocusBriefingPayload; error?: string };
            if (!res.ok || !data.ok || !data.briefing) {
                setError(data.error || 'Could not generate briefing');
                setLoading(false);
                return;
            }
            setBriefing(data.briefing);
            setLoading(false);
            if (autoSpeak && data.briefing.voiceNarration.trim()) {
                void playVoice(data.briefing.voiceNarration);
            }
        } catch {
            setError('Network error');
            setLoading(false);
        }
    }, [context, autoSpeak, playVoice, spendTokens]);

    const hearLocalOnly = useCallback(() => {
        setError(null);
        const local = buildLocalVoiceNarration({
            ventureName,
            livingOffice,
            staffFocusLines,
            staffAttentionPending,
            strategicExcerpt,
            aiSummaryExcerpt,
        });
        const fallbackBrief: FocusBriefingPayload = {
            headline: 'Focus from your saved data',
            paragraphs: staffFocusLines.slice(0, 6).length
                ? staffFocusLines.slice(0, 6)
                : [livingOffice?.brief?.suggestedFocus || 'Add strategy and run staff sync for richer focus.'],
            priorities: staffAttentionPending.slice(0, 5).map((a) => `Address: ${a.title}`),
            voiceNarration: local,
        };
        setBriefing(fallbackBrief);
        void playVoice(local);
    }, [
        ventureName,
        livingOffice,
        staffFocusLines,
        staffAttentionPending,
        strategicExcerpt,
        aiSummaryExcerpt,
        playVoice,
    ]);

    return (
        <div
            className="mt-4 rounded-xl border px-3 py-3 sm:px-4 sm:py-4"
            style={{ borderColor: theme.border.default, background: 'rgba(255,255,255,0.07)' }}
        >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em]" style={{ color: theme.text.muted }}>
                        Hear &amp; read Â· what to focus
                    </p>
                    <p className="mt-1 text-sm font-medium" style={{ color: theme.text.primary }}>
                        AI focus briefing
                    </p>
                    <p className="mt-0.5 text-xs" style={{ color: theme.text.secondary }}>
                        Generates a short analysis you can read here and listen to aloud (browser voice).
                    </p>
                </div>
                <label className="flex cursor-pointer items-center gap-2 self-start text-[11px]" style={{ color: theme.text.muted }}>
                    <input
                        type="checkbox"
                        checked={autoSpeak}
                        onChange={(e) => setAutoSpeak(e.target.checked)}
                        className="rounded border-zinc-600 bg-zinc-900"
                    />
                    Speak after generate
                </label>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
                <button
                    type="button"
                    disabled={loading || !hasVenture}
                    onClick={() => void generateAi()}
                    className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-white transition disabled:opacity-45"
                    style={{ background: `linear-gradient(135deg, ${theme.accent.secondary}, #6d28d9)` }}
                    title={!hasRichContext ? 'Thin context â€” run staff sync for a stronger briefing' : undefined}
                >
                    {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <Sparkles className="h-3.5 w-3.5" aria-hidden />}
                    {loading ? 'Analyzingâ€¦' : 'Generate briefing'}
                </button>
                <button
                    type="button"
                    disabled={!hasVenture}
                    onClick={hearLocalOnly}
                    className="inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-medium transition hover:bg-white/[0.04] disabled:opacity-45"
                    style={{ borderColor: theme.border.subtle, color: theme.text.secondary }}
                >
                    <Volume2 className="h-3.5 w-3.5 opacity-80" aria-hidden />
                    Hear from my data
                </button>
                {briefing?.voiceNarration ? (
                    speaking ? (
                        <button
                            type="button"
                            onClick={stopVoice}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-rose-500/35 bg-rose-500/15 px-3 py-2 text-xs font-semibold text-rose-100"
                        >
                            <Square className="h-3.5 w-3.5" aria-hidden />
                            Stop
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={() => void playVoice(briefing.voiceNarration)}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/35 bg-emerald-500/15 px-3 py-2 text-xs font-semibold text-emerald-100"
                        >
                            <Mic className="h-3.5 w-3.5" aria-hidden />
                            Listen again
                        </button>
                    )
                ) : null}
            </div>

            {hasVenture && !hasRichContext ? (
                <p className="mt-2 text-xs" style={{ color: theme.text.muted }}>
                    Run a staff sync or add strategy notes for a richer briefing â€” you can still try Generate with thin data.
                </p>
            ) : null}

            {error ? (
                <p className="mt-2 text-xs text-amber-200/95">
                    {error}. Try <span className="font-medium">Hear from my data</span> for a voice readout without AI.
                </p>
            ) : null}

            {briefing ? (
                <div className="mt-4 space-y-3 rounded-lg border border-white/[0.06] bg-black/25 p-3 sm:p-4">
                    <h4 className="text-sm font-semibold" style={{ color: theme.text.primary }}>
                        {briefing.headline}
                    </h4>
                    {briefing.paragraphs.map((p, i) => (
                        <p key={i} className="text-[13px] leading-relaxed" style={{ color: theme.text.secondary }}>
                            {p}
                        </p>
                    ))}
                    {briefing.priorities.length > 0 ? (
                        <div>
                            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider" style={{ color: theme.text.muted }}>
                                Do this next
                            </p>
                            <ul className="list-inside list-disc space-y-1 text-[13px]" style={{ color: theme.text.secondary }}>
                                {briefing.priorities.map((p, i) => (
                                    <li key={i}>{p}</li>
                                ))}
                            </ul>
                        </div>
                    ) : null}
                </div>
            ) : null}
        </div>
    );
}

