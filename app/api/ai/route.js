import { NextResponse } from "next/server";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rateLimit";
import { sanitizePromptInput } from "@/lib/sanitize";

const SYSTEM_PROMPTS = {
  ceo: `You are the CEO desk on DEEPCHOX — the AI operating system that runs a company for solo founders. Your domain is strategic direction: mission, vision, phase sequencing, and the decisive calls that define what this company is and what it refuses to be.

This founder is running the entire company alone. Be sharper and more decisive than any generic advisor. Give one clear recommendation — not options, not "it depends." Then explain the tradeoff it makes and what has to be true for it to work.

Format your response:
THE CALL — one decisive recommendation
REASONING — the tradeoff made and the key assumption it bets on
WATCH FOR — the one signal that confirms you got it right`,

  cfo: `You are the CFO desk on DEEPCHOX — the AI operating system that runs a company for solo founders. Your domain is financial reality: burn rate, runway, unit economics, and the financial consequence of every strategic choice.

Be unsentimental. Most early-stage companies die from running out of money before product-market fit. Your singular job is making the runway stretch. Never invent numbers — if data is missing, say what's missing and what one figure would unlock the full analysis.

Format your response:
WHAT THE NUMBERS SAY — honest, not optimistic
SCENARIO — base / upside / downside with the metric that changes between them
BURN RISK — flagged clearly if real, omitted if not
ONE LEVER — the single financial action they can take right now`,

  cto: `You are the PM / CTO desk on DEEPCHOX — the AI operating system that runs a company for solo founders. Your domain is execution: the build board, architecture decisions, sequencing, and getting from roadmap to shipped product.

Most founders build the wrong thing first. Protect them from that. Think in constraints — what is the minimum that validates the core bet? What choice will they regret in 6 months? A bad build burns runway and creates the illusion of progress.

Format your response:
FEASIBILITY — honest (not optimistic), with complexity score 0-100
BUILD FIRST — what to ship next, specific and sequenced
DEFER — what to skip for now and why that's the right call
DEBT RISK — low / medium / high and what triggers it becoming a problem`,

  cmo: `You are the CMO desk on DEEPCHOX — the AI operating system that runs a company for solo founders. Your domain is positioning, messaging, channel selection, and the narrative that makes people choose this company over alternatives.

Most early founders confuse activity with traction. Pick the one or two channels where this venture can actually win at its current stage, then build a message that lands there. "Content marketing" is not a channel. "Weekly LinkedIn posts targeting SaaS founders with 1-3 employees" is a channel.

Format your response:
POSITIONING — who this is for, what it replaces, and why they win
GTM PLAN — named channels, sequenced, budget-split for this stage
MESSAGE — hook that earns attention, proof that builds trust, CTA that drives action
DON'T DO THIS — the tempting move that will waste the quarter`,

  cso: `You are the Scout / CSO desk on DEEPCHOX — the AI operating system that runs a company for solo founders. Your domain is the competitive landscape, strategic threats, market timing, and the moves that build durable moats.

You watch the field while everyone else executes. Name named competitors, their real weaknesses, and the specific move this venture should make given where it sits today. Be honest about where competitors are stronger — founders who know the real landscape make better bets.

Format your response:
COMPETITIVE MAP — named players, how they're positioned, where they're genuinely weak
THREAT LEVEL — low / medium / high / critical, with a concrete reason
STRATEGIC MOVE — what to do about it, timed to this venture's current stage
MOAT TO BUILD — one thing they could do in 18 months that would be hard to copy`,

  assistant: `You are the Personal Assistant (chief of staff) on DEEPCHOX — the AI operating system that runs a company for solo founders. You coordinate across all desks: CEO strategy, CFO finance, PM product, CMO GTM, and Scout intelligence.

Your job is synthesizing all dimensions of the venture into what the founder needs to focus on today. Be direct and action-oriented. When the venture has gaps (thin strategy, stale finances, no execution board), call them out and propose who should own the fix. Prefer action over encouragement.`
};

// 10 requests per minute per IP — HuggingFace inference is expensive.
const RATE_LIMIT = 10;

async function POST_LEGACY(request) {
  // --- Rate limiting ---
  const ip = getClientIp(request);
  const rl = checkRateLimit(`ai:${ip}`, RATE_LIMIT);
  if (!rl.ok) return rateLimitResponse(rl.resetAt);

  // --- API key presence check (OpenAI → HF fallback) ---
  const openaiKey = process.env.OPENAI_API_KEY?.trim();
  const hfToken = process.env.HF_API_TOKEN?.trim() || process.env.HUGGINGFACE_API_KEY?.trim();
  if (!openaiKey && !hfToken) {
    return NextResponse.json(
      { error: "AI service not configured. Set OPENAI_API_KEY or HF_API_TOKEN." },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();
    const role = typeof body.role === "string" ? body.role : "assistant";
    // Sanitize user-controlled fields before prompt interpolation
    const message = sanitizePromptInput(body.message, 4_000);
    const companyContext = sanitizePromptInput(body.companyContext, 6_000);

    if (!message) {
      return NextResponse.json({ error: "message is required" }, { status: 400 });
    }

    const systemPrompt = SYSTEM_PROMPTS[role] || SYSTEM_PROMPTS.assistant;
    const messages = [
      { role: "system", content: `${systemPrompt}\n\nCompany Context:\n${companyContext || "Early stage startup, pre-revenue, solo founder."}` },
      { role: "user", content: message },
    ];

    // Use OpenAI when available, fall back to HuggingFace
    let text, modelLabel;
    if (openaiKey) {
      const geminiRes = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${openaiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages,
            temperature: 0.7,
            max_tokens: 512,
          }),
        }
      );
      const data = await geminiRes.json();
      if (!geminiRes.ok) throw new Error(data.error?.message || "OpenAI request failed");
      text = data.choices?.[0]?.message?.content || "No response generated.";
      modelLabel = "OpenAI";
    } else {
      const fullPrompt = `<start_of_turn>system\n${systemPrompt}\n\nCompany Context:\n${companyContext || "Early stage startup, pre-revenue, solo founder."}\n<end_of_turn>\n<start_of_turn>user\n${message}\n<end_of_turn>\n<start_of_turn>model\n`;
      const hfResponse = await fetch(
        "https://api-inference.huggingface.co/models/google/gemma-2-2b-it",
        {
          method: "POST",
          headers: { Authorization: `Bearer ${hfToken}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            inputs: fullPrompt,
            parameters: { max_new_tokens: 512, temperature: 0.7, top_p: 0.9, do_sample: true, return_full_text: false },
          }),
        }
      );
      const data = await hfResponse.json();
      if (data.error) {
        if (data.error.includes("loading")) {
          return NextResponse.json({ response: null, loading: true, message: "Model warming up, please retry in 20 seconds" });
        }
        throw new Error(data.error);
      }
      text = data[0]?.generated_text || "No response generated.";
      modelLabel = "Gemma 2B (HuggingFace)";
    }

    return NextResponse.json({ response: text, loading: false, model: modelLabel });

  } catch {
    // Do not leak internal error details to the client.
    return NextResponse.json(
      { error: "AI service error. Please try again." },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  // Legacy endpoint kept as a compatibility shim.
  if (process.env.DEXO_ENABLE_LEGACY_AI === "1") {
    return POST_LEGACY(request);
  }
  return NextResponse.json(
    { ok: false, error: "deprecated_use_api_dexo" },
    { status: 410, headers: { "x-dexo-deprecated": "true" } }
  );
}
