'use client';

import { SignIn } from '@clerk/nextjs';
import { X } from 'lucide-react';
import { clerkGreyAppearance } from '@/lib/clerkGreyAppearance';

export interface LandingAuthModalProps {
  open: boolean;
  onClose: () => void;
}

/** Clerk auth embedded on `/` via hash routing — keeps users on the landing page until OAuth returns. */
export function LandingAuthModal({ open, onClose }: LandingAuthModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[240] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="landing-auth-title"
    >
      <button type="button" className="absolute inset-0 cursor-default" aria-label="Close" onClick={onClose} />
      <div
        className="relative z-10 max-h-[min(100dvh-2rem,900px)] w-full max-w-md overflow-y-auto rounded-2xl border border-zinc-600 bg-zinc-900/95 shadow-2xl backdrop-blur-sm"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-zinc-600/80 px-4 py-3">
          <h2 id="landing-auth-title" className="font-sans text-sm font-semibold text-zinc-100">
            Sign in or create account
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-100"
            aria-label="Close"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>
        <div className="px-2 py-4 sm:px-4">
          <SignIn
            withSignUp
            routing="hash"
            fallbackRedirectUrl="/"
            signUpFallbackRedirectUrl="/"
            oauthFlow="redirect"
            appearance={clerkGreyAppearance}
          />
        </div>
      </div>
    </div>
  );
}
