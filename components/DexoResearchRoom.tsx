'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { RefreshCw, Globe, CheckCircle2, Send, Settings2, X, Sparkles, Search, BookOpen, TrendingUp, Lightbulb, Clock } from 'lucide-react';
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
import { DexoParticleCanvas } from '@/components/Dexo/DexoParticleSphere';

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
  const [activeTab, setActiveTab] = useState<'brief' | 'chat'>('brief');
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
      const welcome: Msg = { id: 1, role: 'dexo', text: `Welcome to your research command center. I auto-scan the web daily for ${activeProject?.name || 'your startup'} — competitors, markets, signals. Ask me anything or review today's briefing.` };
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
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-zinc-900">
            <Search className="h-8 w-8 text-zinc-600" />
          </div>
          <h2 className="text-xl font-medium text-white">Research Studio</h2>
          <p className="mt-2 text-zinc-500">Select a venture to begin</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-col bg-black text-zinc-100">
      {/* Top Bar */}
      <div className="flex items-center justify-between border-b border-white/10 px-5 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-900">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <div>
            <div className="text-[15px] font-medium">{activeProject.name}</div>
            <div className="text-[12px] text-zinc-500">Research Studio</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setPrefsOpen(p => !p)} className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-900 hover:text-white">
            <Settings2 className="h-4 w-4" />
          </button>
          <button disabled={running || !vid} onClick={() => void runPulse(true)} className="flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-[13px] font-medium text-black hover:bg-zinc-200 disabled:opacity-30">
            <RefreshCw className={`h-4 w-4 ${running ? 'animate-spin' : ''}`} />
            Run Briefing
          </button>
        </div>
      </div>

      {/* Settings Drawer */}
      {prefsOpen && (
        <div className="border-b border-white/10 bg-zinc-950 px-5 py-4">
          <div className="mb-4 flex items-center justify-between">
            <span className="text-[13px] font-medium text-zinc-300">Research Preferences</span>
            <button onClick={() => setPrefsOpen(false)} className="text-zinc-500 hover:text-white"><X className="h-4 w-4" /></button>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-[12px] text-zinc-500">Focus Areas</label>
              <input value={prefs.interestNotes} onChange={e => commit(p => ({ ...p, interestNotes: e.target.value }))} placeholder="What should I watch? Competitors, markets, launch timing..." className="w-full rounded-lg border border-white/10 bg-transparent px-3 py-2 text-[14px] placeholder:text-zinc-700 focus:outline-none" />
            </div>
            <div>
              <label className="mb-2 block text-[12px] text-zinc-500">Auto-run</label>
              <div className="flex items-center gap-3">
                <select value={prefs.cadence} onChange={e => commit(p => ({ ...p, cadence: e.target.value as any }))} className="rounded-lg border border-white/10 bg-transparent px-3 py-2 text-[14px]">
                  <option value="daily">Daily</option>
                  <option value="weekdays">Weekdays</option>
                  <option value="manual">Manual</option>
                </select>
                <label className="flex items-center gap-2 text-[13px]">
                  <input type="checkbox" checked={prefs.autoBriefing} onChange={e => commit(p => ({ ...p, autoBriefing: e.target.checked }))} className="rounded border-white/20 bg-transparent" />
                  Enabled
                </label>
              </div>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {(['market', 'product', 'fundraising', 'ops', 'narrative'] as const).map(l => (
              <button key={l} onClick={() => commit(p => ({ ...p, lanesEnabled: { ...p.lanesEnabled, [l]: !p.lanesEnabled[l] } }))} className={`rounded-full border px-3 py-1 text-[12px] ${prefs.lanesEnabled[l] ? 'border-white bg-white text-black' : 'border-white/20 text-zinc-500 hover:border-white/40'}`}>
                {l}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Errors */}
      {proRequired && <div className="mx-5 my-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-[14px] text-amber-400">Pro required for daily briefings</div>}
      {error && <div className="mx-5 my-3 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-[14px] text-red-400">{error}</div>}

      {/* Main */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Briefing */}
        <div className={`flex-1 overflow-y-auto px-5 py-5 ${activeTab === 'brief' ? 'block' : 'hidden lg:block'}`}>
          {loading && !today ? (
            <div className="flex h-40 items-center justify-center gap-2 text-zinc-500">
              <RefreshCw className="h-5 w-5 animate-spin" /> Loading...
            </div>
          ) : today && parsed ? (
            <div className="mx-auto max-w-2xl space-y-4">
              {/* Header */}
              <div className="mb-6">
                <div className="mb-2 flex items-center gap-2 text-[12px] text-zinc-500">
                  <Globe className="h-3.5 w-3.5" /> Web briefing · {today.reportDay}
                </div>
                {today.headline && <h1 className="text-[26px] font-medium leading-tight text-white">{today.headline}</h1>}
                {parsed.intro && <p className="mt-3 text-[16px] leading-relaxed text-zinc-400">{parsed.intro}</p>}
              </div>

              {/* Sections */}
              <div className="space-y-3">
                {parsed.sections.map((s, i) => (
                  <div key={`${i}-${s.title}`} className="rounded-xl border border-white/10 bg-zinc-950 p-4">
                    <div className="mb-3 flex items-center gap-2 text-[13px] font-medium text-zinc-300">
                      <span className="flex h-6 w-6 items-center justify-center rounded bg-zinc-900 text-[11px]">{i + 1}</span>
                      {s.isRisk ? 'Risk' : s.title}
                    </div>
                    <ul className="space-y-2">
                      {s.bullets.map((b, j) => (
                        <li key={j} className="flex gap-3 text-[15px] leading-relaxed text-zinc-400">
                          <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-zinc-600" />
                          {b}
                        </li>
                      ))}
                    </ul>
                    {s.move && <div className="mt-3 rounded-lg bg-zinc-900 p-3 text-[14px] text-zinc-300">→ {s.move}</div>}
                  </div>
                ))}
              </div>

              {/* Follow-ups */}
              {parseFollowUp(today.followUpJson).length > 0 && (
                <div className="rounded-xl border border-white/10 bg-zinc-950 p-4">
                  <div className="mb-3 flex items-center gap-2 text-[12px] text-zinc-500">
                    <Lightbulb className="h-4 w-4" /> Follow-ups
                  </div>
                  <div className="space-y-2">
                    {parseFollowUp(today.followUpJson).map((q, i) => (
                      <button key={i} onClick={() => { setInput(q); setActiveTab('chat'); }} className="w-full text-left">
                        <div className="flex items-start gap-3 rounded-lg p-2 text-[14px] text-zinc-400 hover:bg-zinc-900">
                          <span className="text-zinc-600">{i + 1}.</span>
                          {q}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Sources */}
              {parseSources(today.sourcesJson).length > 0 && (
                <div className="rounded-xl border border-white/10 bg-zinc-950 p-4">
                  <div className="mb-3 text-[12px] text-zinc-500">Sources</div>
                  <div className="space-y-1">
                    {parseSources(today.sourcesJson).map((s, i) => (
                      <a key={s.url} href={s.url} target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-lg p-2 text-[14px] text-zinc-400 hover:bg-zinc-900 hover:text-white">
                        <span className="text-zinc-600">[{i + 1}]</span>
                        <span className="flex-1 truncate">{s.title}</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Apply */}
              {hasPendingUpdates(today.pendingProposedUpdates) && !today.userApprovedAt && (
                <div className="flex items-center justify-between rounded-xl border border-white/10 bg-zinc-950 p-4">
                  <div className="text-[14px]">
                    <div className="text-zinc-300">Suggestions ready</div>
                    <div className="text-[13px] text-zinc-500">{pendingHint}</div>
                  </div>
                  <button disabled={applyId === today.id} onClick={() => void apply(today)} className="rounded-lg bg-white px-4 py-2 text-[13px] font-medium text-black hover:bg-zinc-200 disabled:opacity-40">
                    {applyId === today.id ? 'Applying...' : 'Apply'}
                  </button>
                </div>
              )}

              {today.userApprovedAt && (
                <div className="flex items-center gap-2 text-[14px] text-emerald-400">
                  <CheckCircle2 className="h-4 w-4" /> Applied to venture
                </div>
              )}

              {/* Earlier */}
              {reports.length > 1 && (
                <div className="pt-4">
                  <div className="mb-2 text-[12px] text-zinc-500">Earlier briefings</div>
                  <div className="space-y-1">
                    {reports.filter(r => r.id !== today?.id).slice(0, 5).map(r => (
                      <div key={r.id} className="flex items-center gap-4 rounded-lg p-2 text-[14px] text-zinc-500">
                        <span className="tabular-nums">{r.reportDay}</span>
                        <span className="flex-1 truncate">{r.headline || r.summary.slice(0, 80)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex h-60 flex-col items-center justify-center gap-3 text-center">
              <BookOpen className="h-10 w-10 text-zinc-700" />
              <p className="text-zinc-500">No briefing yet. Run your first research pass.</p>
            </div>
          )}
        </div>

        {/* Right: Chat */}
        <div className={`flex w-full flex-col border-l border-white/10 bg-zinc-950 lg:w-[420px] ${activeTab === 'chat' ? 'flex' : 'hidden lg:flex'}`}>
          <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-900">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <div className="text-[15px] font-medium">Dexo</div>
          </div>
          <div className="flex-1 space-y-4 overflow-y-auto p-4">
            {msgs.map(m => (
              <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[90%] rounded-2xl px-4 py-3 text-[15px] leading-relaxed ${m.role === 'user' ? 'bg-white text-black' : 'bg-zinc-900 text-zinc-300'}`}>
                  {stripMd(m.text)}
                </div>
              </div>
            ))}
            {typing && (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 rounded-2xl bg-zinc-900 px-4 py-3 text-zinc-500">
                  <Clock className="h-4 w-4 animate-spin" /> Thinking...
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
          <div className="border-t border-white/10 p-3">
            {chatError && <div className="mb-2 text-[13px] text-red-400">{chatError}</div>}
            <div className="flex items-end gap-2 rounded-xl border border-white/10 bg-zinc-900 p-2">
              <textarea value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void send(); } }} placeholder="Ask anything..." rows={1} disabled={typing} className="max-h-28 flex-1 resize-none bg-transparent px-2 py-1 text-[15px] placeholder:text-zinc-600 focus:outline-none" />
              <button onClick={() => void send()} disabled={typing || !input.trim()} className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-black disabled:opacity-30">
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Toggle */}
      <div className="fixed bottom-4 left-1/2 z-20 flex -translate-x-1/2 gap-1 rounded-full border border-white/10 bg-zinc-900 p-1 lg:hidden">
        <button onClick={() => setActiveTab('brief')} className={`rounded-full px-4 py-2 text-[13px] ${activeTab === 'brief' ? 'bg-white text-black' : 'text-zinc-500'}`}>Brief</button>
        <button onClick={() => setActiveTab('chat')} className={`rounded-full px-4 py-2 text-[13px] ${activeTab === 'chat' ? 'bg-white text-black' : 'text-zinc-500'}`}>Chat</button>
      </div>

      {/* FAB */}
      {!embedded && (
        <button onClick={() => setActiveTab('chat')} className="fixed bottom-5 right-5 z-30 hidden h-12 w-12 items-center justify-center overflow-hidden rounded-full border border-white/20 bg-zinc-900 lg:flex">
          <DexoParticleCanvas mode="floating" size={44} active={false} />
        </button>
      )}
    </div>
  );
}
