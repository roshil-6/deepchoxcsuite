'use client';

import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useOffice, type AgentRole } from '@/lib/OfficeContext';
import { Bell, X, ExternalLink, Sparkles } from 'lucide-react';
import { buildDexoStaffAttentionBootstrap } from '@/lib/dexoStaffAttentionPrompt';

function deskRouteForRole(role: string): AgentRole | 'dexo' {
  if (['ceo', 'pm', 'accountant', 'scout', 'cmo'].includes(role)) return role as AgentRole;
  return 'ceo';
}

type PanelPos = { top: number; left: number; width: number };

export function StaffNotificationCenter({ className = '' }: { className?: string }) {
  const { staffAttentionPending, dismissStaffAttention, switchRoom, setDexoBootstrap } = useOffice();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [panelPos, setPanelPos] = useState<PanelPos | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);

  const updatePanelPosition = useCallback(() => {
    if (!open || !buttonRef.current) {
      setPanelPos(null);
      return;
    }
    const btn = buttonRef.current.getBoundingClientRect();
    const margin = 8;
    const maxW = Math.min(380, window.innerWidth - 2 * margin);
    const headerH = 44;
    const maxBody = Math.min(Math.floor(window.innerHeight * 0.65), 420);
    const panelEstimate = headerH + maxBody;

    let left = btn.right - maxW;
    left = Math.max(margin, Math.min(left, window.innerWidth - maxW - margin));

    let top = btn.bottom + margin;
    if (top + panelEstimate > window.innerHeight - margin) {
      const above = btn.top - margin - panelEstimate;
      if (above >= margin) {
        top = above;
      } else {
        top = Math.max(margin, window.innerHeight - margin - Math.min(panelEstimate, window.innerHeight - 2 * margin));
      }
    }

    setPanelPos({ top, left, width: maxW });
  }, [open]);

  useLayoutEffect(() => {
    updatePanelPosition();
  }, [open, updatePanelPosition]);

  useEffect(() => {
    if (!open) return;
    const onResize = () => updatePanelPosition();
    window.addEventListener('resize', onResize);
    window.addEventListener('scroll', onResize, true);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('scroll', onResize, true);
    };
  }, [open, updatePanelPosition]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (rootRef.current?.contains(t)) return;
      if (panelRef.current?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const count = staffAttentionPending.length;

  const panel = open && panelPos && mounted && (
    <div
      ref={panelRef}
      role="dialog"
      aria-modal="true"
      className="executive-panel-strong fixed z-[200] max-h-[min(85vh,calc(100vh-16px))] flex flex-col overflow-hidden"
      style={{
        top: panelPos.top,
        left: panelPos.left,
        width: panelPos.width,
        maxWidth: 'calc(100vw - 16px)',
      }}
    >
      <div className="flex shrink-0 items-center justify-between border-b border-brand-border px-3 py-2">
        <span className="text-xs font-semibold text-brand-text">Staff waiting for you</span>
        <button type="button" onClick={() => setOpen(false)} className="rounded p-1 text-brand-muted hover:text-brand-text" aria-label="Close">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {count === 0 ? (
          <p className="px-3 py-6 text-center text-[12px] text-zinc-400">
            No pending notifications. Run “Sync AI staff” on Executive Overview to refresh.
          </p>
        ) : (
          <ul className="divide-y divide-brand-border">
            {staffAttentionPending.map((item) => (
              <li key={item.id} className="px-3 py-3 transition-colors hover:bg-white/[0.03]">
                <p className="text-[11px] font-medium text-zinc-500">{item.role.replace('_', ' ')}</p>
                <p className="mt-1 text-[13px] font-medium text-zinc-100">{item.title}</p>
                <p className="mt-1 text-[12px] leading-snug text-zinc-400">{item.message}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setDexoBootstrap(buildDexoStaffAttentionBootstrap(item));
                      switchRoom('dexo');
                      setOpen(false);
                    }}
                    className="inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-semibold transition" style={{ borderColor: 'rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.06)', color: '#f2f2f5' }}
                  >
                    <Sparkles className="h-3 w-3" aria-hidden />
                    Set up in Dexo
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      switchRoom(deskRouteForRole(item.role));
                      setOpen(false);
                    }}
                    className="executive-toolbar-button rounded-lg px-2 py-1 text-[11px]"
                  >
                    <ExternalLink className="h-3 w-3" aria-hidden />
                    Open desk
                  </button>
                  <button
                    type="button"
                    onClick={() => dismissStaffAttention(item.id)}
                    className="text-[11px] text-zinc-500 underline-offset-2 hover:text-zinc-200 hover:underline"
                  >
                    Dismiss
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="relative rounded-xl p-2 text-brand-muted transition-colors hover:bg-white/[0.06] hover:text-brand-text"
        aria-label={`Staff notifications${count ? `, ${count} pending` : ''}`}
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <Bell className="h-5 w-5" aria-hidden />
        {count > 0 && (
          <span className="absolute right-1 top-1 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-[#c5221f] px-1 text-[9px] font-medium text-white">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {mounted && panel && createPortal(panel, document.body)}
    </div>
  );
}
