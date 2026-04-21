import { redirect } from 'next/navigation';
import { SignIn } from '@clerk/nextjs';
import { clerkHostedAuthRedirect } from '@/lib/clerkAccountPortal';
import { clerkForceEmbeddedAuth } from '@/lib/clerkEmbeddedAuth';
import { clerkLightAppearance } from '@/lib/clerkLightAppearance';

const clerkCaptchaAppearance = {
  ...clerkLightAppearance,
  captcha: { theme: 'auto' as const, size: 'flexible' as const },
};

/**
 * Default: redirect to Clerk Account Portal on Frontend API origin.
 * Escape hatch: `NEXT_PUBLIC_CLERK_FORCE_EMBEDDED_AUTH=1` — real Clerk UI, rendered on your domain (often fixes stubborn `sign_ups` 400).
 */
export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (clerkForceEmbeddedAuth()) {
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
            appearance={clerkCaptchaAppearance}
          />
        </div>
      </div>
    );
  }

  const sp = await searchParams;
  const url = clerkHostedAuthRedirect('/sign-in', sp);
  if (!url) {
    return (
      <div className="mx-auto max-w-lg px-6 py-16 font-sans text-sm text-zinc-700">
        <h1 className="text-lg font-semibold text-zinc-900">Sign-in is not configured</h1>
        <p className="mt-3 leading-relaxed">
          Add{' '}
          <code className="rounded bg-zinc-100 px-1.5 py-0.5 text-[13px]">
            NEXT_PUBLIC_CLERK_ACCOUNT_PORTAL_ORIGIN
          </code>{' '}
          to your environment (Clerk Dashboard → API Keys → Frontend API URL), for example{' '}
          <code className="rounded bg-zinc-100 px-1.5 py-0.5 text-[13px]">https://clerk.northrosc.com</code>
          . No trailing slash.
        </p>
        <p className="mt-4 text-zinc-600">
          Or set{' '}
          <code className="rounded bg-zinc-100 px-1.5 py-0.5 text-[13px]">
            NEXT_PUBLIC_CLERK_FORCE_EMBEDDED_AUTH=1
          </code>{' '}
          to use Clerk components on this site without Account Portal.
        </p>
      </div>
    );
  }
  redirect(url);
}
