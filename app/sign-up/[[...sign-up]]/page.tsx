import { redirect } from 'next/navigation';
import { SignUp } from '@clerk/nextjs';
import { clerkHostedAuthRedirect } from '@/lib/clerkAccountPortal';
import { clerkForceEmbeddedAuth } from '@/lib/clerkEmbeddedAuth';
import { clerkLightAppearance } from '@/lib/clerkLightAppearance';

const clerkCaptchaAppearance = {
  ...clerkLightAppearance,
  captcha: { theme: 'auto' as const, size: 'flexible' as const },
};

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (clerkForceEmbeddedAuth()) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white px-4 py-10">
        <div className="w-full max-w-md rounded-2xl border border-zinc-200/90 bg-white p-6 shadow-[0_24px_48px_-12px_rgba(0,0,0,0.12)]">
          <SignUp
            routing="path"
            path="/sign-up"
            signInUrl="/sign-in"
            fallbackRedirectUrl="/"
            signInFallbackRedirectUrl="/"
            oauthFlow="redirect"
            appearance={clerkCaptchaAppearance}
          />
        </div>
      </div>
    );
  }

  const sp = await searchParams;
  const url = clerkHostedAuthRedirect('/sign-up', sp);
  if (!url) {
    return (
      <div className="mx-auto max-w-lg px-6 py-16 font-sans text-sm text-zinc-700">
        <h1 className="text-lg font-semibold text-zinc-900">Sign-up is not configured</h1>
        <p className="mt-3 leading-relaxed">
          Set{' '}
          <code className="rounded bg-zinc-100 px-1.5 py-0.5 text-[13px]">
            NEXT_PUBLIC_CLERK_ACCOUNT_PORTAL_ORIGIN
          </code>{' '}
          to your Clerk Frontend API URL (see Clerk Dashboard → API Keys).
        </p>
        <p className="mt-4 text-zinc-600">
          Or set{' '}
          <code className="rounded bg-zinc-100 px-1.5 py-0.5 text-[13px]">
            NEXT_PUBLIC_CLERK_FORCE_EMBEDDED_AUTH=1
          </code>{' '}
          to sign up on this domain instead of Account Portal.
        </p>
      </div>
    );
  }
  redirect(url);
}
