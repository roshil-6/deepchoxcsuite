/**
 * Account Portal (`clerkHostedAuthRedirect`) vs embedded `<SignIn />` / `<SignUp />` on your own origin.
 * If hosted sign-up keeps 400 (`sign_ups`), set `NEXT_PUBLIC_CLERK_FORCE_EMBEDDED_AUTH=1` — same Clerk instance,
 * but CAPTCHA + cookies stay first-party on `NEXT_PUBLIC_SITE_URL` (layout must keep `#clerk-captcha`).
 */
export function clerkForceEmbeddedAuth(): boolean {
  const v = process.env.NEXT_PUBLIC_CLERK_FORCE_EMBEDDED_AUTH?.toLowerCase().trim();
  return v === '1' || v === 'true' || v === 'yes';
}
