'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { RefreshCw, Globe, Sparkles, CheckCircle2, ExternalLink, ArrowRight, Zap } from 'lucide-react';
import { useOffice } from '@/lib/OfficeContext';
import { buildDexoJarvisVentureContext } from '@/lib/dexoJarvisContext';
import { isVentureFoundationSparse } from '@/lib/ventureFoundation';
import { dexoFullVenturePatchFromJarvis, dexoAutoSaveHintLines } from '@/lib/dexoApplyJarvisProductPatch';
import { getEffectiveSessionId } from '@/lib/deviceSession';
import { DexoAvatar } from '@/components/Dexo/DexoAvatar';
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

// ─── bodyMd parser ────────────────────────────────────────────────────────────
type ParsedSection = {
  title: string;
  bullets: string[];
  move: string;
  isRisk?: boolean;
};

function parseBodyMd(bodyMd: string): { intro: string; sections: ParsedSection[] } {
  const raw = bodyMd || '';
  // Split on ### headings
  const parts = raw.split(/\n(?=### )/);
  let intro = '';
  const sections: ParsedSection[] = [];

  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith('### ')) {
      const firstNewline = trimmed.indexOf('\n');
      const title = firstNewline === -1 ? trimmed.slice(4).trim() : trimmed.slice(4, firstNewline).trim();
      const body = firstNewline === -1 ? '' : trimmed.slice(firstNewline + 1).trim();
      const isRisk = title.toLowerCase() === 'risks';

      if (isRisk) {
        // Parse bullet list: `- **label** (level): detail`
        const bullets = body
          .split('\n')
          .filter((l) => l.trim().startsWith('-'))
          .map((l) => l.replace(/^-\s*/, '').trim())
          // Strip markdown bold from the label for cleaner display
          .map((l) => l.replace(/\*\*/g, ''))
          .filter(Boolean);
        sections.push({ title: 'Key risks', bullets, move: '', isRisk: true });
      } else {
        // Extract **Move:** line
        let move = '';
        const bodyLines = body.split('\n').filter((l) => {
          if (l.startsWith('**Move:**') || l.startsWith('**Move: **')) {
            move = l.replace(/^\*\*Move:\*?\*?\s*/, '').trim();
            return false;
          }
          return true;
        });

        const insightText = bodyLines.join(' ').replace(/\s+/g, ' ').trim();

        // Split insight into sentence-level bullets
        const bullets = insightText
          .split(/(?<=[.!?])\s+/)
          .map((s) => s.trim())
          .filter((s) => s.length > 8);

        sections.push({ title, bullets, move });
      }
    } else {
      // Everything before the first heading = intro
      intro = trimmed;
    }
  }

  return { intro, sections };
}

