'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useOffice } from '@/lib/OfficeContext';
import { Inbox, Mail, MessageCircle, Facebook, Rss, Filter, RefreshCw, Plus } from 'lucide-react';

type Importance = 'all' | 'high' | 'normal' | 'low';

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

export function EnquiriesHub() {
  const { activeProject, switchRoom } = useOffice();
  const [connected, setConnected] = useState<boolean | null>(null);
  const [items, setItems] = useState<EnquiryRow[]>([]);
  const [importance, setImportance] = useState<Importance>('all');
  const [loading, setLoading] = useState(false);
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

  const addDemo = async () => {
    if (!activeProject?.id) return;
    await fetch('/api/enquiries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source: 'email',
        subject: 'Demo inbound — connect WhatsApp / Meta / Reddit webhooks next',
        body: 'This is a sample enquiry stored in Postgres. Production will ingest from your channels automatically.',
        importance: 'high',
        ventureId: activeProject.id,
      }),
    });
    load();
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
          <p className="mt-1 text-[11px] text-brand-muted">
            WhatsApp, email, Facebook, Reddit — wire each source to POST /api/enquiries. Important items can be flagged{' '}
            <span className="text-amber-400/90">high</span>.
          </p>
          {connected === false && (
            <p className="mt-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-1.5 text-[10px] text-amber-200/90">
              Database not connected. Add DATABASE_URL on Render and redeploy — list will populate from the server.
            </p>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => load()}
              disabled={loading}
              className="inline-flex items-center gap-1 rounded-md border border-brand-border bg-brand-input px-2 py-1 text-[11px] text-brand-text hover:bg-brand-card disabled:opacity-50"
            >
              <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} aria-hidden />
              Refresh
            </button>
            {connected && (
              <button
                type="button"
                onClick={addDemo}
                className="inline-flex items-center gap-1 rounded-md border border-brand-teal/30 bg-brand-input px-2 py-1 text-[11px] font-medium text-brand-text hover:bg-brand-card"
              >
                <Plus className="h-3 w-3" aria-hidden />
                Sample message
              </button>
            )}
          </div>
          <div className="mt-3 flex items-center gap-1 text-[10px] text-brand-muted">
            <Filter className="h-3 w-3" aria-hidden />
            {(['all', 'high', 'normal', 'low'] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setImportance(f)}
                className={`rounded px-2 py-0.5 capitalize ${importance === f ? 'bg-brand-teal/20 text-brand-teal' : 'hover:bg-white/5'}`}
              >
                {f}
              </button>
            ))}
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
                          {row.importance === 'high' && (
                            <span className="shrink-0 rounded bg-amber-500/20 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-amber-300">
                              Important
                            </span>
                          )}
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
              {selected.importance === 'high' && (
                <p className="mt-2 text-[12px] text-amber-300/90">Flagged important — prioritise in staff sync or Personal Assistant.</p>
              )}
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
