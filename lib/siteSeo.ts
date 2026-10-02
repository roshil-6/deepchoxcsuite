/**
 * Central SEO + copy for CLAPFETCH by Northrosc.
 * Clean, human, consumer media utility.
 */

export const SITE_BRAND = 'Clapfetch';
export const SITE_ORG = 'Northrosc';
export const SITE_DOMAIN = 'northrosc.com';

/** Primary title */
export const SITE_TITLE_DEFAULT = 'Clapfetch — Take what you need. Leave the rest.';

/** Meta description */
export const SITE_META_DESCRIPTION =
  'Import or upload media. Find the moment you want, cut it, turn it into audio, create a ringtone, add subtitles or save it for later. A Northrosc product.';

/** Open Graph / social */
export const SITE_OG_DESCRIPTION =
  'Cut media, extract audio, make ringtones, find moments, generate subtitles, and organize your music library with Clapfetch.';

/** Nav / footer / hero subheads */
export const SITE_TAGLINE_SHORT = 'by Northrosc';

export const SITE_HERO_H1 = 'Take what you need. Leave the rest.';

export const SITE_HERO_LEAD =
  'Import or upload media. Find the moment you want, cut it, turn it into audio, create a ringtone, add subtitles or save it for later.';

export const SITE_PULL_QUOTE =
  'Keep the part that matters.';

export const SITE_KEYWORDS = [
  'Clapfetch',
  'Northrosc',
  'cut video',
  'extract audio',
  'make ringtone',
  'find moment',
  'generate subtitles',
  'media utility',
  'video trimmer',
  'audio extractor',
  'clean media tool',
] as const;

export const SITE_OG_IMAGE_PATH = '/opengraph-image';

export function siteMetadataBase(): URL | undefined {
  const url = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!url) return new URL('https://northrosc.com');
  try {
    return new URL(url);
  } catch {
    return new URL('https://northrosc.com');
  }
}

export function siteJsonLd(baseUrl?: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Clapfetch',
    author: {
      '@type': 'Organization',
      name: 'Northrosc',
      url: 'https://northrosc.com',
    },
    applicationCategory: 'MultimediaApplication',
    operatingSystem: 'Any',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
    description: SITE_META_DESCRIPTION,
    url: baseUrl || 'https://northrosc.com',
  };
}
