'use client';

const KEY = 'deepchox-device-session-v1';
const USER_KEY = 'deepchox-user-session-v1';

/** Anonymous device id until real auth; send as `x-deepchox-session` on venture APIs. */
export function getDeviceSessionId(): string {
  if (typeof window === 'undefined') return '';
  try {
    let s = localStorage.getItem(KEY);
    // DB column was historically VARCHAR(80); reject absurd values and re-issue a UUID.
    if (!s || s.length < 8 || s.length > 512) {
      s =
        typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
          ? crypto.randomUUID()
          : `s-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
      localStorage.setItem(KEY, s);
    }
    return s;
  } catch {
    return `fallback-${Date.now()}`;
  }
}

/** Clerk userId stored locally so db.ts can read it without hooks. */
export function getUserSessionId(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(USER_KEY) || null;
  } catch {
    return null;
  }
}

export function setUserSessionId(userId: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(USER_KEY, userId);
  } catch { /* noop */ }
}

export function clearUserSessionId(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(USER_KEY);
  } catch { /* noop */ }
}

/**
 * Returns the Clerk userId when the user is signed in, otherwise the anonymous device UUID.
 * This means ventures are always tied to the person, not the browser/port.
 */
export function getEffectiveSessionId(): string {
  return getUserSessionId() || getDeviceSessionId();
}
