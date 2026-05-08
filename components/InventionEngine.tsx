'use client';

/**
 * Invention Engine — AI Execution & Engineering Intelligence Platform
 *
 * Transforms raw human ideas into structured, executable engineering pathways.
 * Dual-agent: Claude (architecture + strategy) + GPT-4o (code + technical).
 * Theme: Perplexity Pro — flat dark, zero glass, professional.
 */

import React, { useState, useRef, useCallback, FormEvent } from 'react';
import {
  Search, Zap, Code2, Map, AlertTriangle, ChevronRight,
  Cpu, Rocket, Globe, Activity, Layers, Bot, FlaskConical,
  Terminal, Copy, Check, RefreshCw, ArrowRight, Lightbulb,
  BarChart3, Shield, Clock,
} from 'lucide-react';
import type {
  InventionResult, InventionSystem, InventionPhase,
  InventionRisk, InventionCodeFile,
} from '@/app/api/invention/route';

// ── Constants ─────────────────────────────────────────────────────────────────

const DOMAINS = [
  { id: 'all',        label: 'All',         icon: Globe },
  { id: 'aerospace',  label: 'Aerospace',   icon: Rocket },
  { id: 'software',   label: 'Software',    icon: Code2 },
  { id: 'hardware',   label: 'Hardware',    icon: Cpu },
  { id: 'biotech',    label: 'Biotech',     icon: FlaskConical },
  { id: 'robotics',   label: 'Robotics',    icon: Bot },
  { id: 'energy',     label: 'Energy',      icon: Zap },
  { id: 'ai',         label: 'AI / ML',     icon: Activity },
];

const SUGGESTIONS = [
  { icon: Rocket,      label: 'Reusable rocket booster', idea: 'Design a reusable orbital rocket booster with autonomous landing capability, including flight control software, propulsion system, and ground support infrastructure.' },
  { icon: Bot,         label: 'Autonomous drone fleet',  idea: 'Build an autonomous drone delivery fleet platform with real-time path planning, collision avoidance, fleet management, and regulatory compliance systems.' },
  { icon: Activity,    label: 'Brain-computer interface', idea: 'Create a non-invasive brain-computer interface system for motor rehabilitation, including signal acquisition hardware, neural decoding algorithms, and feedback actuation.' },
  { icon: Zap,         label: 'Smart grid AI system',    idea: 'Design an AI-powered smart energy grid management system with demand forecasting, renewable integration, real-time load balancing, and anomaly detection.' },
  { icon: FlaskConical,label: 'Drug discovery pipeline', idea: 'Build an AI-assisted drug discovery platform combining molecular simulation, protein folding prediction, ADMET screening, and clinical trial optimization.' },
  { icon: Code2,       label: 'AGI reasoning engine',    idea: 'Architect a multi-modal reasoning engine capable of cross-domain knowledge synthesis, causal inference, and long-horizon planning with explainability.' },
];

const COMPLEXITY_COLOR: Record<string, string> = {
  low:     'rgba(52,211,153,0.80)',
  medium:  'rgba(251,191,36,0.80)',
  high:    'rgba(251,113,133,0.80)',
  extreme: 'rgba(239,68,68,0.90)',
};

const SEVERITY_COLOR: Record<string, string> = {
  low:      'rgba(52,211,153,0.75)',
  medium:   'rgba(251,191,36,0.75)',
  high:     'rgba(251,113,133,0.75)',
  critical: 'rgba(239,68,68,0.90)',
};

const LAYER_COLOR: Record<string, string> = {
  hardware:  'rgba(251,191,36,0.15)',
  firmware:  'rgba(249,115,22,0.15)',
  software:  'rgba(99,102,241,0.15)',
  cloud:     'rgba(56,189,248,0.15)',
  ai:        'rgba(167,139,250,0.15)',
  physical:  'rgba(52,211,153,0.15)',
  interface: 'rgba(232,121,249,0.15)',
};

// ── Sub-components ─────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.28em]"
       style={{ color: 'rgba(255,255,255,0.22)' }}>
      {children}
    </p>
  );
}

function Divider() {
  return <div className="my-6 h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />;
}

