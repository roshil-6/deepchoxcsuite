import type { MetadataRoute } from 'next';
import { siteMetadataBase } from '@/lib/siteSeo';

const FALLBACK_ORIGIN = 'https://deepchox.app';

export default function robots(): MetadataRoute.Robots {
    const origin = siteMetadataBase()?.origin ?? FALLBACK_ORIGIN;
    const base = origin.replace(/\/$/, '');

    return {
        rules: [
            {
                userAgent: '*',
                allow: '/',
                disallow: ['/api/', '/sign-in', '/sign-up', '/sso-callback'],
            },
        ],
        sitemap: `${base}/sitemap.xml`,
    };
}
