'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Check } from 'lucide-react';
import { VENTURE_PRIORITIES, type VenturePriorityId, readVenturePriority } from '@/lib/venturePriority';
import type { Project } from '@/lib/db';

interface Props {
  activeProject: Project;
  onSave: (priorityId: VenturePriorityId, customText?: string) => void;
  /** When true, skip the collapsed toggle bar and always show the picker grid. */
  forceOpen?: boolean;
}

export function VenturePrioritySelector({ activeProject, onSave, forceOpen }: Props) {
  const { priorityId: savedId, customText: savedCustom } = readVenturePriority(activeProject);

  const [open, setOpen] = useState(forceOpen ? true : !savedId);
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
    <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] overflow-hidden">
      {/* ── Collapsed bar — hidden when embedded via forceOpen ── */}
      {!forceOpen && <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 transition hover:bg-white/[0.03]"
      >
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="text-base leading-none">
            {activeDef ? activeDef.icon : '◎'}
          </span>
          <div className="min-w-0 text-left">
            <p className="font-mono text-[8px] uppercase tracking-[0.18em] text-white/30">
              Dexo Focus
            </p>
            <p className="text-[13px] font-medium text-white/75 leading-tight">
              {activeDef ? activeDef.label : 'Set a priority'}
            </p>
            {activeDef && (
              <p className="text-[11px] text-white/35 leading-snug">
                {activeDef.tagline}
              </p>
            )}
          </div>
        </div>
        {open ? (
          <ChevronUp className="h-3.5 w-3.5 shrink-0 text-white/25" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-white/25" />
        )}
      </button>}

      {/* ── Expanded picker ── */}
      {open && (
        <div className={`${!forceOpen ? 'border-t border-white/[0.06]' : ''} px-4 pb-4 pt-3`}>
          <p className="mb-3 font-mono text-[8px] uppercase tracking-[0.16em] text-white/25">
            Chat, overview, and research adapt to your chosen focus.
          </p>

          <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
            {VENTURE_PRIORITIES.map((p) => {
              const isSelected = selected === p.id || (!selected && savedId === p.id);
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleCardClick(p.id)}
                  className={`group relative flex items-start gap-3 rounded border px-3.5 py-3 text-left transition-colors ${
                    isSelected
                      ? 'border-white/[0.2] bg-white/[0.07]'
                      : 'border-white/[0.06] bg-transparent hover:border-white/[0.12] hover:bg-white/[0.04]'
                  }`}
                >
                  {/* Check indicator */}
                  {isSelected && (
                    <span className="absolute right-2.5 top-2.5 flex h-3.5 w-3.5 items-center justify-center rounded-sm border border-white/[0.2] bg-white/[0.1]">
                      <Check className="h-2 w-2 text-white/80" strokeWidth={2.5} />
                    </span>
                  )}

                  <span className="mt-0.5 text-base leading-none shrink-0">{p.icon}</span>
                  <div className="min-w-0 pr-6">
                    <p className={`text-[13px] font-semibold leading-tight ${isSelected ? 'text-white/90' : 'text-white/65'}`}>
                      {p.label}
                    </p>
                    <p className="mt-0.5 text-[11px] leading-snug text-white/35">
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
                className="w-full resize-none rounded border border-white/[0.1] bg-white/[0.03] px-3.5 py-2.5 text-[13px] text-white/75 placeholder:text-white/25 focus:border-white/[0.2] focus:outline-none"
              />
              <button
                type="button"
                disabled={!customText.trim()}
                onClick={() => handleSave('custom')}
                className="w-full rounded border border-white/[0.14] bg-white/[0.07] py-2.5 font-mono text-[9px] uppercase tracking-[0.14em] text-white/65 transition hover:border-white/[0.22] hover:bg-white/[0.12] hover:text-white/90 disabled:opacity-40"
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
