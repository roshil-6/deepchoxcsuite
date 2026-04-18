import type { DexoPatchContract } from '@/lib/dexoPatchSchema';
import { isHybridAutoApplyPatch } from '@/lib/dexoPatchSchema';
import { getVentureApprovalMode, type DexoApprovalMode } from '@/lib/dexoApprovalPolicy';

export async function applyDexoPatchLocally(
  updateProjectField: (field: string, value: unknown) => Promise<void>,
  patch: DexoPatchContract,
): Promise<void> {
  for (const [k, v] of Object.entries(patch)) {
    if (v === undefined) continue;
    await updateProjectField(k, v);
  }
}

export async function markDexoProposalAppliedOnServer(input: {
  proposalId: string;
  ventureId: number;
  patch: DexoPatchContract;
  actor?: string;
  note?: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const res = await fetch('/api/dexo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'proposalApply',
        payload: {
          proposalId: input.proposalId,
          ventureId: input.ventureId,
          appliedPatch: input.patch,
          actor: input.actor ?? 'founder',
          note: input.note,
        },
      }),
    });
    const data = (await res.json()) as { ok?: boolean; error?: string };
    if (!res.ok || !data.ok) return { ok: false, error: data.error ?? 'apply_failed' };
    return { ok: true };
  } catch {
    return { ok: false, error: 'apply_network_error' };
  }
}

export async function createDexoProposal(input: {
  ventureId: number;
  source: string;
  model?: string;
  summary?: string;
  patch: DexoPatchContract;
  conversationRef?: string;
}): Promise<{ ok: true; proposalId: string } | { ok: false; error: string }> {
  try {
    const res = await fetch('/api/dexo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'proposalCreate',
        payload: input,
      }),
    });
    const data = (await res.json()) as { ok?: boolean; proposal?: { id: string }; error?: string };
    if (!res.ok || !data.ok || typeof data.proposal?.id !== 'string') {
      return { ok: false, error: data.error ?? 'proposal_failed' };
    }
    return { ok: true, proposalId: data.proposal.id };
  } catch {
    return { ok: false, error: 'proposal_network_error' };
  }
}

/**
 * Creates a proposal, then applies locally + marks applied when approval mode allows (auto / hybrid-safe).
 */
export async function submitDexoVenturePatch(input: {
  ventureId: number;
  source: string;
  model?: string;
  summary?: string;
  patch: DexoPatchContract;
  conversationRef?: string;
  updateProjectField: (field: string, value: unknown) => Promise<void>;
  /** For tests or forced mode */
  approvalMode?: DexoApprovalMode;
}): Promise<
  | { ok: true; applied: boolean; proposalId: string; mode: DexoApprovalMode }
  | { ok: false; error: string }
> {
  const created = await createDexoProposal({
    ventureId: input.ventureId,
    source: input.source,
    model: input.model,
    summary: input.summary,
    patch: input.patch,
    conversationRef: input.conversationRef,
  });
  if (!created.ok) return { ok: false, error: created.error };

  const mode = input.approvalMode ?? getVentureApprovalMode(input.ventureId);
  if (mode === 'always') {
    return { ok: true, applied: false, proposalId: created.proposalId, mode };
  }
  if (mode === 'hybrid' && !isHybridAutoApplyPatch(input.patch)) {
    return { ok: true, applied: false, proposalId: created.proposalId, mode };
  }

  await applyDexoPatchLocally(input.updateProjectField, input.patch);
  const actor = mode === 'auto' ? 'founder_auto' : 'founder_hybrid';
  const marked = await markDexoProposalAppliedOnServer({
    proposalId: created.proposalId,
    ventureId: input.ventureId,
    patch: input.patch,
    actor,
  });
  if (!marked.ok) {
    return { ok: false, error: marked.error };
  }
  return { ok: true, applied: true, proposalId: created.proposalId, mode };
}
