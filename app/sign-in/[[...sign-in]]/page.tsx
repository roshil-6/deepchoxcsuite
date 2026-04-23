import { SignIn } from '@clerk/nextjs';
import { clerkEmbeddedFallbackRedirect } from '@/lib/clerkAuthRedirect';
import { clerkLightAppearance } from '@/lib/clerkLightAppearance';
import { AuthPageBackground } from '@/components/auth/AuthPageBackground';

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
  const afterAuth = clerkEmbeddedFallbackRedirect(sp);

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#030304] px-4 py-10">
      <AuthPageBackground />

      <div className="relative z-10 w-full max-w-md">
        {/* Header */}
        <div className="mb-7 text-center">
          {/* Wordmark */}
          <div className="mb-5 flex flex-col items-center gap-1">
            <span className="font-sans text-[22px] font-black tracking-[0.04em] text-white [text-shadow:0_2px_30px_rgba(116,86,255,0.4)]">
              north<span className="bg-gradient-to-br from-[#7456ff] via-[#9d88ff] to-[#7456ff] bg-clip-text text-transparent">ROSC</span>
            </span>
            <span className="font-sans text-[10px] font-bold uppercase tracking-[0.28em] text-zinc-500">
              Deepchox
            </span>
          </div>

          <h1 className="font-sans text-[1.35rem] font-bold tracking-tight text-white">
            Welcome back
          </h1>
          <p className="mt-2 font-sans text-[13.5px] leading-relaxed text-zinc-400">
            Sign in to continue to your workspace.
          </p>
        </div>

        {/* Card — violet glow ring + glass border */}
        <div className="relative">
          {/* Outer glow ring */}
          <div
            className="pointer-events-none absolute -inset-px rounded-[18px] opacity-60"
            style={{
              background: 'linear-gradient(135deg, rgba(116,86,255,0.45) 0%, transparent 50%, rgba(139,116,255,0.3) 100%)',
            }}
            aria-hidden
          />
          <div className="relative overflow-hidden rounded-2xl border border-zinc-700/70 bg-zinc-950/90 p-6 shadow-[0_32px_80px_rgba(0,0,0,0.7),0_0_0_1px_rgba(116,86,255,0.08)] backdrop-blur-xl">
            {/* Top accent line */}
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#7456ff]/70 to-transparent" aria-hidden />

            {/* Clerk widget rendered on dark bg by wrapping in a white inner card */}
            <div className="overflow-hidden rounded-xl bg-white p-1 shadow-[0_4px_24px_rgba(0,0,0,0.35)]">
              <SignIn
                routing="path"
                path="/sign-in"
                signUpUrl="/sign-up"
                fallbackRedirectUrl={afterAuth}
                signUpFallbackRedirectUrl="/"
                oauthFlow="redirect"
                appearance={appearance}
              />
            </div>
            <div id="clerk-captcha" className="mt-3 flex min-h-[2.5rem] justify-center" />
          </div>
        </div>

        <p className="mt-5 text-center font-sans text-[12px] text-zinc-600">
          No account yet?{' '}
          <a href="/sign-up" className="font-semibold text-[#9d88ff] transition hover:text-white">
            Create one free
          </a>
        </p>
      </div>
    </div>
  );
}
