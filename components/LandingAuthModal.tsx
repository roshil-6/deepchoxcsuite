'use client';

import { X } from 'lucide-react';
import { LandingClerkAuth } from '@/components/LandingClerkAuth';

export interface LandingAuthModalProps {
  open: boolean;
  onClose: () => void;
}

/** Clerk default auth while user is in the workspace shell and must sign in (e.g. new venture). */
export function LandingAuthModal({ open, onClose }: LandingAuthModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[240] flex items-center justify-center bg-[#0c0c0e]/90 p-3 backdrop-blur-sm sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="landing-auth-title"
    >
      <button type="button" className="absolute inset-0 cursor-default" aria-label="Close" onClick={onClose} />
      <div
        className="relative z-10 max-h-[min(92dvh,52rem)] w-full max-w-[26rem] overflow-y-auto rounded-2xl border border-zinc-200 bg-white shadow-[0_24px_48px_rgba(0,0,0,0.35)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-zinc-200 px-3 py-2.5 sm:px-4">
          <h2 id="landing-auth-title" className="font-sans text-[13px] font-semibold text-zinc-900">
            Sign in or create account
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
            aria-label="Close"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>
        <div className="px-3 py-3 sm:px-4 sm:pb-4">
          <LandingClerkAuth />
        </div>
      </div>
    </div>
  );
}
