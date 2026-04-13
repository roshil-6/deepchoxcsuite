'use client';

/**
 * ContextualGuide — Intelligent, minimal UX hints.
 *
 * Shows the right hint at the right time without cluttering the UI.
 * Hints are context-aware: they check whether the user has data before showing.
 * Users can dismiss individual hints. Dismissed hints are remembered per session.
 *
 * Components:
 *  - <GuideHint>        Single inline hint bar (e.g. "No strategy yet — start here")
 *  - <GuideTooltip>     Hover tooltip wrapping any trigger element
 *  - <FirstRunBanner>   Full-width orientation banner for empty states
 *  - <ActionHint>       Post-action hint ("What to do next after a sync")
 *  - useGuide()         Hook to check / dismiss hints by key
 */

import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { X, ArrowRight, Lightbulb, Info, ChevronRight } from 'lucide-react';

// ─── Dismiss store (session memory) ────────────────────────────────────────

const STORAGE_KEY = 'deepchox:guide-dismissed';

function loadDismissed(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
  } catch {
    return new Set();
  }
}

function saveDismissed(set: Set<string>) {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify([...set]));
  } catch { /* ignore */ }
}

// ─── Context ────────────────────────────────────────────────────────────────

interface GuideContextType {
  dismissed: Set<string>;
  dismiss: (key: string) => void;
  isDismissed: (key: string) => boolean;
}

const GuideContext = createContext<GuideContextType>({
  dismissed: new Set(),
  dismiss: () => {},
  isDismissed: () => false,
});

export function GuideProvider({ children }: { children: React.ReactNode }) {
  const [dismissed, setDismissed] = useState<Set<string>>(() => loadDismissed());

  const dismiss = (key: string) => {
    setDismissed((prev) => {
      const next = new Set(prev);
      next.add(key);
      saveDismissed(next);
      return next;
    });
  };

  const isDismissed = (key: string) => dismissed.has(key);

  return (
    <GuideContext.Provider value={{ dismissed, dismiss, isDismissed }}>
      {children}
    </GuideContext.Provider>
  );
}

export function useGuide() {
  return useContext(GuideContext);
}

// ─── GuideHint ──────────────────────────────────────────────────────────────

interface GuideHintProps {
  /** Unique key — dismissed hints are hidden for the session */
  id: string;
  /** The hint text */
  message: string;
  /** Optional CTA label */
  action?: string;
  /** Called when user clicks the CTA */
  onAction?: () => void;
  /** Visual variant */
  variant?: 'info' | 'tip' | 'warning' | 'success';
  /** Only render when this condition is true */
  when?: boolean;
  className?: string;
  /** Allow dismiss */
  dismissible?: boolean;
}

const HINT_STYLES: Record<NonNullable<GuideHintProps['variant']>, string> = {
  info: 'border-sky-500/20 bg-sky-500/[0.07] text-sky-300',
  tip: 'border-amber-500/20 bg-amber-500/[0.07] text-amber-300',
  warning: 'border-orange-500/22 bg-orange-500/[0.07] text-orange-300',
  success: 'border-emerald-500/20 bg-emerald-500/[0.07] text-emerald-300',
};

const HINT_ICON: Record<NonNullable<GuideHintProps['variant']>, React.ReactNode> = {
  info: <Info className="h-3.5 w-3.5 shrink-0 opacity-80" />,
  tip: <Lightbulb className="h-3.5 w-3.5 shrink-0 opacity-80" />,
  warning: <Info className="h-3.5 w-3.5 shrink-0 opacity-80" />,
  success: <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-80" />,
};

