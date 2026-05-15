import type { MetadataRoute } from 'next';
import { SITE_BRAND, SITE_META_DESCRIPTION, siteMetadataBase } from '@/lib/siteSeo';

const FALLBACK_ORIGIN = 'https://deepchox.app';

export default function manifest(): MetadataRoute.Manifest {
  const origin = siteMetadataBase()?.origin ?? FALLBACK_ORIGIN;
  const base = origin.replace(/\/$/, '');

  return {
    name: SITE_BRAND,
    short_name: SITE_BRAND,
    description: SITE_META_DESCRIPTION,
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait-primary',
    background_color: '#030304',
    theme_color: '#0c0c0e',
    lang: 'en-US',
    icons: [
      {
        src: `${base}/deepchox-mark.svg`,
        type: 'image/svg+xml',
        sizes: 'any',
        purpose: 'any',
      },
    ],
  };
}
