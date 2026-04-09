import { NextResponse } from 'next/server';
import { chatWithGroq, chatWithHuggingFace, chatWithOllama, simulationResponse } from '@/lib/ai/chatProviders';
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
  // --- Rate limiting ---
  const ip = getClientIp(req);
  const rl = checkRateLimit(`chat:${ip}`, RATE_LIMIT);
  if (!rl.ok) return rateLimitResponse(rl.resetAt);

  try {
    const body = (await req.json()) as Body;
    // Sanitize message content and whitelist roles before forwarding to AI providers.
    const messages = sanitizeMessages(body.messages);
    const { model } = body;
    if (messages.length === 0) {
      return NextResponse.json({ error: 'messages required' }, { status: 400 });
    }

    const groqKey = process.env.GROQ_API_KEY?.trim();
    const hasHf = hfTokenPresent();

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

    // Hugging Face Inference (e.g. Gemma) — use when CHAT_USE_HF=1, or when no Groq key (HF-only hosting)
    if (hasHf && (chatUseHuggingFaceFirst() || !groqKey)) {
      try {
        const out = await chatWithHuggingFace(messages, model);
        return NextResponse.json({
          ...out,
          model: `Hugging Face · ${out.model}`,
        });
      } catch (e) {
        console.error('Hugging Face chat error:', e);
        const msg = e instanceof Error ? e.message : 'Hugging Face error';
        if (!groqKey) {
          return NextResponse.json({
            created_at: new Date().toISOString(),
            message: {
              role: 'assistant',
              content: `Could not complete the request via Hugging Face: ${msg}. Check HF_API_TOKEN and HF_CHAT_MODEL (see https://huggingface.co/docs/api-inference).`,
            },
            done: true,
          });
        }
        console.warn('HF failed, falling back to Groq.', e);
      }
    }

    // Groq when GROQ_API_KEY is set — on failure, try HF if token present (Gemma / backup)
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
        if (hasHf) {
          try {
            const out = await chatWithHuggingFace(messages, model);
            return NextResponse.json({
              ...out,
              model: `Hugging Face · ${out.model}`,
            });
          } catch (hfErr) {
            console.error('HF fallback after Groq failed:', hfErr);
          }
        }
        return NextResponse.json({
          created_at: new Date().toISOString(),
          message: {
            role: 'assistant',
            content: `Could not complete the request via Groq: ${msg}. Check that GROQ_MODEL is a current model (see https://console.groq.com/docs/deprecations). If you use Hugging Face instead, set HF_API_TOKEN and CHAT_USE_HF=1 or remove GROQ_API_KEY.`,
          },
          done: true,
        });
      }
    }

    // Local / remote Ollama
    try {
      const out = await chatWithOllama(messages, model);
      return NextResponse.json({
        ...out,
        model: out.model ? `Ollama · ${out.model}` : 'Ollama',
      });
    } catch (fetchError) {
      console.warn('Ollama unavailable, using simulation.', fetchError);
    }

    // Demo fallback
    const out = simulationResponse(messages, model);
    return NextResponse.json({ ...out, model: 'Simulation' });
  } catch (error) {
    console.error('API Route Critical Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
