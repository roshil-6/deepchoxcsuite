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
  return (
    <div className={`border p-4 ${section.isRisk ? 'border-amber-500/[0.12] bg-amber-500/[0.02]' : 'border-white/[0.07] bg-white/[0.02]'} first:rounded-t-lg last:rounded-b-lg`}>
      <div className="flex items-baseline gap-3 mb-2.5">
        {section.isRisk ? (
          <span className="font-mono text-[8px] uppercase tracking-[0.18em] text-amber-400/60">⚠ Risk</span>
        ) : (
          <>
            <span className="font-mono text-[9px] text-white/20 shrink-0">{String(index + 1).padStart(2, '0')}</span>
            <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-white/40">{section.title}</span>
          </>
        )}
        {section.isRisk && <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-amber-400/50">{section.title}</span>}
      </div>

      {section.bullets.length > 0 && (
        <ul className="space-y-1.5 pl-7">
          {section.bullets.map((b, i) => (
            <li key={i} className="flex items-start gap-2 text-[13px] leading-snug text-white/60">
              <span className={`mt-[5px] h-[3px] w-[3px] shrink-0 rounded-full ${section.isRisk ? 'bg-amber-400/50' : 'bg-white/25'}`} />
              {b}
            </li>
          ))}
        </ul>
      )}

      {section.move ? (
        <div className="mt-3 flex items-start gap-2 pl-7 pt-2.5 border-t border-white/[0.05]">
          <ArrowRight className="mt-[2px] h-3 w-3 shrink-0 text-blue-400/60" aria-hidden />
          <p className="text-[12px] font-medium leading-snug text-blue-300/80">{section.move}</p>
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
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/[0.06] pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-[8px] uppercase tracking-[0.2em] text-white/25">Dexo</span>
            <span className="font-mono text-[8px] text-white/15">·</span>
            <span className="font-mono text-[8px] uppercase tracking-[0.2em] text-white/25">Daily Research</span>
          </div>
          <h2 className="text-[15px] font-semibold text-white/85">Venture Breakdown</h2>
          <p className="mt-0.5 text-[12px] text-white/35">
            Live web pass + AI analysis — point by point.
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => void runPulse(true)}
            disabled={pulsing}
            className="inline-flex items-center gap-1.5 rounded border border-white/[0.1] bg-white/[0.05] px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.12em] text-white/50 transition hover:border-white/[0.18] hover:bg-white/[0.09] hover:text-white/80 disabled:opacity-40"
          >
            <RefreshCw className={`h-3 w-3 ${pulsing ? 'animate-spin' : ''}`} aria-hidden />
            {pulsing ? 'Researching…' : 'Run today'}
          </button>
          <button
            type="button"
            onClick={() => void load()}
            disabled={loadingList}
            className="inline-flex items-center gap-1.5 rounded border border-white/[0.08] px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.12em] text-white/30 transition hover:border-white/[0.14] hover:text-white/55 disabled:opacity-40"
          >
            Reload
          </button>
        </div>
      </div>

      {/* ── Alerts ── */}
      {proRequired ? (
        <div className="rounded border border-white/[0.08] bg-white/[0.03] px-4 py-3">
          <p className="font-mono text-[9px] uppercase tracking-[0.15em] text-white/45">Pro required</p>
          <p className="mt-1 text-[12px] text-white/40">
            Daily research with live web pass is a Pro feature.
          </p>
        </div>
      ) : error ? (
        <div className="rounded border border-amber-500/[0.15] bg-amber-500/[0.04] px-4 py-3 font-sans text-[12px] text-amber-200/70">{error}</div>
      ) : null}

      {loadingList && reports.length === 0 ? (
        <div className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.15em] text-white/25">
          <RefreshCw className="h-3 w-3 animate-spin" />
          Loading…
        </div>
      ) : null}

      {pulsing && (
        <div className="flex items-center gap-3 rounded border border-white/[0.07] bg-white/[0.03] px-4 py-3">
          <RefreshCw className="h-3.5 w-3.5 animate-spin text-white/30" />
          <div>
            <p className="font-mono text-[9px] uppercase tracking-[0.15em] text-white/45">Researching…</p>
            <p className="text-[11px] text-white/30">Running web search and building your breakdown.</p>
          </div>
        </div>
      )}

      {/* ── Today's report ── */}
      {todayRow && parsed ? (
        <div className="space-y-5">
          {/* Report meta row */}
          <div className="flex items-center gap-3">
            <DexoAvatar size="xs" state="idle" pulse={false} className="shrink-0" />
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-[8px] uppercase tracking-[0.2em] text-white/30">Dexo</span>
              <span className="font-mono text-[8px] text-white/15">·</span>
              <span className="font-mono text-[8px] text-white/25">{todayRow.reportDay}</span>
              {todayRow.researchQuery && (
                <span className="inline-flex items-center gap-1 rounded border border-white/[0.07] px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-[0.1em] text-white/25">
                  <Globe className="h-2.5 w-2.5" />
                  Web pass
                </span>
              )}
              {todayRow.userApprovedAt ? (
                <span className="inline-flex items-center gap-1 rounded border border-emerald-500/[0.2] px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-[0.1em] text-emerald-400/60">
                  <CheckCircle2 className="h-2.5 w-2.5" />
                  Applied
                </span>
              ) : hasPendingUpdates(todayRow.pendingProposedUpdates) ? (
                <span className="inline-flex items-center gap-1 rounded border border-amber-500/[0.2] px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-[0.1em] text-amber-400/60">
                  Suggestions ready
                </span>
              ) : null}
            </div>
          </div>

          {/* Headline + intro */}
          {(todayRow.headline || parsed.intro) && (
            <div className="border-l-2 border-white/[0.08] pl-4">
              {todayRow.headline && (
                <p className="text-[14px] font-semibold leading-snug text-white/85">{todayRow.headline}</p>
              )}
              {parsed.intro && (
                <p className="mt-1.5 text-[13px] leading-relaxed text-white/50">{parsed.intro}</p>
              )}
            </div>
          )}

          {/* ── Breakdown sections ── */}
          {parsed.sections.length > 0 && (
            <div>
              <p className="font-mono text-[8px] uppercase tracking-[0.2em] text-white/25 mb-2">Breakdown</p>
              <div className="space-y-px">
                {parsed.sections.map((section, i) => (
                  <SectionCard key={section.title} section={section} index={i} />
                ))}
              </div>
            </div>
          )}

          {/* ── Dexo follow-up questions ── */}
          {parseFollowUp(todayRow.followUpJson).length > 0 && (
            <div className="border border-white/[0.07] bg-white/[0.02] rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <DexoAvatar size="xs" state="idle" pulse={false} />
                <span className="font-mono text-[8px] uppercase tracking-[0.2em] text-white/30">Dexo wants to know</span>
              </div>
              <ul className="space-y-2">
                {parseFollowUp(todayRow.followUpJson).map((q) => (
                  <li key={q} className="flex items-start gap-2.5 text-[13px] text-white/55">
                    <ArrowRight className="mt-[3px] h-3 w-3 shrink-0 text-white/20" />
                    {q}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* ── Web sources ── */}
          {parseSources(todayRow.sourcesJson).length > 0 ? (
            <div>
              <p className="font-mono text-[8px] uppercase tracking-[0.2em] text-white/25 mb-2">Sources</p>
              <div className="border border-white/[0.07] rounded-lg overflow-hidden">
                {parseSources(todayRow.sourcesJson).map((s, idx, arr) => (
                  <a
                    key={s.url}
                    href={s.url}
                    target="_blank"
                    rel="noreferrer"
                    className={`flex items-center gap-3 px-4 py-2.5 text-[12px] transition hover:bg-white/[0.04] ${idx < arr.length - 1 ? 'border-b border-white/[0.05]' : ''}`}
                  >
                    <ExternalLink className="h-3 w-3 shrink-0 text-white/20" aria-hidden />
                    <span className="min-w-0 flex-1 truncate text-white/55 hover:text-white/80">{s.title}</span>
                  </a>
                ))}
              </div>
            </div>
          ) : (
            <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-white/20">
              No sources — set TAVILY_API_KEY for live web research
            </p>
          )}

          {/* ── Apply suggested updates ── */}
          {hasPendingUpdates(todayRow.pendingProposedUpdates) && !todayRow.userApprovedAt && (
            <div className="flex flex-col gap-3 rounded border border-white/[0.1] bg-white/[0.03] p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Zap className="h-3 w-3 shrink-0 text-white/40" aria-hidden />
                  <span className="font-mono text-[8px] uppercase tracking-[0.18em] text-white/40">Dexo has suggestions</span>
                </div>
                {pendingHint && (
                  <p className="text-[12px] text-white/35">{pendingHint}</p>
                )}
              </div>
              <button
                type="button"
                disabled={applyId === todayRow.id}
                onClick={() => void onApply(todayRow)}
                className="shrink-0 rounded border border-white/[0.14] bg-white/[0.07] px-4 py-2 font-mono text-[9px] uppercase tracking-[0.14em] text-white/65 transition hover:border-white/[0.22] hover:bg-white/[0.12] hover:text-white/90 disabled:opacity-40"
              >
                {applyId === todayRow.id ? 'Applying…' : 'Apply to venture'}
              </button>
            </div>
          )}
        </div>
      ) : !loadingList && !pulsing ? (
        <div className="flex items-start gap-3 border border-white/[0.07] bg-white/[0.02] rounded-lg p-4">
          <DexoAvatar size="sm" state="idle" pulse={false} className="mt-0.5 shrink-0" />
          <div>
            <p className="text-[13px] font-medium text-white/65">No research yet for today.</p>
            <p className="mt-1 text-[12px] text-white/35">
              Hit <strong className="text-white/55">Run today</strong> — Dexo will run a web pass and build your breakdown.
            </p>
          </div>
        </div>
      ) : null}

      {/* ── Earlier days ── */}
      {reports.length > 1 && (
        <div>
          <p className="font-mono text-[8px] uppercase tracking-[0.2em] text-white/25 mb-2">Earlier reports</p>
          <div className="border border-white/[0.07] rounded-lg overflow-hidden">
            {reports
              .filter((r) => r.id !== todayRow?.id)
              .slice(0, 12)
              .map((r, idx, arr) => (
                <div
                  key={r.id}
                  className={`flex items-center gap-3 px-4 py-2.5 ${idx < arr.length - 1 ? 'border-b border-white/[0.05]' : ''}`}
                >
                  <span className="shrink-0 font-mono text-[9px] text-white/25">{r.reportDay}</span>
                  <span className="min-w-0 flex-1 truncate text-[12px] text-white/45">{r.headline ?? r.summary.slice(0, 100)}</span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
