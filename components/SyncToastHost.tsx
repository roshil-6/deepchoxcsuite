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
        className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4"
        onClick={() => setTraceOpen(false)}
      >
        <div
          className="executive-panel-strong max-h-[min(70vh,520px)] w-full max-w-md overflow-y-auto p-4"
          onClick={(e) => e.stopPropagation()}
        >
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
              className="rounded p-1 text-brand-muted hover:text-brand-text"
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
        className="pointer-events-auto fixed bottom-6 left-1/2 z-[100] flex max-w-lg -translate-x-1/2 animate-in fade-in slide-in-from-bottom-4 duration-300"
      >
        <div className="executive-panel-strong flex flex-col gap-2 px-4 py-3">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-brand-teal" aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-medium text-brand-teal">
                Staff sync complete
              </p>
              <p className="mt-1 text-sm leading-snug text-brand-text">{syncToastMessage}</p>
              {hasTrace ? (
                <button
                  type="button"
                  onClick={() => setTraceOpen(true)}
                  className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-brand-teal underline-offset-2 hover:underline"
                >
                  <ListOrdered className="h-3.5 w-3.5" aria-hidden />
                  What ran on this sync
                </button>
              ) : null}
            </div>
            <button
              type="button"
              onClick={dismissSyncToast}
              className="shrink-0 rounded p-1 text-brand-muted hover:text-brand-text"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
      {traceModal}
    </>
  );
}
