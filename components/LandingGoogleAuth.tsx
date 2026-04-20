'use client';

import { useCallback, useState } from 'react';
import Link from 'next/link';
import { useClerk } from '@clerk/nextjs';
import { persistEnterWorkspace, type OauthReturnIntent } from '@/lib/workspacePersistence';

function GoogleMark({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

const pill =
  'inline-flex w-full min-w-0 items-center justify-center gap-2 rounded-full border border-white/18 bg-white/[0.08] px-4 py-2 font-sans text-[13px] font-semibold text-white shadow-[0_2px_16px_rgba(0,0,0,0.35)] transition hover:border-white/28 hover:bg-white/[0.12] disabled:pointer-events-none disabled:opacity-45 sm:w-auto sm:py-2.5 sm:text-[14px]';

export interface LandingGoogleAuthProps {
  /** Persisted before redirect so `/` restores workspace after OAuth (incl. Strict Mode remounts). */
  afterOAuth: OauthReturnIntent;
  className?: string;
  /** Show link to full Clerk sign-in (email, etc.). */
  showOtherOptions?: boolean;
}

export function LandingGoogleAuth({ afterOAuth, className, showOtherOptions }: LandingGoogleAuthProps) {
  const clerk = useClerk();
  const [busy, setBusy] = useState<'in' | 'up' | null>(null);

  const client = clerk.loaded ? clerk.client : undefined;
  const ready = Boolean(client);

  const runRedirect = useCallback(
    async (mode: 'in' | 'up') => {
      const c = clerk.client;
      if (!clerk.loaded || !c) return;
      const origin = window.location.origin;
      persistEnterWorkspace({ openNameVenture: afterOAuth.openNameVenture });
      setBusy(mode);
      try {
        /** Use classic SignIn/SignUp resources so redirect URLs match `<AuthenticateWithRedirectCallback />` (avoids sign_ins 400 from `sso()` on some instances). */
        const params = {
          strategy: 'oauth_google' as const,
          redirectUrl: `${origin}/sso-callback`,
          redirectUrlComplete: `${origin}/`,
        };
        if (mode === 'in') {
          await c.signIn.authenticateWithRedirect(params);
        } else {
          await c.signUp.authenticateWithRedirect(params);
        }
      } catch {
        setBusy(null);
      }
    },
    [afterOAuth, clerk.client, clerk.loaded]
  );

  return (
    <div className={className}>
      <div className="flex flex-col items-stretch justify-center gap-2.5 sm:flex-row sm:flex-wrap sm:justify-center">
        <button type="button" className={pill} disabled={!ready || busy !== null} onClick={() => void runRedirect('in')}>
          <GoogleMark className="h-[18px] w-[18px] shrink-0" />
          {busy === 'in' ? 'Redirecting…' : 'Log in with Google'}
        </button>
        <button type="button" className={pill} disabled={!ready || busy !== null} onClick={() => void runRedirect('up')}>
          <GoogleMark className="h-[18px] w-[18px] shrink-0" />
          {busy === 'up' ? 'Redirecting…' : 'Sign up with Google'}
        </button>
      </div>
      {showOtherOptions ? (
        <p className="mt-3 text-center font-sans text-[12px] text-zinc-400">
          <Link href="/sign-in" className="font-semibold text-zinc-300 underline-offset-4 hover:text-white hover:underline">
            Email, password, or other options
          </Link>
        </p>
      ) : null}
    </div>
  );
}
