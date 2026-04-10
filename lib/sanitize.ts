/**
 * Input sanitization helpers for AI prompt construction.
 *
 * Goal: prevent prompt-injection attacks where a malicious user embeds
 * chat-template tokens or control characters to escape their turn boundary
 * and override system instructions.
 */

/** Strip null bytes and non-printable control characters (keep \t \n \r). */
function stripControls(s: string): string {
    // Allow: 0x09 (tab), 0x0A (LF), 0x0D (CR)
    // Strip: 0x00-0x08, 0x0B, 0x0C, 0x0E-0x1F, 0x7F
    return s.replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, '');
}

/**
 * Chat-template boundary tokens used by Gemma, Llama, Mistral, etc.
 * Stripping these prevents a user from closing their turn and injecting
 * a fake system or model turn.
 */
const TEMPLATE_TOKEN_PATTERNS: RegExp[] = [
    /<\|?(?:start|end)_of_turn\|?>/gi,   // Gemma: <start_of_turn>, <end_of_turn>
    /<\|?(?:im_start|im_end)\|?>/gi,      // ChatML: <|im_start|>, <|im_end|>
    /\[INST\]|\[\/INST\]/gi,              // Llama 2 instruction tokens
    /<<SYS>>|<\/SYS>>/gi,                 // Llama 2 system tokens
    /<\|eot_id\|>|<\|start_header_id\|>|<\|end_header_id\|>/gi, // Llama 3
];

function stripTemplateTokens(s: string): string {
    let out = s;
    for (const re of TEMPLATE_TOKEN_PATTERNS) out = out.replace(re, '');
    return out;
}

/**
 * Sanitize a single string coming from user input before embedding it in
 * an AI prompt.
 *   - Strips control characters
 *   - Removes chat-template escape tokens
 *   - Truncates to `maxLength` characters
 */
export function sanitizePromptInput(value: unknown, maxLength = 8_000): string {
    if (typeof value !== 'string') return '';
    return stripTemplateTokens(stripControls(value)).slice(0, maxLength);
}

/**
 * Sanitize a chat message array (conversation history).
 * Each message's `content` is sanitized; `role` is whitelisted to
 * `user | assistant | system`.
 */
export function sanitizeMessages(
    messages: unknown,
): { role: 'user' | 'assistant' | 'system'; content: string }[] {
    if (!Array.isArray(messages)) return [];
    const allowed = new Set(['user', 'assistant', 'system']);
    return messages
        .filter((m): m is Record<string, unknown> => m !== null && typeof m === 'object')
        .map((m) => ({
            role: (allowed.has(String(m.role)) ? String(m.role) : 'user') as
                'user' | 'assistant' | 'system',
            content: sanitizePromptInput(m.content, 24_000),
        }))
        .filter((m) => m.content.trim().length > 0);
}