function SystemCard({ s }: { s: InventionSystem }) {
  return (
    <div className="rounded-xl px-4 py-3"
         style={{ background: LAYER_COLOR[s.layer] ?? 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="text-[12px] font-semibold" style={{ color: '#f2f2f5' }}>{s.name}</span>
        <span className="rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide"
              style={{ background: 'rgba(255,255,255,0.06)', color: COMPLEXITY_COLOR[s.complexity] }}>
          {s.complexity}
        </span>
      </div>
      <p className="text-[11px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.45)' }}>{s.purpose}</p>
      <span className="mt-2 inline-block rounded px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider"
            style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.28)' }}>
        {s.layer}
      </span>
    </div>
  );
}

function PhaseRow({ p }: { p: InventionPhase }) {
  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold"
             style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.50)', border: '1px solid rgba(255,255,255,0.08)' }}>
          {p.phase}
        </div>
        <div className="mt-1 flex-1 w-px" style={{ background: 'rgba(255,255,255,0.06)', minHeight: 24 }} />
      </div>
      <div className="pb-6 min-w-0 flex-1">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-[13px] font-semibold" style={{ color: '#f2f2f5' }}>{p.title}</span>
          <span className="flex items-center gap-1 text-[10px]" style={{ color: 'rgba(255,255,255,0.28)' }}>
            <Clock className="h-3 w-3" />{p.duration}
          </span>
        </div>
        <ul className="mb-2 space-y-1">
          {p.tasks.map((t, i) => (
            <li key={i} className="flex items-start gap-2 text-[12px]" style={{ color: 'rgba(255,255,255,0.45)' }}>
              <ChevronRight className="mt-0.5 h-3 w-3 shrink-0" style={{ color: 'rgba(255,255,255,0.20)' }} />
              {t}
            </li>
          ))}
        </ul>
        <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-medium"
              style={{ background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.18)', color: 'rgba(52,211,153,0.85)' }}>
          <Check className="h-2.5 w-2.5" /> {p.milestone}
        </span>
      </div>
    </div>
  );
}

function RiskRow({ r }: { r: InventionRisk }) {
  return (
    <div className="flex gap-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
      <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md mt-0.5"
           style={{ background: 'rgba(255,255,255,0.04)' }}>
        <AlertTriangle className="h-3 w-3" style={{ color: SEVERITY_COLOR[r.severity] }} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-[12px] font-semibold" style={{ color: '#f2f2f5' }}>{r.area}</span>
          <span className="rounded px-1.5 py-0.5 text-[9px] font-bold uppercase"
                style={{ background: 'rgba(255,255,255,0.05)', color: SEVERITY_COLOR[r.severity] }}>
            {r.severity}
          </span>
        </div>
        <p className="text-[12px]" style={{ color: 'rgba(255,255,255,0.40)' }}>{r.risk}</p>
        <p className="mt-1 text-[11px]" style={{ color: 'rgba(52,211,153,0.70)' }}>↳ {r.mitigation}</p>
      </div>
    </div>
  );
}

function CodeBlock({ file }: { file: InventionCodeFile }) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(file.code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="overflow-hidden rounded-xl" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
      {/* File header */}
      <div className="flex items-center justify-between gap-3 px-4 py-2.5"
           style={{ background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="flex items-center gap-2.5 min-w-0">
          <Terminal className="h-3.5 w-3.5 shrink-0" style={{ color: 'rgba(255,255,255,0.30)' }} />
          <span className="font-mono text-[12px] truncate" style={{ color: 'rgba(255,255,255,0.65)' }}>{file.filename}</span>
          <span className="shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase"
                style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.30)' }}>
            {file.language}
          </span>
        </div>
        <button onClick={copy} className="flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-medium transition hover:bg-white/[0.06]"
                style={{ color: 'rgba(255,255,255,0.30)' }}>
          {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      {/* Purpose */}
      <div className="px-4 py-2" style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.35)' }}>{file.purpose}</p>
      </div>
      {/* Code */}
      <pre className="overflow-x-auto px-4 py-4 font-mono text-[12px] leading-relaxed"
           style={{ background: '#0a0a0b', color: 'rgba(255,255,255,0.70)', maxHeight: 420 }}>
        <code>{file.code}</code>
      </pre>
    </div>
  );
}

