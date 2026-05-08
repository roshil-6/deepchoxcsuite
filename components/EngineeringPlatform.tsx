'use client';

import React, { useState, useCallback, useRef } from 'react';
import {
  ArrowRight, Copy, Check, ChevronRight, Zap, Globe, Cpu,
  Rocket, FlaskConical, Wifi, Factory, Layers, Bot,
  Code2, GitBranch, Cloud, FileText, ShieldCheck, RotateCcw,
  Play, AlertTriangle, CheckCircle2, XCircle, Clock,
} from 'lucide-react';
import type { OrchestrationResult, SystemNode, CodeFile, WorkflowPhase, DeploymentConfig, Risk } from '@/app/api/orchestrate/route';

// ── Local project storage ──────────────────────────────────────────────────────

export interface EngProject {
  id: string;
  title: string;
  idea: string;
  domain: string;
  result: OrchestrationResult | null;
  createdAt: number;
}

function loadProjects(): EngProject[] {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem('deepchox-eng-projects') : null;
    return raw ? (JSON.parse(raw) as EngProject[]) : [];
  } catch { return []; }
}

function saveProjects(projects: EngProject[]) {
  try { localStorage.setItem('deepchox-eng-projects', JSON.stringify(projects)); } catch { /* ignore */ }
}

// ── Domain config ──────────────────────────────────────────────────────────────

const DOMAINS = [
  { id: 'software',   label: 'Software',   icon: Code2         },
  { id: 'ai',         label: 'AI / ML',     icon: Bot           },
  { id: 'hardware',   label: 'Hardware',    icon: Cpu           },
  { id: 'robotics',   label: 'Robotics',    icon: Zap           },
  { id: 'aerospace',  label: 'Aerospace',   icon: Rocket        },
  { id: 'biotech',    label: 'Biotech',     icon: FlaskConical  },
  { id: 'iot',        label: 'IoT',         icon: Wifi          },
  { id: 'industrial', label: 'Industrial',  icon: Factory       },
  { id: 'web3',       label: 'Web3',        icon: Globe         },
  { id: 'saas',       label: 'SaaS',        icon: Layers        },
];

const SUGGESTIONS = [
  { label: 'Autonomous drone swarm coordination system',  domain: 'aerospace' },
  { label: 'Real-time AI vision pipeline for robotics',   domain: 'robotics'  },
  { label: 'Distributed IoT sensor mesh with edge AI',    domain: 'iot'       },
  { label: 'LLM-powered code review automation platform', domain: 'ai'        },
  { label: 'Smart grid optimization using reinforcement learning', domain: 'industrial' },
  { label: 'Decentralized AI inference marketplace',      domain: 'web3'      },
];

// ── Agent pipeline config ──────────────────────────────────────────────────────

const AGENTS = [
  { id: 'Planner',    label: 'Planner',    model: 'Claude',  desc: 'System decomposition',  wave: 1 },
  { id: 'Researcher', label: 'Researcher', model: 'GPT-4o',  desc: 'Technology research',   wave: 1 },
  { id: 'Architect',  label: 'Architect',  model: 'Claude',  desc: 'System architecture',   wave: 2 },
  { id: 'CodeGen',    label: 'Code Gen',   model: 'GPT-4o',  desc: 'Code generation',        wave: 2 },
  { id: 'Workflow',   label: 'Workflow',   model: 'Claude',  desc: 'Execution planning',    wave: 2 },
  { id: 'Deploy',     label: 'Deploy',     model: 'GPT-4o',  desc: 'Deployment configs',    wave: 3 },
  { id: 'Docs',       label: 'Docs',       model: 'Claude',  desc: 'Documentation',         wave: 3 },
  { id: 'Validator',  label: 'Validator',  model: 'Claude',  desc: 'Validation & scoring',  wave: 3 },
];

// ── Tabs ───────────────────────────────────────────────────────────────────────

