'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { RefreshCw, Globe, CheckCircle2, ExternalLink, ArrowRight, Zap } from 'lucide-react';
import { useOffice } from '@/lib/OfficeContext';
import { buildDexoJarvisVentureContext } from '@/lib/dexoJarvisContext';
import { isVentureFoundationSparse } from '@/lib/ventureFoundation';
import { dexoFullVenturePatchFromJarvis, dexoAutoSaveHintLines } from '@/lib/dexoApplyJarvisProductPatch';
import { getEffectiveSessionId } from '@/lib/deviceSession';
import { DexoAvatar } from '@/components/Dexo/DexoAvatar';
import type { JarvisProposedUpdates } from '@/app/api/jarvis/route';
import type { Project } from '@/lib/db';
import type { VentureDailyReportRow } from '@/lib/dexoDailyBriefTypes';
import {
  parseBodyMd,
  parseSources,
  parseFollowUp,
  hasPendingUpdates,
  type ParsedSection,
} from '@/lib/dexoDailyBriefParse';

export type { VentureDailyReportRow } from '@/lib/dexoDailyBriefTypes';

function todayUtcDay(): string {
  return new Date().toISOString().slice(0, 10);
}

// ─── Particle CSS (injected once) ────────────────────────────────────────────
const PARTICLE_CSS = `
@keyframes dp-float-a { 0%,100%{transform:translate(0,0) scale(1);opacity:0.35} 50%{transform:translate(8px,-10px) scale(1.2);opacity:0.7} }
@keyframes dp-float-b { 0%,100%{transform:translate(0,0) scale(1);opacity:0.25} 50%{transform:translate(-9px,8px) scale(1.15);opacity:0.6} }
@keyframes dp-float-c { 0%,100%{transform:translate(0,0) scale(1);opacity:0.2}  50%{transform:translate(6px,9px) scale(1.1);opacity:0.5} }
@keyframes dp-float-d { 0%,100%{transform:translate(0,0) scale(1);opacity:0.15} 50%{transform:translate(-5px,-7px) scale(1.1);opacity:0.4} }
@keyframes dp-float-e { 0%,100%{transform:translate(0,0) scale(1);opacity:0.1} 50%{transform:translate(10px,-5px) scale(1.25);opacity:0.35} }
@keyframes dp-pulse    { 0%,100%{opacity:0.6} 50%{opacity:1} }
`;
let dpCssInjected = false;
function injectDpCss() {
  if (dpCssInjected || typeof document === 'undefined') return;
  dpCssInjected = true;
  const el = document.createElement('style');
  el.textContent = PARTICLE_CSS;
  document.head.appendChild(el);
}

// ─── Section theme map ────────────────────────────────────────────────────────
type SectionTheme = {
  accent: string;      // rgba
  glow: string;        // rgba for radial glow
  badge: string;       // text label color
  border: string;
  bg: string;
  moveBg: string;
  moveBorder: string;
  moveText: string;
};

