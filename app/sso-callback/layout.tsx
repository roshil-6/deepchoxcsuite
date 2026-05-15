import type { Metadata } from 'next';

/** OAuth redirect shell — keep out of search alongside sign-in/up. */
export const metadata: Metadata = {
  robots: { index: false, follow: true },
};

export default function SsoCallbackLayout({ children }: { children: React.ReactNode }) {
  return children;
}
