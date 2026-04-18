'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    BrainCircuit,
    Bot,
    Cpu,
    GitBranch,
    Radar,
    FileSearch,
    MessageSquareText,
    GripVertical,
    Volume2,
    Square,
    Gauge,
    SlidersHorizontal,
} from 'lucide-react';
import { INTELLIGENCE_WORKFLOWS, type IntelligenceWorkflow } from '@/lib/intelligence/workflowMap';
import { useReadAloud } from '@/lib/useReadAloud';

const STORAGE_KEY = 'deepchox-neural-map-v1';

const WORKFLOW_ICON: Record<IntelligenceWorkflow['id'], React.ReactNode> = {
    staff_sync: <GitBranch className="h-4 w-4" aria-hidden />,
    boardroom: <BrainCircuit className="h-4 w-4" aria-hidden />,
    personal_assistant: <MessageSquareText className="h-4 w-4" aria-hidden />,
    desk_chat: <Bot className="h-4 w-4" aria-hidden />,
    research_report: <FileSearch className="h-4 w-4" aria-hidden />,
    pinpoint_probe: <Radar className="h-4 w-4" aria-hidden />,
};

function protocolTone(protocol: IntelligenceWorkflow['protocol']): string {
    switch (protocol) {
        case 'parallel_merge':
            return 'border-violet-400/28 bg-violet-500/[0.08] text-violet-200/90';
        case 'lead_challenger':
            return 'border-violet-500/35 bg-violet-500/[0.12] text-violet-100/95';
        case 'relay_critique':
            return 'border-fuchsia-500/25 bg-fuchsia-500/[0.08] text-fuchsia-200/88';
        default:
            return 'border-[var(--border)] bg-[var(--bg-elevated)] text-[var(--text-secondary)]';
    }
}

function protocolLabel(protocol: IntelligenceWorkflow['protocol']): string {
    switch (protocol) {
        case 'parallel_merge':
            return 'Parallel merge';
        case 'lead_challenger':
            return 'Lead + challenger';
        case 'relay_critique':
            return 'Relay critique';
        default:
            return 'Single context';
    }
}

function clamp(n: number, min: number, max: number) {
    return Math.max(min, Math.min(max, n));
}

type Pt = { xp: number; yp: number };

type Stored = {
    pos: Record<string, Pt>;
    pace: number;
    blend: number;
};

function defaultPositions(): Record<string, Pt> {
    const pos: Record<string, Pt> = {
        gpt: { xp: 22, yp: 14 },
        claude: { xp: 78, yp: 14 },
        core: { xp: 50, yp: 38 },
    };
    INTELLIGENCE_WORKFLOWS.forEach((w, i) => {
        const col = i % 3;
        const row = Math.floor(i / 3);
        pos[w.id] = { xp: 14 + col * 36, yp: 62 + row * 16 };
    });
    return pos;
}

const WELCOME_SPEECH =
    'Deepchox neural operating map. Drag nodes to arrange your view. Use performance sliders to set how you like answers paced and balanced between execution and analysis. I will help you build your venture by keeping GPT and Claude lanes visible and workflows mapped to your desks.';

function linePath(a: Pt, b: Pt): string {
    const mx = (a.xp + b.xp) / 2;
    return `M ${a.xp} ${a.yp} C ${mx} ${a.yp}, ${mx} ${b.yp}, ${b.xp} ${b.yp}`;
}

