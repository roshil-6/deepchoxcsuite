export type DexoApprovalMode = 'always' | 'hybrid' | 'auto';

const PREFIX = 'deepchox-dexo-approval-mode';

export function defaultDexoApprovalMode(): DexoApprovalMode {
  const env = (process.env.NEXT_PUBLIC_DEXO_APPROVAL_MODE || '').trim().toLowerCase();
  if (env === 'auto') return 'auto';
  if (env === 'hybrid') return 'hybrid';
  return 'always';
}

export function getVentureApprovalMode(ventureId: number | undefined): DexoApprovalMode {
  if (!ventureId || typeof window === 'undefined') return defaultDexoApprovalMode();
  try {
    const raw = localStorage.getItem(`${PREFIX}:${ventureId}`);
    if (raw === 'always' || raw === 'hybrid' || raw === 'auto') return raw;
  } catch {
    /* noop */
  }
  return defaultDexoApprovalMode();
}

export function setVentureApprovalMode(ventureId: number | undefined, mode: DexoApprovalMode): void {
  if (!ventureId || typeof window === 'undefined') return;
  try {
    localStorage.setItem(`${PREFIX}:${ventureId}`, mode);
  } catch {
    /* noop */
  }
}
