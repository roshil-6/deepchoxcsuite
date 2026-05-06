'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  RefreshCw,
  Globe,
  CheckCircle2,
  Send,
  Sparkles,
  Zap,
  Target,
  Clock,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  TrendingUp,
  Code2,
  DollarSign,
  Megaphone,
  ArrowRight,
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

const SECTION_COLORS = {
  market: { bg: 'from-cyan-500/10 to-blue-500/10', border: 'border-cyan-500/20', text: 'text-cyan-400', icon: TrendingUp },
  product: { bg: 'from-violet-500/10 to-purple-500/10', border: 'border-violet-500/20', text: 'text-violet-400', icon: Code2 },
  fundraising: { bg: 'from-emerald-500/10 to-teal-500/10', border: 'border-emerald-500/20', text: 'text-emerald-400', icon: DollarSign },
  ops: { bg: 'from-amber-500/10 to-orange-500/10', border: 'border-amber-500/20', text: 'text-amber-400', icon: Zap },
  narrative: { bg: 'from-rose-500/10 to-pink-500/10', border: 'border-rose-500/20', text: 'text-rose-400', icon: Megaphone },
  risk: { bg: 'from-red-500/10 to-orange-500/10', border: 'border-red-500/20', text: 'text-red-400', icon: Target },
  default: { bg: 'from-zinc-500/10 to-zinc-600/10', border: 'border-zinc-500/20', text: 'text-zinc-400', icon: Lightbulb },
};

function getSectionStyle(title: string, isRisk?: boolean) {
  if (isRisk) return SECTION_COLORS.risk;
  const t = title.toLowerCase();
  if (t.includes('market') || t.includes('competitor')) return SECTION_COLORS.market;
  if (t.includes('product') || t.includes('build') || t.includes('roadmap')) return SECTION_COLORS.product;
  if (t.includes('fundraising') || t.includes('finance') || t.includes('capital') || t.includes('runway')) return SECTION_COLORS.fundraising;
  if (t.includes('ops') || t.includes('execution') || t.includes('team') || t.includes('hiring')) return SECTION_COLORS.ops;
  if (t.includes('narrative') || t.includes('brand') || t.includes('story') || t.includes('gtm')) return SECTION_COLORS.narrative;
  return SECTION_COLORS.default;
}

