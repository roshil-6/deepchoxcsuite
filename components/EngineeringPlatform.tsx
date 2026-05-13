'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  ArrowRight, Copy, Check, ChevronRight, Zap, Globe, Cpu,
  Rocket, FlaskConical, Wifi, Factory, Layers, Bot,
  Code2, GitBranch, Cloud, FileText, ShieldCheck, RotateCcw,
  Play, AlertTriangle, CheckCircle2, Clock, Sparkles,
  Terminal, Network, BarChart3, BookOpen, Shield,
} from 'lucide-react';
import type { OrchestrationResult, SystemNode, CodeFile, WorkflowPhase, DeploymentConfig, Risk } from '@/app/api/orchestrate/route';
import { useTheme } from '@/lib/ThemeContext';

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
  { id: 'software',   label: 'Software',   icon: Code2 },
  { id: 'ai',         label: 'AI / ML',    icon: Bot },
  { id: 'hardware',   label: 'Hardware',   icon: Cpu },
  { id: 'robotics',   label: 'Robotics',   icon: Zap },
  { id: 'aerospace',  label: 'Aerospace',  icon: Rocket },
  { id: 'biotech',    label: 'Biotech',    icon: FlaskConical },
  { id: 'iot',        label: 'IoT',        icon: Wifi },
  { id: 'industrial', label: 'Industrial', icon: Factory },
  { id: 'web3',       label: 'Web3',       icon: Globe },
  { id: 'saas',       label: 'SaaS',       icon: Layers },
];

const SUGGESTIONS = [
  { label: 'Autonomous drone swarm with real-time collision avoidance',        domain: 'aerospace',  tag: 'Aerospace'  },
  { label: 'Computer vision pipeline for industrial quality defect detection', domain: 'robotics',   tag: 'Robotics'   },
  { label: 'Edge AI sensor mesh for predictive equipment maintenance',         domain: 'iot',        tag: 'IoT'        },
  { label: 'Self-healing microservices platform with AI-driven observability', domain: 'ai',         tag: 'AI / ML'    },
  { label: 'Reinforcement learning engine for smart grid load balancing',      domain: 'industrial', tag: 'Industrial' },
  { label: 'On-chain AI inference marketplace with verifiable compute',        domain: 'web3',       tag: 'Web3'       },
];

// ── Agent pipeline ─────────────────────────────────────────────────────────────

const AGENTS = [
  { id: 'Planner',    label: 'Planner',    model: 'Claude',  desc: 'System decomposition & scope',  wave: 1 },
  { id: 'Researcher', label: 'Researcher', model: 'GPT-4o',  desc: 'Technology & market research',  wave: 1 },
  { id: 'Architect',  label: 'Architect',  model: 'Claude',  desc: 'Architecture & data flow',      wave: 2 },
  { id: 'CodeGen',    label: 'Code Gen',   model: 'GPT-4o',  desc: 'Production code generation',    wave: 2 },
  { id: 'Workflow',   label: 'Workflow',   model: 'Claude',  desc: 'Sprint & milestone planning',   wave: 2 },
  { id: 'Deploy',     label: 'Deploy',     model: 'GPT-4o',  desc: 'Infra & deployment configs',    wave: 3 },
  { id: 'Docs',       label: 'Docs',       model: 'Claude',  desc: 'README & API documentation',    wave: 3 },
  { id: 'Validator',  label: 'Validator',  model: 'Claude',  desc: 'Risk analysis & confidence',    wave: 3 },
];

// ── Tabs ───────────────────────────────────────────────────────────────────────

type Tab = 'overview' | 'architecture' | 'code' | 'workflow' | 'deploy' | 'docs' | 'validation';

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'overview',     label: 'Overview',     icon: Sparkles    },
  { id: 'architecture', label: 'Architecture', icon: Network     },
  { id: 'code',         label: 'Code Engine',  icon: Terminal    },
  { id: 'workflow',     label: 'Workflow',     icon: Clock       },
  { id: 'deploy',       label: 'Deploy',       icon: Cloud       },
  { id: 'docs',         label: 'Docs',         icon: BookOpen    },
  { id: 'validation',   label: 'Validation',   icon: BarChart3   },
];

