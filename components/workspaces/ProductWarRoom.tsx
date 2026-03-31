'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import type { WarSticky } from '@/lib/productPlanDoc';
import { Plus } from 'lucide-react';

const STICKY_COLORS = ['#3f3f46', '#52525b', '#166534', '#1e3a5f', '#713f12'];

type Props = {
    stickies: WarSticky[];
    onChange: (next: WarSticky[]) => void;
};

export function ProductWarRoom({ stickies, onChange }: Props) {
    const wrapRef = useRef<HTMLDivElement>(null);
    const [dragId, setDragId] = useState<string | null>(null);
    const offset = useRef({ x: 0, y: 0 });

    const onMouseDown = (e: React.MouseEvent, id: string) => {
        const s = stickies.find((x) => x.id === id);
        if (!s || !wrapRef.current) return;
        const rect = wrapRef.current.getBoundingClientRect();
        offset.current = { x: e.clientX - rect.left - s.x, y: e.clientY - rect.top - s.y };
        setDragId(id);
    };

    const onMouseMove = useCallback(
        (e: MouseEvent) => {
            if (!dragId || !wrapRef.current) return;
            const rect = wrapRef.current.getBoundingClientRect();
            const x = Math.max(8, Math.min(rect.width - 148, e.clientX - rect.left - offset.current.x));
            const y = Math.max(8, Math.min(rect.height - 100, e.clientY - rect.top - offset.current.y));
            onChange(stickies.map((s) => (s.id === dragId ? { ...s, x, y } : s)));
        },
        [dragId, stickies, onChange]
    );

    const onMouseUp = useCallback(() => setDragId(null), []);

    useEffect(() => {
        if (!dragId) return;
        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
        return () => {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
        };
    }, [dragId, onMouseMove, onMouseUp]);

    const addSticky = () => {
        const id = Date.now().toString();
        const n = stickies.length;
        onChange([
            ...stickies,
            {
                id,
                x: 24 + (n % 3) * 160,
                y: 24 + Math.floor(n / 3) * 120,
                text: '',
                color: STICKY_COLORS[n % STICKY_COLORS.length],
            },
        ]);
    };

    const updateText = (id: string, text: string) => {
        onChange(stickies.map((s) => (s.id === id ? { ...s, text } : s)));
    };

    const remove = (id: string) => {
        onChange(stickies.filter((s) => s.id !== id));
    };

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
                <p className="text-xs text-zinc-500">
                    Sticky notes and sketches persist on this venture—reopen anytime. Drag to reposition.
                </p>
                <button
                    type="button"
                    onClick={addSticky}
                    className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-zinc-600 bg-zinc-800 px-3 py-2 text-xs font-medium text-zinc-100 hover:bg-zinc-700"
                >
                    <Plus className="h-3.5 w-3.5" aria-hidden />
                    Add note
                </button>
            </div>
            <div
                ref={wrapRef}
                className="relative min-h-[480px] w-full overflow-hidden rounded-lg border border-zinc-700 bg-[#0f0f10]"
                style={{
                    backgroundImage:
                        'linear-gradient(#27272a 1px, transparent 1px), linear-gradient(90deg, #27272a 1px, transparent 1px)',
                    backgroundSize: '20px 20px',
                }}
            >
                {stickies.map((s) => (
                    <div
                        key={s.id}
                        className="absolute w-36 cursor-grab rounded border border-zinc-600 p-2 shadow-sm active:cursor-grabbing"
                        style={{ left: s.x, top: s.y, backgroundColor: s.color }}
                        onMouseDown={(e) => onMouseDown(e, s.id)}
                    >
                        <textarea
                            value={s.text}
                            onChange={(e) => updateText(s.id, e.target.value)}
                            onMouseDown={(e) => e.stopPropagation()}
                            placeholder="Note…"
                            rows={4}
                            className="w-full resize-none border-0 bg-transparent text-xs text-zinc-100 placeholder:text-zinc-400/80 outline-none"
                        />
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                remove(s.id);
                            }}
                            className="mt-1 w-full text-[10px] text-zinc-300/90 hover:text-white"
                        >
                            Remove
                        </button>
                    </div>
                ))}
                {stickies.length === 0 && (
                    <div className="flex h-[480px] items-center justify-center p-6 text-center text-sm text-zinc-600">
                        No stickies yet. Add notes, decisions, or sketches—they stay on this board.
                    </div>
                )}
            </div>
        </div>
    );
}
