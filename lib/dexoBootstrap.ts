import type { StaffAttentionItem } from '@/lib/db';

/** Payload when opening Deepchox from “Set up” so the room can show context + send one converse turn. */
export type DexoBootstrapPayload = {
    /** Short heading — usually the staff attention title */
    title: string;
    /** Full staff message / context */
    detail: string;
    /** Which desk raised this setup context */
    sourceRole: StaffAttentionItem['role'];
    /** Concrete info the founder should provide to Deepchox now */
    requiredInfo: string[];
    /** Message sent to Deepchox as the first user turn */
    userMessage: string;
};

function extractRequiredInfo(detail: string): string[] {
    const lines = detail
        .split(/\r?\n/)
        .map((s) => s.trim())
        .filter(Boolean);

    const bullets = lines
        .filter((line) => /^([-*•]|\d+\.)\s+/.test(line))
        .map((line) => line.replace(/^([-*•]|\d+\.)\s+/, '').trim())
        .filter((line) => line.length > 4);

    if (bullets.length > 0) {
        return bullets.slice(0, 6);
    }

    const sentenceChunks = detail
        .split(/(?<=[.!?])\s+/)
        .map((s) => s.trim())
        .filter(Boolean);

    const candidates = sentenceChunks.filter((s) =>
        /(need|needs|required|missing|provide|share|confirm|upload|clarify|decide|lock|choose|call)/i.test(s)
    );

    const picked = (candidates.length > 0 ? candidates : sentenceChunks).slice(0, 4);
    return picked.map((s) => s.replace(/\s+/g, ' ').trim());
}

export function buildDexoStaffAttentionBootstrap(item: StaffAttentionItem): DexoBootstrapPayload {
    const requiredInfo = extractRequiredInfo(item.message);
    const requiredBlock =
        requiredInfo.length > 0
            ? requiredInfo.map((line, i) => `${i + 1}. ${line}`).join('\n')
            : '1. Confirm what is missing and what decision is blocked.\n2. Share any files/notes already prepared.\n3. Ask Deepchox for the exact next action.';
    const userMessage =
        `Staff sync flagged this on my ${item.role.toUpperCase()} desk — help me work through it with Deepchox.\n\n` +
        `**${item.title}**\n\n${item.message}\n\n` +
        `Info I can provide now:\n${requiredBlock}\n\n` +
        `What should I do first? Name the desk (left navigation), the fields to update, and keep advice grounded in what is already saved in this venture.`;
    return {
        title: item.title,
        detail: item.message,
        sourceRole: item.role,
        requiredInfo,
        userMessage,
    };
}
