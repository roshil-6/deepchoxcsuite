'use client';

import React from 'react';

/**
 * Positions the dock; does not draw one card around thread + composer (those are separate in ChatAssistant).
 * Not used on Personal Assistant (full-page composer there).
 */
export function AIInputBarShell({ children }: { children: React.ReactNode }) {
    return (
        <div className="pointer-events-none fixed bottom-0 left-0 right-0 z-40 flex justify-center px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2 lg:left-[5rem] lg:right-80">
            <div className="pointer-events-auto flex max-h-[min(60vh,640px)] w-full max-w-3xl min-h-0 flex-col justify-end overflow-visible">
                {children}
            </div>
        </div>
    );
}
