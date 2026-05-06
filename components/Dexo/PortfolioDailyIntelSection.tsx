'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { ExternalLink, Globe, RefreshCw, Sparkles } from 'lucide-react';
import type { Project } from '@/lib/db';
import type { VentureDailyReportRow } from '@/components/Dexo/DexoDailyBriefPanel';

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
  return out.slice(0, 6);
}

type CardState = {
  project: Project;
  report: VentureDailyReportRow | null;
  loading: boolean;
  error?: string;
};

/**
 * Executive overview: latest Tavily-backed daily brief per venture (headline, summary, source links).
 */
export function PortfolioDailyIntelSection({
  allProjects,
  onOpenVenture,
}: {
  allProjects: Project[];
  onOpenVenture?: (p: Project) => void;
}) {
  const [cards, setCards] = useState<CardState[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const withIds = allProjects.filter((p): p is Project & { id: number } => typeof p.id === 'number');
    if (withIds.length === 0) {
      setCards([]);
      return;
    }
    setRefreshing(true);
    try {
      const results = await Promise.all(
        withIds.map(async (project) => {
          try {
            const res = await fetch('/api/dexo', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                action: 'dailyReportsList',
                payload: { ventureId: project.id, limit: 5 },
              }),
            });
            let data: { ok?: boolean; reports?: VentureDailyReportRow[] } = {};
            try {
              data = (await res.json()) as typeof data;
            } catch {
              data = {};
            }
            if (!data.ok || !Array.isArray(data.reports)) {
              return { project, report: null, loading: false, error: 'Brief unavailable' } satisfies CardState;
            }
            const latest = data.reports[0] ?? null;
            return { project, report: latest, loading: false } satisfies CardState;
          } catch {
            return { project, report: null, loading: false, error: 'Network error' } satisfies CardState;
          }
        })
      );
      setCards(results);
    } finally {
      setRefreshing(false);
    }
  }, [allProjects]);

  useEffect(() => {
    void load();
  }, [load]);

  if (allProjects.length === 0) return null;

  return (
    <section className="mt-10">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/15 ring-1 ring-cyan-400/25">
              <Globe className="h-4 w-4 text-cyan-200" aria-hidden />
            </div>
            <h2 className="text-lg font-semibold tracking-tight text-[var(--text-primary)]">
              Live intel by venture
            </h2>
          </div>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--text-secondary)]">
            Dexo pulls fresh web context via Tavily for each workspaceâ€”headlines, synthesis, and original sources. Open a
            venture for the full daily brief tab.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={refreshing}
          className="inline-flex items-center justify-center gap-2 self-start rounded-xl border border-white/[0.1] bg-white/[0.04] px-4 py-2 text-xs font-medium text-[var(--text-secondary)] transition hover:bg-white/[0.07] disabled:opacity-50 sm:self-auto"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} aria-hidden />
          Refresh intel
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map(({ project, report, error }) => {
          const sources = report ? parseSources(report.sourcesJson) : [];
          const summaryExcerpt =
            report?.summary?.trim() && report.summary.length > 220 ? `${report.summary.slice(0, 217)}â€¦` : report?.summary;
          return (
            <article
              key={project.id ?? project.name}
              className="group relative overflow-hidden rounded-2xl border border-white/[0.09] bg-gradient-to-br from-[rgba(255,255,255,0.07)] via-[rgba(255,255,255,0.03)] to-[rgba(6,182,212,0.06)] p-[1px] shadow-[0_20px_50px_rgba(0,0,0,0.35)]"
            >
              <div className="h-full rounded-[0.9rem] bg-[#141416] p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-[11px] font-semibold uppercase tracking-[0.14em] text-cyan-200/85">
                      {project.name}
                    </p>
                    {report ? (
                      <h3 className="mt-1 line-clamp-2 text-sm font-medium leading-snug text-[var(--text-primary)]">
                        {report.headline || 'Daily brief'}
                      </h3>
                    ) : (
                      <h3 className="mt-1 text-sm font-medium text-[var(--text-muted)]">
                        {error ?? 'No brief yet â€” run Dexo daily pulse'}
                      </h3>
                    )}
                  </div>
                  <Sparkles className="h-4 w-4 shrink-0 text-white/55" aria-hidden />
                </div>

                {report ? (
                  <>
                    <p className="mt-2 line-clamp-3 text-[12px] leading-relaxed text-[var(--text-secondary)]">
                      {summaryExcerpt}
                    </p>
                    {report.researchQuery ? (
                      <p className="mt-2 text-[10px] text-[var(--text-tertiary)]">
                        Query: <span className="text-[var(--text-muted)]">{report.researchQuery}</span>
                      </p>
                    ) : null}
                    {sources.length > 0 ? (
                      <ul className="mt-3 space-y-1.5 border-t border-white/[0.06] pt-3">
                        {sources.map((s) => (
                          <li key={s.url} className="min-w-0">
                            <a
                              href={s.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex max-w-full items-start gap-1.5 text-[11px] text-cyan-200/90 underline-offset-2 hover:underline"
                            >
                              <ExternalLink className="mt-0.5 h-3 w-3 shrink-0 opacity-70" aria-hidden />
                              <span className="break-words">{s.title}</span>
                            </a>
                            {s.snippet ? (
                              <p className="mt-0.5 pl-[1.125rem] text-[10px] leading-snug text-[var(--text-tertiary)]">
                                {s.snippet.length > 120 ? `${s.snippet.slice(0, 117)}â€¦` : s.snippet}
                              </p>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-3 text-[10px] text-[var(--text-tertiary)]">Sources processing or Tavily off.</p>
                    )}
                    <p className="mt-2 text-[10px] text-[var(--text-muted)]">
                      {report.reportDay} Â· updated {new Date(report.updatedAt).toLocaleString()}
                    </p>
                  </>
                ) : null}

                {onOpenVenture ? (
                  <button
                    type="button"
                    onClick={() => onOpenVenture(project)}
                    className="mt-4 w-full rounded-lg border border-white/[0.08] py-2 text-[11px] font-medium text-[var(--text-secondary)] transition group-hover:border-white/10 group-hover:text-[var(--text-primary)]"
                  >
                    Open venture
                  </button>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}



