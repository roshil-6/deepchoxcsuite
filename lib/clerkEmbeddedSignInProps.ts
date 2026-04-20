/**
 * Embedded <SignIn /> on `/` — keep sign-in / sign-up on this route (hash routing, no /sign-in / /sign-up navigation).
 * oauthFlow: popup keeps the landing/workspace shell visible; if the browser blocks popups, user can allow or use email.
 */
export const clerkEmbeddedSignInProps = {
  withSignUp: true,
  routing: 'hash' as const,
  signUpUrl: '/',
  signInUrl: '/',
  fallbackRedirectUrl: '/',
  signUpFallbackRedirectUrl: '/',
  /** Prefer popup OAuth so the app shell stays behind the provider window */
  oauthFlow: 'popup' as const,
};
