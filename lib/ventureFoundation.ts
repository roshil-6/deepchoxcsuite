import type { Project } from '@/lib/db';

type VentureFields = Pick<Project, 'strategy' | 'productPlan' | 'budget' | 'marketInsights' | 'userNotes'>;

/** Legacy CEO desk placeholder — not founder-provided narrative. */
const PLACEHOLDER_NARRATIVE =
    'Timeline and flow structure are prefilled below. Add your strategic narrative, intent, and proof points here.';

type ParsedStrategyNarrative = {
    content: string;
    vision: string;
    strategicIntent: string;
    /** Parsed as a JSON strategy document (vs legacy markdown / prose in `strategy`). */
    isJsonDocument: boolean;
};

/**
 * Read only narrative slots from strategy. Does not use parseStrategy's error fallback
 * (which assigns the entire raw string to `content` and can falsely look "filled").
 */
function readStrategyNarrative(raw: string): ParsedStrategyNarrative {
    const empty: ParsedStrategyNarrative = {
        content: '',
        vision: '',
        strategicIntent: '',
        isJsonDocument: false,
    };
    if (!raw?.trim()) return empty;
    try {
        const j = JSON.parse(raw) as Record<string, unknown>;
        if (!j || typeof j !== 'object' || Array.isArray(j)) {
            return { content: String(raw).trim(), vision: '', strategicIntent: '', isJsonDocument: false };
        }
        return {
            content: typeof j.content === 'string' ? j.content : '',
            vision: typeof j.vision === 'string' ? j.vision : '',
            strategicIntent: typeof j.strategicIntent === 'string' ? j.strategicIntent : '',
            isJsonDocument: true,
        };
    } catch {
        return { content: raw.trim(), vision: '', strategicIntent: '', isJsonDocument: false };
    }
}

export type VentureFoundationFields = VentureFields;

/**
 * True when strategy text/intent looks like founder-written substance, not the empty shell or placeholder blurb.
 * Used by health metrics so “100” cannot mean only prefilled timeline slots.
 */
export function strategyHasSubstantiveFounderNarrative(strategyRaw: string | undefined): boolean {
    const { content, vision, strategicIntent, isJsonDocument } = readStrategyNarrative(strategyRaw || '');

    const c = content.trim();
    const v = vision.trim();
    const si = strategicIntent.trim();

    const isPlaceholder =
        c === PLACEHOLDER_NARRATIVE || c.startsWith('Timeline and flow structure are prefilled');

    if (isPlaceholder) return false;
    if (isJsonDocument) return c.length > 72 || v.length >= 12 || si.length >= 12;
    return c.length > 72;
}

/**
 * True when the venture is still mostly the blank shell — health and charts should not imply real measurement.
 */
export function isVentureFoundationSparse(p: VentureFields | null | undefined): boolean {
    if (!p) return true;
    const founderStory = strategyHasSubstantiveFounderNarrative(p.strategy);

    const signals = [
        founderStory,
        (p.productPlan?.trim().length ?? 0) > 48,
        (p.budget?.trim().length ?? 0) > 24,
        (p.marketInsights?.trim().length ?? 0) > 48,
        (p.userNotes?.trim().length ?? 0) > 80,
    ].filter(Boolean).length;
    return signals < 2;
}
