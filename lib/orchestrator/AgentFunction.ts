import { AnyAgentResponse, ExecutiveRole } from './types';

async function invokeLiveAgent(role: ExecutiveRole, context: string): Promise<AnyAgentResponse | null> {
    try {
        const res = await fetch('/api/dexo', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'boardroom',
                payload: { role, context },
            }),
        });
        const data = (await res.json()) as {
            ok?: boolean;
            response?: AnyAgentResponse;
        };
        if (data.ok && data.response && typeof data.response === 'object') {
            return { ...data.response, timestamp: Date.now() };
        }
    } catch {
        /* fall through to null */
    }
    return null;
}

export async function invokeAgent(role: ExecutiveRole, context: string): Promise<AnyAgentResponse | null> {
    return await invokeLiveAgent(role, context);
}
