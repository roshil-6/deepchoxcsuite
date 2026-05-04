'use client';

import { useOffice } from '@/lib/OfficeContext';
import { DexoDailyBriefPanel } from '@/components/Dexo/DexoDailyBriefPanel';
import { Globe } from 'lucide-react';

export function DexoResearchRoom() {
    const { activeProject } = useOffice();

    if (!activeProject) {
        return (
            <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 px-6 py-16">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl" style={{ background: 'rgba(34,211,238,0.08)' }}>
                    <Globe className="h-5 w-5 text-cyan-400/60" strokeWidth={1.5} />
                </div>
                <p className="text-[13px] text-white/30">Select a venture to see daily research</p>
            </div>
        );
    }

    return (
        <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto px-5 py-6 sm:px-8 sm:py-8">
            <div className="mx-auto max-w-2xl">
                <DexoDailyBriefPanel activeProject={activeProject} autoRunPulse />
            </div>
        </div>
    );
}
