'use client';

import React, { useState } from 'react';
import { Check, Eye, TrendingUp, Zap, Map, Layers, SlidersHorizontal, type LucideIcon } from 'lucide-react';
import { VENTURE_PRIORITIES, type VenturePriorityId, readVenturePriority } from '@/lib/venturePriority';
import type { Project } from '@/lib/db';

const PRIORITY_ICON: Record<string, LucideIcon> = {
    vision:          Eye,
    market_research: TrendingUp,
    execution:       Zap,
    planning:        Map,
    all:             Layers,
    custom:          SlidersHorizontal,
};

interface Props {
    activeProject: Project;
    onSave: (priorityId: VenturePriorityId, customText?: string) => void;
    forceOpen?: boolean;
}

export function VenturePrioritySelector({ activeProject, onSave }: Props) {
    const { priorityId: savedId, customText: savedCustom } = readVenturePriority(activeProject);

    const [selected, setSelected] = useState<VenturePriorityId | undefined>(
        savedId as VenturePriorityId | undefined,
    );
    const [customText, setCustomText] = useState(savedCustom ?? '');

    const handleCardClick = (id: VenturePriorityId) => {
        setSelected(id);
        if (id !== 'custom') onSave(id);
    };

    return (
        <div className="py-1">
            <p className="mb-3 text-[10px] uppercase tracking-[0.18em]" style={{ color: 'rgba(255,255,255,0.18)' }}>
                Chat and research adapt to your chosen focus
            </p>

            <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                {VENTURE_PRIORITIES.map((p) => {
                    const Icon = PRIORITY_ICON[p.id] ?? Layers;
                    const isActive = selected === p.id || (!selected && savedId === p.id);

                    return (
                        <button
                            key={p.id}
                            type="button"
                            onClick={() => handleCardClick(p.id)}
                            className="group relative flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-left transition-all duration-150"
                            style={{
                                background: isActive ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.025)',
                                border: isActive
                                    ? '1px solid rgba(255,255,255,0.14)'
                                    : '1px solid rgba(255,255,255,0.06)',
                            }}
                            onMouseEnter={(e) => {
                                if (!isActive) {
                                    (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.045)';
                                    (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.09)';
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (!isActive) {
                                    (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.025)';
                                    (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.06)';
                                }
                            }}
                        >
                            {/* Icon */}
                            <span
                                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg"
                                style={{
                                    background: isActive ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.04)',
                                    color: isActive ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.28)',
                                }}
                            >
                                <Icon className="h-3 w-3" strokeWidth={1.75} />
                            </span>

                            {/* Text */}
                            <div className="min-w-0 flex-1">
                                <p
                                    className="text-[12.5px] font-medium leading-tight"
                                    style={{ color: isActive ? 'rgba(255,255,255,0.88)' : 'rgba(255,255,255,0.42)' }}
                                >
                                    {p.label}
                                </p>
                                <p
                                    className="mt-0.5 text-[10.5px] leading-snug"
                                    style={{ color: isActive ? 'rgba(255,255,255,0.32)' : 'rgba(255,255,255,0.18)' }}
                                >
                                    {p.description}
                                </p>
                            </div>

                            {/* Active indicator */}
                            {isActive && (
                                <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full" style={{ background: 'rgba(255,255,255,0.12)' }}>
                                    <Check className="h-2.5 w-2.5" style={{ color: 'rgba(255,255,255,0.80)' }} strokeWidth={2.5} />
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Custom text area */}
            {selected === 'custom' && (
                <div className="mt-3 space-y-2">
                    <textarea
                        value={customText}
                        onChange={(e) => setCustomText(e.target.value)}
                        placeholder="e.g. Focus on getting first 10 paying customers — ask about sales funnel, outreach, and pricing."
                        rows={3}
                        className="w-full resize-none rounded-xl px-4 py-3 text-[12.5px] leading-relaxed focus:outline-none"
                        style={{
                            background: 'rgba(255,255,255,0.03)',
                            border: '1px solid rgba(255,255,255,0.09)',
                            color: 'rgba(255,255,255,0.65)',
                        }}
                    />
                    <button
                        type="button"
                        disabled={!customText.trim()}
                        onClick={() => onSave('custom', customText)}
                        className="w-full rounded-xl py-2.5 text-[12px] font-medium transition-all disabled:opacity-25"
                        style={{
                            background: 'rgba(255,255,255,0.06)',
                            border: '1px solid rgba(255,255,255,0.10)',
                            color: 'rgba(255,255,255,0.60)',
                        }}
                    >
                        Set custom focus
                    </button>
                </div>
            )}
        </div>
    );
}
