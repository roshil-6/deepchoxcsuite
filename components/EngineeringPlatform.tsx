'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
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
  { id: 'software',   label: 'Software',   icon: Code2        },
  { id: 'ai',         label: 'AI / ML',    icon: Bot          },
  { id: 'hardware',   label: 'Hardware',   icon: Cpu          },
  { id: 'robotics',   label: 'Robotics',   icon: Zap          },
  { id: 'aerospace',  label: 'Aerospace',  icon: Rocket       },
  { id: 'biotech',    label: 'Biotech',    icon: FlaskConical },
  { id: 'iot',        label: 'IoT',        icon: Wifi         },
  { id: 'industrial', label: 'Industrial', icon: Factory      },
  { id: 'web3',       label: 'Web3',       icon: Globe        },
  { id: 'saas',       label: 'SaaS',       icon: Layers       },
];

const SUGGESTIONS = [
  { label: 'Autonomous drone swarm with real-time collision avoidance',  domain: 'aerospace'  },
  { label: 'Computer vision pipeline for industrial defect detection',   domain: 'robotics'   },
  { label: 'Edge AI sensor mesh for predictive equipment maintenance',   domain: 'iot'        },
  { label: 'Self-healing microservices platform with AI observability',  domain: 'ai'         },
  { label: 'Reinforcement learning engine for smart grid load balancing',domain: 'industrial' },
  { label: 'On-chain AI inference marketplace with verifiable compute',  domain: 'web3'       },
];

// ── Agent pipeline config ──────────────────────────────────────────────────────

const AGENTS = [
  { id: 'Planner',    label: 'Planner',    model: 'Claude',  desc: 'System decomposition', wave: 1 },
  { id: 'Researcher', label: 'Researcher', model: 'GPT-4o',  desc: 'Technology research',  wave: 1 },
  { id: 'Architect',  label: 'Architect',  model: 'Claude',  desc: 'System architecture',  wave: 2 },
  { id: 'CodeGen',    label: 'Code Gen',   model: 'GPT-4o',  desc: 'Code generation',      wave: 2 },
  { id: 'Workflow',   label: 'Workflow',   model: 'Claude',  desc: 'Execution planning',   wave: 2 },
  { id: 'Deploy',     label: 'Deploy',     model: 'GPT-4o',  desc: 'Deployment configs',   wave: 3 },
  { id: 'Docs',       label: 'Docs',       model: 'Claude',  desc: 'Documentation',        wave: 3 },
  { id: 'Validator',  label: 'Validator',  model: 'Claude',  desc: 'Validation & scoring', wave: 3 },
];

// ── Tabs ───────────────────────────────────────────────────────────────────────

type Tab = 'overview' | 'architecture' | 'code' | 'workflow' | 'deploy' | 'docs' | 'validation';

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'overview',     label: 'Overview',     icon: Layers      },
  { id: 'architecture', label: 'Architecture', icon: GitBranch   },
  { id: 'code',         label: 'Code Engine',  icon: Code2       },
  { id: 'workflow',     label: 'Workflow',     icon: Clock       },
  { id: 'deploy',       label: 'Deploy',       icon: Cloud       },
  { id: 'docs',         label: 'Docs',         icon: FileText    },
  { id: 'validation',   label: 'Validation',   icon: ShieldCheck },
];

// ── Particle canvas (loading background) ──────────────────────────────────────

function ParticleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let W = 0, H = 0, cx = 0, cy = 0;
    const dpr = window.devicePixelRatio || 1;

    const resize = () => {
      W = canvas.offsetWidth;
      H = canvas.offsetHeight;
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      ctx.scale(dpr, dpr);
      cx = W / 2;
      cy = H / 2;
    };
    resize();
    window.addEventListener('resize', resize);

    type P = { angle: number; r: number; speed: number; size: number; alpha: number };
    const particles: P[] = Array.from({ length: 90 }, () => {
      const angle = Math.random() * Math.PI * 2;
      const band = Math.random();
      const radius = band < 0.33 ? 40 + Math.random() * 50
                   : band < 0.66 ? 110 + Math.random() * 60
                   :               180 + Math.random() * 70;
      return {
        angle,
        r: radius,
        speed: (0.002 + Math.random() * 0.004) * (Math.random() > 0.5 ? 1 : -1),
        size: 0.6 + Math.random() * 1.8,
        alpha: 0.12 + Math.random() * 0.45,
      };
    });

    let raf: number;
    let t = 0;

    const draw = () => {
      t++;
      ctx.clearRect(0, 0, W, H);

      // Ambient teal glow at center
      const pulse = 0.06 + Math.sin(t * 0.025) * 0.02;
      const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, 200);
      glow.addColorStop(0, `rgba(20,184,166,${pulse})`);
      glow.addColorStop(0.5, `rgba(20,184,166,${pulse * 0.3})`);
      glow.addColorStop(1, 'transparent');
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, W, H);

      // Particles
      for (const p of particles) {
        p.angle += p.speed;
        const x = cx + Math.cos(p.angle) * p.r;
        const y = cy + Math.sin(p.angle) * p.r;
        ctx.beginPath();
        ctx.arc(x, y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(20,184,166,${p.alpha})`;
        ctx.fill();
      }

      // Connect nearby particles with faint lines
      for (let i = 0; i < particles.length; i++) {
        const a = particles[i];
        const ax = cx + Math.cos(a.angle) * a.r;
        const ay = cy + Math.sin(a.angle) * a.r;
        for (let j = i + 1; j < particles.length; j++) {
          const b = particles[j];
          const bx = cx + Math.cos(b.angle) * b.r;
          const by = cy + Math.sin(b.angle) * b.r;
          const dist = Math.hypot(ax - bx, ay - by);
          if (dist < 55) {
            ctx.beginPath();
            ctx.moveTo(ax, ay);
            ctx.lineTo(bx, by);
            ctx.strokeStyle = `rgba(20,184,166,${0.06 * (1 - dist / 55)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }

      raf = requestAnimationFrame(draw);
    };

    draw();
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 h-full w-full"
      style={{ pointerEvents: 'none' }}
    />
  );
}

// ── Shared small components ────────────────────────────────────────────────────

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
      className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors"
      style={{ color: 'rgba(255,255,255,0.45)', background: 'rgba(255,255,255,0.06)' }}
    >
      {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}

function Badge({ label, color = 'rgba(255,255,255,0.12)' }: { label: string; color?: string }) {
  return (
    <span
      className="rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider"
      style={{ background: color, color: 'rgba(255,255,255,0.80)' }}
    >
      {label}
    </span>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-4 flex items-center gap-2">
      <div className="h-3.5 w-0.5 rounded-full" style={{ background: 'rgba(20,184,166,0.60)' }} />
      <h3 className="text-xs font-bold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.45)' }}>
        {children}
      </h3>
    </div>
  );
}

