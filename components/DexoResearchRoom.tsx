'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  RefreshCw,
  Globe,
  CheckCircle2,
  Send,
  SlidersHorizontal,
  ChevronRight,
} from 'lucide-react';
import { useOffice } from '@/lib/OfficeContext';
import { buildDexoJarvisVentureContext, DEXO_PRE_VENTURE_CONTEXT } from '@/lib/dexoJarvisContext';
import { isVentureFoundationSparse } from '@/lib/ventureFoundation';
import { getEffectiveSessionId } from '@/lib/deviceSession';
import type { VentureDailyReportRow } from '@/lib/dexoDailyBriefTypes';
import {
  parseBodyMd,
  parseSources,
  parseFollowUp,
  hasPendingUpdates,
} from '@/lib/dexoDailyBriefParse';
import {
  loadResearchWorkflowPrefs,
  saveResearchWorkflowPrefs,
  shouldAutoRunBriefingNow,
  appendBriefingPreferencesToContext,
  type ResearchWorkflowPrefs,
  DEFAULT_RESEARCH_WORKFLOW,
} from '@/lib/researchWorkflowPrefs';
import { dexoFullVenturePatchFromJarvis, dexoAutoSaveHintLines } from '@/lib/dexoApplyJarvisProductPatch';
import { useTokens, useChatCost } from '@/lib/tokens/useTokens';
import { TOKEN_COSTS } from '@/lib/tokens/tokenSystem';
import { useUpgradeModal } from '@/components/tokens/UpgradeModal';
import type { JarvisReport } from '@/app/api/jarvis/route';
import { DexoParticleCanvas } from '@/components/Dexo/DexoParticleSphere';
import { DexoAvatar } from '@/components/Dexo/DexoAvatar';

function todayUtcDay(): string {
  return new Date().toISOString().slice(0, 10);
}

function stripMdLight(s: string): string {
  return s.replace(/\*\*([^*]+)\*\*/g, '$1').replace(/\*([^*]+)\*/g, '$1');
}

type ChatMsg = { id: number; role: 'user' | 'dexo'; text: string };

const STORAGE_KEY = 'deepchox-research-chat-v1';

function loadChat(ventureId: number): ChatMsg[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY}:${ventureId}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const out: ChatMsg[] = [];
    for (const x of parsed) {
      if (!x || typeof x !== 'object') continue;
      const o = x as Record<string, unknown>;
      if ((o.role !== 'user' && o.role !== 'dexo') || typeof o.text !== 'string') continue;
      const id = typeof o.id === 'number' && Number.isFinite(o.id) ? o.id : Date.now();
      out.push({ role: o.role, text: o.text, id });
    }
    return out.slice(-100);
  } catch {
    return [];
  }
}

function saveChat(ventureId: number, messages: ChatMsg[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(`${STORAGE_KEY}:${ventureId}`, JSON.stringify(messages.slice(-100)));
  } catch {
    /* noop */
  }
}

function nextMsgId(messages: ChatMsg[]): number {
  return messages.reduce((m, x) => Math.max(m, x.id), 0) + 1;
}

type MobilePane = 'brief' | 'chat';

