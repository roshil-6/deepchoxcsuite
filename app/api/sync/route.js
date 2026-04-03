import { NextResponse } from "next/server";

const SYNC_PROMPTS = {
  cso: (ctx) => `You are a Chief Strategy Officer. Analyze competitive landscape for: ${ctx}. Give: 1) Top 3 competitors 2) Their weaknesses 3) Our opportunity.`,
  cfo: (ctx) => `You are a CFO. Analyze financial priorities for: ${ctx}. Give: 1) Key financial risks 2) Burn rate advice 3) Revenue opportunities.`,
  cto: (ctx) => `You are a CTO. Analyze technical priorities for: ${ctx}. Give: 1) Technical risks 2) Stack advice 3) Build vs buy decisions.`,
  cmo: (ctx) => `You are a CMO. Analyze market positioning for: ${ctx}. Give: 1) Positioning gaps 2) Best channels 3) Messaging recommendations.`,
  ceo: (ctx) => `You are a CEO advisor. Strategic overview for: ${ctx}. Give: 1) Biggest priority this week 2) Key decision needed 3) One thing to stop doing.`,
};

export async function POST(request) {
  try {
    const { role, companyContext } = await request.json();

    const promptText = SYNC_PROMPTS[role]?.(companyContext) ||
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
          Authorization: `Bearer ${process.env.HF_API_TOKEN}`,
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

  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
