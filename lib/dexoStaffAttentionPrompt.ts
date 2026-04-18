import type { StaffAttentionItem } from '@/lib/db';
import { buildDexoStaffAttentionBootstrap } from '@/lib/dexoBootstrap';

export type { DexoBootstrapPayload } from '@/lib/dexoBootstrap';
export { buildDexoStaffAttentionBootstrap } from '@/lib/dexoBootstrap';

/** @deprecated Prefer `buildDexoStaffAttentionBootstrap` + `setDexoBootstrap` for UI context. */
export function buildDexoStaffAttentionPrompt(item: StaffAttentionItem): string {
    return buildDexoStaffAttentionBootstrap(item).userMessage;
}
