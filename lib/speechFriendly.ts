/**
 * Normalizes text for browser speech synthesis so it sounds closer to a person
 * explaining things, not reading a database or markdown dump.
 */

const ABBREVIATIONS: [RegExp, string][] = [
    [/\bURLs?\b/gi, 'links'],
    [/\bJSON\b/gi, 'your saved venture data'],
    [/\bUX\b/gi, 'user experience'],
    [/\bUI\b/gi, 'interface'],
    [/\bMVP\b/gi, 'minimum viable product'],
    [/\bGTM\b/gi, 'go-to-market'],
    [/\bKPIs?\b/gi, 'key metrics'],
    [/\bROI\b/gi, 'return on investment'],
    [/\bCAC\b/gi, 'customer acquisition cost'],
    [/\bLTV\b/gi, 'lifetime value'],
    [/\bB2B\b/gi, 'business to business'],
    [/\bB2C\b/gi, 'business to consumer'],
    [/\bSaaS\b/gi, 'software as a service'],
    [/\bARR\b/gi, 'annual recurring revenue'],
    [/\bMRR\b/gi, 'monthly recurring revenue'],
    [/\bPMF\b/gi, 'product market fit'],
    [/\bOKRs?\b/gi, 'objectives and key results'],
];

function expandSnakeCaseWords(s: string): string {
    return s.replace(/\b[a-z][a-z0-9]*(?:_[a-z][a-z0-9]*)+\b/g, (w) => w.replace(/_/g, ' '));
}

function stripUrlsAndIds(s: string): string {
    return s
        .replace(/\bhttps?:\/\/[^\s)\]]+/gi, '')
        .replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, '')
        .replace(/@[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}\b/gi, 'an email address');
}

function softenListsAndTables(s: string): string {
    let t = s.replace(/\|/g, ', ');
    t = t.replace(/(?:^|\n)\s*[-*•]\s+/gm, '. ');
    t = t.replace(/\n{2,}/g, '. ');
    t = t.replace(/\n/g, ', ');
    return t;
}

/**
 * Strips markdown-ish noise, expands common abbreviations, and adds light punctuation
 * so the synthesizer can breathe between ideas.
 */
export function speechFriendlyText(raw: string, options?: { maxLength?: number }): string {
    const maxLength = options?.maxLength ?? 12_000;
    if (!raw?.trim()) return '';

    let s = raw
        .replace(/\r\n/g, '\n')
        .replace(/\*\*([^*]+)\*\*/g, '$1')
        .replace(/\*([^*]+)\*/g, '$1')
        .replace(/^#{1,6}\s+/gm, '')
        .replace(/`{1,3}[^`]*`{1,3}/g, ' ')
        .replace(/\[[^\]]*]\([^)]*\)/g, ' ')
        .replace(/^---+\s*$/gm, ' ')
        .trim();

    s = softenListsAndTables(s);
    s = stripUrlsAndIds(s);

    s = s
        .replace(/\s+—\s+/g, ', ')
        .replace(/\s+/g, ' ')
        .trim();

    s = expandSnakeCaseWords(s);

    s = s
        .replace(/\b(e\.?g\.?|eg\.)\s/gi, 'for example, ')
        .replace(/\b(i\.?e\.?|ie\.)\s/gi, 'that is, ')
        .replace(/\bet\.?\s*c\.?\b/gi, 'and so on')
        .replace(/(\d+(?:\.\d+)?)\s*%/g, '$1 percent')
        .replace(/&/g, ' and ')
        .replace(/\s+/g, ' ')
        .trim();

    for (const [re, rep] of ABBREVIATIONS) {
        s = s.replace(re, rep);
    }

    s = s
        .replace(/\s*([,.;:])\s*/g, '$1 ')
        .replace(/\s{2,}/g, ' ')
        .replace(/\s+([.,])/g, '$1')
        .replace(/([,.])\s*([,.])/g, '$1')
        .trim();

    if (s.length > maxLength) {
        s = s.slice(0, maxLength).replace(/\s+\S*$/, '');
    }

    return s;
}
