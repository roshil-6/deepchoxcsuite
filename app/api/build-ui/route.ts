/**
 * /api/build-ui — AI-powered UI generation from natural language prompts
 *
 * Generates declarative UI schemas that can be rendered dynamically.
 * Supports iteration: pass previousSchema to refine/modify existing UIs.
 */

import { NextResponse } from 'next/server';
import { chatWithClaude, chatWithOpenAI } from '@/lib/ai/chatProviders';
import type { UISchema, BuildUIRequest, BuildUIResponse, UITheme } from '@/lib/uiSchema';
import { createSchemaId, DEFAULT_UI_THEME, LIGHT_UI_THEME } from '@/lib/uiSchema';
import { sanitizeSchemaForUi } from '@/lib/builderSafety';

export const maxDuration = 60;

const MAX_PROMPT_LENGTH = 12000;

const SYSTEM_PROMPT = `You are an expert UI/UX designer and frontend architect. Your task is to generate declarative UI schemas based on user prompts.

URL safety (required): use only https: URLs for images and external targets. Prefer relative paths (starting with "/") or hash anchors ("#section") for in-site navigation. Never use javascript:, data:, vbscript:, or blob: in href or image src fields.

You must output a valid JSON object with this structure:
{
  "schema": {
    "id": "unique-id",
    "name": "Human-readable name",
    "description": "Brief description",
    "createdAt": timestamp,
    "updatedAt": timestamp,
    "theme": {
      "primaryColor": "#hex",
      "secondaryColor": "#hex",
      "background": "#hex",
      "surface": "#hex",
      "text": "#hex",
      "textMuted": "#hex",
      "fontFamily": "font name",
      "borderRadius": "none|sm|md|lg|xl|full",
      "spacing": "compact|normal|relaxed"
    },
    "sections": [...],
    "meta": { "title": "...", "ogImage": "..." }
  },
  "suggestions": ["suggested follow-up prompt 1", "suggestion 2", "suggestion 3"]
}

SECTION TYPES (use these exact types):

1. "navbar" - Top navigation bar
   { type: "navbar", logo: { text: "..." }, links: [{label, href}], sticky: true, transparent: false, mobileMenu: "drawer" }

2. "hero" - Hero/banner section
   { type: "hero", title: "...", subtitle: "...", description: "...", cta: {label, variant: "primary", action: "scroll"}, layout: "center|split|full" }

3. "features" - Feature showcase
   { type: "features", title: "...", description: "...", layout: "grid|list|cards|bento", columns: 3, items: [{id, icon: "emoji or lucide name", title, description}] }

4. "stats" - Metrics/stats display
   { type: "stats", title: "...", layout: "grid|row|cards", metrics: [{value, label, prefix, suffix}] }

5. "testimonials" - Customer quotes
   { type: "testimonials", title: "...", layout: "grid|carousel|marquee", quotes: [{id, quote, author: {name, role, company}}] }

6. "pricing" - Pricing tiers
   { type: "pricing", title: "...", layout: "cards|table", tiers: [{id, name, price: {monthly, yearly}, features: [], highlighted: false}] }

7. "faq" - FAQ accordion
   { type: "faq", title: "...", layout: "accordion|simple", questions: [{question, answer}] }

8. "form" - Contact/signup form
   { type: "form", title: "...", fields: [{id, type: "text|email|textarea|select", label, required}], submitLabel: "...", submitAction: "email|showMessage" }

9. "cta" - Call-to-action banner
   { type: "cta", title: "...", description: "...", cta: {...}, background: "default|gradient|dark" }

10. "team" - Team members
    { type: "team", title: "...", layout: "grid|cards", members: [{id, name, role, image}] }

11. "gallery" - Image gallery
    { type: "gallery", title: "...", layout: "grid|masonry", images: [{id, src, alt}] }

12. "logos" - Logo showcase (for social proof)
    { type: "logos", title: "...", logos: [{id, name, image}] }

13. "text" - Simple text content
    { type: "text", content: "...", align: "left|center", size: "sm|base|lg|xl" }

14. "divider" - Visual separator
    { type: "divider", style: "line|gradient|wave", spacing: "sm|md|lg" }

15. "footer" - Page footer
    { type: "footer", logo: {text: "..."}, tagline: "...", columns: [{title, links: [{label, href}]}] }

DESIGN GUIDELINES:
- Choose appropriate sections based on the user's intent
- Use complementary colors that work well together
- Include at least 3-5 sections for a complete page
- Add smooth transitions between sections
- Include a navbar and footer for complete pages
- Use descriptive, engaging copy
- Make CTAs clear and actionable

For iteration (when previousSchema is provided):
- Preserve existing sections unless user asks to change them
- Add new sections at appropriate positions
- Modify only what the user requested
- Keep the same theme unless user asks for changes

Respond with ONLY the JSON object, no markdown formatting.`;

