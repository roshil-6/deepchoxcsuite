/**
 * Central SEO + marketing copy (metadata, landing hero, structured data).
 * Set NEXT_PUBLIC_SITE_URL in production for correct canonical & Open Graph URLs.
 */

export const SITE_BRAND = 'Deepchox';
export const SITE_ORG = 'northROSC LABS';

/** Primary title */
/** Use ASCII separators in public strings so snippets never show UTF-8 mojibake (e.g. em dash â€"). */
export const SITE_TITLE_DEFAULT = 'Deepchox - your complete AI co-founder';

/** Meta description */
export const SITE_META_DESCRIPTION =
    'Deepchox is your complete co-founder: research, a full working team for your venture, and real help to build - not just instructions, but actions. From northROSC LABS.';

/** Open Graph / social */
export const SITE_OG_DESCRIPTION =
    'Research, build your venture, and get a complete working team - actions, not just instructions. Your AI co-founder.';

/** Nav / footer / hero subheads */
export const SITE_TAGLINE_SHORT =
    'Your complete co-founder - research, actions, a team for your venture';

export const SITE_HERO_H1 = 'Your complete co-founder for building your venture';

export const SITE_HERO_LEAD =
    'Research that helps you move forward. A full working team behind one venture - not only instructions, but actions you can use.';

/** Short italic-style line on the landing page */
export const SITE_PULL_QUOTE =
    'Not just instructions - actions. Research, a complete working team, and help to build your venture.';

export const SITE_KEYWORDS = [
    'AI co-founder',
    'virtual AI office',
    'AI venture workspace',
    'solo founder tools',
    'startup operating system',
    'build your venture',
    'startup research',
    'founder tools',
    'AI working team',
    'AI desk agents',
    'staff sync',
    'venture intelligence',
    'actions not instructions',
    'northROSC',
    'Deepchox',
    'venture building',
    'GPT Claude routing',
    'founder dashboard',
    'AI strategy memo',
    'Jarvis-style AI assistant',
] as const;

/** Relative path served by app/opengraph-image (PNG); resolved with metadataBase in layout. */
export const SITE_OG_IMAGE_PATH = '/opengraph-image';

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
    const url = (baseUrl ?? 'https://deepchox.app').replace(/\/$/, '');
    const orgId = `${url}#organization`;
    const logoUrl = `${url}/deepchox-mark.svg`;

    return {
        '@context': 'https://schema.org',
        '@graph': [
            {
                '@type': 'WebSite',
                '@id': `${url}#website`,
                url,
                name: SITE_BRAND,
                description: SITE_META_DESCRIPTION,
                inLanguage: 'en-US',
                publisher: { '@id': orgId },
                potentialAction: {
                    '@type': 'ReadAction',
                    target: [`${url}/`, `${url}/guide`],
                },
            },
            {
                '@type': 'SoftwareApplication',
                '@id': `${url}#software`,
                name: SITE_BRAND,
                applicationCategory: 'BusinessApplication',
                operatingSystem: 'Web',
                description: SITE_META_DESCRIPTION,
                url,
                offers: {
                    '@type': 'Offer',
                    price: '0',
                    priceCurrency: 'USD',
                    description: 'Founder tier free; Pro subscription available',
                },
                provider: { '@id': orgId },
                publisher: { '@id': orgId },
            },
            {
                '@type': 'Organization',
                '@id': orgId,
                name: SITE_ORG,
                url,
                logo: {
                    '@type': 'ImageObject',
                    url: logoUrl,
                },
                description: SITE_OG_DESCRIPTION,
                brand: { '@type': 'Brand', name: SITE_BRAND },
            },
        ],
    };
}
