import { SignUp } from '@clerk/nextjs';
import { clerkEmbeddedFallbackRedirect } from '@/lib/clerkAuthRedirect';
import { clerkLightAppearance } from '@/lib/clerkLightAppearance';

const appearance = {
  ...clerkLightAppearance,
  captcha: { theme: 'auto' as const, size: 'flexible' as const },
};

/** Embedded Clerk only — pairs with `/sign-in`. */
export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const afterAuth = clerkEmbeddedFallbackRedirect(sp);

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-zinc-200/90 bg-white p-6 shadow-[0_24px_48px_-12px_rgba(0,0,0,0.12)]">
        <SignUp
          routing="path"
          path="/sign-up"
          signInUrl="/sign-in"
          fallbackRedirectUrl={afterAuth}
          signInFallbackRedirectUrl="/"
          oauthFlow="redirect"
          appearance={appearance}
        />
      </div>
    </div>
  );
}