type Tab = 'overview' | 'architecture' | 'code' | 'workflow' | 'deploy' | 'docs' | 'validation';

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'overview',     label: 'Overview',      icon: Layers      },
  { id: 'architecture', label: 'Architecture',  icon: GitBranch   },
  { id: 'code',         label: 'Code Engine',   icon: Code2       },
  { id: 'workflow',     label: 'Workflow',      icon: Clock       },
  { id: 'deploy',       label: 'Deploy',        icon: Cloud       },
  { id: 'docs',         label: 'Docs',          icon: FileText    },
  { id: 'validation',   label: 'Validation',    icon: ShieldCheck },
];

// ── Small shared components ────────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    void navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button
      onClick={copy}
      className="flex items-center gap-1 rounded px-2 py-1 text-xs transition-colors"
      style={{ color: 'rgba(255,255,255,0.35)', background: 'rgba(255,255,255,0.05)' }}
    >
      {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}

function Badge({ label, color = 'rgba(255,255,255,0.12)' }: { label: string; color?: string }) {
  return (
    <span
      className="rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
      style={{ background: color, color: 'rgba(255,255,255,0.70)' }}
    >
      {label}
    </span>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mb-4 text-xs font-semibold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.28)' }}>
      {children}
    </h3>
  );
}

function Prose({ children }: { children: React.ReactNode }) {
  return (
    <p className="leading-relaxed text-sm" style={{ color: 'rgba(255,255,255,0.70)' }}>
      {children}
    </p>
  );
}

// ── Complexity colors ──────────────────────────────────────────────────────────

const COMPLEXITY_COLOR: Record<string, string> = {
  low:     'rgba(52,211,153,0.25)',
  medium:  'rgba(251,191,36,0.25)',
  high:    'rgba(249,115,22,0.25)',
  extreme: 'rgba(239,68,68,0.25)',
};

const SEVERITY_COLOR: Record<string, string> = {
  low:      'rgba(52,211,153,0.20)',
  medium:   'rgba(251,191,36,0.20)',
  high:     'rgba(249,115,22,0.20)',
  critical: 'rgba(239,68,68,0.20)',
};

// ── Tab views ──────────────────────────────────────────────────────────────────

