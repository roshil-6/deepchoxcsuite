import { NextResponse } from "next/server";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rateLimit";
import { sanitizePromptInput } from "@/lib/sanitize";

const SYNC_PROMPTS = {
  cso: (ctx) => `You are a Chief Strategy Officer. Analyze competitive landscape for: ${ctx}. Give: 1) Top 3 competitors 2) Their weaknesses 3) Our opportunity.`,
  cfo: (ctx) => `You are a CFO. Analyze financial priorities for: ${ctx}. Give: 1) Key financial risks 2) Burn rate advice 3) Revenue opportunities.`,
  cto: (ctx) => `You are a CTO. Analyze technical priorities for: ${ctx}. Give: 1) Technical risks 2) Stack advice 3) Build vs buy decisions.`,
  cmo: (ctx) => `You are a CMO. Analyze market positioning for: ${ctx}. Give: 1) Positioning gaps 2) Best channels 3) Messaging recommendations.`,
  ceo: (ctx) => `You are a CEO advisor. Strategic overview for: ${ctx}. Give: 1) Biggest priority this week 2) Key decision needed 3) One thing to stop doing.`,
};

// 10 requests per minute per IP — HuggingFace inference is expensive.
const RATE_LIMIT = 10;

export async function POST(request) {
  // --- Rate limiting ---
  const ip = getClientIp(request);
  const rl = checkRateLimit(`sync:${ip}`, RATE_LIMIT);
  if (!rl.ok) return rateLimitResponse(rl.resetAt);

  // --- API key presence check (fail fast — never fall back to empty string) ---
  const hfToken = process.env.HF_API_TOKEN?.trim() || process.env.HUGGINGFACE_API_KEY?.trim();
  if (!hfToken) {
    return NextResponse.json(
      { error: "AI service not configured. HF_API_TOKEN is missing." },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();
    const role = typeof body.role === "string" ? body.role : "";
    // Sanitize user-controlled field before prompt interpolation
    const companyContext = sanitizePromptInput(body.companyContext, 6_000);

    if (!companyContext) {
      return NextResponse.json({ error: "companyContext is required" }, { status: 400 });
    }

    const promptText =
      SYNC_PROMPTS[role]?.(companyContext) ||
      `Analyze this startup and give key insights: ${companyContext}`;

    const fullPrompt = `<start_of_turn>user
${promptText}
<end_of_turn>
<start_of_turn>model
`;

    const hfResponse = await fetch(
      "https://api-inference.huggingface.co/models/google/gemma-2-2b-it",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${hfToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          inputs: fullPrompt,
          parameters: {
            max_new_tokens: 600,
            temperature: 0.6,
            return_full_text: false,
          },
        }),
      }
    );

    const data = await hfResponse.json();

    if (data.error?.includes("loading")) {
      return NextResponse.json({ loading: true });
    }

    const text = data[0]?.generated_text || "Analysis unavailable.";
    return NextResponse.json({
      result: text,
      loading: false,
      model: "Gemma 2B (HuggingFace)"
    });

  } catch {
    // Do not leak internal error details to the client.
    return NextResponse.json(
      { error: "AI service error. Please try again." },
      { status: 500 }
    );
  }
}
