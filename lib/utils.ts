/**
 * Robustly parses a JSON string.
 * If the string is valid JSON, returns the parsed object.
 * If the string is invalid JSON, returns the original string.
 * If the input is null or undefined, returns null.
 */
export function safeJsonParse(str: string | null | undefined): any {
    if (!str) return null;
    try {
        return JSON.parse(str);
    } catch (e) {
        // If parsing fails, return the string as is (likely legacy or manually edited field)
        return str;
    }
}
