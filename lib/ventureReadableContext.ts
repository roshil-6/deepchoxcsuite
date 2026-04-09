/**
 * Turn stored strategy / product JSON into plain language for AI prompts and exports.
 * Avoids dumping raw JSON so models (and users) see narrative, not "binary" blobs.
 */

import { parseStrategy, type StrategyDoc } from '@/lib/strategyDoc';
import { parseProductPlan } from '@/lib/productPlanDoc';

const CAP = 4500;

function pickStrategyNarrative(doc: StrategyDoc): string {
    const a = doc.strategicIntent?.trim() || '';
    const b = doc.vision?.trim() || '';
    const c = doc.content?.trim() || '';
    const parts: string[] = [];
    if (a) parts.push(a);
    if (b && b !== a) parts.push(b);
    if (c && c !== a && c !== b) parts.push(c);
    return parts.length ? parts.join('\n\n') : '';
}

function strategyStructuredAddendum(doc: StrategyDoc): string {
    const bits: string[] = [];
    const pri = doc.priorities?.filter((p) => p.title?.trim()) ?? [];
    if (pri.length) {
        const open = pri.filter((p) => !p.done).length;
        bits.push(
            `Priorities (${pri.length} items, ${open} open): ${pri.map((p) => `${p.title.trim()}${p.done ? ' (done)' : ''}`).join('; ')}`,
        );
    }
    const titledPhases = doc.phases?.filter((p) => p.title?.trim()) ?? [];
    if (titledPhases.length) {
        bits.push(
            `Phase timeline (named): ${titledPhases.map((p) => `${p.title.trim()} [${p.status ?? 'planned'}]`).join(' · ')}`,
        );
    } else if ((doc.phases?.length ?? 0) > 0) {
        bits.push(`${doc.phases!.length} phase slot(s) on the timeline (titles not filled in yet).`);
    }
    const nodes = doc.flow?.nodes ?? [];
    if (nodes.length) {
        const labels = nodes.map((n) => (n.label || 'Step').trim()).filter(Boolean);
        bits.push(`Strategy flow (canvas): ${labels.join(' → ')}`);
    }
    const team = doc.team?.members?.filter((m) => m.name?.trim()) ?? [];
    if (team.length) {
        bits.push(`Team workspace: ${team.map((m) => `${m.name} (${m.role})`).join(', ')}`);
    }
    return bits.length ? `\n\n${bits.join('\n')}` : '';
}

/** Full strategy block for prompts — narrative + short structured summary, no JSON. */
export function formatStrategyForContext(strategyRaw: string | undefined | null): string {
    if (!strategyRaw?.trim()) return 'Not set.';
    const doc = parseStrategy(strategyRaw);
    const narrative = pickStrategyNarrative(doc);
    const extra = strategyStructuredAddendum(doc);
    let out = narrative || 'No narrative text in strategy fields yet (only structure / checklist may be filled).';
    out += extra;
    if (out.length > CAP) out = `${out.slice(0, CAP)}\n… (truncated)`;
    return out;
}

/** Product plan block for prompts — intent, roadmap, actions, war room; no JSON. */
export function formatProductPlanForContext(productRaw: string | undefined | null): string {
    if (!productRaw?.trim()) return 'Not set.';
    const p = parseProductPlan(productRaw);
    const chunks: string[] = [];
    if (p.intent?.trim()) chunks.push(`Product intent: ${p.intent.trim()}`);
    if (p.roadmapText?.trim()) chunks.push(`Roadmap / plan:\n${p.roadmapText.trim()}`);
    const actions = p.recentActions?.filter((a) => a.title?.trim() || a.detail?.trim()) ?? [];
    if (actions.length) {
        const lines = actions.slice(0, 20).map((a) => {
            const t = a.title?.trim() || a.category;
            const d = a.detail?.trim();
            return d ? `- ${t}: ${d}` : `- ${t}`;
        });
        chunks.push(`Recent actions:\n${lines.join('\n')}`);
    }
    const stickies = p.warRoom?.stickies?.filter((s) => s.text?.trim()) ?? [];
    if (stickies.length) {
        chunks.push(`War room stickies: ${stickies.map((s) => `"${s.text.trim()}"`).join(' · ')}`);
    } else if ((p.warRoom?.stickies?.length ?? 0) > 0) {
        chunks.push('War room: stickies on the board but none have text yet.');
    }
    if (!chunks.length) {
        return 'Structured product plan on file, but intent and roadmap text are empty — encourage filling them on the PM desk.';
    }
    let out = chunks.join('\n\n');
    if (out.length > CAP) out = `${out.slice(0, CAP)}\n… (truncated)`;
    return out;
}

/** Short excerpt for PDF slides / previews (single paragraph feel). */
export function excerptStrategyForSlide(strategyRaw: string | undefined | null, maxLen = 600): string {
    const full = formatStrategyForContext(strategyRaw);
    if (full === 'Not set.') return '';
    const first = full.split('\n\n')[0] ?? full;
    return first.length <= maxLen ? first : `${first.slice(0, maxLen)}…`;
}

export function excerptProductPlanForSlide(productRaw: string | undefined | null, maxLen = 600): string {
    const full = formatProductPlanForContext(productRaw);
    if (full.startsWith('Structured product plan')) return full.length <= maxLen ? full : `${full.slice(0, maxLen)}…`;
    const first = full.split('\n\n')[0] ?? full;
    return first.length <= maxLen ? first : `${first.slice(0, maxLen)}…`;
}
