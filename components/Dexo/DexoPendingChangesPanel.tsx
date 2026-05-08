'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, ChevronUp, GripHorizontal, RefreshCw, ShieldCheck } from 'lucide-react';
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
 * Floating approvals dock: review Deepchox-suggested venture patches (Approve / Reject only).
 * Render once from OfficeShell â€” no mode selector; chat + manual edits stay the two paths.
 */
export function DexoPendingChangesFloating({ activeProject }: { activeProject: Project }) {
  const { updateProjectField } = useOffice();
  const [rows, setRows] = useState<PendingProposal[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [mounted, setMounted] = useState(false);

  // â”€â”€ Drag state â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const panelRef = useRef<HTMLDivElement>(null);
  const dragState = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null); // null = use CSS default (bottom-right)
  const [dragging, setDragging] = useState(false);

  const onDragStart = useCallback((e: React.PointerEvent) => {
    if (!panelRef.current) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const rect = panelRef.current.getBoundingClientRect();
    dragState.current = {
      startX: e.clientX,
      startY: e.clientY,
      origX: rect.left,
      origY: rect.top,
    };
    setDragging(true);
  }, []);

  const onDragMove = useCallback((e: React.PointerEvent) => {
    if (!dragState.current) return;
    const dx = e.clientX - dragState.current.startX;
    const dy = e.clientY - dragState.current.startY;
    const newX = Math.max(0, Math.min(window.innerWidth - (panelRef.current?.offsetWidth ?? 340), dragState.current.origX + dx));
    const newY = Math.max(0, Math.min(window.innerHeight - (panelRef.current?.offsetHeight ?? 80), dragState.current.origY + dy));
    setPos({ x: newX, y: newY });
  }, []);

  const onDragEnd = useCallback(() => {
    dragState.current = null;
    setDragging(false);
  }, []);

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

  // Compute inline position when dragged, otherwise fall back to CSS anchoring.
  const posStyle: React.CSSProperties = pos
    ? { position: 'fixed', left: pos.x, top: pos.y, bottom: 'auto', right: 'auto' }
    : {};

  return createPortal(
    <div
      ref={panelRef}
      style={posStyle}
      className={`pointer-events-none z-[92] ${pos ? '' : 'fixed inset-x-0 bottom-0 flex flex-col items-stretch px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 md:inset-x-auto md:bottom-6 md:right-5 md:items-end md:px-0 md:pb-6'} ${dragging ? 'select-none' : ''}`}
      aria-live="polite"
    >
      <div className="pointer-events-auto flex w-full max-w-[min(100%,340px)] flex-col gap-1.5 self-center md:self-end">
        {!expanded ? (
          /* â”€â”€ Collapsed pill (compact, light) â”€â”€ */
          <div className="group flex items-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.04] px-2.5 py-2 shadow-[0_4px_24px_rgba(0,0,0,0.2)] transition hover:border-white/[0.1] hover:bg-white/[0.06]">
            <div
              className="shrink-0 cursor-grab touch-none text-[var(--text-tertiary)] opacity-60 hover:opacity-100 active:cursor-grabbing"
              onPointerDown={onDragStart}
              onPointerMove={onDragMove}
              onPointerUp={onDragEnd}
              onPointerCancel={onDragEnd}
              title="Drag to reposition"
            >
              <GripHorizontal className="h-3.5 w-3.5" />
            </div>
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg" style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.55)', border: '1px solid rgba(255,255,255,0.10)' }}>
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
            </div>
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="min-w-0 flex-1 text-left"
            >
              <p className="text-[9px] font-semibold uppercase tracking-[0.1em] text-[var(--text-muted)]">
                Suggestions
              </p>
              <p className="truncate text-[11px] leading-tight text-[var(--text-secondary)]">
                {count === 0
                  ? 'None waiting'
                  : `${count} to review`}
              </p>
            </button>
            <ChevronUp className="h-3.5 w-3.5 shrink-0 text-[var(--text-tertiary)] opacity-60 group-hover:opacity-90" />
          </div>
        ) : (
          /* â”€â”€ Expanded panel â”€â”€ */
          <div className="max-h-[min(65vh,440px)] overflow-hidden rounded-xl border border-white/[0.08] bg-[#111113] shadow-[0_12px_40px_rgba(0,0,0,0.35)]">
            <div className="flex items-start gap-2 border-b border-white/[0.06] px-3 py-2.5">
              {/* Drag handle for expanded state */}
              <div
                className="mt-1.5 shrink-0 cursor-grab touch-none text-[var(--text-tertiary)] opacity-60 hover:opacity-100 active:cursor-grabbing"
                onPointerDown={onDragStart}
                onPointerMove={onDragMove}
                onPointerUp={onDragEnd}
                onPointerCancel={onDragEnd}
                title="Drag to reposition"
              >
                <GripHorizontal className="h-3.5 w-3.5" />
              </div>
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg" style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.55)', border: '1px solid rgba(255,255,255,0.10)' }}>
                <ShieldCheck className="h-4 w-4" aria-hidden />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-xs font-semibold text-[var(--text-primary)]">Review suggestions</h3>
                <p className="mt-0.5 text-[10px] leading-snug text-[var(--text-muted)]">
                  Approve or dismiss. Details stay here â€” not repeated in chat.
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

            <div className="custom-scrollbar max-h-[min(48vh,360px)] overflow-y-auto px-2.5 py-2">
              {sorted.length === 0 ? (
                <p className="px-1 py-4 text-center text-[10px] leading-relaxed text-[var(--text-muted)]">
                  No pending suggestions. Use Deepchox or edit desks directly.
                </p>
              ) : (
                <ul className="space-y-2">
                  {sorted.map((row) => {
                    const patch = parsePatch(row.patchJson);
                    const labels = patch ? patchFieldLabels(patch) : [];
                    return (
                      <li
                        key={row.id}
                        className="rounded-lg border border-white/[0.06] bg-white/[0.03] px-2.5 py-2"
                      >
                        <p className="text-[11px] font-medium leading-snug text-[var(--text-primary)]">
                          {row.summary || 'Suggested venture update'}
                        </p>
                        <p className="mt-0.5 text-[9px] text-[var(--text-tertiary)]">
                          {new Date(row.createdAt).toLocaleString()} Â· {row.source}
                          {row.model ? ` Â· ${row.model}` : ''}
                        </p>
                        {labels.length > 0 ? (
                          <p className="mt-1.5 text-[10px] text-[var(--text-secondary)]">
                            <span className="text-[var(--text-muted)]">Touches: </span>
                            {labels.join(' Â· ')}
                          </p>
                        ) : null}
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          <button
                            type="button"
                            onClick={() => void onReject(row)}
                            disabled={busyId === row.id}
                            className="rounded-md border border-white/10 px-2 py-1 text-[10px] font-medium text-[var(--text-secondary)] transition hover:bg-white/[0.05] disabled:opacity-50"
                          >
                            Dismiss
                          </button>
                          <button
                            type="button"
                            onClick={() => void onApply(row)}
                            disabled={busyId === row.id}
                            className="rounded-md px-2 py-1 text-[10px] font-semibold disabled:opacity-50 transition" style={{ background: 'rgba(255,255,255,0.10)', color: '#f2f2f5', border: '1px solid rgba(255,255,255,0.14)' }}
                          >
                            {busyId === row.id ? 'Applyingâ€¦' : 'Approve'}
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



