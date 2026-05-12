import { NextResponse } from 'next/server';
import { chatWithGroq, chatWithClaude } from '@/lib/ai/chatProviders';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { message, context, history } = body;

    if (!message) {
      return NextResponse.json({ reply: 'No message provided.' }, { status: 400 });
    }

    const systemPrompt = `You are Zep, an in-app AI assistant for a startup operating system called DeepChox. You help users control the app through natural language commands.

Current app state:
${context || 'No specific context.'}

You can help users with:
1. Navigation - switch between desks (CEO, PM/CFO, Scout, CMO, Dexo, etc.)
2. Venture management - create new ventures, select existing ones
3. Staff operations - run sync across all AI agents
4. Content updates - modify strategy, product plans, budgets, market insights
5. Quick notes - add thoughts and ideas

Be concise and helpful. If the user asks for something you can't do directly, suggest the manual way or explain what's possible.

When responding:
- Keep replies short (1-2 sentences when possible)
- Be direct and actionable
- If you're not sure what they want, ask for clarification
- Don't hallucinate capabilities - be honest about what you can/cannot do`;

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