export function DexoResearchRoom({ embedded }: { embedded?: boolean }) {
  const { activeProject, updateProjectField } = useOffice();
  const tokens = useTokens();
  useChatCost();
  const upgradeModal = useUpgradeModal();

  const [mobilePane, setMobilePane] = useState<MobilePane>('brief');
  const [workflowOpen, setWorkflowOpen] = useState(true);
  const [workflowPrefs, setWorkflowPrefs] = useState<ResearchWorkflowPrefs>({
    ...DEFAULT_RESEARCH_WORKFLOW,
    lanesEnabled: { ...DEFAULT_RESEARCH_WORKFLOW.lanesEnabled },
  });

  const [reports, setReports] = useState<VentureDailyReportRow[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [pulsing, setPulsing] = useState(false);
  const [applyId, setApplyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [proRequired, setProRequired] = useState(false);
  const [pulseAttempted, setPulseAttempted] = useState(false);

  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const msgIdRef = useRef(1);

  const chatAnchorRef = useRef<HTMLDivElement>(null);
  const [orbActive, setOrbActive] = useState(false);

  const ventureId = activeProject?.id;
  const day = todayUtcDay();

  useEffect(() => {
    if (!ventureId) return;
    setPulseAttempted(false);
    setWorkflowPrefs(loadResearchWorkflowPrefs(ventureId));
    const stored = loadChat(ventureId);
    if (stored.length === 0) {
      const seed: ChatMsg = {
        id: 1,
        role: 'dexo',
        text: activeProject?.name
          ? `I'm Dexo, your research assistant for ${activeProject.name}. Ask me anything — market intel, competitive moves, product strategy, or fundraising narrative. I'll surface live web context when it helps.`
          : `I'm Dexo, your research assistant. Ask me anything — market intel, competitive moves, product strategy, or fundraising narrative.`,
      };
      msgIdRef.current = 2;
      setMessages([seed]);
      saveChat(ventureId, [seed]);
    } else {
      setMessages(stored);
      msgIdRef.current = nextMsgId(stored);
    }
  }, [ventureId, activeProject?.name]);

  useEffect(() => {
    if (!ventureId) return;
    saveChat(ventureId, messages);
  }, [ventureId, messages]);

  useEffect(() => {
    chatAnchorRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, chatLoading]);

  const commitWorkflow = useCallback(
    (updater: (p: ResearchWorkflowPrefs) => ResearchWorkflowPrefs) => {
      setWorkflowPrefs((prev) => {
        const next = updater(prev);
        if (ventureId) saveResearchWorkflowPrefs(ventureId, next);
        return next;
      });
    },
    [ventureId]
  );

  const load = useCallback(async () => {
    if (!ventureId) return;
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
        setError('Could not load research reports.');
        setReports([]);
        return;
      }
      setReports(data.reports);
    } catch {
      setError('Network error loading research.');
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
      if (!activeProject?.id) return;
      setPulsing(true);
      setError(null);
      setProRequired(false);
      try {
        const base = buildDexoJarvisVentureContext(activeProject);
        const context = appendBriefingPreferencesToContext(base, workflowPrefs);
        const res = await fetch('/api/dexo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-deepchox-session': getEffectiveSessionId() },
          body: JSON.stringify({
            action: 'dailyPulse',
            payload: {
              ventureId: activeProject.id,
              reportDay: day,
              context,
              sparseContext: isVentureFoundationSparse(activeProject),
              force,
            },
          }),
        });
        const data = (await res.json()) as { ok?: boolean; error?: string; upgrade?: boolean; message?: string };
        if (!data.ok) {
          if (data.error === 'pro_required' || data.upgrade) setProRequired(true);
          else setError(data.message ?? data.error ?? 'Research run failed.');
          return;
        }
        await load();
      } catch {
        setError('Research request failed.');
      } finally {
        setPulsing(false);
      }
    },
    [activeProject, day, load, workflowPrefs]
  );

  useEffect(() => {
    if (!activeProject?.id || !ventureId) return;
    if (loadingList || pulseAttempted) return;
    const auto = shouldAutoRunBriefingNow(workflowPrefs);
    if (!auto) {
      setPulseAttempted(true);
      return;
    }
    const hasToday = reports.some((r) => r.reportDay === day);
    if (!hasToday) {
      setPulseAttempted(true);
      void runPulse(false);
    } else {
      setPulseAttempted(true);
    }
  }, [activeProject?.id, ventureId, loadingList, pulseAttempted, reports, day, runPulse, workflowPrefs]);

  const todayRow = reports.find((r) => r.reportDay === day) ?? reports[0];
  const parsed = todayRow ? parseBodyMd(todayRow.bodyMd || todayRow.summary) : null;

  const onApply = async (row: VentureDailyReportRow) => {
    if (!activeProject || !hasPendingUpdates(row.pendingProposedUpdates)) return;
    setApplyId(row.id);
    try {
      const patch = dexoFullVenturePatchFromJarvis(activeProject, row.pendingProposedUpdates);
      (Object.entries(patch) as [keyof typeof patch, unknown][]).forEach(([key, val]) => {
        if (val !== undefined) void updateProjectField(key, val);
      });
      await fetch('/api/dexo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-deepchox-session': getEffectiveSessionId() },
        body: JSON.stringify({
          action: 'dailyReportApply',
          payload: { reportId: row.id, ventureId: row.ventureId },
        }),
      });
      await load();
    } finally {
      setApplyId(null);
    }
  };

  const sendMessage = useCallback(async () => {
    const text = chatInput.trim();
    if (!text || chatLoading || !activeProject) return;

    const tokenResult = tokens.spend(TOKEN_COSTS.CHAT_MESSAGE, 'Research chat');
    if (!tokenResult.success) {
      setChatError(tokenResult.message || 'Insufficient tokens');
      upgradeModal.open(tokenResult.message);
      return;
    }

    setChatInput('');
    setChatError(null);
    const uid = msgIdRef.current++;
    setMessages((prev) => [...prev, { role: 'user', text, id: uid }]);
    setChatLoading(true);

    try {
      let context = buildDexoJarvisVentureContext(activeProject);
      if (!context.trim()) context = DEXO_PRE_VENTURE_CONTEXT;
      context = appendBriefingPreferencesToContext(context, workflowPrefs);

      const historyForApi = messages.slice(-10).map((c) => ({ role: c.role, text: c.text }));

      const res = await fetch('/api/dexo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'jarvis',
          payload: {
            mode: 'converse',
            context,
            sparseContext: isVentureFoundationSparse(activeProject),
            userMessage: text,
            conversationHistory: historyForApi,
          },
        }),
      });
      const data = (await res.json()) as { ok: boolean; report?: JarvisReport; error?: string };
      if (!data.ok || !data.report) {
        setChatError(data.error ?? 'Dexo could not reply.');
        return;
      }
      const reply = data.report.voiceResponse?.trim() || data.report.summary?.trim() || '…';
      setMessages((prev) => [...prev, { role: 'dexo', text: reply, id: msgIdRef.current++ }]);
    } catch (e) {
      setChatError(e instanceof Error ? e.message : 'Request failed');
    } finally {
      setChatLoading(false);
    }
  }, [activeProject, chatInput, chatLoading, messages, tokens, upgradeModal, workflowPrefs]);

  const pendingHint =
    todayRow && activeProject && hasPendingUpdates(todayRow.pendingProposedUpdates)
      ? dexoAutoSaveHintLines(
          dexoFullVenturePatchFromJarvis(activeProject, todayRow.pendingProposedUpdates)
        ).join(' · ')
      : null;

  const workflowSection = ventureId && (
    <section className="border-b border-zinc-800/60 pb-8 pt-2">
      <button
        type="button"
        onClick={() => setWorkflowOpen((o) => !o)}
        className="flex w-full items-center gap-2 text-left"
      >
        <SlidersHorizontal className="h-3.5 w-3.5 text-zinc-500" aria-hidden />
        <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-zinc-500">
          Automation & interests
        </span>
        <ChevronRight
          className={`ml-auto h-3.5 w-3.5 text-zinc-600 transition-transform ${workflowOpen ? 'rotate-90' : ''}`}
          aria-hidden
        />
      </button>
      {workflowOpen && (
        <div className="mt-5 space-y-5">
          <div>
            <label htmlFor="research-interests" className="text-[13px] text-zinc-300">
              What should Dexo always factor in?
            </label>
            <textarea
              id="research-interests"
              value={workflowPrefs.interestNotes}
              onChange={(e) =>
                commitWorkflow((p) => ({ ...p, interestNotes: e.target.value }))
              }
              placeholder="Markets, competitors, milestones, personal goals…"
              rows={3}
              className="mt-2 w-full resize-y bg-transparent px-0 py-2 text-[15px] leading-relaxed text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-0"
            />
          </div>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-[13px] text-zinc-400">
            <label className="inline-flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={workflowPrefs.autoBriefing}
                onChange={(e) =>
                  commitWorkflow((p) => ({ ...p, autoBriefing: e.target.checked }))
                }
                className="rounded border-zinc-600 bg-transparent text-teal-500"
              />
              Auto-run web briefing
            </label>
            <label className="inline-flex items-center gap-2">
              <span className="text-zinc-500">Cadence</span>
              <select
                value={workflowPrefs.cadence}
                onChange={(e) =>
                  commitWorkflow((p) => ({
                    ...p,
                    cadence: e.target.value as ResearchWorkflowPrefs['cadence'],
                  }))
                }
                className="border-0 bg-transparent text-zinc-200 underline decoration-zinc-600 underline-offset-4 focus:outline-none"
              >
                <option value="daily">Daily</option>
                <option value="weekdays">Weekdays</option>
                <option value="manual">Manual only</option>
              </select>
            </label>
          </div>
          <div>
            <p className="text-[12px] text-zinc-500">Weight in daily brief</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {(
                [
                  { id: 'market', label: 'Market' },
                  { id: 'product', label: 'Product' },
                  { id: 'fundraising', label: 'Fundraising' },
                  { id: 'ops', label: 'Execution' },
                  { id: 'narrative', label: 'Narrative' },
                ] as { id: import('@/lib/researchWorkflowPrefs').ResearchLaneId; label: string }[]
              ).map(({ id, label }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() =>
                    commitWorkflow((p) => ({
                      ...p,
                      lanesEnabled: { ...p.lanesEnabled, [id]: !p.lanesEnabled[id] },
                    }))
                  }
                  className={`rounded-full px-3 py-1 text-[12px] transition-colors ${
                    workflowPrefs.lanesEnabled[id] ? 'bg-zinc-200 text-zinc-900' : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );

  const briefColumn = (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className={`mx-auto max-w-xl pl-1 ${embedded ? 'pb-8 pt-2' : 'pb-24 pt-4'}`}>
        <header className="mb-10">
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-500">
            Daily research
          </p>
          <h1 className="mt-2 text-[1.65rem] font-normal leading-snug tracking-tight text-zinc-100">
            {activeProject?.name ? `${activeProject.name}` : 'Your venture'}
          </h1>
          <p className="mt-3 max-w-md text-[15px] leading-relaxed text-zinc-500">
            Automatic startup research from the open web, tuned to your goals. Ask Dexo anything — market, competitors, product, fundraising.
          </p>
        </header>

        {workflowSection}

        <div className="flex items-baseline justify-between gap-4 border-b border-zinc-800/60 py-4">
          <span className="text-[12px] text-zinc-500">
            {loadingList && !todayRow ? 'Loading…' : todayRow ? `Update · ${todayRow.reportDay}` : 'No briefing yet'}
          </span>
          <button
            type="button"
            onClick={() => void runPulse(true)}
            disabled={pulsing || !ventureId}
            className="inline-flex items-center gap-1.5 text-[13px] text-teal-500/90 hover:text-teal-400 disabled:opacity-40"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${pulsing ? 'animate-spin' : ''}`} aria-hidden />
            {pulsing ? 'Running research…' : 'Refresh briefing'}
          </button>
        </div>

        {proRequired && (
          <p className="mt-6 text-[14px] text-zinc-500">Daily web briefing is available on Co-Founder Pro.</p>
        )}
        {error && !proRequired && (
          <p className="mt-6 text-[14px] text-amber-400/80">{error}</p>
        )}

        {todayRow && parsed ? (
          <article className="mt-8">
            {(todayRow.headline || parsed.intro) && (
              <div className="space-y-4">
                {todayRow.headline && (
                  <h2 className="text-[1.35rem] font-normal leading-snug text-zinc-100">
                    {todayRow.headline}
                  </h2>
                )}
                {parsed.intro && (
                  <p className="text-[15px] leading-[1.75] text-zinc-400">{parsed.intro}</p>
                )}
              </div>
            )}

            <div className="mt-10 space-y-12">
              {parsed.sections.map((section, si) => (
                <div
                  key={`${si}-${section.title}-${section.isRisk ? 'risk' : 'std'}`}
                  className="border-b border-zinc-800/40 pb-10"
                >
                  <h3 className="text-[13px] font-medium uppercase tracking-[0.12em] text-zinc-500">
                    {section.isRisk ? 'Risks' : section.title}
                  </h3>
                  {section.bullets.length > 0 && (
                    <ul className="mt-4 space-y-3">
                      {section.bullets.map((b, i) => (
                        <li key={i} className="text-[15px] leading-relaxed text-zinc-300">
                          {b}
                        </li>
                      ))}
                    </ul>
                  )}
                  {section.move && (
                    <p className="mt-5 text-[14px] italic leading-relaxed text-zinc-500">
                      Move: {section.move}
                    </p>
                  )}
                </div>
              ))}
            </div>

            {parseFollowUp(todayRow.followUpJson).length > 0 && (
              <div className="mt-12 border-t border-zinc-800/40 pt-10">
                <p className="text-[12px] font-medium uppercase tracking-[0.14em] text-zinc-500">
                  Follow-ups
                </p>
                <ul className="mt-4 space-y-2">
                  {parseFollowUp(todayRow.followUpJson).map((q) => (
                    <li key={q} className="text-[14px] text-zinc-400">
                      {q}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {parseSources(todayRow.sourcesJson).length > 0 && (
              <div className="mt-12 border-t border-zinc-800/40 pt-10">
                <p className="text-[12px] font-medium uppercase tracking-[0.14em] text-zinc-500">
                  Sources
                </p>
                <ol className="mt-4 list-decimal space-y-2 pl-5 marker:text-zinc-600">
                  {parseSources(todayRow.sourcesJson).map((s) => (
                    <li key={s.url} className="text-[14px]">
                      <a
                        href={s.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-teal-500/90 hover:text-teal-400"
                      >
                        {s.title}
                      </a>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            <div className="mt-8 flex flex-wrap items-center gap-3 text-[12px] text-zinc-500">
              {todayRow.researchQuery && (
                <span className="inline-flex items-center gap-1">
                  <Globe className="h-3 w-3" aria-hidden />
                  Web pass
                </span>
              )}
              {todayRow.userApprovedAt && (
                <span className="inline-flex items-center gap-1 text-emerald-500/70">
                  <CheckCircle2 className="h-3 w-3" aria-hidden />
                  Applied to venture
                </span>
              )}
            </div>

            {hasPendingUpdates(todayRow.pendingProposedUpdates) && !todayRow.userApprovedAt && (
              <div className="mt-10 flex flex-col gap-3 border-t border-zinc-800/40 pt-8 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-[14px] text-zinc-400">{pendingHint ?? 'Dexo suggested venture updates.'}</p>
                <button
                  type="button"
                  disabled={applyId === todayRow.id}
                  onClick={() => void onApply(todayRow)}
                  className="shrink-0 text-[14px] text-teal-500/90 hover:text-teal-400 disabled:opacity-40"
                >
                  {applyId === todayRow.id ? 'Applying…' : 'Apply to venture'}
                </button>
              </div>
            )}
          </article>
        ) : !loadingList && !pulsing ? (
          <p className="mt-10 text-[15px] text-zinc-500">
            No briefing for today. Use “Refresh briefing” to run a web research pass.
          </p>
        ) : null}

        {reports.length > 1 && (
          <div className="mt-14 border-t border-zinc-800/40 pt-10">
            <p className="text-[12px] font-medium uppercase tracking-[0.14em] text-zinc-500">Earlier</p>
            <ul className="mt-4 space-y-2">
              {reports
                .filter((r) => r.id !== todayRow?.id)
                .slice(0, 10)
                .map((r) => (
                  <li key={r.id} className="flex gap-3 text-[13px] text-zinc-500">
                    <span className="shrink-0 tabular-nums text-zinc-600">{r.reportDay}</span>
                    <span className="min-w-0 truncate">{r.headline ?? r.summary?.slice(0, 120)}</span>
                  </li>
                ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );

  const chatColumn = (
    <div
      id="dexo-research-chat"
      className="flex min-h-0 flex-1 flex-col border-zinc-800/80 lg:border-l lg:pl-8"
    >
      <div className="shrink-0 border-b border-zinc-800/60 pb-4 lg:pt-1">
        <div className="flex items-center gap-3">
          <DexoAvatar size="sm" state="idle" pulse={false} />
          <div>
            <p className="text-[13px] font-medium text-zinc-200">Dexo</p>
            <p className="text-[12px] text-zinc-500">Research assistant — ask anything</p>
          </div>
        </div>
      </div>

      <div className="custom-scrollbar mt-4 min-h-0 flex-1 space-y-5 overflow-y-auto pr-1">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`max-w-[95%] text-[15px] leading-relaxed ${
              m.role === 'user' ? 'ml-auto text-right text-zinc-200' : 'text-zinc-400'
            }`}
          >
            {stripMdLight(m.text)}
          </div>
        ))}
        {chatLoading && (
          <div className="flex items-center gap-2 text-[13px] text-zinc-500">
            <DexoAvatar size="xs" state="thinking" pulse />
            <span>Dexo is thinking…</span>
          </div>
        )}
        <div ref={chatAnchorRef} />
      </div>

      {chatError && <p className="mt-2 text-[13px] text-amber-400/80">{chatError}</p>}

      <div className="mt-4 shrink-0 border-t border-zinc-800/60 pt-4">
        <div className="flex items-end gap-2">
          <textarea
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                void sendMessage();
              }
            }}
            placeholder="Ask Dexo anything…"
            rows={2}
            disabled={chatLoading || !activeProject}
            className="min-h-[44px] flex-1 resize-none bg-transparent text-[15px] text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-0 disabled:opacity-50"
          />
          <button
            type="button"
            onClick={() => void sendMessage()}
            disabled={chatLoading || !chatInput.trim() || !activeProject}
            className="mb-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-teal-500 transition hover:bg-zinc-900 disabled:opacity-40"
            aria-label="Send"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );

  if (!activeProject) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 px-6 py-16">
        <Globe className="h-6 w-6 text-zinc-600" strokeWidth={1.25} aria-hidden />
        <p className="max-w-sm text-center text-[14px] text-zinc-500">
          Select a venture to open the research studio — daily briefings and chat are saved per startup.
        </p>
      </div>
    );
  }

  return (
    <div
      className="relative flex min-h-0 w-full flex-1 flex-col bg-[#0c0c0e] text-zinc-100"
    >
      <div className="flex shrink-0 gap-1 border-b border-zinc-800/60 px-4 py-2 lg:hidden">
        {(['brief', 'chat'] as const).map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setMobilePane(p)}
            className={`flex-1 rounded-md py-2 text-[13px] font-medium ${
              mobilePane === p ? 'bg-zinc-100 text-zinc-900' : 'text-zinc-500'
            }`}
          >
            {p === 'brief' ? 'Research' : 'Dexo chat'}
          </button>
        ))}
      </div>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row lg:gap-4 lg:px-10 lg:pt-2">
        <div
          className={`min-h-0 flex-1 lg:max-w-[min(52%,640px)] ${mobilePane === 'brief' ? 'flex' : 'hidden lg:flex'}`}
        >
          {briefColumn}
        </div>
        <div
          className={`min-h-0 flex-1 ${mobilePane === 'chat' ? 'flex' : 'hidden lg:flex'} lg:min-w-[340px]`}
        >
          {chatColumn}
        </div>
      </div>

      {!embedded && (
        <button
          type="button"
          className="fixed bottom-6 right-6 z-[25] flex h-[64px] w-[64px] cursor-pointer items-center justify-center overflow-hidden rounded-full border border-zinc-700/50 bg-zinc-950 shadow-[0_8px_40px_rgba(0,0,0,0.45)] transition hover:border-zinc-600"
          style={{ WebkitTapHighlightColor: 'transparent' }}
          aria-label="Jump to Dexo chat"
          onClick={() => {
            setOrbActive(true);
            setMobilePane('chat');
            window.setTimeout(() => {
              document.getElementById('dexo-research-chat')?.scrollIntoView({ behavior: 'smooth' });
              window.setTimeout(() => setOrbActive(false), 1200);
            }, 50);
          }}
        >
          <DexoParticleCanvas mode="floating" size={60} active={orbActive} />
        </button>
      )}
    </div>
  );
}