function Prose({ children }: { children: React.ReactNode }) {
  return (
    <p className="leading-relaxed text-sm font-medium" style={{ color: 'rgba(255,255,255,0.75)' }}>
      {children}
    </p>
  );
}

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-xl border p-5 ${className}`}
      style={{ borderColor: 'rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.025)' }}
    >
      {children}
    </div>
  );
}

// ── Complexity / severity colors ───────────────────────────────────────────────

const COMPLEXITY_COLOR: Record<string, string> = {
  low:     'rgba(52,211,153,0.25)',
  medium:  'rgba(251,191,36,0.25)',
  high:    'rgba(249,115,22,0.25)',
  extreme: 'rgba(239,68,68,0.25)',
};

const SEVERITY_COLOR: Record<string, string> = {
  low:      'rgba(52,211,153,0.22)',
  medium:   'rgba(251,191,36,0.22)',
  high:     'rgba(249,115,22,0.22)',
  critical: 'rgba(239,68,68,0.22)',
};

// ── Tab content ────────────────────────────────────────────────────────────────

function OverviewTab({ result }: { result: OrchestrationResult }) {
  return (
    <div className="space-y-10">
      {/* Concept */}
      <section>
        <SectionTitle>Concept Analysis</SectionTitle>
        <Card>
          <div className="mb-4 flex items-center gap-3">
            <Badge label={result.complexity} color={COMPLEXITY_COLOR[result.complexity]} />
            <span className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.35)' }}>
              {result.systems.length} subsystems &middot; {result.techStack.length} technologies
            </span>
          </div>
          <Prose>{result.concept}</Prose>
        </Card>
      </section>

      {/* Systems */}
      <section>
        <SectionTitle>System Decomposition</SectionTitle>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {result.systems.map((sys: SystemNode) => (
            <div
              key={sys.id}
              className="group rounded-xl border p-4 transition-colors hover:border-teal-500/20"
              style={{ borderColor: 'rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.02)' }}
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="text-sm font-bold" style={{ color: 'rgba(255,255,255,0.90)' }}>{sys.name}</span>
                <span
                  className="rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider"
                  style={{ background: 'rgba(20,184,166,0.10)', color: 'rgba(20,184,166,0.75)' }}
                >
                  {sys.type}
                </span>
              </div>
              <p className="text-xs font-medium leading-relaxed" style={{ color: 'rgba(255,255,255,0.50)' }}>
                {sys.description}
              </p>
              {sys.connections.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1">
                  {sys.connections.map((c) => (
                    <span
                      key={c}
                      className="rounded px-1.5 py-0.5 text-[9px] font-semibold"
                      style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.35)' }}
                    >
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
          <Card className="mb-4">
            <Prose>{result.researchInsights}</Prose>
          </Card>
        )}
        <div className="space-y-2">
          {result.techStack.map((t, i) => (
            <div
              key={i}
              className="flex items-start gap-4 rounded-xl border px-4 py-3.5 transition-colors hover:border-white/[0.12]"
              style={{ borderColor: 'rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.02)' }}
            >
              <span
                className="mt-0.5 min-w-[90px] text-[10px] font-bold uppercase tracking-wider"
                style={{ color: 'rgba(20,184,166,0.60)' }}
              >
                {t.category}
              </span>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold" style={{ color: 'rgba(255,255,255,0.90)' }}>{t.name}</span>
                  {t.version && (
                    <span className="text-[10px] font-semibold" style={{ color: 'rgba(255,255,255,0.30)' }}>
                      v{t.version}
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-xs font-medium" style={{ color: 'rgba(255,255,255,0.50)' }}>{t.reason}</p>
                {t.alternatives?.length > 0 && (
                  <p className="mt-1 text-[10px] font-medium" style={{ color: 'rgba(255,255,255,0.28)' }}>
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
          <div
            className="flex items-start gap-3 rounded-xl border p-4"
            style={{ borderColor: 'rgba(20,184,166,0.20)', background: 'rgba(20,184,166,0.05)' }}
          >
            <ArrowRight className="mt-0.5 h-4 w-4 shrink-0" style={{ color: 'rgba(20,184,166,0.70)' }} />
            <Prose>{result.nextStep}</Prose>
          </div>
        </section>
      )}
    </div>
  );
}

function ArchitectureTab({ result }: { result: OrchestrationResult }) {
  return (
    <div className="space-y-10">
      <section>
        <SectionTitle>System Architecture</SectionTitle>
        <Card>
          {result.architecture.split('\n').filter(Boolean).map((para, i) => (
            <Prose key={i}>{para}</Prose>
          ))}
        </Card>
      </section>

      <section>
        <SectionTitle>Data Flow</SectionTitle>
        <Card>
          {result.dataFlow.split('\n').filter(Boolean).map((para, i) => (
            <Prose key={i}>{para}</Prose>
          ))}
        </Card>
      </section>

      {result.integrationPoints?.length > 0 && (
        <section>
          <SectionTitle>Integration Points</SectionTitle>
          <div className="grid gap-2 sm:grid-cols-2">
            {result.integrationPoints.map((pt, i) => (
              <div
                key={i}
                className="flex items-center gap-3 rounded-xl border px-4 py-3 transition-colors hover:border-white/[0.12]"
                style={{ borderColor: 'rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.02)' }}
              >
                <ChevronRight className="h-3.5 w-3.5 shrink-0" style={{ color: 'rgba(20,184,166,0.50)' }} />
                <span className="text-sm font-semibold" style={{ color: 'rgba(255,255,255,0.75)' }}>{pt}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <SectionTitle>Scaling Strategy</SectionTitle>
        <Card>
          {result.scalingStrategy.split('\n').filter(Boolean).map((para, i) => (
            <Prose key={i}>{para}</Prose>
          ))}
        </Card>
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
            className="rounded-lg border px-3 py-1.5 text-xs font-bold transition-all"
            style={{
              borderColor: activeFile === i ? 'rgba(20,184,166,0.45)' : 'rgba(255,255,255,0.07)',
              background:  activeFile === i ? 'rgba(20,184,166,0.10)' : 'rgba(255,255,255,0.02)',
              color:       activeFile === i ? 'rgba(20,184,166,0.90)' : 'rgba(255,255,255,0.40)',
            }}
          >
            {f.path.split('/').pop()}
          </button>
        ))}
      </div>

      {file && (
        <div className="overflow-hidden rounded-xl border" style={{ borderColor: 'rgba(255,255,255,0.09)' }}>
          {/* Header */}
          <div
            className="flex items-center justify-between border-b px-4 py-3"
            style={{ borderColor: 'rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.04)' }}
          >
            <div>
              <span className="font-mono text-sm font-bold" style={{ color: 'rgba(255,255,255,0.85)' }}>
                {file.path}
              </span>
              <p className="mt-0.5 text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.38)' }}>
                {file.purpose}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge label={file.language} />
              <CopyButton text={file.code} />
            </div>
          </div>
          {/* Code */}
          <div className="overflow-x-auto" style={{ background: 'rgba(0,0,0,0.50)' }}>
            <pre
              className="p-5 text-xs leading-relaxed"
              style={{ color: 'rgba(255,255,255,0.80)', fontFamily: "'JetBrains Mono','Fira Code','Cascadia Code',monospace" }}
            >
              <code>{file.code}</code>
            </pre>
          </div>
        </div>
      )}

      {/* Setup instructions */}
      {result.setupInstructions && (
        <div className="rounded-xl border" style={{ borderColor: 'rgba(255,255,255,0.09)' }}>
          <div
            className="flex items-center justify-between border-b px-4 py-3"
            style={{ borderColor: 'rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.04)' }}
          >
            <span className="text-xs font-bold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.45)' }}>
              Setup Instructions
            </span>
            <CopyButton text={result.setupInstructions} />
          </div>
          <div className="overflow-x-auto" style={{ background: 'rgba(0,0,0,0.40)' }}>
            <pre
              className="p-5 text-xs leading-relaxed whitespace-pre-wrap"
              style={{ color: 'rgba(255,255,255,0.72)', fontFamily: 'monospace' }}
            >
              {result.setupInstructions}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}

function WorkflowTab({ result }: { result: OrchestrationResult }) {
  return (
    <div className="space-y-10">
      {result.estimatedTimeline && (
        <div
          className="flex items-center gap-3 rounded-xl border px-5 py-4"
          style={{ borderColor: 'rgba(20,184,166,0.20)', background: 'rgba(20,184,166,0.05)' }}
        >
          <Clock className="h-4 w-4 shrink-0" style={{ color: 'rgba(20,184,166,0.70)' }} />
          <span className="text-sm font-bold" style={{ color: 'rgba(255,255,255,0.80)' }}>
            {result.estimatedTimeline}
          </span>
        </div>
      )}

      <section>
        <SectionTitle>Execution Phases</SectionTitle>
        <div className="space-y-3">
          {result.phases.map((ph: WorkflowPhase) => (
            <div
              key={ph.phase}
              className="rounded-xl border p-5 transition-colors hover:border-white/[0.12]"
              style={{ borderColor: 'rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.025)' }}
            >
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                    style={{ background: 'rgba(20,184,166,0.12)', color: 'rgba(20,184,166,0.85)', border: '1px solid rgba(20,184,166,0.25)' }}
                  >
                    {ph.phase}
                  </span>
                  <span className="font-bold" style={{ color: 'rgba(255,255,255,0.90)' }}>{ph.title}</span>
                </div>
                <span
                  className="shrink-0 rounded-full px-2.5 py-1 text-xs font-bold"
                  style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.45)' }}
                >
                  {ph.duration}
                </span>
              </div>

              <ul className="mb-4 space-y-2 pl-11">
                {ph.tasks.map((task, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm font-medium" style={{ color: 'rgba(255,255,255,0.60)' }}>
                    <ChevronRight className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{ color: 'rgba(20,184,166,0.45)' }} />
                    {task}
                  </li>
                ))}
              </ul>

              <div className="flex flex-wrap items-center gap-2 pl-11">
                <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.25)' }}>
                  Milestone:
                </span>
                <span className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.60)' }}>
                  {ph.milestone}
                </span>
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
                <span
                  className="rounded-lg border px-3 py-1.5 text-xs font-semibold"
                  style={{ borderColor: 'rgba(255,255,255,0.09)', color: 'rgba(255,255,255,0.70)', background: 'rgba(255,255,255,0.03)' }}
                >
                  {item}
                </span>
                {i < result.criticalPath.length - 1 && (
                  <ArrowRight className="h-4 w-4 self-center" style={{ color: 'rgba(20,184,166,0.35)' }} />
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
        <Card>
          <SectionTitle>Cloud Recommendation</SectionTitle>
          {result.cloudRecommendation.split('\n').filter(Boolean).map((para, i) => (
            <Prose key={i}>{para}</Prose>
          ))}
        </Card>
      )}

      <div className="flex flex-wrap gap-2">
        {result.deploymentConfigs.map((c: DeploymentConfig, i: number) => (
          <button
            key={i}
            onClick={() => setActiveConfig(i)}
            className="rounded-lg border px-3 py-1.5 text-xs font-bold transition-all"
            style={{
              borderColor: activeConfig === i ? 'rgba(20,184,166,0.45)' : 'rgba(255,255,255,0.07)',
              background:  activeConfig === i ? 'rgba(20,184,166,0.10)' : 'rgba(255,255,255,0.02)',
              color:       activeConfig === i ? 'rgba(20,184,166,0.90)' : 'rgba(255,255,255,0.40)',
            }}
          >
            {c.target}
          </button>
        ))}
      </div>

      {cfg && (
        <div className="overflow-hidden rounded-xl border" style={{ borderColor: 'rgba(255,255,255,0.09)' }}>
          <div
            className="flex items-center justify-between border-b px-4 py-3"
            style={{ borderColor: 'rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.04)' }}
          >
            <div>
              <span className="font-mono text-sm font-bold" style={{ color: 'rgba(255,255,255,0.85)' }}>
                {cfg.filename}
              </span>
              <p className="mt-0.5 text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.38)' }}>
                {cfg.description}
              </p>
            </div>
            <CopyButton text={cfg.content} />
          </div>
          <div className="overflow-x-auto" style={{ background: 'rgba(0,0,0,0.50)' }}>
            <pre
              className="p-5 text-xs leading-relaxed"
              style={{ color: 'rgba(255,255,255,0.80)', fontFamily: "'JetBrains Mono','Fira Code',monospace" }}
            >
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
      <div className="flex items-center gap-2">
        {(['readme', 'api'] as const).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className="rounded-lg border px-4 py-1.5 text-xs font-bold transition-all"
            style={{
              borderColor: view === v ? 'rgba(20,184,166,0.45)' : 'rgba(255,255,255,0.07)',
              background:  view === v ? 'rgba(20,184,166,0.10)' : 'transparent',
              color:       view === v ? 'rgba(20,184,166,0.90)' : 'rgba(255,255,255,0.40)',
            }}
          >
            {v === 'readme' ? 'README.md' : 'API Docs'}
          </button>
        ))}
        <CopyButton text={content} />
      </div>
      <div className="overflow-hidden rounded-xl border" style={{ borderColor: 'rgba(255,255,255,0.09)' }}>
        <pre
          className="overflow-x-auto p-6 text-xs leading-relaxed whitespace-pre-wrap"
          style={{ color: 'rgba(255,255,255,0.75)', background: 'rgba(0,0,0,0.35)', fontFamily: 'monospace' }}
        >
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
    <div className="space-y-10">
      {/* Confidence score */}
      <section>
        <SectionTitle>Confidence Score</SectionTitle>
        <Card>
          <div className="mb-4 flex items-end gap-3">
            <span className="text-6xl font-bold tabular-nums" style={{ color: scoreColor }}>{score}</span>
            <span className="mb-2 text-2xl font-bold" style={{ color: 'rgba(255,255,255,0.25)' }}>/100</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full" style={{ background: 'rgba(255,255,255,0.07)' }}>
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${score}%`, background: scoreColor }}
            />
          </div>
          <p className="mt-3 text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.35)' }}>
            {score >= 80 ? 'High confidence — ready to build' : score >= 60 ? 'Moderate confidence — review risks before starting' : 'Lower confidence — significant risks identified'}
          </p>
        </Card>
      </section>

      {/* Risks */}
      <section>
        <SectionTitle>Risk Register</SectionTitle>
        <div className="space-y-2">
          {result.risks.map((r: Risk, i: number) => (
            <div
              key={i}
              className="rounded-xl border p-4 transition-colors hover:border-white/[0.12]"
              style={{ borderColor: 'rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.02)' }}
            >
              <div className="mb-2 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" style={{ color: 'rgba(255,255,255,0.40)' }} />
                  <span className="text-sm font-bold" style={{ color: 'rgba(255,255,255,0.85)' }}>{r.area}</span>
                </div>
                <span
                  className="rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide"
                  style={{ background: SEVERITY_COLOR[r.severity], color: 'rgba(255,255,255,0.80)' }}
                >
                  {r.severity}
                </span>
              </div>
              <p className="mb-2.5 text-xs font-medium" style={{ color: 'rgba(255,255,255,0.58)' }}>{r.risk}</p>
              <p className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.35)' }}>
                <span className="font-bold" style={{ color: 'rgba(255,255,255,0.25)' }}>Mitigation: </span>
                {r.mitigation}
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
              <div
                key={i}
                className="flex items-start gap-3 rounded-xl border px-4 py-3.5 transition-colors hover:border-white/[0.12]"
                style={{ borderColor: 'rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.02)' }}
              >
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" style={{ color: 'rgba(52,211,153,0.65)' }} />
                <span className="text-sm font-semibold" style={{ color: 'rgba(255,255,255,0.70)' }}>{opt}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

// ── Loading view ───────────────────────────────────────────────────────────────

const WAVE_LABELS: Record<number, string> = {
  1: 'Wave 1 — Analysis',
  2: 'Wave 2 — Design & Code',
  3: 'Wave 3 — Production',
};

const LOADING_MESSAGES = [
  'Decomposing your system into subsystems…',
  'Researching the optimal technology stack…',
  'Designing the full system architecture…',
  'Generating production-ready code…',
  'Planning the execution workflow…',
  'Building deployment configurations…',
  'Writing technical documentation…',
  'Validating and scoring the plan…',
];

function LoadingView({ elapsed }: { elapsed: number }) {
  const wave = elapsed < 30 ? 1 : elapsed < 70 ? 2 : 3;
  const msgIdx = Math.min(Math.floor(elapsed / 11), LOADING_MESSAGES.length - 1);
  const [visible, setVisible] = useState(true);
  const prevIdx = useRef(msgIdx);

  useEffect(() => {
    if (prevIdx.current !== msgIdx) {
      setVisible(false);
      const t = setTimeout(() => { setVisible(true); prevIdx.current = msgIdx; }, 200);
      return () => clearTimeout(t);
    }
  }, [msgIdx]);

  return (
    <div className="relative flex min-h-full flex-col items-center justify-center overflow-hidden py-16 text-center">
      {/* Particle field */}
      <ParticleCanvas />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center">
        {/* Pulsing orb */}
        <div className="relative mb-10 flex h-24 w-24 items-center justify-center">
          {/* Outer ring */}
          <div
            className="absolute inset-0 rounded-full"
            style={{
              border: '1px solid rgba(20,184,166,0.20)',
              animation: 'ping 2s cubic-bezier(0,0,0.2,1) infinite',
            }}
          />
          {/* Mid ring */}
          <div
            className="absolute inset-3 rounded-full"
            style={{
              border: '1px solid rgba(20,184,166,0.25)',
              animation: 'ping 2s cubic-bezier(0,0,0.2,1) infinite 0.4s',
            }}
          />
          {/* Core */}
          <div
            className="relative h-14 w-14 rounded-full"
            style={{
              background: 'radial-gradient(circle at 40% 40%, rgba(20,184,166,0.30), rgba(20,184,166,0.08))',
              border: '1px solid rgba(20,184,166,0.40)',
              boxShadow: '0 0 24px rgba(20,184,166,0.20), inset 0 0 12px rgba(20,184,166,0.10)',
            }}
          >
            <div
              className="absolute inset-0 rounded-full"
              style={{ background: 'rgba(20,184,166,0.06)', animation: 'pulse 2s ease-in-out infinite' }}
            />
          </div>
        </div>

        {/* Message */}
        <p
          className="mb-2 text-base font-bold transition-opacity duration-200"
          style={{ color: 'rgba(255,255,255,0.88)', opacity: visible ? 1 : 0 }}
        >
          {LOADING_MESSAGES[msgIdx]}
        </p>
        <p className="mb-12 text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.28)' }}>
          {AGENTS.filter((a) => a.wave <= wave).length} of 8 agents active &middot; {elapsed}s elapsed
        </p>

        {/* Agent waves */}
        <div className="w-full max-w-lg space-y-4">
          {[1, 2, 3].map((w) => (
            <div key={w}>
              <p
                className="mb-2 text-left text-[10px] font-bold uppercase tracking-widest"
                style={{ color: wave >= w ? 'rgba(20,184,166,0.55)' : 'rgba(255,255,255,0.18)' }}
              >
                {WAVE_LABELS[w]}
              </p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {AGENTS.filter((a) => a.wave === w).map((a) => {
                  const done    = wave > w;
                  const running = wave === w;
                  const pending = wave < w;
                  return (
                    <div
                      key={a.id}
                      className="flex items-center gap-2.5 rounded-xl border px-3 py-2.5 transition-all"
                      style={{
                        borderColor: done    ? 'rgba(52,211,153,0.25)'
                                   : running ? 'rgba(20,184,166,0.30)'
                                   :           'rgba(255,255,255,0.06)',
                        background:  done    ? 'rgba(52,211,153,0.06)'
                                   : running ? 'rgba(20,184,166,0.08)'
                                   :           'rgba(255,255,255,0.02)',
                      }}
                    >
                      {done ? (
                        <CheckCircle2 className="h-3.5 w-3.5 shrink-0" style={{ color: 'rgba(52,211,153,0.75)' }} />
                      ) : running ? (
                        <div
                          className="h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{ background: 'rgba(20,184,166,0.80)', animation: 'pulse 1s ease-in-out infinite' }}
                        />
                      ) : (
                        <div className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: 'rgba(255,255,255,0.12)' }} />
                      )}
                      <div className="min-w-0">
                        <span
                          className="block truncate text-[11px] font-bold"
                          style={{
                            color: done    ? 'rgba(255,255,255,0.75)'
                                 : running ? 'rgba(255,255,255,0.90)'
                                 :           'rgba(255,255,255,0.28)',
                          }}
                        >
                          {a.label}
                        </span>
                        <span className="block text-[9px] font-semibold" style={{ color: 'rgba(255,255,255,0.25)' }}>
                          {a.model}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Home view ──────────────────────────────────────────────────────────────────

function HomeView({ onSubmit }: { onSubmit: (idea: string, domain: string) => void }) {
  const [idea, setIdea]       = useState('');
  const [domain, setDomain]   = useState('software');
  const [focused, setFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const submit = useCallback(() => {
    if (!idea.trim()) return;
    onSubmit(idea.trim(), domain);
  }, [idea, domain, onSubmit]);

  return (
    <div className="flex min-h-full flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-3xl text-center">

        {/* Brand */}
        <p
          className="mb-1 text-[10px] font-bold uppercase tracking-[0.25em]"
          style={{ color: 'rgba(20,184,166,0.60)' }}
        >
          northROSC LABS
        </p>
        <h1
          className="mb-3 text-[2.8rem] font-bold tracking-tight"
          style={{ color: 'rgba(255,255,255,0.95)' }}
        >
          Deepchox
        </h1>
        <p className="mb-10 text-sm font-medium leading-relaxed" style={{ color: 'rgba(255,255,255,0.38)' }}>
          Turn any engineering idea into a complete execution plan —
          architecture, production code, deployment configs, and docs in under 90 seconds.
        </p>

        {/* Input box */}
        <div
          className="mb-6 overflow-hidden rounded-2xl border text-left transition-all duration-150"
          style={{
            borderColor: focused ? 'rgba(20,184,166,0.45)' : 'rgba(255,255,255,0.09)',
            background: focused ? 'rgba(20,184,166,0.03)' : 'rgba(255,255,255,0.03)',
            boxShadow: focused ? '0 0 0 3px rgba(20,184,166,0.06)' : 'none',
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
            placeholder="What are you building? Describe any idea — software, hardware, AI system, robotics, aerospace, biotech..."
            className="w-full resize-none bg-transparent px-5 pt-4 pb-2 text-sm font-medium outline-none"
            style={{
              color: 'rgba(255,255,255,0.88)',
              caretColor: '#14B8A6',
              minHeight: 100,
            }}
          />
          <div
            className="flex items-center justify-between border-t px-4 py-3"
            style={{ borderColor: 'rgba(255,255,255,0.06)' }}
          >
            <span className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.20)' }}>
              8 agents &middot; Claude + GPT-4o &middot; 7 deliverables &middot; ~90s
            </span>
            <button
              onClick={submit}
              disabled={!idea.trim()}
              className="flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-bold transition-all duration-150"
              style={{
                background: idea.trim() ? 'rgba(20,184,166,0.90)' : 'rgba(255,255,255,0.07)',
                color:      idea.trim() ? '#0d0d0d' : 'rgba(255,255,255,0.22)',
                cursor:     idea.trim() ? 'pointer' : 'not-allowed',
              }}
            >
              <Play className="h-3 w-3" />
              Build it
            </button>
          </div>
        </div>

        {/* Domain selector */}
        <p
          className="mb-3 text-[10px] font-bold uppercase tracking-widest"
          style={{ color: 'rgba(255,255,255,0.25)' }}
        >
          Select domain
        </p>
        <div className="mb-10 flex flex-wrap justify-center gap-2">
          {DOMAINS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setDomain(id)}
              className="flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-bold transition-all duration-150"
              style={{
                borderColor: domain === id ? 'rgba(20,184,166,0.50)' : 'rgba(255,255,255,0.08)',
                background:  domain === id ? 'rgba(20,184,166,0.12)' : 'transparent',
                color:       domain === id ? 'rgba(20,184,166,0.95)' : 'rgba(255,255,255,0.38)',
              }}
            >
              <Icon className="h-3 w-3" />
              {label}
            </button>
          ))}
        </div>

        {/* Suggestions */}
        <p
          className="mb-3 text-left text-[10px] font-bold uppercase tracking-widest"
          style={{ color: 'rgba(255,255,255,0.25)' }}
        >
          Start from an example
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {SUGGESTIONS.map((s, i) => (
            <button
              key={i}
              onClick={() => { setIdea(s.label); setDomain(s.domain); textareaRef.current?.focus(); }}
              className="group rounded-xl border px-4 py-4 text-left transition-all duration-150 hover:border-teal-500/20 hover:bg-white/[0.03]"
              style={{ borderColor: 'rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.02)' }}
            >
              <div className="flex items-start gap-3">
                <div
                  className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full transition-colors group-hover:bg-teal-400"
                  style={{ background: 'rgba(255,255,255,0.20)', marginTop: 6 }}
                />
                <span className="text-sm font-semibold leading-snug transition-colors group-hover:text-white/80" style={{ color: 'rgba(255,255,255,0.52)' }}>
                  {s.label}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Result view ────────────────────────────────────────────────────────────────

function ResultView({ project, onReset }: { project: EngProject; onReset: () => void }) {
  const [tab, setTab] = useState<Tab>('overview');
  const result = project.result!;

  return (
    <div className="flex min-h-0 flex-1 flex-col" style={{ background: '#0d0d0d' }}>
      {/* Sticky header */}
      <div
        className="sticky top-0 z-10 shrink-0 border-b px-6 pt-4 pb-0"
        style={{ borderColor: 'rgba(255,255,255,0.07)', background: '#0d0d0d' }}
      >
        <div className="mx-auto max-w-5xl">
          {/* Title row */}
          <div className="flex items-start justify-between gap-4 pb-4">
            <div className="min-w-0">
              <h2 className="truncate text-base font-bold" style={{ color: 'rgba(255,255,255,0.92)' }}>
                {project.title}
              </h2>
              <div className="mt-1.5 flex flex-wrap items-center gap-3">
                <span
                  className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
                  style={{ background: 'rgba(20,184,166,0.12)', color: 'rgba(20,184,166,0.80)' }}
                >
                  {project.domain}
                </span>
                <span className="text-[11px] font-semibold" style={{ color: 'rgba(255,255,255,0.30)' }}>
                  {result.codeFiles.length} files &middot; {result.phases.length} phases &middot; {result.risks.length} risks &middot; {Math.round(result.durationMs / 1000)}s
                </span>
                {/* Agent trace */}
                <div className="hidden items-center gap-2 overflow-x-auto sm:flex">
                  {result.agentTrace.map((a) => (
                    <div key={a.agent} className="flex shrink-0 items-center gap-1">
                      {a.ok
                        ? <CheckCircle2 className="h-2.5 w-2.5" style={{ color: 'rgba(52,211,153,0.60)' }} />
                        : <XCircle     className="h-2.5 w-2.5" style={{ color: 'rgba(239,68,68,0.60)' }} />
                      }
                      <span className="text-[9px] font-semibold" style={{ color: 'rgba(255,255,255,0.25)' }}>
                        {a.agent} {(a.durationMs / 1000).toFixed(1)}s
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <button
              onClick={onReset}
              className="flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-bold transition-all hover:bg-white/[0.05]"
              style={{ borderColor: 'rgba(255,255,255,0.10)', color: 'rgba(255,255,255,0.50)' }}
            >
              <RotateCcw className="h-3 w-3" />
              New project
            </button>
          </div>

          {/* Tab strip */}
          <div className="flex gap-0 overflow-x-auto">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className="relative flex shrink-0 items-center gap-1.5 px-4 py-2.5 text-xs font-bold transition-colors"
                style={{ color: tab === id ? 'rgba(20,184,166,0.95)' : 'rgba(255,255,255,0.32)' }}
              >
                <Icon
                  className="h-3.5 w-3.5 shrink-0"
                  style={{ color: tab === id ? 'rgba(20,184,166,0.80)' : 'rgba(255,255,255,0.25)' }}
                />
                {label}
                {tab === id && (
                  <div
                    className="absolute bottom-0 left-2 right-2 h-[2px] rounded-full"
                    style={{ background: 'rgba(20,184,166,0.75)' }}
                  />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tab content */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-5xl px-6 py-8">
          {tab === 'overview'     && <OverviewTab     result={result} />}
          {tab === 'architecture' && <ArchitectureTab result={result} />}
          {tab === 'code'         && <CodeTab         result={result} />}
          {tab === 'workflow'     && <WorkflowTab     result={result} />}
          {tab === 'deploy'       && <DeployTab       result={result} />}
          {tab === 'docs'         && <DocsTab         result={result} />}
          {tab === 'validation'   && <ValidationTab   result={result} />}
        </div>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export function EngineeringPlatform({
  selectedProjectId,
  onProjectCreated,
}: {
  selectedProjectId?: string | null;
  onProjectCreated?: (id: string) => void;
}) {
  const [currentProject, setCurrentProject] = useState<EngProject | null>(() => {
    if (!selectedProjectId) return null;
    return loadProjects().find((p) => p.id === selectedProjectId) ?? null;
  });

  const [state, setState] = useState<'home' | 'loading' | 'result'>(() => {
    if (!selectedProjectId) return 'home';
    const p = loadProjects().find((proj) => proj.id === selectedProjectId);
    return p?.result ? 'result' : 'home';
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
      onProjectCreated?.(done.id);
    } catch {
      setState('home');
    } finally {
      stopTimer();
    }
  }, [onProjectCreated]);

  const handleReset = () => {
    setCurrentProject(null);
    setState('home');
  };

  if (state === 'loading') return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-y-auto" style={{ background: '#0d0d0d' }}>
      <LoadingView elapsed={elapsed} />
    </div>
  );

  if (state === 'result' && currentProject?.result) return (
    <ResultView project={currentProject} onReset={handleReset} />
  );

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-y-auto" style={{ background: '#0d0d0d' }}>
      <HomeView onSubmit={handleSubmit} />
    </div>
  );
}
