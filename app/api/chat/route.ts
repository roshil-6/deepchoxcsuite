import { NextResponse } from 'next/server';
import { chatWithGroq, chatWithOllama, simulationResponse } from '@/lib/ai/chatProviders';

type Body = {
  messages: { role: string; content: string }[];
  model?: string;
};

function deskChatForceOllama(): boolean {
  const v = process.env.DESK_CHAT_FORCE_OLLAMA?.trim().toLowerCase();
  return v === '1' || v === 'true' || v === 'yes';
}

export async function POST(req: Request) {
  try {
    const { messages, model } = (await req.json()) as Body;
    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'messages required' }, { status: 400 });
    }

    const groqKey = process.env.GROQ_API_KEY?.trim();

    // Optional: use local Ollama for desk chat even when Groq is configured (real Gemma/Mistral tags, etc.)
    if (deskChatForceOllama()) {
      try {
        const out = await chatWithOllama(messages, model);
        return NextResponse.json({
          ...out,
          model: out.model ? `Ollama · ${out.model}` : 'Ollama',
        });
      } catch (fetchError) {
        console.warn('DESK_CHAT_FORCE_OLLAMA: Ollama unavailable, falling back to Groq or simulation.', fetchError);
      }
    }

    // 1) Groq when GROQ_API_KEY is set (production on Render)
    if (groqKey) {
      try {
        const out = await chatWithGroq(messages, model);
        return NextResponse.json({
          ...out,
          model: `Groq · ${out.model}`,
        });
      } catch (e) {
        console.error('Groq error:', e);
        const msg = e instanceof Error ? e.message : 'Groq error';
        // 200 so existing clients (they only read body.message) still show the error in-thread
        return NextResponse.json({
          created_at: new Date().toISOString(),
          message: {
            role: 'assistant',
            content: `Could not complete the request via Groq: ${msg}. Check that GROQ_MODEL is a current model (see https://console.groq.com/docs/deprecations). Desk picker choices are not overridden by GROQ_MODEL — remove a deprecated global GROQ_MODEL from the server if you set one.`,
          },
          done: true,
        });
      }
    }

    // 2) Local / remote Ollama
    try {
      const out = await chatWithOllama(messages, model);
      return NextResponse.json({
        ...out,
        model: out.model ? `Ollama · ${out.model}` : 'Ollama',
      });
    } catch (fetchError) {
      console.warn('Ollama unavailable, using simulation.', fetchError);
    }

    // 3) Demo fallback
    const out = simulationResponse(messages, model);
    return NextResponse.json({ ...out, model: 'Simulation' });
  } catch (error) {
    console.error('API Route Critical Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