// ─── Section card ─────────────────────────────────────────────────────────────
function SectionCard({ section, index }: { section: ParsedSection; index: number }) {
  const accent = section.isRisk
    ? 'border-amber-500/20 bg-amber-500/[0.05]'
    : 'border-white/[0.07] bg-white/[0.02]';

  return (
    <div className={`rounded-xl border px-4 py-3.5 ${accent}`}>
      <p className={`text-[10px] font-bold uppercase tracking-[0.14em] ${section.isRisk ? 'text-amber-400/80' : 'text-violet-300/70'}`}>
        {section.isRisk ? '⚠ ' : `0${index + 1}  `}{section.title}
      </p>

      {section.bullets.length > 0 && (
        <ul className="mt-2.5 space-y-1.5">
          {section.bullets.map((b, i) => (
            <li key={i} className="flex items-start gap-2 text-[13px] leading-snug text-[var(--text-secondary)]">
              <span className={`mt-[5px] h-1 w-1 shrink-0 rounded-full ${section.isRisk ? 'bg-amber-400/60' : 'bg-violet-400/60'}`} />
              {b}
            </li>
          ))}
        </ul>
      )}

      {section.move ? (
        <div className="mt-3 flex items-start gap-1.5">
          <ArrowRight className="mt-[2px] h-3.5 w-3.5 shrink-0 text-violet-400/80" aria-hidden />
          <p className="text-[12px] font-medium leading-snug text-violet-200/90">{section.move}</p>
        </div>
      ) : null}
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────
export function DexoDailyBriefPanel({
  activeProject,
  autoRunPulse,
}: {
  activeProject: Project;
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
        setError('Could not load research reports. Check DATABASE_URL and migrations.');
        setReports([]);
        return;
      }
      setReports(data.reports);
    } catch {
      setError('Network error loading research reports.');
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
            setError(data.message ?? data.error ?? 'Research pulse failed.');
          }
          return;
        }
        await load();
      } catch {
        setError('Research pulse request failed.');
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
  const parsed = todayRow ? parseBodyMd(todayRow.bodyMd || todayRow.summary) : null;

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
    <div className="space-y-5">
      {/* ── Header ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-violet-400/70">Dexo</p>
          <h2 className="mt-0.5 text-base font-semibold tracking-tight text-[var(--text-primary)]">Daily Research</h2>
          <p className="mt-1 text-xs text-[var(--text-secondary)]">
            Live web pass + AI breakdown of your venture — point by point.
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
            {pulsing ? 'Researching…' : 'Run today'}
          </button>
          <button
            type="button"
            onClick={() => void load()}
            disabled={loadingList}
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-[var(--text-secondary)] transition hover:bg-white/10"
          >
            Reload
          </button>
        </div>
      </div>

      {/* ── Alerts ── */}
      {proRequired ? (
        <div className="rounded-xl border border-violet-500/25 bg-violet-500/10 px-4 py-3">
          <p className="text-sm font-medium text-violet-200">Co-Founder Pro required</p>
          <p className="mt-1 text-xs text-violet-300/80">
            Daily research with live web pass is a Pro feature.
          </p>
        </div>
      ) : error ? (
        <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-100/90">{error}</div>
      ) : null}

      {loadingList && reports.length === 0 ? (
        <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
          Loading…
        </div>
      ) : null}

      {pulsing && (
        <div className="flex items-center gap-3 rounded-xl border border-violet-500/20 bg-violet-500/[0.06] px-4 py-3">
          <RefreshCw className="h-4 w-4 animate-spin text-violet-300" />
          <div>
            <p className="text-sm font-medium text-violet-200">Dexo is researching…</p>
            <p className="text-xs text-violet-300/70">Running web search and building your breakdown.</p>
          </div>
        </div>
      )}

      {/* ── Today's report ── */}
      {todayRow && parsed ? (
        <div className="space-y-4">
          {/* Dexo speech intro */}
          <div className="flex items-start gap-3">
            <DexoAvatar size="sm" state="idle" pulse={false} className="mt-0.5 shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-violet-400">Dexo</span>
                <span className="text-[9px] text-[var(--text-muted)]">{todayRow.reportDay}</span>
                {todayRow.researchQuery ? (
                  <span className="flex items-center gap-1 text-[9px] text-[var(--text-muted)]">
                    <Globe className="h-3 w-3" aria-hidden />
                    web pass ran
                  </span>
                ) : null}
              </div>

              {/* Headline as Dexo voice */}
              {todayRow.headline ? (
                <p className="mt-1 text-sm font-semibold leading-snug text-[var(--text-primary)]">
                  {todayRow.headline}
                </p>
              ) : null}

              {/* Intro summary — Dexo speaking */}
              {parsed.intro ? (
                <p className="mt-1.5 text-[13px] leading-relaxed text-[var(--text-secondary)]">
                  {parsed.intro}
                </p>
              ) : null}

              {/* Status badges */}
              <div className="mt-2 flex flex-wrap gap-2">
                {todayRow.userApprovedAt ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium text-emerald-300/90">
                    <CheckCircle2 className="h-3 w-3" aria-hidden />
                    Updates applied
                  </span>
                ) : hasPendingUpdates(todayRow.pendingProposedUpdates) ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-medium text-amber-200/90">
                    <Sparkles className="h-3 w-3" aria-hidden />
                    Suggestions ready
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          {/* ── Breakdown sections ── */}
          {parsed.sections.length > 0 ? (
            <div className="space-y-2.5">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--text-muted)]">Breakdown</p>
              {parsed.sections.map((section, i) => (
                <SectionCard key={section.title} section={section} index={i} />
              ))}
            </div>
          ) : null}

          {/* ── Dexo asks ── */}
          {parseFollowUp(todayRow.followUpJson).length > 0 ? (
            <div className="rounded-xl border border-violet-500/20 bg-violet-500/[0.06] px-4 py-3.5">
              <div className="flex items-center gap-2">
                <DexoAvatar size="xs" state="idle" pulse={false} />
                <p className="text-[10px] font-bold uppercase tracking-wider text-violet-300/80">Dexo wants to know</p>
              </div>
              <ul className="mt-2.5 space-y-2">
                {parseFollowUp(todayRow.followUpJson).map((q, i) => (
                  <li key={q} className="flex items-start gap-2 text-[13px] text-[var(--text-secondary)]">
                    <span className="mt-[5px] h-1 w-1 shrink-0 rounded-full bg-violet-400/50" />
                    {q}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {/* ── Sources ── */}
          {parseSources(todayRow.sourcesJson).length > 0 ? (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--text-muted)]">Web sources</p>
              <ul className="mt-2 space-y-1.5">
                {parseSources(todayRow.sourcesJson).map((s) => (
                  <li key={s.url} className="flex items-center gap-2 text-[12px]">
                    <ExternalLink className="h-3 w-3 shrink-0 text-[var(--text-muted)]" aria-hidden />
                    <a
                      href={s.url}
                      target="_blank"
                      rel="noreferrer"
                      className="break-all text-violet-300/80 underline-offset-2 hover:text-violet-200 hover:underline"
                    >
                      {s.title}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-xs text-[var(--text-muted)]">
              No web sources — set <code className="rounded bg-white/10 px-1">TAVILY_API_KEY</code> for live research.
            </p>
          )}

          {/* ── Apply suggested updates ── */}
          {hasPendingUpdates(todayRow.pendingProposedUpdates) && !todayRow.userApprovedAt ? (
            <div className="flex flex-col gap-3 rounded-xl border border-violet-500/20 bg-violet-500/[0.07] p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Zap className="h-3.5 w-3.5 shrink-0 text-violet-300" aria-hidden />
                  <p className="text-sm font-medium text-[var(--text-primary)]">Dexo has suggestions</p>
                </div>
                {pendingHint ? (
                  <p className="mt-1 text-xs text-[var(--text-secondary)]">{pendingHint}</p>
                ) : null}
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
        </div>
      ) : !loadingList && !pulsing ? (
        <div className="flex items-start gap-3 rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
          <DexoAvatar size="sm" state="idle" pulse={false} className="mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-[var(--text-primary)]">No research yet for today.</p>
            <p className="mt-1 text-xs text-[var(--text-secondary)]">
              Hit <strong className="text-[var(--text-primary)]">Run today</strong> — Dexo will run a web pass and build your breakdown.
            </p>
          </div>
        </div>
      ) : null}

      {/* ── Earlier days ── */}
      {reports.length > 1 ? (
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--text-muted)]">Earlier</p>
          <ul className="mt-2 space-y-1.5">
            {reports
              .filter((r) => r.id !== todayRow?.id)
              .slice(0, 12)
              .map((r) => (
                <li
                  key={r.id}
                  className="flex items-center gap-3 rounded-lg border border-white/[0.05] bg-white/[0.02] px-3 py-2 text-[12px] text-[var(--text-secondary)]"
                >
                  <span className="shrink-0 font-mono text-[11px] text-[var(--text-muted)]">{r.reportDay}</span>
                  <span className="min-w-0 flex-1 truncate">{r.headline ?? r.summary.slice(0, 100)}</span>
                </li>
              ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
