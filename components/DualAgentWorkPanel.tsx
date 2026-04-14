'use client';

/**
 * DualAgentWorkPanel
 *
 * Visible proof of both agents working TOGETHER:
 * - Left column: GPT-4o-mini (Execution Architect) — blue
 * - Right column: Claude Haiku (Strategic Analyst) — amber/orange
 * - Centre: Synthesis status + merged output
 *
 * Props control whether agents are idle, thinking, or done.
 */

import React, { useEffect, useState, useRef } from 'react';
import { Bot, Cpu, Zap, CheckCircle2, AlertCircle, ArrowLeftRight, Sparkles, Clock } from 'lucide-react';

export type AgentStatus = 'idle' | 'thinking' | 'done' | 'error';

export interface DualAgentPanelState {
  gpt: {
    status: AgentStatus;
    label?: string;
    excerpt?: string;
  };
  claude: {
    status: AgentStatus;
    label?: string;
    excerpt?: string;
  };
  synthesis: {
    status: AgentStatus;
    label?: string;
  };
  durationMs?: number;
  /** When was the last sync completed */
  lastRunAt?: string;
}

interface Props {
  state: DualAgentPanelState;
  className?: string;
  /** Compact mode — smaller text, tighter padding */
  compact?: boolean;
}

function PulsingDot({ color }: { color: string }) {
  return (
    <span className="relative flex h-2 w-2">
      <span
        className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${color}`}
      />
      <span className={`relative inline-flex h-2 w-2 rounded-full ${color}`} />
    </span>
  );
}

function AgentStatusIcon({ status }: { status: AgentStatus }) {
  if (status === 'thinking') return <PulsingDot color="bg-zinc-400" />;
  if (status === 'done') return <CheckCircle2 className="h-3.5 w-3.5 text-zinc-300" />;
  if (status === 'error') return <AlertCircle className="h-3.5 w-3.5 text-red-400" />;
  return <span className="h-2 w-2 rounded-full bg-zinc-600" />;
}

function statusLabel(status: AgentStatus): string {
  if (status === 'thinking') return 'Processing…';
  if (status === 'done') return 'Complete';
  if (status === 'error') return 'Failed';
  return 'Waiting';
}

function StatusBadge({ status }: { status: AgentStatus }) {
  const map: Record<AgentStatus, string> = {
    idle: 'bg-zinc-800 text-zinc-500',
    thinking: 'bg-zinc-800/90 text-zinc-300 border border-zinc-700',
    done: 'bg-zinc-800/80 text-zinc-200 border border-zinc-600',
    error: 'bg-red-500/12 text-red-400 border border-red-500/20',
  };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${map[status]}`}>
      <AgentStatusIcon status={status} />
      {statusLabel(status)}
    </span>
  );
}

/** Animated "thinking" dots */
function ThinkingAnimation() {
  const [frame, setFrame] = useState(0);
  const ref = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    ref.current = setInterval(() => setFrame((f) => (f + 1) % 4), 400);
    return () => { if (ref.current) clearInterval(ref.current); };
  }, []);
  const dots = ['·', '· ·', '· · ·', '· · · ·'][frame];
  return <span className="text-zinc-500 text-xs font-mono">{dots}</span>;
}