export function DexoResearchRoom({ embedded }: { embedded?: boolean }) {
  const { activeProject, updateProjectField } = useOffice();
  const tokens = useTokens();
  useChatCost();
  const upgradeModal = useUpgradeModal();

  const [mobilePane, setMobilePane] = useState<MobilePane>('brief');
  const [showSettings, setShowSettings] = useState(false);
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
        text: `Hey! I'm your research partner. I scan the web daily and synthesize what matters for ${activeProject?.name || 'your startup'}. Ask me anything — competitor moves, market shifts, or what to build next.`,
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

  const enabledLanesCount = Object.values(workflowPrefs.lanesEnabled).filter(Boolean).length;

  if (!activeProject) {
    return (
      <div className="flex min-h-[60vh] flex-1 flex-col items-center justify-center gap-6 px-6">
        <div className="relative">
          <div className="absolute -inset-4 rounded-full bg-gradient-to-r from-cyan-500/20 to-violet-500/20 blur-2xl" />
          <Globe className="relative h-12 w-12 text-zinc-500" strokeWidth={1} />
        </div>
        <div className="text-center">
          <p className="text-xl font-light text-zinc-300">Research Studio</p>
          <p className="mt-2 max-w-sm text-[15px] text-zinc-500">
            Select a venture to unlock daily web briefings and AI research assistance
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-0 w-full flex-1 flex-col bg-gradient-to-br from-[#0a0a0c] via-[#0c0c0f] to-[#0a0a0c] text-zinc-100">
      {/* Animated background particles */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-1/4 -top-1/4 h-[600px] w-[600px] rounded-full bg-cyan-500/5 blur-[120px]" />
        <div className="absolute -bottom-1/4 -right-1/4 h-[600px] w-[600px] rounded-full bg-violet-500/5 blur-[120px]" />
      </div>

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between border-b border-white/5 px-6 py-4 lg:px-10">
        <div className="flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-600/20">
            <Sparkles className="h-5 w-5 text-cyan-400" />
          </div>
          <div>
            <h1 className="text-lg font-medium text-white">{activeProject.name}</h1>
            <p className="text-[13px] text-zinc-500">
              {todayRow ? `Last updated ${todayRow.reportDay}` : 'Ready for research'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowSettings((s) => !s)}
            className={`flex items-center gap-2 rounded-lg px-3 py-2 text-[13px] transition-all ${
              showSettings ? 'bg-white/10 text-white' : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-300'
            }`}
          >
            <span className="hidden sm:inline">Settings</span>
            {showSettings ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          <button
            type="button"
            onClick={() => void runPulse(true)}
            disabled={pulsing || !ventureId}
            className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-cyan-500/20 to-blue-500/20 px-4 py-2 text-[13px] font-medium text-cyan-300 transition-all hover:from-cyan-500/30 hover:to-blue-500/30 disabled:opacity-40"
          >
            <RefreshCw className={`h-4 w-4 ${pulsing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{pulsing ? 'Researching...' : 'Run Briefing'}</span>
          </button>
        </div>
      </header>

      {/* Settings Panel */}
      {showSettings && (
        <div className="relative z-10 border-b border-white/5 bg-white/[0.02] px-6 py-6 lg:px-10">
          <div className="mx-auto max-w-4xl space-y-6">
            <div>
              <label className="mb-2 block text-[13px] font-medium text-zinc-400">
                What should Dexo prioritize in research?
              </label>
              <textarea
                value={workflowPrefs.interestNotes}
                onChange={(e) => commitWorkflow((p) => ({ ...p, interestNotes: e.target.value }))}
                placeholder="E.g., worried about XYZ competitor, planning fundraise in Q2, launching mobile app..."
                rows={2}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-[14px] text-zinc-200 placeholder:text-zinc-600 focus:border-cyan-500/50 focus:outline-none focus:ring-0"
              />
            </div>
            <div className="flex flex-wrap items-center gap-6">
              <label className="flex cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  checked={workflowPrefs.autoBriefing}
                  onChange={(e) => commitWorkflow((p) => ({ ...p, autoBriefing: e.target.checked }))}
                  className="h-4 w-4 rounded border-white/20 bg-white/5 text-cyan-500 focus:ring-0 focus:ring-offset-0"
                />
                <span className="text-[13px] text-zinc-300">Auto-run daily</span>
              </label>
              <div className="flex items-center gap-3">
                <Clock className="h-4 w-4 text-zinc-500" />
                <select
                  value={workflowPrefs.cadence}
                  onChange={(e) =>
                    commitWorkflow((p) => ({
                      ...p,
                      cadence: e.target.value as ResearchWorkflowPrefs['cadence'],
                    }))
                  }
                  className="rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-[13px] text-zinc-300 focus:border-cyan-500/50 focus:outline-none"
                >
                  <option value="daily">Every day</option>
                  <option value="weekdays">Weekdays only</option>
                  <option value="manual">Manual only</option>
                </select>
              </div>
              <div className="ml-auto flex items-center gap-2">
                <span className="text-[12px] text-zinc-500">
                  {enabledLanesCount}/5 topics enabled
                </span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  { id: 'market', label: 'Market Intel', icon: TrendingUp },
                  { id: 'product', label: 'Product', icon: Code2 },
                  { id: 'fundraising', label: 'Fundraising', icon: DollarSign },
                  { id: 'ops', label: 'Execution', icon: Zap },
                  { id: 'narrative', label: 'Narrative', icon: Megaphone },
                ] as { id: import('@/lib/researchWorkflowPrefs').ResearchLaneId; label: string; icon: typeof TrendingUp }[]
              ).map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() =>
                    commitWorkflow((p) => ({
                      ...p,
                      lanesEnabled: { ...p.lanesEnabled, [id]: !p.lanesEnabled[id] },
                    }))
                  }
                  className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-[12px] transition-all ${
                    workflowPrefs.lanesEnabled[id]
                      ? 'border-cyan-500/30 bg-cyan-500/10 text-cyan-300'
                      : 'border-white/10 bg-white/5 text-zinc-500 hover:border-white/20 hover:text-zinc-400'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Error/Pro states */}
      {proRequired && (
        <div className="relative z-10 mx-6 my-4 rounded-lg border border-amber-500/20 bg-amber-500/10 px-4 py-3 lg:mx-10">
          <p className="text-[14px] text-amber-300">Daily web briefings are a Pro feature. Upgrade to unlock.</p>
        </div>
      )}
      {error && !proRequired && (
        <div className="relative z-10 mx-6 my-4 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 lg:mx-10">
          <p className="text-[14px] text-red-300">{error}</p>
        </div>
      )}

      {/* Main Content */}
      <div className="relative z-10 flex flex-1 flex-col lg:flex-row lg:overflow-hidden">
        {/* Left: Briefing */}
        <div className={`flex-1 overflow-y-auto px-6 py-6 lg:px-10 ${mobilePane === 'brief' ? 'block' : 'hidden lg:block'}`}>
          {loadingList && !todayRow ? (
            <div className="flex h-40 items-center justify-center gap-3 text-zinc-500">
              <RefreshCw className="h-5 w-5 animate-spin" />
              <span className="text-[15px]">Loading your briefing...</span>
            </div>
          ) : todayRow && parsed ? (
            <div className="mx-auto max-w-3xl space-y-8">
              {/* Hero Card */}
              <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.05] to-transparent p-6 lg:p-8">
                <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-cyan-500/20 blur-3xl" />
                <div className="relative">
                  <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-[12px] text-cyan-300">
                    <Globe className="h-3.5 w-3.5" />
                    Web briefing · {todayRow.reportDay}
                  </div>
                  {todayRow.headline && (
                    <h2 className="text-[1.75rem] font-light leading-tight text-white lg:text-[2rem]">
                      {todayRow.headline}
                    </h2>
                  )}
                  {parsed.intro && (
                    <p className="mt-4 text-[16px] leading-relaxed text-zinc-400">{parsed.intro}</p>
                  )}
                </div>
              </div>

              {/* Sections */}
              <div className="space-y-4">
                {parsed.sections.map((section, si) => {
                  const style = getSectionStyle(section.title, section.isRisk);
                  const Icon = style.icon;
                  return (
                    <div
                      key={`${si}-${section.title}`}
                      className={`group relative overflow-hidden rounded-xl border ${style.border} bg-gradient-to-br ${style.bg} p-5 transition-all hover:border-opacity-40`}
                    >
                      <div className="flex items-start gap-4">
                        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/5 ${style.text}`}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className={`text-[14px] font-semibold uppercase tracking-wide ${style.text}`}>
                            {section.isRisk ? 'Key Risks' : section.title}
                          </h3>
                          {section.bullets.length > 0 && (
                            <ul className="mt-3 space-y-2">
                              {section.bullets.map((b, i) => (
                                <li key={i} className="flex gap-3 text-[15px] leading-relaxed text-zinc-300">
                                  <span className={`mt-2 h-1.5 w-1.5 shrink-0 rounded-full ${style.text.replace('text-', 'bg-')}`} />
                                  <span className="flex-1">{b}</span>
                                </li>
                              ))}
                            </ul>
                          )}
                          {section.move && (
                            <div className="mt-4 flex items-start gap-2 rounded-lg border border-white/10 bg-white/5 p-3">
                              <ArrowRight className={`mt-0.5 h-4 w-4 shrink-0 ${style.text}`} />
                              <p className="text-[14px] font-medium text-zinc-300">{section.move}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Follow-ups */}
              {parseFollowUp(todayRow.followUpJson).length > 0 && (
                <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
                  <h3 className="mb-4 flex items-center gap-2 text-[13px] font-semibold uppercase tracking-wide text-zinc-400">
                    <Lightbulb className="h-4 w-4" />
                    Questions to Consider
                  </h3>
                  <div className="space-y-3">
                    {parseFollowUp(todayRow.followUpJson).map((q, i) => (
                      <div
                        key={i}
                        className="group flex cursor-pointer items-start gap-3 rounded-lg p-3 transition-all hover:bg-white/5"
                        onClick={() => {
                          setChatInput(q);
                          setMobilePane('chat');
                        }}
                      >
                        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-gradient-to-r from-cyan-500 to-violet-500" />
                        <span className="flex-1 text-[15px] leading-relaxed text-zinc-400 group-hover:text-zinc-300">
                          {q}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Sources */}
              {parseSources(todayRow.sourcesJson).length > 0 && (
                <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
                  <h3 className="mb-4 text-[13px] font-semibold uppercase tracking-wide text-zinc-500">Sources</h3>
                  <div className="space-y-2">
                    {parseSources(todayRow.sourcesJson).map((s, i) => (
                      <a
                        key={s.url}
                        href={s.url}
                        target="_blank"
                        rel="noreferrer"
                        className="group flex items-center gap-3 rounded-lg p-2 transition-all hover:bg-white/5"
                      >
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-white/10 text-[11px] font-medium text-zinc-500">
                          {i + 1}
                        </span>
                        <span className="flex-1 truncate text-[14px] text-zinc-400 group-hover:text-cyan-400">
                          {s.title}
                        </span>
                        <Globe className="h-4 w-4 text-zinc-600 group-hover:text-zinc-500" />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Apply Updates */}
              {hasPendingUpdates(todayRow.pendingProposedUpdates) && !todayRow.userApprovedAt && (
                <div className="flex items-center justify-between gap-4 rounded-xl border border-cyan-500/20 bg-gradient-to-r from-cyan-500/10 to-transparent p-5">
                  <div>
                    <p className="text-[14px] font-medium text-cyan-300">Suggested updates ready</p>
                    <p className="mt-1 text-[13px] text-zinc-400">{pendingHint}</p>
                  </div>
                  <button
                    type="button"
                    disabled={applyId === todayRow.id}
                    onClick={() => void onApply(todayRow)}
                    className="shrink-0 rounded-lg bg-cyan-500/20 px-4 py-2 text-[14px] font-medium text-cyan-300 transition-all hover:bg-cyan-500/30 disabled:opacity-40"
                  >
                    {applyId === todayRow.id ? 'Applying...' : 'Apply'}
                  </button>
                </div>
              )}

              {/* Applied badge */}
              {todayRow.userApprovedAt && (
                <div className="flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-emerald-400">
                  <CheckCircle2 className="h-4 w-4" />
                  <span className="text-[14px]">Updates applied to your venture</span>
                </div>
              )}

              {/* Earlier Reports */}
              {reports.length > 1 && (
                <div className="pt-4">
                  <h3 className="mb-4 text-[13px] font-semibold uppercase tracking-wide text-zinc-500">Earlier Briefings</h3>
                  <div className="space-y-2">
                    {reports
                      .filter((r) => r.id !== todayRow?.id)
                      .slice(0, 5)
                      .map((r) => (
                        <div
                          key={r.id}
                          className="flex items-center gap-4 rounded-lg border border-white/5 bg-white/[0.02] p-3 transition-all hover:border-white/10 hover:bg-white/[0.04]"
                        >
                          <span className="text-[12px] tabular-nums text-zinc-600">{r.reportDay}</span>
                          <span className="flex-1 truncate text-[14px] text-zinc-400">
                            {r.headline ?? r.summary?.slice(0, 100)}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex h-60 flex-col items-center justify-center gap-4 text-center">
              <div className="relative">
                <div className="absolute -inset-4 rounded-full bg-cyan-500/10 blur-xl" />
                <Sparkles className="relative h-10 w-10 text-zinc-600" />
              </div>
              <p className="text-[16px] text-zinc-400">No briefing yet</p>
              <p className="max-w-sm text-[14px] text-zinc-500">
                Click "Run Briefing" above to start your first automated web research pass
              </p>
            </div>
          )}
        </div>

        {/* Right: Chat */}
        <div
          id="dexo-research-chat"
          className={`flex flex-col border-t border-white/10 bg-[#08080a]/80 backdrop-blur-sm lg:w-[420px] lg:border-t-0 lg:border-l ${mobilePane === 'chat' ? 'flex-1' : 'hidden lg:flex'}`}
        >
          {/* Chat Header */}
          <div className="flex items-center gap-3 border-b border-white/10 px-4 py-4">
            <DexoAvatar size="sm" state="idle" pulse={chatLoading} />
            <div>
              <p className="text-[15px] font-medium text-white">Dexo</p>
              <p className="text-[12px] text-zinc-500">Ask anything about your research</p>
            </div>
          </div>

          {/* Messages */}
          <div className="custom-scrollbar flex-1 space-y-4 overflow-y-auto p-4">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[90%] rounded-2xl px-4 py-3 text-[15px] leading-relaxed ${
                    m.role === 'user'
                      ? 'bg-gradient-to-br from-cyan-600/30 to-blue-600/20 text-white'
                      : 'border border-white/10 bg-white/[0.05] text-zinc-300'
                  }`}
                >
                  {stripMdLight(m.text)}
                </div>
              </div>
            ))}
            {chatLoading && (
              <div className="flex justify-start">
                <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3">
                  <DexoAvatar size="xs" state="thinking" pulse />
                  <span className="text-[14px] text-zinc-500">Researching...</span>
                </div>
              </div>
            )}
            <div ref={chatAnchorRef} />
          </div>

          {/* Chat Input */}
          <div className="border-t border-white/10 p-4">
            {chatError && (
              <p className="mb-2 text-[13px] text-red-400">{chatError}</p>
            )}
            <div className="flex items-end gap-2 rounded-xl border border-white/10 bg-white/[0.05] p-2 focus-within:border-cyan-500/30">
              <textarea
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    void sendMessage();
                  }
                }}
                placeholder="Ask about competitors, market trends, strategy..."
                rows={1}
                disabled={chatLoading}
                className="max-h-32 flex-1 resize-none bg-transparent px-2 py-2 text-[15px] text-white placeholder:text-zinc-600 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => void sendMessage()}
                disabled={chatLoading || !chatInput.trim()}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-cyan-500/20 text-cyan-300 transition-all hover:bg-cyan-500/30 disabled:opacity-40"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Toggle */}
      <div className="fixed bottom-6 left-1/2 z-20 flex -translate-x-1/2 gap-1 rounded-full border border-white/10 bg-zinc-900/90 p-1 backdrop-blur lg:hidden">
        <button
          type="button"
          onClick={() => setMobilePane('brief')}
          className={`rounded-full px-4 py-2 text-[13px] font-medium transition-all ${
            mobilePane === 'brief' ? 'bg-white/10 text-white' : 'text-zinc-500'
          }`}
        >
          Briefing
        </button>
        <button
          type="button"
          onClick={() => setMobilePane('chat')}
          className={`rounded-full px-4 py-2 text-[13px] font-medium transition-all ${
            mobilePane === 'chat' ? 'bg-white/10 text-white' : 'text-zinc-500'
          }`}
        >
          Chat
        </button>
      </div>

      {/* Floating FAB (desktop only) */}
      {!embedded && (
        <button
          type="button"
          className="fixed bottom-6 right-6 z-30 hidden h-14 w-14 items-center justify-center overflow-hidden rounded-full border border-white/20 bg-gradient-to-br from-cyan-500/20 to-violet-500/20 shadow-2xl backdrop-blur-sm transition-all hover:scale-105 hover:border-cyan-500/40 lg:flex"
          onClick={() => {
            setOrbActive(true);
            setMobilePane('chat');
            document.getElementById('dexo-research-chat')?.scrollIntoView({ behavior: 'smooth' });
            setTimeout(() => setOrbActive(false), 1000);
          }}
        >
          <DexoParticleCanvas mode="floating" size={52} active={orbActive} />
        </button>
      )}
    </div>
  );
}
