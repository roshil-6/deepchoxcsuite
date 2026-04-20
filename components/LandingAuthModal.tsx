'use client';

import { SignIn } from '@clerk/nextjs';
import { X } from 'lucide-react';
import { clerkGreyAppearance } from '@/lib/clerkGreyAppearance';
import { clerkEmbeddedSignInProps } from '@/lib/clerkEmbeddedSignInProps';

export interface LandingAuthModalProps {
  open: boolean;
  onClose: () => void;
}

/** Clerk auth embedded on `/` via hash routing — keeps users on the landing page until OAuth returns. */
export function LandingAuthModal({ open, onClose }: LandingAuthModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[240] flex items-center justify-center bg-[#0c0c0e] p-3 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="landing-auth-title"
    >
      <button type="button" className="absolute inset-0 cursor-default" aria-label="Close" onClick={onClose} />
      <div
        className="relative z-10 max-h-[min(92dvh,52rem)] w-full max-w-[24rem] overflow-y-auto rounded-xl border border-zinc-600 bg-zinc-950 shadow-[0_16px_48px_rgba(0,0,0,0.65)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-zinc-700 px-3 py-2.5 sm:px-4">
          <h2 id="landing-auth-title" className="font-sans text-[13px] font-semibold text-zinc-100">
            Sign in or create account
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-100"
            aria-label="Close"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>
        <div className="bg-zinc-900 px-3 py-3 sm:px-4 sm:pb-4">
          <SignIn {...clerkEmbeddedSignInProps} appearance={clerkGreyAppearance} />
        </div>
      </div>
    </div>
  );
}
