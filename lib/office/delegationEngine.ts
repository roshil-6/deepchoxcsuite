/**
 * Maps issue classes to owning desks (human-readable labels).
 * Extend the registry for new routing without changing callers.
 */

export type OfficeIssueClass =
    | 'pricing'
    | 'technical'
    | 'growth'
    | 'finance'
    | 'market'
    | 'legal'
    | 'people'
    | 'generic';

const REGISTRY: Record<OfficeIssueClass, string[]> = {
    pricing: ['CFO', 'CMO', 'CEO'],
    technical: ['CTO', 'PM'],
    growth: ['CEO', 'CMO'],
    finance: ['CFO', 'CEO'],
    market: ['CSO', 'CMO', 'CEO'],
    legal: ['CEO', 'CFO'],
    people: ['CEO', 'PM'],
    generic: ['Chief of Staff', 'CEO'],
};

export function assignDeskOwnership(issueType: OfficeIssueClass | string): string[] {
    const key = issueType in REGISTRY ? (issueType as OfficeIssueClass) : 'generic';
    return [...REGISTRY[key]];
}

export function inferIssueClassFromText(text: string): OfficeIssueClass {
    const t = text.toLowerCase();
    if (/\b(pricing|price|margin|discount|sku)\b/.test(t)) return 'pricing';
    if (/\b(debt|tech|engineering|onboarding|latency|bug|infra|api)\b/.test(t)) return 'technical';
    if (/\b(growth|funnel|acquisition|ads|seo|campaign)\b/.test(t)) return 'growth';
    if (/\b(runway|burn|cash|revenue|forecast|p&l|budget)\b/.test(t)) return 'finance';
    if (/\b(competitor|market|intel|segment|regulation)\b/.test(t)) return 'market';
    if (/\b(legal|contract|ip|compliance|gdpr)\b/.test(t)) return 'legal';
    if (/\b(hire|team|culture|people|org)\b/.test(t)) return 'people';
    return 'generic';
}
