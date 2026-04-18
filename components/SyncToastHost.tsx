'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useOffice } from '@/lib/OfficeContext';
import { CheckCircle2, ListOrdered, X } from 'lucide-react';

export function SyncToastHost() {
  const { syncToastMessage, lastAiSyncTrace, dismissSyncToast } = useOffice();
  const [traceOpen, setTraceOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!syncToastMessage) setTraceOpen(false);
  }, [syncToastMessage]);

  if (!syncToastMessage) return null;

  const hasTrace = (lastAiSyncTrace?.length ?? 0) > 0;

  const traceModal =
    mounted &&
    traceOpen &&
    hasTrace &&
    createPortal(
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="sync-trace-title"
        className="fixed inset-0 z-[200] flex items-end justify-center bg-black/65 p-0 sm:items-center sm:p-4"
        onClick={() => setTraceOpen(false)}
      >
        <div
          className="executive-panel-strong max-h-[min(88dvh,560px)] w-full max-w-md overflow-y-auto rounded-t-2xl border border-white/[0.08] p-4 shadow-[0_-8px_40px_rgba(0,0,0,0.5)] sm:rounded-2xl sm:shadow-2xl"
          style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mx-auto mb-3 h-1 w-10 shrink-0 rounded-full bg-white/20 sm:hidden" aria-hidden />
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <ListOrdered className="h-5 w-5 shrink-0 text-brand-teal" aria-hidden />
              <h2 id="sync-trace-title" className="text-sm font-semibold text-brand-text">
                What ran on this sync
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setTraceOpen(false)}
              className="rounded-lg p-2 text-brand-muted transition hover:bg-white/[0.06] hover:text-brand-text"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <ol className="mt-4 space-y-3 text-sm">
            {lastAiSyncTrace!.map((step, i) => (
              <li key={step.id} className="flex gap-3">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-teal/12 text-[11px] font-medium text-brand-teal">
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <p className="font-medium text-brand-text">{step.label}</p>
                  {step.detail ? (
                    <p className="mt-0.5 text-xs leading-relaxed text-brand-muted">{step.detail}</p>
                  ) : null}
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>,
      document.body
    );

  return (
    <>
      <div
        role="status"
        className="pointer-events-auto fixed left-1/2 z-[100] w-[min(100vw-1.25rem,32rem)] max-w-lg -translate-x-1/2 animate-in fade-in slide-in-from-bottom-4 duration-300"
        style={{
          bottom: 'max(5.5rem, calc(0.75rem + env(safe-area-inset-bottom)))',
        }}
      >
        <div className="executive-panel-strong flex flex-col gap-2 rounded-2xl border border-white/[0.08] px-3 py-3 shadow-[0_12px_40px_rgba(0,0,0,0.45)] backdrop-blur-xl sm:px-4">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-brand-teal" aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-medium text-brand-teal">Staff sync complete</p>
              <p className="mt-1 text-[13px] leading-snug text-brand-text sm:text-sm">{syncToastMessage}</p>
              {hasTrace ? (
                <button
                  type="button"
                  onClick={() => setTraceOpen(true)}
                  className="mt-2 inline-flex min-h-[44px] items-center gap-1.5 rounded-lg px-1 text-xs font-medium text-brand-teal underline-offset-2 hover:underline"
                >
                  <ListOrdered className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  What ran on this sync
                </button>
              ) : null}
            </div>
            <button
              type="button"
              onClick={dismissSyncToast}
              className="min-h-[44px] min-w-[44px] shrink-0 rounded-lg text-brand-muted transition hover:bg-white/[0.06] hover:text-brand-text"
              aria-label="Dismiss"
            >
              <X className="mx-auto h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
      {traceModal}
    </>
  );
}
