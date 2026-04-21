'use client';

import { SignIn } from '@clerk/nextjs';
import { clerkLightAppearance } from '@/lib/clerkLightAppearance';

const landingClerkAppearance = {
  ...clerkLightAppearance,
  captcha: { theme: 'auto' as const, size: 'flexible' as const },
};

export interface LandingClerkAuthProps {
  className?: string;
}

/**
 * Clerk’s default sign-in / sign-up UI on the landing route (`/`): hash routing keeps the URL on `/`
 * while users switch between sign-in and sign-up (email, OAuth, etc.).
 */
export function LandingClerkAuth({ className }: LandingClerkAuthProps) {
  return (
    <div className={className}>
      <SignIn
        withSignUp
        routing="hash"
        signInUrl="/"
        signUpUrl="/"
        fallbackRedirectUrl="/"
        signUpFallbackRedirectUrl="/"
        oauthFlow="redirect"
        appearance={landingClerkAppearance}
      />
    </div>
  );
}
