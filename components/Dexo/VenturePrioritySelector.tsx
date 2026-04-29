'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Check } from 'lucide-react';
import { VENTURE_PRIORITIES, type VenturePriorityId, readVenturePriority } from '@/lib/venturePriority';
import type { Project } from '@/lib/db';

interface Props {
  activeProject: Project;
  onSave: (priorityId: VenturePriorityId, customText?: string) => void;
}

export function VenturePrioritySelector({ activeProject, onSave }: Props) {
  const { priorityId: savedId, customText: savedCustom } = readVenturePriority(activeProject);

  const [open, setOpen] = useState(!savedId);
  const [selected, setSelected] = useState<VenturePriorityId | undefined>(
    savedId as VenturePriorityId | undefined,
  );
  const [customText, setCustomText] = useState(savedCustom ?? '');

  const activeDef = VENTURE_PRIORITIES.find((p) => p.id === (savedId ?? ''));

  const handleSave = (id: VenturePriorityId) => {
    const text = id === 'custom' ? customText : undefined;
    onSave(id, text);
    setOpen(false);
  };

  const handleCardClick = (id: VenturePriorityId) => {
    setSelected(id);
    if (id !== 'custom') {
      handleSave(id);
    }
  };

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-[var(--bg-elevated)] overflow-hidden">
      {/* ── Collapsed bar ── */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 transition hover:bg-white/[0.03]"
      >
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="text-base leading-none">
            {activeDef ? activeDef.icon : '🎯'}
          </span>
          <div className="min-w-0 text-left">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-violet-400/70">
              Dexo Focus
            </p>
            <p className="text-[13px] font-medium text-[var(--text-primary)] leading-tight">
              {activeDef ? activeDef.label : 'Set a priority'}
            </p>
            {activeDef && (
              <p className="text-[11px] text-[var(--text-muted)] leading-snug">
                {activeDef.tagline}
              </p>
            )}
          </div>
        </div>
        {open ? (
          <ChevronUp className="h-4 w-4 shrink-0 text-[var(--text-muted)]" />
        ) : (
          <ChevronDown className="h-4 w-4 shrink-0 text-[var(--text-muted)]" />
        )}
      </button>

      {/* ── Expanded picker ── */}
      {open && (
        <div className="border-t border-white/[0.06] px-4 pb-4 pt-3">
          <p className="mb-3 text-[11px] text-[var(--text-muted)]">
            Dexo, all chat responses, the overview, and daily research will adapt to your chosen focus.
          </p>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {VENTURE_PRIORITIES.map((p) => {
              const isSelected = selected === p.id || (!selected && savedId === p.id);
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleCardClick(p.id)}
                  className={`group relative flex items-start gap-3 rounded-xl border px-3.5 py-3 text-left transition-all duration-150 ${
                    isSelected
                      ? 'border-[rgba(116,86,255,0.4)] bg-[rgba(116,86,255,0.12)] shadow-[0_0_0_1px_rgba(116,86,255,0.15)]'
                      : 'border-white/[0.07] bg-white/[0.02] hover:border-white/[0.14] hover:bg-white/[0.05]'
                  }`}
                >
                  {/* Check mark */}
                  {isSelected && (
                    <span className="absolute right-2.5 top-2.5 flex h-4 w-4 items-center justify-center rounded-full bg-violet-500">
                      <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />
                    </span>
                  )}

                  <span className="mt-0.5 text-lg leading-none shrink-0">{p.icon}</span>
                  <div className="min-w-0">
                    <p className={`text-[13px] font-semibold leading-tight ${isSelected ? 'text-violet-200' : 'text-[var(--text-primary)]'}`}>
                      {p.label}
                    </p>
                    <p className="mt-0.5 text-[11px] leading-snug text-[var(--text-muted)]">
                      {p.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Custom text input */}
          {selected === 'custom' && (
            <div className="mt-3 space-y-2">
              <textarea
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                placeholder="e.g. Focus on getting our first 10 paying customers. Ask about sales funnel, outreach, and pricing strategy."
                rows={3}
                className="w-full resize-none rounded-xl border border-white/[0.1] bg-white/[0.03] px-3.5 py-2.5 text-[13px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[rgba(116,86,255,0.35)] focus:outline-none focus:ring-1 focus:ring-[rgba(116,86,255,0.15)]"
              />
              <button
                type="button"
                disabled={!customText.trim()}
                onClick={() => handleSave('custom')}
                className="w-full rounded-xl bg-violet-600 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-500 disabled:opacity-40"
              >
                Set custom focus
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
