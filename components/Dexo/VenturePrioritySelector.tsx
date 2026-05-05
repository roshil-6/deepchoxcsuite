'use client';

import React, { useState } from 'react';
import { Check, Eye, TrendingUp, Zap, Map, Layers, SlidersHorizontal, type LucideIcon } from 'lucide-react';
import { VENTURE_PRIORITIES, type VenturePriorityId, readVenturePriority } from '@/lib/venturePriority';
import type { Project } from '@/lib/db';

// ── Per-priority visual config ────────────────────────────────────────────────

const PRIORITY_META: Record<string, { Icon: LucideIcon; rgb: string }> = {
  vision:          { Icon: Eye,               rgb: '148,163,184' },  // slate
  market_research: { Icon: TrendingUp,         rgb: '56,189,248'  },  // sky
  execution:       { Icon: Zap,                rgb: '245,158,11'  },  // amber
  planning:        { Icon: Map,                rgb: '52,211,153'  },  // emerald
  all:             { Icon: Layers,             rgb: '99,102,241'  },  // indigo
  custom:          { Icon: SlidersHorizontal,  rgb: '251,113,133' },  // rose
};

interface Props {
  activeProject: Project;
  onSave: (priorityId: VenturePriorityId, customText?: string) => void;
  /** When true, skip the collapsed toggle bar and always show the picker grid. */
  forceOpen?: boolean;
}

export function VenturePrioritySelector({ activeProject, onSave, forceOpen: _ }: Props) {
  const { priorityId: savedId, customText: savedCustom } = readVenturePriority(activeProject);

  const [selected, setSelected] = useState<VenturePriorityId | undefined>(
    savedId as VenturePriorityId | undefined,
  );
  const [customText, setCustomText] = useState(savedCustom ?? '');

  const handleSave = (id: VenturePriorityId) => {
    onSave(id, id === 'custom' ? customText : undefined);
  };

  const handleCardClick = (id: VenturePriorityId) => {
    setSelected(id);
    if (id !== 'custom') handleSave(id);
  };

  return (
    <div className="py-1">
      <p className="mb-3 text-[10px] uppercase tracking-[0.18em] text-white/20">
        Chat, overview, and research adapt to your chosen focus.
      </p>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {VENTURE_PRIORITIES.map((p) => {
          const meta = PRIORITY_META[p.id] ?? PRIORITY_META.all;
          const { Icon, rgb } = meta;
          const isActive = selected === p.id || (!selected && savedId === p.id);

          return (
            <button
              key={p.id}
              type="button"
              onClick={() => handleCardClick(p.id)}
              className="group relative flex items-start gap-3.5 rounded-2xl px-4 py-3.5 text-left transition-all duration-200"
              style={{
                background: isActive
                  ? `radial-gradient(ellipse at top left, rgba(${rgb},0.16), rgba(${rgb},0.04) 70%)`
                  : 'rgba(255,255,255,0.03)',
                border: isActive
                  ? `1px solid rgba(${rgb},0.4)`
                  : '1px solid rgba(255,255,255,0.07)',
                boxShadow: isActive ? `0 0 28px rgba(${rgb},0.12), inset 0 0 20px rgba(${rgb},0.03)` : 'none',
              }}
            >
              {/* Selected check */}
              {isActive && (
                <span
                  className="absolute right-3 top-3 flex h-[18px] w-[18px] items-center justify-center rounded-full"
                  style={{ background: `rgba(${rgb},0.2)` }}
                >
                  <Check className="h-2.5 w-2.5" style={{ color: `rgba(${rgb},1)` }} strokeWidth={3} />
                </span>
              )}

              {/* Icon badge */}
              <span
                className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-all duration-200"
                style={{
                  background: isActive ? `rgba(${rgb},0.22)` : 'rgba(255,255,255,0.05)',
                  color: isActive ? `rgba(${rgb},1)` : 'rgba(255,255,255,0.25)',
                  boxShadow: isActive ? `0 0 10px rgba(${rgb},0.2)` : 'none',
                }}
              >
                <Icon className="h-3.5 w-3.5" strokeWidth={1.75} />
              </span>

              {/* Text */}
              <div className="min-w-0 flex-1 pr-5">
                <p
                  className="text-[13px] font-semibold leading-tight transition-colors duration-200"
                  style={{ color: isActive ? 'rgba(255,255,255,0.92)' : 'rgba(255,255,255,0.5)' }}
                >
                  {p.label}
                </p>
                <p
                  className="mt-0.5 text-[11px] leading-snug transition-colors duration-200"
                  style={{ color: isActive ? 'rgba(255,255,255,0.42)' : 'rgba(255,255,255,0.22)' }}
                >
                  {p.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Custom text area */}
      {selected === 'custom' && (
        <div className="mt-4 space-y-2">
          <textarea
            value={customText}
            onChange={(e) => setCustomText(e.target.value)}
            placeholder="e.g. Focus on getting our first 10 paying customers. Ask about sales funnel, outreach, and pricing strategy."
            rows={3}
            className="w-full resize-none rounded-xl px-4 py-3 text-[13px] leading-relaxed text-white/75 placeholder:text-white/18 focus:outline-none"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
          />
          <button
            type="button"
            disabled={!customText.trim()}
            onClick={() => handleSave('custom')}
            className="w-full rounded-xl py-2.5 text-[12.5px] font-medium text-white/55 transition-all hover:text-white/85 disabled:opacity-30"
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            Set custom focus
          </button>
        </div>
      )}
    </div>
  );
}
