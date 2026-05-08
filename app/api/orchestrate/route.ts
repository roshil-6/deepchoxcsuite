/**
 * /api/orchestrate  —  8-Agent AI Engineering OS Pipeline
 *
 * Wave 1 (parallel):   Planner (Claude)  +  Researcher (GPT-4o)
 * Wave 2 (parallel):   Architect (Claude) + CodeGen (GPT-4o) + Workflow (Claude)
 * Wave 3 (parallel):   Deploy (GPT-4o)   + Docs (Claude)    + Validator (Claude)
 *
 * Best output = Claude handles reasoning/architecture/validation
 *               GPT-4o handles code/tooling/deployment
 */

import { NextResponse } from 'next/server';
import { chatWithClaude, chatWithOpenAI } from '@/lib/ai/chatProviders';

export const maxDuration = 120;

// ── Output types ───────────────────────────────────────────────────────────────

export interface SystemNode {
  id: string;
  name: string;
  type: 'service' | 'database' | 'queue' | 'api' | 'frontend' | 'ai' | 'hardware' | 'cloud' | 'firmware' | 'physical';
  description: string;
  layer: string;
  connections: string[];
}

export interface TechItem {
  category: string;
  name: string;
  version?: string;
  reason: string;
  alternatives: string[];
}

export interface WorkflowPhase {
  phase: number;
  title: string;
  duration: string;
  tasks: string[];
  dependencies: string[];
  milestone: string;
  agents: string[];
}

export interface CodeFile {
  path: string;
  language: string;
  purpose: string;
  code: string;
}

export interface DeploymentConfig {
  target: string;
  filename: string;
  content: string;
  description: string;
}

export interface Risk {
  area: string;
  risk: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  mitigation: string;
}

export interface AgentTrace {
  agent: string;
  model: string;
  durationMs: number;
  ok: boolean;
}

export interface OrchestrationResult {
  // Wave 1 — Planner
  concept: string;
  complexity: 'low' | 'medium' | 'high' | 'extreme';
  systems: SystemNode[];
  // Wave 1 — Researcher
  techStack: TechItem[];
  researchInsights: string;
  // Wave 2 — Architect
  architecture: string;
  dataFlow: string;
  integrationPoints: string[];
  scalingStrategy: string;
  // Wave 2 — CodeGen
  codeFiles: CodeFile[];
  setupInstructions: string;
  // Wave 2 — Workflow
  phases: WorkflowPhase[];
  criticalPath: string[];
  estimatedTimeline: string;
  // Wave 3 — Deploy
  deploymentConfigs: DeploymentConfig[];
  cloudRecommendation: string;
  // Wave 3 — Docs
  readme: string;
  apiDocs: string;
  // Wave 3 — Validator
  confidenceScore: number;
  risks: Risk[];
  optimizations: string[];
  nextStep: string;
  // Meta
  providers: Record<string, boolean>;
  durationMs: number;
  agentTrace: AgentTrace[];
}

// ── Prompts ────────────────────────────────────────────────────────────────────

const PLANNER_SYSTEM = `You are an elite systems decomposition engine. Given any idea — software, hardware, AI, robotics, aerospace, biotech, SaaS, IoT, industrial — break it into its core subsystems.

Respond with ONLY valid JSON:
{
  "concept": "2-3 sentences: what is being built, why it matters, what problem it solves",
  "complexity": "low|medium|high|extreme",
  "systems": [
    {
      "id": "unique_snake_case_id",
      "name": "System Name",
      "type": "service|database|queue|api|frontend|ai|hardware|cloud|firmware|physical",
      "description": "what this subsystem does",
      "layer": "frontend|backend|infrastructure|ai|hardware|firmware|physical|data",
      "connections": ["other_system_id"]
    }
  ]
}

Rules: minimum 5 systems, maximum 12. Make connections accurate. Cover all layers that apply.`;