export function GuideHint({
  id,
  message,
  action,
  onAction,
  variant = 'tip',
  when = true,
  className = '',
  dismissible = true,
}: GuideHintProps) {
  const { isDismissed, dismiss } = useGuide();

  if (!when || isDismissed(id)) return null;

  const styles = HINT_STYLES[variant];
  const icon = HINT_ICON[variant];

  return (
    <div
      className={`flex items-center gap-2.5 rounded-xl border px-3.5 py-2.5 ${styles} ${className}`}
      role="note"
    >
      {icon}
      <p className="flex-1 text-[12px] leading-snug opacity-90">{message}</p>
      {action && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="shrink-0 flex items-center gap-1 text-[11px] font-semibold opacity-90 hover:opacity-100 transition-opacity"
        >
          {action}
          <ArrowRight className="h-3 w-3" />
        </button>
      )}
      {dismissible && (
        <button
          type="button"
          onClick={() => dismiss(id)}
          aria-label="Dismiss hint"
          className="shrink-0 ml-0.5 rounded-md p-0.5 opacity-50 hover:opacity-90 transition-opacity"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}

// ─── FirstRunBanner ──────────────────────────────────────────────────────────

interface FirstRunBannerProps {
  id: string;
  heading: string;
  body: string;
  /** Primary action */
  primaryAction?: string;
  onPrimary?: () => void;
  /** Secondary action */
  secondaryAction?: string;
  onSecondary?: () => void;
  /** Only show when true */
  when?: boolean;
  className?: string;
}

export function FirstRunBanner({
  id,
  heading,
  body,
  primaryAction,
  onPrimary,
  secondaryAction,
  onSecondary,
  when = true,
  className = '',
}: FirstRunBannerProps) {
  const { isDismissed, dismiss } = useGuide();

  if (!when || isDismissed(id)) return null;

  return (
    <div
      className={`relative rounded-2xl border border-violet-500/25 bg-gradient-to-br from-violet-500/[0.07] to-transparent px-5 py-5 ${className}`}
    >
      <button
        type="button"
        onClick={() => dismiss(id)}
        aria-label="Dismiss"
        className="absolute right-3 top-3 rounded-lg p-1.5 text-zinc-600 hover:text-zinc-400 transition-colors"
      >
        <X className="h-3.5 w-3.5" />
      </button>

      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-violet-500/15 ring-1 ring-violet-500/20">
          <Lightbulb className="h-4 w-4 text-violet-300" />
        </div>
        <div className="min-w-0 pr-6">
          <p className="text-[13px] font-semibold text-zinc-100">{heading}</p>
          <p className="mt-1.5 text-[12px] leading-relaxed text-zinc-400">{body}</p>
          {(primaryAction || secondaryAction) && (
            <div className="mt-3.5 flex flex-wrap gap-2">
              {primaryAction && onPrimary && (
                <button
                  type="button"
                  onClick={() => { onPrimary(); dismiss(id); }}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-violet-500/30 bg-violet-500/15 px-3.5 py-1.5 text-[11px] font-semibold text-violet-100 transition hover:bg-violet-500/22"
                >
                  {primaryAction}
                  <ArrowRight className="h-3 w-3" />
                </button>
              )}
              {secondaryAction && onSecondary && (
                <button
                  type="button"
                  onClick={() => { onSecondary(); dismiss(id); }}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.04] px-3.5 py-1.5 text-[11px] font-medium text-zinc-300 transition hover:bg-white/[0.07]"
                >
                  {secondaryAction}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── ActionHint ─────────────────────────────────────────────────────────────
// Post-action hint: shown AFTER something completes to tell user what to do next.

interface ActionHintProps {
  id: string;
  /** List of "next step" bullets */
  steps: { label: string; action?: string; onClick?: () => void }[];
  heading?: string;
  when?: boolean;
  className?: string;
}

export function ActionHint({
  id,
  steps,
  heading = 'What to do next',
  when = true,
  className = '',
}: ActionHintProps) {
  const { isDismissed, dismiss } = useGuide();
  const [visible, setVisible] = useState(false);

  // Brief entrance delay so it doesn't appear before the triggering action settles
  useEffect(() => {
    if (!when || isDismissed(id)) return;
    const t = setTimeout(() => setVisible(true), 300);
    return () => clearTimeout(t);
  }, [when, isDismissed, id]);

  if (!when || isDismissed(id) || !visible) return null;

  return (
    <div
      className={`rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.06] px-4 py-4 transition-all duration-300 ${className}`}
    >
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <ChevronRight className="h-3.5 w-3.5 text-emerald-400" />
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-300/80">{heading}</p>
        </div>
        <button
          type="button"
          onClick={() => dismiss(id)}
          aria-label="Dismiss"
          className="rounded-md p-0.5 text-zinc-600 hover:text-zinc-400 transition-colors"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <ol className="space-y-2">
        {steps.map((step, i) => (
          <li key={i} className="flex items-center gap-2.5">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-emerald-500/25 bg-emerald-500/10 text-[9px] font-bold text-emerald-300">
              {i + 1}
            </span>
            {step.onClick ? (
              <button
                type="button"
                onClick={step.onClick}
                className="text-[12px] text-zinc-300 hover:text-zinc-100 underline underline-offset-2 decoration-zinc-600 hover:decoration-zinc-400 transition-colors text-left"
              >
                {step.label}
              </button>
            ) : (
              <span className="text-[12px] text-zinc-400">{step.label}</span>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}

// ─── GuideTooltip ────────────────────────────────────────────────────────────
// Hover tooltip wrapping any element. Minimal, non-intrusive.

interface GuideTooltipProps {
  tip: string;
  children: React.ReactNode;
  side?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
}

export function GuideTooltip({ tip, children, side = 'top', className = '' }: GuideTooltipProps) {
  const [show, setShow] = useState(false);
  const positionClass =
    side === 'top'
      ? 'bottom-full left-1/2 -translate-x-1/2 mb-2'
      : side === 'bottom'
        ? 'top-full left-1/2 -translate-x-1/2 mt-2'
        : side === 'left'
          ? 'right-full top-1/2 -translate-y-1/2 mr-2'
          : 'left-full top-1/2 -translate-y-1/2 ml-2';

  return (
    <div
      className={`relative inline-flex ${className}`}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
      onFocus={() => setShow(true)}
      onBlur={() => setShow(false)}
    >
      {children}
      {show && (
        <div
          role="tooltip"
          className={`pointer-events-none absolute z-50 w-max max-w-[220px] rounded-xl border border-white/[0.1] bg-zinc-900/95 px-3 py-2 text-[11px] leading-snug text-zinc-200 shadow-xl backdrop-blur-sm ${positionClass}`}
        >
          {tip}
        </div>
      )}
    </div>
  );
}

// ─── EmptyStateGuide ─────────────────────────────────────────────────────────
// Used inside empty desk states to give direction.

interface EmptyStateGuideProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyStateGuide({
  icon,
  title,
  description,
  action,
  onAction,
  className = '',
}: EmptyStateGuideProps) {
  return (
    <div className={`flex flex-col items-center gap-4 rounded-2xl border border-dashed border-white/[0.1] bg-white/[0.02] px-6 py-10 text-center ${className}`}>
      {icon && (
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.04]">
          {icon}
        </div>
      )}
      <div>
        <p className="text-[13px] font-semibold text-zinc-300">{title}</p>
        <p className="mt-1.5 max-w-xs text-[12px] leading-relaxed text-zinc-500">{description}</p>
      </div>
      {action && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="inline-flex items-center gap-1.5 rounded-xl border border-violet-500/30 bg-violet-500/12 px-4 py-2 text-[12px] font-semibold text-violet-100 transition hover:bg-violet-500/20"
        >
          {action}
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

// ─── ProgressTrail ──────────────────────────────────────────────────────────
// Compact step-by-step flow indicator. Shows where the user is in a workflow.

interface ProgressStep {
  label: string;
  done: boolean;
  active?: boolean;
}

interface ProgressTrailProps {
  steps: ProgressStep[];
  className?: string;
}

export function ProgressTrail({ steps, className = '' }: ProgressTrailProps) {
  return (
    <div className={`flex items-center gap-0 ${className}`}>
      {steps.map((step, i) => (
        <React.Fragment key={i}>
          <div className="flex items-center gap-1.5">
            <div
              className={`flex h-5 w-5 items-center justify-center rounded-full border text-[9px] font-bold transition-colors ${
                step.done
                  ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300'
                  : step.active
                    ? 'border-sky-500/40 bg-sky-500/15 text-sky-300'
                    : 'border-white/[0.1] bg-white/[0.04] text-zinc-600'
              }`}
            >
              {step.done ? '✓' : i + 1}
            </div>
            <span
              className={`text-[10px] font-medium transition-colors ${
                step.done
                  ? 'text-emerald-400/70'
                  : step.active
                    ? 'text-sky-300'
                    : 'text-zinc-600'
              }`}
            >
              {step.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div className={`mx-2 h-px w-6 transition-colors ${step.done ? 'bg-emerald-500/30' : 'bg-white/[0.07]'}`} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}
