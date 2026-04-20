'use client';

import { SignUp } from '@clerk/nextjs';
import { LandingPage } from '@/components/LandingPage';
import { clerkLightAppearance } from '@/lib/clerkLightAppearance';

/**
 * Sign-up floats above a non-interactive preview of the landing / app shell
 * so the interface stays visible behind a light frosted overlay.
 */
export default function SignUpPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-white">
      {/* App / marketing surface (dimmed, no pointer events) */}
      <div
        className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
        aria-hidden
      >
        <div className="h-full w-full origin-top scale-[0.96] opacity-[0.42] saturate-[0.85]">
          <LandingPage onContinueGuest={() => {}} />
        </div>
      </div>

      {/* Frosted layer + floating auth card */}
      <div className="relative z-10 flex min-h-screen items-center justify-center bg-white/55 px-4 py-10 backdrop-blur-[10px]">
        <div className="w-full max-w-md rounded-2xl border border-zinc-200/95 bg-white/98 p-6 shadow-[0_28px_56px_-16px_rgba(0,0,0,0.18),0_0_0_1px_rgba(0,0,0,0.04)]">
          <SignUp
            routing="path"
            path="/sign-up"
            signInUrl="/sign-in"
            fallbackRedirectUrl="/"
            signInFallbackRedirectUrl="/"
            oauthFlow="redirect"
            appearance={clerkLightAppearance}
          />
        </div>
      </div>
    </div>
  );
}
