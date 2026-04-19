import { SignIn } from '@clerk/nextjs';
import { clerkGreyAppearance } from '@/lib/clerkGreyAppearance';

/** Path-based routing + redirect OAuth avoids broken return URLs and silent popup failures. */
export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-zinc-600/80 bg-zinc-900/95 p-6 shadow-2xl backdrop-blur-sm">
        <SignIn
          routing="path"
          path="/sign-in"
          signUpUrl="/sign-up"
          fallbackRedirectUrl="/"
          signUpFallbackRedirectUrl="/"
          oauthFlow="redirect"
          appearance={clerkGreyAppearance}
        />
      </div>
    </div>
  );
}
