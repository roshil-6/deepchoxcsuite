'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, ChevronUp, RefreshCw, ShieldCheck } from 'lucide-react';
import type { Project } from '@/lib/db';
import { useOffice } from '@/lib/OfficeContext';
import type { DexoPatchContract } from '@/lib/dexoPatchSchema';
import { patchFieldLabels } from '@/lib/dexoPatchSchema';

type PendingProposal = {
  id: string;
  ventureId: number;
  source: string;
  model: string | null;
  summary: string | null;
  patchJson: unknown;
  createdAt: string;
};

function parsePatch(raw: unknown): DexoPatchContract | null {
  if (!raw || typeof raw !== 'object') return null;
  return raw as DexoPatchContract;
}

/**
 * Floating approvals dock: review Dexo-suggested venture patches (Approve / Reject only).
 * Render once from OfficeShell — no mode selector; chat + manual edits stay the two paths.
 */
export function DexoPendingChangesFloating({ activeProject }: { activeProject: Project }) {
  const { updateProjectField } = useOffice();
  const [rows, setRows] = useState<PendingProposal[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [mounted, setMounted] = useState(false);

  const load = useCallback(async () => {
    if (!activeProject.id) return;
    setLoading(true);
    try {
      const res = await fetch('/api/dexo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'proposalList',
          payload: { ventureId: activeProject.id, status: 'pending', take: 40 },
        }),
      });
      let data: { ok?: boolean; proposals?: PendingProposal[] } = {};
      try {
        data = (await res.json()) as typeof data;
      } catch {
        data = {};
      }
      setRows(data.ok && Array.isArray(data.proposals) ? data.proposals : []);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [activeProject.id]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setMounted(true);
  }, []);

  const sorted = useMemo(
    () => [...rows].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)),
    [rows]
  );

  const onReject = async (row: PendingProposal) => {
    setBusyId(row.id);
    try {
      await fetch('/api/dexo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'proposalReject',
          payload: { proposalId: row.id, ventureId: row.ventureId, actor: 'founder' },
        }),
      });
      await load();
    } finally {
      setBusyId(null);
    }
  };

  const onApply = async (row: PendingProposal) => {
    setBusyId(row.id);
    try {
      const patch = parsePatch(row.patchJson);
      if (!patch) throw new Error('Invalid patch');
      for (const [k, v] of Object.entries(patch)) {
        if (v === undefined) continue;
        try {
          await updateProjectField(k, v);
        } catch {
          /* continue other fields */
        }
      }
      await fetch('/api/dexo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'proposalApply',
          payload: { proposalId: row.id, ventureId: row.ventureId, appliedPatch: patch, actor: 'founder' },
        }),
      });
      await load();
    } catch {
      /* retry allowed */
    } finally {
      setBusyId(null);
    }
  };

  if (!activeProject.id || !mounted || typeof document === 'undefined' || !document.body) return null;

  const count = sorted.length;

  return createPortal(
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[92] flex flex-col items-stretch px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 md:inset-x-auto md:bottom-6 md:right-5 md:items-end md:px-0 md:pb-6"
      aria-live="polite"
    >
      <div className="pointer-events-auto flex w-full max-w-[420px] flex-col gap-2 self-center md:self-end">
        {!expanded ? (
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="group flex items-center justify-center gap-2 rounded-2xl border border-white/[0.12] bg-gradient-to-br from-[rgba(116,86,255,0.22)] via-[rgba(15,15,18,0.72)] to-[rgba(10,10,12,0.85)] px-4 py-3 text-left shadow-[0_12px_40px_rgba(0,0,0,0.45),0_0_0_1px_rgba(255,255,255,0.06)_inset] backdrop-blur-xl transition hover:border-violet-400/25 hover:shadow-[0_16px_48px_rgba(116,86,255,0.18)]"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-500/20 text-violet-200 ring-1 ring-violet-400/30">
              <ShieldCheck className="h-4 w-4" aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-violet-200/90">
                Dexo suggested edits
              </p>
              <p className="truncate text-[13px] text-[var(--text-primary)]">
                {count === 0
                  ? 'Nothing waiting — ask the orb or edit desks directly'
                  : `${count} change${count === 1 ? '' : 's'} need your OK`}
              </p>
            </div>
            <ChevronUp className="h-4 w-4 shrink-0 text-[var(--text-tertiary)] opacity-70 group-hover:opacity-100" />
          </button>
        ) : (
          <div className="max-h-[min(70vh,520px)] overflow-hidden rounded-2xl border border-white/[0.12] bg-gradient-to-b from-[rgba(22,20,28,0.92)] to-[rgba(8,8,10,0.94)] shadow-[0_20px_60px_rgba(0,0,0,0.55),0_0_0_1px_rgba(255,255,255,0.05)_inset] backdrop-blur-2xl">
            <div className="flex items-start gap-3 border-b border-white/[0.08] px-4 py-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-500/15 text-violet-200 ring-1 ring-violet-400/25">
                <ShieldCheck className="h-5 w-5" aria-hidden />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">Review Dexo changes</h3>
                <p className="mt-0.5 text-[11px] leading-snug text-[var(--text-muted)]">
                  Approve to merge into this venture, or reject. Strategy-level edits are safest from the orb or each
                  desk.
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  onClick={() => void load()}
                  disabled={loading}
                  className="rounded-lg p-2 text-[var(--text-tertiary)] transition hover:bg-white/[0.06] hover:text-[var(--text-primary)] disabled:opacity-50"
                  title="Refresh"
                >
                  <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                </button>
                <button
                  type="button"
                  onClick={() => setExpanded(false)}
                  className="rounded-lg p-2 text-[var(--text-tertiary)] hover:bg-white/[0.06] hover:text-[var(--text-primary)]"
                  aria-label="Collapse"
                >
                  <ChevronDown className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="custom-scrollbar max-h-[min(52vh,420px)] overflow-y-auto px-3 py-3">
              {sorted.length === 0 ? (
                <p className="px-1 py-6 text-center text-xs leading-relaxed text-[var(--text-muted)]">
                  No pending suggestions. Use the floating Dexo orb to request updates, or change any section manually.
                </p>
              ) : (
                <ul className="space-y-3">
                  {sorted.map((row) => {
                    const patch = parsePatch(row.patchJson);
                    const labels = patch ? patchFieldLabels(patch) : [];
                    return (
                      <li
                        key={row.id}
                        className="rounded-xl border border-white/[0.08] bg-black/25 px-3 py-3 shadow-[0_4px_24px_rgba(0,0,0,0.25)]"
                      >
                        <p className="text-[13px] font-medium text-[var(--text-primary)]">
                          {row.summary || 'Suggested venture update'}
                        </p>
                        <p className="mt-1 text-[10px] text-[var(--text-tertiary)]">
                          {new Date(row.createdAt).toLocaleString()} · {row.source}
                          {row.model ? ` · ${row.model}` : ''}
                        </p>
                        {labels.length > 0 ? (
                          <p className="mt-2 text-[11px] text-[var(--text-secondary)]">
                            <span className="text-[var(--text-muted)]">Touches: </span>
                            {labels.join(' · ')}
                          </p>
                        ) : null}
                        <div className="mt-3 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => void onReject(row)}
                            disabled={busyId === row.id}
                            className="rounded-lg border border-white/15 px-3 py-1.5 text-[11px] font-medium text-[var(--text-secondary)] transition hover:bg-white/[0.06] disabled:opacity-50"
                          >
                            Dismiss
                          </button>
                          <button
                            type="button"
                            onClick={() => void onApply(row)}
                            disabled={busyId === row.id}
                            className="rounded-lg bg-gradient-to-r from-violet-600 to-violet-500 px-3 py-1.5 text-[11px] font-semibold text-white shadow-lg shadow-violet-900/30 disabled:opacity-50"
                          >
                            {busyId === row.id ? 'Applying…' : 'Approve & apply'}
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

