import type { Project } from '@/lib/db';
import type { DexoConvoMessage } from '@/lib/dexoConvoStorage';
import { isVentureFoundationSparse } from '@/lib/ventureFoundation';
import { readVenturePriority } from '@/lib/venturePriority';

/** First line of the sparse-venture seed (must match `buildInitialDexoMessages`). */
export const SPARSE_WELCOME_PREFIX = "Welcome — I'm Deepchox, your AI co-founder in this workspace.";

/** First line of the non-sparse seed (must match `buildInitialDexoMessages`). */
export const RICH_WELCOME_PREFIX = "Welcome — I'm Deepchox.";

/** Onboarding copy when the user has not saved a venture yet (Deepchox desk + orb). */
export const NO_VENTURE_WELCOME_PREFIX = "Hey — I'm Deepchox. Let's create your venture together.";

/**
 * Mode-specific first question — replaces the generic "what do you want help with" opener.
 * Only used when a non-default priority is set AND no user message history exists yet.
 */
const MODE_OPENERS: Record<string, string> = {
    vision:          "Let's start with why this venture exists. Not the pitch — the real reason. What problem can't you stop thinking about?",
    market_research: "What do you know about your competitors right now? Let's map the landscape before we do anything else.",
    execution:       "What's the one thing stopping you from shipping right now? Give it to me straight.",
    planning:        "Where do you need to be in 90 days? Tell me the goal and we'll work backwards from there.",
};

export function buildNoVentureDexoMessages(): DexoConvoMessage[] {
    const text = `${NO_VENTURE_WELCOME_PREFIX}\n\nTell me what you're exploring — an idea, a market you're curious about, or the problem you want to solve. I'll help you sharpen it step by step.\n\nWhen you're ready, use **New venture** in the sidebar to save a name and full workspace. Type below or use the mic.`;
    return [{ role: 'dexo', text, id: 1 }];
}

export function shouldReplaceNoVentureSeedMessage(messages: DexoConvoMessage[]): boolean {
    if (messages.some((m) => m.role === 'user' && m.text.trim().length > 0)) return false;
    const canonical = buildNoVentureDexoMessages()[0].text.trim();
    const dexoMsgs = messages.filter((m) => m.role === 'dexo');
    if (dexoMsgs.length === 0) return true;
    if (dexoMsgs.length > 1) return true;
    return dexoMsgs[0].text.trim() !== canonical;
}

/** First messages when Deepchox storage is empty — adapts to the active venture priority/focus mode. */
export function buildInitialDexoMessages(project: Project): DexoConvoMessage[] {
    const sparse = isVentureFoundationSparse(project);
    const name   = project.name?.trim() || 'this venture';

    // Read the active priority so the opening message matches the mode
    const { priorityId } = readVenturePriority(project);
    const modeOpener = priorityId && priorityId !== 'all' && priorityId !== 'custom'
        ? MODE_OPENERS[priorityId] ?? null
        : null;

    let text: string;

    if (modeOpener) {
        // Mode-aware opener: short greeting + venture name + targeted first question
        const intro = sparse
            ? `${SPARSE_WELCOME_PREFIX}\n\nWe're starting with **${name}**.`
            : `${RICH_WELCOME_PREFIX} We're in **${name}**.`;
        text = `${intro}\n\n${modeOpener}`;
    } else if (sparse) {
        text = `${SPARSE_WELCOME_PREFIX}\n\nWe can start simple with **${name}**. Tell me what you want help with first.\n\nIf you already have a specific problem or idea in mind, say it in your own words. If not, I can help you figure that out step by step. Type below or use the mic.`;
    } else {
        text = `${RICH_WELCOME_PREFIX} We're in **${name}**.\n\nI already have a little context saved here, but we can keep this simple. Tell me what you want help with first, or tell me the problem that's on your mind right now.`;
    }

    return [{ role: 'dexo', text, id: 1 }];
}

/**
 * Replace stored thread with a single canonical welcome when there is no real user input yet.
 * Collapses duplicate assistant-only seeds and refreshes copy when the venture or foundation state changes.
 */
export function shouldReplaceDexoSeedMessage(project: Project, messages: DexoConvoMessage[]): boolean {
    if (messages.some((m) => m.role === 'user' && m.text.trim().length > 0)) return false;

    const canonical = buildInitialDexoMessages(project)[0].text.trim();
    const dexoMsgs  = messages.filter((m) => m.role === 'dexo');
    if (dexoMsgs.length === 0) return true;
    if (dexoMsgs.length > 1) return true;
    return dexoMsgs[0].text.trim() !== canonical;
}
