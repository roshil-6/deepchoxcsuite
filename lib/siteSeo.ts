/**
 * Central SEO + marketing copy (metadata, landing hero, structured data).
 * Set NEXT_PUBLIC_SITE_URL in production for correct canonical & Open Graph URLs.
 */

export const SITE_BRAND = 'Deepchox';
export const SITE_ORG = 'northROSC LABS';

/** Primary title */
export const SITE_TITLE_DEFAULT = 'Deepchox — your complete AI co-founder';

/** Meta description */
export const SITE_META_DESCRIPTION =
    'Deepchox is your complete co-founder: research, a full working team for your venture, and real help to build — not just instructions, but actions. From northROSC LABS.';

/** Open Graph / social */
export const SITE_OG_DESCRIPTION =
    'Research, build your venture, and get a complete working team — actions, not just instructions. Your AI co-founder.';

/** Nav / footer / hero subheads */
export const SITE_TAGLINE_SHORT = 'Your complete co-founder — research, actions, a team for your venture';

export const SITE_HERO_H1 = 'Your complete co-founder for building your venture';

export const SITE_HERO_LEAD =
    'Research that helps you move forward. A full working team behind one venture — not only instructions, but actions you can use.';

/** Short italic-style line on the landing page */
export const SITE_PULL_QUOTE =
    'Not just instructions — actions. Research, a complete working team, and help to build your venture.';

export const SITE_KEYWORDS = [
    'AI co-founder',
    'build your venture',
    'startup research',
    'founder tools',
    'AI working team',
    'actions not instructions',
    'northROSC',
    'Deepchox',
    'venture building',
] as const;

export function siteMetadataBase(): URL | undefined {
    const raw = typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_SITE_URL?.trim() : undefined;
    if (!raw) return undefined;
    try {
        return new URL(raw.endsWith('/') ? raw.slice(0, -1) : raw);
    } catch {
        return undefined;
    }
}

export function siteJsonLd(baseUrl: string | undefined): Record<string, unknown> {
    const url = baseUrl ?? 'https://deepchox.app';
    return {
        '@context': 'https://schema.org',
        '@graph': [
            {
                '@type': 'SoftwareApplication',
                name: SITE_BRAND,
                applicationCategory: 'BusinessApplication',
                operatingSystem: 'Web',
                description: SITE_META_DESCRIPTION,
                offers: {
                    '@type': 'Offer',
                    price: '0',
                    priceCurrency: 'USD',
                    description: 'Founder tier free; Pro subscription available',
                },
                provider: { '@type': 'Organization', name: SITE_ORG, url },
                url,
            },
            {
                '@type': 'Organization',
                name: SITE_ORG,
                url,
                description: SITE_OG_DESCRIPTION,
                brand: { '@type': 'Brand', name: SITE_BRAND },
            },
        ],
    };
}