export function WorkflowNeuralMap({ embedded = false }: { embedded?: boolean }) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [pos, setPos] = useState<Record<string, Pt>>(defaultPositions);
    const [pace, setPace] = useState(55);
    const [blend, setBlend] = useState(50);
    const dragRef = useRef<{ id: string; startX: number; startY: number; startPos: Pt; rect: DOMRect } | null>(null);
    const { speak, stop, speakingKey } = useReadAloud();

    useEffect(() => {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return;
            const p = JSON.parse(raw) as Stored;
            if (p.pos && typeof p.pos === 'object') setPos({ ...defaultPositions(), ...p.pos });
            if (typeof p.pace === 'number') setPace(clamp(p.pace, 0, 100));
            if (typeof p.blend === 'number') setBlend(clamp(p.blend, 0, 100));
        } catch {
            /* noop */
        }
    }, []);

    useEffect(() => {
        try {
            const payload: Stored = { pos, pace, blend };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
        } catch {
            /* noop */
        }
    }, [pos, pace, blend]);

    const setNode = useCallback((id: string, pt: Pt) => {
        setPos((prev) => ({ ...prev, [id]: { xp: clamp(pt.xp, 4, 96), yp: clamp(pt.yp, 4, 96) } }));
    }, []);

    const onPointerDown = useCallback(
        (id: string, e: React.PointerEvent) => {
            e.preventDefault();
            const el = containerRef.current;
            if (!el) return;
            const rect = el.getBoundingClientRect();
            const startPos = pos[id];
            if (!startPos) return;
            dragRef.current = { id, startX: e.clientX, startY: e.clientY, startPos: { ...startPos }, rect };
            (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        },
        [pos],
    );

    const onPointerMove = useCallback((e: React.PointerEvent) => {
        const d = dragRef.current;
        if (!d) return;
        const dx = ((e.clientX - d.startX) / d.rect.width) * 100;
        const dy = ((e.clientY - d.startY) / d.rect.height) * 100;
        setNode(d.id, { xp: d.startPos.xp + dx, yp: d.startPos.yp + dy });
    }, [setNode]);

    const onPointerUp = useCallback((e: React.PointerEvent) => {
        dragRef.current = null;
        try {
            (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
        } catch {
            /* noop */
        }
    }, []);

    const paths = useMemo(() => {
        const p = pos;
        const g = p.gpt;
        const c = p.claude;
        const k = p.core;
        if (!g || !c || !k) return [];
        const out: string[] = [linePath(g, k), linePath(c, k)];
        INTELLIGENCE_WORKFLOWS.forEach((w) => {
            const n = p[w.id];
            if (n) out.push(linePath(k, n));
        });
        return out;
    }, [pos]);

    const blendHint =
        blend < 35 ? 'Favors GPT-style structure & speed' : blend > 65 ? 'Favors Claude-style depth & critique' : 'Balanced dual-model blend';

    const wash = embedded ? (
        <div
            className="pointer-events-none absolute inset-0 opacity-[0.22]"
            aria-hidden
            style={{
                backgroundImage: 'radial-gradient(circle at 20% 0%, rgba(139,92,246,0.1) 0%, transparent 42%)',
            }}
        />
    ) : (
        <div
            className="pointer-events-none absolute inset-0 opacity-[0.35]"
            aria-hidden
            style={{
                backgroundImage:
                    'radial-gradient(circle at 15% 25%, rgba(139,92,246,0.14) 0%, transparent 32%), radial-gradient(circle at 85% 70%, rgba(167,139,250,0.1) 0%, transparent 30%)',
            }}
        />
    );

    const inner = (
            <div className="relative space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-violet-500/25 bg-violet-500/[0.08] text-violet-100">
                            <BrainCircuit className="h-5 w-5" aria-hidden />
                        </div>
                        <div className="min-w-0">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-violet-300/70">AI network</p>
                            <h2 className="mt-1 text-sm font-semibold tracking-tight text-[var(--text-primary)] sm:text-[15px]">
                                Neural operating map
                            </h2>
                            <p className="mt-1.5 max-w-xl text-[11px] leading-relaxed text-[var(--text-secondary)]">
                                I will help you build your venture — drag nodes to match how you think, and set performance preferences
                                for how answers should feel. Layout saves on this device.
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={() =>
                            speakingKey === 'neural-welcome' ? stop() : speak(WELCOME_SPEECH, 'neural-welcome')
                        }
                        className="flex shrink-0 items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-2 text-[10px] font-medium text-[var(--text-secondary)] transition hover:border-violet-500/25 hover:bg-violet-500/[0.06]"
                    >
                        {speakingKey === 'neural-welcome' ? (
                            <Square className="h-3.5 w-3.5" aria-hidden />
                        ) : (
                            <Volume2 className="h-3.5 w-3.5" aria-hidden />
                        )}
                        Read aloud
                    </button>
                </div>

                <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)]/80 p-3 sm:p-4">
                    <div className="mb-3 flex flex-wrap items-center gap-2 text-[10px] text-[var(--text-secondary)]">
                        <SlidersHorizontal className="h-3.5 w-3.5 text-[var(--text-secondary)]" aria-hidden />
                        <span className="font-medium uppercase tracking-wider text-[var(--text-primary)]">Performance preferences</span>
                        <span className="hidden sm:inline">— saved locally</span>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <label className="block space-y-1.5">
                            <span className="flex items-center gap-1.5 text-[10px] font-medium text-[var(--text-secondary)]">
                                <Gauge className="h-3 w-3" aria-hidden />
                                Pace · fast ↔ thorough
                            </span>
                            <input
                                type="range"
                                min={0}
                                max={100}
                                value={pace}
                                onChange={(e) => setPace(Number(e.target.value))}
                                className="h-1.5 w-full cursor-pointer accent-violet-400"
                            />
                            <span className="text-[10px] text-[var(--text-secondary)]">
                                {pace < 40 ? 'Quicker summaries' : pace > 70 ? 'Deeper, slower reasoning' : 'Balanced pacing'}
                            </span>
                        </label>
                        <label className="block space-y-1.5">
                            <span className="flex items-center gap-1.5 text-[10px] font-medium text-[var(--text-secondary)]">
                                <Cpu className="h-3 w-3" aria-hidden />
                                Model blend · GPT ↔ Claude
                            </span>
                            <input
                                type="range"
                                min={0}
                                max={100}
                                value={blend}
                                onChange={(e) => setBlend(Number(e.target.value))}
                                className="h-1.5 w-full cursor-pointer accent-violet-400"
                            />
                            <span className="text-[10px] text-[var(--text-secondary)]">{blendHint}</span>
                        </label>
                    </div>
                </div>

                <div
                    ref={containerRef}
                    className="relative isolate min-h-[min(72vh,520px)] w-full overflow-hidden rounded-xl border border-violet-500/15 bg-[var(--bg-primary)]"
                >
                    <svg
                        className="pointer-events-none absolute inset-0 h-full w-full"
                        viewBox="0 0 100 100"
                        preserveAspectRatio="none"
                        aria-hidden
                    >
                        {paths.map((d, i) => (
                            <path
                                key={i}
                                d={d}
                                fill="none"
                                stroke="rgba(167,139,250,0.22)"
                                strokeWidth={0.35}
                                vectorEffect="non-scaling-stroke"
                            />
                        ))}
                    </svg>

                    {(['gpt', 'claude', 'core'] as const).map((id) => {
                        const p = pos[id];
                        if (!p) return null;
                        const label =
                            id === 'gpt' ? 'GPT' : id === 'claude' ? 'Claude' : 'Intelligence core';
                        const sub =
                            id === 'gpt'
                                ? 'Execution lane'
                                : id === 'claude'
                                  ? 'Strategy lane'
                                  : 'Merge & route';
                        const tone =
                            id === 'gpt'
                                ? 'border-violet-400/30 bg-violet-500/[0.1]'
                                : id === 'claude'
                                  ? 'border-fuchsia-500/28 bg-fuchsia-500/[0.08]'
                                  : 'border-violet-500/40 bg-violet-500/[0.14]';
                        return (
                            <div
                                key={id}
                                role="button"
                                tabIndex={0}
                                onPointerDown={(e) => onPointerDown(id, e)}
                                onPointerMove={onPointerMove}
                                onPointerUp={onPointerUp}
                                onPointerCancel={onPointerUp}
                                style={{ left: `${p.xp}%`, top: `${p.yp}%`, transform: 'translate(-50%, -50%)' }}
                                className={`absolute z-10 w-[min(92%,11rem)] touch-none cursor-grab select-none rounded-xl border px-3 py-2.5 text-center shadow-lg active:cursor-grabbing sm:w-44 ${tone}`}
                            >
                                <div className="flex items-center justify-center gap-1 text-[9px] font-semibold uppercase tracking-wider text-zinc-400">
                                    <GripVertical className="h-3 w-3 opacity-50" aria-hidden />
                                    {label}
                                </div>
                                <p className="mt-1 text-[11px] font-medium text-zinc-100">{sub}</p>
                            </div>
                        );
                    })}

                    {INTELLIGENCE_WORKFLOWS.map((workflow) => {
                        const p = pos[workflow.id];
                        if (!p) return null;
                        return (
                            <div
                                key={workflow.id}
                                role="button"
                                tabIndex={0}
                                onPointerDown={(e) => onPointerDown(workflow.id, e)}
                                onPointerMove={onPointerMove}
                                onPointerUp={onPointerUp}
                                onPointerCancel={onPointerUp}
                                style={{ left: `${p.xp}%`, top: `${p.yp}%`, transform: 'translate(-50%, -50%)' }}
                                className="absolute z-10 w-[min(94%,13rem)] touch-none cursor-grab select-none rounded-xl border border-violet-500/18 bg-[var(--bg-card)]/95 px-2.5 py-2 shadow-[0_8px_32px_-8px_rgba(0,0,0,0.5)] active:cursor-grabbing sm:w-52"
                            >
                                <div className="flex items-start justify-between gap-1">
                                    <div className="flex min-w-0 items-center gap-1.5">
                                        <GripVertical className="h-3.5 w-3.5 shrink-0 text-[var(--text-secondary)]" aria-hidden />
                                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-violet-500/15 bg-[var(--bg-elevated)] text-violet-200/90">
                                            {WORKFLOW_ICON[workflow.id]}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="truncate text-[10px] font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
                                                {workflow.title}
                                            </p>
                                            <p className="truncate text-[9px] text-[var(--text-secondary)]">{workflow.trigger}</p>
                                        </div>
                                    </div>
                                    <span
                                        className={`shrink-0 rounded-full border px-1.5 py-px text-[8px] font-semibold ${protocolTone(workflow.protocol)}`}
                                    >
                                        {protocolLabel(workflow.protocol)}
                                    </span>
                                </div>
                                <div className="mt-2 grid grid-cols-2 gap-1.5">
                                    <div className="rounded-md border border-violet-400/22 bg-violet-500/[0.07] px-1.5 py-1">
                                        <p className="text-[8px] font-semibold uppercase text-violet-300/85">GPT</p>
                                        <p className="mt-0.5 line-clamp-2 text-[9px] leading-snug text-[var(--text-secondary)]">{workflow.gptRole}</p>
                                    </div>
                                    <div className="rounded-md border border-fuchsia-500/22 bg-fuchsia-500/[0.07] px-1.5 py-1">
                                        <p className="text-[8px] font-semibold uppercase text-fuchsia-300/85">Claude</p>
                                        <p className="mt-0.5 line-clamp-2 text-[9px] leading-snug text-[var(--text-secondary)]">{workflow.claudeRole}</p>
                                    </div>
                                </div>
                                <div className="mt-1.5 flex flex-wrap gap-1">
                                    {workflow.rooms.slice(0, 4).map((room) => (
                                        <span
                                            key={`${workflow.id}-${room}`}
                                            className="rounded border border-[var(--border)] bg-[var(--bg-elevated)] px-1 py-px text-[8px] text-[var(--text-secondary)]"
                                        >
                                            {room.split('_').join(' ')}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>

                <p className="text-center text-[10px] text-[var(--text-secondary)]">
                    Drag any card to remap your view. Connections update live. Preferences are hints for future routing — they do not
                    change model APIs yet.
                </p>
            </div>
    );

    if (embedded) {
        return (
            <div className="relative overflow-hidden rounded-xl">
                {wash}
                {inner}
            </div>
        );
    }

    return (
        <section className="relative overflow-hidden rounded-2xl border border-violet-500/20 bg-[var(--bg-card)] p-4 sm:p-5 shadow-[0_0_40px_-14px_rgba(139,92,246,0.22)]">
            {wash}
            {inner}
        </section>
    );
}
