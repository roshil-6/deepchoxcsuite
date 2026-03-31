'use client';

import React from 'react';
import { useOffice } from '@/lib/OfficeContext';
import { EyeOff } from 'lucide-react';

export function OfficeShell({ children }: { children: React.ReactNode }) {
    const { systemState, toggleDeepWork } = useOffice();

    return (
        <div className={`relative h-screen w-full overflow-hidden bg-brand-bg font-sans text-brand-text transition-all duration-700 ${systemState.isDeepWork ? 'brightness-75 saturate-0' : ''
            }`}>
            <div className="pointer-events-none absolute inset-0 z-0 opacity-[0.03]" style={{ backgroundImage: 'url("/noise.png")', mixBlendMode: 'overlay' }} />

            {/* Deep Work Focus Overlay (Pure Black) */}
            <div className={`absolute inset-0 z-50 pointer-events-none bg-black transition-opacity duration-1000 ${systemState.isDeepWork ? 'opacity-80' : 'opacity-0'}`} />

            {/* Deep Work Exit Button */}
            {systemState.isDeepWork && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[60] animate-in fade-in slide-in-from-top-10 duration-1000">
                    <button
                        onClick={() => toggleDeepWork(false)}
                        className="flex items-center gap-2 px-6 py-2 rounded-full bg-zinc-900 border border-zinc-700 text-zinc-300 hover:text-white hover:border-zinc-500 transition-all font-medium text-xs uppercase tracking-widest shadow-lg"
                    >
                        <EyeOff className="w-3 h-3" />
                        Exit Deep Focus
                    </button>
                </div>
            )}

            {/* MAIN LAYOUT CONTAINER */}
            <div className={`relative z-10 w-full h-full flex transition-all duration-1000 ${systemState.isDeepWork ? 'scale-95' : 'scale-100'}`}>
                {children}
            </div>
        </div>
    );
}
