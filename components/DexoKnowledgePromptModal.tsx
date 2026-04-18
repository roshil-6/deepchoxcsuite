'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Bot, X } from 'lucide-react';
import { useOffice } from '@/lib/OfficeContext';
import { VoiceInput } from '@/components/ui/VoiceInput';
import {
    computeKnowledgeGaps,
    signatureForGaps,
    type KnowledgeGap,
} from '@/lib/ventureKnowledgeGaps';
import type { Project } from '@/lib/db';

const STORAGE_PREFIX = 'dexo-knowledge-dismiss';

function readDismiss(projectId: number | string | undefined): { at: number; sig: string } | null {
    if (projectId == null) return null;
    try {
        const raw = localStorage.getItem(`${STORAGE_PREFIX}-${projectId}`);
        if (!raw) return null;
        const p = JSON.parse(raw) as { at?: unknown; sig?: unknown };
        if (typeof p.at === 'number' && typeof p.sig === 'string') return { at: p.at, sig: p.sig };
    } catch {
        /* noop */
    }
    return null;
}

function writeDismiss(projectId: number | string, sig: string) {
    try {
        localStorage.setItem(`${STORAGE_PREFIX}-${projectId}`, JSON.stringify({ at: Date.now(), sig }));
    } catch {
        /* noop */
    }
}

const REMIND_LATER_MS = 24 * 60 * 60 * 1000;

/**
 * When the venture record is missing key desk inputs, Dexo surfaces a co-founder-style prompt
 * with an inline reply that persists to the right field.
 */
export function DexoKnowledgePromptModal() {
    const { activeProject, activeRoom, persistActiveProject } = useOffice();
    const activeRoomRef = useRef(activeRoom);
    activeRoomRef.current = activeRoom;

    const [mounted, setMounted] = useState(false);
    const [open, setOpen] = useState(false);
    const openRef = useRef(open);
    openRef.current = open;
    const [reply, setReply] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => setMounted(true), []);

    const gaps = useMemo(() => computeKnowledgeGaps(activeProject ?? null), [activeProject]);

    const sig = useMemo(() => signatureForGaps(gaps), [gaps]);

    useEffect(() => {
        setReply('');
    }, [activeProject?.id, sig]);

    useEffect(() => {
        if (activeRoom === 'dexo') setOpen(false);
    }, [activeRoom]);

    useEffect(() => {
        if (gaps.length === 0) setOpen(false);
    }, [gaps.length]);

    useEffect(() => {
        if (!mounted || !activeProject?.id || gaps.length === 0) {
            setOpen(false);
            return;
        }

        const dismissed = readDismiss(activeProject.id);
        if (dismissed && dismissed.sig === sig && Date.now() - dismissed.at < REMIND_LATER_MS) {
            setOpen(false);
            return;
        }

        if (openRef.current) return;

        const t = window.setTimeout(() => {
            if (activeRoomRef.current === 'dexo') return;
            setOpen(true);
        }, 1400);
        return () => window.clearTimeout(t);
    }, [mounted, activeProject?.id, gaps.length, sig]);

    const currentGap: KnowledgeGap | undefined = gaps[0];

    const applyGap = useCallback(
        async (gap: KnowledgeGap, text: string, base: Project) => {
            const v = text.trim();
            if (!v || !base.id) return;
            setSaving(true);
            try {
                const merged: Project = { ...base, [gap.field]: v };
                await persistActiveProject(merged);
                setReply('');
            } finally {
                setSaving(false);
            }
        },
        [persistActiveProject]
    );

    const onSubmit = async () => {
        if (!currentGap || !reply.trim() || !activeProject) return;
        await applyGap(currentGap, reply, activeProject);
    };

    const onRemindLater = () => {
        if (activeProject?.id != null) writeDismiss(activeProject.id, sig);
        setOpen(false);
    };

    const onClose = () => {
        onRemindLater();
    };

    if (!mounted || !open || !currentGap || !activeProject) return null;

    const portal = (
        <div
            className="fixed inset-0 z-[10060] flex items-center justify-center p-4"
            style={{ background: 'rgba(5,8,14,0.52)' }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="dexo-gap-title"
        >
            <div
                className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-white/[0.16] shadow-2xl"
                style={{
                    background: 'linear-gradient(165deg, rgba(38,38,46,0.97), rgba(24,24,31,0.96))',
                    boxShadow: '0 24px 64px rgba(0,0,0,0.42), inset 0 1px 0 rgba(255,255,255,0.04)',
                }}
            >
                <div className="flex items-start justify-between gap-3 border-b border-white/[0.1] px-5 py-4">
                    <div className="flex min-w-0 items-start gap-3">
                        <div
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                            style={{ background: 'rgba(16,185,129,0.16)' }}
                        >
                            <Bot className="h-5 w-5 text-[#34D399]" aria-hidden />
                        </div>
                        <div className="min-w-0">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Dexo · Co-founder</p>
                            <h2 id="dexo-gap-title" className="mt-0.5 text-[15px] font-semibold leading-snug text-zinc-100">
                                {currentGap.title}
                            </h2>
                            <p className="mt-1 text-[12px] leading-relaxed text-zinc-400">
                                {currentGap.prompt}
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="shrink-0 rounded-lg p-1.5 text-zinc-500 transition hover:bg-white/[0.06] hover:text-zinc-200"
                        aria-label="Close"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                <div className="space-y-3 px-5 py-4">
                    <label className="block">
                        <div className="flex items-center justify-between gap-3">
                            <span className="text-[11px] font-medium text-zinc-400">Your answer</span>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] text-zinc-500">Type or speak</span>
                                <VoiceInput
                                    onTranscript={(text) => {
                                        const chunk = text.trim();
                                        if (!chunk) return;
                                        setReply((prev) => (prev ? `${prev.trim()} ${chunk}` : chunk));
                                    }}
                                />
                            </div>
                        </div>
                        <textarea
                            value={reply}
                            onChange={(e) => setReply(e.target.value)}
                            rows={5}
                            placeholder="Type here or use the mic — we’ll save it to this venture’s record."
                            className="mt-1.5 w-full resize-y rounded-2xl border border-white/[0.12] bg-white/[0.03] px-3 py-2.5 text-[13px] leading-relaxed text-zinc-100 placeholder:text-zinc-500 focus:border-emerald-400/45 focus:outline-none focus:ring-1 focus:ring-emerald-400/25"
                        />
                    </label>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-[11px] text-zinc-400">
                            {gaps.length > 1 ? (
                                <span>After this save, {gaps.length - 1} more question{gaps.length === 2 ? '' : 's'} may follow.</span>
                            ) : (
                                <span>Answering fills a missing piece for the whole suite.</span>
                            )}
                        </p>
                        <div className="flex flex-wrap gap-2">
                            <button
                                type="button"
                                onClick={onRemindLater}
                                className="rounded-xl border border-white/[0.12] bg-white/[0.02] px-3 py-2 text-[12px] font-medium text-zinc-300 transition hover:bg-white/[0.06] hover:text-zinc-100"
                            >
                                Remind me later
                            </button>
                            <button
                                type="button"
                                disabled={saving || !reply.trim()}
                                onClick={() => void onSubmit()}
                                className="rounded-xl px-4 py-2 text-[12px] font-semibold text-zinc-950 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
                                style={{ background: 'linear-gradient(135deg, rgba(116,86,255,0.95), rgba(137,111,255,0.92))', color: '#f8f8ff' }}
                            >
                                {saving ? 'Saving…' : 'Save to venture'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    return createPortal(portal, document.body);
}
