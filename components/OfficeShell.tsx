'use client';

import React from 'react';
import { useOffice } from '@/lib/OfficeContext';
import { NOISE_DATA_URL } from '@/lib/noiseTexture';
import { EyeOff } from 'lucide-react';
import { DexoPendingChangesFloating } from '@/components/Dexo/DexoPendingChangesPanel';
import DarkVeil from '@/components/DarkVeil';

export function OfficeShell({ children }: { children: React.ReactNode }) {
    const { systemState, toggleDeepWork, activeProject } = useOffice();

    return (
        <div className={`relative h-screen w-full overflow-hidden bg-transparent font-sans text-[var(--text)] transition-all duration-700 ${systemState.isDeepWork ? 'brightness-95 saturate-75' : ''
            }`}>
            {/* DarkVeil WebGL — screen blend: dark CPPN pixels = invisible,
                bright coloured streaks become visible against the dark shell */}
            <div
                className="pointer-events-none fixed inset-0 z-0"
                style={{ mixBlendMode: 'screen', opacity: 0.9 }}
                aria-hidden
            >
                <DarkVeil
                    speed={0.25}
                    hueShift={30}
                    noiseIntensity={0.015}
                    warpAmount={0.35}
                    resolutionScale={0.5}
                />
            </div>

            <div
                className="pointer-events-none absolute inset-0 z-[1] opacity-[0.02]"
                style={{ backgroundImage: `url("${NOISE_DATA_URL}")`, mixBlendMode: 'multiply' }}
            />

            {/* Deep Work Focus Overlay (Pure Black) */}
            <div className={`absolute inset-0 z-50 pointer-events-none bg-black transition-opacity duration-1000 ${systemState.isDeepWork ? 'opacity-80' : 'opacity-0'}`} />

            {/* Deep Work Exit Button */}
            {systemState.isDeepWork && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[60] animate-in fade-in slide-in-from-top-10 duration-1000">
                    <button
                        onClick={() => toggleDeepWork(false)}
                        className="flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--bg-card)] px-6 py-2 text-xs font-medium uppercase tracking-widest text-[var(--text-secondary)] shadow-[var(--shadow-soft)] transition-all hover:bg-[rgba(255,255,255,0.08)] hover:text-[var(--text-primary)]"
                    >
                        <EyeOff className="w-3 h-3" />
                        Exit Deep Focus
                    </button>
                </div>
            )}

            {/* MAIN LAYOUT CONTAINER */}
            <div className={`relative z-10 w-full h-full flex transition-all duration-1000 ${systemState.isDeepWork ? 'scale-95' : 'scale-100'} backdrop-blur-[2px]`}>
                {children}
            </div>

            {activeProject?.id && !systemState.isDeepWork ? (
                <DexoPendingChangesFloating activeProject={activeProject} />
            ) : null}
        </div>
    );
}