/** One agent column */
function AgentColumn({
  agentKey,
  icon,
  name,
  model,
  role,
  status,
  excerpt,
  accent,
}: {
  agentKey: 'gpt' | 'claude';
  icon: React.ReactNode;
  name: string;
  model: string;
  role: string;
  status: AgentStatus;
  excerpt?: string;
  accent: {
    border: string;
    bg: string;
    text: string;
    iconBg: string;
    ring: string;
  };
}) {
  return (
    <div
      className={`flex-1 min-w-0 rounded-2xl border ${accent.border} ${accent.bg} px-4 py-3.5 flex flex-col gap-2.5 transition-all duration-300`}
    >
      {/* Header */}
      <div className="flex items-center gap-2.5">
        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${accent.iconBg} ring-1 ${accent.ring}`}>
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className={`text-[11px] font-semibold tracking-wide ${accent.text}`}>{name}</p>
          <p className="text-[9px] text-zinc-500 font-mono truncate">{model}</p>
        </div>
        <StatusBadge status={status} />
      </div>

      {/* Role chip */}
      <div className="flex items-center gap-1.5">
        <span className="text-[9px] font-semibold uppercase tracking-[0.14em] text-zinc-600">Role</span>
        <span className={`text-[10px] font-medium ${accent.text} opacity-80`}>{role}</span>
      </div>

      {/* Content area */}
      <div className="min-h-[48px] rounded-xl border border-zinc-800/80 bg-zinc-950/50 px-3 py-2.5">
        {status === 'thinking' ? (
          <div className="flex items-center gap-2">
            <ThinkingAnimation />
            <span className="text-[11px] text-zinc-500">Analyzing venture…</span>
          </div>
        ) : status === 'done' && excerpt ? (
          <p className="text-[11px] leading-relaxed text-zinc-300 line-clamp-4">{excerpt}</p>
        ) : status === 'error' ? (
          <p className="text-[11px] text-red-400/80">Agent unavailable — check API key.</p>
        ) : (
          <p className="text-[11px] text-zinc-600 italic">Waiting to start…</p>
        )}
      </div>
    </div>
  );
}

export function DualAgentWorkPanel({ state, className = '', compact = false }: Props) {
  const { gpt, claude, synthesis, durationMs, lastRunAt } = state;

  const bothDone = gpt.status === 'done' && claude.status === 'done';
  const anyThinking = gpt.status === 'thinking' || claude.status === 'thinking';
  const anyDone = gpt.status === 'done' || claude.status === 'done';

  return (
       <div className={`rounded-2xl border border-zinc-800/90 bg-zinc-950/50 px-4 py-4 ${compact ? 'gap-3' : 'gap-4'} flex flex-col ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900/80">
            <Sparkles className="h-4 w-4 text-zinc-400" />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-400">Claude × GPT</p>
            <p className="text-[10px] text-zinc-600">
              {anyThinking
                ? 'Both model routes in parallel…'
                : bothDone
                  ? 'Synthesis complete'
                  : 'Dual-model staff sync'}
            </p>
          </div>
        </div>
        {durationMs !== undefined && durationMs > 0 && (
          <div className="flex items-center gap-1 text-zinc-600">
            <Clock className="h-3 w-3" />
            <span className="text-[10px] font-mono">{(durationMs / 1000).toFixed(1)}s</span>
          </div>
        )}
      </div>

      {/* Live status bar */}
      {anyThinking && (
        <div className="flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/40 px-3 py-2">
          <PulsingDot color="bg-zinc-400" />
          <span className="text-[11px] text-zinc-400">
            {gpt.status === 'thinking' && claude.status === 'thinking'
              ? 'GPT and Claude routes working together…'
              : gpt.status === 'thinking'
                ? 'GPT route finalizing…'
                : 'Claude route finalizing…'}
          </span>
        </div>
      )}

      {/* Two-column agent layout */}
      <div className="flex gap-3">
        <AgentColumn
          agentKey="gpt"
          icon={<Cpu className="h-4 w-4 text-zinc-400" />}
          name="GPT route"
          model="gpt-4o-mini"
          role={gpt.label ?? 'Execution Architect'}
          status={gpt.status}
          excerpt={gpt.excerpt}
          accent={{
            border: 'border-zinc-800/90',
            bg: 'bg-zinc-950/40',
            text: 'text-zinc-300',
            iconBg: 'bg-zinc-900/80',
            ring: 'ring-zinc-800',
          }}
        />

        {/* Separator with exchange icon */}
        <div className="flex items-center justify-center">
          <div
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border transition-all duration-500 ${
              bothDone
                ? 'border-zinc-600 bg-zinc-800/80'
                : anyThinking
                  ? 'border-zinc-700 bg-zinc-900/60'
                  : 'border-zinc-800 bg-zinc-950/50'
            }`}
          >
            <ArrowLeftRight
              className={`h-3.5 w-3.5 transition-colors ${
                bothDone ? 'text-zinc-300' : anyThinking ? 'text-zinc-500' : 'text-zinc-700'
              }`}
            />
          </div>
        </div>

        <AgentColumn
          agentKey="claude"
          icon={<Bot className="h-4 w-4 text-zinc-400" />}
          name="Claude route"
          model="claude-haiku-4-5"
          role={claude.label ?? 'Strategic Analyst'}
          status={claude.status}
          excerpt={claude.excerpt}
          accent={{
            border: 'border-zinc-800/90',
            bg: 'bg-zinc-950/40',
            text: 'text-zinc-300',
            iconBg: 'bg-zinc-900/80',
            ring: 'ring-zinc-800',
          }}
        />
      </div>

      {/* Synthesis row */}
      {anyDone && (
        <div
          className={`rounded-xl border px-3.5 py-2.5 flex items-center gap-3 transition-all duration-300 ${
            synthesis.status === 'done'
              ? 'border-zinc-600 bg-zinc-900/50'
              : synthesis.status === 'thinking'
                ? 'border-zinc-800 bg-zinc-950/50'
                : 'border-zinc-800 bg-zinc-950/40'
          }`}
        >
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900/80">
            <Zap className="h-3.5 w-3.5 text-zinc-500" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Synthesis</p>
            <p className="text-[11px] text-zinc-300 truncate">
              {synthesis.label ??
                (synthesis.status === 'done'
                  ? 'Merged perspectives applied to all desks'
                  : synthesis.status === 'thinking'
                    ? 'Merging outputs…'
                    : 'Waiting for agents…')}
            </p>
          </div>
          <StatusBadge status={synthesis.status} />
        </div>
      )}

      {/* Last run timestamp */}
      {lastRunAt && !anyThinking && (
        <p className="text-[9px] text-zinc-700 text-right font-mono">
          Last run {new Date(lastRunAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
        </p>
      )}
    </div>
  );
}

/**
 * Hook: build DualAgentPanelState from live sync status.
 * Pass `running=true` during a sync, `result` when complete.
 */
export function useDualAgentPanelState(
  running: boolean,
  result: { dual_agent?: { gpt: boolean; claude: boolean; durationMs: number } } | null,
  lastRunAt: string | null
): DualAgentPanelState {
  const [state, setState] = useState<DualAgentPanelState>({
    gpt: { status: 'idle' },
    claude: { status: 'idle' },
    synthesis: { status: 'idle' },
  });
  
  // Use refs to track previous values and prevent infinite loops
  const prevRunningRef = useRef(running);
  const prevResultRef = useRef(result);
  const prevLastRunAtRef = useRef(lastRunAt);

  useEffect(() => {
    // Only update if values actually changed
    if (
      prevRunningRef.current === running &&
      prevResultRef.current === result &&
      prevLastRunAtRef.current === lastRunAt
    ) {
      return;
    }
    
    // Update refs
    prevRunningRef.current = running;
    prevResultRef.current = result;
    prevLastRunAtRef.current = lastRunAt;
    
    if (running) {
      setState({
        gpt: { status: 'thinking', label: 'Execution Staff' },
        claude: { status: 'thinking', label: 'Strategic Analyst' },
        synthesis: { status: 'idle' },
      });
    } else if (result) {
      const da = result.dual_agent;
      setState({
        gpt: {
          status: da?.gpt ? 'done' : 'error',
          label: 'Execution Staff',
          excerpt: da?.gpt ? 'Kanban tasks, events, and desk updates ready.' : undefined,
        },
        claude: {
          status: da?.claude ? 'done' : 'error',
          label: 'Strategic Analyst',
          excerpt: da?.claude ? 'Strategic signals and risk assessment merged.' : undefined,
        },
        synthesis: { status: da?.gpt || da?.claude ? 'done' : 'error' },
        durationMs: da?.durationMs,
        lastRunAt: lastRunAt ?? undefined,
      });
    } else {
      setState({
        gpt: { status: 'idle' },
        claude: { status: 'idle' },
        synthesis: { status: 'idle' },
      });
    }
  }, [running, result, lastRunAt]);

  return state;
}
