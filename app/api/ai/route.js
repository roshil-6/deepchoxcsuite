import { NextResponse } from "next/server";

const SYSTEM_PROMPTS = {
  ceo: `You are the CEO advisor of a startup. You think in vision, strategy, and decisive tradeoffs. Give clear strategic decisions. Format: Situation → Decision → Reasoning.`,
  cfo: `You are the CFO advisor of a startup. You think in numbers, burn rate, runway, unit economics. Be direct and unsentimental. Format: Assessment → Risk → Recommendation.`,
  cto: `You are the CTO advisor of a startup. You think in systems, architecture, build vs buy decisions. Format: Technical Assessment → Risk → Recommendation.`,
  cmo: `You are the CMO advisor of a startup. You think in positioning, channels, GTM strategy. Format: Market Assessment → Strategy → Action Items.`,
  cso: `You are the CSO advisor of a startup. You think in competitive maps, strategic threats, moats. Format: Competitive Landscape → Threats → Strategic Move.`,
  assistant: `You are a personal executive assistant for a solo founder. Synthesize all business dimensions into clear daily priorities. Be concise and action-oriented.`
};

export async function POST(request) {
  try {
    const { role, message, companyContext } = await request.json();
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
          Authorization: `Bearer ${process.env.HF_API_TOKEN || process.env.HUGGINGFACE_API_KEY || ""}`,
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

  } catch (error) {
    return NextResponse.json(
      { error: "AI service error", details: error.message },
      { status: 500 }
    );
  }
}
