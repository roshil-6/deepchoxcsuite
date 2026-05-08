'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { RefreshCw, Globe, CheckCircle2, Send, Settings2, X, Sparkles, Search, ArrowRight, Clock, MoreHorizontal, Hash, FileText, ExternalLink, ChevronRight, Plus } from 'lucide-react';
import { useOffice } from '@/lib/OfficeContext';
import { buildDexoJarvisVentureContext, DEXO_PRE_VENTURE_CONTEXT } from '@/lib/dexoJarvisContext';
import { isVentureFoundationSparse } from '@/lib/ventureFoundation';
import { getEffectiveSessionId } from '@/lib/deviceSession';
import type { VentureDailyReportRow } from '@/lib/dexoDailyBriefTypes';
import { parseBodyMd, parseSources, parseFollowUp, hasPendingUpdates } from '@/lib/dexoDailyBriefParse';
import { loadResearchWorkflowPrefs, saveResearchWorkflowPrefs, shouldAutoRunBriefingNow, appendBriefingPreferencesToContext, type ResearchWorkflowPrefs, DEFAULT_RESEARCH_WORKFLOW } from '@/lib/researchWorkflowPrefs';
import { dexoFullVenturePatchFromJarvis, dexoAutoSaveHintLines } from '@/lib/dexoApplyJarvisProductPatch';
import { useTokens, useChatCost } from '@/lib/tokens/useTokens';
import { TOKEN_COSTS } from '@/lib/tokens/tokenSystem';
import { useUpgradeModal } from '@/components/tokens/UpgradeModal';
import type { JarvisReport } from '@/app/api/jarvis/route';

function todayUtcDay(): string {
  return new Date().toISOString().slice(0, 10);
}

function stripMd(s: string): string {
  return s.replace(/\*\*([^*]+)\*\*/g, '$1').replace(/\*([^*]+)\*/g, '$1');
}

type Msg = { id: number; role: 'user' | 'dexo'; text: string };

function loadMsgs(vid: number): Msg[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(`dexo-rs:${vid}`);
    if (!raw) return [];
    const p = JSON.parse(raw) as unknown;
    if (!Array.isArray(p)) return [];
    return p.filter((x: unknown) => x && typeof x === 'object' && (x as Msg).role && (x as Msg).text).slice(-80) as Msg[];
  } catch { return []; }
}
function saveMsgs(vid: number, msgs: Msg[]) {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(`dexo-rs:${vid}`, JSON.stringify(msgs.slice(-80))); } catch {}
}

