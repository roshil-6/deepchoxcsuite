import { NextResponse } from 'next/server';
import { chatWithGemini, chatWithGroq, chatWithHuggingFace, chatWithOllama, simulationResponse } from '@/lib/ai/chatProviders';
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/rateLimit';
import { sanitizeMessages } from '@/lib/sanitize';

type Body = {
  messages: { role: string; content: string }[];
  model?: string;
};

function deskChatForceOllama(): boolean {
  const v = process.env.DESK_CHAT_FORCE_OLLAMA?.trim().toLowerCase();
  return v === '1' || v === 'true' || v === 'yes';
}

function chatUseHuggingFaceFirst(): boolean {
  const v = process.env.CHAT_USE_HF?.trim().toLowerCase();
  return v === '1' || v === 'true' || v === 'yes';
}

function hfTokenPresent(): boolean {
  return Boolean(
    process.env.HF_API_TOKEN?.trim() ||
      process.env.HUGGINGFACE_API_KEY?.trim() ||
      process.env.HF_TOKEN?.trim()
  );
}

// 30 requests per minute per IP for chat.
const RATE_LIMIT = 30;

export async function POST(req: Request) {
  const ip = getClientIp(req);
  const rl = checkRateLimit(`chat:${ip}`, RATE_LIMIT);
  if (!rl.ok) return rateLimitResponse(rl.resetAt);

  try {
    const body = (await req.json()) as Body;
    const messages = sanitizeMessages(body.messages);
    const { model } = body;
    if (messages.length === 0) {
      return NextResponse.json({ error: 'messages required' }, { status: 400 });
    }

    const geminiKey = process.env.GEMINI_API_KEY?.trim();
    const groqKey = process.env.GROQ_API_KEY?.trim();
    const hasHf = hfTokenPresent();

    // Force Ollama if configured
    if (deskChatForceOllama()) {
      try {
        const out = await chatWithOllama(messages, model);
        return NextResponse.json({ ...out, model: out.model ? `Ollama · ${out.model}` : 'Ollama' });
      } catch {
        console.warn('DESK_CHAT_FORCE_OLLAMA: Ollama unavailable, falling through.');
      }
    }

    // Gemini — primary when GEMINI_API_KEY is set
    if (geminiKey) {
      try {
        const out = await chatWithGemini(messages, model);
        return NextResponse.json({ ...out, model: `Gemini · ${out.model}` });
      } catch (e) {
        console.error('Gemini chat error:', e);
        // Fall through to next provider
      }
    }

    // HuggingFace first if CHAT_USE_HF=1 or no Groq key
    if (hasHf && (chatUseHuggingFaceFirst() || !groqKey)) {
      try {
        const out = await chatWithHuggingFace(messages, model);
        return NextResponse.json({ ...out, model: `Hugging Face · ${out.model}` });
      } catch (e) {
        console.error('Hugging Face chat error:', e);
        if (!groqKey) {
          const msg = e instanceof Error ? e.message : 'Hugging Face error';
          return NextResponse.json({
            created_at: new Date().toISOString(),
            message: { role: 'assistant', content: `Could not complete the request: ${msg}` },
            done: true,
          });
        }
      }
    }

    // Groq
    if (groqKey) {
      try {
        const out = await chatWithGroq(messages, model);
        return NextResponse.json({ ...out, model: `Groq · ${out.model}` });
      } catch (e) {
        console.error('Groq error:', e);
        if (hasHf) {
          try {
            const out = await chatWithHuggingFace(messages, model);
            return NextResponse.json({ ...out, model: `Hugging Face · ${out.model}` });
          } catch (hfErr) {
            console.error('HF fallback after Groq failed:', hfErr);
          }
        }
        const msg = e instanceof Error ? e.message : 'Groq error';
        return NextResponse.json({
          created_at: new Date().toISOString(),
          message: { role: 'assistant', content: `Could not complete the request via Groq: ${msg}` },
          done: true,
        });
      }
    }

    // Ollama fallback
    try {
      const out = await chatWithOllama(messages, model);
      return NextResponse.json({ ...out, model: out.model ? `Ollama · ${out.model}` : 'Ollama' });
    } catch {
      console.warn('Ollama unavailable, using simulation.');
    }

    // Simulation
    const out = simulationResponse(messages, model);
    return NextResponse.json({ ...out, model: 'Simulation' });
  } catch (error) {
    console.error('API Route Critical Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
