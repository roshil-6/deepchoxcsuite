import { NextResponse } from 'next/server';
import { chatWithAI, hasAiKey } from '@/lib/ai/chatProviders';

export interface CaptionWord {
  word: string;
  start: number;
  end: number;
  highlight?: boolean;
}

export interface ShortConfig {
  id: string;
  title: string;
  hookHeadline: string;
  hookHeadlineVariants: string[];
  aspectRatio: '9:16' | '1:1' | '16:9';
  captionStyle: 'hormozi' | 'mrbeast' | 'minimal' | 'neon';
  captionColor: string;
  captionHighlightColor: string;
  progressBarColor: string;
  showProgressBar: boolean;
  words: CaptionWord[];
  durationSeconds: number;
  autoCropFraming: 'center' | 'speaker-tracking' | 'split-screen';
}

const SYSTEM_PROMPT = `You are a viral Short Video Maker assistant.
Given a short video script or clip topic, you must:
1. Craft a high-CTR top headline banner for 9:16 short video formats (e.g. "WAIT FOR IT 🤯", "HOW HE MADE $1M IN 30 DAYS").
2. Provide 3 alternative hook headline variants.
3. Generate word-level captions with timestamps for the first 30 seconds (each word having start/end in seconds, highlighting high-impact punch words).
4. Recommend best visual style (Hormozi, MrBeast, Minimal, or Neon).

OUTPUT ONLY valid JSON matching this exact structure:
{
  "hookHeadline": "Main top banner headline",
  "hookHeadlineVariants": ["Variant 1", "Variant 2", "Variant 3"],
  "captionStyle": "hormozi" | "mrbeast" | "minimal" | "neon",
  "words": [
    { "word": "If", "start": 0.0, "end": 0.2, "highlight": false },
    { "word": "you", "start": 0.2, "end": 0.4, "highlight": false },
    { "word": "WANT", "start": 0.4, "end": 0.7, "highlight": true }
  ]
}`;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { clipTitle, scriptOrHook, captionStyle = 'hormozi' } = body;

    let hookHeadline = 'THE SECRET TO 10X GROWTH 🚀';
    let hookHeadlineVariants = [
      'WAIT TILL THE END 🤯',
      'NOBODY TALKS ABOUT THIS...',
      'THE 1 HABIT THAT MATTERS',
    ];
    let words: CaptionWord[] = [
      { word: 'THE', start: 0.1, end: 0.3, highlight: false },
      { word: 'BIGGEST', start: 0.3, end: 0.6, highlight: true },
      { word: 'MISTAKE', start: 0.6, end: 0.9, highlight: true },
      { word: 'people', start: 0.9, end: 1.2, highlight: false },
      { word: 'make', start: 1.2, end: 1.5, highlight: false },
      { word: 'is', start: 1.5, end: 1.7, highlight: false },
      { word: 'WAITING', start: 1.7, end: 2.1, highlight: true },
      { word: 'for', start: 2.1, end: 2.3, highlight: false },
      { word: 'the', start: 2.3, end: 2.5, highlight: false },
      { word: 'PERFECT', start: 2.5, end: 2.9, highlight: true },
      { word: 'moment.', start: 2.9, end: 3.3, highlight: false },
      { word: 'There', start: 3.4, end: 3.7, highlight: false },
      { word: 'is', start: 3.7, end: 3.9, highlight: false },
      { word: 'NO', start: 3.9, end: 4.2, highlight: true },
      { word: 'perfect', start: 4.2, end: 4.6, highlight: false },
      { word: 'moment.', start: 4.6, end: 5.0, highlight: false },
    ];

    if (hasAiKey()) {
      try {
        const aiResponse = await chatWithAI(
          [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: `Generate short video styling and caption timestamps for: "${clipTitle || ''} - ${scriptOrHook || ''}"` },
          ],
          'llama3',
          { responseJsonObject: true, temperature: 0.5 }
        );

        const rawText = aiResponse.message?.content || '{}';
        const cleanJson = rawText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
        const parsed = JSON.parse(cleanJson);

        if (parsed.hookHeadline) hookHeadline = parsed.hookHeadline;
        if (Array.isArray(parsed.hookHeadlineVariants)) hookHeadlineVariants = parsed.hookHeadlineVariants;
        if (Array.isArray(parsed.words) && parsed.words.length > 0) words = parsed.words;
      } catch (err) {
        console.warn('Short generator AI call failed, using default styles:', err);
      }
    }

    const config: ShortConfig = {
      id: `short-${Date.now()}`,
      title: clipTitle || 'Viral Vertical Short',
      hookHeadline,
      hookHeadlineVariants,
      aspectRatio: '9:16',
      captionStyle,
      captionColor: '#ffffff',
      captionHighlightColor: '#facc15', // yellow Hormozi style
      progressBarColor: '#ef4444',
      showProgressBar: true,
      words,
      durationSeconds: 30,
      autoCropFraming: 'center',
    };

    return NextResponse.json({ ok: true, config });
  } catch (error) {
    console.error('Shorts generator API error:', error);
    return NextResponse.json({ ok: false, error: 'Failed to generate short video config' }, { status: 500 });
  }
}
