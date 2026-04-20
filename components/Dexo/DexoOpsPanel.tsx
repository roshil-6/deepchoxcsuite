'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { Project } from '@/lib/db';
import { parseStrategy } from '@/lib/strategyDoc';
import { useSubscription } from '@/hooks/useSubscription';

type DailyRow = {
  reportDay: string;
  headline: string | null;
  sourcesJson: unknown;
};

function sourceCount(raw: unknown): number {
  return Array.isArray(raw) ? raw.length : 0;
}

export function DexoOpsPanel({ activeProject }: { activeProject: Project }) {
  const { can } = useSubscription();
  const dailyBriefEnabled = can('dexoDailyBriefReports');
  const [daily, setDaily] = useState<DailyRow[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!activeProject.id || !dailyBriefEnabled) return;
    setLoading(true);
    try {
      const dRes = await fetch('/api/dexo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'dailyReportsList',
          payload: { ventureId: activeProject.id, limit: 30 },
        }),
      });
      const d = (await dRes.json()) as { ok?: boolean; reports?: DailyRow[] };
      setDaily(d.ok && Array.isArray(d.reports) ? d.reports : []);
    } finally {
      setLoading(false);
    }
  }, [activeProject.id, dailyBriefEnabled]);

  useEffect(() => {
    void load();
  }, [load]);

  const strategy = useMemo(() => parseStrategy(activeProject.strategy || ''), [activeProject.strategy]);
  const lifecycle = strategy.phases || [];
  const graphNodes = useMemo(() => {
    const nodes: string[] = [];
    if (activeProject.name) nodes.push(activeProject.name);
    const market = (activeProject.marketInsights || '').split('\n').map((s) => s.trim()).filter(Boolean).slice(0, 8);
    nodes.push(...market.map((m) => m.slice(0, 80)));
    return nodes.slice(0, 9);
  }, [activeProject.name, activeProject.marketInsights]);

  return (
    <section className="space-y-6 rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">Cofounder ops layer</h3>
        <button
          type="button"
          onClick={() => void load()}
          className="rounded-md border border-white/10 px-2 py-1 text-xs text-[var(--text-secondary)] hover:bg-white/[0.06]"
        >
          {loading ? 'Loading…' : 'Refresh'}
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-white/[0.08] bg-black/20 p-3">
          <p className="text-xs font-semibold text-[var(--text-primary)]">Relationship graph snapshot</p>
          <p className="mt-1 text-[11px] text-[var(--text-tertiary)]">Derived from venture market context.</p>
          <ul className="mt-2 list-inside list-disc space-y-1 text-xs text-[var(--text-secondary)]">
            {graphNodes.length === 0 ? <li>No nodes yet</li> : graphNodes.map((n, i) => <li key={`${i}-${n}`}>{n}</li>)}
          </ul>
        </div>
        <div className="rounded-lg border border-white/[0.08] bg-black/20 p-3">
          <p className="text-xs font-semibold text-[var(--text-primary)]">Launch lifecycle</p>
          <p className="mt-1 text-[11px] text-[var(--text-tertiary)]">Phase progression from strategy doc.</p>
          <ul className="mt-2 space-y-1 text-xs text-[var(--text-secondary)]">
            {lifecycle.length === 0 ? (
              <li>No phases configured yet</li>
            ) : (
              lifecycle.slice(0, 6).map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-2">
                  <span className="truncate">{p.title}</span>
                  <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] uppercase">{p.status}</span>
                </li>
              ))
            )}
          </ul>
        </div>
        <div className="rounded-lg border border-white/[0.08] bg-black/20 p-3">
          <p className="text-xs font-semibold text-[var(--text-primary)]">Daily research rhythm</p>
          <p className="mt-1 text-[11px] text-[var(--text-tertiary)]">Source-backed daily brief cadence.</p>
          <ul className="mt-2 space-y-1 text-xs text-[var(--text-secondary)]">
            {!dailyBriefEnabled ? (
              <li className="text-[var(--text-tertiary)]">Co-Founder Pro — unlock Dexo daily research reports.</li>
            ) : daily.length === 0 ? (
              <li>No daily brief rows yet</li>
            ) : (
              daily.slice(0, 5).map((r) => (
                <li key={r.reportDay} className="flex items-center justify-between gap-2">
                  <span>{r.reportDay}</span>
                  <span>{sourceCount(r.sourcesJson)} sources</span>
                </li>
              ))
            )}
          </ul>
        </div>
      </div>

      <p className="rounded-lg border border-white/[0.08] bg-black/15 p-3 text-[11px] leading-relaxed text-[var(--text-tertiary)]">
        External actions (email, calendar, CRM) are not part of this product surface. Venture changes flow through Dexo
        proposals, the floating Dexo approvals card, and daily brief apply — not through outbound
        integrations.
      </p>
    </section>
  );
}
