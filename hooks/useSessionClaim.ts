'use client';

import { useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import {
    getDeviceSessionId,
    getUserSessionId,
    setUserSessionId,
    clearUserSessionId,
} from '@/lib/deviceSession';

const ADOPTED_PREFIX = 'deepchox-session-adopted-v1:';

/**
 * Runs once on mount and whenever Clerk auth state changes.
 *
 * Signed-in:
 *   1. Writes the Clerk userId into localStorage so getEffectiveSessionId()
 *      returns it — all venture API calls will use userId instead of the
 *      anonymous device UUID.
 *   2. On first sign-in (per userId), calls adopt-session to migrate any
 *      ventures that were created while the user was a guest (anonymous session)
 *      over to their userId. Fully idempotent — safe to call repeatedly.
 *
 * Signed-out:
 *   Clears the stored userId so the device UUID is used again (guest mode).
 */
export function useSessionClaim(): void {
    const { user, isLoaded } = useUser();

    useEffect(() => {
        if (!isLoaded) return;

        if (!user) {
            // Signed out — revert to anonymous device session.
            clearUserSessionId();
            return;
        }

        const userId = user.id;

        // Always keep localStorage in sync with the current Clerk user.
        if (getUserSessionId() !== userId) {
            setUserSessionId(userId);
        }

        // Adopt anonymous ventures exactly once per userId per device.
        const adoptedKey = `${ADOPTED_PREFIX}${userId}`;
        if (typeof window !== 'undefined' && localStorage.getItem(adoptedKey)) return;

        const anonymousSession = getDeviceSessionId();
        if (anonymousSession === userId) {
            // Already using userId as device session — mark done.
            if (typeof window !== 'undefined') localStorage.setItem(adoptedKey, '1');
            return;
        }

        // Fire-and-forget — non-fatal if it fails; next sign-in will retry.
        fetch('/api/ventures/adopt-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ anonymousSessionId: anonymousSession }),
        })
            .then((r) => {
                if (r.ok && typeof window !== 'undefined') {
                    localStorage.setItem(adoptedKey, '1');
                }
            })
            .catch(() => {
                // Non-fatal — will retry on next page load.
            });
    }, [isLoaded, user]);
}
