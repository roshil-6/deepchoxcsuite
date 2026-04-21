'use client';

import Link from 'next/link';

export interface LandingClerkAuthProps {
  className?: string;
}

/** After OAuth/email verification, send users back here so session + workspace persistence line up. */
const AFTER_AUTH_PATH = '/';

function authHref(path: '/sign-in' | '/sign-up') {
  const q = new URLSearchParams({ redirect_url: AFTER_AUTH_PATH });
  return `${path}?${q.toString()}`;
}

const btnPrimary =
  'inline-flex min-h-[2.75rem] w-full items-center justify-center rounded-xl border border-zinc-300 bg-white px-4 font-sans text-[15px] font-semibold text-zinc-900 shadow-sm transition hover:bg-zinc-50';
const btnSecondary =
  'inline-flex min-h-[2.75rem] w-full items-center justify-center rounded-xl border border-violet-600/90 bg-violet-600 px-4 font-sans text-[15px] font-semibold text-white shadow-sm transition hover:bg-violet-500';

/**
 * Do not embed `<SignIn />` on `/`: it fights `ClerkProvider` (`signInUrl="/sign-in"`) and often yields a blank
 * card or broken OAuth. The dedicated `/sign-in` and `/sign-up` routes use path routing and match Clerk’s model.
 */
export function LandingClerkAuth({ className }: LandingClerkAuthProps) {
  return (
    <div className={className}>
      <p className="mb-3 text-center font-sans text-[13px] leading-snug text-zinc-600">
        Sign in with Google or email on the next screen — everything your project has enabled in Clerk appears
        there.
      </p>
      <div className="flex flex-col gap-2.5">
        <Link href={authHref('/sign-in')} className={btnPrimary}>
          Sign in
        </Link>
        <Link href={authHref('/sign-up')} className={btnSecondary}>
          Create account
        </Link>
      </div>
      <p className="mt-3 text-center font-sans text-[11px] leading-snug text-zinc-500">
        Trouble loading buttons? Open{' '}
        <Link href={authHref('/sign-in')} className="font-semibold text-violet-700 underline-offset-2 hover:underline">
          /sign-in
        </Link>{' '}
        directly.
      </p>
    </div>
  );
}
