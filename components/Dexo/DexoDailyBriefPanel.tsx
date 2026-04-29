'use client';

import React, { useCallback, useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { RefreshCw, Globe, Sparkles, CheckCircle2, ExternalLink } from 'lucide-react';
import { useOffice } from '@/lib/OfficeContext';
import { buildDexoJarvisVentureContext } from '@/lib/dexoJarvisContext';
import { isVentureFoundationSparse } from '@/lib/ventureFoundation';
import { dexoFullVenturePatchFromJarvis, dexoAutoSaveHintLines } from '@/lib/dexoApplyJarvisProductPatch';
import { getEffectiveSessionId } from '@/lib/deviceSession';
import type { JarvisProposedUpdates } from '@/app/api/jarvis/route';
import type { Project } from '@/lib/db';

export type VentureDailyReportRow = {
  id: string;
  ventureId: number;
  reportDay: string;
  headline: string | null;
  summary: string;
  bodyMd: string;
  sourcesJson: unknown;
  followUpJson: unknown;
  pendingProposedUpdates: unknown;
  userApprovedAt: string | null;
  researchQuery: string | null;
  createdAt: string;
  updatedAt: string;
};

function todayUtcDay(): string {
  return new Date().toISOString().slice(0, 10);
}

function parseSources(raw: unknown): { title: string; url: string; snippet?: string }[] {
  if (!Array.isArray(raw)) return [];
  const out: { title: string; url: string; snippet?: string }[] = [];
  for (const x of raw) {
    if (!x || typeof x !== 'object') continue;
    const o = x as Record<string, unknown>;
    const title = typeof o.title === 'string' ? o.title : '';
    const url = typeof o.url === 'string' ? o.url : '';
    if (!title || !url) continue;
    const snippet = typeof o.snippet === 'string' ? o.snippet : undefined;
    out.push({ title, url, snippet });
  }
  return out;
}

function parseFollowUp(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.map(String).filter(Boolean).slice(0, 5);
}

function hasPendingUpdates(p: unknown): p is JarvisProposedUpdates {
  if (!p || typeof p !== 'object') return false;
  const o = p as JarvisProposedUpdates;
  if (o.strategy?.trim()) return true;
  if (o.productPlan?.trim()) return true;
  if (o.marketInsights?.trim()) return true;
  if (o.budget?.trim()) return true;
  if (o.teamDirectives?.trim()) return true;
  if (Array.isArray(o.kanbanAdds) && o.kanbanAdds.some((k) => k && String(k.title || '').trim())) return true;
  return false;
}

export function DexoDailyBriefPanel({
  activeProject,
  autoRunPulse,
}: {
  activeProject: Project;
  /** When true, fetch today's brief once if missing (e.g. user opened this tab). */
  autoRunPulse?: boolean;
}) {
  const { updateProjectField } = useOffice();
  const [reports, setReports] = useState<VentureDailyReportRow[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [pulsing, setPulsing] = useState(false);
  const [applyId, setApplyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [proRequired, setProRequired] = useState(false);
  const [pulseAttempted, setPulseAttempted] = useState(false);

  const ventureId = activeProject.id;
  const day = todayUtcDay();

  const load = useCallback(async () => {
    setLoadingList(true);
    setError(null);
    try {
      const res = await fetch('/api/dexo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-deepchox-session': getEffectiveSessionId() },
        body: JSON.stringify({
          action: 'dailyReportsList',
          payload: { ventureId, limit: 40 },
        }),
      });
      const data = (await res.json()) as { ok?: boolean; reports?: VentureDailyReportRow[] };
      if (!data.ok || !Array.isArray(data.reports)) {
        setError('Could not load daily briefs. Check DATABASE_URL and migrations.');
        setReports([]);
        return;
      }
      setReports(data.reports);
    } catch {
      setError('Network error loading briefs.');
      setReports([]);
    } finally {
      setLoadingList(false);
    }
  }, [ventureId]);

  useEffect(() => {
    void load();
  }, [load]);

  const runPulse = useCallback(
    async (force: boolean) => {
      setPulsing(true);
      setError(null);
      setProRequired(false);
      try {
        const context = buildDexoJarvisVentureContext(activeProject);
        const res = await fetch('/api/dexo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-deepchox-session': getEffectiveSessionId() },
          body: JSON.stringify({
            action: 'dailyPulse',
            payload: {
              ventureId,
              reportDay: day,
              context,
              sparseContext: isVentureFoundationSparse(activeProject),
              force,
            },
          }),
        });
        const data = (await res.json()) as { ok?: boolean; error?: string; upgrade?: boolean; message?: string };
        if (!data.ok) {
          if (data.error === 'pro_required' || data.upgrade) {
            setProRequired(true);
          } else {
            setError(data.message ?? data.error ?? 'Daily pulse failed.');
          }
          return;
        }
        await load();
      } catch {
        setError('Daily pulse request failed.');
      } finally {
        setPulsing(false);
      }
    },
    [activeProject, ventureId, day, load]
  );

  useEffect(() => {
    if (!autoRunPulse || pulseAttempted || loadingList) return;
    const hasToday = reports.some((r) => r.reportDay === day);
    if (!hasToday) {
      setPulseAttempted(true);
      void runPulse(false);
    } else {
      setPulseAttempted(true);
    }
  }, [autoRunPulse, pulseAttempted, loadingList, reports, day, runPulse]);

  const todayRow = reports.find((r) => r.reportDay === day) ?? reports[0];

  const onApply = async (row: VentureDailyReportRow) => {
    if (!hasPendingUpdates(row.pendingProposedUpdates)) return;
    setApplyId(row.id);
    try {
      const patch = dexoFullVenturePatchFromJarvis(activeProject, row.pendingProposedUpdates as JarvisProposedUpdates);
      (Object.entries(patch) as [keyof typeof patch, unknown][]).forEach(([key, val]) => {
        if (val !== undefined) void updateProjectField(key, val);
      });
      await fetch('/api/dexo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-deepchox-session': getEffectiveSessionId() },
        body: JSON.stringify({
          action: 'dailyReportApply',
          payload: { reportId: row.id, ventureId },
        }),
      });
      await load();
    } finally {
      setApplyId(null);
    }
  };

  const pendingHint = todayRow && hasPendingUpdates(todayRow.pendingProposedUpdates)
    ? dexoAutoSaveHintLines(
        dexoFullVenturePatchFromJarvis(activeProject, todayRow.pendingProposedUpdates as JarvisProposedUpdates)
      ).join(' · ')
    : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-medium tracking-tight text-[var(--text-primary)]">Dexo daily brief</h2>
          <p className="mt-1 max-w-2xl text-sm text-[var(--text-secondary)]">
            Dexo runs a live web pass when <code className="rounded bg-white/10 px-1 text-xs">TAVILY_API_KEY</code> is set,
            then drafts today&apos;s brief and suggested venture updates. Applying updates requires your confirmation below.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void runPulse(true)}
            disabled={pulsing}
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-violet-500/15 px-4 py-2 text-sm font-medium text-violet-200 transition hover:bg-violet-500/25 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${pulsing ? 'animate-spin' : ''}`} aria-hidden />
            {pulsing ? 'Researching…' : 'Refresh today'}
          </button>
          <button
            type="button"
            onClick={() => void load()}
            disabled={loadingList}
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-[var(--text-secondary)] transition hover:bg-white/10"
          >
            Reload list
          </button>
        </div>
      </div>

      {proRequired ? (
        <div className="rounded-xl border border-violet-500/25 bg-violet-500/10 px-4 py-3">
          <p className="text-sm font-medium text-violet-200">Co-Founder Pro required</p>
          <p className="mt-1 text-xs text-violet-300/80">
            Daily briefs with live web research are a Pro feature. Upgrade your plan or set{' '}
            <code className="rounded bg-white/10 px-1 py-0.5 font-mono text-[11px]">DAILY_BRIEF_ALLOW_FREE=1</code>{' '}
            in your environment to enable it for all users.
          </p>
        </div>
      ) : error ? (
        <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-100/90">{error}</div>
      ) : null}

      {loadingList && reports.length === 0 ? (
        <p className="text-sm text-[var(--text-muted)]">Loading briefs…</p>
      ) : null}

      {todayRow ? (
        <article
          className="rounded-2xl border border-white/[0.08] bg-[var(--bg-elevated)] p-6 shadow-lg"
          style={{ boxShadow: '0 20px 50px rgba(0,0,0,0.35)' }}
        >
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/[0.06] pb-4">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
                {todayRow.reportDay} · Dexo research pulse
              </p>
              <h3 className="mt-1 text-base font-semibold text-[var(--text-primary)]">
                {todayRow.headline ?? 'Daily brief'}
              </h3>
              {todayRow.researchQuery ? (
                <p className="mt-1 flex items-center gap-1.5 text-xs text-[var(--text-tertiary)]">
                  <Globe className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
                  <span className="truncate">Query: {todayRow.researchQuery}</span>
                </p>
              ) : null}
            </div>
            {todayRow.userApprovedAt ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-1 text-[11px] font-medium text-emerald-200/90">
                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
                Updates applied {new Date(todayRow.userApprovedAt).toLocaleString()}
              </span>
            ) : hasPendingUpdates(todayRow.pendingProposedUpdates) ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-1 text-[11px] font-medium text-amber-100/90">
                <Sparkles className="h-3.5 w-3.5" aria-hidden />
                Suggestions pending
              </span>
            ) : null}
          </div>

          <div className="prose prose-invert prose-sm mt-4 max-w-none text-[var(--text-secondary)] prose-headings:text-[var(--text-primary)] prose-a:text-violet-300">
            <ReactMarkdown>{todayRow.bodyMd || todayRow.summary}</ReactMarkdown>
          </div>

          {parseFollowUp(todayRow.followUpJson).length > 0 ? (
            <div className="mt-6 rounded-xl border border-violet-500/20 bg-violet-500/[0.07] px-4 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-violet-200/80">Dexo asks</p>
              <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-[var(--text-secondary)]">
                {parseFollowUp(todayRow.followUpJson).map((q) => (
                  <li key={q}>{q}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {parseSources(todayRow.sourcesJson).length > 0 ? (
            <div className="mt-6">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">Sources</p>
              <ul className="mt-2 space-y-2">
                {parseSources(todayRow.sourcesJson).map((s) => (
                  <li key={s.url} className="flex gap-2 text-sm">
                    <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--text-tertiary)]" aria-hidden />
                    <a
                      href={s.url}
                      target="_blank"
                      rel="noreferrer"
                      className="break-all text-violet-300 underline-offset-2 hover:underline"
                    >
                      {s.title}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="mt-4 text-xs text-[var(--text-muted)]">
              No web sources attached — add Tavily or run Refresh after configuring search.
            </p>
          )}

          {hasPendingUpdates(todayRow.pendingProposedUpdates) && !todayRow.userApprovedAt ? (
            <div className="mt-6 flex flex-col gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0 text-sm text-[var(--text-secondary)]">
                <p className="font-medium text-[var(--text-primary)]">Apply Dexo&apos;s suggested venture updates?</p>
                {pendingHint ? <p className="mt-1 text-xs text-[var(--text-tertiary)]">{pendingHint}</p> : null}
              </div>
              <button
                type="button"
                disabled={applyId === todayRow.id}
                onClick={() => void onApply(todayRow)}
                className="shrink-0 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-500 disabled:opacity-50"
              >
                {applyId === todayRow.id ? 'Applying…' : 'Apply to venture'}
              </button>
            </div>
          ) : null}
        </article>
      ) : !loadingList ? (
        <p className="text-sm text-[var(--text-muted)]">
          No briefs yet. Use <strong>Refresh today</strong> to run Dexo&apos;s first research pass (requires AI keys and Postgres).
        </p>
      ) : null}

      {reports.length > 1 ? (
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">Earlier days</p>
          <ul className="mt-2 space-y-2">
            {reports
              .filter((r) => r.id !== todayRow?.id)
              .slice(0, 12)
              .map((r) => (
                <li
                  key={r.id}
                  className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-sm text-[var(--text-secondary)]"
                >
                  <span className="font-medium text-[var(--text-primary)]">{r.reportDay}</span>
                  {' — '}
                  <span className="line-clamp-2">{r.headline ?? r.summary.slice(0, 120)}</span>
                </li>
              ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
