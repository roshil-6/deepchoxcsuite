import { NextResponse } from 'next/server';
import { chatWithGroq, chatWithClaude } from '@/lib/ai/chatProviders';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { message, context, history } = body;

    if (!message) {
      return NextResponse.json({ reply: 'No message provided.' }, { status: 400 });
    }

    const systemPrompt = `You are Zep, the in-app helper for Deepchox (northROSC LABS).

Current context from the browser shell:
${context || 'No specific context.'}

The live web workspace has two surfaced areas users can navigate to:
• Engineering — prompts run an eight‑agent orchestration pipeline (architecture, code, docs, deploy, validation, etc.).
• Research — topical news headlines and manual search across tech domains.

Honest boundaries:
• There are no standalone “CEO desk”, PM desk, investor desk, or similar rooms in this build—those names may exist in docs or roadmap but are not routed in the shipped UI.
• “Staff sync” across venture desks applies to legacy IndexedDB venture data—not the Engineering project list saved in localStorage.
• Prefer telling users they can tap Engineering / Research in the sidebar (or Zep phrases like “open engineering”) rather than naming desks we don’t mount.

Tone: concise, plain language, never invent features.`;

    const messages = [
      { role: 'system', content: systemPrompt },
      ...(history || []).map((h: any) => ({ role: h.role === 'zep' ? 'assistant' : 'user', content: h.text })),
      { role: 'user', content: message },
    ];

    // Try Groq first (fast), fallback to Claude
    let result;
    try {
      result = await chatWithGroq(messages, 'llama3', { temperature: 0.7 });
    } catch {
      result = await chatWithClaude(messages, { temperature: 0.7 });
    }

    const reply = result.message?.content || 'Sorry, I could not process that.';

    return NextResponse.json({ reply });
  } catch (error) {
    console.error('Zep API error:', error);
    return NextResponse.json(
      { reply: 'Sorry, I had trouble processing that. Please try again.' },
      { status: 500 }
    );
  }
}
