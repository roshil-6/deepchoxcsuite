import { SignIn } from '@clerk/nextjs';
import { clerkLightAppearance } from '@/lib/clerkLightAppearance';

/** Path-based routing + redirect OAuth avoids broken return URLs and silent popup failures. */
export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-zinc-200/90 bg-white p-6 shadow-[0_24px_48px_-12px_rgba(0,0,0,0.12)]">
        <SignIn
          routing="path"
          path="/sign-in"
          signUpUrl="/sign-up"
          fallbackRedirectUrl="/"
          signUpFallbackRedirectUrl="/"
          oauthFlow="redirect"
          appearance={clerkLightAppearance}
        />
      </div>
    </div>
  );
}
