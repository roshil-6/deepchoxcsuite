import { NextResponse } from 'next/server';
import { chatWithGroq, chatWithOllama, simulationResponse } from '@/lib/ai/chatProviders';

type Body = {
  messages: { role: string; content: string }[];
  model?: string;
};

export async function POST(req: Request) {
  try {
    const { messages, model } = (await req.json()) as Body;
    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'messages required' }, { status: 400 });
    }

    // 1) Groq (production on Render) when GROQ_API_KEY is set
    if (process.env.GROQ_API_KEY?.trim()) {
      try {
        const out = await chatWithGroq(messages, model);
        return NextResponse.json(out);
      } catch (e) {
        console.error('Groq error:', e);
        const msg = e instanceof Error ? e.message : 'Groq error';
        // 200 so existing clients (they only read body.message) still show the error in-thread
        return NextResponse.json({
          model: 'groq-error',
          created_at: new Date().toISOString(),
          message: {
            role: 'assistant',
            content: `Could not complete the request via Groq: ${msg}. Verify GROQ_API_KEY and GROQ_MODEL on the server.`,
          },
          done: true,
        });
      }
    }

    // 2) Local / remote Ollama
    try {
      const out = await chatWithOllama(messages, model);
      return NextResponse.json(out);
    } catch (fetchError) {
      console.warn('Ollama unavailable, using simulation.', fetchError);
    }

    // 3) Demo fallback
    const out = simulationResponse(messages, model);
    return NextResponse.json(out);
  } catch (error) {
    console.error('API Route Critical Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
