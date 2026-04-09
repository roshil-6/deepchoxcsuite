'use client';

import { useState, useCallback } from 'react';

/** Default blurb when no venture context is wired into the HF demo sync. */
export const HF_DEFAULT_COMPANY_CONTEXT =
    'Founder using DEEPCHOX — AI-powered team for founders; each desk acts as a specialized teammate.';

export type HfDeskRole = 'ceo' | 'cfo' | 'cto' | 'cmo' | 'cso';

export function useHfRoleSync(companyContext: string = HF_DEFAULT_COMPANY_CONTEXT) {
    const [syncing, setSyncing] = useState(false);
    const [syncResult, setSyncResult] = useState<string | null>(null);
    const [syncModel, setSyncModel] = useState<string | null>(null);

    const syncRole = useCallback(
        async (role: HfDeskRole) => {
            setSyncing(true);
            try {
                const res = await fetch('/api/sync', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        role,
                        companyContext,
                    }),
                });
                const data = await res.json();
                if (data.loading) {
                    setSyncResult('AI is warming up, please wait 20 seconds and try again.');
                    setSyncModel(null);
                } else if (data.error) {
                    setSyncResult(typeof data.error === 'string' ? data.error : 'Sync failed.');
                    setSyncModel(null);
                } else {
                    setSyncResult(data.result ?? '');
                    setSyncModel(typeof data.model === 'string' ? data.model : null);
                }
            } catch {
                setSyncResult('Sync failed. Please try again.');
                setSyncModel(null);
            } finally {
                setSyncing(false);
            }
        },
        [companyContext]
    );

    return { syncing, syncResult, syncModel, setSyncResult, syncRole };
}
