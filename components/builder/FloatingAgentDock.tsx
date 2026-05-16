'use client';

import React from 'react';

type FloatingAgentDockProps = {
  isDark: boolean;
  open: boolean;
  expanded: boolean;
  onOpen: () => void;
  onClose: () => void;
  onToggleExpand: () => void;
  title?: string;
  subtitle?: string;
  busy?: boolean;
  children: React.ReactNode;
};

/**
 * Anchored floating thread shell: expandable height, minimize to FAB.
 */
export function FloatingAgentDock({
  isDark,
  open,
  expanded,
  onOpen,
  onClose,
  onToggleExpand,
  title = 'Agent thread',
  subtitle,
  busy = false,
  children,
}: FloatingAgentDockProps) {
  const stroke = isDark ? 'rgba(63,63,70,0.55)' : 'rgba(226,232,240,1)';
  const shell = isDark ? 'rgba(12,12,14,0.96)' : 'rgba(255,255,255,0.97)';
  const shadow = isDark
    ? '0 24px 72px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.06)'
    : '0 22px 64px rgba(15,23,42,0.14), 0 0 0 1px rgba(255,255,255,0.95)';
  const muted = isDark ? '#a1a1aa' : '#64748b';

  if (!open) {
    return (
      <div className="pointer-events-none fixed bottom-6 left-4 z-[45] flex sm:left-6">
        <button
          type="button"
          onClick={onOpen}
          className="pointer-events-auto rounded-full border px-5 py-3 text-[13px] font-semibold shadow-xl transition-colors active:scale-[0.98]"
          style={{
            borderColor: stroke,
            background: isDark ? '#18181b' : '#ffffff',
            color: isDark ? '#fafafa' : '#0f172a',
            boxShadow: shadow,
          }}
        >
          Open agent thread
          {busy ? (
            <span className="ml-2 inline-block h-2 w-2 animate-pulse rounded-full bg-emerald-400" aria-hidden />
          ) : null}
        </button>
      </div>
    );
  }

  return (
    <div className="pointer-events-none fixed bottom-6 left-4 z-[45] flex w-[min(100%,440px)] sm:left-6">
      <section
        className="pointer-events-auto flex max-h-[min(72dvh,calc(100dvh-120px))] min-h-0 w-full flex-col overflow-hidden rounded-[1.35rem] border transition-[max-height] duration-300 ease-out"
        style={{
          borderColor: stroke,
          background: shell,
          boxShadow: shadow,
          backdropFilter: 'blur(14px)',
          maxHeight: expanded ? 'min(72dvh, 640px)' : '340px',
        }}
        aria-label={title}
      >
        <div
          className="flex shrink-0 items-start gap-2 border-b px-4 py-3"
          style={{ borderColor: isDark ? 'rgba(63,63,70,0.35)' : 'rgba(226,232,240,0.85)' }}
        >
          <div className="min-w-0 flex-1 pt-0.5">
            <p className="text-[13px] font-semibold" style={{ color: isDark ? '#fafafa' : '#0f172a' }}>
              {title}
            </p>
            {subtitle ? (
              <p className="mt-0.5 text-[11px] leading-snug" style={{ color: muted }}>
                {subtitle}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            className="shrink-0 rounded-lg px-2 py-1.5 text-[11px] font-medium transition-colors hover:opacity-90"
            style={{ color: muted, background: isDark ? 'rgba(63,63,70,0.35)' : 'rgba(241,245,249,1)' }}
            onClick={onToggleExpand}
            aria-expanded={expanded}
          >
            {expanded ? 'Compact' : 'Expand'}
          </button>
          <button
            type="button"
            className="shrink-0 rounded-lg px-2 py-1.5 text-[11px] font-medium transition-colors hover:opacity-90"
            style={{ color: muted, background: isDark ? 'rgba(63,63,70,0.35)' : 'rgba(241,245,249,1)' }}
            onClick={onClose}
          >
            Close
          </button>
        </div>
        <div className="min-h-0 flex-1">{children}</div>
      </section>
    </div>
  );
}