function getSectionTheme(title: string, isRisk?: boolean): SectionTheme {
  const t = title.toLowerCase();
  if (isRisk || t.includes('risk')) {
    return {
      accent: 'rgba(251,191,36,0.75)',
      glow: 'rgba(251,191,36,0.18)',
      badge: 'rgba(251,191,36,0.65)',
      border: 'rgba(251,191,36,0.12)',
      bg: 'rgba(251,191,36,0.025)',
      moveBg: 'rgba(251,191,36,0.06)',
      moveBorder: 'rgba(251,191,36,0.18)',
      moveText: 'rgba(253,230,138,0.9)',
    };
  }
  if (t.includes('market') || t.includes('competitor') || t.includes('landscape')) {
    return {
      accent: 'rgba(56,189,248,0.75)',
      glow: 'rgba(56,189,248,0.15)',
      badge: 'rgba(56,189,248,0.65)',
      border: 'rgba(56,189,248,0.1)',
      bg: 'rgba(56,189,248,0.02)',
      moveBg: 'rgba(56,189,248,0.06)',
      moveBorder: 'rgba(56,189,248,0.2)',
      moveText: 'rgba(125,211,252,0.9)',
    };
  }
  if (t.includes('product') || t.includes('build') || t.includes('deliver')) {
    return {
      accent: 'rgba(148,163,184,0.75)',
      glow: 'rgba(148,163,184,0.10)',
      badge: 'rgba(148,163,184,0.65)',
      border: 'rgba(255,255,255,0.07)',
      bg: 'rgba(255,255,255,0.02)',
      moveBg: 'rgba(255,255,255,0.05)',
      moveBorder: 'rgba(255,255,255,0.10)',
      moveText: 'rgba(242,242,245,0.9)',
    };
  }
  if (t.includes('financ') || t.includes('revenue') || t.includes('runway') || t.includes('capital')) {
    return {
      accent: 'rgba(52,211,153,0.75)',
      glow: 'rgba(52,211,153,0.15)',
      badge: 'rgba(52,211,153,0.65)',
      border: 'rgba(52,211,153,0.1)',
      bg: 'rgba(52,211,153,0.02)',
      moveBg: 'rgba(52,211,153,0.06)',
      moveBorder: 'rgba(52,211,153,0.2)',
      moveText: 'rgba(110,231,183,0.9)',
    };
  }
  if (t.includes('growth') || t.includes('narr') || t.includes('brand') || t.includes('market')) {
    return {
      accent: 'rgba(251,113,133,0.75)',
      glow: 'rgba(251,113,133,0.15)',
      badge: 'rgba(251,113,133,0.65)',
      border: 'rgba(251,113,133,0.1)',
      bg: 'rgba(251,113,133,0.02)',
      moveBg: 'rgba(251,113,133,0.06)',
      moveBorder: 'rgba(251,113,133,0.2)',
      moveText: 'rgba(253,164,175,0.9)',
    };
  }
  // Default: violet/indigo
  return {
    accent: 'rgba(129,140,248,0.75)',
    glow: 'rgba(129,140,248,0.15)',
    badge: 'rgba(129,140,248,0.65)',
    border: 'rgba(129,140,248,0.1)',
    bg: 'rgba(129,140,248,0.02)',
    moveBg: 'rgba(34,211,238,0.05)',
    moveBorder: 'rgba(34,211,238,0.2)',
    moveText: 'rgba(103,232,249,0.9)',
  };
}

const PARTICLE_ANIMS = ['dp-float-a','dp-float-b','dp-float-c','dp-float-d','dp-float-e'];
const PARTICLE_POS = [
  { top: '12%',  right: '8%'  },
  { top: '55%',  right: '14%' },
  { top: '78%',  right: '4%'  },
  { top: '30%',  right: '22%' },
  { top: '88%',  right: '18%' },
];

