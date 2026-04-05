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
            className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto overflow-x-hidden overscroll-y-contain custom-scrollbar bg-[var(--bg)]"
        >
            {/*
              shrink-0 is required: this node is a flex item of the column scrollport.
              Default flex-shrink:1 lets the browser squash it to the viewport height,
              so scrollHeight never grows — long pages (e.g. Suite intelligence) clip.
            */}
            <div
                className={`mx-auto w-full max-w-[min(100%,72rem)] shrink-0 px-4 sm:px-6 ${
                    reserveBottom
                        ? 'pb-[max(6.5rem,calc(5.5rem+env(safe-area-inset-bottom)))] sm:pb-[max(7.5rem,calc(6.5rem+env(safe-area-inset-bottom)))] lg:pb-[max(8rem,calc(7rem+env(safe-area-inset-bottom)))]'
                        : ''
                }`}
            >
                {children}
            </div>
        </motion.div>
    );
}
