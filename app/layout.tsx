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
    icon: [
      { url: '/deepchox-mark.svg', type: 'image/svg+xml', sizes: 'any' },
    ],
    shortcut: '/deepchox-mark.svg',
    apple: [{ url: '/deepchox-mark.svg', type: 'image/svg+xml', sizes: '180x180' }],
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
          {/*
            Single mount for Clerk Smart CAPTCHA (Turnstile) when bot protection is enabled.
            Required on `/` (Google sign-up/in) as well as /sign-in and /sign-up — one id per document.
            Placed bottom-left so it does not cover the Dexo FAB (bottom-right).
          */}
          <div
            id="clerk-captcha"
            className="fixed bottom-20 left-1/2 z-[10050] flex w-[min(100vw-2rem,24rem)] min-h-[2.5rem] -translate-x-1/2 justify-center px-2 max-sm:bottom-24"
          />
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
