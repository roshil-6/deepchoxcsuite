import { NextResponse } from "next/server";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rateLimit";
import { sanitizePromptInput } from "@/lib/sanitize";

const SYNC_PROMPTS = {
  ceo: (ctx) => `You are the CEO desk on DEEPCHOX — the AI C-suite for solo founders. Read this venture snapshot and give a decisive strategic brief.

Venture context:
${ctx}

Your brief must cover:
1. THE BIGGEST PRIORITY THIS WEEK — one specific thing, not a category
2. THE DECISION WAITING — what strategic call is the founder avoiding that needs to be made now
3. ONE THING TO STOP — something they're doing that is wasting time or capital at this stage
4. THE 90-DAY BET — the single move that will matter most in the next quarter

Be specific to this venture. Generic advice wastes the founder's time.`,

  cfo: (ctx) => `You are the CFO desk on DEEPCHOX — the AI C-suite for solo founders. Read this venture snapshot and give an honest financial brief.

Venture context:
${ctx}

Your brief must cover:
1. FINANCIAL REALITY — what the burn and runway actually look like (flag if data is missing)
2. TOP FINANCIAL RISK — the specific number or assumption that could sink this if wrong
3. BURN RATE ADVICE — is spend calibrated to stage? What should change and why?
4. ONE REVENUE LEVER — the most realistic near-term path to a dollar of revenue at this stage

Never invent numbers. If financial data is absent, name exactly what's needed and why it matters.`,

  cto: (ctx) => `You are the PM / CTO desk on DEEPCHOX — the AI C-suite for solo founders. Read this venture snapshot and give a sharp product and execution brief.

Venture context:
${ctx}

Your brief must cover:
1. BIGGEST TECHNICAL RISK — the assumption or architecture choice most likely to become a problem
2. WHAT TO BUILD NEXT — the specific next thing on the execution board, in priority order
3. BUILD VS BUY — if there's a dependency or tool decision pending, give the call with reasoning
4. COMPLEXITY REALITY CHECK — is the scope right for the team size (solo founder)? What should be cut?

Be honest. Optimistic technical assessments cost founders months they don't have.`,

  cmo: (ctx) => `You are the CMO desk on DEEPCHOX — the AI C-suite for solo founders. Read this venture snapshot and give a focused GTM and positioning brief.

Venture context:
${ctx}

Your brief must cover:
1. POSITIONING GAP — how this venture is currently positioned vs how it should be positioned to win
2. THE RIGHT CHANNEL — not channels in general — the ONE channel most likely to generate first traction at this stage, named specifically
3. THE MESSAGE — the hook that earns attention from the target customer in that channel
4. WHAT NOT TO DO — the GTM mistake this venture is most at risk of making right now

Specificity is everything. "Content marketing" is not a channel answer.`,

  cso: (ctx) => `You are the Scout / CSO desk on DEEPCHOX — the AI C-suite for solo founders. Read this venture snapshot and give a competitive intelligence brief.

Venture context:
${ctx}

Your brief must cover:
1. TOP 3 COMPETITORS — named, with how they're positioned and their most exploitable weakness
2. OUR OPPORTUNITY — the specific gap in the market that this venture can occupy that they can't easily fill
3. THREAT LEVEL — low / medium / high / critical, with the specific reason
4. THE MOAT — the one capability or asset this venture could build in the next 12 months that would be hard to replicate

Be honest about where competitors are stronger. A founder who knows the real landscape makes better bets.`,
};

// 10 requests per minute per IP — HuggingFace inference is expensive.
const RATE_LIMIT = 10;

export async function POST(request) {
  // --- Rate limiting ---
  const ip = getClientIp(request);
  const rl = checkRateLimit(`sync:${ip}`, RATE_LIMIT);
  if (!rl.ok) return rateLimitResponse(rl.resetAt);

  // --- API key presence check (Gemini → HF fallback) ---
  const geminiKey = process.env.GEMINI_API_KEY?.trim();
  const hfToken = process.env.HF_API_TOKEN?.trim() || process.env.HUGGINGFACE_API_KEY?.trim();
  if (!geminiKey && !hfToken) {
    return NextResponse.json(
      { error: "AI service not configured. Set GEMINI_API_KEY or HF_API_TOKEN." },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();
    const role = typeof body.role === "string" ? body.role : "";
    const companyContext = sanitizePromptInput(body.companyContext, 6_000);

    if (!companyContext) {
      return NextResponse.json({ error: "companyContext is required" }, { status: 400 });
    }

    const promptText =
      SYNC_PROMPTS[role]?.(companyContext) ||
      `You are a startup advisor on DEEPCHOX. Analyze this venture and give key insights across strategy, finance, product, GTM, and market intelligence:\n\n${companyContext}`;

    let text, modelLabel;

    if (geminiKey) {
      const res = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
        {
          method: "POST",
          headers: { Authorization: `Bearer ${geminiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: process.env.GEMINI_MODEL?.trim() || "gemini-2.0-flash",
            messages: [{ role: "user", content: promptText }],
            temperature: 0.6,
            max_tokens: 800,
          }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "Gemini request failed");
      text = data.choices?.[0]?.message?.content || "Analysis unavailable.";
      modelLabel = "Gemini";
    } else {
      const fullPrompt = `<start_of_turn>user\n${promptText}\n<end_of_turn>\n<start_of_turn>model\n`;
      const hfResponse = await fetch(
        "https://api-inference.huggingface.co/models/google/gemma-2-2b-it",
        {
          method: "POST",
          headers: { Authorization: `Bearer ${hfToken}`, "Content-Type": "application/json" },
          body: JSON.stringify({ inputs: fullPrompt, parameters: { max_new_tokens: 600, temperature: 0.6, return_full_text: false } }),
        }
      );
      const data = await hfResponse.json();
      if (data.error?.includes("loading")) return NextResponse.json({ loading: true });
      text = data[0]?.generated_text || "Analysis unavailable.";
      modelLabel = "Gemma 2B (HuggingFace)";
    }

    return NextResponse.json({ result: text, loading: false, model: modelLabel });

  } catch {
    // Do not leak internal error details to the client.
    return NextResponse.json(
      { error: "AI service error. Please try again." },
      { status: 500 }
    );
  }
}