const RESEARCHER_SYSTEM = `You are a principal technology researcher. Given an engineering concept, identify the optimal technology stack.

Respond with ONLY valid JSON:
{
  "techStack": [
    {
      "category": "e.g. Framework, Database, AI Model, Hardware Platform, Cloud Provider",
      "name": "Technology Name",
      "version": "latest stable version if applicable",
      "reason": "specific reason this is optimal for this project",
      "alternatives": ["alt1", "alt2"]
    }
  ],
  "researchInsights": "2-3 paragraph technical research summary covering ecosystem maturity, known gotchas, and why this stack beats alternatives"
}

Rules: minimum 8 tech items covering all layers. Be specific — real versions, real tradeoffs.`;

const ARCHITECT_SYSTEM = `You are a principal software architect with 20 years experience across distributed systems, AI platforms, embedded systems, and cloud infrastructure.

Given an engineering concept with its systems and tech stack, produce the full architecture.

Respond with ONLY valid JSON:
{
  "architecture": "4-6 paragraph detailed architecture narrative. Cover: data flows, service communication patterns, state management, security boundaries, failure modes",
  "dataFlow": "2-3 paragraph description of how data moves through the system end-to-end",
  "integrationPoints": ["list of external APIs, services, hardware interfaces, or protocols this system integrates with"],
  "scalingStrategy": "2 paragraph explanation of horizontal/vertical scaling approach, bottlenecks to watch, and optimization trajectory"
}`;

const CODEGEN_SYSTEM = `You are a principal engineer. Generate production-quality code scaffolds for the described system.

Respond with ONLY valid JSON:
{
  "codeFiles": [
    {
      "path": "full/path/from/project/root/filename.ext",
      "language": "python|typescript|rust|go|cpp|java|yaml|dockerfile|bash|solidity",
      "purpose": "one sentence explaining this file",
      "code": "complete runnable code with inline comments. Minimum 40 lines. Use real libraries, real patterns, real algorithms."
    }
  ],
  "setupInstructions": "complete setup guide: environment setup, dependency installation, configuration, first run command, testing approach"
}

Rules: 4-6 files minimum. Use real imports. Cover the most critical parts of the system. No placeholder code.`;

const WORKFLOW_SYSTEM = `You are a technical program manager and execution strategist. Given a system architecture, design the complete execution workflow.

Respond with ONLY valid JSON:
{
  "phases": [
    {
      "phase": 1,
      "title": "Phase title",
      "duration": "e.g. 2-3 weeks",
      "tasks": ["specific task 1", "specific task 2"],
      "dependencies": ["titles of phases this depends on"],
      "milestone": "what is deliverable at end of this phase",
      "agents": ["which type of engineer/agent executes this"]
    }
  ],
  "criticalPath": ["ordered list of the most critical tasks that block everything else"],
  "estimatedTimeline": "total realistic timeline with explanation"
}

Rules: 5-7 phases minimum. Tasks must be specific and actionable. Dependencies must be accurate.`;

const DEPLOY_SYSTEM = `You are a DevOps architect and cloud infrastructure engineer. Generate complete deployment configurations.

Respond with ONLY valid JSON:
{
  "deploymentConfigs": [
    {
      "target": "docker|kubernetes|aws|gcp|azure|vercel|railway|terraform|github-actions",
      "filename": "exact filename e.g. Dockerfile or .github/workflows/deploy.yml",
      "content": "complete file content, production-ready",
      "description": "what this config does"
    }
  ],
  "cloudRecommendation": "2 paragraphs: recommended cloud provider(s), services to use, estimated monthly cost range, and why this architecture fits"
}

Rules: minimum 3 deployment configs. Include at minimum: Dockerfile, CI/CD pipeline, and one cloud-specific config.`;

const DOCS_SYSTEM = `You are a senior technical writer and API documentation engineer. Generate complete documentation for the system.

Respond with ONLY valid JSON:
{
  "readme": "complete README.md content in markdown. Include: project description, architecture overview, prerequisites, installation, usage, API reference summary, contributing, license",
  "apiDocs": "complete API/interface documentation. Cover: all endpoints or interfaces, request/response schemas, authentication, error codes, example calls"
}`;

