import { SignUp } from '@clerk/nextjs';
import { clerkGreyAppearance } from '@/lib/clerkGreyAppearance';

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-zinc-600/80 bg-zinc-900/95 p-6 shadow-2xl backdrop-blur-sm">
        <SignUp
          routing="path"
          path="/sign-up"
          signInUrl="/sign-in"
          fallbackRedirectUrl="/"
          signInFallbackRedirectUrl="/"
          oauthFlow="redirect"
          appearance={clerkGreyAppearance}
        />
      </div>
    </div>
  );
}
