'use client';

import React from 'react';
import { motion } from 'framer-motion';

export function WorkspacePanel({
    children,
    reserveBottom,
}: {
    children: React.ReactNode;
    /** Space for floating AI composer */
    reserveBottom?: boolean;
}) {
    return (
        <motion.div
            initial={{ opacity: 0.96 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.35 }}
            className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-[var(--bg)]"
        >
            <div
                className={`mx-auto flex h-full w-full max-w-[min(100%,72rem)] min-h-0 flex-1 flex-col px-4 sm:px-6 ${
                    reserveBottom
                        ? /* ~composer + thread peek; scroll lives in desk — avoid ~40vh “dead” band that looked like a black void */
                          'pb-[max(6.5rem,calc(5.5rem+env(safe-area-inset-bottom)))] sm:pb-[max(7.5rem,calc(6.5rem+env(safe-area-inset-bottom)))] lg:pb-[max(8rem,calc(7rem+env(safe-area-inset-bottom)))]'
                        : ''
                }`}
            >
                {children}
            </div>
        </motion.div>
    );
}
