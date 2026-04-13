import type { Metadata } from 'next';
import { Inter, Playfair_Display, JetBrains_Mono, Syne } from 'next/font/google';
import './globals.css';
import { OfficeProvider } from '@/lib/OfficeContext';
import { GuideProvider } from '@/components/ui/ContextualGuide';

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

export const metadata: Metadata = {
  title: 'Deepchox — northROSC LABS',
  description:
    'northROSC LABS presents Deepchox — AI-powered team for founders. Strategy, product, finance, market, and GTM roles as teammates on one venture record.',
  icons: {
    icon: [{ url: '/deepchox-mark.svg', type: 'image/svg+xml' }],
    apple: '/deepchox-mark.svg',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${playfair.variable} ${jetbrains.variable} ${syne.variable} font-sans bg-brand-bg text-brand-text antialiased overflow-x-hidden leading-normal tracking-normal`}
      >
        <OfficeProvider>
          <GuideProvider>
            {children}
          </GuideProvider>
        </OfficeProvider>
      </body>
    </html>
  );
}
