import type { MetadataRoute } from 'next';
import { siteMetadataBase } from '@/lib/siteSeo';

const FALLBACK_ORIGIN = 'https://deepchox.app';

export default function sitemap(): MetadataRoute.Sitemap {
    const origin = siteMetadataBase()?.origin ?? FALLBACK_ORIGIN;
    const base = origin.replace(/\/$/, '');
    const lastModified = new Date();

    return [
        {
            url: `${base}/`,
            lastModified,
            changeFrequency: 'weekly',
            priority: 1,
        },
        {
            url: `${base}/guide`,
            lastModified,
            changeFrequency: 'monthly',
            priority: 0.8,
        },
    ];
}
