'use client';

import React from 'react';

/**
 * Positions the dock; does not draw one card around thread + composer (those are separate in ChatAssistant).
 * Not used on Personal Assistant (full-page composer there).
 */
/** Match ChatGPT web: composer sits centered with a comfortable max width */
export function AIInputBarShell({ children }: { children: React.ReactNode }) {
    return (
        <div className="pointer-events-none fixed bottom-0 left-0 right-0 z-40 flex items-end justify-center px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2 lg:left-[5rem] lg:right-80">
            <div className="pointer-events-auto mx-auto flex w-full max-w-3xl shrink-0 flex-col justify-end overflow-visible [max-height:min(55vh,560px)]">
                {children}
            </div>
        </div>
    );
}
