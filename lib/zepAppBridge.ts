/**
 * Lightweight bridge so Zep can drive the Deepchox web shell (Engineering + Research + Sites).
 * Keeps Zep decoupled from OfficeContext rooms that aren't mounted in page.tsx.
 */

export const DEEPCHOX_ZEP_NAV_EVENT = 'deepchox-zep-nav';

export type ZepNavDetail =
  | { kind: 'set_view'; view: 'engineering' | 'research' | 'sites' }
  | { kind: 'new_project' };

/** Session mirrors for Zep status/listing (filled from app/page ThemedLayout). */
export const SS_ACTIVE_APP_VIEW = 'deepchox-active-app-view';
export const SS_SELECTED_ENG_PROJECT = 'deepchox-selected-eng-project';

export function dispatchZepNav(detail: ZepNavDetail) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(DEEPCHOX_ZEP_NAV_EVENT, { detail }));
}

export function readActiveShellView(): 'engineering' | 'research' | 'sites' | null {
  try {
    const v = sessionStorage.getItem(SS_ACTIVE_APP_VIEW);
    if (v === 'engineering' || v === 'research' || v === 'sites') return v;
  } catch { /* ignore */ }
  return null;
}

export function readSelectedEngProjectId(): string | null {
  try {
    return sessionStorage.getItem(SS_SELECTED_ENG_PROJECT);
  } catch {
    return null;
  }
}

export type EngProjSummary = { id: string; title: string };

const ENG_STORE = 'deepchox-eng-projects';

/** Same shape as Sidebar / EngineeringPlatform project list */
export function loadEngineeringSummaries(): EngProjSummary[] {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(ENG_STORE) : null;
    if (!raw) return [];
    const all = JSON.parse(raw) as { id?: string; title?: string }[];
    return all.map((p) => ({ id: p.id ?? '', title: (p.title ?? 'Untitled').slice(0, 120) })).filter((p) => p.id);
  } catch {
    return [];
  }
}
