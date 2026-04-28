'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const pageVariants = {
    initial: { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -4 },
};

export function WorkspacePanel({
    children,
    reserveBottom,
    fillViewport,
    roomKey,
}: {
    children: React.ReactNode;
    reserveBottom?: boolean;
    fillViewport?: boolean;
    /** Pass the active room ID to trigger page transition animations */
    roomKey?: string;
}) {
    const content = (
        <div
            className={`mx-auto w-full max-w-[min(100%,72rem)] px-3 sm:px-5 ${
                fillViewport
                    ? 'flex min-h-0 min-w-0 flex-1 flex-col'
                    : 'shrink-0'
            } ${
                reserveBottom
                    ? 'pb-[max(6.5rem,calc(5.5rem+env(safe-area-inset-bottom)))] sm:pb-[max(7.5rem,calc(6.5rem+env(safe-area-inset-bottom)))] lg:pb-[max(8rem,calc(7rem+env(safe-area-inset-bottom)))]'
                    : ''
            }`}
        >
            {children}
        </div>
    );

    return (
        <div
            className={`relative flex min-h-0 min-w-0 flex-1 flex-col bg-transparent ${
                fillViewport
                    ? 'overflow-hidden'
                    : 'overflow-y-auto overflow-x-hidden overscroll-y-contain custom-scrollbar'
            }`}
        >
            <AnimatePresence mode="wait">
                <motion.div
                    key={roomKey || 'default'}
                    variants={pageVariants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
                    className={fillViewport ? 'flex min-h-0 min-w-0 flex-1 flex-col' : ''}
                >
                    {content}
                </motion.div>
            </AnimatePresence>
        </div>
    );
}
