/** Shared guide nav + FAQ copy (also drives FAQPage JSON-LD in app/guide/layout.tsx). */

export const GUIDE_NAV = [
  { id: 'guide-intro', label: 'Overview' },
  { id: 'guide-loop', label: 'Solo-founder loop' },
  { id: 'guide-agents', label: 'How agents behave' },
  { id: 'guide-dexo', label: 'Deepchox room' },
  { id: 'guide-orb', label: 'Floating orb' },
  { id: 'guide-ai', label: 'Claude × GPT' },
  { id: 'guide-faq', label: 'FAQ' },
] as const;

export const GUIDE_TITLE = 'How Deepchox works - product guide for founders';
export const GUIDE_META_DESCRIPTION =
  'Learn how Deepchox fits solo founders: venture desks, AI teammates, staff sync, the Deepchox Intelligence Room, Claude x GPT routing, orb voice, and FAQs - without deployment trivia.';

export const GUIDE_FAQ_ITEMS: Array<{ q: string; a: string }> = [
  {
    q: 'Which AI models power Deepchox?',
    a: 'Deepchox runs a **Claude × GPT dual stack**. **OpenAI GPT** powers desk agents (CEO, CFO, PM, CMO, Scout) with role-specific prompts. **Anthropic Claude** runs in parallel on **staff sync** alongside GPT so both model families contribute to merged desk briefs. The **Deepchox Intelligence Room** adds a dedicated analysis pass across your venture fields. Routing is automatic - you never pick a provider.',
  },
  {
    q: 'What is Deepchox and how is it different from the desk agents?',
    a: '**Deepchox** is an ambient intelligence room, not a desk. While desk agents answer domain questions on demand, Deepchox reads your entire venture record and produces a **cross-functional analysis** covering strategy gaps, product risks, financial flags, and market signals in one pass. It speaks results aloud in a **Jarvis-style voice** and surfaces prioritised next actions.',
  },
  {
    q: 'Can I talk to Deepchox while it is still analysing?',
    a: 'Yes. Deepchox uses **non-blocking analysis** - the message bar and voice input are active the moment you enter the room. You can ask follow-up questions or speak a prompt before the first report finishes. The analysis runs in the background and the conversation thread updates when it completes.',
  },
  {
    q: 'How do I interrupt Deepchox while it is speaking?',
    a: 'Tap the **microphone button** or speak at any point - Deepchox cancels the current speech, registers your interrupt in the conversation thread, and immediately processes your input. You can also tap the **Mute** button to silence the voice while the text report remains on screen.',
  },
  {
    q: 'How is the virtual office meant to work for a solo founder?',
    a: 'You operate as the single decision-maker. Deepchox gives you **desks** where **AI roles act as teammates** (strategy, product, finance, market, GTM, and more): each produces outputs in one venture record so context never splits across tools. **Deepchox** sits above the desks as an ambient layer that synthesises all of it.',
  },
  {
    q: 'How do the agents behave?',
    a: "Each AI teammate is **role-bound**: they answer from their desk's mandate - strategy narrative, finance numbers, product delivery, market signal - not as a generic chatbot. **Staff sync** refreshes all desk briefs from the same snapshot and can merge updates into your venture.",
  },
  {
    q: 'What do I do first after entering the workspace?',
    a: 'Complete **venture onboarding** so intent and scope exist. Then open the **dashboard** and move between desks as your week demands; run **AI staff sync** when you want the model stack to refresh intel into your venture. Open **Deepchox** whenever you want a full cross-functional read of where the venture stands.',
  },
];

/** Plain text for schema.org `Answer.text` (strip bold markers). */
export function stripMarkdownBoldForSchema(text: string): string {
  return text.replace(/\*\*(.*?)\*\*/g, '$1');
}
