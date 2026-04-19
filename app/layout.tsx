import type { Metadata } from 'next';
import Script from 'next/script';
import { Inter, Playfair_Display, JetBrains_Mono, Syne } from 'next/font/google';
import { ClerkProvider } from '@clerk/nextjs';
import './globals.css';
import { OfficeProvider } from '@/lib/OfficeContext';
import { GuideProvider } from '@/components/ui/ContextualGuide';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import {
  SITE_BRAND,
  SITE_KEYWORDS,
  SITE_META_DESCRIPTION,
  SITE_OG_DESCRIPTION,
  SITE_ORG,
  SITE_TITLE_DEFAULT,
  siteJsonLd,
  siteMetadataBase,
} from '@/lib/siteSeo';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

const playfair = Playfair_Display({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-playfair',
});

const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-jetbrains',
});

/** Landing / marketing wordmark — geometric display, not used app-wide */
const syne = Syne({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-brand-display',
  weight: ['400', '500', '600', '700', '800'],
});

const metadataBaseUrl = siteMetadataBase();

export const metadata: Metadata = {
  ...(metadataBaseUrl ? { metadataBase: metadataBaseUrl } : {}),
  title: {
    default: SITE_TITLE_DEFAULT,
    template: `%s · ${SITE_BRAND}`,
  },
  description: SITE_META_DESCRIPTION,
  keywords: [...SITE_KEYWORDS],
  authors: [{ name: SITE_ORG }],
  creator: SITE_ORG,
  publisher: SITE_ORG,
  robots: { index: true, follow: true },
  openGraph: {
    type: 'website',
    siteName: SITE_BRAND,
    title: SITE_TITLE_DEFAULT,
    description: SITE_OG_DESCRIPTION,
    ...(metadataBaseUrl ? { url: metadataBaseUrl.toString() } : {}),
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: SITE_TITLE_DEFAULT,
    description: SITE_OG_DESCRIPTION,
  },
  icons: {
    icon: [{ url: '/deepchox-mark.svg', type: 'image/svg+xml' }],
    apple: '/deepchox-mark.svg',
  },
  alternates: metadataBaseUrl
    ? { canonical: metadataBaseUrl.toString() }
    : undefined,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ld = siteJsonLd(metadataBaseUrl?.toString());

  return (
    <ClerkProvider>
      <html lang="en">
        <body
          className={`${inter.variable} ${playfair.variable} ${jetbrains.variable} ${syne.variable} font-sans bg-brand-bg text-brand-text antialiased overflow-x-hidden leading-normal tracking-normal`}
        >
          <Script
            id="site-json-ld"
            type="application/ld+json"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }}
          />
          <ErrorBoundary>
            <OfficeProvider>
              <GuideProvider>
                {children}
              </GuideProvider>
            </OfficeProvider>
          </ErrorBoundary>
        </body>
      </html>
    </ClerkProvider>
  );
}