function OverviewTab({ result }: { result: OrchestrationResult }) {
  return (
    <div className="space-y-8">
      {/* Concept */}
      <section>
        <SectionTitle>Concept Analysis</SectionTitle>
        <div className="rounded-xl border p-5" style={{ borderColor: 'rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.02)' }}>
          <div className="mb-3 flex items-center gap-3">
            <Badge label={result.complexity} color={COMPLEXITY_COLOR[result.complexity]} />
            <span className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
              {result.systems.length} subsystems &middot; {result.techStack.length} technologies
            </span>
          </div>
          <Prose>{result.concept}</Prose>
        </div>
      </section>

      {/* Systems */}
      <section>
        <SectionTitle>System Decomposition</SectionTitle>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {result.systems.map((sys: SystemNode) => (
            <div
              key={sys.id}
              className="rounded-xl border p-4"
              style={{ borderColor: 'rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.02)' }}
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.85)' }}>{sys.name}</span>
                <span className="rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider" style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.40)' }}>
                  {sys.type}
                </span>
              </div>
              <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.45)' }}>{sys.description}</p>
              {sys.connections.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {sys.connections.map((c) => (
                    <span key={c} className="rounded px-1.5 py-0.5 text-[9px]" style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.30)' }}>
                      {c}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Tech Stack */}
      <section>
        <SectionTitle>Technology Stack</SectionTitle>
        {result.researchInsights && (
          <div className="mb-4 rounded-xl border p-4" style={{ borderColor: 'rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.02)' }}>
            <Prose>{result.researchInsights}</Prose>
          </div>
        )}
        <div className="space-y-2">
          {result.techStack.map((t, i) => (
            <div key={i} className="flex items-start gap-4 rounded-xl border px-4 py-3" style={{ borderColor: 'rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.015)' }}>
              <span className="mt-0.5 min-w-[90px] text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.28)' }}>{t.category}</span>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.85)' }}>{t.name}</span>
                  {t.version && <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.30)' }}>v{t.version}</span>}
                </div>
                <p className="mt-0.5 text-xs" style={{ color: 'rgba(255,255,255,0.45)' }}>{t.reason}</p>
                {t.alternatives?.length > 0 && (
                  <p className="mt-1 text-[10px]" style={{ color: 'rgba(255,255,255,0.25)' }}>
                    Alternatives: {t.alternatives.join(', ')}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Next step */}
      {result.nextStep && (
        <section>
          <SectionTitle>Recommended First Step</SectionTitle>
          <div className="flex items-start gap-3 rounded-xl border p-4" style={{ borderColor: 'rgba(255,255,255,0.10)', background: 'rgba(255,255,255,0.03)' }}>
            <ArrowRight className="mt-0.5 h-4 w-4 shrink-0" style={{ color: 'rgba(255,255,255,0.50)' }} />
            <Prose>{result.nextStep}</Prose>
          </div>
        </section>
      )}
    </div>
  );
}

function ArchitectureTab({ result }: { result: OrchestrationResult }) {
  return (
    <div className="space-y-8">
      <section>
        <SectionTitle>System Architecture</SectionTitle>
        <div className="rounded-xl border p-5" style={{ borderColor: 'rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.02)' }}>
          {result.architecture.split('\n').filter(Boolean).map((para, i) => (
            <Prose key={i}>{para}</Prose>
          ))}
        </div>
      </section>

      <section>
        <SectionTitle>Data Flow</SectionTitle>
        <div className="rounded-xl border p-5" style={{ borderColor: 'rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.02)' }}>
          {result.dataFlow.split('\n').filter(Boolean).map((para, i) => (
            <Prose key={i}>{para}</Prose>
          ))}
        </div>
      </section>

      {result.integrationPoints?.length > 0 && (
        <section>
          <SectionTitle>Integration Points</SectionTitle>
          <div className="grid gap-2 sm:grid-cols-2">
            {result.integrationPoints.map((pt, i) => (
              <div key={i} className="flex items-center gap-3 rounded-xl border px-4 py-3" style={{ borderColor: 'rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.015)' }}>
                <ChevronRight className="h-3.5 w-3.5 shrink-0" style={{ color: 'rgba(255,255,255,0.30)' }} />
                <span className="text-sm" style={{ color: 'rgba(255,255,255,0.70)' }}>{pt}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <SectionTitle>Scaling Strategy</SectionTitle>
        <div className="rounded-xl border p-5" style={{ borderColor: 'rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.02)' }}>
          {result.scalingStrategy.split('\n').filter(Boolean).map((para, i) => (
            <Prose key={i}>{para}</Prose>
          ))}
        </div>
      </section>
    </div>
  );
}

function CodeTab({ result }: { result: OrchestrationResult }) {
  const [activeFile, setActiveFile] = useState(0);
  const file: CodeFile | undefined = result.codeFiles[activeFile];

  return (
    <div className="space-y-6">
      {/* File tabs */}
      <div className="flex flex-wrap gap-2">
        {result.codeFiles.map((f: CodeFile, i: number) => (
          <button
            key={i}
            onClick={() => setActiveFile(i)}
            className="rounded-lg border px-3 py-1.5 text-xs transition-colors"
            style={{
              borderColor: activeFile === i ? 'rgba(255,255,255,0.20)' : 'rgba(255,255,255,0.07)',
              background: activeFile === i ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.02)',
              color: activeFile === i ? 'rgba(255,255,255,0.90)' : 'rgba(255,255,255,0.40)',
            }}
          >
            {f.path.split('/').pop()}
          </button>
        ))}
      </div>

      {file && (
        <div className="overflow-hidden rounded-xl border" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
          {/* Header */}
          <div className="flex items-center justify-between border-b px-4 py-3" style={{ borderColor: 'rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.03)' }}>
            <div>
              <span className="text-sm font-mono" style={{ color: 'rgba(255,255,255,0.75)' }}>{file.path}</span>
              <p className="mt-0.5 text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>{file.purpose}</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge label={file.language} />
              <CopyButton text={file.code} />
            </div>
          </div>
          {/* Code */}
          <div className="overflow-x-auto" style={{ background: 'rgba(0,0,0,0.35)' }}>
            <pre className="p-5 text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.78)', fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace" }}>
              <code>{file.code}</code>
            </pre>
          </div>
        </div>
      )}

      {/* Setup instructions */}
      {result.setupInstructions && (
        <div className="rounded-xl border p-5" style={{ borderColor: 'rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.02)' }}>
          <div className="mb-3 flex items-center justify-between">
            <SectionTitle>Setup Instructions</SectionTitle>
            <CopyButton text={result.setupInstructions} />
          </div>
          <pre className="whitespace-pre-wrap text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.65)', fontFamily: 'monospace' }}>
            {result.setupInstructions}
          </pre>
        </div>
      )}
    </div>
  );
}

function WorkflowTab({ result }: { result: OrchestrationResult }) {
  return (
    <div className="space-y-8">
      {result.estimatedTimeline && (
        <div className="flex items-center gap-3 rounded-xl border px-4 py-3" style={{ borderColor: 'rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)' }}>
          <Clock className="h-4 w-4 shrink-0" style={{ color: 'rgba(255,255,255,0.40)' }} />
          <span className="text-sm" style={{ color: 'rgba(255,255,255,0.70)' }}>{result.estimatedTimeline}</span>
        </div>
      )}

      <section>
        <SectionTitle>Execution Phases</SectionTitle>
        <div className="space-y-3">
          {result.phases.map((ph: WorkflowPhase) => (
            <div key={ph.phase} className="rounded-xl border p-5" style={{ borderColor: 'rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.02)' }}>
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                    style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.75)' }}
                  >
                    {ph.phase}
                  </span>
                  <span className="font-medium" style={{ color: 'rgba(255,255,255,0.88)' }}>{ph.title}</span>
                </div>
                <span className="shrink-0 text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>{ph.duration}</span>
              </div>

              <ul className="mb-3 space-y-1.5 pl-10">
                {ph.tasks.map((task, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm" style={{ color: 'rgba(255,255,255,0.55)' }}>
                    <ChevronRight className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{ color: 'rgba(255,255,255,0.25)' }} />
                    {task}
                  </li>
                ))}
              </ul>

              <div className="flex flex-wrap items-center gap-2 pl-10">
                <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.25)' }}>Milestone:</span>
                <span className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.55)' }}>{ph.milestone}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {result.criticalPath?.length > 0 && (
        <section>
          <SectionTitle>Critical Path</SectionTitle>
          <div className="flex flex-wrap gap-2">
            {result.criticalPath.map((item, i) => (
              <React.Fragment key={i}>
                <span className="rounded-lg border px-3 py-1.5 text-xs" style={{ borderColor: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.65)' }}>
                  {item}
                </span>
                {i < result.criticalPath.length - 1 && (
                  <ArrowRight className="h-4 w-4 self-center" style={{ color: 'rgba(255,255,255,0.20)' }} />
                )}
              </React.Fragment>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function DeployTab({ result }: { result: OrchestrationResult }) {
  const [activeConfig, setActiveConfig] = useState(0);
  const cfg: DeploymentConfig | undefined = result.deploymentConfigs[activeConfig];

  return (
    <div className="space-y-6">
      {result.cloudRecommendation && (
        <div className="rounded-xl border p-5" style={{ borderColor: 'rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.02)' }}>
          <SectionTitle>Cloud Recommendation</SectionTitle>
          {result.cloudRecommendation.split('\n').filter(Boolean).map((para, i) => (
            <Prose key={i}>{para}</Prose>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {result.deploymentConfigs.map((c: DeploymentConfig, i: number) => (
          <button
            key={i}
            onClick={() => setActiveConfig(i)}
            className="rounded-lg border px-3 py-1.5 text-xs transition-colors"
            style={{
              borderColor: activeConfig === i ? 'rgba(255,255,255,0.20)' : 'rgba(255,255,255,0.07)',
              background: activeConfig === i ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.02)',
              color: activeConfig === i ? 'rgba(255,255,255,0.90)' : 'rgba(255,255,255,0.40)',
            }}
          >
            {c.target}
          </button>
        ))}
      </div>

      {cfg && (
        <div className="overflow-hidden rounded-xl border" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
          <div className="flex items-center justify-between border-b px-4 py-3" style={{ borderColor: 'rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.03)' }}>
            <div>
              <span className="text-sm font-mono" style={{ color: 'rgba(255,255,255,0.75)' }}>{cfg.filename}</span>
              <p className="mt-0.5 text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>{cfg.description}</p>
            </div>
            <CopyButton text={cfg.content} />
          </div>
          <div className="overflow-x-auto" style={{ background: 'rgba(0,0,0,0.35)' }}>
            <pre className="p-5 text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.78)', fontFamily: "'JetBrains Mono', 'Fira Code', monospace" }}>
              <code>{cfg.content}</code>
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}

function DocsTab({ result }: { result: OrchestrationResult }) {
  const [view, setView] = useState<'readme' | 'api'>('readme');
  const content = view === 'readme' ? result.readme : result.apiDocs;

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {(['readme', 'api'] as const).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className="rounded-lg border px-4 py-1.5 text-xs font-medium transition-colors"
            style={{
              borderColor: view === v ? 'rgba(255,255,255,0.20)' : 'rgba(255,255,255,0.07)',
              background: view === v ? 'rgba(255,255,255,0.06)' : 'transparent',
              color: view === v ? 'rgba(255,255,255,0.90)' : 'rgba(255,255,255,0.40)',
            }}
          >
            {v === 'readme' ? 'README.md' : 'API Docs'}
          </button>
        ))}
        <CopyButton text={content} />
      </div>
      <div className="overflow-hidden rounded-xl border" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
        <pre className="overflow-x-auto p-6 text-xs leading-relaxed whitespace-pre-wrap" style={{ color: 'rgba(255,255,255,0.72)', background: 'rgba(255,255,255,0.015)', fontFamily: 'monospace' }}>
          {content}
        </pre>
      </div>
    </div>
  );
}

function ValidationTab({ result }: { result: OrchestrationResult }) {
  const score = result.confidenceScore ?? 0;
  const scoreColor = score >= 80 ? '#34d399' : score >= 60 ? '#fbbf24' : '#f87171';

  return (
    <div className="space-y-8">
      {/* Confidence score */}
      <section>
        <SectionTitle>Confidence Score</SectionTitle>
        <div className="rounded-xl border p-6" style={{ borderColor: 'rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.02)' }}>
          <div className="mb-3 flex items-end gap-3">
            <span className="text-5xl font-light tabular-nums" style={{ color: scoreColor }}>{score}</span>
            <span className="mb-1 text-xl" style={{ color: 'rgba(255,255,255,0.30)' }}>/100</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full" style={{ background: 'rgba(255,255,255,0.08)' }}>
            <div className="h-full rounded-full transition-all duration-700" style={{ width: `${score}%`, background: scoreColor }} />
          </div>
        </div>
      </section>

      {/* Risks */}
      <section>
        <SectionTitle>Risk Register</SectionTitle>
        <div className="space-y-2">
          {result.risks.map((r: Risk, i: number) => (
            <div key={i} className="rounded-xl border p-4" style={{ borderColor: 'rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.015)' }}>
              <div className="mb-2 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" style={{ color: 'rgba(255,255,255,0.40)' }} />
                  <span className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.80)' }}>{r.area}</span>
                </div>
                <span className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase" style={{ background: SEVERITY_COLOR[r.severity], color: 'rgba(255,255,255,0.70)' }}>
                  {r.severity}
                </span>
              </div>
              <p className="mb-2 text-xs" style={{ color: 'rgba(255,255,255,0.55)' }}>{r.risk}</p>
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
                <span style={{ color: 'rgba(255,255,255,0.25)' }}>Mitigation: </span>{r.mitigation}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Optimizations */}
      {result.optimizations?.length > 0 && (
        <section>
          <SectionTitle>Optimization Opportunities</SectionTitle>
          <div className="space-y-2">
            {result.optimizations.map((opt, i) => (
              <div key={i} className="flex items-start gap-3 rounded-xl border px-4 py-3" style={{ borderColor: 'rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.015)' }}>
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" style={{ color: 'rgba(52,211,153,0.60)' }} />
                <span className="text-sm" style={{ color: 'rgba(255,255,255,0.65)' }}>{opt}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

// ── Loading view ───────────────────────────────────────────────────────────────

function LoadingView({ elapsed }: { elapsed: number }) {
  const wave = elapsed < 30 ? 1 : elapsed < 70 ? 2 : 3;

  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="mb-10">
        <div
          className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.10)' }}
        >
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-transparent" style={{ borderTopColor: 'rgba(255,255,255,0.60)' }} />
        </div>
        <p className="text-sm font-light" style={{ color: 'rgba(255,255,255,0.50)' }}>
          Running {AGENTS.filter((a) => a.wave <= wave).length} of 8 agents&hellip; {elapsed}s
        </p>
      </div>

      <div className="w-full max-w-md space-y-2">
        {[1, 2, 3].map((w) => (
          <div key={w}>
            <p className="mb-1.5 text-left text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.18)' }}>
              Wave {w}
            </p>
            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
              {AGENTS.filter((a) => a.wave === w).map((a) => {
                const done = wave > w;
                const running = wave === w;
                return (
                  <div
                    key={a.id}
                    className="flex items-center gap-2 rounded-lg border px-3 py-2"
                    style={{
                      borderColor: done ? 'rgba(52,211,153,0.20)' : running ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.05)',
                      background: done ? 'rgba(52,211,153,0.04)' : running ? 'rgba(255,255,255,0.03)' : 'transparent',
                    }}
                  >
                    {done ? (
                      <CheckCircle2 className="h-3 w-3 shrink-0" style={{ color: 'rgba(52,211,153,0.70)' }} />
                    ) : running ? (
                      <div className="h-2 w-2 shrink-0 animate-pulse rounded-full" style={{ background: 'rgba(255,255,255,0.60)' }} />
                    ) : (
                      <div className="h-2 w-2 shrink-0 rounded-full" style={{ background: 'rgba(255,255,255,0.15)' }} />
                    )}
                    <div className="min-w-0">
                      <span className="block truncate text-[11px] font-medium" style={{ color: done ? 'rgba(255,255,255,0.70)' : running ? 'rgba(255,255,255,0.80)' : 'rgba(255,255,255,0.30)' }}>
                        {a.label}
                      </span>
                      <span className="block text-[9px]" style={{ color: 'rgba(255,255,255,0.22)' }}>{a.model}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Home view ──────────────────────────────────────────────────────────────────

function HomeView({
  onSubmit,
}: {
  onSubmit: (idea: string, domain: string) => void;
}) {
  const [idea, setIdea] = useState('');
  const [domain, setDomain] = useState('software');
  const [focused, setFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const submit = useCallback(() => {
    if (!idea.trim()) return;
    onSubmit(idea.trim(), domain);
  }, [idea, domain, onSubmit]);

  return (
    <div className="mx-auto max-w-2xl px-4 py-16 text-center">
      <h1 className="mb-2 text-[2.4rem] font-light tracking-tight" style={{ color: 'rgba(255,255,255,0.88)' }}>
        Deepchox
      </h1>
      <p className="mb-10 text-sm" style={{ color: 'rgba(255,255,255,0.28)' }}>
        AI Engineering Operating System &mdash; describe any idea, get a complete execution plan
      </p>

      {/* Input box */}
      <div
        className="mb-6 overflow-hidden rounded-2xl border text-left transition-colors duration-150"
        style={{
          borderColor: focused ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.08)',
          background: 'rgba(255,255,255,0.03)',
        }}
      >
        <textarea
          ref={textareaRef}
          rows={4}
          value={idea}
          onChange={(e) => setIdea(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onKeyDown={(e) => { if (e.key === 'Enter' && e.metaKey) submit(); }}
          placeholder="Describe your idea, invention, system, or engineering concept..."
          className="w-full resize-none bg-transparent px-5 pt-4 pb-2 text-sm outline-none placeholder:text-white/20"
          style={{ color: 'rgba(255,255,255,0.82)', caretColor: 'rgba(255,255,255,0.6)', minHeight: 100 }}
        />
        <div className="flex items-center justify-between border-t px-4 py-2.5" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
          <span className="text-xs" style={{ color: 'rgba(255,255,255,0.20)' }}>
            8 agents &middot; Claude + GPT-4o &middot; ~60-90s
          </span>
          <button
            onClick={submit}
            disabled={!idea.trim()}
            className="flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-medium transition-all duration-150"
            style={{
              background: idea.trim() ? 'rgba(255,255,255,0.90)' : 'rgba(255,255,255,0.07)',
              color: idea.trim() ? '#0d0d0d' : 'rgba(255,255,255,0.25)',
            }}
          >
            <Play className="h-3 w-3" />
            Execute
          </button>
        </div>
      </div>

      {/* Domain selector */}
      <div className="mb-10 flex flex-wrap justify-center gap-1.5">
        {DOMAINS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setDomain(id)}
            className="flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition-all duration-150"
            style={{
              borderColor: domain === id ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.07)',
              background: domain === id ? 'rgba(255,255,255,0.07)' : 'transparent',
              color: domain === id ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.38)',
            }}
          >
            <Icon className="h-3 w-3" />
            {label}
          </button>
        ))}
      </div>

      {/* Suggestions */}
      <p className="mb-3 text-left text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.20)' }}>
        Try an example
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        {SUGGESTIONS.map((s, i) => (
          <button
            key={i}
            onClick={() => { setIdea(s.label); setDomain(s.domain); textareaRef.current?.focus(); }}
            className="rounded-xl border px-4 py-3 text-left text-sm transition-all duration-150 hover:bg-white/[0.04]"
            style={{ borderColor: 'rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.02)', color: 'rgba(255,255,255,0.55)' }}
          >
            {s.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Result view ────────────────────────────────────────────────────────────────

function ResultView({
  project,
  onReset,
}: {
  project: EngProject;
  onReset: () => void;
}) {
  const [tab, setTab] = useState<Tab>('overview');
  const result = project.result!;

  return (
    <div className="flex min-h-0 flex-1 flex-col" style={{ background: '#0d0d0d' }}>
      {/* Result header */}
      <div className="border-b px-6 py-4" style={{ borderColor: 'rgba(255,255,255,0.06)', background: '#0d0d0d' }}>
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
          <div className="min-w-0">
            <h2 className="truncate text-sm font-medium" style={{ color: 'rgba(255,255,255,0.85)' }}>{project.title}</h2>
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.28)' }}>
              {project.domain} &middot; {Math.round(result.durationMs / 1000)}s &middot; {result.codeFiles.length} files &middot; {result.phases.length} phases
            </p>
          </div>
          <button
            onClick={onReset}
            className="flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition-all"
            style={{ borderColor: 'rgba(255,255,255,0.10)', color: 'rgba(255,255,255,0.45)' }}
          >
            <RotateCcw className="h-3 w-3" />
            New idea
          </button>
        </div>

        {/* Tabs */}
        <div className="mx-auto mt-3 flex max-w-5xl gap-0">
          {TABS.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className="relative px-4 py-2 text-xs transition-colors"
              style={{ color: tab === id ? 'rgba(255,255,255,0.88)' : 'rgba(255,255,255,0.32)' }}
            >
              {label}
              {tab === id && (
                <div className="absolute bottom-0 left-2 right-2 h-[1.5px] rounded-full" style={{ background: 'rgba(255,255,255,0.75)' }} />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Agent trace bar */}
      <div className="border-b px-6 py-2" style={{ borderColor: 'rgba(255,255,255,0.04)', background: 'rgba(255,255,255,0.01)' }}>
        <div className="mx-auto flex max-w-5xl items-center gap-3 overflow-x-auto">
          {result.agentTrace.map((a) => (
            <div key={a.agent} className="flex shrink-0 items-center gap-1.5">
              {a.ok
                ? <CheckCircle2 className="h-3 w-3" style={{ color: 'rgba(52,211,153,0.60)' }} />
                : <XCircle className="h-3 w-3" style={{ color: 'rgba(239,68,68,0.60)' }} />
              }
              <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.35)' }}>{a.agent}</span>
              <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.18)' }}>{(a.durationMs / 1000).toFixed(1)}s</span>
            </div>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-5xl px-6 py-8">
          {tab === 'overview'     && <OverviewTab result={result} />}
          {tab === 'architecture' && <ArchitectureTab result={result} />}
          {tab === 'code'         && <CodeTab result={result} />}
          {tab === 'workflow'     && <WorkflowTab result={result} />}
          {tab === 'deploy'       && <DeployTab result={result} />}
          {tab === 'docs'         && <DocsTab result={result} />}
          {tab === 'validation'   && <ValidationTab result={result} />}
        </div>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export function EngineeringPlatform({ selectedProjectId }: { selectedProjectId?: string | null }) {
  const [state, setState] = useState<'home' | 'loading' | 'result'>('home');
  const [currentProject, setCurrentProject] = useState<EngProject | null>(() => {
    if (!selectedProjectId) return null;
    return loadProjects().find((p) => p.id === selectedProjectId) ?? null;
  });
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startTimer = () => {
    setElapsed(0);
    timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000);
  };
  const stopTimer = () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  };

  const handleSubmit = useCallback(async (idea: string, domain: string) => {
    const project: EngProject = {
      id: Date.now().toString(),
      title: idea.slice(0, 80),
      idea,
      domain,
      result: null,
      createdAt: Date.now(),
    };

    setState('loading');
    startTimer();

    try {
      const res = await fetch('/api/orchestrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idea, domain }),
      });

      if (!res.ok) throw new Error('Orchestration failed');
      const result = (await res.json()) as import('@/app/api/orchestrate/route').OrchestrationResult;
      const done = { ...project, result };

      const projects = [done, ...loadProjects().filter((p) => p.id !== done.id)].slice(0, 20);
      saveProjects(projects);

      setCurrentProject(done);
      setState('result');
    } catch {
      setState('home');
    } finally {
      stopTimer();
    }
  }, []);

  const handleReset = () => {
    setCurrentProject(null);
    setState('home');
  };

  if (state === 'loading') return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto" style={{ background: '#0d0d0d' }}>
      <LoadingView elapsed={elapsed} />
    </div>
  );

  if (state === 'result' && currentProject?.result) return (
    <ResultView project={currentProject} onReset={handleReset} />
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto" style={{ background: '#0d0d0d' }}>
      <HomeView onSubmit={handleSubmit} />
    </div>
  );
}
