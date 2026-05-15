import type { Metadata } from 'next';
import Script from 'next/script';
import {
  GUIDE_FAQ_ITEMS,
  GUIDE_META_DESCRIPTION,
  GUIDE_TITLE,
  stripMarkdownBoldForSchema,
} from '@/lib/guideContent';
import { SITE_BRAND, SITE_KEYWORDS, SITE_OG_IMAGE_PATH } from '@/lib/siteSeo';

const guideKeywords = [
  ...SITE_KEYWORDS,
  'Deepchox guide',
  'AI virtual office',
  'founder workspace',
  'Claude GPT dual stack',
  'venture desks',
  'staff sync AI',
];

export const metadata: Metadata = {
  title: GUIDE_TITLE,
  description: GUIDE_META_DESCRIPTION,
  keywords: [...guideKeywords],
  robots: { index: true, follow: true },
  alternates: {
    canonical: '/guide',
  },
  openGraph: {
    title: `${GUIDE_TITLE} · ${SITE_BRAND}`,
    description: GUIDE_META_DESCRIPTION,
    url: '/guide',
    type: 'article',
    siteName: SITE_BRAND,
    locale: 'en_US',
    images: [
      {
        url: SITE_OG_IMAGE_PATH,
        width: 1200,
        height: 630,
        alt: GUIDE_TITLE,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${GUIDE_TITLE} · ${SITE_BRAND}`,
    description: GUIDE_META_DESCRIPTION,
    images: [SITE_OG_IMAGE_PATH],
  },
};

function guideFaqJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: GUIDE_FAQ_ITEMS.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: {
        '@type': 'Answer',
        text: stripMarkdownBoldForSchema(item.a),
      },
    })),
  };
}

export default function GuideLayout({ children }: { children: React.ReactNode }) {
  const ld = guideFaqJsonLd();

  return (
    <>
      <Script
        id="guide-faq-jsonld"
        type="application/ld+json"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }}
      />
      {children}
    </>
  );
}