// ─── Section card — particle design ──────────────────────────────────────────
function SectionCard({ section, index }: { section: ParsedSection; index: number }) {
  React.useEffect(() => { injectDpCss(); }, []);
  const theme = getSectionTheme(section.title, section.isRisk);
  const durations = [4.2, 5.8, 3.9, 6.4, 5.1];

  return (
    <div
      className="relative overflow-hidden rounded-2xl p-5 sm:p-6"
      style={{ background: theme.bg, border: `1px solid ${theme.border}` }}
    >
      {/* ── Radial glow ── */}
      <div
        className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full blur-3xl"
        style={{ background: theme.glow, opacity: 0.6 }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-8 -left-8 h-32 w-32 rounded-full blur-2xl"
        style={{ background: theme.glow, opacity: 0.25 }}
        aria-hidden
      />

      {/* ── Floating particles ── */}
      {PARTICLE_POS.map((pos, i) => (
        <span
          key={i}
          className="pointer-events-none absolute rounded-full"
          aria-hidden
          style={{
            ...pos,
            width: i % 2 === 0 ? '4px' : '3px',
            height: i % 2 === 0 ? '4px' : '3px',
            background: theme.accent,
            animation: `${PARTICLE_ANIMS[i]} ${durations[i]}s ${i * 0.7}s ease-in-out infinite`,
            boxShadow: `0 0 6px ${theme.accent}`,
          }}
        />
      ))}

      {/* ── Ghost number ── */}
      {!section.isRisk && (
        <span
          className="pointer-events-none absolute bottom-3 right-4 select-none font-black leading-none"
          aria-hidden
          style={{
            fontSize: '72px',
            color: theme.accent,
            opacity: 0.06,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {String(index + 1).padStart(2, '0')}
        </span>
      )}

      {/* ── Header row ── */}
      <div className="relative mb-4 flex items-center gap-3">
        {/* Animated dot */}
        <span
          className="h-2 w-2 shrink-0 rounded-full"
          style={{
            background: theme.accent,
            boxShadow: `0 0 8px ${theme.accent}`,
            animation: 'dp-pulse 2.4s ease-in-out infinite',
          }}
          aria-hidden
        />
        <span
          className="font-mono text-[9px] uppercase tracking-[0.22em]"
          style={{ color: theme.badge }}
        >
          {section.isRisk ? '⚠ Key risks' : section.title}
        </span>
        <div className="flex-1 h-px" style={{ background: `linear-gradient(to right, ${theme.border}, transparent)` }} aria-hidden />
        {!section.isRisk && (
          <span
            className="font-mono text-[10px] font-black tabular-nums"
            style={{ color: theme.accent, opacity: 0.4 }}
          >
            {String(index + 1).padStart(2, '0')}
          </span>
        )}
      </div>

      {/* ── Bullets ── */}
      {section.bullets.length > 0 && (
        <ul className="relative space-y-3">
          {section.bullets.map((b, i) => (
            <li key={i} className="flex items-start gap-3">
              <span
                className="mt-[7px] h-[4px] w-[4px] shrink-0 rounded-full"
                style={{
                  background: theme.accent,
                  boxShadow: `0 0 4px ${theme.accent}`,
                  flexShrink: 0,
                }}
                aria-hidden
              />
              <span className="text-[13px] leading-relaxed text-white/70">{b}</span>
            </li>
          ))}
        </ul>
      )}

      {/* ── Move row ── */}
      {section.move && (
        <div
          className="relative mt-4 flex items-start gap-3 rounded-xl px-4 py-3"
          style={{
            background: theme.moveBg,
            border: `1px solid ${theme.moveBorder}`,
          }}
        >
          <ArrowRight
            className="mt-[2px] h-3.5 w-3.5 shrink-0"
            style={{ color: theme.moveText }}
            aria-hidden
          />
          <p className="text-[12.5px] font-medium leading-snug" style={{ color: theme.moveText }}>
            {section.move}
          </p>
        </div>
      )}
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
    <div className="flex flex-col gap-8">

      {/* ── Top bar: label + actions ── */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-white/20">Dexo · Daily Research</p>
          <h2 className="mt-1 text-[22px] font-semibold leading-tight tracking-tight text-white/85">
            Venture breakdown
          </h2>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => void runPulse(true)}
            disabled={pulsing}
            className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[11px] text-white/40 transition hover:bg-white/[0.05] hover:text-white/65 disabled:opacity-30"
          >
            <RefreshCw className={`h-3 w-3 ${pulsing ? 'animate-spin' : ''}`} aria-hidden />
            {pulsing ? 'Running…' : 'Run'}
          </button>
        </div>
      </div>

      {/* ── State messages ── */}
      {proRequired && (
        <p className="text-[13px] text-white/35">
          Daily research is a Pro feature.
        </p>
      )}
      {error && !proRequired && (
        <p className="text-[13px] text-amber-300/60">{error}</p>
      )}
      {loadingList && reports.length === 0 && (
        <div className="flex items-center gap-2 text-white/20">
          <RefreshCw className="h-3 w-3 animate-spin" />
          <span className="font-mono text-[9px] uppercase tracking-[0.15em]">Loading…</span>
        </div>
      )}
      {pulsing && (
        <div className="flex items-center gap-2.5 text-white/30">
          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
          <span className="text-[13px]">Running web research…</span>
        </div>
      )}

      {/* ── Today's report ── */}
      {todayRow && parsed ? (
        <div className="flex flex-col gap-8">

          {/* Meta */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <DexoAvatar size="xs" state="idle" pulse={false} className="shrink-0" />
            <span className="font-mono text-[9px] text-white/25">{todayRow.reportDay}</span>
            {todayRow.researchQuery && (
              <span className="flex items-center gap-1 font-mono text-[9px] text-white/20">
                <Globe className="h-2.5 w-2.5" aria-hidden />
                web pass
              </span>
            )}
            {todayRow.userApprovedAt && (
              <span className="flex items-center gap-1 font-mono text-[9px] text-emerald-400/50">
                <CheckCircle2 className="h-2.5 w-2.5" />
                applied
              </span>
            )}
            {!todayRow.userApprovedAt && hasPendingUpdates(todayRow.pendingProposedUpdates) && (
              <span className="font-mono text-[9px] text-amber-400/50">suggestions ready</span>
            )}
          </div>

          {/* Headline + intro */}
          {(todayRow.headline || parsed.intro) && (
            <div className="flex flex-col gap-2">
              {todayRow.headline && (
                <h3 className="text-[19px] font-semibold leading-snug text-white/88">
                  {todayRow.headline}
                </h3>
              )}
              {parsed.intro && (
                <p className="text-[14px] leading-[1.75] text-white/40">{parsed.intro}</p>
              )}
            </div>
          )}

          {/* ── Breakdown sections ── */}
          {parsed.sections.length > 0 && (
            <div className="flex flex-col gap-3">
              {parsed.sections.map((section, i) => (
                <SectionCard key={section.title} section={section} index={i} />
              ))}
            </div>
          )}

          {/* ── Follow-up questions ── */}
          {parseFollowUp(todayRow.followUpJson).length > 0 && (
            <div className="flex flex-col gap-3">
              <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-white/18">Dexo wants to know</p>
              <ul className="flex flex-col gap-2.5">
                {parseFollowUp(todayRow.followUpJson).map((q) => (
                  <li key={q} className="flex items-start gap-3">
                    <span className="mt-[8px] h-[3px] w-[3px] shrink-0 rounded-full bg-white/15" />
                    <span className="text-[13px] leading-relaxed text-white/45">{q}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* ── Sources ── */}
          {parseSources(todayRow.sourcesJson).length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-white/18">Sources</p>
              <div className="flex flex-col gap-0.5">
                {parseSources(todayRow.sourcesJson).map((s) => (
                  <a
                    key={s.url}
                    href={s.url}
                    target="_blank"
                    rel="noreferrer"
                    className="group flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-[12px] transition hover:bg-white/[0.03]"
                  >
                    <ExternalLink className="h-3 w-3 shrink-0 text-white/12 group-hover:text-white/30" aria-hidden />
                    <span className="min-w-0 truncate text-white/35 group-hover:text-white/60">{s.title}</span>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* ── Apply suggestions ── */}
          {hasPendingUpdates(todayRow.pendingProposedUpdates) && !todayRow.userApprovedAt && (
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[12px] text-white/35">
                  <Zap className="mr-1 inline h-3 w-3 text-white/30" aria-hidden />
                  {pendingHint ?? 'Dexo has venture updates ready'}
                </p>
              </div>
              <button
                type="button"
                disabled={applyId === todayRow.id}
                onClick={() => void onApply(todayRow)}
                className="shrink-0 rounded-xl px-4 py-1.5 text-[11px] text-white/50 transition hover:bg-white/[0.06] hover:text-white/80 disabled:opacity-30"
              >
                {applyId === todayRow.id ? 'Applying…' : 'Apply to venture'}
              </button>
            </div>
          )}
        </div>

      ) : !loadingList && !pulsing ? (
        <div className="flex flex-col gap-3">
          <p className="text-[14px] text-white/50">No research yet for today.</p>
          <p className="text-[13px] text-white/30">
            Hit Run above — Dexo will do a web pass and build your breakdown.
          </p>
        </div>
      ) : null}

      {/* ── Earlier days ── */}
      {reports.length > 1 && (
        <div className="flex flex-col gap-2">
          <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-white/18">Earlier</p>
          <div className="flex flex-col gap-1">
            {reports
              .filter((r) => r.id !== todayRow?.id)
              .slice(0, 12)
              .map((r) => (
                <div key={r.id} className="flex items-baseline gap-3 py-1">
                  <span className="shrink-0 font-mono text-[9px] text-white/20">{r.reportDay}</span>
                  <span className="min-w-0 truncate text-[12px] text-white/35">
                    {r.headline ?? r.summary?.slice(0, 100)}
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
