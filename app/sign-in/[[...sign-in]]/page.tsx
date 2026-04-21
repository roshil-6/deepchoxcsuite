import { SignIn } from '@clerk/nextjs';
import { clerkPostAuthRedirectPath } from '@/lib/clerkAuthRedirect';
import { clerkLightAppearance } from '@/lib/clerkLightAppearance';
import { GoogleIcon } from '@/components/auth/GoogleIcon';

const appearance = {
  ...clerkLightAppearance,
  captcha: { theme: 'auto' as const, size: 'flexible' as const },
};

/** Embedded Clerk only — path routing. Requires keys + `NEXT_PUBLIC_SITE_URL` in Clerk allowlists. */
export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const afterAuth = clerkPostAuthRedirectPath(sp);

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0c0c0e] px-4 py-10">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        aria-hidden
        style={{
          background:
            'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(45,212,191,0.12), transparent), radial-gradient(ellipse 60% 40% at 100% 100%, rgba(124,58,237,0.08), transparent)',
        }}
      />
      <div className="relative w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5 shadow-lg backdrop-blur-sm">
            <GoogleIcon className="h-7 w-7" />
          </div>
          <h1 className="mt-4 font-sans text-xl font-bold tracking-tight text-white">Welcome back</h1>
          <p className="mt-1.5 font-sans text-[14px] text-zinc-400">
            Sign in with Google or email — your Clerk providers appear below.
          </p>
        </div>
        <div className="rounded-2xl border border-zinc-700/60 bg-white p-6 shadow-[0_24px_64px_rgba(0,0,0,0.45)]">
          <SignIn
            routing="path"
            path="/sign-in"
            signUpUrl="/sign-up"
            fallbackRedirectUrl={afterAuth}
            signUpFallbackRedirectUrl="/"
            oauthFlow="redirect"
            appearance={appearance}
          />
          <div id="clerk-captcha" className="mt-4 flex min-h-[2.5rem] justify-center" />
        </div>
      </div>
    </div>
  );
}
