'use client';

import { GoogleIcon } from '@/components/auth/GoogleIcon';

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

const googleBtn =
  'inline-flex min-h-[3rem] w-full items-center justify-center gap-3 rounded-xl border border-zinc-200 bg-white px-4 font-sans text-[15px] font-semibold text-zinc-800 shadow-[0_1px_3px_rgba(0,0,0,0.08)] transition hover:border-zinc-300 hover:bg-zinc-50 hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)]';

const emailSecondary =
  'inline-flex min-h-[2.75rem] w-full items-center justify-center rounded-xl border border-white/10 bg-white/08 px-4 font-sans text-[14px] font-semibold text-white shadow-sm transition hover:bg-white/08';

/**
 * Plain `<a href>` forces a real browser navigation off the `/` client shell.
 * Primary row matches common â€œContinue with Googleâ€ affordance; Clerk on `/sign-in` runs the real OAuth.
 */
export function LandingClerkAuth({ className }: LandingClerkAuthProps) {
  const signInUrl = LANDING_SIGN_IN_HREF;
  const signUpUrl = LANDING_SIGN_UP_HREF;

  return (
    <div className={className}>
      <p className="mb-3 text-center font-sans text-[13px] leading-snug text-zinc-600">
        Choose how you want to continue â€” Google, other providers, or email on the secure sign-in page.
      </p>
      <div className="flex flex-col gap-2.5">
        <a href={signInUrl} className={googleBtn}>
          <GoogleIcon className="h-5 w-5" />
          <span>Continue with Google</span>
        </a>
        <div className="relative py-1">
          <div className="absolute inset-0 flex items-center" aria-hidden>
            <div className="w-full border-t border-zinc-200" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-white px-2 font-sans text-[11px] font-medium uppercase tracking-wider text-zinc-400">
              or
            </span>
          </div>
        </div>
        <a href={signInUrl} className={emailSecondary}>
          Sign in with email
        </a>
        <a
          href={signUpUrl}
          className="inline-flex min-h-[2.5rem] w-full items-center justify-center rounded-xl border border-zinc-200 bg-zinc-50 px-4 font-sans text-[13px] font-semibold text-zinc-700 transition hover:bg-zinc-100"
        >
          Create account
        </a>
      </div>
      <p className="mt-3 text-center font-sans text-[11px] leading-snug text-zinc-500">
        Prefer a direct link?{' '}
        <a href={signInUrl} className="font-semibold text-white/70 underline-offset-2 hover:underline">
          Open sign-in
        </a>
      </p>
    </div>
  );
}

