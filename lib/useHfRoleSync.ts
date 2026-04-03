'use client';

import { useState, useCallback } from 'react';

const DEFAULT_CTX =
    'Early stage startup, solo founder, building AI C-suite platform called DeepChox';

export type HfDeskRole = 'ceo' | 'cfo' | 'cto' | 'cmo' | 'cso';

export function useHfRoleSync(companyContext: string = DEFAULT_CTX) {
    const [syncing, setSyncing] = useState(false);
    const [syncResult, setSyncResult] = useState<string | null>(null);

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
                } else if (data.error) {
                    setSyncResult(typeof data.error === 'string' ? data.error : 'Sync failed.');
                } else {
                    setSyncResult(data.result ?? '');
                }
            } catch {
                setSyncResult('Sync failed. Please try again.');
            } finally {
                setSyncing(false);
            }
        },
        [companyContext]
    );

    return { syncing, syncResult, setSyncResult, syncRole };
}
