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
                const rolePrompt = `Desk role: ${role.toUpperCase()}. Provide a concise sync update and one immediate move.`;
                const res = await fetch('/api/dexo', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'chat',
                        payload: {
                            messages: [
                                { role: 'system', content: rolePrompt },
                                { role: 'user', content: companyContext },
                            ],
                            model: 'llama3',
                        },
                    }),
                });
                const data = await res.json();
                if (data.error) {
                    setSyncResult(typeof data.error === 'string' ? data.error : 'Sync failed.');
                    setSyncModel(null);
                } else {
                    const text =
                        data.message?.content ??
                        data.choices?.[0]?.message?.content ??
                        data.result ??
                        '';
                    setSyncResult(text);
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