const VALIDATOR_SYSTEM = `You are a chief architect and technical risk officer. Review the complete engineering plan and validate it.

Respond with ONLY valid JSON:
{
  "confidenceScore": 85,
  "risks": [
    {
      "area": "e.g. Scalability, Security, Hardware, AI Reliability",
      "risk": "specific risk description",
      "severity": "low|medium|high|critical",
      "mitigation": "specific mitigation strategy"
    }
  ],
  "optimizations": ["specific optimization opportunities not yet covered"],
  "nextStep": "the single most important concrete action to take right now to start building this"
}

Rules: minimum 4 risks. Be honest — flag real problems. confidenceScore 0-100. optimizations should be actionable.`;

// ── Safe JSON parser ───────────────────────────────────────────────────────────

function safeParse<T>(raw: string, fallback: T): T {
  try {
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
    return JSON.parse(cleaned) as T;
  } catch {
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) {
      try { return JSON.parse(match[0]) as T; } catch { /* fall through */ }
    }
    return fallback;
  }
}

// ── Handler ────────────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  const startMs = Date.now();

  const body = (await req.json()) as { idea: string; domain?: string };
  const { idea, domain = 'software' } = body;

  if (!idea?.trim()) {
    return NextResponse.json({ error: 'idea is required' }, { status: 400 });
  }

  const userMsg = `Domain: ${domain}\n\nIdea:\n${idea.trim()}`;
  const agentTrace: AgentTrace[] = [];

  function claude(system: string, user: string, temp = 0.4) {
    return chatWithClaude(
      [{ role: 'system', content: system }, { role: 'user', content: user }],
      { responseJsonObject: true, temperature: temp },
    ).then((r) => r.message.content);
  }

  function gpt(system: string, user: string, temp = 0.35) {
    return chatWithOpenAI(
      [{ role: 'system', content: system }, { role: 'user', content: user }],
      'gpt-4o',
      { responseJsonObject: true, temperature: temp },
    ).then((r) => r.message.content);
  }

  async function timed<T>(
    agentName: string,
    model: string,
    fn: () => Promise<T>,
  ): Promise<{ ok: boolean; value: T | null }> {
    const t = Date.now();
    try {
      const value = await fn();
      agentTrace.push({ agent: agentName, model, durationMs: Date.now() - t, ok: true });
      return { ok: true, value };
    } catch {
      agentTrace.push({ agent: agentName, model, durationMs: Date.now() - t, ok: false });
      return { ok: false, value: null };
    }
  }

  // ── Wave 1: Planner + Researcher (parallel) ──────────────────────────────────
  const [plannerResult, researcherResult] = await Promise.all([
    timed('Planner', 'claude', () => claude(PLANNER_SYSTEM, userMsg)),
    timed('Researcher', 'gpt-4o', () => gpt(RESEARCHER_SYSTEM, userMsg)),
  ]);

  type PlannerOut = Pick<OrchestrationResult, 'concept' | 'complexity' | 'systems'>;
  type ResearcherOut = Pick<OrchestrationResult, 'techStack' | 'researchInsights'>;

  const planner = safeParse<Partial<PlannerOut>>(plannerResult.value ?? '', {});
  const researcher = safeParse<Partial<ResearcherOut>>(researcherResult.value ?? '', {});

  // Build enriched context for Wave 2
  const wave2Ctx = `${userMsg}

--- PLANNER OUTPUT ---
Concept: ${planner.concept ?? ''}
Systems: ${JSON.stringify(planner.systems ?? [], null, 2)}

--- RESEARCHER OUTPUT ---
Tech Stack: ${JSON.stringify(researcher.techStack ?? [], null, 2)}
Research Insights: ${researcher.researchInsights ?? ''}`;

  // ── Wave 2: Architect + CodeGen + Workflow (parallel) ────────────────────────
  const [architectResult, codegenResult, workflowResult] = await Promise.all([
    timed('Architect', 'claude', () => claude(ARCHITECT_SYSTEM, wave2Ctx)),
    timed('CodeGen', 'gpt-4o', () => gpt(CODEGEN_SYSTEM, wave2Ctx, 0.3)),
    timed('Workflow', 'claude', () => claude(WORKFLOW_SYSTEM, wave2Ctx)),
  ]);

  type ArchitectOut = Pick<OrchestrationResult, 'architecture' | 'dataFlow' | 'integrationPoints' | 'scalingStrategy'>;
  type CodeGenOut = Pick<OrchestrationResult, 'codeFiles' | 'setupInstructions'>;
  type WorkflowOut = Pick<OrchestrationResult, 'phases' | 'criticalPath' | 'estimatedTimeline'>;

  const architect = safeParse<Partial<ArchitectOut>>(architectResult.value ?? '', {});
  const codegen = safeParse<Partial<CodeGenOut>>(codegenResult.value ?? '', {});
  const workflow = safeParse<Partial<WorkflowOut>>(workflowResult.value ?? '', {});

  // Build enriched context for Wave 3
  const wave3Ctx = `${wave2Ctx}

--- ARCHITECT OUTPUT ---
${architect.architecture ?? ''}

--- WORKFLOW OUTPUT ---
Phases: ${JSON.stringify(workflow.phases ?? [], null, 2)}
Timeline: ${workflow.estimatedTimeline ?? ''}`;

  // ── Wave 3: Deploy + Docs + Validator (parallel) ─────────────────────────────
  const [deployResult, docsResult, validatorResult] = await Promise.all([
    timed('Deploy', 'gpt-4o', () => gpt(DEPLOY_SYSTEM, wave3Ctx, 0.3)),
    timed('Docs', 'claude', () => claude(DOCS_SYSTEM, wave3Ctx, 0.4)),
    timed('Validator', 'claude', () => claude(VALIDATOR_SYSTEM, wave3Ctx, 0.3)),
  ]);

  type DeployOut = Pick<OrchestrationResult, 'deploymentConfigs' | 'cloudRecommendation'>;
  type DocsOut = Pick<OrchestrationResult, 'readme' | 'apiDocs'>;
  type ValidatorOut = Pick<OrchestrationResult, 'confidenceScore' | 'risks' | 'optimizations' | 'nextStep'>;

  const deploy = safeParse<Partial<DeployOut>>(deployResult.value ?? '', {});
  const docs = safeParse<Partial<DocsOut>>(docsResult.value ?? '', {});
  const validator = safeParse<Partial<ValidatorOut>>(validatorResult.value ?? '', {});

  // ── Merge ─────────────────────────────────────────────────────────────────────
  const result: OrchestrationResult = {
    concept:            planner.concept           ?? 'Analysis complete.',
    complexity:         planner.complexity        ?? 'medium',
    systems:            planner.systems           ?? [],
    techStack:          researcher.techStack      ?? [],
    researchInsights:   researcher.researchInsights ?? '',
    architecture:       architect.architecture    ?? '',
    dataFlow:           architect.dataFlow        ?? '',
    integrationPoints:  architect.integrationPoints ?? [],
    scalingStrategy:    architect.scalingStrategy ?? '',
    codeFiles:          codegen.codeFiles         ?? [],
    setupInstructions:  codegen.setupInstructions ?? '',
    phases:             workflow.phases           ?? [],
    criticalPath:       workflow.criticalPath     ?? [],
    estimatedTimeline:  workflow.estimatedTimeline ?? '',
    deploymentConfigs:  deploy.deploymentConfigs  ?? [],
    cloudRecommendation: deploy.cloudRecommendation ?? '',
    readme:             docs.readme               ?? '',
    apiDocs:            docs.apiDocs              ?? '',
    confidenceScore:    validator.confidenceScore ?? 0,
    risks:              validator.risks           ?? [],
    optimizations:      validator.optimizations   ?? [],
    nextStep:           validator.nextStep        ?? '',
    providers: {
      planner:    plannerResult.ok,
      researcher: researcherResult.ok,
      architect:  architectResult.ok,
      codegen:    codegenResult.ok,
      workflow:   workflowResult.ok,
      deploy:     deployResult.ok,
      docs:       docsResult.ok,
      validator:  validatorResult.ok,
    },
    durationMs: Date.now() - startMs,
    agentTrace,
  };

  return NextResponse.json(result);
}
