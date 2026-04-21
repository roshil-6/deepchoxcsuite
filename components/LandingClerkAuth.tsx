'use client';

export interface LandingClerkAuthProps {
  className?: string;
}

/** After OAuth/email verification, send users back here so session + workspace persistence line up. */
const AFTER_AUTH_PATH = '/';

function authHref(path: '/sign-in' | '/sign-up') {
  const q = new URLSearchParams({ redirect_url: AFTER_AUTH_PATH });
  return `${path}?${q.toString()}`;
}

/** Use for plain `<a href>` anywhere on the landing page (avoid `next/link` from the `/` client tree). */
export const LANDING_SIGN_IN_HREF = authHref('/sign-in');
export const LANDING_SIGN_UP_HREF = authHref('/sign-up');

const btnPrimary =
  'inline-flex min-h-[2.75rem] w-full items-center justify-center rounded-xl border border-zinc-300 bg-white px-4 font-sans text-[15px] font-semibold text-zinc-900 shadow-sm transition hover:bg-zinc-50';
const btnSecondary =
  'inline-flex min-h-[2.75rem] w-full items-center justify-center rounded-xl border border-violet-600/90 bg-violet-600 px-4 font-sans text-[15px] font-semibold text-white shadow-sm transition hover:bg-violet-500';

/**
 * Plain `<a href>` (not `next/link`) forces a real browser navigation off the `/` client shell.
 * In Next 16 App Router, `Link` soft navigation from the home `page.tsx` client tree can fail to
 * change routes and look like a pointless reload.
 * `/sign-in` and `/sign-up` use Clerk path routing — OAuth lives there.
 */
export function LandingClerkAuth({ className }: LandingClerkAuthProps) {
  const signInUrl = LANDING_SIGN_IN_HREF;
  const signUpUrl = LANDING_SIGN_UP_HREF;

  return (
    <div className={className}>
      <p className="mb-3 text-center font-sans text-[13px] leading-snug text-zinc-600">
        Sign in with Google or email on the next screen — everything your project has enabled in Clerk appears
        there.
      </p>
      <div className="flex flex-col gap-2.5">
        <a href={signInUrl} className={btnPrimary}>
          Sign in
        </a>
        <a href={signUpUrl} className={btnSecondary}>
          Create account
        </a>
      </div>
      <p className="mt-3 text-center font-sans text-[11px] leading-snug text-zinc-500">
        Trouble loading buttons? Open{' '}
        <a href={signInUrl} className="font-semibold text-violet-700 underline-offset-2 hover:underline">
          /sign-in
        </a>{' '}
        directly.
      </p>
    </div>
  );
}