function ProviderBadge({ claude, gpt }: { claude: boolean; gpt: boolean }) {
  return (
    <div className="flex items-center gap-2">
      {claude && (
        <span className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-medium"
              style={{ background: 'rgba(255,165,0,0.08)', border: '1px solid rgba(255,165,0,0.18)', color: 'rgba(255,165,0,0.80)' }}>
          <span className="h-1.5 w-1.5 rounded-full bg-orange-400" />Claude
        </span>
      )}
      {gpt && (
        <span className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-medium"
              style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.18)', color: 'rgba(16,185,129,0.80)' }}>
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />GPT-4o
        </span>
      )}
    </div>
  );
}

// ── Result View ────────────────────────────────────────────────────────────────

type ResultTab = 'intelligence' | 'architecture' | 'code' | 'roadmap' | 'risks';

function ResultView({ result, idea, onReset }: { result: InventionResult; idea: string; onReset: () => void }) {
  const [tab, setTab] = useState<ResultTab>('intelligence');

  const TABS: { id: ResultTab; label: string; icon: React.ElementType }[] = [
    { id: 'intelligence', label: 'Intelligence',  icon: Lightbulb },
    { id: 'architecture', label: 'Architecture',  icon: Layers },
    { id: 'code',         label: 'Code Engine',   icon: Code2 },
    { id: 'roadmap',      label: 'Roadmap',       icon: Map },
    { id: 'risks',        label: 'Risk Register', icon: Shield },
  ];

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Result header */}
      <div className="shrink-0 px-6 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.24em] mb-1"
               style={{ color: 'rgba(255,255,255,0.22)' }}>Execution Map</p>
            <h2 className="text-[16px] font-semibold leading-snug line-clamp-2"
                style={{ color: '#f2f2f5' }}>{idea}</h2>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <ProviderBadge claude={result.providers.claude} gpt={result.providers.gpt} />
            <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.20)' }}>
              {(result.durationMs / 1000).toFixed(1)}s
            </span>
            <button onClick={onReset}
                    className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-medium transition hover:bg-white/[0.05]"
                    style={{ color: 'rgba(255,255,255,0.35)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <RefreshCw className="h-3 w-3" /> New
            </button>
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex items-center gap-1 overflow-x-auto pb-0">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setTab(id)}
                    className="flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-medium transition"
                    style={{
                      background: tab === id ? 'rgba(255,255,255,0.08)' : 'transparent',
                      color: tab === id ? '#f2f2f5' : 'rgba(255,255,255,0.35)',
                    }}>
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">

        {/* ── INTELLIGENCE ─────────────────────────────────────────────── */}
        {tab === 'intelligence' && (
          <div className="max-w-2xl space-y-6">
            <div>
              <SectionLabel>Concept Analysis · Claude</SectionLabel>
              <p className="text-[14px] leading-[1.8]" style={{ color: 'rgba(255,255,255,0.72)' }}>
                {result.concept}
              </p>
            </div>

            <Divider />

            <div>
              <SectionLabel>Core Systems · {result.systems.length} identified</SectionLabel>
              <div className="grid gap-3 sm:grid-cols-2">
                {result.systems.map((s, i) => <SystemCard key={i} s={s} />)}
              </div>
            </div>

            {result.nextStep && (
              <>
                <Divider />
                <div className="flex items-start gap-3 rounded-xl px-4 py-3.5"
                     style={{ background: 'rgba(52,211,153,0.06)', border: '1px solid rgba(52,211,153,0.14)' }}>
                  <ArrowRight className="mt-0.5 h-4 w-4 shrink-0" style={{ color: 'rgba(52,211,153,0.80)' }} />
                  <div>
                    <p className="mb-1 text-[9px] font-bold uppercase tracking-[0.22em]"
                       style={{ color: 'rgba(52,211,153,0.60)' }}>First Move</p>
                    <p className="text-[13px] leading-snug" style={{ color: 'rgba(255,255,255,0.75)' }}>
                      {result.nextStep}
                    </p>
                  </div>
                </div>
              </>
            )}

            {/* Tech Stack quick view */}
            {result.techStack.length > 0 && (
              <>
                <Divider />
                <div>
                  <SectionLabel>Technology Stack</SectionLabel>
                  <div className="space-y-0">
                    {result.techStack.map((t, i) => (
                      <div key={i} className="flex items-start gap-4 py-2.5"
                           style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <span className="w-28 shrink-0 text-[10px] font-medium uppercase tracking-wider"
                              style={{ color: 'rgba(255,255,255,0.25)' }}>{t.category}</span>
                        <span className="w-36 shrink-0 text-[12px] font-semibold" style={{ color: '#f2f2f5' }}>{t.name}</span>
                        <span className="text-[12px]" style={{ color: 'rgba(255,255,255,0.38)' }}>{t.reason}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── ARCHITECTURE ─────────────────────────────────────────────── */}
        {tab === 'architecture' && (
          <div className="max-w-2xl">
            <SectionLabel>System Architecture · Claude Intelligence</SectionLabel>
            {result.architecture ? (
              <div className="space-y-4">
                {result.architecture.split('\n\n').filter(Boolean).map((para, i) => (
                  <p key={i} className="text-[13px] leading-[1.85]"
                     style={{ color: 'rgba(255,255,255,0.62)' }}>{para}</p>
                ))}
              </div>
            ) : (
              <p style={{ color: 'rgba(255,255,255,0.30)' }}>Architecture data unavailable.</p>
            )}

            {result.systems.length > 0 && (
              <>
                <Divider />
                <SectionLabel>Subsystem Map</SectionLabel>
                <div className="grid gap-3 sm:grid-cols-2">
                  {result.systems.map((s, i) => <SystemCard key={i} s={s} />)}
                </div>
              </>
            )}
          </div>
        )}

        {/* ── CODE ENGINE ──────────────────────────────────────────────── */}
        {tab === 'code' && (
          <div className="max-w-3xl space-y-5">
            <div className="flex items-center justify-between">
              <SectionLabel>Code Scaffolds · GPT-4o</SectionLabel>
              <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.20)' }}>
                {result.codeFiles.length} file{result.codeFiles.length !== 1 ? 's' : ''} generated
              </span>
            </div>

            {result.codeFiles.length > 0 ? (
              result.codeFiles.map((f, i) => <CodeBlock key={i} file={f} />)
            ) : (
              <div className="flex flex-col items-center gap-3 py-16 text-center">
                <Code2 className="h-8 w-8" style={{ color: 'rgba(255,255,255,0.12)' }} />
                <p style={{ color: 'rgba(255,255,255,0.28)' }}>Code generation unavailable — check OpenAI API key.</p>
              </div>
            )}

            {result.setupInstructions && (
              <>
                <Divider />
                <div>
                  <SectionLabel>Setup & Dependencies</SectionLabel>
                  <div className="rounded-xl px-4 py-4"
                       style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                    <pre className="whitespace-pre-wrap font-mono text-[12px] leading-relaxed"
                         style={{ color: 'rgba(255,255,255,0.55)' }}>
                      {result.setupInstructions}
                    </pre>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── ROADMAP ──────────────────────────────────────────────────── */}
        {tab === 'roadmap' && (
          <div className="max-w-2xl">
            <SectionLabel>Implementation Roadmap · {result.roadmap.length} phases</SectionLabel>
            {result.roadmap.length > 0 ? (
              <div>
                {result.roadmap.map((p, i) => <PhaseRow key={i} p={p} />)}
              </div>
            ) : (
              <p style={{ color: 'rgba(255,255,255,0.30)' }}>Roadmap unavailable.</p>
            )}
          </div>
        )}

        {/* ── RISKS ────────────────────────────────────────────────────── */}
        {tab === 'risks' && (
          <div className="max-w-2xl">
            <SectionLabel>Risk Register · {result.risks.length} items</SectionLabel>
            {result.risks.length > 0 ? (
              <div>
                {result.risks.map((r, i) => <RiskRow key={i} r={r} />)}
              </div>
            ) : (
              <p style={{ color: 'rgba(255,255,255,0.30)' }}>No risks identified.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Loading state ──────────────────────────────────────────────────────────────

function LoadingView({ idea }: { idea: string }) {
  const steps = [
    { label: 'Decomposing concept into subsystems',  icon: Layers,   done: true  },
    { label: 'Claude mapping system architecture',   icon: Lightbulb,done: true  },
    { label: 'GPT-4o generating code scaffolds',     icon: Code2,    done: false },
    { label: 'Synthesising execution roadmap',        icon: Map,      done: false },
    { label: 'Running risk analysis',                icon: Shield,   done: false },
  ];

  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-6 py-16">
      <div className="w-full max-w-md">
        <p className="mb-6 text-center text-[13px]" style={{ color: 'rgba(255,255,255,0.40)' }}>
          {idea.slice(0, 80)}{idea.length > 80 ? '…' : ''}
        </p>
        <div className="space-y-3">
          {steps.map((s, i) => {
            const Icon = s.icon;
            return (
              <div key={i} className="flex items-center gap-3">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
                     style={{ background: 'rgba(255,255,255,0.05)' }}>
                  <Icon className="h-3.5 w-3.5" style={{ color: 'rgba(255,255,255,0.30)' }} />
                </div>
                <p className="flex-1 text-[12px]" style={{ color: 'rgba(255,255,255,0.35)' }}>{s.label}</p>
                <div className="h-1.5 w-1.5 rounded-full"
                     style={{
                       background: 'rgba(255,255,255,0.20)',
                       animation: `pulse ${1.2 + i * 0.3}s ease-in-out ${i * 0.2}s infinite`,
                     }} />
              </div>
            );
          })}
        </div>
        <div className="mt-8 h-0.5 overflow-hidden rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
          <div className="h-full rounded-full"
               style={{
                 background: 'rgba(255,255,255,0.25)',
                 width: '60%',
                 animation: 'shimmer 2s ease-in-out infinite',
               }} />
        </div>
      </div>
      <style>{`
        @keyframes shimmer { 0%{width:15%} 50%{width:85%} 100%{width:15%} }
        @keyframes pulse   { 0%,100%{opacity:.2} 50%{opacity:1} }
      `}</style>
    </div>
  );
}

// ── Home / Search screen ───────────────────────────────────────────────────────

function HomeView({
  query, setQuery, activeDomain, setActiveDomain, onSubmit, loading,
}: {
  query: string;
  setQuery: (v: string) => void;
  activeDomain: string;
  setActiveDomain: (v: string) => void;
  onSubmit: () => void;
  loading: boolean;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSubmit(); }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-start pt-14 px-4">
      <div className="w-full max-w-2xl">

        {/* Brand */}
        <div className="mb-10 text-center">
          <h1 className="mb-2 text-[36px] font-semibold tracking-tight" style={{ color: '#f2f2f5' }}>
            invention<span className="font-light" style={{ color: 'rgba(255,255,255,0.40)' }}> engine</span>
          </h1>
          <p className="text-[14px]" style={{ color: 'rgba(255,255,255,0.32)' }}>
            Describe any idea. Get a complete engineering execution pathway.
          </p>
        </div>

        {/* Search box */}
        <div className="relative mb-4 overflow-hidden rounded-2xl"
             style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.10)' }}>
          <textarea
            ref={textareaRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Describe what you want to build..."
            rows={3}
            className="w-full resize-none bg-transparent px-5 pt-4 pb-2 text-[15px] outline-none placeholder:opacity-30"
            style={{ color: '#f2f2f5', minHeight: 90 }}
          />
          <div className="flex items-center justify-between gap-3 px-4 pb-3">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4" style={{ color: 'rgba(255,255,255,0.22)' }} />
              <span className="text-[11px]" style={{ color: 'rgba(255,255,255,0.18)' }}>
                Claude + GPT-4o · dual intelligence
              </span>
            </div>
            <button
              onClick={onSubmit}
              disabled={!query.trim() || loading}
              className="flex items-center gap-2 rounded-xl px-4 py-2 text-[13px] font-semibold transition hover:opacity-90 active:scale-[0.97] disabled:opacity-30"
              style={{ background: '#f2f2f5', color: '#0a0a0b' }}
            >
              <Zap className="h-3.5 w-3.5" />
              Analyze
            </button>
          </div>
        </div>

        {/* Domain pills */}
        <div className="mb-8 flex flex-wrap justify-center gap-2">
          {DOMAINS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveDomain(id)}
              className="flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12px] font-medium transition"
              style={{
                background: activeDomain === id ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.04)',
                border: '1px solid ' + (activeDomain === id ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.07)'),
                color: activeDomain === id ? '#f2f2f5' : 'rgba(255,255,255,0.38)',
              }}
            >
              <Icon className="h-3 w-3" />
              {label}
            </button>
          ))}
        </div>

        {/* Suggestions */}
        <p className="mb-3 text-center text-[11px] font-medium uppercase tracking-[0.18em]"
           style={{ color: 'rgba(255,255,255,0.18)' }}>
          Not sure where to start?
        </p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {SUGGESTIONS.map(({ icon: Icon, label, idea }) => (
            <button
              key={label}
              onClick={() => { setQuery(idea); textareaRef.current?.focus(); }}
              className="group flex items-center gap-3 rounded-xl px-4 py-3 text-left transition hover:bg-white/[0.04]"
              style={{ border: '1px solid rgba(255,255,255,0.07)' }}
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                   style={{ background: 'rgba(255,255,255,0.05)' }}>
                <Icon className="h-4 w-4" style={{ color: 'rgba(255,255,255,0.35)' }} />
              </div>
              <span className="text-[12px] font-medium transition-colors group-hover:text-white/80"
                    style={{ color: 'rgba(255,255,255,0.45)' }}>
                {label}
              </span>
            </button>
          ))}
        </div>

        {/* Footer note */}
        <div className="mt-10 flex items-center justify-center gap-6">
          {[
            { icon: BarChart3, text: 'System decomposition' },
            { icon: Code2,     text: 'Code generation' },
            { icon: Map,       text: 'Execution roadmap' },
          ].map(({ icon: Icon, text }) => (
            <div key={text} className="flex items-center gap-1.5">
              <Icon className="h-3.5 w-3.5" style={{ color: 'rgba(255,255,255,0.18)' }} />
              <span className="text-[11px]" style={{ color: 'rgba(255,255,255,0.22)' }}>{text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Root ───────────────────────────────────────────────────────────────────────

export function InventionEngine() {
  const [query,        setQuery]        = useState('');
  const [activeDomain, setActiveDomain] = useState('all');
  const [loading,      setLoading]      = useState(false);
  const [result,       setResult]       = useState<InventionResult | null>(null);
  const [submittedIdea,setSubmittedIdea]= useState('');
  const [error,        setError]        = useState<string | null>(null);

  const submit = useCallback(async () => {
    if (!query.trim() || loading) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setSubmittedIdea(query.trim());

    try {
      const res = await fetch('/api/invention', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idea: query.trim(), domain: activeDomain }),
      });
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const data: InventionResult = await res.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed');
    } finally {
      setLoading(false);
    }
  }, [query, activeDomain, loading]);

  const reset = () => {
    setResult(null);
    setQuery('');
    setSubmittedIdea('');
    setError(null);
  };

  return (
    <div className="flex h-full min-h-0 flex-col" style={{ background: '#0f0f10', color: '#f2f2f5' }}>

      {/* Top navigation — always visible */}
      <div className="shrink-0 flex items-center justify-between gap-4 px-6 py-3"
           style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-3">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg"
               style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <Zap className="h-4 w-4" style={{ color: 'rgba(255,255,255,0.65)' }} />
          </div>
          <span className="text-[14px] font-semibold tracking-tight" style={{ color: '#f2f2f5' }}>
            Invention Engine
          </span>
          <span className="hidden text-[10px] font-bold uppercase tracking-[0.18em] sm:inline"
                style={{ color: 'rgba(255,255,255,0.20)' }}>
            AI Execution Platform
          </span>
        </div>

        <div className="hidden items-center gap-1 sm:flex">
          {DOMAINS.slice(1).map(({ id, label }) => (
            <button
              key={id}
              onClick={() => { setActiveDomain(id); if (result) reset(); }}
              className="rounded-lg px-3 py-1.5 text-[12px] font-medium transition hover:bg-white/[0.05]"
              style={{ color: activeDomain === id ? '#f2f2f5' : 'rgba(255,255,255,0.32)' }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Body */}
      {loading ? (
        <LoadingView idea={submittedIdea} />
      ) : result ? (
        <ResultView result={result} idea={submittedIdea} onReset={reset} />
      ) : (
        <>
          {error && (
            <div className="mx-auto mt-4 flex max-w-2xl items-center gap-3 rounded-xl px-4 py-3 w-full"
                 style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.18)' }}>
              <AlertTriangle className="h-4 w-4 shrink-0" style={{ color: 'rgba(239,68,68,0.80)' }} />
              <p className="text-[12px]" style={{ color: 'rgba(255,255,255,0.55)' }}>{error}</p>
              <button onClick={() => setError(null)} className="ml-auto text-[11px] hover:opacity-70"
                      style={{ color: 'rgba(255,255,255,0.30)' }}>Dismiss</button>
            </div>
          )}
          <HomeView
            query={query} setQuery={setQuery}
            activeDomain={activeDomain} setActiveDomain={setActiveDomain}
            onSubmit={submit} loading={loading}
          />
        </>
      )}
    </div>
  );
}
