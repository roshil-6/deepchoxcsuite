export type PricingRegion = 'IN' | 'INTL';

/** Build-time / public env override: `NEXT_PUBLIC_PRICING_REGION=IN` or `INTL`. */
export function getPricingRegionFromEnv(): PricingRegion | null {
    const raw = typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_PRICING_REGION?.trim().toUpperCase() : undefined;
    if (raw === 'IN' || raw === 'INDIA') return 'IN';
    if (raw === 'INTL' || raw === 'US' || raw === 'USD' || raw === 'ROW') return 'INTL';
    return null;
}

/** Browser heuristics when env is unset (until auth provides country). */
export function detectPricingRegionClient(): PricingRegion {
    const env = getPricingRegionFromEnv();
    if (env) return env;
    if (typeof window === 'undefined') return 'INTL';
    try {
        const lang = navigator.language?.toLowerCase() ?? '';
        if (lang === 'en-in' || lang.startsWith('en-in')) return 'IN';
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone ?? '';
        if (tz === 'Asia/Kolkata' || tz === 'Asia/Calcutta') return 'IN';
    } catch {
        /* noop */
    }
    return 'INTL';
}
