import { SignIn } from '@clerk/nextjs';
import { clerkPostAuthRedirectPath } from '@/lib/clerkAuthRedirect';
import { clerkLightAppearance } from '@/lib/clerkLightAppearance';

const appearance = {
  ...clerkLightAppearance,
  captcha: { theme: 'auto' as const, size: 'flexible' as const },
};

/** Embedded Clerk only — same model as the landing page (`/`). Requires keys + `NEXT_PUBLIC_SITE_URL` in Clerk allowlists. */
export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const afterAuth = clerkPostAuthRedirectPath(sp);

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-zinc-200/90 bg-white p-6 shadow-[0_24px_48px_-12px_rgba(0,0,0,0.12)]">
        <SignIn
          routing="path"
          path="/sign-in"
          signUpUrl="/sign-up"
          fallbackRedirectUrl={afterAuth}
          signUpFallbackRedirectUrl="/"
          oauthFlow="redirect"
          appearance={appearance}
        />
        {/*
          Mount next to the form — a global fixed #clerk-captcha sat at z-[10050] and could block Clerk’s UI / CAPTCHA.
        */}
        <div id="clerk-captcha" className="mt-4 flex min-h-[2.5rem] justify-center" />
      </div>
    </div>
  );
}