// ── Particle canvas ────────────────────────────────────────────────────────────

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
      canvas.width  = W * dpr;
      canvas.height = H * dpr;
      ctx.scale(dpr, dpr);
      cx = W / 2;
      cy = H / 2;
    };
    resize();
    window.addEventListener('resize', resize);

    type P = { angle: number; r: number; speed: number; size: number; alpha: number };
    const particles: P[] = Array.from({ length: 100 }, () => {
      const band = Math.random();
      return {
        angle: Math.random() * Math.PI * 2,
        r:     band < 0.3 ? 36 + Math.random() * 44
             : band < 0.6 ? 100 + Math.random() * 60
             :               180 + Math.random() * 80,
        speed: (0.0015 + Math.random() * 0.0045) * (Math.random() > 0.5 ? 1 : -1),
        size:  0.5 + Math.random() * 2.0,
        alpha: 0.10 + Math.random() * 0.45,
      };
    });

    let raf: number;
    let t = 0;

    const draw = () => {
      t++;
      ctx.clearRect(0, 0, W, H);

      // Pulsing radial glow
      const pulse = 0.055 + Math.sin(t * 0.022) * 0.02;
      const glow  = ctx.createRadialGradient(cx, cy, 0, cx, cy, 220);
      glow.addColorStop(0,   `rgba(20,184,166,${pulse})`);
      glow.addColorStop(0.4, `rgba(20,184,166,${pulse * 0.35})`);
      glow.addColorStop(1,   'rgba(20,184,166,0)');
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, W, H);

      // Compute positions
      const pos = particles.map(p => {
        p.angle += p.speed;
        return { x: cx + Math.cos(p.angle) * p.r, y: cy + Math.sin(p.angle) * p.r, alpha: p.alpha, size: p.size };
      });

      // Connection lines
      for (let i = 0; i < pos.length; i++) {
        for (let j = i + 1; j < pos.length; j++) {
          const dx   = pos[i].x - pos[j].x;
          const dy   = pos[i].y - pos[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 60) {
            ctx.beginPath();
            ctx.moveTo(pos[i].x, pos[i].y);
            ctx.lineTo(pos[j].x, pos[j].y);
            ctx.strokeStyle = `rgba(20,184,166,${0.07 * (1 - dist / 60)})`;
            ctx.lineWidth   = 0.5;
            ctx.stroke();
          }
        }
      }

      // Dots
      for (const p of pos) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(20,184,166,${p.alpha})`;
        ctx.fill();
      }

      raf = requestAnimationFrame(draw);
    };

    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" style={{ pointerEvents: 'none' }} />;
}

// ── Shared primitives ──────────────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    void navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };
  return (
    <button
      onClick={copy}
      className="flex items-center gap-1.5 rounded-lg bg-neutral-100 px-2.5 py-1.5 text-xs font-semibold text-neutral-600 transition-all hover:bg-neutral-200"
    >
      {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
      {copied ? 'Copied!' : 'Copy'}
    </button>
  );
}

function Badge({ label, color = 'rgba(82,82,82,0.25)', dark }: { label: string; color?: string; dark?: boolean }) {
  return (
    <span
      className="rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest"
      style={{ background: color, color: dark ? '#d4d4d4' : '#171717' }}
    >
      {label}
    </span>
  );
}

function SectionTitle({ children, sub, dark }: { children: React.ReactNode; sub?: string; dark?: boolean }) {
  return (
    <div className="mb-5">
      <div className="flex items-center gap-2">
        <div className="h-4 w-[3px] rounded-full" style={{ background: dark ? '#525252' : '#a3a3a3' }} />
        <h3 className={`text-[11px] font-bold uppercase tracking-[0.14em] subpixel-antialiased ${dark ? 'text-neutral-400' : 'text-neutral-500'}`}>
          {children}
        </h3>
      </div>
      {sub && (
        <p className={`mt-1 pl-3.5 text-xs font-medium subpixel-antialiased ${dark ? 'text-neutral-500' : 'text-neutral-500'}`}>{sub}</p>
      )}
    </div>
  );
}

function Prose({ children, dark }: { children: React.ReactNode; dark?: boolean }) {
  return (
    <p className={`text-sm font-medium leading-[1.75] subpixel-antialiased ${dark ? 'text-neutral-300' : 'text-neutral-600'}`}>
      {children}
    </p>
  );
}

function Card({ children, className = '', glow = false, dark }: { children: React.ReactNode; className?: string; glow?: boolean; dark?: boolean }) {
  return (
    <div
      className={`rounded-2xl border p-5 subpixel-antialiased transition-shadow duration-300 ${className}`}
      style={{
        borderColor: dark ? 'rgba(64,64,64,0.4)' : 'rgba(0,0,0,0.08)',
        background: dark ? '#141414' : '#ffffff',
        boxShadow: glow
          ? dark
            ? '0 1px 2px rgba(0,0,0,0.2), 0 8px 24px -8px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.03) inset'
            : '0 1px 2px rgba(0,0,0,0.04), 0 8px 24px -8px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.03) inset'
          : dark
            ? '0 1px 2px rgba(0,0,0,0.2), 0 6px 20px -6px rgba(0,0,0,0.3)'
            : '0 1px 2px rgba(0,0,0,0.04), 0 6px 20px -6px rgba(0,0,0,0.07)',
      }}
    >
      {children}
    </div>
  );
}

// New SystemCard component with neutral grey design
function SystemCard({ sys, index, dark }: { sys: SystemNode; index: number; dark?: boolean }) {
  const neutralColor = dark ? '#525252' : '#737373'; // neutral grey

  return (
    <div
      className={`group relative overflow-hidden rounded-2xl border p-5 subpixel-antialiased transition-all duration-300 hover:scale-[1.01] hover:shadow-lg ${
        dark
          ? 'border-[#262626] hover:border-[#404040] hover:shadow-black/20'
          : 'border-neutral-200 hover:border-neutral-300 hover:shadow-neutral-200/50'
      }`}
      style={{
        background: dark
          ? '#141414'
          : '#ffffff',
        boxShadow: dark
          ? '0 1px 3px rgba(0,0,0,0.3)'
          : '0 1px 3px rgba(0,0,0,0.05)',
      }}
    >
      {/* Top accent line - neutral grey */}
      <div
        className="absolute left-0 right-0 top-0 h-0.5"
        style={{ background: `linear-gradient(to right, ${neutralColor}, ${neutralColor}66)` }}
      />

      {/* Icon / Number */}
      <div className="mb-4 flex items-center justify-between">
        <div
          className="flex h-8 w-8 items-center justify-center rounded-lg text-sm font-medium"
          style={{
            background: dark ? '#1a1a1a' : '#f5f5f5',
            color: dark ? '#a3a3a3' : '#525252',
          }}
        >
          {index + 1}
        </div>
        <span
          className="rounded-md px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider"
          style={{
            background: dark ? '#1a1a1a' : '#f5f5f5',
            color: dark ? '#a3a3a3' : '#525252',
          }}
        >
          {sys.type}
        </span>
      </div>

      {/* Title */}
      <h4 className={`mb-2 text-[15px] font-semibold leading-tight ${dark ? 'text-neutral-200' : 'text-neutral-900'}`}>
        {sys.name}
      </h4>

      {/* Description */}
      <p className={`mb-4 text-[13px] leading-relaxed ${dark ? 'text-neutral-500' : 'text-neutral-600'}`}>
        {sys.description}
      </p>

      {/* Connections */}
      {sys.connections.length > 0 && (
        <div className={`flex flex-wrap gap-1.5 pt-3 border-t ${dark ? 'border-[#262626]' : 'border-neutral-100'}`}>
          <span className={`text-[10px] ${dark ? 'text-neutral-600' : 'text-neutral-500'}`}>Connects to:</span>
          {sys.connections.slice(0, 3).map((c) => (
            <span
              key={c}
              className="rounded-md px-2 py-0.5 text-[10px] font-medium"
              style={{
                background: dark ? '#1a1a1a' : '#f5f5f5',
                color: dark ? '#a3a3a3' : '#525252',
              }}
            >
              {c}
            </span>
          ))}
          {sys.connections.length > 3 && (
            <span className={`text-[10px] ${dark ? 'text-neutral-600' : 'text-neutral-500'}`}>
              +{sys.connections.length - 3} more
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 py-2.5 border-b last:border-b-0" style={{ borderColor: 'rgba(15,23,42,0.06)' }}>
      <span className="min-w-[80px] sm:min-w-[110px] text-[10px] font-bold uppercase tracking-wider" style={{ color: 'rgba(20,184,166,0.55)' }}>{label}</span>
      <span className="text-sm font-semibold" style={{ color: '#334155' }}>{value}</span>
    </div>
  );
}

// ── Complexity / severity ──────────────────────────────────────────────────────

const COMPLEXITY_COLOR: Record<string, string> = {
  low:     'rgba(82,82,82,0.25)',
  medium:  'rgba(82,82,82,0.35)',
  high:    'rgba(82,82,82,0.45)',
  extreme: 'rgba(82,82,82,0.55)',
};

const COMPLEXITY_TEXT: Record<string, string> = {
  low:     'Low Complexity',
  medium:  'Medium Complexity',
  high:    'High Complexity',
  extreme: 'Extreme Complexity',
};

const SEVERITY_COLOR: Record<string, string> = {
  low:      'rgba(82,82,82,0.20)',
  medium:   'rgba(82,82,82,0.35)',
  high:     'rgba(82,82,82,0.50)',
  critical: 'rgba(82,82,82,0.65)',
};

const SEVERITY_DOT: Record<string, string> = {
  low:      '#737373',
  medium:   '#525252',
  high:     '#404040',
  critical: '#262626',
};

// ── Overview tab ───────────────────────────────────────────────────────────────

function OverviewTab({ result }: { result: OrchestrationResult }) {
  const { theme } = useTheme();
  const dark = theme === 'dark';

  return (
    <div className="space-y-10">
      {/* Concept */}
      <section>
        <SectionTitle sub="AI-generated system brief and scope analysis" dark={dark}>Concept Analysis</SectionTitle>
        <Card glow dark={dark}>
          <div className="mb-4 flex flex-wrap items-center gap-2.5">
            <Badge label={COMPLEXITY_TEXT[result.complexity] ?? result.complexity} color={COMPLEXITY_COLOR[result.complexity]} dark={dark} />
            <span className={`text-xs font-semibold ${dark ? 'text-slate-500' : 'text-slate-400'}`}>
              {result.systems.length} subsystems &nbsp;&middot;&nbsp; {result.techStack.length} technologies identified
            </span>
          </div>
          <Prose dark={dark}>{result.concept}</Prose>
        </Card>
      </section>

      {/* System decomposition - Improved Design */}
      <section>
        <SectionTitle sub="Key modules and their interdependencies" dark={dark}>System Decomposition</SectionTitle>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {result.systems.map((sys: SystemNode, idx: number) => (
            <SystemCard
              key={sys.id}
              sys={sys}
              index={idx}
              dark={dark}
            />
          ))}
        </div>
      </section>

      {/* Tech stack */}
      <section>
        <SectionTitle sub="Curated technology choices with rationale and alternatives">Technology Stack</SectionTitle>
        {result.researchInsights && (
          <Card className="mb-4">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-widest" style={{ color: 'rgba(20,184,166,0.60)' }}>
              Research Insights
            </p>
            <Prose>{result.researchInsights}</Prose>
          </Card>
        )}
        <div className="space-y-1.5">
          {result.techStack.map((t, i) => (
            <div
              key={i}
              className="group flex items-start gap-5 rounded-2xl border px-5 py-4 transition-all duration-200 hover:border-slate-300/90 hover:shadow-sm hover:bg-slate-50"
              style={{ borderColor: 'rgba(15,23,42,0.07)', background: '#ffffff' }}
            >
              <span
                className="mt-0.5 min-w-[96px] text-[10px] font-bold uppercase tracking-widest"
                style={{ color: 'rgba(20,184,166,0.62)' }}
              >
                {t.category}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-baseline gap-2.5">
                  <span className="text-sm font-bold" style={{ color: '#0f172a' }}>{t.name}</span>
                  {t.version && (
                    <span className="text-[10px] font-semibold" style={{ color: '#94a3b8' }}>v{t.version}</span>
                  )}
                </div>
                <p className="mt-0.5 text-xs font-medium leading-relaxed" style={{ color: '#64748b' }}>{t.reason}</p>
                {t.alternatives?.length > 0 && (
                  <p className="mt-1.5 text-[10px] font-medium" style={{ color: '#94a3b8' }}>
                    <span style={{ color: '#cbd5e1' }}>Alternatives: </span>
                    {t.alternatives.join(' · ')}
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
          <SectionTitle sub="Highest-leverage action to start building immediately">Recommended First Step</SectionTitle>
          <div
            className="flex items-start gap-4 rounded-2xl border p-5"
            style={{ borderColor: 'rgba(20,184,166,0.22)', background: 'rgba(20,184,166,0.05)' }}
          >
            <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full" style={{ background: 'rgba(20,184,166,0.15)' }}>
              <ArrowRight className="h-3.5 w-3.5" style={{ color: 'rgba(20,184,166,0.85)' }} />
            </div>
            <Prose>{result.nextStep}</Prose>
          </div>
        </section>
      )}
    </div>
  );
}

// ── Architecture tab ───────────────────────────────────────────────────────────

function ArchitectureTab({ result }: { result: OrchestrationResult }) {
  return (
    <div className="space-y-10">
      <section>
        <SectionTitle sub="System structure, component relationships, and design decisions">System Architecture</SectionTitle>
        <Card>
          <div className="space-y-3">
            {result.architecture.split('\n').filter(Boolean).map((para, i) => (
              <Prose key={i}>{para}</Prose>
            ))}
          </div>
        </Card>
      </section>

      <section>
        <SectionTitle sub="How data moves through the system end-to-end">Data Flow</SectionTitle>
        <Card>
          <div className="space-y-3">
            {result.dataFlow.split('\n').filter(Boolean).map((para, i) => (
              <Prose key={i}>{para}</Prose>
            ))}
          </div>
        </Card>
      </section>

      {result.integrationPoints?.length > 0 && (
        <section>
          <SectionTitle sub="External systems, APIs, and third-party dependencies">Integration Points</SectionTitle>
          <div className="grid gap-2 sm:grid-cols-2">
            {result.integrationPoints.map((pt, i) => (
              <div
                key={i}
                className="flex items-center gap-3 rounded-2xl border px-4 py-3.5 transition-all hover:border-slate-300/90 hover:shadow-sm"
                style={{ borderColor: 'rgba(15,23,42,0.07)', background: '#ffffff' }}
              >
                <ChevronRight className="h-3.5 w-3.5 shrink-0" style={{ color: 'rgba(20,184,166,0.55)' }} />
                <span className="text-sm font-semibold" style={{ color: '#334155' }}>{pt}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <SectionTitle sub="Strategy for handling growth in traffic, data, and users">Scaling Strategy</SectionTitle>
        <Card>
          <div className="space-y-3">
            {result.scalingStrategy.split('\n').filter(Boolean).map((para, i) => (
              <Prose key={i}>{para}</Prose>
            ))}
          </div>
        </Card>
      </section>
    </div>
  );
}

// ── Code tab ───────────────────────────────────────────────────────────────────

function CodeTab({ result }: { result: OrchestrationResult }) {
  const [activeFile, setActiveFile] = useState(0);
  const file: CodeFile | undefined = result.codeFiles[activeFile];

  return (
    <div className="space-y-6">
      {/* File picker */}
      <div>
        <p className="mb-2.5 text-[10px] font-bold uppercase tracking-widest" style={{ color: '#94a3b8' }}>
          Generated Files — {result.codeFiles.length} total
        </p>
        <div className="flex flex-wrap gap-2">
          {result.codeFiles.map((f: CodeFile, i: number) => (
            <button
              key={i}
              onClick={() => setActiveFile(i)}
              className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-bold transition-all"
              style={{
                borderColor: activeFile === i ? 'rgba(20,184,166,0.50)' : 'rgba(15,23,42,0.07)',
                background:  activeFile === i ? 'rgba(20,184,166,0.10)' : '#ffffff',
                color:       activeFile === i ? 'rgba(20,184,166,0.92)' : '#64748b',
              }}
            >
              <Code2 className="h-3 w-3 shrink-0" />
              {f.path.split('/').pop()}
            </button>
          ))}
        </div>
      </div>

      {file && (
        <div className="overflow-hidden rounded-2xl border" style={{ borderColor: 'rgba(15,23,42,0.09)' }}>
          {/* File header */}
          <div
            className="flex items-center justify-between border-b px-5 py-3.5"
            style={{ borderColor: 'rgba(15,23,42,0.07)', background: '#f1f5f9' }}
          >
            <div>
              <div className="flex items-center gap-2">
                <Terminal className="h-3.5 w-3.5 shrink-0" style={{ color: 'rgba(20,184,166,0.60)' }} />
                <span className="font-mono text-sm font-bold text-slate-900">{file.path}</span>
              </div>
              <p className="mt-0.5 pl-5 text-xs font-medium text-slate-500">{file.purpose}</p>
            </div>
            <div className="flex items-center gap-2.5">
              <Badge label={file.language} />
              <CopyButton text={file.code} />
            </div>
          </div>
          {/* Code body */}
          <div className="overflow-x-auto bg-[#0f172a]">
            <pre
              className="p-4 sm:p-6 text-xs leading-[1.7]"
              style={{ color: '#e2e8f0', fontFamily: "'JetBrains Mono','Fira Code','Cascadia Code',monospace" }}
            >
              <code>{file.code}</code>
            </pre>
          </div>
        </div>
      )}

      {/* Setup instructions */}
      {result.setupInstructions && (
        <div className="overflow-hidden rounded-2xl border" style={{ borderColor: 'rgba(15,23,42,0.09)' }}>
          <div
            className="flex items-center justify-between border-b px-5 py-3.5"
            style={{ borderColor: 'rgba(15,23,42,0.07)', background: '#f1f5f9' }}
          >
            <div className="flex items-center gap-2">
              <Terminal className="h-3.5 w-3.5 shrink-0" style={{ color: 'rgba(20,184,166,0.60)' }} />
              <span className="text-xs font-bold uppercase tracking-widest text-slate-600">
                Setup & Installation
              </span>
            </div>
            <CopyButton text={result.setupInstructions} />
          </div>
          <div className="overflow-x-auto bg-[#0f172a]">
            <pre
              className="p-4 sm:p-6 text-xs leading-[1.7] whitespace-pre-wrap"
              style={{ color: '#cbd5e1', fontFamily: "'JetBrains Mono','Fira Code',monospace" }}
            >
              {result.setupInstructions}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Workflow tab ───────────────────────────────────────────────────────────────

function WorkflowTab({ result }: { result: OrchestrationResult }) {
  return (
    <div className="space-y-10">
      {result.estimatedTimeline && (
        <div
          className="flex items-center gap-4 rounded-2xl border px-5 py-4"
          style={{ borderColor: 'rgba(20,184,166,0.22)', background: 'rgba(20,184,166,0.05)' }}
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full" style={{ background: 'rgba(20,184,166,0.15)' }}>
            <Clock className="h-4 w-4" style={{ color: 'rgba(20,184,166,0.80)' }} />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'rgba(20,184,166,0.55)' }}>Estimated Timeline</p>
            <p className="mt-0.5 text-sm font-bold" style={{ color: '#1e293b' }}>{result.estimatedTimeline}</p>
          </div>
        </div>
      )}

      <section>
        <SectionTitle sub="Sequential build phases with tasks and success milestones">Execution Phases</SectionTitle>
        <div className="space-y-3">
          {result.phases.map((ph: WorkflowPhase, idx: number) => (
            <div
              key={ph.phase}
              className="rounded-2xl border p-5 transition-all hover:border-slate-300/90 hover:shadow-sm"
              style={{ borderColor: 'rgba(15,23,42,0.08)', background: '#ffffff' }}
            >
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3.5">
                  <span
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                    style={{
                      background: 'rgba(20,184,166,0.12)',
                      color: 'rgba(20,184,166,0.88)',
                      border: '1.5px solid rgba(20,184,166,0.28)',
                    }}
                  >
                    {String(idx + 1).padStart(2, '0')}
                  </span>
                  <div>
                    <p className="text-sm font-bold" style={{ color: '#0f172a' }}>{ph.title}</p>
                    <p className="text-[10px] font-semibold" style={{ color: '#94a3b8' }}>Phase {ph.phase}</p>
                  </div>
                </div>
                <span
                  className="shrink-0 rounded-full px-3 py-1 text-xs font-bold"
                  style={{ background: 'rgba(15,23,42,0.06)', color: '#64748b' }}
                >
                  {ph.duration}
                </span>
              </div>

              <ul className="mb-4 space-y-2 pl-12">
                {ph.tasks.map((task, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm font-medium" style={{ color: '#64748b' }}>
                    <ChevronRight className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{ color: 'rgba(20,184,166,0.50)' }} />
                    {task}
                  </li>
                ))}
              </ul>

              <div className="flex items-center gap-2.5 pl-12">
                <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#94a3b8' }}>Milestone:</span>
                <span className="text-xs font-semibold" style={{ color: 'rgba(20,184,166,0.65)' }}>{ph.milestone}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {result.criticalPath?.length > 0 && (
        <section>
          <SectionTitle sub="Dependencies that directly impact the delivery date">Critical Path</SectionTitle>
          <div className="flex flex-wrap items-center gap-2">
            {result.criticalPath.map((item, i) => (
              <React.Fragment key={i}>
                <span
                  className="rounded-xl border px-3.5 py-1.5 text-xs font-semibold"
                  style={{ borderColor: 'rgba(15,23,42,0.11)', color: '#334155', background: '#f1f5f9' }}
                >
                  {item}
                </span>
                {i < result.criticalPath.length - 1 && (
                  <ArrowRight className="h-3.5 w-3.5 shrink-0" style={{ color: 'rgba(20,184,166,0.40)' }} />
                )}
              </React.Fragment>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

// ── Deploy tab ─────────────────────────────────────────────────────────────────

function DeployTab({ result }: { result: OrchestrationResult }) {
  const [activeConfig, setActiveConfig] = useState(0);
  const cfg: DeploymentConfig | undefined = result.deploymentConfigs[activeConfig];

  return (
    <div className="space-y-6">
      {result.cloudRecommendation && (
        <section>
          <SectionTitle sub="Optimal cloud provider and infrastructure pattern for this system">Cloud Recommendation</SectionTitle>
          <Card>
            <div className="space-y-3">
              {result.cloudRecommendation.split('\n').filter(Boolean).map((para, i) => (
                <Prose key={i}>{para}</Prose>
              ))}
            </div>
          </Card>
        </section>
      )}

      <div>
        <p className="mb-2.5 text-[10px] font-bold uppercase tracking-widest" style={{ color: '#94a3b8' }}>
          Config Files — {result.deploymentConfigs.length} generated
        </p>
        <div className="flex flex-wrap gap-2">
          {result.deploymentConfigs.map((c: DeploymentConfig, i: number) => (
            <button
              key={i}
              onClick={() => setActiveConfig(i)}
              className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-bold transition-all"
              style={{
                borderColor: activeConfig === i ? 'rgba(20,184,166,0.50)' : 'rgba(15,23,42,0.07)',
                background:  activeConfig === i ? 'rgba(20,184,166,0.10)' : '#ffffff',
                color:       activeConfig === i ? 'rgba(20,184,166,0.92)' : '#64748b',
              }}
            >
              <Cloud className="h-3 w-3 shrink-0" />
              {c.target}
            </button>
          ))}
        </div>
      </div>

      {cfg && (
        <div className="overflow-hidden rounded-2xl border" style={{ borderColor: 'rgba(15,23,42,0.09)' }}>
          <div
            className="flex items-center justify-between border-b px-5 py-3.5"
            style={{ borderColor: 'rgba(15,23,42,0.07)', background: '#f1f5f9' }}
          >
            <div>
              <span className="font-mono text-sm font-bold text-slate-900">{cfg.filename}</span>
              <p className="mt-0.5 text-xs font-medium text-slate-500">{cfg.description}</p>
            </div>
            <CopyButton text={cfg.content} />
          </div>
          <div className="overflow-x-auto bg-[#0f172a]">
            <pre
              className="p-4 sm:p-6 text-xs leading-[1.7]"
              style={{ color: '#e2e8f0', fontFamily: "'JetBrains Mono','Fira Code',monospace" }}
            >
              <code>{cfg.content}</code>
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Docs tab ───────────────────────────────────────────────────────────────────

function DocsTab({ result }: { result: OrchestrationResult }) {
  const [view, setView] = useState<'readme' | 'api'>('readme');
  const content = view === 'readme' ? result.readme : result.apiDocs;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2.5">
        {(['readme', 'api'] as const).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className="flex items-center gap-1.5 rounded-lg border px-4 py-1.5 text-xs font-bold transition-all"
            style={{
              borderColor: view === v ? 'rgba(20,184,166,0.50)' : 'rgba(15,23,42,0.07)',
              background:  view === v ? 'rgba(20,184,166,0.10)' : 'transparent',
              color:       view === v ? 'rgba(20,184,166,0.92)' : '#64748b',
            }}
          >
            <BookOpen className="h-3 w-3" />
            {v === 'readme' ? 'README.md' : 'API Reference'}
          </button>
        ))}
        <CopyButton text={content} />
      </div>
      <div className="overflow-hidden rounded-2xl border" style={{ borderColor: 'rgba(15,23,42,0.09)' }}>
        <div className="border-b px-5 py-2.5" style={{ borderColor: 'rgba(15,23,42,0.06)', background: '#f1f5f9' }}>
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-600">
            {view === 'readme' ? 'README.md — Project overview and getting started' : 'API Reference — Endpoints, schemas, and examples'}
          </span>
        </div>
        <pre
          className="overflow-x-auto bg-[#0f172a] p-4 sm:p-6 text-xs leading-[1.75] whitespace-pre-wrap"
          style={{ color: '#cbd5e1', fontFamily: "'JetBrains Mono','Fira Code',monospace" }}
        >
          {content}
        </pre>
      </div>
    </div>
  );
}

// ── Validation tab ─────────────────────────────────────────────────────────────

function ValidationTab({ result }: { result: OrchestrationResult }) {
  const score = result.confidenceScore ?? 0;
  const scoreColor  = score >= 80 ? '#a3a3a3' : score >= 60 ? '#737373' : '#525252';
  const scoreLabel  = score >= 80 ? 'High Confidence' : score >= 60 ? 'Moderate Confidence' : 'Low Confidence';
  const scoreDetail = score >= 80
    ? 'The plan is well-defined and ready to build. Begin with the recommended first step.'
    : score >= 60
    ? 'The plan is solid but some risks should be resolved before starting development.'
    : 'Significant ambiguity detected. Review all risks carefully before committing resources.';

  return (
    <div className="space-y-10">
      {/* Score */}
      <section>
        <SectionTitle sub="AI-evaluated plan quality across 8 dimensions">Confidence Score</SectionTitle>
        <Card glow>
          <div className="mb-5 flex items-end gap-3">
            <span className="text-7xl font-bold tabular-nums leading-none" style={{ color: scoreColor }}>{score}</span>
            <span className="mb-2 text-2xl font-bold" style={{ color: '#94a3b8' }}>/100</span>
            <span
              className="mb-2 ml-1 rounded-full px-3 py-1 text-xs font-bold"
              style={{ background: `${scoreColor}22`, color: scoreColor }}
            >
              {scoreLabel}
            </span>
          </div>
          <div className="mb-4 h-2 w-full overflow-hidden rounded-full" style={{ background: 'rgba(15,23,42,0.07)' }}>
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${score}%`, background: `linear-gradient(to right, ${scoreColor}aa, ${scoreColor})` }}
            />
          </div>
          <p className="text-xs font-semibold leading-relaxed" style={{ color: '#64748b' }}>
            {scoreDetail}
          </p>
        </Card>
      </section>

      {/* Risks */}
      <section>
        <SectionTitle sub={`${result.risks.length} risks identified across the system`}>Risk Register</SectionTitle>
        <div className="space-y-2">
          {result.risks.map((r: Risk, i: number) => (
            <div
              key={i}
              className="rounded-2xl border p-5 transition-all hover:border-slate-300/90 hover:shadow-sm"
              style={{ borderColor: 'rgba(15,23,42,0.07)', background: '#ffffff' }}
            >
              <div className="mb-3 flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div
                    className="mt-0.5 h-2 w-2 shrink-0 rounded-full"
                    style={{ background: SEVERITY_DOT[r.severity] ?? '#ffffff55' }}
                  />
                  <span className="text-sm font-bold" style={{ color: '#1e293b' }}>{r.area}</span>
                </div>
                <span
                  className="shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest"
                  style={{ background: SEVERITY_COLOR[r.severity], color: '#fff' }}
                >
                  {r.severity}
                </span>
              </div>
              <p className="mb-3 text-xs font-medium leading-relaxed" style={{ color: '#64748b' }}>{r.risk}</p>
              <div className="flex items-start gap-2 rounded-xl px-3 py-2.5" style={{ background: '#f1f5f9' }}>
                <Shield className="mt-0.5 h-3 w-3 shrink-0" style={{ color: '#94a3b8' }} />
                <p className="text-xs font-medium" style={{ color: '#64748b' }}>
                  <span className="font-bold" style={{ color: '#94a3b8' }}>Mitigation: </span>
                  {r.mitigation}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Optimizations */}
      {result.optimizations?.length > 0 && (
        <section>
          <SectionTitle sub="Opportunities to improve performance, cost, and reliability">Optimization Opportunities</SectionTitle>
          <div className="space-y-2">
            {result.optimizations.map((opt, i) => (
              <div
                key={i}
                className="flex items-start gap-3.5 rounded-2xl border px-5 py-4 transition-all hover:border-slate-300"
                style={{ borderColor: 'rgba(15,23,42,0.07)', background: '#ffffff' }}
              >
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" style={{ color: 'rgba(52,211,153,0.70)' }} />
                <span className="text-sm font-semibold leading-relaxed" style={{ color: '#475569' }}>{opt}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

// ── Loading view ───────────────────────────────────────────────────────────────

const WAVE_LABELS: Record<number, { title: string; sub: string }> = {
  1: { title: 'Wave 1 — Analysis',       sub: 'Understanding scope and researching technology' },
  2: { title: 'Wave 2 — Design & Build', sub: 'Architecture, code generation, and workflow planning' },
  3: { title: 'Wave 3 — Production',     sub: 'Deployment, documentation, and validation' },
};

const LOADING_MESSAGES = [
  'Breaking down your system into discrete subsystems…',
  'Researching the most effective technology stack…',
  'Designing system architecture and data flow…',
  'Generating production-quality code files…',
  'Mapping execution phases and sprint milestones…',
  'Building infrastructure and deployment configs…',
  'Writing README, API docs, and setup guides…',
  'Running risk analysis and confidence scoring…',
];

function LoadingView({ elapsed }: { elapsed: number }) {
  const wave   = elapsed < 30 ? 1 : elapsed < 70 ? 2 : 3;
  const msgIdx = Math.min(Math.floor(elapsed / 11), LOADING_MESSAGES.length - 1);
  const [visible, setVisible] = useState(true);
  const prevIdx = useRef(msgIdx);

  useEffect(() => {
    if (prevIdx.current !== msgIdx) {
      setVisible(false);
      const t = setTimeout(() => { setVisible(true); prevIdx.current = msgIdx; }, 180);
      return () => clearTimeout(t);
    }
  }, [msgIdx]);

  const progress = Math.min((elapsed / 90) * 100, 96);

  return (
    <div className="relative flex min-h-0 flex-1 flex-col items-center justify-center overflow-y-auto overflow-x-hidden py-16 text-center antialiased subpixel-antialiased">
      <ParticleCanvas />

      <div className="relative z-10 flex w-full max-w-xl flex-col items-center px-4">
        {/* Orb */}
        <div className="relative mb-10 flex h-24 w-24 items-center justify-center">
          <div className="absolute inset-0 rounded-full" style={{ border: '1px solid rgba(20,184,166,0.18)', animation: 'ping 2.2s cubic-bezier(0,0,0.2,1) infinite' }} />
          <div className="absolute inset-2.5 rounded-full" style={{ border: '1px solid rgba(20,184,166,0.22)', animation: 'ping 2.2s cubic-bezier(0,0,0.2,1) infinite 0.5s' }} />
          <div
            className="relative h-14 w-14 rounded-full"
            style={{
              background: 'radial-gradient(circle at 38% 38%, rgba(20,184,166,0.35), rgba(20,184,166,0.08))',
              border: '1.5px solid rgba(20,184,166,0.45)',
              boxShadow: '0 0 28px rgba(20,184,166,0.22), inset 0 0 16px rgba(20,184,166,0.10)',
            }}
          >
            <div className="absolute inset-0 rounded-full" style={{ background: 'rgba(20,184,166,0.05)', animation: 'pulse 1.8s ease-in-out infinite' }} />
          </div>
        </div>

        {/* Message */}
        <p
          className="mb-2 text-base font-bold transition-opacity duration-200"
          style={{ color: '#0f172a', opacity: visible ? 1 : 0 }}
        >
          {LOADING_MESSAGES[msgIdx]}
        </p>
        <p className="mb-3 text-xs font-semibold" style={{ color: '#94a3b8' }}>
          {AGENTS.filter((a) => a.wave <= wave).length} of {AGENTS.length} agents active &nbsp;&middot;&nbsp; {elapsed}s elapsed
        </p>

        {/* Progress bar */}
        <div className="mb-10 h-1 w-52 overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-full rounded-full transition-all duration-1000"
            style={{ width: `${progress}%`, background: 'linear-gradient(to right, #2dd4bf, #0d9488)' }}
          />
        </div>

        {/* Agent waves */}
        <div className="w-full space-y-5">
          {[1, 2, 3].map((w) => {
            const done    = wave > w;
            const running = wave === w;
            return (
              <div key={w}>
                <div className="mb-2 flex items-center gap-2">
                  <div
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ background: done ? '#34d399' : running ? 'rgba(20,184,166,0.80)' : '#cbd5e1' }}
                  />
                  <p
                    className="text-left text-[10px] font-bold uppercase tracking-widest"
                    style={{ color: done ? 'rgba(52,211,153,0.70)' : running ? 'rgba(20,184,166,0.65)' : '#94a3b8' }}
                  >
                    {WAVE_LABELS[w].title}
                  </p>
                  {done && <CheckCircle2 className="h-3 w-3 ml-auto" style={{ color: 'rgba(52,211,153,0.65)' }} />}
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {AGENTS.filter((a) => a.wave === w).map((a) => {
                    const agDone    = wave > w;
                    const agRunning = wave === w;
                    return (
                      <div
                        key={a.id}
                        className="flex items-start gap-2.5 rounded-xl border px-3 py-2.5 transition-all"
                        style={{
                          borderColor: agDone    ? 'rgba(52,211,153,0.22)'
                                     : agRunning ? 'rgba(20,184,166,0.32)'
                                     :             'rgba(15,23,42,0.06)',
                          background:  agDone    ? 'rgba(52,211,153,0.05)'
                                     : agRunning ? 'rgba(20,184,166,0.07)'
                                     :             '#ffffff',
                        }}
                      >
                        <div className="mt-0.5 shrink-0">
                          {agDone ? (
                            <CheckCircle2 className="h-3.5 w-3.5" style={{ color: 'rgba(52,211,153,0.75)' }} />
                          ) : agRunning ? (
                            <div className="h-2.5 w-2.5 rounded-full" style={{ background: 'rgba(20,184,166,0.85)', animation: 'pulse 1s ease-in-out infinite' }} />
                          ) : (
                            <div className="h-2.5 w-2.5 rounded-full bg-slate-300" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <span
                            className="block truncate text-[11px] font-bold"
                            style={{
                              color: agDone    ? '#475569'
                                   : agRunning ? '#0f172a'
                                   :             '#94a3b8',
                            }}
                          >
                            {a.label}
                          </span>
                          <span className="block truncate text-[9px] font-semibold" style={{ color: '#94a3b8' }}>
                            {a.model} · {a.desc}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
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
  const { theme } = useTheme();
  const dark = theme === 'dark';

  const submit = useCallback(() => {
    if (!idea.trim()) return;
    onSubmit(idea.trim(), domain);
  }, [idea, domain, onSubmit]);

  const activeDomain = DOMAINS.find(d => d.id === domain);

  return (
    <div className={`flex min-h-0 flex-1 flex-col items-center px-4 py-12 antialiased subpixel-antialiased transition-colors duration-300 overflow-y-auto overscroll-y-contain ${dark ? 'bg-[#0a0a0a]' : 'bg-[#fafafa]'}`}>
      <div className="w-full max-w-3xl py-8">

        {/* Brand */}
        <div className="mb-10 text-center">
          <p className={`mb-1.5 text-[10px] font-medium uppercase tracking-[0.2em] subpixel-antialiased ${dark ? 'text-neutral-500' : 'text-neutral-400'}`}>
            northROSC LABS
          </p>
          <h1 className={`mb-4 text-2xl sm:text-3xl lg:text-[3rem] font-bold tracking-tight subpixel-antialiased ${dark ? 'text-neutral-100' : 'text-neutral-900'}`}>
            Deepchox
          </h1>
          <p className={`mx-auto max-w-xl text-sm font-medium leading-[1.8] subpixel-antialiased ${dark ? 'text-neutral-400' : 'text-neutral-600'}`}>
            Prompt an idea like you would for a landing page or app — Deepchox runs <strong className={dark ? 'text-neutral-300' : 'text-neutral-800'}>eight specialist agents</strong> in three waves and hands you architecture, code, deploy configs, and docs you can actually ship.
          </p>
        </div>

        {/* Input */}
        <div
          className={`mb-5 overflow-hidden rounded-2xl border text-left transition-all duration-300 shadow-sm hover:shadow-md ${
            focused
              ? dark ? 'border-neutral-600 bg-[#141414] shadow-lg' : 'border-neutral-300 bg-white shadow-lg'
              : dark ? 'border-[#262626] bg-[#141414]' : 'border-neutral-200 bg-white'
          }`}
        >
          <textarea
            ref={textareaRef}
            rows={4}
            value={idea}
            onChange={(e) => setIdea(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit(); }}
            placeholder="Describe what you're building — software system, hardware device, AI pipeline, robotics platform, aerospace application, biotech tool..."
            className={`w-full resize-none bg-transparent px-5 pt-5 pb-3 text-sm font-medium outline-none subpixel-antialiased transition-colors duration-200 ${dark ? 'text-neutral-200 placeholder:text-neutral-600' : 'text-neutral-900 placeholder:text-neutral-400'}`}
            style={{ minHeight: 110 }}
          />
          <div className={`flex items-center justify-between border-t px-5 py-3 ${dark ? 'border-[#262626]' : 'border-neutral-100'}`}>
            <div className="flex items-center gap-2">
              {activeDomain && (
                <span className={`flex items-center gap-1.5 text-xs font-medium ${dark ? 'text-neutral-500' : 'text-neutral-500'}`}>
                  <activeDomain.icon className="h-3 w-3" />
                  {activeDomain.label}
                </span>
              )}
              <span className={`text-xs font-medium ${dark ? 'text-neutral-600' : 'text-neutral-400'}`}>
                &middot; 8 agents · Claude + GPT-4o · ~90s
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`hidden text-[10px] font-medium sm:block ${dark ? 'text-neutral-600' : 'text-neutral-400'}`}>
                ⌘ Enter
              </span>
              <button
                onClick={submit}
                disabled={!idea.trim()}
                className={`flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-xs font-medium transition-all duration-150 ${
                  idea.trim()
                    ? dark ? 'bg-neutral-200 text-neutral-900 hover:bg-white' : 'bg-neutral-900 text-white hover:bg-neutral-800'
                    : dark ? 'bg-[#1a1a1a] text-neutral-600' : 'bg-neutral-100 text-neutral-400'
                }`}
              >
                <Play className="h-3 w-3" />
                Build it
              </button>
            </div>
          </div>
        </div>

        {/* Domain selector - Neutral colors */}
        <div className="mb-10">
          <p className={`mb-3 text-[10px] font-medium uppercase tracking-[0.1em] subpixel-antialiased ${dark ? 'text-neutral-500' : 'text-neutral-500'}`}>
            Engineering Domain
          </p>
          <div className="flex flex-wrap gap-2">
            {DOMAINS.map(({ id, label, icon: Icon }) => {
              const active = domain === id;
              return (
                <button
                  key={id}
                  onClick={() => setDomain(id)}
                  className={`flex items-center gap-1.5 rounded-xl border px-3.5 py-1.5 text-xs font-medium transition-all duration-200 hover:shadow-sm ${
                    active
                      ? dark
                        ? 'border-neutral-600 bg-[#1a1a1a] text-neutral-200 shadow-sm'
                        : 'border-neutral-300 bg-neutral-100 text-neutral-900 shadow-sm'
                      : dark
                        ? 'border-[#262626] bg-transparent text-neutral-500 hover:border-neutral-600 hover:text-neutral-400 hover:shadow-black/10'
                        : 'border-neutral-200 bg-transparent text-neutral-600 hover:border-neutral-300 hover:text-neutral-900 hover:shadow-neutral-200/50'
                  }`}
                >
                  <Icon className="h-3 w-3 opacity-70" />
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Suggestions - Neutral colors */}
        <div>
          <p className={`mb-3 text-[10px] font-medium uppercase tracking-[0.1em] subpixel-antialiased ${dark ? 'text-neutral-500' : 'text-neutral-500'}`}>
            Try an Example
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {SUGGESTIONS.map((s, i) => (
              <button
                key={i}
                onClick={() => { setIdea(s.label); setDomain(s.domain); textareaRef.current?.focus(); }}
                className={`group rounded-2xl border px-4 py-4 text-left transition-all duration-300 hover:shadow-md hover:scale-[1.01] ${
                  dark
                    ? 'border-[#262626] bg-[#141414] hover:border-[#404040] hover:bg-[#1a1a1a] hover:shadow-black/20'
                    : 'border-neutral-200 bg-white hover:border-neutral-300 hover:bg-neutral-50 hover:shadow-neutral-200/50'
                }`}
              >
                <div className="mb-2">
                  <span className={`rounded-lg px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider subpixel-antialiased ${dark ? 'bg-[#1a1a1a] text-neutral-500' : 'bg-neutral-100 text-neutral-500'}`}>
                    {s.tag}
                  </span>
                </div>
                <p className={`text-sm font-medium leading-snug subpixel-antialiased ${dark ? 'text-neutral-400' : 'text-neutral-600'}`}>
                  {s.label}
                </p>
              </button>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}

// ── Result view ────────────────────────────────────────────────────────────────

function ResultView({ project, onReset }: { project: EngProject; onReset: () => void }) {
  const [tab, setTab] = useState<Tab>('overview');
  const result = project.result!;
  const dom = DOMAINS.find(d => d.id === project.domain);
  const { theme } = useTheme();
  const dark = theme === 'dark';

  const orderedTrace = [...result.agentTrace].sort(
    (a, b) => AGENTS.findIndex((x) => x.id === a.agent) - AGENTS.findIndex((x) => x.id === b.agent),
  );
  const okAgents = orderedTrace.filter((a) => a.ok).length;
  const stoppedAgents = orderedTrace.length - okAgents;

  return (
    <div className={`flex min-h-0 flex-1 flex-col antialiased subpixel-antialiased overflow-y-auto transition-colors duration-300 ${dark ? 'bg-[#0a0a0a]' : 'bg-[#fafafa]'}`}>
      <div
        className={`shrink-0 border-b px-4 pt-4 pb-0 transition-colors duration-300 sm:px-6 sm:pt-5 ${dark ? 'border-[#1a1a1a] bg-[#0a0a0a]' : 'border-neutral-200 bg-[#fafafa]'}`}
      >
        <div className="mx-auto max-w-5xl">
          <div className="flex flex-col gap-3 pb-4 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
            <div className="min-w-0 flex-1">
              <p className={`mb-1 text-[10px] font-medium uppercase tracking-[0.14em] ${dark ? 'text-neutral-500' : 'text-neutral-500'}`}>
                Build result
              </p>
              <h2 className={`line-clamp-2 text-[17px] font-bold leading-snug sm:text-xl subpixel-antialiased ${dark ? 'text-neutral-100' : 'text-neutral-900'}`}>
                {project.title}
              </h2>
              <p className={`mt-1.5 max-w-2xl text-[13px] leading-relaxed subpixel-antialiased ${dark ? 'text-neutral-500' : 'text-neutral-600'}`}>
                Your co‑founder bench finished an eight‑agent orchestration pass. Deliverables live in the tabs below. Any step marked “stopped” hit a network or model error that wave—inspect Code / Docs / Validation for what still came through.
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2 sm:gap-2.5">
                {dom && (
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider subpixel-antialiased ${dark ? 'bg-[#1a1a1a] text-neutral-400' : 'bg-neutral-100 text-neutral-600'}`}>
                    <dom.icon className="h-2.5 w-2.5" />
                    {dom.label}
                  </span>
                )}
                <span className={`text-[11px] font-medium subpixel-antialiased ${dark ? 'text-neutral-400' : 'text-neutral-600'}`}>
                  {result.codeFiles.length} artifacts
                  <span className="mx-1.5 text-neutral-500 opacity-50">·</span>
                  {result.phases.length} phases
                  <span className="mx-1.5 text-neutral-500 opacity-50">·</span>
                  {result.risks.length} risks
                  <span className="mx-1.5 text-neutral-500 opacity-50">·</span>
                  {Math.round(result.durationMs / 1000)}s wall time
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={onReset}
              className={`flex shrink-0 items-center gap-1.5 self-start rounded-full border px-3.5 py-1.5 text-xs font-bold transition-all duration-200 hover:shadow-sm ${
                dark
                  ? 'border-[#262626] text-neutral-400 hover:bg-[#1a1a1a] hover:shadow-black/20'
                  : 'border-neutral-200 text-neutral-600 hover:bg-neutral-100 hover:shadow-neutral-200/50'
              }`}
            >
              <RotateCcw className="h-3 w-3" />
              New project
            </button>
          </div>

          <div className={`border-t pt-3 sm:pb-4 sm:pt-4 ${dark ? 'border-[#262626]' : 'border-neutral-200'}`}>
            <div className="mb-2 flex flex-wrap items-end justify-between gap-2">
              <span className={`text-[10px] font-semibold uppercase tracking-wider ${dark ? 'text-neutral-500' : 'text-neutral-500'}`}>
                Agent waves
              </span>
              <span className={`text-[11px] font-medium tabular-nums ${dark ? 'text-neutral-400' : 'text-neutral-500'}`}>
                {okAgents}/{orderedTrace.length} completed
                {stoppedAgents > 0 ? ` · ${stoppedAgents} stopped (errors)` : ''}
              </span>
            </div>
            <div className="-mx-1 flex gap-2 overflow-x-auto pb-2 [scrollbar-width:thin]">
              {orderedTrace.map((a) => (
                <div
                  key={a.agent}
                  title={
                    a.ok
                      ? `${a.agent}: completed (${a.model})`
                      : `${a.agent}: step failed — model timeout, parse error, or API issue. Retry with a shorter prompt or later.`
                  }
                  className={`flex shrink-0 items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-[10px] font-semibold shadow-sm subpixel-antialiased ${
                    a.ok
                      ? dark
                        ? 'border-[#262626] bg-[#141414] text-neutral-200'
                        : 'border-neutral-200 bg-white text-neutral-800'
                      : dark
                        ? 'border-amber-800/55 bg-[#241a05] text-amber-100'
                        : 'border-amber-200 bg-amber-50 text-amber-950'
                  }`}
                >
                  {a.ok ? (
                    <CheckCircle2 className={`h-3.5 w-3.5 shrink-0 ${dark ? 'text-emerald-500/85' : 'text-emerald-600'}`} />
                  ) : (
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
                  )}
                  <span>{a.agent}</span>
                  <span className={`tabular-nums opacity-75 ${dark ? 'text-neutral-500' : 'text-neutral-500'}`}>{(a.durationMs / 1000).toFixed(1)}s</span>
                </div>
              ))}
            </div>
          </div>

          {/* Tab strip */}
          <div className="flex gap-0 overflow-x-auto">
            {TABS.map(({ id, label, icon: Icon }) => {
              const active = tab === id;
              return (
                <button
                  key={id}
                  onClick={() => setTab(id)}
                  className={`relative flex shrink-0 items-center gap-1.5 rounded-t-lg px-4 py-2.5 text-xs font-bold transition-colors duration-200 ${
                    active
                      ? dark ? 'text-neutral-200' : 'text-neutral-900'
                      : dark ? 'text-neutral-500 hover:text-neutral-400' : 'text-neutral-400 hover:text-neutral-600'
                  }`}
                >
                  <Icon
                    className={`h-3.5 w-3.5 shrink-0 transition-colors duration-200 ${
                      active
                        ? dark ? 'text-neutral-300' : 'text-neutral-700'
                        : dark ? 'text-neutral-500' : 'text-neutral-400'
                    }`}
                  />
                  {label}
                  {active && (
                    <div
                      className="absolute bottom-0 left-2 right-2 h-[2px] rounded-full"
                      style={{ background: dark ? '#525252' : '#a3a3a3' }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1">
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
    <LoadingView elapsed={elapsed} />
  );

  if (state === 'result' && currentProject?.result) return (
    <ResultView project={currentProject} onReset={handleReset} />
  );

  return (
    <HomeView onSubmit={handleSubmit} />
  );
}
