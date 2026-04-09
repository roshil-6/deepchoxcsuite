/** Anchor targets on `CsuiteIntelligenceGuide` — ids must match heading `id`s */

export type SuiteIntelSection = {
    id: string;
    label: string;
    /** Tailwind bg + hover for the chip */
    chipClass: string;
};

export const SUITE_INTELLIGENCE_SECTIONS: SuiteIntelSection[] = [
    { id: 'coord-brief', label: 'Coordination', chipClass: 'bg-teal-700 hover:bg-teal-600' },
    { id: 'live-net', label: 'Network', chipClass: 'bg-violet-600 hover:bg-violet-500' },
    { id: 'desk-out', label: 'Desk outputs', chipClass: 'bg-sky-600 hover:bg-sky-500' },
    { id: 'focus-trace', label: 'Focus & trace', chipClass: 'bg-emerald-600 hover:bg-emerald-500' },
    { id: 'act-feed', label: 'Sync log', chipClass: 'bg-amber-600 hover:bg-amber-500' },
    { id: 'net-title', label: 'Steer vs auto', chipClass: 'bg-fuchsia-600 hover:bg-fuchsia-500' },
    { id: 'decisions-shape', label: 'Ground rules', chipClass: 'bg-rose-600 hover:bg-rose-500' },
    { id: 'reports-artifacts', label: 'Continue', chipClass: 'bg-cyan-600 hover:bg-cyan-500' },
];

export function scrollToSuiteSection(sectionId: string): void {
    if (typeof document === 'undefined') return;
    const el = document.getElementById(sectionId);
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
