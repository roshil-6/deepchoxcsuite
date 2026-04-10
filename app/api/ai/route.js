import { NextResponse } from "next/server";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rateLimit";
import { sanitizePromptInput } from "@/lib/sanitize";

const SYSTEM_PROMPTS = {
  ceo: `You are the CEO advisor of a startup. You think in vision, strategy, and decisive tradeoffs. Give clear strategic decisions. Format: Situation → Decision → Reasoning.`,
  cfo: `You are the CFO advisor of a startup. You think in numbers, burn rate, runway, unit economics. Be direct and unsentimental. Format: Assessment → Risk → Recommendation.`,
  cto: `You are the CTO advisor of a startup. You think in systems, architecture, build vs buy decisions. Format: Technical Assessment → Risk → Recommendation.`,
  cmo: `You are the CMO advisor of a startup. You think in positioning, channels, GTM strategy. Format: Market Assessment → Strategy → Action Items.`,
  cso: `You are the CSO advisor of a startup. You think in competitive maps, strategic threats, moats. Format: Competitive Landscape → Threats → Strategic Move.`,
  assistant: `You are a personal executive assistant for a solo founder. Synthesize all business dimensions into clear daily priorities. Be concise and action-oriented.`
};

// 10 requests per minute per IP — HuggingFace inference is expensive.
const RATE_LIMIT = 10;

export async function POST(request) {
  // --- Rate limiting ---
  const ip = getClientIp(request);
  const rl = checkRateLimit(`ai:${ip}`, RATE_LIMIT);
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
    const role = typeof body.role === "string" ? body.role : "assistant";
    // Sanitize user-controlled fields before prompt interpolation
    const message = sanitizePromptInput(body.message, 4_000);
    const companyContext = sanitizePromptInput(body.companyContext, 6_000);

    if (!message) {
      return NextResponse.json({ error: "message is required" }, { status: 400 });
    }

    const systemPrompt = SYSTEM_PROMPTS[role] || SYSTEM_PROMPTS.assistant;

    const fullPrompt = `<start_of_turn>system
${systemPrompt}

Company Context:
${companyContext || "Early stage startup, pre-revenue, solo founder."}
<end_of_turn>
<start_of_turn>user
${message}
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
            max_new_tokens: 512,
            temperature: 0.7,
            top_p: 0.9,
            do_sample: true,
            return_full_text: false,
          },
        }),
      }
    );

    const data = await hfResponse.json();

    if (data.error) {
      if (data.error.includes("loading")) {
        return NextResponse.json({
          response: null,
          loading: true,
          message: "Model warming up, please retry in 20 seconds"
        });
      }
      throw new Error(data.error);
    }

    const text = data[0]?.generated_text || "No response generated.";
    return NextResponse.json({
      response: text,
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
