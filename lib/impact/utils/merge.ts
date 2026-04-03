/** Deduplicate strings, trim, drop empties, preserve first-seen order. */
export function mergeUniqueStrings(items: string[]): string[] {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const raw of items) {
        const s = typeof raw === 'string' ? raw.trim() : '';
        if (!s || seen.has(s)) continue;
        seen.add(s);
        out.push(s);
    }
    return out;
}
