'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { DexoAvatar } from '@/components/Dexo/DexoAvatar';
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
 * When the venture record is missing key desk inputs, Deepchox surfaces a co-founder-style prompt
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
            className="fixed inset-0 z-[10060] flex items-end justify-center p-4 sm:items-center"
            style={{ background: 'rgba(3,3,4,0.7)', backdropFilter: 'blur(4px)' }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="dexo-gap-title"
        >
            <div
                className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-[rgba(255,255,255,0.07)]"
                style={{
                    background: 'linear-gradient(160deg, #0d0b1a 0%, #09090f 100%)',
                    boxShadow: '0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.07), inset 0 1px 0 rgba(255,255,255,0.04)',
                }}
            >
                {/* Top accent line */}
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#f2f2f5]/60 to-transparent" aria-hidden />

                {/* Avatar + question â€” speech-bubble layout */}
                <div className="flex gap-4 px-5 pt-5">
                    <DexoAvatar size="md" state="idle" pulse={false} className="mt-1 shrink-0" />
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                            <div>
                                <span className="font-sans text-[10px] font-bold uppercase tracking-[0.2em] text-[#f2f2f5]">Deepchox</span>
                                <span className="ml-2 font-sans text-[9px] font-semibold uppercase tracking-widest text-zinc-600">Co-Founder</span>
                            </div>
                            <button
                                type="button"
                                onClick={onClose}
                                className="shrink-0 rounded-lg p-1.5 text-zinc-600 transition hover:bg-white/[0.06] hover:text-zinc-300"
                                aria-label="Close"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                        {/* Speech bubble */}
                        <div className="mt-2 rounded-2xl rounded-tl-sm border border-[rgba(255,255,255,0.07)] bg-[rgba(255,255,255,0.07)] px-4 py-3">
                            <h2 id="dexo-gap-title" className="font-sans text-[15px] font-semibold leading-snug text-white">
                                {currentGap.title}
                            </h2>
                            <p className="mt-1.5 font-sans text-[13px] leading-relaxed text-zinc-400">
                                {currentGap.prompt}
                            </p>
                            {gaps.length > 1 && (
                                <p className="mt-2 font-sans text-[11px] text-zinc-600">
                                    {gaps.length - 1} more question{gaps.length === 2 ? '' : 's'} after this one.
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Answer input */}
                <div className="space-y-3 px-5 pb-5 pt-4">
                    <label className="block">
                        <div className="mb-1.5 flex items-center justify-between gap-2">
                            <span className="font-sans text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Your answer</span>
                            <div className="flex items-center gap-2">
                                <span className="font-sans text-[10px] text-zinc-600">Type or speak</span>
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
                            rows={4}
                            placeholder="Share what you know â€” Deepchox will save it to your venture record."
                            className="w-full resize-y rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] px-4 py-3 font-sans text-[13px] leading-relaxed text-zinc-100 placeholder:text-zinc-600 focus:border-[rgba(255,255,255,0.07)] focus:outline-none focus:ring-1 focus:ring-[rgba(255,255,255,0.07)]"
                        />
                    </label>
                    <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
                        <button
                            type="button"
                            onClick={onRemindLater}
                            className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] px-4 py-2 font-sans text-[12px] font-medium text-zinc-400 transition hover:bg-[rgba(255,255,255,0.06)] hover:text-zinc-200"
                        >
                            Later
                        </button>
                        <button
                            type="button"
                            disabled={saving || !reply.trim()}
                            onClick={() => void onSubmit()}
                            className="rounded-xl bg-[#f2f2f5] px-5 py-2 font-sans text-[12px] font-semibold text-white shadow-[0_0_20px_rgba(255,255,255,0.07)] transition hover:bg-[#8a6fff] hover:shadow-[0_0_28px_rgba(255,255,255,0.07)] disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
                        >
                            {saving ? 'Savingâ€¦' : 'Save answer'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );

    return createPortal(portal, document.body);
}