export function DexoResearchRoom({ embedded }: { embedded?: boolean }) {
  const { activeProject, updateProjectField } = useOffice();
  const tokens = useTokens();
  useChatCost();
  const upgradeModal = useUpgradeModal();

  const [prefs, setPrefs] = useState<ResearchWorkflowPrefs>({ ...DEFAULT_RESEARCH_WORKFLOW, lanesEnabled: { ...DEFAULT_RESEARCH_WORKFLOW.lanesEnabled } });
  const [prefsOpen, setPrefsOpen] = useState(false);
  const [reports, setReports] = useState<VentureDailyReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [applyId, setApplyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [proRequired, setProRequired] = useState(false);
  const [pulseAttempted, setPulseAttempted] = useState(false);
  const [view, setView] = useState<'brief' | 'chat'>('brief');
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const idRef = useRef(1);
  const bottomRef = useRef<HTMLDivElement>(null);
  const vid = activeProject?.id;
  const day = todayUtcDay();

  useEffect(() => {
    if (!vid) return;
    setPulseAttempted(false);
    setPrefs(loadResearchWorkflowPrefs(vid));
    const stored = loadMsgs(vid);
    if (stored.length === 0) {
      const welcome: Msg = { id: 1, role: 'dexo', text: `I'm your research partner for ${activeProject?.name || 'this venture'}. I scan markets, competitors, and trends daily. Ask me anything or review your briefing below.` };
      idRef.current = 2;
      setMsgs([welcome]);
      saveMsgs(vid, [welcome]);
    } else {
      setMsgs(stored);
      idRef.current = stored.reduce((m, x) => Math.max(m, x.id), 0) + 1;
    }
  }, [vid, activeProject?.name]);

  useEffect(() => { if (vid) saveMsgs(vid, msgs); }, [vid, msgs]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs, typing]);

  const commit = useCallback((fn: (p: ResearchWorkflowPrefs) => ResearchWorkflowPrefs) => {
    setPrefs(p => { const n = fn(p); if (vid) saveResearchWorkflowPrefs(vid, n); return n; });
  }, [vid]);

  const load = useCallback(async () => {
    if (!vid) return;
    setLoading(true); setError(null);
    try {
      const r = await fetch('/api/dexo', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-deepchox-session': getEffectiveSessionId() }, body: JSON.stringify({ action: 'dailyReportsList', payload: { ventureId: vid, limit: 30 } }) });
      const d = await r.json() as { ok?: boolean; reports?: VentureDailyReportRow[] };
      if (!d.ok || !Array.isArray(d.reports)) { setError('Failed to load'); setReports([]); }
      else setReports(d.reports);
    } catch { setError('Network error'); setReports([]); }
    finally { setLoading(false); }
  }, [vid]);

  useEffect(() => { void load(); }, [load]);

  const runPulse = useCallback(async (force: boolean) => {
    if (!activeProject?.id) return;
    setRunning(true); setError(null); setProRequired(false);
    try {
      const ctx = appendBriefingPreferencesToContext(buildDexoJarvisVentureContext(activeProject), prefs);
      const r = await fetch('/api/dexo', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-deepchox-session': getEffectiveSessionId() }, body: JSON.stringify({ action: 'dailyPulse', payload: { ventureId: activeProject.id, reportDay: day, context: ctx, sparseContext: isVentureFoundationSparse(activeProject), force } }) });
      const d = await r.json() as { ok?: boolean; error?: string; upgrade?: boolean; message?: string };
      if (!d.ok) { if (d.error === 'pro_required' || d.upgrade) setProRequired(true); else setError(d.message || 'Failed'); return; }
      await load();
    } catch { setError('Failed'); } finally { setRunning(false); }
  }, [activeProject, day, load, prefs]);

  useEffect(() => {
    if (!activeProject?.id || !vid || loading || pulseAttempted) return;
    if (!shouldAutoRunBriefingNow(prefs)) { setPulseAttempted(true); return; }
    if (!reports.some(r => r.reportDay === day)) { setPulseAttempted(true); void runPulse(false); } else setPulseAttempted(true);
  }, [activeProject?.id, vid, loading, pulseAttempted, reports, day, runPulse, prefs]);

  const today = reports.find(r => r.reportDay === day) ?? reports[0];
  const parsed = today ? parseBodyMd(today.bodyMd || today.summary) : null;

  const apply = async (row: VentureDailyReportRow) => {
    if (!activeProject || !hasPendingUpdates(row.pendingProposedUpdates)) return;
    setApplyId(row.id);
    try {
      const patch = dexoFullVenturePatchFromJarvis(activeProject, row.pendingProposedUpdates);
      (Object.entries(patch) as [keyof typeof patch, unknown][]).forEach(([k, v]) => { if (v !== undefined) void updateProjectField(k, v); });
      await fetch('/api/dexo', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-deepchox-session': getEffectiveSessionId() }, body: JSON.stringify({ action: 'dailyReportApply', payload: { reportId: row.id, ventureId: row.ventureId } }) });
      await load();
    } finally { setApplyId(null); }
  };

  const send = useCallback(async () => {
    const t = input.trim();
    if (!t || typing || !activeProject) return;
    const tr = tokens.spend(TOKEN_COSTS.CHAT_MESSAGE, 'Chat');
    if (!tr.success) { setChatError(tr.message || 'No tokens'); upgradeModal.open(tr.message); return; }
    setInput(''); setChatError(null);
    const uid = idRef.current++;
    setMsgs(m => [...m, { role: 'user', text: t, id: uid }]);
    setTyping(true);
    try {
      let ctx = buildDexoJarvisVentureContext(activeProject);
      if (!ctx) ctx = DEXO_PRE_VENTURE_CONTEXT;
      ctx = appendBriefingPreferencesToContext(ctx, prefs);
      const r = await fetch('/api/dexo', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'jarvis', payload: { mode: 'converse', context: ctx, sparseContext: isVentureFoundationSparse(activeProject), userMessage: t, conversationHistory: msgs.slice(-10).map(x => ({ role: x.role, text: x.text })) } }) });
      const d = await r.json() as { ok: boolean; report?: JarvisReport; error?: string };
      if (!d.ok || !d.report) { setChatError(d.error || 'No reply'); return; }
      const reply = d.report.voiceResponse?.trim() || d.report.summary?.trim() || '…';
      setMsgs(m => [...m, { role: 'dexo', text: reply, id: idRef.current++ }]);
    } catch (e) { setChatError('Failed'); } finally { setTyping(false); }
  }, [activeProject, input, typing, msgs, prefs, tokens, upgradeModal]);

  const pendingHint = today && activeProject && hasPendingUpdates(today.pendingProposedUpdates) ? dexoAutoSaveHintLines(dexoFullVenturePatchFromJarvis(activeProject, today.pendingProposedUpdates)).join(' · ') : null;

  if (!activeProject) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-900/50">
            <Search className="h-6 w-6 text-zinc-600" />
          </div>
          <p className="text-lg font-medium text-zinc-400">Research Studio</p>
          <p className="mt-1 text-sm text-zinc-600">Select a venture to begin</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-[#0a0a0c]">
      {/* Header */}
      <header className="flex shrink-0 items-center justify-between border-b border-white/[0.06] bg-[#0a0a0c]/80 px-5 py-3 backdrop-blur">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-zinc-800 to-zinc-900">
            <Sparkles className="h-4 w-4 text-zinc-400" />
          </div>
          <div>
            <h1 className="text-[15px] font-medium text-zinc-200">{activeProject.name}</h1>
            <p className="text-[12px] text-zinc-600">Research Assistant</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setPrefsOpen(p => !p)} className="rounded-lg p-2 text-zinc-500 transition hover:bg-white/[0.04] hover:text-zinc-300">
            <Settings2 className="h-4 w-4" />
          </button>
          <button disabled={running || !vid} onClick={() => void runPulse(true)} className="flex items-center gap-2 rounded-lg bg-zinc-100 px-3 py-1.5 text-[13px] font-medium text-black hover:bg-white disabled:opacity-30">
            <RefreshCw className={`h-3.5 w-3.5 ${running ? 'animate-spin' : ''}`} />
            {running ? 'Scanning...' : 'Run Briefing'}
          </button>
        </div>
      </header>

      {/* Settings */}
      {prefsOpen && (
        <div className="shrink-0 border-b border-white/[0.06] bg-[#0f0f12] px-5 py-4">
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-medium text-zinc-400">Preferences</span>
            <button onClick={() => setPrefsOpen(false)} className="text-zinc-600 hover:text-zinc-400"><X className="h-4 w-4" /></button>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-[12px] text-zinc-600">Research Focus</label>
              <input value={prefs.interestNotes} onChange={e => commit(p => ({ ...p, interestNotes: e.target.value }))} placeholder="Competitors, markets, timing..." className="w-full rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-[14px] text-zinc-300 placeholder:text-zinc-700 focus:border-zinc-700 focus:outline-none" />
            </div>
            <div className="flex items-end gap-3">
              <select value={prefs.cadence} onChange={e => commit(p => ({ ...p, cadence: e.target.value as any }))} className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-[14px] text-zinc-400 focus:outline-none">
                <option value="daily">Daily</option>
                <option value="weekdays">Weekdays</option>
                <option value="manual">Manual</option>
              </select>
              <label className="flex items-center gap-2 text-[13px] text-zinc-500">
                <input type="checkbox" checked={prefs.autoBriefing} onChange={e => commit(p => ({ ...p, autoBriefing: e.target.checked }))} className="rounded border-white/[0.15] bg-transparent" />
                Auto-run
              </label>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {(['market', 'product', 'fundraising', 'ops', 'narrative'] as const).map(l => (
              <button key={l} onClick={() => commit(p => ({ ...p, lanesEnabled: { ...p.lanesEnabled, [l]: !p.lanesEnabled[l] } }))} className={`rounded-md border px-2.5 py-1 text-[12px] ${prefs.lanesEnabled[l] ? 'border-zinc-600 bg-zinc-800 text-zinc-300' : 'border-white/[0.06] text-zinc-600 hover:border-zinc-800'}`}>
                {l}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Status */}
      {proRequired && <div className="mx-5 my-3 rounded-lg border border-amber-500/20 bg-amber-500/10 px-4 py-2.5 text-[13px] text-amber-400">Pro required for daily briefings</div>}
      {error && <div className="mx-5 my-3 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-2.5 text-[13px] text-red-400">{error}</div>}

      {/* Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Briefing */}
        <div className={`flex-1 overflow-y-auto px-5 py-4 ${view === 'brief' ? 'block' : 'hidden lg:block'}`}>
          {loading && !today ? (
            <div className="flex h-40 items-center justify-center gap-2 text-zinc-600">
              <RefreshCw className="h-5 w-5 animate-spin" />
              <span>Loading briefing...</span>
            </div>
          ) : today && parsed ? (
            <div className="mx-auto max-w-2xl">
              {/* Meta */}
              <div className="mb-6 flex items-center gap-2 text-[12px] text-zinc-600">
                <Globe className="h-3.5 w-3.5" />
                <span>Web briefing</span>
                <span className="text-zinc-700">·</span>
                <span>{today.reportDay}</span>
              </div>

              {/* Title */}
              {today.headline && <h2 className="mb-4 text-[22px] font-medium leading-snug text-zinc-200">{today.headline}</h2>}
              {parsed.intro && <p className="mb-8 text-[15px] leading-relaxed text-zinc-500">{parsed.intro}</p>}

              {/* Sections */}
              <div className="space-y-3">
                {parsed.sections.map((s, i) => (
                  <div key={i} className="group rounded-lg border border-white/[0.04] bg-white/[0.02] p-4 transition hover:border-white/[0.08]">
                    <div className="mb-3 flex items-center gap-2 text-[13px] font-medium text-zinc-400">
                      <Hash className="h-3.5 w-3.5 text-zinc-700" />
                      {s.isRisk ? 'Risk' : s.title}
                    </div>
                    <ul className="space-y-2">
                      {s.bullets.map((b, j) => (
                        <li key={j} className="flex gap-3 text-[14px] leading-relaxed text-zinc-500">
                          <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-zinc-700" />
                          {b}
                        </li>
                      ))}
                    </ul>
                    {s.move && (
                      <div className="mt-3 flex items-start gap-2 rounded-md bg-zinc-900/50 p-3">
                        <ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-zinc-600" />
                        <span className="text-[13px] text-zinc-400">{s.move}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Follow-ups */}
              {parseFollowUp(today.followUpJson).length > 0 && (
                <div className="mt-6 rounded-lg border border-white/[0.04] bg-white/[0.02] p-4">
                  <div className="mb-3 flex items-center gap-2 text-[12px] text-zinc-600">
                    <MoreHorizontal className="h-3.5 w-3.5" />
                    Follow-ups
                  </div>
                  <div className="space-y-1">
                    {parseFollowUp(today.followUpJson).map((q, i) => (
                      <button key={i} onClick={() => { setInput(q); setView('chat'); }} className="w-full">
                        <div className="flex items-start gap-3 rounded-md p-2 text-left text-[14px] text-zinc-500 transition hover:bg-white/[0.03]">
                          <ChevronRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-zinc-700" />
                          {q}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Sources */}
              {parseSources(today.sourcesJson).length > 0 && (
                <div className="mt-6 rounded-lg border border-white/[0.04] bg-white/[0.02] p-4">
                  <div className="mb-3 flex items-center gap-2 text-[12px] text-zinc-600">
                    <FileText className="h-3.5 w-3.5" />
                    Sources
                  </div>
                  <div className="space-y-1">
                    {parseSources(today.sourcesJson).map((s, i) => (
                      <a key={s.url} href={s.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-md p-2 text-[14px] text-zinc-500 transition hover:bg-white/[0.03] hover:text-zinc-400">
                        <span className="text-zinc-700">{i + 1}.</span>
                        <span className="flex-1 truncate">{s.title}</span>
                        <ExternalLink className="h-3 w-3 shrink-0 text-zinc-700" />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Apply */}
              {hasPendingUpdates(today.pendingProposedUpdates) && !today.userApprovedAt && (
                <div className="mt-6 flex items-center justify-between rounded-lg border border-white/[0.04] bg-white/[0.02] p-4">
                  <div>
                    <div className="text-[14px] text-zinc-400">Updates available</div>
                    <div className="text-[13px] text-zinc-600">{pendingHint}</div>
                  </div>
                  <button disabled={applyId === today.id} onClick={() => void apply(today)} className="rounded-lg bg-zinc-200 px-4 py-2 text-[13px] font-medium text-black hover:bg-white disabled:opacity-30">
                    {applyId === today.id ? 'Applying...' : 'Apply'}
                  </button>
                </div>
              )}

              {today.userApprovedAt && (
                <div className="mt-6 flex items-center gap-2 text-[14px] text-emerald-500/80">
                  <CheckCircle2 className="h-4 w-4" />
                  Applied to venture
                </div>
              )}

              {/* History */}
              {reports.length > 1 && (
                <div className="mt-8">
                  <div className="mb-3 text-[12px] text-zinc-700">Earlier briefings</div>
                  <div className="space-y-1">
                    {reports.filter(r => r.id !== today?.id).slice(0, 5).map(r => (
                      <div key={r.id} className="flex items-center gap-4 rounded-md py-2 text-[14px] text-zinc-600">
                        <span className="w-20 text-zinc-700">{r.reportDay}</span>
                        <span className="flex-1 truncate">{r.headline || r.summary.slice(0, 70)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex h-60 flex-col items-center justify-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-900/50">
                <Plus className="h-5 w-5 text-zinc-700" />
              </div>
              <p className="text-zinc-600">No briefing yet</p>
              <p className="text-[13px] text-zinc-700">Run your first research pass</p>
            </div>
          )}
        </div>

        {/* Chat */}
        <div className={`flex w-full flex-col border-l border-white/[0.06] bg-[#0d0d10] lg:w-[400px] ${view === 'chat' ? 'flex' : 'hidden lg:flex'}`}>
          <div className="flex items-center gap-3 border-b border-white/[0.06] px-4 py-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-800">
              <Sparkles className="h-3.5 w-3.5 text-zinc-500" />
            </div>
            <div className="text-[14px] font-medium text-zinc-400">Deepchox</div>
          </div>
          <div className="flex-1 space-y-4 overflow-y-auto p-4">
            {msgs.map(m => (
              <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[92%] rounded-2xl px-4 py-3 text-[15px] leading-relaxed ${m.role === 'user' ? 'bg-zinc-200 text-black' : 'border border-white/[0.06] bg-zinc-900/50 text-zinc-400'}`}>
                  {stripMd(m.text)}
                </div>
              </div>
            ))}
            {typing && (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 rounded-2xl border border-white/[0.06] bg-zinc-900/50 px-4 py-2 text-zinc-600">
                  <Clock className="h-3.5 w-3.5 animate-spin" />
                  <span className="text-[14px]">Thinking</span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
          <div className="border-t border-white/[0.06] p-3">
            {chatError && <div className="mb-2 text-[13px] text-red-400">{chatError}</div>}
            <div className="flex items-end gap-2 rounded-xl border border-white/[0.08] bg-zinc-900/50 p-2">
              <textarea value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void send(); } }} placeholder="Ask anything..." rows={1} disabled={typing} className="max-h-24 flex-1 resize-none bg-transparent px-2 py-1 text-[15px] text-zinc-300 placeholder:text-zinc-700 focus:outline-none" />
              <button onClick={() => void send()} disabled={typing || !input.trim()} className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-200 text-black transition hover:bg-white disabled:opacity-30">
                <Send className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Toggle */}
      <div className="fixed bottom-4 left-1/2 z-20 flex -translate-x-1/2 gap-1 rounded-full border border-white/[0.08] bg-zinc-900/90 p-1 backdrop-blur lg:hidden">
        <button onClick={() => setView('brief')} className={`rounded-full px-4 py-2 text-[13px] ${view === 'brief' ? 'bg-zinc-200 text-black' : 'text-zinc-500'}`}>Briefing</button>
        <button onClick={() => setView('chat')} className={`rounded-full px-4 py-2 text-[13px] ${view === 'chat' ? 'bg-zinc-200 text-black' : 'text-zinc-500'}`}>Chat</button>
      </div>
    </div>
  );
}
