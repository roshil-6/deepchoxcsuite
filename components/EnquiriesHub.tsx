'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useOffice } from '@/lib/OfficeContext';
import { Inbox, Mail, MessageCircle, Facebook, Rss, RefreshCw, Loader2 } from 'lucide-react';

type Importance = 'all' | 'high' | 'normal' | 'low';
type SimSource = 'whatsapp' | 'email' | 'facebook' | 'reddit';
type SimImportance = 'high' | 'normal' | 'low';

type EnquiryRow = {
  id: string;
  source: string;
  ventureId: number | null;
  subject: string | null;
  body: string;
  receivedAt: string;
  importance: string;
  isRead: boolean;
};

const SOURCE_ICONS: Record<string, React.ReactNode> = {
  whatsapp: <MessageCircle className="h-4 w-4" aria-hidden />,
  email: <Mail className="h-4 w-4" aria-hidden />,
  facebook: <Facebook className="h-4 w-4" aria-hidden />,
  reddit: <Rss className="h-4 w-4" aria-hidden />,
};

const SIM_LABEL: Record<SimSource, string> = {
  whatsapp: 'WhatsApp',
  email: 'Email',
  facebook: 'Facebook',
  reddit: 'Reddit',
};

export function EnquiriesHub() {
  const { activeProject, switchRoom } = useOffice();
  const [connected, setConnected] = useState<boolean | null>(null);
  const [items, setItems] = useState<EnquiryRow[]>([]);
  const [importance, setImportance] = useState<Importance>('all');
  const [simImportance, setSimImportance] = useState<SimImportance>('normal');
  const [loading, setLoading] = useState(false);
  const [posting, setPosting] = useState<SimSource | null>(null);
  const [postErr, setPostErr] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams();
      if (activeProject?.id != null) q.set('ventureId', String(activeProject.id));
      if (importance !== 'all') q.set('importance', importance);
      const res = await fetch(`/api/enquiries?${q.toString()}`);
      const data = await res.json();
      setConnected(data.connected === true);
      const list = (data.items || []).map((r: EnquiryRow & { receivedAt: string | Date }) => ({
        ...r,
        receivedAt: typeof r.receivedAt === 'string' ? r.receivedAt : new Date(r.receivedAt).toISOString(),
      }));
      setItems(list);
    } catch {
      setConnected(false);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [activeProject?.id, importance]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!items.length) {
      setSelectedId(null);
      return;
    }
    if (!selectedId || !items.some((i) => i.id === selectedId)) {
      setSelectedId(items[0].id);
    }
  }, [items, selectedId]);

  const selected = items.find((i) => i.id === selectedId) || null;

  const canPost = connected === true && activeProject?.id != null;

  const postFromSource = async (source: SimSource) => {
    if (!activeProject?.id || !canPost) return;
    setPostErr(null);
    setPosting(source);
    try {
      const label = SIM_LABEL[source];
      const res = await fetch('/api/enquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source,
          subject: `${label} — inbound`,
          body: [
            `Channel: ${label}. Importance: ${simImportance}.`,
            '',
            'In production, point each channel’s webhook or worker to POST /api/enquiries with JSON:',
            '{ "source": "whatsapp"|"email"|"facebook"|"reddit", "subject", "body", "importance": "high"|"normal"|"low", "ventureId", "externalId"?, "rawMeta"? }.',
          ].join('\n'),
          importance: simImportance,
          ventureId: activeProject.id,
          externalId: `sim-${source}-${Date.now()}`,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setPostErr(typeof data.error === 'string' ? data.error : 'Could not save enquiry');
        return;
      }
      await load();
    } finally {
      setPosting(null);
    }
  };

  if (!activeProject) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 bg-brand-bg px-6 text-center">
        <Inbox className="h-10 w-10 text-brand-muted" aria-hidden />
        <p className="max-w-md text-sm text-brand-muted">
          Select a venture to tag enquiries. The inbox uses your Render Postgres when <code className="text-brand-text">DATABASE_URL</code> is set.
        </p>
        <button
          type="button"
          onClick={() => switchRoom('dashboard')}
          className="rounded-lg border border-brand-border bg-brand-card px-4 py-2 text-sm text-brand-text hover:bg-brand-input"
        >
          Executive Overview
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-brand-bg lg:flex-row">
      <aside className="flex w-full shrink-0 flex-col border-brand-border lg:w-[340px] lg:border-r">
        <div className="border-b border-brand-border bg-brand-panel px-4 py-3">
          <div className="flex items-center gap-2">
            <Inbox className="h-4 w-4 text-brand-teal" aria-hidden />
            <h2 className="text-sm font-medium text-brand-text">Enquiries</h2>
          </div>
          <p className="mt-1 text-[11px] leading-snug text-brand-muted">
            Wire WhatsApp, email, Facebook, and Reddit to <code className="text-[10px] text-brand-text/90">POST /api/enquiries</code>. Set{' '}
            <span className="text-brand-text/90">importance</span> to <span className="text-amber-400/90">high</span> for urgent items.
          </p>
          {connected === false && (
            <p className="mt-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-1.5 text-[10px] leading-relaxed text-amber-200/90">
              Database not connected. Add <code className="text-amber-100/90">DATABASE_URL</code> on Render and redeploy — the list will populate
              from the server.
            </p>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => load()}
              disabled={loading}
              className="inline-flex items-center gap-1 rounded-md border border-brand-border bg-brand-input px-2.5 py-1 text-[11px] font-medium text-brand-text hover:bg-brand-card disabled:opacity-50"
            >
              <RefreshCw className={`h-3 w-3 shrink-0 ${loading ? 'animate-spin' : ''}`} aria-hidden />
              Refresh
            </button>
            <span className="text-[10px] text-brand-muted/70">·</span>
            <span className="text-[10px] uppercase tracking-wide text-brand-muted">View</span>
            {(['all', 'high', 'normal', 'low'] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setImportance(f)}
                className={`rounded px-2 py-0.5 text-[11px] capitalize transition-colors ${
                  importance === f ? 'bg-brand-teal/25 font-medium text-brand-teal' : 'text-brand-muted hover:bg-white/5 hover:text-brand-text'
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          <div className="mt-4 border-t border-brand-border pt-3">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-brand-muted">Test POST (same as webhooks)</p>
            <p className="mt-1 text-[10px] text-brand-muted">Next message importance</p>
            <div className="mt-1.5 flex flex-wrap gap-1">
              {(['high', 'normal', 'low'] as const).map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  disabled={!canPost}
                  onClick={() => setSimImportance(lvl)}
                  className={`rounded px-2 py-0.5 text-[10px] capitalize disabled:opacity-40 ${
                    simImportance === lvl
                      ? lvl === 'high'
                        ? 'bg-amber-500/20 font-medium text-amber-200'
                        : 'bg-brand-teal/20 font-medium text-brand-teal'
                      : 'text-brand-muted hover:bg-white/5'
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>
            <div className="mt-2 grid grid-cols-2 gap-1.5">
              {(['whatsapp', 'email', 'facebook', 'reddit'] as const).map((src) => (
                <button
                  key={src}
                  type="button"
                  disabled={!canPost || posting !== null}
                  onClick={() => postFromSource(src)}
                  title={canPost ? `POST as ${SIM_LABEL[src]}` : 'Requires DATABASE_URL'}
                  className="inline-flex items-center justify-center gap-1.5 rounded-md border border-brand-border bg-brand-input py-2 text-[11px] font-medium text-brand-text hover:bg-brand-card disabled:cursor-not-allowed disabled:opacity-45"
                >
                  {posting === src ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : SOURCE_ICONS[src]}
                  {SIM_LABEL[src]}
                </button>
              ))}
            </div>
            {postErr && <p className="mt-2 text-[10px] text-rose-400/90">{postErr}</p>}
          </div>
        </div>
        <div className="custom-scrollbar flex-1 overflow-y-auto">
          {items.length === 0 && !loading ? (
            <p className="p-4 text-[12px] text-brand-muted">No messages yet.</p>
          ) : (
            <ul className="divide-y divide-brand-border">
              {items.map((row) => {
                const icon = SOURCE_ICONS[row.source.toLowerCase()] ?? <Inbox className="h-4 w-4 opacity-60" aria-hidden />;
                const dateLabel = new Date(row.receivedAt).toLocaleString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                });
                return (
                  <li key={row.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(row.id)}
                      className={`flex w-full gap-3 px-3 py-3 text-left transition-colors ${
                        selectedId === row.id ? 'bg-brand-input/80' : 'hover:bg-white/[0.04]'
                      }`}
                    >
                      <span className="mt-0.5 text-brand-muted">{icon}</span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center justify-between gap-2">
                          <span className="truncate text-[12px] font-medium text-brand-text">
                            {row.subject || row.source}
                          </span>
                          <span
                            className={`shrink-0 rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase ${
                              row.importance === 'high'
                                ? 'bg-amber-500/20 text-amber-300'
                                : row.importance === 'low'
                                  ? 'bg-zinc-700/50 text-zinc-400'
                                  : 'bg-zinc-600/30 text-zinc-400'
                            }`}
                          >
                            {row.importance === 'high' ? 'High' : row.importance === 'low' ? 'Low' : 'Normal'}
                          </span>
                        </span>
                        <span className="mt-0.5 block truncate text-[11px] text-brand-muted">{row.body}</span>
                        <span className="mt-1 block font-mono text-[10px] text-brand-muted/80">{dateLabel}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </aside>

      <main className="min-h-0 min-w-0 flex-1 overflow-y-auto p-5">
        {selected ? (
          <article className="mx-auto max-w-2xl">
            <header className="mb-4 border-b border-brand-border pb-4">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-brand-muted">{selected.source}</p>
              <h1 className="mt-1 text-lg font-medium text-brand-text">{selected.subject || '(no subject)'}</h1>
              <p className="mt-2 font-mono text-[12px] text-brand-muted">
                {new Date(selected.receivedAt).toLocaleString()} · Venture #{activeProject.id}
              </p>
              <p className="mt-2 text-[12px] text-brand-muted">
                Importance:{' '}
                <span
                  className={
                    selected.importance === 'high'
                      ? 'font-medium text-amber-300/90'
                      : selected.importance === 'low'
                        ? 'text-zinc-400'
                        : 'text-brand-text/80'
                  }
                >
                  {selected.importance === 'high' ? 'High — prioritise in staff sync or Personal Assistant.' : selected.importance === 'low' ? 'Low' : 'Normal'}
                </span>
              </p>
            </header>
            <div className="whitespace-pre-wrap text-sm leading-relaxed text-brand-text/90">{selected.body}</div>
          </article>
        ) : (
          <p className="text-sm text-brand-muted">Select a message from the list.</p>
        )}
      </main>
    </div>
  );
}