function createUserPrompt(request: BuildUIRequest): string {
  const { prompt, previousSchema, iteration, refinement } = request;

  if (iteration && previousSchema) {
    return `Refine this existing UI based on the request: "${prompt}"

Current UI schema:
${JSON.stringify(previousSchema, null, 2)}

${refinement ? `Specific refinement: ${refinement}` : ''}

Modify the schema according to the user's request while preserving existing sections that weren't mentioned.`;
  }

  return `Generate a complete UI for: "${prompt}"

Create a modern, professional interface with appropriate sections.`;
}

function sanitizeSchema(schema: unknown): UISchema {
  const s = schema as Record<string, unknown>;
  const now = Date.now();

  return {
    id: typeof s.id === 'string' ? s.id : createSchemaId(),
    name: typeof s.name === 'string' ? s.name : 'Untitled UI',
    description: typeof s.description === 'string' ? s.description : '',
    createdAt: typeof s.createdAt === 'number' ? s.createdAt : now,
    updatedAt: now,
    theme: sanitizeTheme(s.theme as Record<string, unknown>),
    sections: sanitizeSections(s.sections),
    meta: s.meta as UISchema['meta'],
  };
}

function sanitizeSections(raw: unknown): UISchema['sections'] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((section) => (
    section &&
    typeof section === 'object' &&
    typeof (section as { type?: unknown }).type === 'string'
  )) as UISchema['sections'];
}

function sanitizeTheme(theme: Record<string, unknown> | undefined): UITheme {
  if (!theme || typeof theme !== 'object') return DEFAULT_UI_THEME;

  return {
    primaryColor: typeof theme.primaryColor === 'string' ? theme.primaryColor : DEFAULT_UI_THEME.primaryColor,
    secondaryColor: typeof theme.secondaryColor === 'string' ? theme.secondaryColor : DEFAULT_UI_THEME.secondaryColor,
    background: typeof theme.background === 'string' ? theme.background : DEFAULT_UI_THEME.background,
    surface: typeof theme.surface === 'string' ? theme.surface : DEFAULT_UI_THEME.surface,
    text: typeof theme.text === 'string' ? theme.text : DEFAULT_UI_THEME.text,
    textMuted: typeof theme.textMuted === 'string' ? theme.textMuted : DEFAULT_UI_THEME.textMuted,
    fontFamily: typeof theme.fontFamily === 'string' ? theme.fontFamily : DEFAULT_UI_THEME.fontFamily,
    borderRadius: (theme.borderRadius as UITheme['borderRadius']) || DEFAULT_UI_THEME.borderRadius,
    spacing: (theme.spacing as UITheme['spacing']) || DEFAULT_UI_THEME.spacing,
  };
}

function getSuggestions(schema: UISchema, prompt: string): string[] {
  const suggestions: string[] = [];
  const sections = schema.sections.map(s => (s as { type: string }).type);

  if (!sections.includes('testimonials')) {
    suggestions.push('Add customer testimonials section');
  }
  if (!sections.includes('faq')) {
    suggestions.push('Add an FAQ section');
  }
  if (!sections.includes('stats')) {
    suggestions.push('Add stats/metrics showcase');
  }
  if (!sections.includes('pricing')) {
    suggestions.push('Add pricing tiers');
  }
  if (!sections.includes('team') && sections.includes('pricing')) {
    suggestions.push('Add team member profiles');
  }

  // Light/dark toggle suggestion
  if (schema.theme.background === DEFAULT_UI_THEME.background) {
    suggestions.push('Convert to light theme');
  } else {
    suggestions.push('Convert to dark theme');
  }

  // Layout variations
  const hero = schema.sections.find(s => (s as { type: string }).type === 'hero') as { layout?: string } | undefined;
  if (hero?.layout === 'center') {
    suggestions.push('Change hero to split layout with image');
  }

  return suggestions.slice(0, 4);
}

