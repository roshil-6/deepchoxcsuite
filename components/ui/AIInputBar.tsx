'use client';

import React from 'react';

/**
 * Visual wrapper for the floating executive chat composer.
 * Styling is applied primarily via ChatAssistant `aiOs` variant; this shell centers the bar.
 */
export function AIInputBarShell({ children }: { children: React.ReactNode }) {
    return (
        <div className="pointer-events-none fixed bottom-0 left-0 right-0 z-40 flex justify-center px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2 lg:left-[5rem] lg:right-80">
            <div className="pointer-events-auto w-full max-w-3xl">{children}</div>
        </div>
    );
}
