/**
 * /api/invention  —  AI Execution & Engineering Intelligence
 *
 * Dual-agent pipeline:
 *   Claude   → strategic intelligence: concept analysis, system architecture,
 *               execution roadmap, risk assessment
 *   GPT-4o   → technical execution: code scaffolding, tech stack, API design,
 *               deployment configuration
 *
 * Both run in TRUE PARALLEL — combined result shipped as one JSON payload.
 */

import { NextResponse } from 'next/server';
import { chatWithClaude, chatWithOpenAI } from '@/lib/ai/chatProviders';

export const maxDuration = 90;

// ── Output types ──────────────────────────────────────────────────────────────

export interface InventionSystem {
  name: string;
  purpose: string;
  complexity: 'low' | 'medium' | 'high' | 'extreme';
  layer: 'hardware' | 'firmware' | 'software' | 'cloud' | 'ai' | 'physical' | 'interface';
}

export interface InventionTechItem {
  category: string;
  name: string;
  reason: string;
}

export interface InventionPhase {
  phase: number;
  title: string;
  duration: string;
  tasks: string[];
  milestone: string;
}

export interface InventionRisk {
  area: string;
  risk: string;
  mitigation: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface InventionCodeFile {
  filename: string;
  language: string;
  purpose: string;
  code: string;
}

export interface InventionResult {
  /** One-paragraph strategic concept analysis */
  concept: string;
  /** Core subsystems identified */
  systems: InventionSystem[];
  /** Architecture narrative */
  architecture: string;
  /** Technology stack recommendations */
  techStack: InventionTechItem[];
  /** Phased implementation roadmap */
  roadmap: InventionPhase[];
  /** Risk register */
  risks: InventionRisk[];
  /** First concrete action to take */
  nextStep: string;
  /** GPT-generated code scaffolds */
  codeFiles: InventionCodeFile[];
  /** Setup / dependency instructions */
  setupInstructions: string;
  /** Which providers actually responded */
  providers: { claude: boolean; gpt: boolean };
  /** Processing time ms */
  durationMs: number;
}

// ── Prompts ────────────────────────────────────────────────────────────────────

const CLAUDE_SYSTEM = `You are an elite multidisciplinary engineering intelligence system. When given an idea or invention concept, you perform deep systems thinking and return a complete engineering execution map.

You think like a combined: aerospace engineer, software architect, systems integrator, product strategist, CTO, and principal engineer.

ALWAYS respond with valid JSON matching this exact schema:
{
  "concept": "string — 2-3 sentence strategic analysis of what is being built and why it matters",
  "systems": [
    { "name": "string", "purpose": "string", "complexity": "low|medium|high|extreme", "layer": "hardware|firmware|software|cloud|ai|physical|interface" }
  ],
  "architecture": "string — detailed architecture narrative, 3-5 paragraphs covering data flow, integration points, scaling considerations",
  "techStack": [
    { "category": "string", "name": "string", "reason": "string" }
  ],
  "roadmap": [
    { "phase": 1, "title": "string", "duration": "string", "tasks": ["string"], "milestone": "string" }
  ],
  "risks": [
    { "area": "string", "risk": "string", "mitigation": "string", "severity": "low|medium|high|critical" }
  ],
  "nextStep": "string — the single most important first action to take"
}

Be specific. Use real technology names. Think in systems. Cover hardware, firmware, software, cloud, AI, and physical layers as applicable. Minimum 4 systems, 5 tech stack items, 4 roadmap phases, 3 risks.`;

const GPT_SYSTEM = `You are a principal software engineer and technical architect specializing in code generation and technical implementation planning.

Given an engineering concept, generate production-quality code scaffolds and technical setup instructions.

ALWAYS respond with valid JSON matching this exact schema:
{
  "codeFiles": [
    {
      "filename": "string — full path like src/core/flight_controller.py",
      "language": "string — python|typescript|rust|c++|go|java|yaml|dockerfile|bash",
      "purpose": "string — one sentence explaining this file",
      "code": "string — complete, runnable code with comments. Minimum 30 lines. Use real algorithms and patterns."
    }
  ],
  "setupInstructions": "string — complete setup guide: dependencies, environment, first run command, testing"
}

Generate 3-5 meaningful code files. Use real libraries, real patterns, real algorithms. The code must be production-relevant, not toy examples.`;

// ── Helpers ────────────────────────────────────────────────────────────────────

function safeParseJson<T>(raw: string, fallback: T): T {
  try {
    // Strip markdown code fences if present
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
    return JSON.parse(cleaned) as T;
  } catch {
    // Try to extract JSON from within the response
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
  const { idea, domain = 'general' } = body;

  if (!idea?.trim()) {
    return NextResponse.json({ error: 'idea is required' }, { status: 400 });
  }

  const userMessage = `Domain: ${domain}\n\nIdea / Concept:\n${idea.trim()}`;

  // ── Run Claude + GPT in true parallel ────────────────────────────────────────
  const [claudeRaw, gptRaw] = await Promise.allSettled([
    chatWithClaude(
      [
        { role: 'system', content: CLAUDE_SYSTEM },
        { role: 'user', content: userMessage },
      ],
      { responseJsonObject: true, temperature: 0.5 },
    ).then((r) => r.message.content),

    chatWithOpenAI(
      [
        { role: 'system', content: GPT_SYSTEM },
        { role: 'user', content: userMessage },
      ],
      'gpt-4o',
      { responseJsonObject: true, temperature: 0.4 },
    ).then((r) => r.message.content),
  ]);

  const claudeText = claudeRaw.status === 'fulfilled' ? claudeRaw.value : '';
  const gptText    = gptRaw.status    === 'fulfilled' ? gptRaw.value    : '';

  // ── Parse outputs ─────────────────────────────────────────────────────────────
  type ClaudeOut = Omit<InventionResult, 'codeFiles' | 'setupInstructions' | 'providers' | 'durationMs'>;
  type GptOut    = Pick<InventionResult, 'codeFiles' | 'setupInstructions'>;

  const claudeOut = safeParseJson<Partial<ClaudeOut>>(claudeText, {});
  const gptOut    = safeParseJson<Partial<GptOut>>(gptText, {});

  const result: InventionResult = {
    concept:            claudeOut.concept       ?? 'Analysis in progress…',
    systems:            claudeOut.systems       ?? [],
    architecture:       claudeOut.architecture  ?? '',
    techStack:          claudeOut.techStack      ?? [],
    roadmap:            claudeOut.roadmap        ?? [],
    risks:              claudeOut.risks          ?? [],
    nextStep:           claudeOut.nextStep       ?? '',
    codeFiles:          gptOut.codeFiles         ?? [],
    setupInstructions:  gptOut.setupInstructions ?? '',
    providers: {
      claude: claudeRaw.status === 'fulfilled',
      gpt:    gptRaw.status    === 'fulfilled',
    },
    durationMs: Date.now() - startMs,
  };

  return NextResponse.json(result);
}
