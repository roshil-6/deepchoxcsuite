import type { Metadata } from 'next';

/** Thin auth shells — avoid competing with marketing URLs in search. */
export const metadata: Metadata = {
  robots: { index: false, follow: true },
};

export default function SignInLayout({ children }: { children: React.ReactNode }) {
  return children;
}
