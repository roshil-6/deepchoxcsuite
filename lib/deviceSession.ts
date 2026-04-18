'use client';

const KEY = 'deepchox-device-session-v1';

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