function fallbackSchemaFromPrompt(prompt: string, previousSchema?: UISchema): UISchema {
  const lower = prompt.toLowerCase();
  const now = Date.now();
  const darkTheme = !(lower.includes('light') || lower.includes('bright'));
  const theme = darkTheme ? DEFAULT_UI_THEME : LIGHT_UI_THEME;
  const baseSections = previousSchema?.sections ?? [];

  if (previousSchema) {
    return {
      ...previousSchema,
      updatedAt: now,
      theme,
      sections: baseSections.length > 0 ? baseSections : [
        {
          type: 'hero',
          title: previousSchema.name || 'Your Interface',
          description: 'Refined from your prompt request.',
          layout: 'center',
        },
      ],
    };
  }

  const includePricing = lower.includes('pricing') || lower.includes('saas');
  const includeTestimonials = lower.includes('testimonial') || lower.includes('review');
  const includeFaq = lower.includes('faq') || lower.includes('questions');

  const sections: UISchema['sections'] = [
    {
      type: 'navbar',
      logo: { text: 'Your Brand', href: '#' },
      links: [
        { label: 'Features', href: '#features' },
        { label: 'Pricing', href: '#pricing' },
        { label: 'Contact', href: '#contact' },
      ],
      sticky: true,
      transparent: false,
      mobileMenu: 'drawer',
    },
    {
      type: 'hero',
      title: 'Launch your next product faster',
      subtitle: 'AI-generated interface',
      description: prompt,
      layout: 'split',
      cta: { label: 'Get Started', variant: 'primary', action: 'scroll' },
      secondaryCta: { label: 'Learn More', variant: 'secondary', action: 'scroll' },
    },
    {
      type: 'features',
      title: 'Built for speed',
      description: 'A starter layout tailored from your prompt.',
      layout: 'grid',
      columns: 3,
      items: [
        { id: 'f1', title: 'Prompt to UI', description: 'Describe what you want in plain English.' },
        { id: 'f2', title: 'Iterative edits', description: 'Refine sections with follow-up prompts.' },
        { id: 'f3', title: 'Export ready', description: 'Export schema, HTML, or starter React.' },
      ],
    },
  ];

  if (includePricing) {
    sections.push({
      type: 'pricing',
      title: 'Pricing',
      layout: 'cards',
      tiers: [
        { id: 'starter', name: 'Starter', price: { monthly: 0 }, features: ['Basic components'] },
        { id: 'pro', name: 'Pro', price: { monthly: 29 }, features: ['Advanced sections', 'Export'], highlighted: true },
      ],
      frequency: 'monthly',
    });
  }

  if (includeTestimonials) {
    sections.push({
      type: 'testimonials',
      title: 'Loved by teams',
      layout: 'grid',
      quotes: [
        { id: 't1', quote: 'This got us from idea to landing page in minutes.', author: { name: 'A Founder', company: 'Startup' } },
      ],
    });
  }

  if (includeFaq) {
    sections.push({
      type: 'faq',
      title: 'FAQ',
      layout: 'accordion',
      questions: [
        { question: 'Can I customize this?', answer: 'Yes, refine with additional prompts.' },
      ],
    });
  }

  sections.push({
    type: 'footer',
    logo: { text: 'Your Brand' },
    tagline: 'Generated by Deepchox Builder',
    columns: [
      { title: 'Product', links: [{ label: 'Features', href: '#' }, { label: 'Pricing', href: '#' }] },
      { title: 'Company', links: [{ label: 'About', href: '#' }, { label: 'Contact', href: '#' }] },
    ],
  });

  return {
    id: createSchemaId(),
    name: 'Generated Landing Page',
    description: 'Fallback interface generated from prompt intent.',
    createdAt: now,
    updatedAt: now,
    theme,
    sections,
  };
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as BuildUIRequest;
    const { prompt, previousSchema, iteration } = body;

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }

    if (prompt.length > MAX_PROMPT_LENGTH) {
      return NextResponse.json(
        { error: `Prompt must be at most ${MAX_PROMPT_LENGTH} characters` },
        { status: 400 }
      );
    }

    const userPrompt = createUserPrompt(body);
    let response: { message: { content: string } } | null = null;
    let tokensUsed = 0;

    try {
      response = await chatWithClaude(
        [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        { responseJsonObject: true, temperature: 0.5 }
      );
    } catch {
      try {
        response = await chatWithOpenAI(
          [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: userPrompt },
          ],
          'gpt-4o',
          { responseJsonObject: true, temperature: 0.5 }
        );
      } catch {
        response = null;
      }
    }

    if (!response) {
      const schema = sanitizeSchemaForUi(fallbackSchemaFromPrompt(prompt, previousSchema));
      return NextResponse.json({
        schema,
        suggestions: getSuggestions(schema, prompt),
      } satisfies BuildUIResponse);
    }

    const content = response.message.content;
    let parsed: { schema?: unknown; suggestions?: string[] };

    try {
      parsed = JSON.parse(content);
    } catch {
      // Try to extract JSON from markdown code blocks
      const match = content.match(/```json\s*([\s\S]*?)\s*```/);
      if (match) {
        parsed = JSON.parse(match[1]);
      } else {
        const schema = sanitizeSchemaForUi(fallbackSchemaFromPrompt(prompt, previousSchema));
        return NextResponse.json({
          schema,
          suggestions: getSuggestions(schema, prompt),
        } satisfies BuildUIResponse);
      }
    }

    if (!parsed.schema) {
      const schema = sanitizeSchemaForUi(fallbackSchemaFromPrompt(prompt, previousSchema));
      return NextResponse.json({
        schema,
        suggestions: getSuggestions(schema, prompt),
      } satisfies BuildUIResponse);
    }

    const schema = sanitizeSchemaForUi(sanitizeSchema(parsed.schema));

    // Generate suggestions if not provided
    const suggestions = parsed.suggestions && Array.isArray(parsed.suggestions)
      ? parsed.suggestions.slice(0, 4)
      : getSuggestions(schema, prompt);

    const result: BuildUIResponse = {
      schema,
      suggestions,
      tokensUsed,
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error('Build UI error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate UI' },
      { status: 500 }
    );
  }
}

// Health check endpoint
export async function GET() {
  return NextResponse.json({ status: 'ok', endpoint: '/api/build-ui' });
}
