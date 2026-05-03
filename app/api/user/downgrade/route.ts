import { NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';

/**
 * POST /api/user/downgrade
 *
 * Clears deepchoxPlan from Clerk publicMetadata so the user returns to Free.
 * Called by the "Downgrade to Free" button in UpgradeModal.
 *
 * Security: only the authenticated user can downgrade themselves.
 * No body parameters needed — userId comes from the session.
 */
export async function POST() {
    const { userId } = await auth();
    if (!userId) {
        return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
    }

    try {
        const client = await clerkClient();
        const user = await client.users.getUser(userId);
        const prevMeta = (user.publicMetadata ?? {}) as Record<string, unknown>;
        // Remove deepchoxPlan — keep all other existing metadata intact.
        const { deepchoxPlan: _removed, ...rest } = prevMeta;
        void _removed;
        await client.users.updateUser(userId, {
            publicMetadata: { ...rest, deepchoxPlan: 'free' },
        });
        return NextResponse.json({ ok: true });
    } catch (e) {
        console.error('[downgrade]', e);
        const msg = e instanceof Error ? e.message : 'downgrade_failed';
        return NextResponse.json({ ok: false, error: msg }, { status: 500 });
    }
}
